/**
 * listino-calc.js
 * Calcolo costi e prezzi per il listino del centro estetico.
 *
 * ─── FORMULA COSTO ESERCIZIO ────────────────────────────────────────────────
 *
 * Costo grezzo del centro per minuto:
 *   costoMinuto = (spese_365gg / ore_apertura_annuali) / 60
 *
 * In ogni minuto di apertura il centro serve in media:
 *   slot_attivi = nr_op_centro × 0.5
 *   (prudenziale: ogni operatrice è impegnata con una cliente circa il 50% del tempo)
 *
 * Costo attribuito al singolo servizio:
 *   costoPersonale = (minPieno + minRidotto) × costoMinuto
 *                    × nrOp_servizio / (nr_op_centro × 0.5)
 *
 *   • nrOp_servizio al NUMERATORE: se 2 operatrici servono la stessa cliente,
 *     occupano 2 slot → costo raddoppia (2 clienti che "potrebbero" essere
 *     servite sono invece occupate da 1 sola).
 *   • nr_op_centro × 0.5 al DENOMINATORE: più operatrici ha il centro,
 *     più clienti vengono servite contemporaneamente → costo per singolo
 *     servizio si abbassa (il fisso si spalma su più revenue).
 *
 * ─── MINUTI EFFETTIVI ───────────────────────────────────────────────────────
 *
 * Dipende da "sovrapponibile":
 *   sovrapponibile = true  → durante l'esecuzione l'operatrice è libera (×⅔)
 *   sovrapponibile = false → operatrice obbligatoriamente presente (costo pieno)
 *
 * ─── ESEMPIO ────────────────────────────────────────────────────────────────
 *
 * Pressoterapia (sovrapponibile), 45 min totali:
 *   prep=10, esec=20(sovrap.), chiusura=10, san=5
 *   centro: 3 operatrici, costoMinuto=€0.20, ricarico 30%, IVA 22%
 *   nrOp_servizio = 1
 *
 *   minPieno   = 10 + 10 + 5 = 25
 *   minRidotto = 20 × 2/3 ≈ 13.3
 *   costoPersonale = (25 + 13.3) × 0.20 × 1 / (3 × 0.5)
 *                  = 38.3 × 0.20 / 1.5 = €5.11
 *
 *   Con 2 operatrici sulla stessa cliente (nrOp_servizio=2):
 *   costoPersonale = 38.3 × 0.20 × 2 / 1.5 = €10.21 (doppio)
 */

/**
 * Calcola il breakdown economico completo di un servizio.
 *
 * @param {Object} params
 * @param {Object} params.servizio          - Dati del servizio (dal DB o dal form)
 * @param {number} params.costoOraEsercizio - €/ora GREZZI del centro (spese_annuali/ore_annuali),
 *                                           SENZA già dividere per nr_op o efficienza
 * @param {number} params.nrOpCentro        - Nr. operatrici operative del centro (default 1)
 * @param {number} params.aliquotaIvaPerc   - % IVA (es. 22)
 * @returns {Object} Breakdown con tutti i valori calcolati
 */
