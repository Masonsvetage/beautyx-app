/**
 * Koibox Sync — importa dati dall'API Koibox nelle tabelle locali
 * Solo lettura da Koibox. Zero scritture verso Koibox.
 */

import { createClient } from '@supabase/supabase-js'
import { getKoiboxClienti, getKoiboxAgenda, getKoiboxServizi, getKoiboxVentas } from './apiClient'
import { bridgeKoiboxToRegistro } from './bridge'

const admin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_KEY
)

/** Recupera tutte le pagine di un endpoint Koibox.
 *  Protezioni anti-loop:
 *  - Se la pagina successiva ha gli stessi ID della precedente → loop rilevato, stop
 *  - Cap assoluto a 2000 record
 */
async function fetchAllPages(fetchFn, centroId, opts = {}) {
  const results = []
  const seenIds = new Set()
  let page = 1
  const limit = 100

  while (true) {
    const data = await fetchFn(centroId, { ...opts, page, limit })
    const items = data.results || (Array.isArray(data) ? data : [])
    if (items.length === 0) break

    // Rileva loop: se tutti gli ID di questa pagina sono già visti → Koibox sta ripetendo
    const pageIds = items.map(i => i.id || i.pk).filter(Boolean)
    if (pageIds.length > 0 && pageIds.every(id => seenIds.has(String(id)))) {
      console.warn(`[koibox] Paginazione loop rilevata a pagina ${page} — stop.`)
      break
    }
    pageIds.forEach(id => seenIds.add(String(id)))

    results.push(...items)
    if (!data.next || results.length >= 2000) break
    page++
  }
  return results
}

/** Mappa cliente Koibox → riga koibox_clienti */
function mapCliente(raw, centroId) {
  return {
    centro_id:        centroId,
    koibox_id:        raw.id || raw.pk || null,
    nome:             raw.nombre || raw.first_name || null,
    cognome:          raw.apellido || raw.last_name || null,
    sesso:            raw.sexo || raw.gender || null,
    data_nascita:     raw.fecha_nacimiento || raw.birth_date || null,
    telefono:         raw.movil || raw.telefono || raw.phone || null,
    email:            raw.email || null,
    citta:            raw.ciudad || raw.city || null,
    data_alta:        raw.fecha_alta || raw.created || null,
    attivo:           raw.activo !== undefined ? raw.activo : true,
    fatturato_totale: parseFloat(raw.total_facturado || raw.total || 0) || 0,
    ultima_vendita:   raw.ultima_venta || raw.last_sale || null,
    punti:            parseInt(raw.puntos || raw.points || 0, 10) || 0,
    note:             raw.observaciones || raw.notes || null,
    imported_at:      new Date().toISOString(),
  }
}

/** Mappa servizio Koibox → riga koibox_servizi */
function mapServizio(raw, centroId) {
  return {
    centro_id:     centroId,
    referenza:     raw.referencia || raw.ref || null,
    nome:          raw.nombre || raw.name || 'Senza nome',
    prezzo:        parseFloat(raw.precio || raw.price || 0) || null,
    durata_minuti: parseInt(raw.duracion || raw.duration || 0, 10) || null,
    categoria:     raw.categoria || raw.category || null,
    mostra_online: raw.online !== undefined ? raw.online : false,
    attivo:        raw.activo !== undefined ? raw.activo : true,
    imported_at:   new Date().toISOString(),
  }
}

/**
 * Mappa forma_pago Koibox → colonna koibox_casse.
 *
 * L'API /movimientos-caja/ restituisce forma_pago come INTERO (1-11).
 * L'API /ventas/ può restituire un intero o un oggetto { value, label }.
 * Fonte: https://docs.koibox.cloud/api-ref/koibox
 *
 * Codici confermati dalla documentazione Koibox:
 *  1 = Efectivo (contanti)
 *  2 = Tarjeta (carta/POS)
 *  3 = Cupón (coupon)
 *  4 = Transferencia (bonifico)
 *  5 = Financiación (finanziamento → altro)
 *  6 = PayPal
 *  7 = Online
 *  8 = Bizum
 *  9 = Tarjeta Regalo (carta regalo)
 * 10 = Tarjeta Fidelidad (carta fedeltà)
 * 11 = (eventuale futuro metodo)
 */
const FORMA_PAGO_INT = {
  1:  'incasso_contanti',
  2:  'incasso_carta',
  3:  'incasso_coupon',
  4:  'incasso_bonifico',
  5:  'incasso_contanti',   // Financiación → approssimiamo a contanti (non comune)
  6:  'incasso_paypal',
  7:  'incasso_online',
  8:  'incasso_bizum',
  9:  'incasso_carta_regalo',
  10: 'incasso_carta_fedelta',
}

