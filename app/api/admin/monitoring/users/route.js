import { cookies } from 'next/headers'
import { createServerClient } from '@supabase/ssr'
import { createClient } from '@supabase/supabase-js'
import { NextResponse } from 'next/server'

export async function GET(request) {
  try {
    const cookieStore = await cookies()

    // Verifica autenticazione
    const supabase = createServerClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY,
      {
        cookies: {
          getAll() {
            return cookieStore.getAll()
          },
        },
      }
    )

    const { data: { user } } = await supabase.auth.getUser()
    if (!user) {
      return NextResponse.json({ error: 'Non autenticato' }, { status: 401 })
    }

    // Verifica ruolo admin
    const { data: profile } = await supabase
      .from('user_profiles')
      .select('ruolo, ruolo_livello')
      .eq('id', user.id)
      .single()

    if (profile?.ruolo !== 'admin' && profile?.ruolo_livello !== 'admin') {
      return NextResponse.json({ error: 'Non autorizzato' }, { status: 403 })
    }

    // Client con service role per accesso completo
    const supabaseAdmin = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL,
      process.env.SUPABASE_SERVICE_KEY
    )

    // Query in parallelo: livelli attivita + statistiche recenti
    const now = new Date()
    const oneWeekAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000).toISOString()
    const oneMonthAgo = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000).toISOString()

    const [activityLevelsResult, totalUsersResult, newThisWeekResult, newThisMonthResult] = await Promise.all([
      supabaseAdmin.rpc('get_user_activity_levels'),
      supabaseAdmin.from('user_profiles').select('id', { count: 'exact', head: true }),
      supabaseAdmin.from('user_profiles').select('id', { count: 'exact', head: true }).gte('created_at', oneWeekAgo),
      supabaseAdmin.from('user_profiles').select('id', { count: 'exact', head: true }).gte('created_at', oneMonthAgo)
    ])

    if (activityLevelsResult.error) {
      console.error('Errore RPC get_user_activity_levels:', activityLevelsResult.error)
      return NextResponse.json({ error: 'Errore recupero livelli attivita' }, { status: 500 })
    }

    return NextResponse.json({
      activityLevels: activityLevelsResult.data || [],
      stats: {
        totalUsers: totalUsersResult.count || 0,
        newThisWeek: newThisWeekResult.count || 0,
        newThisMonth: newThisMonthResult.count || 0
      }
    })
  } catch (error) {
    console.error('Errore monitoring utenti:', error)
    return NextResponse.json({ error: 'Errore interno' }, { status: 500 })
  }
}
