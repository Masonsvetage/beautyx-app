import { cookies } from 'next/headers'
import { createServerClient } from '@supabase/ssr'

// GET: Ottieni slot disponibili per una data
// POST: Prenota un appuntamento
export async function GET(request) {
  try {
    const cookieStore = await cookies()
    const supabase = createServerClient(
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

    const { data: { user } } = await supabase.auth.getUser()
    if (!user) {
      return Response.json({ error: 'Non autenticato' }, { status: 401 })
    }

    const { searchParams } = new URL(request.url)
    const hpa_id = searchParams.get('hpa_id')
    const date = searchParams.get('date') // YYYY-MM-DD
    const durata = parseInt(searchParams.get('durata') || '30')

    if (!hpa_id || !date) {
      return Response.json({ error: 'hpa_id e date richiesti' }, { status: 400 })
    }

    // Usa la funzione SQL per ottenere slot disponibili
    const { data: slots, error } = await supabase
      .rpc('get_available_slots', {
        p_hpa_id: hpa_id,
        p_date: date,
        p_durata: durata
      })

    if (error) throw error

    // Filtra solo slot disponibili
    const available = (slots || []).filter(s => s.disponibile)

    return Response.json({
      date,
      durata,
      slots: available
    })
  } catch (error) {
    console.error('Errore get slot:', error)
    return Response.json({ error: error.message }, { status: 500 })
  }
}

export async function POST(request) {
  try {
    const cookieStore = await cookies()
    const supabase = createServerClient(
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

    const { data: { user } } = await supabase.auth.getUser()
    if (!user) {
      return Response.json({ error: 'Non autenticato' }, { status: 401 })
    }

    const body = await request.json()
    const { hpa_id, date, ora_inizio, durata, note, tipo_contatto = 'chat' } = body

    if (!hpa_id || !date || !ora_inizio || !durata) {
      return Response.json({ error: 'hpa_id, date, ora_inizio e durata richiesti' }, { status: 400 })
    }

    // Ottieni centro_id dell'utente
    const { data: profile } = await supabase
      .from('user_profiles')
      .select('centro_id')
      .eq('id', user.id)
      .single()

    if (!profile?.centro_id) {
      return Response.json({ error: 'Nessun centro associato' }, { status: 400 })
    }

    // Verifica saldo minuti
    const { data: balance } = await supabase
      .rpc('get_minute_balance', { p_centro_id: profile.centro_id })

    if (!balance || balance.length === 0) {
      return Response.json({ error: 'Nessun abbonamento attivo' }, { status: 400 })
    }

    const subscription = balance[0]
    if (subscription.minuti_rimanenti < durata) {
      return Response.json({
        error: 'Minuti insufficienti',
        minuti_rimanenti: subscription.minuti_rimanenti,
        minuti_richiesti: durata
      }, { status: 400 })
    }

    // Prenota usando la funzione SQL
    const { data: appointmentId, error } = await supabase
      .rpc('book_appointment', {
        p_hpa_id: hpa_id,
        p_centro_id: profile.centro_id,
        p_date: date,
        p_ora_inizio: ora_inizio,
        p_durata: durata,
        p_note: note
      })

    if (error) {
      if (error.message.includes('non disponibile')) {
        return Response.json({ error: 'Slot non più disponibile' }, { status: 409 })
      }
      throw error
    }

    // Genera URL stanza Jitsi per audio/video (deterministico: basato sull'ID appuntamento)
    const roomUrl = (tipo_contatto === 'audio' || tipo_contatto === 'video')
      ? `https://meet.jit.si/BeautyX-${appointmentId}`
      : null

    // Aggiorna appuntamento con tipo_contatto e room_url
    await supabase
      .from('hpa_appointments')
      .update({
        tipo_contatto,
        room_url: roomUrl,
        note_cliente: note || null
      })
      .eq('id', appointmentId)

    // Ottieni dettagli appuntamento creato
    const { data: appointment } = await supabase
      .from('hpa_appointments')
      .select('*, centro:beauty_centers(nome)')
      .eq('id', appointmentId)
      .single()

    return Response.json({
      success: true,
      appointment,
      minuti_rimanenti: subscription.minuti_rimanenti - durata
    })
  } catch (error) {
    console.error('Errore prenotazione:', error)
    return Response.json({ error: error.message }, { status: 500 })
  }
}