/** Risolve forma_pago (intero, stringa-numero, o label testuale) → colonna */
function resolveFormaPageCol(raw) {
  if (raw === null || raw === undefined) return null

  // Caso oggetto { value: N, label: "..." }
  if (typeof raw === 'object' && raw !== null) {
    const v = raw.value ?? raw.id ?? raw.pk
    if (v !== undefined) return FORMA_PAGO_INT[Number(v)] || null
  }

  // Caso intero o stringa numerica
  const n = Number(raw)
  if (!isNaN(n) && n > 0) {
    const col = FORMA_PAGO_INT[n]
    if (!col) console.warn(`[koibox] forma_pago intero non mappato: ${n} — verrà trattato come contanti`)
    return col || null
  }

  // Fallback: stringa testuale (per retrocompatibilità con vecchie versioni API)
  const k = String(raw).toLowerCase().trim()
  const TEXT_MAP = {
    efectivo: 'incasso_contanti', cash: 'incasso_contanti', contanti: 'incasso_contanti',
    tarjeta: 'incasso_carta', carta: 'incasso_carta', card: 'incasso_carta', pos: 'incasso_carta',
    tpv: 'incasso_carta', datafono: 'incasso_carta',
    transferencia: 'incasso_bonifico', bonifico: 'incasso_bonifico', transfer: 'incasso_bonifico',
    bizum: 'incasso_bizum',
    paypal: 'incasso_paypal',
    online: 'incasso_online', satispay: 'incasso_online',
    cupon: 'incasso_coupon', cupón: 'incasso_coupon', coupon: 'incasso_coupon',
    'tarjeta regalo': 'incasso_carta_regalo', 'carta regalo': 'incasso_carta_regalo',
    'tarjeta fidelidad': 'incasso_carta_fedelta', bono: 'incasso_carta_fedelta',
  }
  const col = TEXT_MAP[k] || null
  if (!col) console.warn(`[koibox] forma_pago non riconosciuto: "${raw}"`)
  return col
}

/**
 * Estrae i pagamenti da una singola venta Koibox.
 * Koibox può restituire pagamenti misti (carta + contanti) tramite campi dedicati,
 * oppure un singolo forma_pago (intero 1-11 o oggetto {value, label}).
 * Restituisce array di { col, importo }.
 */
function estraiPagamentiVenta(venta) {
  const pagamenti = []
  const total = parseFloat(venta.total || venta.importe || venta.amount || 0)
  if (total <= 0) return pagamenti

  // Caso 1: split payment con campi espliciti (entrega_efectivo + entrega_tarjeta).
  // Presente quando il cliente paga con metodi misti (parte contanti + parte carta).
  // Koibox split-payment fields (present on mixed cash+card ventas)
  const cash   = parseFloat(venta.entrega_efectivo || 0)
  const card   = parseFloat(venta.entrega_tarjeta  || 0)
  const regalo = parseFloat(venta.importe_tarjeta_regalo    || 0)
  const fidel  = parseFloat(venta.importe_tarjeta_fidelidad || 0)

  if (cash  > 0) pagamenti.push({ col: 'incasso_contanti',      importo: cash  })
  if (card  > 0) pagamenti.push({ col: 'incasso_carta',         importo: card  })
  if (regalo  > 0) pagamenti.push({ col: 'incasso_carta_regalo',  importo: regalo  })
  if (fidel   > 0) pagamenti.push({ col: 'incasso_carta_fedelta', importo: fidel   })
  if (pagamenti.length > 0) return pagamenti

  // Caso 2: array formas_pago / pagos
  const splits = venta.formas_pago || venta.pagos || venta.payment_methods || null
  if (Array.isArray(splits) && splits.length > 0) {
    for (const p of splits) {
      const fp  = p.forma_pago ?? p.forma ?? p.tipo ?? p.method ?? null
      const imp = parseFloat(p.importe || p.amount || p.total || 0)
      if (imp > 0) {
        const col = resolveFormaPageCol(fp) || 'incasso_contanti'
        pagamenti.push({ col, importo: imp })
      }
    }
    if (pagamenti.length > 0) return pagamenti
  }

  // Caso 3: singolo forma_pago (intero 1-11 o oggetto)
  const fp = venta.forma_pago ?? venta.payment_method ?? venta.metodo_pago ?? null
  const col = resolveFormaPageCol(fp) || 'incasso_contanti'
  pagamenti.push({ col, importo: total })
  return pagamenti
}

/**
 * Aggrega ventas in righe giornaliere per koibox_casse.
 * Deduplica per ID prima di sommare.
 */
