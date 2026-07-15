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

// Colonne valide della tabella servizi (filtra campi non-DB dal payload)
// codice_barcode è ESCLUSO: viene generato al POST e non va mai sovrascritto dal PUT
const COLONNE_SERVIZI = new Set([
  'nome', 'descrizione', 'categoria', 'tipo', 'centro_id',
  'durata_preparazione_min', 'durata_esecuzione_min', 'durata_chiusura_min', 'durata_sanificazione_min',
  'nr_operatrici', 'sovrapponibile', 'iva_aliquota_id', 'ricarico_percentuale',
  'margine_min_utile_perc', 'note_interne',
  'prezzo_pubblico', 'prezzo_congelato_at', 'costo_vivo_al_congelamento',
  'mercato_prezzo_min', 'mercato_prezzo_max', 'mercato_prezzo_medio', 'mercato_ultima_ricerca', 'mercato_note',
  'updated_at',
])

export async function GET(request, { params }) {
  try {
    const { error, admin, centroId } = await getAuth()
    if (error) return error

    const { id } = await params

    const { data, error: err } = await admin
      .from('servizi')
      .select(`*, iva:iva_aliquote(id, nome, percentuale), materiali:servizi_materiali(*)`)
      .eq('id', id)
      .eq('centro_id', centroId)
      .maybeSingle()

    if (err) throw err
    if (!data) return NextResponse.json({ error: 'Servizio non trovato' }, { status: 404 })
    return NextResponse.json({ servizio: data })
  } catch (err) {
    console.error('GET /api/centro/servizi/[id]:', err)
    return NextResponse.json({ error: 'Errore interno' }, { status: 500 })
  }
}

export async function PUT(request, { params }) {
  try {
    const { error, admin, centroId } = await getAuth()
    if (error) return error

    const { id } = await params
    const body = await request.json()
    const { materiali, ...rawData } = body

    // Filtra solo colonne valide (esclude campi _prefissati e colonne non ancora migrate)
    const servizioData = Object.fromEntries(
      Object.entries(rawData).filter(([k]) => COLONNE_SERVIZI.has(k))
    )

    const { data: servizio, error: updErr } = await admin
      .from('servizi')
      .update({ ...servizioData, updated_at: new Date().toISOString() })
      .eq('id', id)
      .eq('centro_id', centroId)
      .select(`*, iva:iva_aliquote(id, nome, percentuale)`)
      .single()

    if (updErr) throw updErr

    // Sostituisci materiali: delete + insert
    await admin.from('servizi_materiali').delete().eq('servizio_id', id)

    let materialiSalvati = []
    if (materiali?.length > 0) {
      const rows = materiali.map(m => ({ ...m, servizio_id: id, id: undefined }))
      const { data: mat, error: matErr } = await admin
        .from('servizi_materiali').insert(rows).select()
      if (matErr) throw matErr
      materialiSalvati = mat || []
    }

    return NextResponse.json({ servizio: { ...servizio, materiali: materialiSalvati } })
  } catch (err) {
    console.error('PUT /api/centro/servizi/[id]:', err)
    return NextResponse.json({ error: err.message || 'Errore interno' }, { status: 500 })
  }
}

export async function DELETE(request, { params }) {
  try {
    const { error, admin, centroId } = await getAuth()
    if (error) return error

    const { id } = await params

    const { error: delErr } = await admin
      .from('servizi')
      .delete()
      .eq('id', id)
      .eq('centro_id', centroId)

    if (delErr) throw delErr
    return NextResponse.json({ success: true })
  } catch (err) {
    console.error('DELETE /api/centro/servizi/[id]:', err)
    return NextResponse.json({ error: 'Errore interno' }, { status: 500 })
  }
}
