import { cookies } from 'next/headers'
import { createServerClient } from '@supabase/ssr'

// GET: Lista appuntamenti
// POST: Crea appuntamento (usato internamente, clienti usano /api/booking)
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
    const stato = searchParams.get('stato') // 'confermato', 'completato', etc.
    const from = searchParams.get('from') // data inizio
    const to = searchParams.get('to') // data fine
    const centro_id = searchParams.get('centro_id')

    // Ottieni profilo
    const { data: profile } = await supabase
      .from('user_profiles')
      .select('ruolo_livello, centro_id')
      .eq('id', user.id)
      .single()

    const isHpa = ['admin', 'hpa'].includes(profile?.ruolo_livello)

    let query = supabase
      .from('hpa_appointments')
      .select(`
        *,
        centro:beauty_centers(id, nome)
      `)
      .order('data_appuntamento', { ascending: true })
      .order('ora_inizio', { ascending: true })

    // Filtro per ruolo
    if (isHpa) {
      query = query.eq('hpa_id', user.id)
    } else if (profile?.centro_id) {
      query = query.eq('centro_id', profile.centro_id)
    } else {
      return Response.json({ error: 'Nessun centro associato' }, { status: 400 })
    }

    // Filtri opzionali
    if (stato) {
      query = query.eq('stato', stato)
    }
    if (from) {
      query = query.gte('data_appuntamento', from)
    }
    if (to) {
      query = query.lte('data_appuntamento', to)
    }
    if (centro_id && isHpa) {
      query = query.eq('centro_id', centro_id)
    }

    const { data: appointments, error } = await query

    if (error) throw error

    return Response.json({ appointments: appointments || [] })
  } catch (error) {
    console.error('Errore get appuntamenti:', error)
    return Response.json({ error: error.message }, { status: 500 })
  }
}

export async function PATCH(request) {
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
    const { appointment_id, stato, note, cancellation_reason } = body

    if (!appointment_id) {
      return Response.json({ error: 'appointment_id richiesto' }, { status: 400 })
    }

    const updates = { updated_at: new Date().toISOString() }

    if (stato) {
      updates.stato = stato
      if (stato === 'cancellato') {
        updates.cancelled_by = user.id
        updates.cancelled_at = new Date().toISOString()
        updates.cancellation_reason = cancellation_reason
      }
    }
    if (note !== undefined) {
      updates.note = note
    }

    const { data, error } = await supabase
      .from('hpa_appointments')
      .update(updates)
      .eq('id', appointment_id)
      .select()
      .single()

    if (error) throw error

    return Response.json({ success: true, appointment: data })
  } catch (error) {
    console.error('Errore update appuntamento:', error)
    return Response.json({ error: error.message }, { status: 500 })
  }
}
