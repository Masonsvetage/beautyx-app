import { createClient } from '@supabase/supabase-js'

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_KEY
)

// GET /api/public/newsletter-archive?limit=12&tag=Prezzi%20%26%20margini
// Espone i numeri di newsletter già pubblicati (tabella public.newsletter_posts),
// usati dalla sezione "Newsletter già uscite" di /newsletter.
// Nota: usa il service key solo per semplicità server-side; il risultato è
// comunque limitato ai soli record con pubblicato = true (stesso filtro della
// policy RLS di lettura pubblica), quindi non espone bozze.
export async function GET(request) {
  try {
    const { searchParams } = new URL(request.url)
    const limit = Math.min(parseInt(searchParams.get('limit') || '12', 10) || 12, 50)
    const tag = searchParams.get('tag')

    let query = supabase
      .from('newsletter_posts')
      .select('id, slug, titolo, estratto, contenuto, tags, data_pubblicazione')
      .eq('pubblicato', true)
      .order('data_pubblicazione', { ascending: false })
      .limit(limit)

    if (tag) query = query.contains('tags', [tag])

    const { data, error } = await query
    if (error) throw error

    return Response.json({ articoli: data || [] })
  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 })
  }
}
