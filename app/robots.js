export default function robots() {
  const baseUrl = process.env.NEXT_PUBLIC_SITE_URL || 'https://beautyx.it'
  return {
    rules: [
      {
        userAgent: '*',
        allow: '/',
        disallow: ['/admin', '/dashboard', '/hpa', '/api/', '/settings', '/unauthorized'],
      },
    ],
    sitemap: `${baseUrl}/sitemap.xml`,
  }
}
