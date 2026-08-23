import { cookies } from 'next/headers'
import { createServerClient } from '@supabase/ssr'
import { createClient } from '@supabase/supabase-js'
import { NextResponse } from 'next/server'

async function getAuth() {
  const cookieStore = await cookies()
  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY,
    { cookies: { getAll() { return cookieStore.getAll() } } }
  )
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { error: NextResponse.json({ error: 'Non autenticato' }, { status: 401 }) }

  const { data: profile } = await supabase
    .from('user_profiles').select('centro_id').eq('id', user.id).maybeSingle()

  if (!profile?.centro_id)
    return { error: NextResponse.json({ error: 'Nessun centro associato' }, { status: 400 }) }

  const admin = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL, process.env.SUPABASE_SERVICE_KEY)
  return { user, admin, centroId: profile.centro_id }
}

export async function GET() {
  try {
    const { error, admin, centroId } = await getAuth()
    if (error) return error

    // SICUREZZA (difesa in profondità, 2026-08-23 — stesso pattern già usato
    // in GET /api/progressi-obiettivi dopo l'audit di Riccardo): il servizio
    // referenziato da ogni pacchetti_items dovrebbe già appartenere al centro
    // per costruzione (vedi validazione servizio_id↔centro_id in POST/PUT qui
    // sotto), ma qui aggiungiamo comunque un filtro esplicito sul join verso
    // `servizi`, così anche righe incoerenti (dati pregressi, bug futuri,
    // scritture dirette sul DB) non arrivano mai a esporre nome/durate di un
    // servizio di un centro diverso. `servizi!inner` marca SOLO il livello che
    // porta il `centro_id` da filtrare — NON marchiamo anche `pacchetti_items`
    // come `!inner`, apposta: un pacchetto senza alcun item deve continuare a
    // comparire nella lista con `items: []`; solo i singoli item il cui
    // servizio non appartiene al centro vengono esclusi dall'array annidato,
    // mai l'intero pacchetto.
    const { data, error: err } = await admin
      .from('pacchetti')
      .select(`
        *,
        items:pacchetti_items(
          quantita,
          servizio:servizi!inner(id, nome, durata_preparazione_min, durata_esecuzione_min, durata_chiusura_min, durata_sanificazione_min)
        )
      `)
      .eq('centro_id', centroId)
      .eq('items.servizio.centro_id', centroId)
      .order('nome')

    if (err) throw err
    return NextResponse.json({ pacchetti: data || [] })
  } catch (err) {
    console.error('GET /api/centro/pacchetti:', err)
    return NextResponse.json({ error: 'Errore interno' }, { status: 500 })
  }
}

// SICUREZZA: verifica che ogni servizio referenziato negli item di un
// pacchetto appartenga davvero al `centro_id` del pacchetto stesso, PRIMA di
// scrivere qualunque riga in `pacchetti_items`. Stesso principio del fix su
// `progressi-obiettivi` (obiettivo_id↔centro_id, audit Riccardo 2026-08-23):
// senza questo controllo un titolare potrebbe agganciare al proprio pacchetto
// un `servizio_id` di un centro concorrente e vedersi restituiti (via GET)
// nome/durate di un servizio che non gli appartiene.
async function assertServiziAppartengonoAlCentro(admin, items, centroId) {
  if (!Array.isArray(items) || items.length === 0) return null

  const servizioIds = [...new Set(items.map(i => i?.servizio_id).filter(Boolean))]
  if (servizioIds.length === 0) return null

  const { data: serviziValidi, error: sErr } = await admin
    .from('servizi')
    .select('id')
    .eq('centro_id', centroId)
    .in('id', servizioIds)

  if (sErr) throw sErr

  const validIds = new Set((serviziValidi || []).map(s => s.id))
  const invalidIds = servizioIds.filter(id => !validIds.has(id))

  if (invalidIds.length > 0) {
    return NextResponse.json(
      { error: 'Uno o più servizi indicati non appartengono al centro' },
      { status: 403 }
    )
  }
  return null
}

export async function POST(request) {
  try {
    const { error, admin, centroId } = await getAuth()
    if (error) return error

    const body = await request.json()
    const { items, ...pacchettoData } = body

    if (!pacchettoData.nome)
      return NextResponse.json({ error: 'Nome pacchetto obbligatorio' }, { status: 400 })

    // Validazione servizio_id↔centro_id PRIMA di creare il pacchetto, per non
    // lasciare un pacchetto orfano/senza items se la validazione fallisce.
    const serviziError = await assertServiziAppartengonoAlCentro(admin, items, centroId)
    if (serviziError) return serviziError

    const { data: pacchetto, error: insErr } = await admin
      .from('pacchetti')
      .insert({ ...pacchettoData, centro_id: centroId })
      .select().single()

    if (insErr) throw insErr

    if (items?.length > 0) {
      const rows = items.map(i => ({
        pacchetto_id: pacchetto.id,
        servizio_id: i.servizio_id,
        quantita: i.quantita || 1,
      }))
      await admin.from('pacchetti_items').insert(rows)
    }

    return NextResponse.json({ pacchetto }, { status: 201 })
  } catch (err) {
    console.error('POST /api/centro/pacchetti:', err)
    return NextResponse.json({ error: 'Errore interno' }, { status: 500 })
  }
}
