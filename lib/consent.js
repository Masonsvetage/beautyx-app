'use client'

// Consenso cookie di marketing (GDPR) — stesso pattern già in uso in
// app/guida/_components/useQuizCompleted.js: una chiave localStorage +
// un evento custom disparato da chi scrive (CookieNotice.js), così chi legge
// (MetaPixel.js) reagisce subito, senza bisogno di un reload della pagina.
//
// Centralizzato qui (non dentro components/common/) perché è un meccanismo
// generico di consenso, non specifico del banner — qualunque futuro script
// di marketing (es. lato Conversions API server-side) deve poter riusare le
// stesse costanti invece di duplicare la chiave.

export const CONSENT_STORAGE_KEY = 'beautyx-cookie-consent'
export const CONSENT_CHANGE_EVENT = 'beautyx-consent-change'

// Valori possibili in localStorage:
// 'accepted' → l'utente ha accettato anche i cookie di marketing (es. Meta Pixel)
// 'rejected' → l'utente ha rifiutato esplicitamente
// assente    → nessuna scelta ancora fatta (il banner va mostrato)

export function getStoredConsent() {
  try {
    return window.localStorage.getItem(CONSENT_STORAGE_KEY)
  } catch {
    // localStorage non disponibile (SSR, privacy mode) — trattalo come
    // "nessuna scelta fatta": fail-safe verso il non tracciare.
    return null
  }
}

export function setStoredConsent(value) {
  try {
    window.localStorage.setItem(CONSENT_STORAGE_KEY, value)
    window.dispatchEvent(new Event(CONSENT_CHANGE_EVENT))
  } catch {
    // Nessun crash se localStorage non è scrivibile — il banner resterà
    // visibile al giro successivo e il pixel resta comunque spento.
  }
}

// True solo se l'utente ha esplicitamente accettato i cookie di marketing.
// Qualunque altro stato (rifiutato, non ancora scelto) → false: niente
// Meta Pixel/Conversions API finché non arriva un sì esplicito.
export function hasMarketingConsent() {
  return getStoredConsent() === 'accepted'
}
