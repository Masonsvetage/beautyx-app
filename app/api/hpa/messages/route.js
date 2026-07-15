import { cookies } from 'next/headers'
import { createServerClient } from '@supabase/ssr'

// GET: Ottieni messaggi (thread con un centro specifico)
// POST: Invia messaggio
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
    const centro_id = searchParams.get('centro_id')
    const limit = parseInt(searchParams.get('limit') || '50')
    const offset = parseInt(searchParams.get('offset') || '0')

    // Ottieni profilo per capire se è HPA o cliente
    const { data: profile } = await supabase
      .from('user_profiles')
      .select('ruolo_livello, centro_id')
      .eq('id', user.id)
      .single()

    if (!profile) {
      return Response.json({ error: 'Profilo non trovato' }, { status: 404 })
    }

    const isHpa = ['admin', 'hpa'].includes(profile.ruolo_livello)

    if (!centro_id && !isHpa) {
      // Cliente senza centro_id: usa il proprio
      if (!profile.centro_id) {
        return Response.json({ error: 'Nessun centro associato' }, { status: 400 })
      }
    }

    const targetCentroId = centro_id || profile.centro_id

    if (isHpa) {
      // HPA: ottieni messaggi con un centro specifico
      const { data: messages, error } = await supabase
        .rpc('get_message_thread', {
          p_hpa_id: user.id,
          p_centro_id: targetCentroId,
          p_limit: limit,
          p_offset: offset
        })

      if (error) throw error

      return Response.json({ messages: messages || [] })
    } else {
      // Cliente: ottieni messaggi del proprio centro
      const { data: messages, error } = await supabase
        .from('hpa_client_messages')
        .select('id, sender_type, contenuto, letto, created_at')
        .eq('centro_id', targetCentroId)
        .order('created_at', { ascending: false })
        .range(offset, offset + limit - 1)

      if (error) throw error

      return Response.json({ messages: messages || [] })
    }
  } catch (error) {
    console.error('Errore get messaggi:', error)
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
    const { centro_id, contenuto } = body

    if (!contenuto || !contenuto.trim()) {
      return Response.json({ error: 'Contenuto messaggio richiesto' }, { status: 400 })
    }

    // Ottieni profilo
    const { data: profile } = await supabase
      .from('user_profiles')
      .select('ruolo_livello, centro_id')
      .eq('id', user.id)
      .single()

    if (!profile) {
      return Response.json({ error: 'Profilo non trovato' }, { status: 404 })
    }

    const isHpa = ['admin', 'hpa'].includes(profile.ruolo_livello)
    const targetCentroId = centro_id || profile.centro_id

    if (!targetCentroId) {
      return Response.json({ error: 'centro_id richiesto' }, { status: 400 })
    }

    // Trova l'HPA assegnato al centro (se cliente)
    let hpaId = user.id
    if (!isHpa) {
      const { data: assignment } = await supabase
        .from('hpa_centro_assignments')
        .select('hpa_id')
        .eq('centro_id', targetCentroId)
        .or('data_fine.is.null,data_fine.gte.' + new Date().toISOString().split('T')[0])
        .limit(1)
        .single()

      if (!assignment) {
        return Response.json({ error: 'Nessun HPA assegnato a questo centro' }, { status: 400 })
      }
      hpaId = assignment.hpa_id
    }

    // Inserisci messaggio
    const { data: message, error } = await supabase
      .from('hpa_client_messages')
      .insert({
        hpa_id: hpaId,
        centro_id: targetCentroId,
        sender_type: isHpa ? 'hpa' : 'client',
        contenuto: contenuto.trim()
      })
      .select()
      .single()

    if (error) throw error

    return Response.json({ success: true, message })
  } catch (error) {
    console.error('Errore invio messaggio:', error)
    return Response.json({ error: error.message }, { status: 500 })
  }
}
