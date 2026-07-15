import { cookies } from 'next/headers'
import { createServerClient } from '@supabase/ssr'

// GET: Classifica clienti dell'HPA
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
      return Response.json({ error: 'Solo HPA può vedere la classifica' }, { status: 403 })
    }

    const { searchParams } = new URL(request.url)
    const limit = parseInt(searchParams.get('limit') || '20')
    const orderBy = searchParams.get('order_by') || 'punteggio_totale'

    // Usa la funzione SQL per ranking (solo p_hpa_id)
    const { data: ranking, error } = await supabase
      .rpc('get_hpa_client_ranking', {
        p_hpa_id: user.id
      })

    if (error) throw error

    // Applica limit client-side
    const limitedRanking = (ranking || []).slice(0, limit)

    return Response.json({
      ranking: limitedRanking,
      orderBy,
      total: ranking?.length || 0
    })
  } catch (error) {
    console.error('Errore get ranking:', error)
    return Response.json({ error: error.message }, { status: 500 })
  }
}
