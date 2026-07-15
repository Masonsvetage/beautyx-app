import { cookies } from 'next/headers'
import { createServerClient } from '@supabase/ssr'

// GET: Conteggio messaggi non letti per centro
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

    const { data, error } = await supabase
      .rpc('get_unread_message_count', { p_user_id: user.id })

    if (error) throw error

    // Calcola totale
    const total = (data || []).reduce((sum, item) => sum + parseInt(item.unread_count || 0), 0)

    return Response.json({
      total_unread: total,
      by_centro: data || []
    })
  } catch (error) {
    console.error('Errore conteggio non letti:', error)
    return Response.json({ error: error.message }, { status: 500 })
  }
}