export function calcolaServizio({ servizio, costoOraEsercizio, nrOpCentro = 1, aliquotaIvaPerc }) {
  const prep    = Number(servizio.durata_preparazione_min)  || 0
  const esec    = Number(servizio.durata_esecuzione_min)    || 0
  const chius   = Number(servizio.durata_chiusura_min)      || 0
  const sanif   = Number(servizio.durata_sanificazione_min) || 0
  const nrOpS   = Math.max(1, Number(servizio.nr_operatrici) || 1)  // operatrici del servizio
  const nrOpC   = Math.max(1, Number(nrOpCentro) || 1)              // operatrici del centro
  const ricar   = Number(servizio.ricarico_percentuale)     || 0
  const costoH  = Number(costoOraEsercizio)                 || 0
  const iva     = Number(aliquotaIvaPerc)                   || 0
  const sovrap  = servizio.sovrapponibile === true || servizio.sovrapponibile === 'true'

  // Durata totale (prep + esec + chiusura + sanificazione)
  const durataTotale = prep + esec + chius + sanif

  // Minuti a costo PIENO: operatrice obbligatoriamente presente
  const minPieno = prep + chius + sanif + (sovrap ? 0 : esec)

  // Minuti a costo RIDOTTO 2/3: solo se sovrapponibile = true
  const minRidotto = sovrap ? esec * (2 / 3) : 0

  // Costo esercizio attribuito al servizio
  //   costoMinuto     = costo grezzo del centro per minuto
  //   × nrOpS         = operatrici impegnate su questa cliente (numeratore)
  //   / (nrOpC × 0.5) = slot medi attivi nel centro (denominatore)
  const costoMinuto    = costoH / 60
  const costoPersonale = (minPieno + minRidotto) * costoMinuto * nrOpS / (nrOpC * 0.5)

  // Costo materiali di consumo
  const materiali = servizio.materiali || servizio.servizi_materiali || []
  const costoMateriali = materiali.reduce(
    (sum, m) => sum + (Number(m.costo_unitario) || 0) * (Number(m.quantita_uso) || 1),
    0
  )

  // Costo vivo totale
  const costoVivo = costoPersonale + costoMateriali

  // Prezzo netto (costo vivo + ricarico %)
  const prezzoNetto = costoVivo * (1 + ricar / 100)

  // Prezzo al pubblico IVA inclusa
  const prezzoLordo = prezzoNetto * (1 + iva / 100)

  // Margine minimo garantito: 20% sopra il costo vivo (al netto IVA)
  // Scendere sotto significa lavorare quasi in perdita (nessun buffer per imprevisti)
  const MARGINE_MINIMO_PERC = 20
  const prezzoMinimoNetto = costoVivo * (1 + MARGINE_MINIMO_PERC / 100)
  const prezzoMinimo = prezzoMinimoNetto * (1 + iva / 100)  // IVA inclusa

  // Sconto massimo applicabile mantenendo almeno il margine minimo
  const scontoMax = prezzoLordo > prezzoMinimo
    ? Math.max(0, +((1 - prezzoMinimo / prezzoLordo) * 100).toFixed(1))
    : 0

  // Margine effettivo sul costo vivo (utile % rispetto al costo)
  const marginePerc = costoVivo > 0
    ? +((prezzoNetto / costoVivo - 1) * 100).toFixed(1)
    : 0

  return {
    // Tempi
    durataTotale,
    minPieno,
    minRidotto:     +minRidotto.toFixed(1),
    // Costi
    costoPersonale: +costoPersonale.toFixed(2),
    costoMateriali: +costoMateriali.toFixed(2),
    costoVivo:      +costoVivo.toFixed(2),
    // Prezzi
    prezzoNetto:    +prezzoNetto.toFixed(2),
    prezzoLordo:    +prezzoLordo.toFixed(2),
    prezzoMinimo:   +prezzoMinimo.toFixed(2),
    scontoMax,
    marginePerc,
    margineMinPerc: MARGINE_MINIMO_PERC,
  }
}

