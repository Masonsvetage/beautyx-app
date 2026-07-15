import { createClient } from '@supabase/supabase-js'

const baseUrl = process.env.NEXT_PUBLIC_SITE_URL || 'https://beautyx.it'

export default async function sitemap() {
  const staticRoutes = [
    { url: baseUrl, lastModified: new Date(), changeFrequency: 'weekly', priority: 1 },
    { url: `${baseUrl}/signup`, lastModified: new Date(), changeFrequency: 'monthly', priority: 0.8 },
    { url: `${baseUrl}/login`, lastModified: new Date(), changeFrequency: 'monthly', priority: 0.5 },
  ]

  try {
    const supabase = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL,
      process.env.SUPABASE_SERVICE_KEY
    )
    const { data: news } = await supabase
      .from('news_posts')
      .select('id, updated_at, created_at')
      .eq('pubblicato', true)

    const newsRoutes = (news || []).map(n => ({
      url: `${baseUrl}/#news`,
      lastModified: new Date(n.updated_at || n.created_at),
      changeFrequency: 'weekly',
      priority: 0.7,
    }))

    return [...staticRoutes, ...newsRoutes]
  } catch {
    return staticRoutes
  }
}
