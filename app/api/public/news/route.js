import { createClient } from '@supabase/supabase-js'

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_KEY
)

export async function GET(request) {
  try {
    const { searchParams } = new URL(request.url)
    const limit = parseInt(searchParams.get('limit') || '6')
    const evidenza = searchParams.get('evidenza') === 'true'

    let query = supabase
      .from('news_posts')
      .select('id, titolo, excerpt, contenuto, immagine_url, categoria, in_evidenza, published_at, created_at')
      .eq('pubblicato', true)
      .order('in_evidenza', { ascending: false })
      .order('published_at', { ascending: false })
      .limit(limit)

    if (evidenza) query = query.eq('in_evidenza', true)

    const { data, error } = await query
    if (error) throw error

    return Response.json({ news: data || [] })
  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 })
  }
}
