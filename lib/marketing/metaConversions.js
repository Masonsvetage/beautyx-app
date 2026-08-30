// Meta Conversions API (server-side) — PREDISPOSTO MA SPENTO (task #164).
//
// No-op finché non ci sono credenziali reali: se mancano
// `META_PIXEL_ID` e `META_CONVERSIONS_TOKEN` (com'è oggi, deliberatamente),
// `sendConversionEvent` ritorna subito { sent:false, reason } senza contattare
// Facebook. Nessun ID/token hardcodato. Le credenziali, quando esisteranno,
// vanno su Vercel (mai in .env.local, mai nel repo) — stessa regola di tutte le
// env var del progetto (memory/davide.md).
//
// L'invio server-side (Conversions API) affianca il pixel client per resilienza
// ad adblock/ITP, ma NON va attivato prima del consenso GDPR (vedi nota in
// components/common/MetaPixel.js): finché il pixel è spento, anche questo resta
// spento.

import crypto from 'node:crypto'

const PIXEL_ID = process.env.META_PIXEL_ID || process.env.NEXT_PUBLIC_META_PIXEL_ID
const ACCESS_TOKEN = process.env.META_CONVERSIONS_TOKEN
const API_VERSION = process.env.META_GRAPH_API_VERSION || 'v19.0'

function sha256(value) {
  if (!value) return undefined
  return crypto.createHash('sha256').update(String(value).trim().toLowerCase()).digest('hex')
}

/**
 * Invia un evento alla Conversions API. No-op sicuro se non configurata.
 * @param {object} evt
 * @param {string} evt.eventName            es. 'Lead', 'CompleteRegistration', 'Purchase'
 * @param {string} [evt.eventId]            per la deduplica con l'evento pixel client (stesso id)
 * @param {string} [evt.email]              PII in chiaro: viene hashata (mai inviata in chiaro)
 * @param {string} [evt.eventSourceUrl]
 * @param {object} [evt.customData]         es. { value, currency }
 * @returns {Promise<{sent:boolean, reason?:string, status?:number}>}
 */
export async function sendConversionEvent(evt) {
  if (!PIXEL_ID || !ACCESS_TOKEN) {
    return { sent: false, reason: 'meta_conversions_disattivata (manca PIXEL_ID/ACCESS_TOKEN)' }
  }
  if (!evt || !evt.eventName) {
    return { sent: false, reason: 'eventName obbligatorio' }
  }

  const userData = {}
  const emailHash = sha256(evt.email)
  if (emailHash) userData.em = [emailHash]

  const payload = {
    data: [
      {
        event_name: evt.eventName,
        event_time: Math.floor(Date.now() / 1000),
        action_source: 'website',
        ...(evt.eventId ? { event_id: evt.eventId } : {}),
        ...(evt.eventSourceUrl ? { event_source_url: evt.eventSourceUrl } : {}),
        user_data: userData,
        ...(evt.customData ? { custom_data: evt.customData } : {}),
      },
    ],
  }

  try {
    const res = await fetch(
      `https://graph.facebook.com/${API_VERSION}/${PIXEL_ID}/events?access_token=${encodeURIComponent(ACCESS_TOKEN)}`,
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      }
    )
    return { sent: res.ok, status: res.status, ...(res.ok ? {} : { reason: `HTTP ${res.status}` }) }
  } catch (err) {
    return { sent: false, reason: `errore rete: ${err.message}` }
  }
}
