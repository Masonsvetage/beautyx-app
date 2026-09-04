import dns from 'dns'
import { isRateLimited } from '@/lib/rateLimit'
import { subscribeToBeehiiv, ensureGuidaAccessToken, GUIDA_ALLOWED_STATUSES } from '@/lib/newsletter/beehiiv'

// Rate limiting distribuito via Upstash Redis (lib/rateLimit.js), con
// fallback automatico a Map() in-memory se le env var Upstash non sono
// configurate. Soglia invariata: 3 richieste/ora per IP.
const RATE_LIMIT_PREFIX = 'newsletter-subscribe'
const RATE_LIMIT = 3
const RATE_WINDOW_SECONDS = 60 * 60

const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/

// Decisione di Mason (19/08/2026): l'accesso a /guida è concesso SOLO dopo
// conferma reale via double opt-in Beehiiv, non più a chiunque inserisca
// un'email sintatticamente valida con MX valido. Qui, in fase di iscrizione,
// emettiamo il token guida SOLO se lo stato riportato da Beehiiv è già
// "active" nel momento stesso della POST — caso raro ma possibile per
// un'email già confermata in passato (es. iscritta storica che si re-iscrive).
// "pending"/"validating" (conferma non ancora cliccata) NON danno più token
// qui: l'utente lo otterrà in un secondo momento, dopo aver confermato,
// tramite il gate su /guida (app/api/guida/access/route.js), che verifica lo
// stato reale via lookup live su Beehiiv prima di emettere il token.
// Vedi doc ufficiale: https://developers.beehiiv.com/api-reference/subscriptions/create
// (GUIDA_ALLOWED_STATUSES ora condiviso da lib/newsletter/beehiiv.js — 29/08/2026,
// stessa costante riusata da create-centro per la registrazione unificata)

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

    if (await isRateLimited(RATE_LIMIT_PREFIX, ip, RATE_LIMIT, RATE_WINDOW_SECONDS)) {
      return Response.json({ error: "Troppi tentativi. Riprova tra un'ora." }, { status: 429 })
    }

    const mxCheck = await hasValidMxRecord(email)
    if (!mxCheck.valid) {
      return Response.json({ error: 'Email non valida o dominio inesistente' }, { status: 400 })
    }

    const subscribeResult = await subscribeToBeehiiv(email, { utmMedium: 'newsletter-page' })

    if (!subscribeResult.ok) {
      return Response.json({ error: subscribeResult.error || 'Errore iscrizione' }, { status: subscribeResult.httpStatus || 500 })
    }

    // Iscrizione Beehiiv andata a buon fine (HTTP 2xx): questo NON basta a
    // concedere l'accesso alla guida. Beehiiv risponde 200 anche con status
    // "pending"/"validating" (conferma double opt-in non ancora cliccata) —
    // bisogna leggere lo status ed emettere il token SOLO se è già
    // "active" ora. Il caso normale (email appena iscritta, non ancora
    // confermata) non crea alcun token qui: niente scappatoia via
    // /api/guida/access, che ricontrolla Beehiiv live prima di crearne uno.
    const subscriptionStatus = subscribeResult.status
    if (!GUIDA_ALLOWED_STATUSES.has(subscriptionStatus)) {
      console.log('Iscrizione Beehiiv non ancora confermata (nessun token guida emesso ora):', subscriptionStatus, 'per', email)
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
