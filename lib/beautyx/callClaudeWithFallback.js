// lib/beautyx/callClaudeWithFallback.js
//
// Helper centralizzato per chiamare l'API Anthropic con fallback automatico su
// un secondo modello quando il primario non è disponibile.
//
// CONTESTO (2026-09-19, vedi memory/davide.md): l'8/09/2026 il codice chiamava
// un ID modello Claude ritirato (claude-sonnet-4-20250514), Anthropic
// rispondeva 404 e l'utente vedeva "Mi dispiace, ho avuto un problema tecnico"
// in chat/questionario. Il check giornaliero (scripts/health-check.sh) oggi
// testa solo che il modello primario (claude-sonnet-5) risponda 200 — ma se
// ANCHE quello venisse ritirato o avesse un'interruzione temporanea, si
// ripeterebbe lo stesso blocco per gli utenti reali finché qualcuno non se ne
// accorge. Questo helper fa in modo che il sistema si AUTO-RIPARI (un solo
// retry automatico su un modello di riserva), invece di dipendere da qualcuno
// che controlla una chat.
//
// USO (i 3 call-site: app/api/beautyx/chat/route.js x2, lib/beautyx/profilingEngine.js):
//   import { callClaudeWithFallback } from '@/lib/beautyx/callClaudeWithFallback'
//   const response = await callClaudeWithFallback(
//     { max_tokens: 1500, system: systemPrompt, messages, tools: activeTools },
//     'beautyx-chat-first-call'
//   )
//
// NON passare `model` nei parametri: lo imposta questo helper (prima il
// primario, poi — solo se serve — il fallback). La Response restituita è
// ESATTAMENTE l'oggetto del SDK @anthropic-ai/sdk (stessa shape di
// anthropic.messages.create): i chiamanti continuano a usare .content,
// .stop_reason, .usage.input_tokens/output_tokens senza alcuna modifica.

import Anthropic from '@anthropic-ai/sdk'
import { createClient } from '@supabase/supabase-js'

const anthropic = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY })

// Client Supabase dedicato (SERVICE_KEY, bypassa RLS) — usato SOLO per
// registrare l'evento di fallback in system_events. Istanziato qui per non
// dipendere dai client Supabase già creati nei singoli chiamanti.
const supabaseEvents = (process.env.NEXT_PUBLIC_SUPABASE_URL && process.env.SUPABASE_SERVICE_KEY)
  ? createClient(process.env.NEXT_PUBLIC_SUPABASE_URL, process.env.SUPABASE_SERVICE_KEY)
  : null

// Modello primario — verificato su platform.claude.com/docs/en/models/overview
// il 19/09/2026: presente nel "current lineup" ufficiale ("Claude Sonnet 5 —
// The best combination of speed and intelligence"). Stesso ID già in uso in
// produzione (script scripts/health-check.sh lo testa già con questo nome).
export const PRIMARY_MODEL = 'claude-sonnet-5'

// Modello di riserva — verificato sulla STESSA pagina ufficiale il 19/09/2026:
// anch'esso nel "current lineup" corrente (non deprecato), tier diverso da
// Sonnet (Opus, non un'altra variante di Sonnet) per ridurre il rischio che un
// ritiro/incidente futuro colpisca ENTRAMBI i modelli nello stesso momento.
// Stesse capacità richieste dai 3 chiamanti di questo helper: tool use, system
// prompt, output testuale/JSON, context window e max output ben oltre i
// max_tokens usati qui (300-2000). Dettaglio della verifica in
// memory/davide.md, voce 2026-09-19.
export const FALLBACK_MODEL = 'claude-opus-5'

/**
 * Determina se un errore giustifica UN tentativo di fallback sul modello di
 * riserva. Copre esattamente la spec:
 *  - 404 con error.type === 'not_found_error' (modello non disponibile/ritirato
 *    — lo stesso sintomo esatto dell'incidente dell'8/09/2026)
 *  - 5xx, incluso 529 (Anthropic usa 529 per overloaded_error, catturato qui
 *    perché 529 >= 500 — non serve un controllo dedicato)
 *  - errore di connessione/timeout (nessuno status HTTP — rete irraggiungibile,
 *    timeout lato client)
 * NON ritenta MAI su 4xx "dell'utente" (400 richiesta malformata, 401/403 auth,
 * 429 rate limit) — il 429 in particolare si propaga subito: il fallback non
 * risolverebbe un problema di quota, ritentare peggiorerebbe solo la situazione.
 */
function isRetryableModelError(err) {
  // APIConnectionTimeoutError estende APIConnectionError: questo controllo
  // copre entrambe le classi di errore "senza status HTTP".
  if (err instanceof Anthropic.APIConnectionError) return true

  if (err instanceof Anthropic.APIError) {
    const status = err.status
    const errType = err?.error?.error?.type

    if (status === 404 && errType === 'not_found_error') return true
    if (typeof status === 'number' && status >= 500 && status <= 599) return true

    return false
  }

  // Errore non riconosciuto come SDK Anthropic (es. bug applicativo prima della
  // chiamata) — non ritentare, per non nascondere un bug dietro un fallback
  // silenzioso.
  return false
}

