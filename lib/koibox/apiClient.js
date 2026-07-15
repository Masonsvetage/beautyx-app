/**
 * Koibox API Client
 * Documentazione: https://app.gitbook.com/o/vFzDCXL1VRmHxr9BygGm/s/l2W2K3RCtl26hMf0oPar/
 *
 * Usa X-Koibox-Key header per autenticazione.
 * Base URL: https://api.koibox.cloud/api/
 */

import { createClient } from '@supabase/supabase-js'

const BASE_URL = 'https://api.koibox.cloud/api'

const admin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_KEY
)

// Cache API key per 5 minuti — evita query DB ad ogni pagina durante la sync
const _keyCache = new Map() // centroId → { key, expiresAt }

/** Recupera la chiave API Koibox per un centro dal DB (con cache 5 min) */
async function getKoiboxKey(centroId) {
  const cached = _keyCache.get(centroId)
  if (cached && cached.expiresAt > Date.now()) return cached.key

  const { data } = await admin
    .from('centro_integrazioni')
    .select('api_key, is_active')
    .eq('centro_id', centroId)
    .eq('gestionale', 'koibox')
    .maybeSingle()

  const key = (data?.api_key && data.is_active) ? data.api_key : null
  _keyCache.set(centroId, { key, expiresAt: Date.now() + 5 * 60 * 1000 })
  return key
}

/** Aggiorna last_sync_at (fire-and-forget, non blocca la sync) */
function touchLastSync(centroId) {
  admin
    .from('centro_integrazioni')
    .update({ last_sync_at: new Date().toISOString() })
    .eq('centro_id', centroId)
    .eq('gestionale', 'koibox')
    .then(() => {})
}

/**
 * Wrapper base per chiamate Koibox API
 * @param {string} apiKey
 * @param {string} path  — es. '/clientes/', '/agenda/', ecc.
 * @param {object} params — query string params
 */
async function koiboxFetch(apiKey, path, params = {}, timeoutMs = 30000) {
  const url = new URL(`${BASE_URL}${path}`)
  Object.entries(params).forEach(([k, v]) => {
    if (v !== undefined && v !== null) url.searchParams.set(k, v)
  })

  const t0 = Date.now()
  console.log('[koiboxFetch] →', url.toString())
  const res = await fetch(url.toString(), {
    headers: {
      'X-Koibox-Key': apiKey,
      'Content-Type': 'application/json',
    },
    signal: AbortSignal.timeout(timeoutMs),
  })
  console.log('[koiboxFetch] ←', res.status, `${Date.now() - t0}ms`)

  if (!res.ok) {
    const body = await res.text().catch(() => '')
    throw new Error(`Koibox API ${res.status}: ${body}`)
  }

  return res.json()
}

/**
 * Testa la connessione Koibox.
 * Restituisce { ok: true, info } oppure { ok: false, error }
 */
export async function testKoiboxConnection(centroId) {
  const apiKey = await getKoiboxKey(centroId)
  if (!apiKey) return { ok: false, error: 'Chiave API non configurata' }

  try {
    // Prova a caricare la lista clienti con limit 1 per verificare auth
    await koiboxFetch(apiKey, '/clientes/', { limit: 1 })
    return { ok: true }
  } catch (err) {
    return { ok: false, error: err.message }
  }
}

/**
 * Legge lista clienti Koibox (paginata)
 * @param {string} centroId
 * @param {{ page?: number, limit?: number, search?: string }} opts
 */
export async function getKoiboxClienti(centroId, opts = {}) {
  const apiKey = await getKoiboxKey(centroId)
  if (!apiKey) throw new Error('Chiave API Koibox non configurata')

  const data = await koiboxFetch(apiKey, '/clientes/', {
    page: opts.page || 1,
    limit: opts.limit || 50,
    ...(opts.search ? { search: opts.search } : {}),
  })

  await touchLastSync(centroId)
  return data // { count, next, previous, results: [...] }
}

/**
 * Legge agenda (appuntamenti) Koibox per un intervallo di date
 * @param {string} centroId
 * @param {{ fecha_desde?: string, fecha_hasta?: string, page?: number }} opts
 *   date format: 'YYYY-MM-DD'
 */
export async function getKoiboxAgenda(centroId, opts = {}) {
  const apiKey = await getKoiboxKey(centroId)
  if (!apiKey) throw new Error('Chiave API Koibox non configurata')

  const data = await koiboxFetch(apiKey, '/agenda/', {
    fecha_desde: opts.fecha_desde,
    fecha_hasta: opts.fecha_hasta,
    page: opts.page || 1,
    limit: opts.limit || 50,
  })

  await touchLastSync(centroId)
  return data
}

/**
 * Legge i servizi Koibox
 */
export async function getKoiboxServizi(centroId, opts = {}) {
  const apiKey = await getKoiboxKey(centroId)
  if (!apiKey) throw new Error('Chiave API Koibox non configurata')

  return koiboxFetch(apiKey, '/servicios/', {
    page: opts.page || 1,
    limit: opts.limit || 100,
  })
}

/**
 * Legge vendite/scontrini Koibox (singole transazioni, non aggregate)
 * @param {string} centroId
 * @param {{ fecha_desde?: string, fecha_hasta?: string, page?: number, limit?: number }} opts
 */
export async function getKoiboxVentas(centroId, opts = {}) {
  const apiKey = await getKoiboxKey(centroId)
  if (!apiKey) throw new Error('Chiave API Koibox non configurata')

  return koiboxFetch(apiKey, '/ventas/', {
    fecha_desde: opts.fecha_desde,
    fecha_hasta: opts.fecha_hasta,
    page: opts.page || 1,
    limit: opts.limit || 100,
  })
}

/**
 * Legge movimenti di cassa Koibox (/movimientos-caja/).
 * Ogni riga ha forma_pago (intero 1-11) e importe.
 * Usato per il breakdown corretto dei metodi di pagamento giornalieri.
 * @param {string} centroId
 * @param {{
 *   fecha_desde?: string,  // ISO datetime, es. '2026-01-01T00:00:00'
 *   fecha_hasta?: string,  // ISO datetime, es. '2026-03-16T23:59:59'
 *   page?: number,
 *   limit?: number
 * }} opts
 */
export async function getKoiboxMovimientosCaja(centroId, opts = {}) {
  const apiKey = await getKoiboxKey(centroId)
  if (!apiKey) throw new Error('Chiave API Koibox non configurata')

  // L'API usa fecha__gte / fecha__lte (django filter syntax)
  return koiboxFetch(apiKey, '/movimientos-caja/', {
    fecha__gte: opts.fecha_desde,
    fecha__lte: opts.fecha_hasta,
    page: opts.page || 1,
    limit: opts.limit || 100,
  })
}

// Alias per retrocompatibilità
export const getKoiboxCassa = getKoiboxVentas

/**
 * Verifica se la chiave è configurata per un centro (senza caricarla)
 */
export async function isKoiboxConfigured(centroId) {
  const { data } = await admin
    .from('centro_integrazioni')
    .select('id, is_active')
    .eq('centro_id', centroId)
    .eq('gestionale', 'koibox')
    .not('api_key', 'is', null)
    .maybeSingle()

  return !!(data?.is_active)
}
