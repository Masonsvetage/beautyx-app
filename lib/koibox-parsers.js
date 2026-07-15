import * as XLSX from 'xlsx'

// ─── Conversioni ─────────────────────────────────────────────────────────────

export function toDate(v) {
  if (!v) return null
  if (v instanceof Date) return v.toISOString().substring(0, 10)
  if (typeof v === 'number') {
    const d = XLSX.SSF.parse_date_code(v)
    if (!d) return null
    return `${d.y}-${String(d.m).padStart(2, '0')}-${String(d.d).padStart(2, '0')}`
  }
  if (typeof v === 'string') {
    const m = v.match(/^(\d{2})-(\d{2})-(\d{4})$/)
    if (m) return `${m[3]}-${m[2]}-${m[1]}`
    if (/^\d{4}-\d{2}-\d{2}/.test(v)) return v.substring(0, 10)
  }
  return null
}

export function toTimestamp(v) {
  if (!v) return null
  if (v instanceof Date) return v.toISOString()
  const d = toDate(v)
  return d ? `${d}T00:00:00.000Z` : null
}

export function toNum(v) {
  if (v === null || v === undefined || v === '') return 0
  const n = parseFloat(String(v).replace(',', '.'))
  return isNaN(n) ? 0 : n
}

export function toInt(v) {
  if (v === null || v === undefined) return null
  const n = parseInt(v)
  return isNaN(n) ? null : n
}

export function toBool(v) {
  return v === true || v === 1 || v === '1' || v === 'SI' || v === 'si'
}

// ─── Auto-detect tipo file ────────────────────────────────────────────────────

export function detectFileType(rows) {
  if (!rows || rows.length < 1) return null

  const r0 = (rows[0] || []).map(c => String(c || '').trim().toLowerCase())
  const r2 = (rows[2] || []).map(c => String(c || '').trim().toLowerCase())

  if (r2[0] && (r2[0].includes('nombre') || r2[0].includes('nome'))) return 'clienti'
  if (r2[0] && r2[0].includes('referenz')) return 'servizi'
  if (r0[0] && r0[0].includes('codice')) return 'appuntamenti'
  if (r0[0] === 'data' && r0.some(c => c.includes('contanti') || c.includes('carta'))) return 'casse'

  return null
}

// ─── Parsers ──────────────────────────────────────────────────────────────────

export function parseClienti(rows) {
  const records = []
  for (const r of rows.slice(3)) {
    if (!r[0]) continue
    records.push({
      koibox_id:          toInt(r[15]),
      nome:               r[0]?.toString().trim() || null,
      cognome:            r[1]?.toString().trim() || null,
      secondo_cognome:    r[2]?.toString().trim() || null,      // Segundo apellido
      sesso:              r[3]?.toString().trim() || null,
      data_nascita:       toDate(r[4]),
      telefono:           r[5]?.toString().trim() || null,      // Teléfono móvil
      telefono_fisso:     r[6]?.toString().trim() || null,      // Teléfono fijo
      email:              r[7]?.toString().trim().toLowerCase() || null,
      documento_identita: r[8]?.toString().trim() || null,      // Documento de identidad
      indirizzo:          r[9]?.toString().trim() || null,      // Dirección
      citta:              r[10]?.toString().trim() || null,
      cap:                r[11]?.toString().trim() || null,     // Código postal
      data_alta:          toDate(r[12]),
      note:               r[13]?.toString().trim() || null,
      info_clinica:       r[14]?.toString().trim() || null,     // Información clínica
      come_conosciuto:    r[16]?.toString().trim() || null,     // ¿Cómo nos conoció?
      attivo:             r[17] !== false && r[17] !== 0,
      fatturato_totale:   toNum(r[18]),
      newsletter:         toBool(r[19]),                        // Suscrito al newsletter
      email_inviati:      toInt(r[20]) || 0,                   // Envíos email
      rgpd:               toBool(r[21]),                        // RGPD
      importo_debiti:     toNum(r[22]),                         // Importe deudas
      ultima_vendita:     toTimestamp(r[23]),
      punti:              toInt(r[24]) || 0,
    })
  }
  return records
}

export function parseCasse(rows) {
  const records = []
  for (const r of rows.slice(1)) {
    const d = toDate(r[0])
    if (!d) continue
    const cont   = toNum(r[2])  // Vendite in contanti
    const carta  = toNum(r[3])  // Vendite con carta
    const online = toNum(r[4])  // Vendite Online
    const bonif  = toNum(r[5])  // Vendite con bonifico
    // NON usare r[18] "Cassa del giorno": Koibox include l'apertura di cassa (fondo cassa)
    // che NON è incasso. Sommiamo solo le voci di incasso effettivo.
    const debCont = toNum(r[11])
    const debCarta = toNum(r[12])
    const debAltri = toNum(r[13])
    const totale = cont + carta + online + bonif +
      toNum(r[6]) + toNum(r[7]) + toNum(r[8]) + toNum(r[9]) + toNum(r[10]) +
      debCont + debCarta + debAltri

    let n_scontrini = null
    if (r[20] && r[19]) {
      const last = toInt(r[20]), first = toInt(r[19])
      if (last && first && last >= first) n_scontrini = last - first + 1
    }

    records.push({
      data:                  d,
      apertura_cassa:        toNum(r[1]),  // Fondo cassa (apertura di cassa)
      incasso_contanti:      cont,
      incasso_carta:         carta,
      incasso_online:        online,
      incasso_bonifico:      bonif,
      incasso_coupon:        toNum(r[6]),  // Vendite con coupon
      incasso_bizum:         toNum(r[7]),  // Vendite con Bizum
      incasso_paypal:        toNum(r[8]),  // Vendite Paypal
      incasso_carta_regalo:  toNum(r[9]),  // Pagamento con Carta Regalo
      incasso_carta_fedelta: toNum(r[10]), // Pagamento con Carta Fedeltà
      debiti_contanti:       debCont,      // Pagamenti debiti in contanti
      debiti_carta:          debCarta,     // Pagamenti debiti con carta
      debiti_altri:          debAltri,     // Pagamenti debiti con altre forme
      n_coupon:              toInt(r[14]), // Numero di coupon utilizzati
      contanti_in_cassa:     toNum(r[15]), // Contanti fisici in cassa
      quantita_reale_cassa:  toNum(r[16]), // Quantità reale in cassa
      differenza_cassa:      toNum(r[17]), // Differenza (reale - atteso)
      totale_giorno:         totale,
      n_scontrini,
    })
  }
  return records
}

