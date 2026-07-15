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

    // Esegui tutte le query in parallelo
    const [
      dashboardStats,
      healthSummary,
      registrationTrend,
      hpaPerformance,
      activityLevels,
      recentUsers
    ] = await Promise.all([
      supabaseAdmin.rpc('get_admin_dashboard_stats').then(r => r.data?.[0] || r.data || {}),
      supabaseAdmin.rpc('get_system_health_summary').then(r => r.data?.[0] || r.data || {}),
      supabaseAdmin.rpc('get_registration_trend', { p_days: 30 }).then(r => r.data || []),
      supabaseAdmin.rpc('get_admin_hpa_performance').then(r => r.data || []),
      supabaseAdmin.rpc('get_user_activity_levels').then(r => r.data || []),
      supabaseAdmin.from('user_profiles')
        .select('id, email, nome, cognome, ruolo_livello, created_at, last_login_at')
        .order('created_at', { ascending: false })
        .limit(10)
        .then(r => r.data || [])
    ])

    return NextResponse.json({
      stats: dashboardStats,
      health: healthSummary,
      registrationTrend,
      hpaPerformance,
      activityLevels,
      recentUsers
    })
  } catch (error) {
    console.error('Errore dashboard admin:', error)
    return NextResponse.json({ error: 'Errore interno' }, { status: 500 })
  }
}
