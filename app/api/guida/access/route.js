import { createClient } from '@supabase/supabase-js'

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_KEY
)

const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/

// Stesso pattern in-memory di /api/newsletter/subscribe, con limite un po' più
// permissivo: questo endpoint è un lookup legittimo (recupero token guida) che
// un utente reale potrebbe dover ripetere più volte (es. cambia dispositivo).
const ipRequests = new Map()
const RATE_LIMIT = 5
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

export async function POST(request) {
  try {
    const { email } = await request.json()

    if (!email || !EMAIL_REGEX.test(email)) {
      return Response.json({ error: 'Email non valida' }, { status: 400 })
    }

    const forwarded = request.headers.get('x-forwarded-for')
    const ip = forwarded ? forwarded.split(',')[0].trim() : 'unknown'

    if (isRateLimited(ip)) {
      return Response.json({ error: "Troppi tentativi. Riprova tra un'ora." }, { status: 429 })
    }

    const normalizedEmail = email.trim().toLowerCase()

    const { data, error } = await supabase
      .from('guida_access')
      .select('token')
      .eq('email', normalizedEmail)
      .maybeSingle()

    if (error) throw error

    if (!data) {
      return Response.json(
        { error: 'Email non trovata. Iscriviti alla newsletter per accedere alla guida.' },
        { status: 404 }
      )
    }

    return Response.json({ token: data.token })
  } catch (err) {
    console.error('Guida access error:', err)
    return Response.json({ error: 'Errore di rete, riprova.' }, { status: 500 })
  }
}