function aggregaVentasPerGiorno(ventas, centroId) {
  const giorni = {}
  const visti = new Set()

  // Deduplica per ID
  const ventaUniche = ventas.filter(v => {
    const id = v.id ?? v.pk
    if (id === undefined || id === null) return true
    const key = String(id)
    if (visti.has(key)) return false
    visti.add(key)
    return true
  })

  for (const v of ventaUniche) {
    const rawData = v.fecha || v.date || v.data || v.created || null
    if (!rawData) continue
    const data = String(rawData).substring(0, 10) // YYYY-MM-DD

    if (!giorni[data]) {
      giorni[data] = {
        centro_id:             centroId,
        data,
        incasso_contanti:      0,
        incasso_carta:         0,
        incasso_online:        0,
        incasso_bonifico:      0,
        incasso_coupon:        0,
        incasso_bizum:         0,
        incasso_paypal:        0,
        incasso_carta_regalo:  0,
        incasso_carta_fedelta: 0,
        totale_giorno:         0,
        n_scontrini:           0,
        imported_at:           new Date().toISOString(),
      }
    }

    const pags = estraiPagamentiVenta(v)
    for (const { col, importo } of pags) {
      giorni[data][col]          += importo
      giorni[data].totale_giorno += importo
    }
    giorni[data].n_scontrini++
  }

  return Object.values(giorni)
}

/** Mappa appuntamento Koibox → riga koibox_appuntamenti */
function mapAppuntamento(raw, centroId) {
  const clienteNome = raw.cliente_nombre || raw.client_name ||
    [raw.cliente?.nombre, raw.cliente?.apellido].filter(Boolean).join(' ') || null

  return {
    centro_id:    centroId,
    koibox_id:    raw.id || raw.pk || null,
    cliente_nome: clienteNome,
    cliente_tel:  raw.cliente_movil || raw.cliente?.movil || null,
    dipendente:   raw.empleado_nombre || raw.employee_name ||
                  [raw.empleado?.nombre, raw.empleado?.apellido].filter(Boolean).join(' ') || null,
    data_ora:     raw.fecha || raw.date || raw.start || null,
    titolo:       raw.titulo || raw.title || null,
    status:       raw.estado || raw.status || null,
    servizi:      raw.servicios_nombres || raw.services_names ||
                  (Array.isArray(raw.servicios) ? raw.servicios.map(s => s.nombre || s.name).join(', ') : null),
    imported_at:  new Date().toISOString(),
  }
}

/**
 * Sincronizza i dati Koibox per un centro.
 * @param {string} centroId
 * @param {{
 *   clienti?: bool, servizi?: bool, agenda?: bool, casse?: bool,
 *   giorni_agenda?: number, giorni_casse?: number,
 *   data_da?: string,   // 'YYYY-MM-DD' — sovrascrive giorni_casse/giorni_agenda
 *   data_a?:  string,   // 'YYYY-MM-DD' — default: oggi
 * }} opts
 * @returns {{ ok: boolean, stats: object, errors: string[] }}
 */