export function parseServizi(rows) {
  const records = []
  for (const r of rows.slice(3)) {
    if (!r[1]) continue
    let durata_minuti = null
    if (r[3] instanceof Date) {
      durata_minuti = r[3].getHours() * 60 + r[3].getMinutes()
    } else if (typeof r[3] === 'number' && r[3] < 1) {
      durata_minuti = Math.round(r[3] * 24 * 60)
    } else if (typeof r[3] === 'string' && r[3].includes(':')) {
      // Formato "H:MM:SS" o "HH:MM:SS"
      const parts = r[3].split(':').map(Number)
      if (parts.length >= 2) durata_minuti = parts[0] * 60 + parts[1]
    }
    records.push({
      referenza:       r[0]?.toString().trim() || null,
      nome:            r[1]?.toString().trim(),
      prezzo:          toNum(r[2]),
      durata_minuti,
      categoria:       r[4]?.toString().trim() || null,
      mostra_online:   toBool(r[5]),
      dettagli:        r[6]?.toString().trim() || null,         // Dettagli/descrizione
      sconto_online:   toNum(r[7]),                             // Sconto online
      dipendenti:      r[8]?.toString().trim() || null,         // Dipendenti abilitati (email)
      imposte:         r[9]?.toString().trim() || null,         // Codice IVA (es. "22")
      prezzo_tariffa_1: toNum(r[11]) || null,
      prezzo_tariffa_2: toNum(r[12]) || null,
      prezzo_tariffa_3: toNum(r[13]) || null,
      prezzo_tariffa_4: toNum(r[14]) || null,
      attivo:          r[18] !== false && r[18] !== 0 && r[18] !== null,
    })
  }
  return records
}

export function parseAppuntamenti(rows) {
  const records = []
  for (const r of rows.slice(1)) {
    if (!r[0]) continue
    let data_ora = null
    const d = toDate(r[4])
    if (d) {
      let ora = '00:00'
      if (r[5]) {
        if (r[5] instanceof Date) {
          ora = `${String(r[5].getHours()).padStart(2,'0')}:${String(r[5].getMinutes()).padStart(2,'0')}`
        } else if (typeof r[5] === 'string') {
          ora = r[5].substring(0, 5)
        }
      }
      data_ora = `${d}T${ora}:00.000Z`
    }
    records.push({
      koibox_id:             toInt(r[0]),
      cliente_nome:          r[1]?.toString().trim() || null,
      cliente_tel:           r[2]?.toString().trim() || null,
      dipendente:            r[3]?.toString().trim() || null,
      data_ora,
      titolo:                r[6]?.toString().trim() || null,
      status:                r[7]?.toString().trim() || null,
      osservazioni:          r[8]?.toString().trim() || null,   // Note/osservazioni sull'appuntamento
      data_ultimo_movimento: toTimestamp(r[9]),                  // Data ultimo aggiornamento
      servizi:               r[10]?.toString().trim() || null,
      risorse:               r[11]?.toString().trim() || null,  // Risorse fisiche usate
    })
  }
  return records
}

// ─── Import in batch ──────────────────────────────────────────────────────────

export async function importTable(adminClient, table, records, centroId) {
  if (records.length === 0) return { importati: 0, errors: [], empty: true }

  const withCentro = records.map(r => ({ ...r, centro_id: centroId }))
  await adminClient.from(table).delete().eq('centro_id', centroId)

  const BATCH = 100
  let importati = 0
  const errors = []

  for (let i = 0; i < withCentro.length; i += BATCH) {
    const batch = withCentro.slice(i, i + BATCH)
    const { error } = await adminClient.from(table).insert(batch)
    if (error) {
      errors.push(`Batch ${i}-${i + BATCH}: ${error.message}`)
    } else {
      importati += batch.length
    }
  }

  return { importati, errors }
}

// ─── Leggi file Excel e restituisce rows raw + stringa ───────────────────────

export function readExcelRows(buffer) {
  // rows con stringhe (per detect tipo)
  const wb = XLSX.read(buffer, { type: 'buffer', cellDates: true })
  const ws = wb.Sheets[wb.SheetNames[0]]
  const rows = XLSX.utils.sheet_to_json(ws, { header: 1, raw: false, defval: null })

  // rows raw (per parsing numeri/date)
  const wb2 = XLSX.read(buffer, { type: 'buffer', cellDates: true })
  const ws2 = wb2.Sheets[wb2.SheetNames[0]]
  const rowsRaw = XLSX.utils.sheet_to_json(ws2, { header: 1, raw: true, defval: null })

  return { rows, rowsRaw }
}
