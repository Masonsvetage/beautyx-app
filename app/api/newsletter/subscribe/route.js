export async function POST(request) {
  try {
    const { email } = await request.json()

    if (!email || !email.includes('@')) {
      return Response.json({ error: 'Email non valida' }, { status: 400 })
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
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${apiKey}`,
        },
        body: JSON.stringify({
          email,
          reactivate_existing: false,
          send_welcome_email: true,
          utm_source: 'beautyx-app',
          utm_medium: 'newsletter-page',
          utm_campaign: 'organic',
        }),
      }
    )

    const data = await res.json()

    if (!res.ok) {
      console.error('Beehiiv error:', data)
      return Response.json(
        { error: data.message || 'Errore iscrizione' },
        { status: res.status }
      )
    }

    return Response.json({ success: true })
  } catch (err) {
    console.error('Newsletter subscribe error:', err)
    return Response.json({ error: 'Errore di rete' }, { status: 500 })
  }
}