/**
 * Analizza la salute di un prezzo congelato rispetto ai costi attuali.
 *
 * @param {Object} params
 * @param {number} params.prezzoPubblico          - Prezzo congelato (IVA inclusa)
 * @param {number} params.costoVivoAttuale        - Costo vivo calcolato OGGI dalla formula
 * @param {number|null} params.costoVivoAlCongelamento - Costo vivo al momento del freeze (null = non disponibile)
 * @param {number} params.aliquotaIvaPerc         - % IVA del servizio
 * @param {number} [params.margineMinUtilePerc=40] - % minima dell'utile da conservare negli sconti
 *
 * @returns {Object} Analisi completa del prezzo congelato
 *
 * ── FORMULA SCONTO MASSIMO ───────────────────────────────────
 * L'utile attuale = prezzoNetto - costoVivoAttuale
 * L'utile minimo da preservare = utile × margineMinUtilePerc / 100
 * Prezzo minimo netto = costoVivo + utileMinimo
 * Prezzo minimo lordo = prezzoMinimoNetto × (1 + iva/100)
 * Sconto max % = (prezzoPubblico - prezzoMinimo) / prezzoPubblico × 100
 *
 * Esempio (dal business): costo=10, utile=3, prezzo=13, margineMin=40%
 *   utileMinimo = 3 × 40% = 1.20
 *   prezzoMinimo = (10 + 1.20) × 1 (no IVA) = 11.20
 *   scontoMax = (13 - 11.20) / 13 × 100 ≈ 13.8%
 */
export function analizzaCongelato({
  prezzoPubblico,
  costoVivoAttuale,
  costoVivoAlCongelamento = null,
  aliquotaIvaPerc,
  margineMinUtilePerc = 40,
}) {
  const iva = Number(aliquotaIvaPerc) || 0
  const pp  = Number(prezzoPubblico)  || 0
  const cvA = Number(costoVivoAttuale) || 0

  // Prezzo netto (senza IVA) del congelato
  const ppNetto = pp / (1 + iva / 100)

  // Utile attuale al prezzo congelato
  const utile     = ppNetto - cvA
  const utilePerc = cvA > 0 ? +((utile / cvA) * 100).toFixed(1) : null

  // Utile minimo da conservare (soglia sconto)
  const utileMin       = Math.max(0, utile) * (margineMinUtilePerc / 100)
  const prezzoMinNetto = cvA + utileMin
  const prezzoMin      = +(prezzoMinNetto * (1 + iva / 100)).toFixed(2)
  const scontoMax      = pp > prezzoMin
    ? +((1 - prezzoMin / pp) * 100).toFixed(1)
    : 0

  // Stato della voce di listino
  // 'perdita'      → utile negativo (prezzo sotto costo)
  // 'critico'      → utile < 20% del costo (soglia assoluta minima)
  // 'attenzione'   → utile calato rispetto al congelamento (costi aumentati)
  // 'ok'           → stabile
  // 'migliorato'   → costi calati rispetto al congelamento (utile aumentato)
  let stato = 'ok'
  if (utile < 0) {
    stato = 'perdita'
  } else if (utilePerc !== null && utilePerc < 20) {
    stato = 'critico'
  } else if (costoVivoAlCongelamento !== null) {
    const cvO = Number(costoVivoAlCongelamento)
    const deltaPerc = cvO > 0 ? ((cvA - cvO) / cvO) * 100 : 0
    if (deltaPerc > 5)        stato = 'attenzione'   // costi aumentati >5%
    else if (deltaPerc < -5)  stato = 'migliorato'   // costi calati >5%
  }

  // Delta costo rispetto al congelamento
  let deltaCosto = null
  let deltaCostoPerc = null
  if (costoVivoAlCongelamento !== null) {
    const cvO = Number(costoVivoAlCongelamento)
    deltaCosto     = +(cvA - cvO).toFixed(2)
    deltaCostoPerc = cvO > 0 ? +((deltaCosto / cvO) * 100).toFixed(1) : null
  }

  return {
    ppNetto:     +ppNetto.toFixed(2),
    utile:       +utile.toFixed(2),
    utilePerc,
    utileMin:    +utileMin.toFixed(2),
    prezzoMin,
    scontoMax,
    stato,
    deltaCosto,
    deltaCostoPerc,
  }
}

/**
 * Formatta un importo in Euro.
 * @param {number} n
 * @returns {string} es. "€ 42,50"
 */
export function formatEuro(n) {
  if (n === null || n === undefined || isNaN(n)) return '€ —'
  return `€ ${Number(n).toLocaleString('it-IT', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`
}
