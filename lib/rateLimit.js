import { Ratelimit } from '@upstash/ratelimit'
import { Redis } from '@upstash/redis'

// Rate limiting distribuito per le route pubbliche esposte a traffico ads
// (app/api/newsletter/subscribe, app/api/guida/access). Prima di questo modulo
// il limite viveva in una Map() locale al processo: su Vercel serverless ogni
// invocazione può girare su un'istanza diversa (nessuna Map condivisa), quindi
// il limite era facilmente aggirabile con traffico reale. Approvato da Mason:
// migrazione a Upstash Redis (REST, compatibile edge/serverless).
//
// Algoritmo scelto: SLIDING WINDOW (Ratelimit.slidingWindow), non fixed window
// né token bucket. Motivo: con fixed window un utente può mandare N richieste
// a fine finestra e altre N appena inizia la successiva (fino a 2N in pochi
// secondi) — proprio il tipo di burst che vogliamo evitare per un endpoint
// pubblico da campagna ads. Il token bucket è pensato per traffico che deve
// poter "scoppiettare" e poi recuperare gradualmente (burst legittimi, es. API
// interne) — qui invece i limiti sono bassi e per-IP (3/h, 5/h) e l'obiettivo è
// un tetto uniforme nel tempo, non permettere burst. La sliding window dà un
// conteggio approssimato ma accurato sulla finestra reale trascorsa con un
// singolo comando Redis (costo/performance comparabile al fixed window), che è
// esattamente il compromesso giusto per questo caso d'uso.
//
// Fallback: se le variabili d'ambiente Upstash non sono configurate (es. in
// locale prima che Mason crei il database, o se Upstash è temporaneamente
// irraggiungibile) NON blocchiamo né lasciamo passare tutto senza limite:
// si torna al vecchio comportamento in-memory (Map per processo) come rete di
// sicurezza, con un warning nei log. Il sito continua a funzionare; il limite
// smette solo di essere distribuito finché le env var non sono presenti.

const upstashUrl = process.env.UPSTASH_REDIS_REST_URL
const upstashToken = process.env.UPSTASH_REDIS_REST_TOKEN

let redis = null

if (upstashUrl && upstashToken) {
  redis = new Redis({ url: upstashUrl, token: upstashToken })
} else {
  console.warn(
    '[rateLimit] UPSTASH_REDIS_REST_URL / UPSTASH_REDIS_REST_TOKEN non configurate: ' +
      'rate limiting in fallback su Map() in-memory locale al processo (non distribuito ' +
      'tra le invocazioni serverless di Vercel). Configurare le due env var su Vercel per ' +
      'attivare il rate limiting distribuito su Upstash Redis.'
  )
}

// Cache delle istanze Ratelimit per (prefix, limit, window): evita di
// ricrearle ad ogni richiesta mantenendo comunque la configurazione flessibile
// per endpoint diversi (soglie diverse per newsletter e guida).
const ratelimiters = new Map()

function getRatelimiter(prefix, limit, windowSeconds) {
  const cacheKey = `${prefix}:${limit}:${windowSeconds}`
  if (!ratelimiters.has(cacheKey)) {
    ratelimiters.set(
      cacheKey,
      new Ratelimit({
        redis,
        limiter: Ratelimit.slidingWindow(limit, `${windowSeconds} s`),
        prefix: `beautyx:ratelimit:${prefix}`,
        analytics: false,
      })
    )
  }
  return ratelimiters.get(cacheKey)
}

// --- Fallback in-memory (stesso comportamento del vecchio codice) ---
// Store separato per prefix, così endpoint diversi (newsletter vs guida) non
// condividono contatori anche nel fallback.
const memoryStore = new Map()

function isRateLimitedInMemory(prefix, identifier, limit, windowMs) {
  const key = `${prefix}:${identifier}`
  const now = Date.now()
  const entry = memoryStore.get(key)
  if (!entry || now - entry.firstRequest > windowMs) {
    memoryStore.set(key, { count: 1, firstRequest: now })
    return false
  }
  if (entry.count >= limit) return true
  entry.count++
  return false
}

/**
 * Verifica il rate limit per un identificatore (tipicamente l'IP del
 * chiamante) su un dato endpoint. Ritorna true se la richiesta deve essere
 * bloccata (limite superato).
 *
 * @param {string} prefix - namespace del limite, univoco per endpoint (es. 'newsletter-subscribe', 'guida-access')
 * @param {string} identifier - chiave univoca da limitare (es. IP normalizzato)
 * @param {number} limit - numero massimo di richieste consentite nella finestra
 * @param {number} windowSeconds - durata della finestra in secondi (es. 3600 per un'ora)
 * @returns {Promise<boolean>}
 */
export async function isRateLimited(prefix, identifier, limit, windowSeconds) {
  if (redis) {
    try {
      const ratelimiter = getRatelimiter(prefix, limit, windowSeconds)
      const { success } = await ratelimiter.limit(identifier)
      return !success
    } catch (err) {
      // Upstash irraggiungibile/errore a runtime: non far esplodere la
      // richiesta né lasciar passare tutto senza limite — fallback in-memory
      // per questa istanza, con warning nei log.
      console.error(
        `[rateLimit] Errore Upstash per prefix "${prefix}" — fallback in-memory per questa richiesta:`,
        err
      )
      return isRateLimitedInMemory(prefix, identifier, limit, windowSeconds * 1000)
    }
  }

  return isRateLimitedInMemory(prefix, identifier, limit, windowSeconds * 1000)
}
