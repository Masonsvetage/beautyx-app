import { createClient } from '@supabase/supabase-js'

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_KEY
)

export async function GET() {
  try {
    // Config marketing (benchmark manuali)
    const { data: config } = await supabase
      .from('marketing_config')
      .select('key, value, label, icona')

    const cfg = {}
    ;(config || []).forEach(c => { cfg[c.key] = c })

    // Statistiche live dal DB
    const [{ count: centriCount }, { count: usersCount }, ratingRes] = await Promise.all([
      supabase.from('beauty_centers').select('*', { count: 'exact', head: true }),
      supabase.from('user_profiles').select('*', { count: 'exact', head: true }).eq('attivo', true),
      supabase.from('ratings').select('rating').eq('target_type', 'beautyx')
    ])

    const ratings = ratingRes.data || []
    const avgRating = ratings.length > 0
      ? (ratings.reduce((s, r) => s + r.rating, 0) / ratings.length).toFixed(1)
      : cfg.soddisfazione_media?.value || '4.8'

    // Aggiorna automaticamente centri_attivi se > 0
    if (centriCount > 0) {
      await supabase
        .from('marketing_config')
        .update({ value: String(centriCount) })
        .eq('key', 'centri_attivi')
    }

    return Response.json({
      config: cfg,
      live: {
        centri_attivi: centriCount || 0,
        utenti_attivi: usersCount || 0,
        avg_rating: parseFloat(avgRating),
        total_ratings: ratings.length
      }
    })
  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 })
  }
}
