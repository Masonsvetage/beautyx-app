const ipRequests = new Map()
const RATE_LIMIT = 3
const RATE_WINDOW_MS = 60 * 60 * 1000

function isRateLimited(ip) {
  const now = Date.now()
  const entry = ipRequests.get(ip)
  if (!entry || now - entry.firstRequest > RATE_WINDOW_MS) {
    ipRequests.set(ip, { count: 1, firstRequest: now })
    return false
  }
  if (entry.count >= RATE_LIMIT) return true
  entry.count++
  return false
}

const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/

export async function POST(request) {
  try {
    const body = await request.json()
    const { email, website } = body  // 'website' è il campo honeypot

    // Honeypot: i bot riempiono tutti i campi, gli umani no
    if (website) {
      return Response.json({ success: true })  // blocco silenzioso
    }

    if (!email || !EMAIL_REGEX.test(email)) {
      return Response.json({ error: 'Email non valida' }, { status: 400 })
    }

    const forwarded = request.headers.get('x-forwarded-for')
    const ip = forwarded ? forwarded.split(',')[0].trim() : 'unknown'

    if (isRateLimited(ip)) {
      return Response.json({ error: "Troppi tentativi. Riprova tra un'ora." }, { status: 429 })
    }

    const apiKey = process.env.BEEHIIV_API_KEY
    const publicationId = process.env.BEEHIIV_PUBLICATION_ID

    if (!apiKey || !publicationId) {
      console.error('Variabili BEEHIIV mancanti')
      return Response.json({ error: 'Configurazione mancante' }, { status: 500 })
    }

    const res = await fetch(
      `https://api.beehiiv.com/v2/publications/${publicationId}/subscriptions`,
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${apiKey}` },
        body: JSON.stringify({
          email,
          reactivate_existing: false,
          send_welcome_email: true,
          double_opt_override: "on",
          utm_source: 'beautyx-app',
          utm_medium: 'newsletter-page',
          utm_campaign: 'organic',
        }),
      }
    )

    const data = await res.json()

    if (!res.ok) {
      console.error('Beehiiv error:', data)
      return Response.json({ error: data.message || 'Errore iscrizione' }, { status: res.status })
    }

    return Response.json({ success: true })
  } catch (err) {
    console.error('Newsletter subscribe error:', err)
    return Response.json({ error: 'Errore di rete' }, { status: 500 })
  }
}
