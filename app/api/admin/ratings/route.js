import { cookies } from 'next/headers'
import { createServerClient } from '@supabase/ssr'
import { createClient } from '@supabase/supabase-js'

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
const supabaseServiceKey = process.env.SUPABASE_SERVICE_KEY

async function getAdminUser(cookieStore) {
  const authClient = createServerClient(supabaseUrl, process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY, {
    cookies: {
      getAll() { return cookieStore.getAll() },
      setAll(cookiesToSet) {
        cookiesToSet.forEach(({ name, value, options }) => cookieStore.set(name, value, options))
      }
    }
  })
  const { data: { user } } = await authClient.auth.getUser()
  if (!user) return null
  const { data: profile } = await authClient.from('user_profiles').select('ruolo_livello, ruolo').eq('id', user.id).single()
  if (profile?.ruolo_livello !== 'admin' && profile?.ruolo !== 'admin') return null
  return user
}

// GET - Aggregate ratings per admin
// ?type=beautyx  → stats + distribuzione + ultime recensioni
// ?type=hpa      → per-HPA stats + ultime recensioni
// (nessun param) → summary di entrambi
export async function GET(request) {
  try {
    const cookieStore = await cookies()
    const user = await getAdminUser(cookieStore)
    if (!user) return Response.json({ error: 'Accesso negato' }, { status: 403 })

    const admin = createClient(supabaseUrl, supabaseServiceKey)
    const { searchParams } = new URL(request.url)
    const type = searchParams.get('type')

    if (type === 'beautyx') {
      const { data: ratings } = await admin
        .from('ratings')
        .select('rating, review, created_at, user_id')
        .eq('target_type', 'beautyx')
        .order('created_at', { ascending: false })

      const all = ratings || []
      const avg = all.length > 0 ? (all.reduce((s, r) => s + r.rating, 0) / all.length) : 0
      const distribution = [5, 4, 3, 2, 1].map(star => ({
        star,
        count: all.filter(r => r.rating === star).length,
        pct: all.length > 0 ? Math.round((all.filter(r => r.rating === star).length / all.length) * 100) : 0
      }))

      // Prendi ultime 10 recensioni con testo
      const recent = all.filter(r => r.review).slice(0, 10)

      // Trend ultimi 30gg
      const thirtyDaysAgo = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString()
      const recent30 = all.filter(r => r.created_at > thirtyDaysAgo)
      const avg30 = recent30.length > 0 ? (recent30.reduce((s, r) => s + r.rating, 0) / recent30.length) : null

      return Response.json({
        type: 'beautyx',
        total: all.length,
        avg: Math.round(avg * 10) / 10,
        avg_30d: avg30 ? Math.round(avg30 * 10) / 10 : null,
        distribution,
        recent_reviews: recent
      })
    }

    if (type === 'hpa') {
      const { data: ratings } = await admin
        .from('ratings')
        .select('rating, review, created_at, target_id, target_name')
        .eq('target_type', 'hpa')
        .order('created_at', { ascending: false })

      const all = ratings || []

      // Raggruppa per HPA
      const hpaMap = {}
      all.forEach(r => {
        const key = r.target_id || r.target_name || 'sconosciuto'
        if (!hpaMap[key]) {
          hpaMap[key] = {
            target_id: r.target_id,
            target_name: r.target_name,
            ratings: [],
            reviews: []
          }
        }
        hpaMap[key].ratings.push(r.rating)
        if (r.review) hpaMap[key].reviews.push({ review: r.review, created_at: r.created_at, rating: r.rating })
      })

      const hpaStats = Object.values(hpaMap).map(h => ({
        target_id: h.target_id,
        target_name: h.target_name,
        total: h.ratings.length,
        avg: Math.round((h.ratings.reduce((s, r) => s + r, 0) / h.ratings.length) * 10) / 10,
        last_review: h.reviews[0] || null
      })).sort((a, b) => b.avg - a.avg)

      const recentReviews = all.filter(r => r.review).slice(0, 10)

      return Response.json({
        type: 'hpa',
        total: all.length,
        hpa_stats: hpaStats,
        recent_reviews: recentReviews
      })
    }

    // Summary: entrambi
    const { data: all } = await admin.from('ratings').select('target_type, rating')
    const beautyx = (all || []).filter(r => r.target_type === 'beautyx')
    const hpa = (all || []).filter(r => r.target_type === 'hpa')

    return Response.json({
      beautyx: {
        total: beautyx.length,
        avg: beautyx.length > 0 ? Math.round((beautyx.reduce((s, r) => s + r.rating, 0) / beautyx.length) * 10) / 10 : 0
      },
      hpa: {
        total: hpa.length,
        avg: hpa.length > 0 ? Math.round((hpa.reduce((s, r) => s + r.rating, 0) / hpa.length) * 10) / 10 : 0
      }
    })
  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 })
  }
}
