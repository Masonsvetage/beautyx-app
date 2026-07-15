import { cookies } from 'next/headers'
import { createServerClient } from '@supabase/ssr'

// POST: Segna messaggi come letti per un centro
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
    const { centro_id } = body

    if (!centro_id) {
      return Response.json({ error: 'centro_id richiesto' }, { status: 400 })
    }

    const { data, error } = await supabase
      .rpc('mark_messages_as_read', {
        p_user_id: user.id,
        p_centro_id: centro_id
      })

    if (error) throw error

    return Response.json({
      success: true,
      messages_marked: data
    })
  } catch (error) {
    console.error('Errore mark read:', error)
    return Response.json({ error: error.message }, { status: 500 })
  }
}
