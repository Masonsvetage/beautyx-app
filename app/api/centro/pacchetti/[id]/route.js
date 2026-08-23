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
    return { error: NextResponse.json({ error: 'Nessun centro' }, { status: 400 }) }

  const admin = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL, process.env.SUPABASE_SERVICE_KEY)
  return { user, admin, centroId: profile.centro_id }
}

// SICUREZZA: stessa verifica servizio_id↔centro_id di POST /api/centro/pacchetti
// (audit Riccardo 2026-08-23, stesso schema del fix su progressi-obiettivi) —
// prima di riscrivere pacchetti_items, controlla che ogni servizio referenziato
// appartenga davvero al centro proprietario del pacchetto.
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

export async function PUT(request, { params }) {
  try {
    const { error, admin, centroId } = await getAuth()
    if (error) return error

    const body = await request.json()
    const { items, ...pacchettoData } = body

    // Validazione PRIMA di toccare pacchetti/pacchetti_items — vedi commento
    // sulla funzione sopra.
    const serviziError = await assertServiziAppartengonoAlCentro(admin, items, centroId)
    if (serviziError) return serviziError

    const { data: pacchetto, error: updErr } = await admin
      .from('pacchetti')
      .update(pacchettoData)
      .eq('id', params.id)
      .eq('centro_id', centroId)
      .select().single()

    if (updErr) throw updErr

    if (Array.isArray(items)) {
      await admin.from('pacchetti_items').delete().eq('pacchetto_id', params.id)
      if (items.length > 0) {
        const rows = items.map(i => ({
          pacchetto_id: params.id,
          servizio_id: i.servizio_id,
          quantita: i.quantita || 1,
        }))
        await admin.from('pacchetti_items').insert(rows)
      }
    }

    return NextResponse.json({ pacchetto })
  } catch (err) {
    console.error('PUT /api/centro/pacchetti/[id]:', err)
    return NextResponse.json({ error: 'Errore interno' }, { status: 500 })
  }
}

export async function DELETE(request, { params }) {
  try {
    const { error, admin, centroId } = await getAuth()
    if (error) return error

    const { error: delErr } = await admin
      .from('pacchetti').delete().eq('id', params.id).eq('centro_id', centroId)

    if (delErr) throw delErr
    return NextResponse.json({ success: true })
  } catch (err) {
    console.error('DELETE /api/centro/pacchetti/[id]:', err)
    return NextResponse.json({ error: 'Errore interno' }, { status: 500 })
  }
}
