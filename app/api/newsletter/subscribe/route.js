import { createClient } from '@supabase/supabase-js'
import crypto from 'crypto'
import dns from 'dns'

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_KEY
)

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

// Stati Beehiiv (data.data.status sulla risposta di create subscription) che
// rappresentano un'iscrizione accettata, anche se non ancora confermata via
// double opt-in. Escludiamo esplicitamente gli stati di rifiuto/errore/non-attivo:
// "invalid" (email non valida), "inactive" (disiscritto), "paused" e
// "needs_attention" (richiede approvazione/rifiuto manuale, non ancora deciso).
// Vedi doc ufficiale: https://developers.beehiiv.com/api-reference/subscriptions/create
const GUIDA_ALLOWED_STATUSES = new Set(['active', 'pending', 'validating'])

const MX_CHECK_TIMEOUT_MS = 3500

// Verifica che il dominio dell'email abbia almeno un record MX valido.
// Ritorna { valid, errored }: valid=false SOLO se il dominio risulta davvero
// senza MX (ENOTFOUND/ENODATA); in caso di errore di rete/DNS nostro (timeout,
// resolver irraggiungibile, ecc.) non blocchiamo un utente reale — lasciamo
// passare (valid=true) ma segnaliamo l'anomalia nei log (errored=true).
async function hasValidMxRecord(email) {
  const domain = email.split('@')[1]
  if (!domain) return { valid: false, errored: false }

  try {
    const records = await Promise.race([
      dns.promises.resolveMx(domain),
      new Promise((_, reject) =>
        setTimeout(() => reject(new Error('MX check timeout')), MX_CHECK_TIMEOUT_MS)
      ),
    ])
    return { valid: Array.isArray(records) && records.length > 0, errored: false }
  } catch (err) {
    if (err && (err.code === 'ENOTFOUND' || err.code === 'ENODATA')) {
      return { valid: false, errored: false }
    }
    console.error('Verifica MX fallita per errore di rete/DNS nostro (iscrizione consentita comunque):', err)
    return { valid: true, errored: true }
  }
}

// Genera (o riusa se già esiste) il token di accesso alla guida interattiva /guida.
// Gating leggero: non deve mai bloccare l'iscrizione newsletter se fallisce.
async function ensureGuidaAccessToken(email) {
  try {
    const normalizedEmail = email.trim().toLowerCase()

    const { data: existing, error: selectError } = await supabase
      .from('guida_access')
      .select('token')
      .eq('email', normalizedEmail)
      .maybeSingle()

    if (selectError) {
      console.error('guida_access select error:', selectError)
      return null
    }

    if (existing) return existing.token // token già presente, non duplicare

    const token = crypto.randomBytes(24).toString('hex')
    const { error: insertError } = await supabase
      .from('guida_access')
      .insert({ email: normalizedEmail, token })

    if (insertError) {
      console.error('guida_access insert error:', insertError)
      return null
    }

    return token
  } catch (err) {
    console.error('Errore generazione token guida:', err)
    return null
  }
}

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

    const mxCheck = await hasValidMxRecord(email)
    if (!mxCheck.valid) {
      return Response.json({ error: 'Email non valida o dominio inesistente' }, { status: 400 })
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
          reactivate_existing: true,
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

    // Iscrizione Beehiiv andata a buon fine (HTTP 2xx): questo NON basta a
    // concedere l'accesso alla guida. Beehiiv risponde 200 anche con
    // status "validating" (email in corso di validazione) o altri stati non
    // ancora confermati/rifiutati — bisogna leggere data.data.status ed
    // emettere il token solo per stati che rappresentano un'iscrizione accettata.
    const subscriptionStatus = data?.data?.status
    if (!GUIDA_ALLOWED_STATUSES.has(subscriptionStatus)) {
      console.warn('Iscrizione Beehiiv con stato non idoneo ad accesso guida:', subscriptionStatus, 'per', email)
    }
    const guidaToken = GUIDA_ALLOWED_STATUSES.has(subscriptionStatus)
      ? await ensureGuidaAccessToken(email)
      : null

    // L'iscrizione newsletter non deve MAI fallire per un problema secondario
    // legato alla guida: se il token non è disponibile (stato non idoneo o
    // errore secondario), rispondiamo comunque success:true ma senza
    // guidaToken (il frontend gestisce il fallback).
    return Response.json(guidaToken ? { success: true, guidaToken } : { success: true })
  } catch (err) {
    console.error('Newsletter subscribe error:', err)
    return Response.json({ error: 'Errore di rete' }, { status: 500 })
  }
}
