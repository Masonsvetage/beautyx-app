import { createClient } from '@supabase/supabase-js'
import crypto from 'crypto'

// Client service-key condiviso: questo modulo scrive su guida_access e non deve
// mai dipendere da RLS/sessione (chiamato sia da endpoint pubblici anonimi che
// da endpoint autenticati come create-centro).
const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_KEY
)

// Decisione di Mason (19/08/2026, vedi memory/davide.md): l'accesso a /guida è
// concesso SOLO dopo conferma reale via double opt-in Beehiiv. Qui, in fase di
// iscrizione, emettiamo il token guida SOLO se lo stato riportato da Beehiiv è
// già "active" nel momento stesso della subscribe.
export const GUIDA_ALLOWED_STATUSES = new Set(['active'])

/**
 * Iscrive un'email alla newsletter Beehiiv. Condiviso da:
 * - app/api/newsletter/subscribe/route.js (endpoint pubblico anonimo, con
 *   rate limiting + verifica MX proprie di quel percorso)
 * - app/api/onboarding/create-centro/route.js (registrazione unificata,
 *   28/08/2026: la creazione del centro attiva anche l'iscrizione newsletter)
 * Non lancia mai eccezioni: ritorna sempre { ok, status?, error? }.
 */
export async function subscribeToBeehiiv(email, { utmSource = 'beautyx-app', utmMedium = 'app', utmCampaign = 'organic' } = {}) {
  const apiKey = process.env.BEEHIIV_API_KEY
  const publicationId = process.env.BEEHIIV_PUBLICATION_ID

  if (!apiKey || !publicationId) {
    console.error('Variabili BEEHIIV mancanti')
    return { ok: false, error: 'Configurazione mancante' }
  }

  try {
    const res = await fetch(
      `https://api.beehiiv.com/v2/publications/${publicationId}/subscriptions`,
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${apiKey}` },
        body: JSON.stringify({
          email,
          reactivate_existing: true,
          send_welcome_email: true,
          double_opt_override: 'on',
          utm_source: utmSource,
          utm_medium: utmMedium,
          utm_campaign: utmCampaign,
        }),
      }
    )

    const data = await res.json()

    if (!res.ok) {
      console.error('Beehiiv error:', data)
      return { ok: false, error: data.message || 'Errore iscrizione', httpStatus: res.status }
    }

    return { ok: true, status: data?.data?.status || null }
  } catch (err) {
    console.error('Errore chiamata Beehiiv:', err)
    return { ok: false, error: 'Errore di rete' }
  }
}

/**
 * Genera (o riusa se già esiste) il token di accesso alla guida interattiva
 * /guida. Gating leggero: non deve mai bloccare l'iscrizione newsletter se
 * fallisce. Condiviso dagli stessi due chiamanti di subscribeToBeehiiv.
 */
export async function ensureGuidaAccessToken(email) {
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
