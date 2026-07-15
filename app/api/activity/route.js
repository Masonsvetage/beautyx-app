import { createClient } from '@supabase/supabase-js'
import { cookies } from 'next/headers'
import { createServerClient } from '@supabase/ssr'

// POST: Log attività utente
// GET: Lista utenti con ultima attività (per HPA)
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
    const { activity_type, centro_id, page_context, metadata } = body

    if (!activity_type) {
      return Response.json({ error: 'activity_type richiesto' }, { status: 400 })
    }

    // Usa service role per inserire (bypass RLS)
    const supabaseAdmin = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL,
      process.env.SUPABASE_SERVICE_KEY
    )

    const { data, error } = await supabaseAdmin
      .from('user_activity_log')
      .insert({
        user_id: user.id,
        centro_id,
        activity_type,
        page_context,
        metadata: metadata || {}
      })
      .select()
      .single()

    if (error) throw error

    return Response.json({ success: true, activity: data })
  } catch (error) {
    console.error('Errore log attività:', error)
    return Response.json({ error: error.message }, { status: 500 })
  }
}

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

    // Verifica ruolo HPA o admin
    const { data: profile } = await supabase
      .from('user_profiles')
      .select('ruolo_livello')
      .eq('id', user.id)
      .single()

    if (!profile || !['admin', 'hpa'].includes(profile.ruolo_livello)) {
      return Response.json({ error: 'Accesso negato' }, { status: 403 })
    }

    const { searchParams } = new URL(request.url)
    const days_threshold = parseInt(searchParams.get('days') || '7')

    // Usa la funzione SQL per ottenere utenti inattivi
    const { data, error } = await supabase
      .rpc('get_inactive_users', {
        p_hpa_id: user.id,
        p_days_threshold: days_threshold
      })

    if (error) throw error

    return Response.json({ inactive_users: data || [] })
  } catch (error) {
    console.error('Errore lista utenti:', error)
    return Response.json({ error: error.message }, { status: 500 })
  }
}
