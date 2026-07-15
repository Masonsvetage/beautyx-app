import { cookies } from 'next/headers'
import { createServerClient } from '@supabase/ssr'

// GET: Lista richieste contatto (per HPA)
// POST: Crea nuova richiesta contatto (per clienti)
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

    // Verifica ruolo HPA
    const { data: profile } = await supabase
      .from('user_profiles')
      .select('ruolo_livello')
      .eq('id', user.id)
      .single()

    if (!profile || !['admin', 'hpa'].includes(profile.ruolo_livello)) {
      return Response.json({ error: 'Solo HPA può vedere le richieste' }, { status: 403 })
    }

    const { searchParams } = new URL(request.url)
    const stato = searchParams.get('stato') // 'pending', 'in_lavorazione', 'completato'

    let query = supabase
      .from('contact_requests')
      .select(`
        *,
        centro:beauty_centers!inner(id, nome, hpa_id)
      `)
      .eq('centro.hpa_id', user.id)
      .order('created_at', { ascending: false })

    if (stato) {
      query = query.eq('stato', stato)
    }

    const { data: requests, error } = await query

    if (error) throw error

    return Response.json({ requests: requests || [] })
  } catch (error) {
    console.error('Errore get contact requests:', error)
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

    // Ottieni centro_id dell'utente
    const { data: profile } = await supabase
      .from('user_profiles')
      .select('centro_id')
      .eq('id', user.id)
      .single()

    if (!profile?.centro_id) {
      return Response.json({ error: 'Nessun centro associato' }, { status: 400 })
    }

    const body = await request.json()
    const { urgenza, motivo } = body

    if (!motivo) {
      return Response.json({ error: 'Motivo richiesto' }, { status: 400 })
    }

    const validUrgenze = ['bassa', 'normale', 'alta', 'urgente']
    const urgenzaValue = validUrgenze.includes(urgenza) ? urgenza : 'normale'

    const { data, error } = await supabase
      .from('contact_requests')
      .insert({
        centro_id: profile.centro_id,
        urgenza: urgenzaValue,
        motivo
      })
      .select()
      .single()

    if (error) throw error

    return Response.json({ success: true, request: data })
  } catch (error) {
    console.error('Errore create contact request:', error)
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

    // Verifica ruolo HPA
    const { data: profile } = await supabase
      .from('user_profiles')
      .select('ruolo_livello')
      .eq('id', user.id)
      .single()

    if (!profile || !['admin', 'hpa'].includes(profile.ruolo_livello)) {
      return Response.json({ error: 'Solo HPA può aggiornare le richieste' }, { status: 403 })
    }

    const body = await request.json()
    const { request_id, stato, risposta } = body

    if (!request_id) {
      return Response.json({ error: 'request_id richiesto' }, { status: 400 })
    }

    const updates = {}
    if (stato) {
      updates.stato = stato
      if (stato === 'in_lavorazione') {
        updates.preso_in_carico_da = user.id
        updates.preso_in_carico_at = new Date().toISOString()
      }
    }
    if (risposta) {
      updates.risposta = risposta
      updates.risposto_at = new Date().toISOString()
    }

    const { data, error } = await supabase
      .from('contact_requests')
      .update(updates)
      .eq('id', request_id)
      .select()
      .single()

    if (error) throw error

    return Response.json({ success: true, request: data })
  } catch (error) {
    console.error('Errore update contact request:', error)
    return Response.json({ error: error.message }, { status: 500 })
  }
}