export async function syncKoibox(centroId, opts = {}) {
  const {
    clienti:      syncClienti  = true,
    servizi:      syncServizi  = true,
    agenda:       syncAgenda   = true,
    casse:        syncCasse    = true,
    giorni_agenda = 30,
    giorni_casse  = 90,
    data_da       = null,
    data_a        = null,
  } = opts

  const stats  = { clienti: 0, servizi: 0, appuntamenti: 0, casse_giorni: 0 }
  const errors = []
  const fmtDate = d => d.toISOString().split('T')[0]
  const oggi = new Date()

  // Risolvi intervallo effettivo: data_da/data_a esplicite hanno precedenza sui giorni
  const fineStr   = data_a  || fmtDate(oggi)
  const fine      = new Date(fineStr + 'T00:00:00Z')

  const inizioCasseStr  = data_da || fmtDate(new Date(oggi.getTime() - giorni_casse  * 86400000))
  const inizioAgendaStr = data_da || fmtDate(new Date(oggi.getTime() - giorni_agenda * 86400000))

  // ─── TUTTE LE SYNC IN PARALLELO ──────────────────────────────────────────────
  await Promise.all([

    // CLIENTI (non dipende dall'intervallo)
    syncClienti ? (async () => {
      try {
        const raw = await fetchAllPages(getKoiboxClienti, centroId)
        if (raw.length > 0) {
          const rows = raw.map(r => mapCliente(r, centroId))
          await admin.from('koibox_clienti').delete().eq('centro_id', centroId)
          for (let i = 0; i < rows.length; i += 200) {
            const batch = rows.slice(i, i + 200)
            const { error } = await admin.from('koibox_clienti').insert(batch)
            if (error) throw new Error(error.message)
            stats.clienti += batch.length
          }
        }
      } catch (err) { errors.push(`Clienti: ${err.message}`) }
    })() : Promise.resolve(),

    // SERVIZI (non dipende dall'intervallo)
    syncServizi ? (async () => {
      try {
        const raw = await fetchAllPages(getKoiboxServizi, centroId)
        if (raw.length > 0) {
          const rows = raw.map(r => mapServizio(r, centroId))
          await admin.from('koibox_servizi').delete().eq('centro_id', centroId)
          for (let i = 0; i < rows.length; i += 200) {
            const batch = rows.slice(i, i + 200)
            const { error } = await admin.from('koibox_servizi').insert(batch)
            if (error) throw new Error(error.message)
            stats.servizi += batch.length
          }
        }
      } catch (err) { errors.push(`Servizi: ${err.message}`) }
    })() : Promise.resolve(),

    // AGENDA — chunk settimanali per evitare timeout su periodi lunghi
    syncAgenda ? (async () => {
      try {
        const allRaw = []
        // Dividi il range in chunk da 7 giorni
        let chunkStart = new Date(inizioAgendaStr + 'T00:00:00Z')
        const fineDate  = new Date(fineStr + 'T00:00:00Z')
        while (chunkStart <= fineDate) {
          const chunkEnd = new Date(Math.min(
            chunkStart.getTime() + 6 * 86400000,
            fineDate.getTime()
          ))
          const chunkStartStr = fmtDate(chunkStart)
          const chunkEndStr   = fmtDate(chunkEnd)
          try {
            const chunk = await fetchAllPages(getKoiboxAgenda, centroId, {
              fecha_desde: chunkStartStr,
              fecha_hasta: chunkEndStr,
            })
            allRaw.push(...chunk)
          } catch (chunkErr) {
            errors.push(`Agenda ${chunkStartStr}/${chunkEndStr}: ${chunkErr.message}`)
          }
          chunkStart = new Date(chunkEnd.getTime() + 86400000)
        }
        if (allRaw.length > 0) {
          const rows = allRaw.map(r => mapAppuntamento(r, centroId))
          await admin.from('koibox_appuntamenti')
            .delete().eq('centro_id', centroId).gte('data_ora', inizioAgendaStr)
          for (let i = 0; i < rows.length; i += 200) {
            const batch = rows.slice(i, i + 200)
            const { error } = await admin.from('koibox_appuntamenti').insert(batch)
            if (error) throw new Error(error.message)
            stats.appuntamenti += batch.length
          }
        }
      } catch (err) { errors.push(`Agenda: ${err.message}`) }
    })() : Promise.resolve(),

    // CASSE — Koibox API espone solo dati recenti via /ventas/ (non filtra per data)
    // Per dati storici: usa Import XLS Riepilogo Casse
    syncCasse ? (async () => {
      try {
        const ventas = await fetchAllPages(getKoiboxVentas, centroId, {})
        if (ventas.length > 0) {
          const righeGiornaliere = aggregaVentasPerGiorno(ventas, centroId)
          for (let i = 0; i < righeGiornaliere.length; i += 100) {
            const batch = righeGiornaliere.slice(i, i + 100)
            const { error } = await admin.from('koibox_casse').upsert(batch, { onConflict: 'centro_id,data' })
            if (error) throw new Error(error.message)
            stats.casse_giorni += batch.length
          }
        }
      } catch (err) { errors.push(`Casse: ${err.message}`) }
    })() : Promise.resolve(),

  ])

  // Aggiorna last_sync_at
  await admin
    .from('centro_integrazioni')
    .update({ last_sync_at: new Date().toISOString() })
    .eq('centro_id', centroId)
    .eq('gestionale', 'koibox')

  // Bridge casse → registro_giornate (fonte unica per dashboard/analytics/BeautyX)
  if (syncCasse && stats.casse_giorni > 0) {
    // Recupera la data minima dei dati effettivamente importati in koibox_casse
    const { data: minRow } = await admin
      .from('koibox_casse')
      .select('data')
      .eq('centro_id', centroId)
      .order('data', { ascending: true })
      .limit(1)
      .maybeSingle()
    const bridgeFrom = minRow?.data || inizioCasseStr
    const bridgeResult = await bridgeKoiboxToRegistro(centroId, bridgeFrom, fineStr)
    if (bridgeResult.errors.length > 0) {
      errors.push(...bridgeResult.errors.map(e => `Bridge: ${e}`))
    }
    stats.registro_bridged = bridgeResult.bridged
    stats.registro_skipped = bridgeResult.skipped
  }

  return {
    ok: errors.length === 0,
    stats,
    errors,
    messaggio: errors.length === 0
      ? `Sync completata: ${stats.clienti} clienti, ${stats.servizi} servizi, ${stats.appuntamenti} appuntamenti, ${stats.casse_giorni} giorni cassa (${stats.registro_bridged ?? 0} bridgati in registro)`
      : `Sync parziale. Completato: clienti=${stats.clienti}, servizi=${stats.servizi}, appuntamenti=${stats.appuntamenti}, casse=${stats.casse_giorni}, registro_bridged=${stats.registro_bridged ?? 0}. Errori: ${errors.join('; ')}`,
  }
}
