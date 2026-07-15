import { cookies } from 'next/headers'
import { createServerClient } from '@supabase/ssr'

function createSupabase(cookieStore) {
  return createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY,
    {
      cookies: {
        getAll() { return cookieStore.getAll() },
        setAll(cookiesToSet) {
          cookiesToSet.forEach(({ name, value, options }) => {
            cookieStore.set(name, value, options)
          })
        }
      }
    }
  )
}

// GET: Lista report per centro
export async function GET(request) {
  try {
    const cookieStore = await cookies()
    const supabase = createSupabase(cookieStore)

    const { data: { user } } = await supabase.auth.getUser()
    if (!user) {
      return Response.json({ error: 'Non autenticato' }, { status: 401 })
    }

    const { data: profile } = await supabase
      .from('user_profiles')
      .select('ruolo_livello')
      .eq('id', user.id)
      .single()

    if (!profile || !['admin', 'hpa'].includes(profile.ruolo_livello)) {
      return Response.json({ error: 'Accesso non autorizzato' }, { status: 403 })
    }

    const { searchParams } = new URL(request.url)
    const centro_id = searchParams.get('centro_id')
    const report_id = searchParams.get('id')

    if (report_id) {
      // Singolo report
      const { data: report, error } = await supabase
        .from('hpa_session_reports')
        .select('*, user_profiles!hpa_session_reports_hpa_id_fkey(nome, cognome, email)')
        .eq('id', report_id)
        .single()

      if (error) throw error
      return Response.json({ report })
    }

    if (!centro_id) {
      return Response.json({ error: 'centro_id richiesto' }, { status: 400 })
    }

    // Lista report per centro
    const { data: reports, error } = await supabase
      .from('hpa_session_reports')
      .select('*, user_profiles!hpa_session_reports_hpa_id_fkey(nome, cognome, email)')
      .eq('centro_id', centro_id)
      .order('created_at', { ascending: false })

    if (error) throw error

    return Response.json({ reports: reports || [] })
  } catch (error) {
    console.error('Errore get report:', error)
    return Response.json({ error: error.message }, { status: 500 })
  }
}

// POST: Crea nuovo report
export async function POST(request) {
  try {
    const cookieStore = await cookies()
    const supabase = createSupabase(cookieStore)

    const { data: { user } } = await supabase.auth.getUser()
    if (!user) {
      return Response.json({ error: 'Non autenticato' }, { status: 401 })
    }

    const { data: profile } = await supabase
      .from('user_profiles')
      .select('ruolo_livello')
      .eq('id', user.id)
      .single()

    if (!profile || !['admin', 'hpa'].includes(profile.ruolo_livello)) {
      return Response.json({ error: 'Solo HPA puo\' creare report' }, { status: 403 })
    }

    const body = await request.json()
    const {
      centro_id, sintesi, punti_forza, punti_debolezza,
      obiettivi_stato, obiettivi_note, valutazione_beautyx,
      valutazione_beautyx_note, valutazione_punteggio,
      raccomandazioni, durata_minuti
    } = body

    if (!centro_id || !sintesi?.trim()) {
      return Response.json({ error: 'centro_id e sintesi sono obbligatori' }, { status: 400 })
    }

    const { data: report, error } = await supabase
      .from('hpa_session_reports')
      .insert({
        hpa_id: user.id,
        centro_id,
        sintesi: sintesi.trim(),
        punti_forza: punti_forza?.trim() || null,
        punti_debolezza: punti_debolezza?.trim() || null,
        obiettivi_stato: obiettivi_stato || 'non_definiti',
        obiettivi_note: obiettivi_note?.trim() || null,
        valutazione_beautyx: valutazione_beautyx || 'sufficiente',
        valutazione_beautyx_note: valutazione_beautyx_note?.trim() || null,
        valutazione_punteggio: valutazione_punteggio || null,
        raccomandazioni: raccomandazioni?.trim() || null,
        durata_minuti: durata_minuti || null
      })
      .select()
      .single()

    if (error) throw error

    return Response.json({ success: true, report })
  } catch (error) {
    console.error('Errore crea report:', error)
    return Response.json({ error: error.message }, { status: 500 })
  }
}

// PUT: Aggiorna report (solo autore, entro 24h)
export async function PUT(request) {
  try {
    const cookieStore = await cookies()
    const supabase = createSupabase(cookieStore)

    const { data: { user } } = await supabase.auth.getUser()
    if (!user) {
      return Response.json({ error: 'Non autenticato' }, { status: 401 })
    }

    const body = await request.json()
    const { id, ...updates } = body

    if (!id) {
      return Response.json({ error: 'id report richiesto' }, { status: 400 })
    }

    // Verifica proprieta' e limite 24h (gestito da RLS policy)
    const { data: report, error } = await supabase
      .from('hpa_session_reports')
      .update({
        ...(updates.sintesi && { sintesi: updates.sintesi.trim() }),
        ...(updates.punti_forza !== undefined && { punti_forza: updates.punti_forza?.trim() || null }),
        ...(updates.punti_debolezza !== undefined && { punti_debolezza: updates.punti_debolezza?.trim() || null }),
        ...(updates.obiettivi_stato && { obiettivi_stato: updates.obiettivi_stato }),
        ...(updates.obiettivi_note !== undefined && { obiettivi_note: updates.obiettivi_note?.trim() || null }),
        ...(updates.valutazione_beautyx && { valutazione_beautyx: updates.valutazione_beautyx }),
        ...(updates.valutazione_beautyx_note !== undefined && { valutazione_beautyx_note: updates.valutazione_beautyx_note?.trim() || null }),
        ...(updates.valutazione_punteggio !== undefined && { valutazione_punteggio: updates.valutazione_punteggio }),
        ...(updates.raccomandazioni !== undefined && { raccomandazioni: updates.raccomandazioni?.trim() || null }),
        ...(updates.durata_minuti !== undefined && { durata_minuti: updates.durata_minuti })
      })
      .eq('id', id)
      .eq('hpa_id', user.id)
      .select()
      .single()

    if (error) throw error

    if (!report) {
      return Response.json({ error: 'Report non trovato o non modificabile (oltre 24h)' }, { status: 404 })
    }

    return Response.json({ success: true, report })
  } catch (error) {
    console.error('Errore aggiorna report:', error)
    return Response.json({ error: error.message }, { status: 500 })
  }
}
