// Error monitoring MINIMO (task #42/#165) — alternativa leggera a Sentry.
//
// Scelta (Davide, 30/08/2026): niente dipendenza esterna (Sentry) in questa
// fase. Motivo: un pacchetto in più va installato e verificato con una build
// reale, che nel sandbox non gira; in una run non presidiata aggiungere una
// dipendenza non testata è un rischio superiore al valore. Questa util copre il
// bisogno reale pre-lancio ads (sapere se qualcosa esplode in prod) restando a
// zero dipendenze e a costo nullo finché non la si configura.
//
// Gating (come tutte le integrazioni del progetto): se
// `NEXT_PUBLIC_ERROR_WEBHOOK_URL` è assente → nessuna chiamata di rete, solo
// console.error. Quando c'è (es. un webhook Slack/Discord/endpoint interno, da
// impostare su Vercel, MAI in .env.local), invia un payload JSON compatto.
// Migrare a Sentry in futuro significherà solo cambiare il corpo di questa
// funzione, non i punti che la chiamano.

const WEBHOOK = process.env.NEXT_PUBLIC_ERROR_WEBHOOK_URL

// Non inviare mai stack sterminati / PII: tronchiamo e teniamo l'essenziale.
function trunc(str, n = 2000) {
  if (!str) return undefined
  const s = String(str)
  return s.length > n ? s.slice(0, n) + '…[troncato]' : s
}

/**
 * Registra un errore. No-op di rete se il webhook non è configurato.
 * @param {Error|string} error
 * @param {object} [context]  es. { where:'api/beautyx/chat', centro_id, digest }
 * @returns {Promise<void>}
 */
export async function reportError(error, context = {}) {
  const payload = {
    ts: new Date().toISOString(),
    env: process.env.VERCEL_ENV || process.env.NODE_ENV || 'unknown',
    runtime: typeof window === 'undefined' ? 'server' : 'client',
    message: trunc(error?.message || String(error), 500),
    stack: trunc(error?.stack, 2000),
    ...context,
  }

  // Log sempre in console (compare comunque nei log Vercel).
  console.error('[reportError]', payload.message, context?.where ? `@ ${context.where}` : '')

  if (!WEBHOOK) return
  try {
    await fetch(WEBHOOK, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
      // Non bloccare a lungo il flusso principale per un invio di telemetria.
      keepalive: true,
    })
  } catch {
    // L'errore del reporter non deve mai propagarsi al chiamante.
  }
}

export default reportError
