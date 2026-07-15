import { cookies } from 'next/headers'
import { createServerClient } from '@supabase/ssr'
import { createClient } from '@supabase/supabase-js'

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
const supabaseServiceKey = process.env.SUPABASE_SERVICE_KEY

function getAuthClient(cookieStore) {
  return createServerClient(supabaseUrl, process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY, {
    cookies: {
      getAll() { return cookieStore.getAll() },
      setAll(cookiesToSet) {
        cookiesToSet.forEach(({ name, value, options }) => cookieStore.set(name, value, options))
      }
    }
  })
}

// POST: Crea una nuova sessione di chiamata
export async function POST(request) {
  try {
    const cookieStore = await cookies()
    const { data: { user } } = await getAuthClient(cookieStore).auth.getUser()
    if (!user) return Response.json({ error: 'Non autenticato' }, { status: 401 })

    const { centro_id, hpa_id, call_type = 'audio' } = await request.json()

    const admin = createClient(supabaseUrl, supabaseServiceKey)
    const yearMonth = new Date().toISOString().slice(0, 7)

    // Controlla se ci sono minuti rimasti
    const { data: credits } = await admin
      .from('hpa_minute_credits')
      .select('minutes_total, minutes_used, minutes_extra')
      .eq('user_id', user.id)
      .eq('year_month', yearMonth)
      .maybeSingle()

    const minutesTotal = credits?.minutes_total || 30
    const minutesUsed = credits?.minutes_used || 0
    const minutesExtra = credits?.minutes_extra || 0
    const remaining = Math.max(0, minutesTotal + minutesExtra - minutesUsed)

    if (remaining <= 0) {
      return Response.json({ error: 'Minuti esauriti per questo mese. Acquista minuti aggiuntivi per continuare.' }, { status: 403 })
    }

    // Genera URL Jitsi univoco
    const roomId = `BeautyX-${Math.random().toString(36).substr(2, 9)}-${Date.now()}`
    const roomUrl = `https://meet.jit.si/${roomId}`

    const { data: session, error } = await admin
      .from('hpa_call_sessions')
      .insert({
        centro_id: centro_id || null,
        client_id: user.id,
        hpa_id: hpa_id || null,
        call_type,
        room_url: roomUrl,
        status: 'requested'
      })
      .select()
      .single()

    if (error) throw error

    return Response.json({ session, remaining_minutes: remaining })
  } catch (error) {
    console.error('Errore creazione chiamata:', error)
    return Response.json({ error: error.message }, { status: 500 })
  }
}

// GET: Recupera i dati di una sessione
export async function GET(request) {
  try {
    const cookieStore = await cookies()
    const { data: { user } } = await getAuthClient(cookieStore).auth.getUser()
    if (!user) return Response.json({ error: 'Non autenticato' }, { status: 401 })

    const { searchParams } = new URL(request.url)
    const session_id = searchParams.get('session_id')
    if (!session_id) return Response.json({ error: 'session_id richiesto' }, { status: 400 })

    const admin = createClient(supabaseUrl, supabaseServiceKey)
    const { data: session } = await admin
      .from('hpa_call_sessions')
      .select('*')
      .eq('id', session_id)
      .or(`client_id.eq.${user.id},hpa_id.eq.${user.id}`)
      .maybeSingle()

    if (!session) return Response.json({ error: 'Sessione non trovata' }, { status: 404 })

    return Response.json({ session })
  } catch (error) {
    console.error('Errore get chiamata:', error)
    return Response.json({ error: error.message }, { status: 500 })
  }
}

// PATCH: start / end della chiamata
export async function PATCH(request) {
  try {
    const cookieStore = await cookies()
    const { data: { user } } = await getAuthClient(cookieStore).auth.getUser()
    if (!user) return Response.json({ error: 'Non autenticato' }, { status: 401 })

    const { session_id, action, duration_seconds } = await request.json()
    const admin = createClient(supabaseUrl, supabaseServiceKey)

    const { data: session } = await admin
      .from('hpa_call_sessions')
      .select('*')
      .eq('id', session_id)
      .or(`client_id.eq.${user.id},hpa_id.eq.${user.id}`)
      .maybeSingle()

    if (!session) return Response.json({ error: 'Sessione non trovata' }, { status: 404 })

    if (action === 'start') {
      const { data: updated } = await admin
        .from('hpa_call_sessions')
        .update({ status: 'active', started_at: new Date().toISOString() })
        .eq('id', session_id)
        .select()
        .single()
      return Response.json({ session: updated })
    }

    if (action === 'end') {
      const durSecs = duration_seconds || 0
      const minutesDeducted = Math.max(1, Math.ceil(durSecs / 60))

      const { data: updated } = await admin
        .from('hpa_call_sessions')
        .update({
          status: 'completed',
          ended_at: new Date().toISOString(),
          duration_seconds: durSecs,
          minutes_deducted: minutesDeducted
        })
        .eq('id', session_id)
        .select()
        .single()

      // Deduci minuti dai crediti mensili
      const yearMonth = new Date().toISOString().slice(0, 7)
      const { data: creds } = await admin
        .from('hpa_minute_credits')
        .select('id, minutes_used')
        .eq('user_id', session.client_id)
        .eq('year_month', yearMonth)
        .maybeSingle()

      if (creds) {
        await admin
          .from('hpa_minute_credits')
          .update({
            minutes_used: creds.minutes_used + minutesDeducted,
            updated_at: new Date().toISOString()
          })
          .eq('id', creds.id)
      }

      return Response.json({ session: updated, minutes_deducted: minutesDeducted })
    }

    if (action === 'cancel') {
      const { data: updated } = await admin
        .from('hpa_call_sessions')
        .update({ status: 'cancelled', ended_at: new Date().toISOString() })
        .eq('id', session_id)
        .select()
        .single()
      return Response.json({ session: updated })
    }

    return Response.json({ error: 'Azione non valida' }, { status: 400 })
  } catch (error) {
    console.error('Errore update chiamata:', error)
    return Response.json({ error: error.message }, { status: 500 })
  }
}