function serializeError(err) {
  if (!err) return null
  return {
    message: err?.message || String(err),
    status: err?.status ?? null,
    type: err?.error?.error?.type ?? null,
  }
}

/**
 * Registra (best-effort, MAI bloccante oltre 3s) l'evento di fallback in
 * Supabase `system_events`, così Riccardo può interrogarlo automaticamente nel
 * check giornaliero delle 06:00 (query esatta in memory/davide.md, voce
 * 2026-09-19). Emette SEMPRE anche un console.error('[AI_FALLBACK_USED]...')
 * come segnale ridondante nei log Vercel, indipendentemente dall'esito della
 * scrittura su Supabase.
 */
async function logFallbackEvent({ context, primaryError, fallbackError }) {
  const dettaglio = {
    modello_primario: PRIMARY_MODEL,
    modello_fallback: FALLBACK_MODEL,
    contesto: context || null,
    fallback_riuscito: !fallbackError,
    errore_primario: serializeError(primaryError),
    errore_fallback: fallbackError ? serializeError(fallbackError) : null,
  }

  console.error('[AI_FALLBACK_USED]', JSON.stringify(dettaglio))

  if (!supabaseEvents) {
    console.error('[AI_FALLBACK_USED] SUPABASE_SERVICE_KEY/NEXT_PUBLIC_SUPABASE_URL assenti — evento NON scritto su system_events, solo su console.')
    return
  }

  try {
    // Cap a 3s: il salvataggio dell'evento è best-effort e non deve mai
    // rallentare in modo significativo la risposta all'utente, anche nel raro
    // caso in cui Supabase sia lento/irraggiungibile.
    await Promise.race([
      supabaseEvents.from('system_events').insert({ tipo: 'ai_fallback_used', dettaglio }),
      new Promise((resolve) => setTimeout(resolve, 3000)),
    ])
  } catch (logErr) {
    console.error('[AI_FALLBACK_USED] scrittura system_events fallita (non bloccante):', logErr?.message || logErr)
  }
}

/**
 * Chiama anthropic.messages.create sul modello primario; se fallisce con un
 * errore "di infrastruttura" (vedi isRetryableModelError), ritenta UNA sola
 * volta sul modello di riserva con IDENTICI parametri (cambia solo `model`).
 *
 * Se anche il fallback fallisce, propaga l'errore ORIGINALE del primario (non
 * quello del fallback) — scelta deliberata e documentata: il chiamante e i
 * suoi log devono poter indagare la causa radice (es. "modello ritirato"), che
 * è l'informazione utile; l'esito del tentativo di ripiego è solo una
 * conseguenza secondaria, già catturato per intero nel log di system_events.
 * Il chiamante continua a prendere l'errore nel suo try/catch esistente e a
 * mostrare "problema tecnico" come ultima rete di sicurezza — questo deve
 * restare raro, non la norma.
 *
 * @param {object} params - stessi parametri di anthropic.messages.create
 *   (system, messages, tools, max_tokens, ecc.) — NON includere `model`.
 * @param {string} context - etichetta del chiamante, usata nel campo
 *   `dettaglio.contesto` dell'evento di log (es. 'beautyx-chat-first-call',
 *   'beautyx-chat-tool-loop', 'profiling-narrazione-libera').
 * @returns {Promise<Anthropic.Message>} stessa shape di anthropic.messages.create
 */
export async function callClaudeWithFallback(params, context) {
  try {
    const response = await anthropic.messages.create({ ...params, model: PRIMARY_MODEL })
    // Proprietà aggiuntiva, non presente nello shape originale del SDK: non
    // rompe nulla per i chiamanti che usano solo .content/.stop_reason/.usage,
    // ma permette a chi vuole sapere quale modello ha risposto davvero di
    // leggerlo (es. profilingEngine.js la usa per il campo _model).
    response._modelUsed = PRIMARY_MODEL
    return response
  } catch (primaryError) {
    if (!isRetryableModelError(primaryError)) throw primaryError

    console.error(`[AI_FALLBACK] Modello primario (${PRIMARY_MODEL}) non disponibile per "${context}" — tentativo su fallback (${FALLBACK_MODEL}). Causa:`, primaryError?.message || primaryError)

    try {
      const fallbackResponse = await anthropic.messages.create({ ...params, model: FALLBACK_MODEL })
      fallbackResponse._modelUsed = FALLBACK_MODEL
      await logFallbackEvent({ context, primaryError })
      return fallbackResponse
    } catch (fallbackError) {
      await logFallbackEvent({ context, primaryError, fallbackError })
      throw primaryError
    }
  }
}
