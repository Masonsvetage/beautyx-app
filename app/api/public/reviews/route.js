import { createClient } from '@supabase/supabase-js'

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_KEY
)

export async function GET(request) {
  try {
    const { searchParams } = new URL(request.url)
    const limit = parseInt(searchParams.get('limit') || '8')

    const { data, error } = await supabase
      .from('ratings')
      .select('id, target_type, target_name, rating, review, approved_at')
      .eq('is_public', true)
      .not('review', 'is', null)
      .order('approved_at', { ascending: false })
      .limit(limit)

    if (error) throw error

    return Response.json({ reviews: data || [] })
  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 })
  }
}
