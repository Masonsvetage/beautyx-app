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

    // Esegui entrambe le RPC in parallelo
    const [healthResult, centroHealthResult] = await Promise.all([
      supabaseAdmin.rpc('get_system_health_summary'),
      supabaseAdmin.rpc('get_centro_health_scores')
    ])

    if (healthResult.error) {
      console.error('Errore RPC get_system_health_summary:', healthResult.error)
      return NextResponse.json({ error: 'Errore recupero salute sistema' }, { status: 500 })
    }

    if (centroHealthResult.error) {
      console.error('Errore RPC get_centro_health_scores:', centroHealthResult.error)
      return NextResponse.json({ error: 'Errore recupero health score centri' }, { status: 500 })
    }

    return NextResponse.json({
      health: healthResult.data?.[0] || healthResult.data || {},
      centroHealth: centroHealthResult.data || []
    })
  } catch (error) {
    console.error('Errore monitoring sistema:', error)
    return NextResponse.json({ error: 'Errore interno' }, { status: 500 })
  }
}
