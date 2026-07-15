import { cookies } from 'next/headers'
import { createServerClient } from '@supabase/ssr'

// GET: Storico conversazioni BeautyX di un centro (per HPA)
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

    // Verifica ruolo HPA/admin
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
    const conversation_id = searchParams.get('conversation_id')

    if (!centro_id) {
      return Response.json({ error: 'centro_id richiesto' }, { status: 400 })
    }

    if (conversation_id) {
      // Messaggi di una specifica conversazione
      const { data: messages, error } = await supabase
        .rpc('get_beautyx_conversation_messages', {
          p_conversation_id: conversation_id,
          p_hpa_id: user.id,
          p_limit: 200,
          p_offset: 0
        })

      if (error) throw error

      return Response.json({ messages: messages || [] })
    }

    // Lista conversazioni BeautyX del centro
    const { data: conversations, error } = await supabase
      .rpc('get_centro_beautyx_conversations', {
        p_centro_id: centro_id,
        p_hpa_id: user.id
      })

    if (error) throw error

    return Response.json({ conversations: conversations || [] })
  } catch (error) {
    console.error('Errore storico beautyx:', error)
    return Response.json({ error: error.message }, { status: 500 })
  }
}
