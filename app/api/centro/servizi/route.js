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

// GET: lista servizi nativi + dati importati da integrazioni (koibox, ecc.)
export async function GET() {
  try {
    const { error, admin, centroId } = await getAuth()
    if (error) return error

    // Servizi nativi del listino
    const { data, error: err } = await admin
      .from('servizi')
      .select(`
        *,
        iva:iva_aliquote(id, nome, percentuale),
        materiali:servizi_materiali(*)
      `)
      .eq('centro_id', centroId)
      .order('nome')

    if (err) throw err

    // Servizi importati da Koibox (se presenti per questo centro)
    const { data: koiboxServizi } = await admin
      .from('koibox_servizi')
      .select('referenza, nome, prezzo, durata_minuti, categoria, imported_at')
      .eq('centro_id', centroId)
      .order('nome')

    // Filtra quelli già presenti nel listino (match per nome, case-insensitive)
    const nomiListino = new Set((data || []).map(s => s.nome.toLowerCase().trim()))
    const importati = (koiboxServizi || []).map(k => ({
      ...k,
      _fonte: 'koibox',
      _nel_listino: nomiListino.has(k.nome.toLowerCase().trim()),
    }))

    return NextResponse.json({ servizi: data || [], importati })
  } catch (err) {
    console.error('GET /api/centro/servizi:', err)
    return NextResponse.json({ error: 'Errore interno' }, { status: 500 })
  }
}

// Colonne valide della tabella servizi (filtra campi UI/non-DB dal payload)
// codice_barcode è ESCLUSO: viene generato automaticamente al POST e non modificabile via PUT
// centro_id è ESCLUSO deliberatamente: il centro_id REALE viene già impostato subito
// sotto (`{ ...servizioData, centro_id: centroId, ... }`, verificato in getAuth()) —
// includerlo qui non aprirebbe un buco (lo spread esplicito dopo vince comunque), ma
// resta un residuo incoerente con l'endpoint gemello [id]/route.js già corretto.
const COLONNE_SERVIZI = new Set([
  'nome', 'descrizione', 'categoria', 'tipo',
  'durata_preparazione_min', 'durata_esecuzione_min', 'durata_chiusura_min', 'durata_sanificazione_min',
  'nr_operatrici', 'sovrapponibile', 'iva_aliquota_id', 'ricarico_percentuale',
  'margine_min_utile_perc', 'note_interne',
  'prezzo_pubblico', 'prezzo_congelato_at', 'costo_vivo_al_congelamento',
  'mercato_prezzo_min', 'mercato_prezzo_max', 'mercato_prezzo_medio', 'mercato_ultima_ricerca', 'mercato_note',
  'updated_at',
])

/**
 * Genera il codice univoco del servizio/prodotto nel formato X-YYY-WWWWWW
 *   X      = S (servizio) | P (prodotto) | A (altro)
 *   YYY    = numero categoria a 3 cifre (ordine alfabetico delle categorie del centro)
 *   WWWWWW = progressivo globale a 6 cifre (totale servizi del centro + 1)
 */
async function generaCodice(admin, centroId, tipo, categoria) {
  const tipoChar = tipo === 'prodotto' ? 'P' : tipo === 'servizio' ? 'S' : 'A'

  // Categorie distinte ordinate alfabeticamente (case-insensitive)
  const { data: catRows } = await admin
    .from('servizi')
    .select('categoria')
    .eq('centro_id', centroId)
    .not('categoria', 'is', null)

  const thisCat = (categoria || '').trim()
  const uniqueCats = [...new Set(
    (catRows || []).map(r => (r.categoria || '').trim()).filter(c => c.length > 0)
  )].sort((a, b) => a.localeCompare(b, 'it', { sensitivity: 'base' }))

  let catIdx = uniqueCats.findIndex(c => c.toLowerCase() === thisCat.toLowerCase())
  if (catIdx === -1) catIdx = uniqueCats.length // nuova categoria → numero successivo
  const catNum = String(catIdx + 1).padStart(3, '0')

  // Progressivo: count totale dei servizi del centro (inclusi quelli appena creati)
  const { count } = await admin
    .from('servizi')
    .select('id', { count: 'exact', head: true })
    .eq('centro_id', centroId)
  const prog = String((count || 0) + 1).padStart(6, '0')

  return `${tipoChar}-${catNum}-${prog}`
}

// POST: crea nuovo servizio (con materiali annidati)
export async function POST(request) {
  try {
    const { error, admin, centroId } = await getAuth()
    if (error) return error

    const body = await request.json()
    const { materiali, ...rawData } = body

    // Filtra solo colonne valide
    const servizioData = Object.fromEntries(
      Object.entries(rawData).filter(([k]) => COLONNE_SERVIZI.has(k))
    )

    if (!servizioData.nome)
      return NextResponse.json({ error: 'Nome servizio obbligatorio' }, { status: 400 })

    // Genera codice barcode automaticamente
    const codice_barcode = await generaCodice(admin, centroId, servizioData.tipo, servizioData.categoria)

    // Inserisci servizio
    const { data: servizio, error: insErr } = await admin
      .from('servizi')
      .insert({ ...servizioData, centro_id: centroId, codice_barcode })
      .select(`*, iva:iva_aliquote(id, nome, percentuale)`)
      .single()

    if (insErr) throw insErr

    // Inserisci materiali se presenti
    let materialiSalvati = []
    if (materiali?.length > 0) {
      const rows = materiali.map(m => ({ ...m, servizio_id: servizio.id, id: undefined }))
      const { data: mat, error: matErr } = await admin
        .from('servizi_materiali')
        .insert(rows)
        .select()
      if (matErr) throw matErr
      materialiSalvati = mat || []
    }

    return NextResponse.json({ servizio: { ...servizio, materiali: materialiSalvati } }, { status: 201 })
  } catch (err) {
    console.error('POST /api/centro/servizi:', err)
    return NextResponse.json({ error: err.message || 'Errore interno' }, { status: 500 })
  }
}
