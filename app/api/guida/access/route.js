import { createClient } from '@supabase/supabase-js'
import crypto from 'crypto'
import { isRateLimited } from '@/lib/rateLimit'

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_KEY
)

const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/

// Rate limiting distribuito via Upstash Redis (lib/rateLimit.js), con
// fallback automatico a Map() in-memory se le env var Upstash non sono
// configurate. Soglia invariata: 5 richieste/ora per IP — un po' più
// permissiva di /api/newsletter/subscribe perché questo endpoint è un lookup
// legittimo (recupero token guida) che un utente reale potrebbe dover
// ripetere più volte (es. cambia dispositivo).
const RATE_LIMIT_PREFIX = 'guida-access'
const RATE_LIMIT = 5
const RATE_WINDOW_SECONDS = 60 * 60

// Decisione di Mason (19/08/2026): l'accesso a /guida richiede conferma reale
// via double opt-in Beehiiv. Questo endpoint è il vero cancello quando non
// esiste ancora un token: interroga Beehiiv live per lo stato reale del
// subscriber e crea il token SOLO se è "active" (confermato). Stesso pattern
// di autenticazione e stessi env var di app/api/newsletter/subscribe/route.js.
// Doc: GET /v2/publications/:publicationId/subscriptions/by_email/:email
// https://developers.beehiiv.com/api-reference/subscriptions/get-by-email
async function fetchBeehiivStatusByEmail(email) {
  const apiKey = process.env.BEEHIIV_API_KEY
  const publicationId = process.env.BEEHIIV_PUBLICATION_ID

  if (!apiKey || !publicationId) {
    console.error('Variabili BEEHIIV mancanti (guida/access)')
    return { ok: false, status: null }
  }

  try {
    const res = await fetch(
      `https://api.beehiiv.com/v2/publications/${publicationId}/subscriptions/by_email/${encodeURIComponent(email)}`,
      {
        method: 'GET',
        headers: { Authorization: `Bearer ${apiKey}` },
      }
    )

    if (res.status === 404) {
      // Nessuna subscription Beehiiv per questa email: non trovata/non iscritta.
      return { ok: true, status: null }
    }

    if (!res.ok) {
      console.error('Beehiiv lookup error (guida/access):', res.status, await res.text().catch(() => ''))
      return { ok: false, status: null }
    }

    const data = await res.json()
    return { ok: true, status: data?.data?.status || null }
  } catch (err) {
    console.error('Errore chiamata Beehiiv (guida/access):', err)
    return { ok: false, status: null }
  }
}

// Genera (o riusa se già esiste) il token di accesso alla guida, DOPO che lo
// stato Beehiiv è stato verificato "active" dal chiamante. Stesso pattern di
// app/api/newsletter/subscribe/route.js (ensureGuidaAccessToken).
async function createGuidaAccessToken(normalizedEmail) {
  const token = crypto.randomBytes(24).toString('hex')
  const { error: insertError } = await supabase
    .from('guida_access')
    .insert({ email: normalizedEmail, token })

  if (insertError) {
    console.error('guida_access insert error (guida/access):', insertError)
    return null
  }

  return token
}

export async function POST(request) {
  try {
    const { email } = await request.json()

    if (!email || !EMAIL_REGEX.test(email)) {
      return Response.json({ error: 'Email non valida' }, { status: 400 })
    }

    const forwarded = request.headers.get('x-forwarded-for')
    const ip = forwarded ? forwarded.split(',')[0].trim() : 'unknown'

    if (await isRateLimited(RATE_LIMIT_PREFIX, ip, RATE_LIMIT, RATE_WINDOW_SECONDS)) {
      return Response.json({ error: "Troppi tentativi. Riprova tra un'ora." }, { status: 429 })
    }

    const normalizedEmail = email.trim().toLowerCase()

    // 1) Accesso già concesso in passato (token esistente in guida_access):
    // va bene restituirlo subito, non serve ricontrollare Beehiiv ogni volta
    // per chi ha già ottenuto l'accesso.
    const { data: existing, error: selectError } = await supabase
      .from('guida_access')
      .select('token')
      .eq('email', normalizedEmail)
      .maybeSingle()

    if (selectError) throw selectError

    if (existing) {
      return Response.json({ token: existing.token })
    }

    // 2) Nessun token ancora emesso per questa email: qui è il vero cancello.
    // Interroghiamo Beehiiv live per lo stato reale del subscriber. Il token
    // viene creato ORA solo se lo stato è "active" (email confermata via
    // double opt-in) — altrimenti niente accesso, niente scappatoia.
    const beehiivLookup = await fetchBeehiivStatusByEmail(normalizedEmail)

    if (!beehiivLookup.ok) {
      // Errore nostro (rete/config), non dell'utente: non riveliamo dettagli.
      return Response.json({ error: 'Errore di rete, riprova.' }, { status: 500 })
    }

    if (beehiivLookup.status !== 'active') {
      return Response.json(
        {
          error:
            'Non risulta ancora una conferma per questa email — controlla la posta e clicca il link di conferma, poi riprova qui.',
        },
        { status: 403 }
      )
    }

    const token = await createGuidaAccessToken(normalizedEmail)

    if (!token) {
      return Response.json({ error: 'Errore di rete, riprova.' }, { status: 500 })
    }

    return Response.json({ token })
  } catch (err) {
    console.error('Guida access error:', err)
    return Response.json({ error: 'Errore di rete, riprova.' }, { status: 500 })
  }
}
