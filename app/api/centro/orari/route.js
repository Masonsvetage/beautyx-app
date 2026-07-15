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
    .from('user_profiles')
    .select('centro_id, ruolo_livello')
    .eq('id', user.id)
    .maybeSingle()

  if (!profile?.centro_id) {
    return { error: NextResponse.json({ error: 'Nessun centro associato' }, { status: 400 }) }
  }

  const admin = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL,
    process.env.SUPABASE_SERVICE_KEY
  )
  return { user, profile, admin, centroId: profile.centro_id }
}

// GET: orari settimanali + chiusure eccezionali
export async function GET() {
  try {
    const { error, admin, centroId } = await getAuth()
    if (error) return error

    const [{ data: orari }, { data: chiusure }] = await Promise.all([
      admin.from('opening_hours')
        .select('*')
        .eq('centro_id', centroId)
        .order('giorno_settimana'),
      admin.from('exceptional_closures')
        .select('*')
        .eq('centro_id', centroId)
        .gte('data_fine', new Date().toISOString().split('T')[0])
        .order('data_inizio'),
    ])

    return NextResponse.json({ orari: orari || [], chiusure: chiusure || [] })
  } catch (err) {
    console.error('GET /api/centro/orari:', err)
    return NextResponse.json({ error: 'Errore interno' }, { status: 500 })
  }
}

// PUT: salva orari settimanali (upsert) + chiusure eccezionali
export async function PUT(request) {
  try {
    const { error, admin, centroId } = await getAuth()
    if (error) return error

    const body = await request.json()
    const { orari, chiusure } = body

    // Upsert orari settimana (7 righe, una per giorno)
    if (orari?.length) {
      const rows = orari.map(o => ({ ...o, centro_id: centroId }))
      const { error: upsertErr } = await admin
        .from('opening_hours')
        .upsert(rows, { onConflict: 'centro_id,giorno_settimana' })
      if (upsertErr) throw upsertErr
    }

    // Sostituisci chiusure eccezionali future
    if (Array.isArray(chiusure)) {
      await admin.from('exceptional_closures')
        .delete()
        .eq('centro_id', centroId)
        .gte('data_fine', new Date().toISOString().split('T')[0])

      if (chiusure.length > 0) {
        const rows = chiusure.map(c => ({ ...c, centro_id: centroId }))
        const { error: insErr } = await admin.from('exceptional_closures').insert(rows)
        if (insErr) throw insErr
      }
    }

    return NextResponse.json({ success: true })
  } catch (err) {
    console.error('PUT /api/centro/orari:', err)
    return NextResponse.json({ error: 'Errore salvataggio orari' }, { status: 500 })
  }
}
