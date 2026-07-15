import { startOfWeek, endOfWeek, startOfMonth, endOfMonth, eachDayOfInterval, eachWeekOfInterval, eachMonthOfInterval, format, parseISO, differenceInDays, isWithinInterval, subYears, getYear } from 'date-fns'
import { it } from 'date-fns/locale'

/**
 * Filtra movimenti per periodo
 */
export function filterMovementsByPeriod(movements, startDate, endDate) {
  if (!startDate || !endDate) return movements

  return movements.filter(mov => {
    const movDate = parseISO(mov.data)
    return isWithinInterval(movDate, { start: parseISO(startDate), end: parseISO(endDate) })
  })
}

/**
 * Raggruppa movimenti per categoria
 */
export function groupByCategory(movements) {
  const groups = {}

  movements.forEach(mov => {
    const categoria = mov.categoria || 'Non Categorizzato'
    if (!groups[categoria]) {
      groups[categoria] = {
        categoria,
        entrate: 0,
        uscite: 0,
        count: 0,
        movements: []
      }
    }

    const importo = parseFloat(mov.importo)
    if (mov.tipo === 'entrata') {
      groups[categoria].entrate += importo
    } else {
      groups[categoria].uscite += importo
    }
    groups[categoria].count++
    groups[categoria].movements.push(mov)
  })

  return Object.values(groups).sort((a, b) =>
    (b.entrate + b.uscite) - (a.entrate + a.uscite)
  )
}

/**
 * Raggruppa movimenti per giorno
 */
export function groupByDay(movements, startDate, endDate) {
  const days = eachDayOfInterval({
    start: parseISO(startDate),
    end: parseISO(endDate)
  })

  return days.map(day => {
    const dayStr = format(day, 'yyyy-MM-dd')
    const dayMovements = movements.filter(mov => mov.data.startsWith(dayStr))

    const entrate = dayMovements
      .filter(m => m.tipo === 'entrata')
      .reduce((sum, m) => sum + parseFloat(m.importo), 0)

    const uscite = dayMovements
      .filter(m => m.tipo === 'uscita')
      .reduce((sum, m) => sum + parseFloat(m.importo), 0)

    return {
      data: format(day, 'dd MMM', { locale: it }),
      dataCompleta: dayStr,
      entrate,
      uscite,
      saldo: entrate - uscite,
      count: dayMovements.length
    }
  })
}

/**
 * Raggruppa movimenti per settimana
 */
export function groupByWeek(movements, startDate, endDate) {
  const weeks = eachWeekOfInterval({
    start: parseISO(startDate),
    end: parseISO(endDate)
  }, { weekStartsOn: 1 }) // Lunedì

  return weeks.map(weekStart => {
    const weekEnd = endOfWeek(weekStart, { weekStartsOn: 1 })
    const weekMovements = movements.filter(mov => {
      const movDate = parseISO(mov.data)
      return isWithinInterval(movDate, { start: weekStart, end: weekEnd })
    })

    const entrate = weekMovements
      .filter(m => m.tipo === 'entrata')
      .reduce((sum, m) => sum + parseFloat(m.importo), 0)

    const uscite = weekMovements
      .filter(m => m.tipo === 'uscita')
      .reduce((sum, m) => sum + parseFloat(m.importo), 0)

    return {
      data: format(weekStart, 'dd MMM', { locale: it }),
      dataCompleta: format(weekStart, 'yyyy-MM-dd'),
      entrate,
      uscite,
      saldo: entrate - uscite,
      count: weekMovements.length
    }
  })
}

/**
 * Raggruppa movimenti per mese
 */
export function groupByMonth(movements, startDate, endDate) {
  const months = eachMonthOfInterval({
    start: parseISO(startDate),
    end: parseISO(endDate)
  })

  return months.map(monthStart => {
    const monthEnd = endOfMonth(monthStart)
    const monthMovements = movements.filter(mov => {
      const movDate = parseISO(mov.data)
      return isWithinInterval(movDate, { start: monthStart, end: monthEnd })
    })

    const entrate = monthMovements
      .filter(m => m.tipo === 'entrata')
      .reduce((sum, m) => sum + parseFloat(m.importo), 0)

    const uscite = monthMovements
      .filter(m => m.tipo === 'uscita')
      .reduce((sum, m) => sum + parseFloat(m.importo), 0)

    return {
      data: format(monthStart, 'MMM yyyy', { locale: it }),
      dataCompleta: format(monthStart, 'yyyy-MM-dd'),
      entrate,
      uscite,
      saldo: entrate - uscite,
      count: monthMovements.length
    }
  })
}

/**
 * Calcola KPI (Key Performance Indicators)
 */
export function calculateKPIs(movements, startDate, endDate, openingHours = [], closures = []) {
  const filtered = filterMovementsByPeriod(movements, startDate, endDate)

  const entrate = filtered
    .filter(m => m.tipo === 'entrata')
    .reduce((sum, m) => sum + parseFloat(m.importo), 0)

  const uscite = filtered
    .filter(m => m.tipo === 'uscita')
    .reduce((sum, m) => sum + parseFloat(m.importo), 0)

  // Compensazione Giroconti/POS (anticipazioni carte)
  const giroconti = filtered
    .filter(m => m.tipo === 'uscita' && m.categoria === 'Giroconti')
    .reduce((sum, m) => sum + parseFloat(m.importo), 0)

  const pos = filtered
    .filter(m => m.tipo === 'entrata' && m.categoria === 'POS')
    .reduce((sum, m) => sum + parseFloat(m.importo), 0)

  // I giroconti sono anticipazioni sui POS, quindi vanno compensati
  const compensazione = Math.min(giroconti, pos)
  const usciteReali = uscite - compensazione

  const saldo = entrate - uscite

  // Calcola giorni nel periodo
  const giorniPeriodo = differenceInDays(parseISO(endDate), parseISO(startDate)) + 1

  // Calcola ore settimanali da configurazione
  const oreSettimanali = openingHours.reduce((sum, h) => {
    if (!h.aperto || !h.orario_apertura || !h.orario_chiusura) return sum
    const [openH, openM] = h.orario_apertura.split(':').map(Number)
    const [closeH, closeM] = h.orario_chiusura.split(':').map(Number)
    const hours = (closeH + closeM / 60) - (openH + openM / 60)
    return sum + hours
  }, 0)

  // Calcola settimane effettive
  const settimane = giorniPeriodo / 7

  // Calcola giorni lavorativi effettivi considerando chiusure
  let giorniLavorativiEffettivi = 0
  const days = eachDayOfInterval({
    start: parseISO(startDate),
    end: parseISO(endDate)
  })

  days.forEach(day => {
    const dayOfWeek = day.getDay() === 0 ? 6 : day.getDay() - 1 // 0=Lun, 6=Dom
    const dayConfig = openingHours.find(h => h.giorno_settimana === dayOfWeek)

    // Verifica se il giorno è aperto
    if (!dayConfig || !dayConfig.aperto) return

    // Verifica se c'è una chiusura eccezionale
    const isClosed = closures.some(closure => {
      // Chiusura ricorrente
      if (closure.ricorrente) {
        if (closure.tipo_ricorrenza === 'annuale') {
          // Confronta giorno e mese (es: 15 agosto ogni anno)
          const closureDate = parseISO(closure.data_inizio)
          return day.getDate() === closureDate.getDate() &&
                 day.getMonth() === closureDate.getMonth()
        } else if (closure.tipo_ricorrenza === 'mensile') {
          // Confronta solo il giorno del mese (es: ogni 1° del mese)
          const closureDate = parseISO(closure.data_inizio)
          return day.getDate() === closureDate.getDate()
        }
      }

      // Chiusura normale (con data inizio/fine)
      const closureStart = parseISO(closure.data_inizio)
      const closureEnd = parseISO(closure.data_fine)
      return isWithinInterval(day, { start: closureStart, end: closureEnd })
    })

    if (!isClosed) {
      giorniLavorativiEffettivi++
    }
  })

  // Ore lavorative totali nel periodo
  const oreLavorativeTotali = openingHours.length > 0
    ? (giorniLavorativiEffettivi / 7) * oreSettimanali
    : giorniLavorativiEffettivi * 8 // Fallback: 8 ore al giorno

  // IVA detraibile sui costi (22%)
  const IVA_RATE = 22
  const ivaDetraibile = usciteReali * (IVA_RATE / (100 + IVA_RATE))
  const usciteNette = usciteReali - ivaDetraibile

  // Costo giornaliero di esercizio LORDO (con compensazione giroconti/POS)
  const costoGiornalieroEsercizio = giorniLavorativiEffettivi > 0
    ? usciteReali / giorniLavorativiEffettivi
    : 0

  // Costo giornaliero NETTO (esclusa IVA detraibile) - per calcolo liquidità
  const costoGiornalieroNetto = giorniLavorativiEffettivi > 0
    ? usciteNette / giorniLavorativiEffettivi
    : 0

  // Costo orario di esercizio (con compensazione giroconti/POS)
  const costoOrarioEsercizio = oreLavorativeTotali > 0
    ? usciteReali / oreLavorativeTotali
    : 0

  // Entrata media giornaliera
  const entrataMediaGiornaliera = giorniLavorativiEffettivi > 0
    ? entrate / giorniLavorativiEffettivi
    : 0

  // Entrata media oraria
  const entrataMediaOraria = oreLavorativeTotali > 0
    ? entrate / oreLavorativeTotali
    : 0

  // Margine operativo
  const margineOperativo = entrate > 0 ? (saldo / entrate) * 100 : 0

  return {
    entrate,
    uscite,
    usciteReali, // Uscite dopo compensazione giroconti/POS
    usciteNette, // Uscite nette (esclusa IVA detraibile)
    saldo,
    giorniPeriodo,
    giorniLavorativiEffettivi,
    oreSettimanali,
    oreLavorativeTotali,
    costoGiornalieroEsercizio, // Lordo (include IVA)
    costoGiornalieroNetto, // Netto (esclusa IVA detraibile)
    costoOrarioEsercizio,
    entrataMediaGiornaliera,
    entrataMediaOraria,
    margineOperativo,
    ivaDetraibile,
    movimentiTotali: filtered.length,
    // Dettaglio compensazione giroconti/POS
    compensazione: {
      giroconti,
      pos,
      importoCompensato: compensazione,
      percentualeCompensata: giroconti > 0 ? Math.round((compensazione / giroconti) * 100) : 0
    }
  }
}

/**
 * Rileva anomalie e costi sospetti
 */
/**
 * DEPRECATO: Sostituito da generateIntelligentAlerts in analytics-alerts.js
 * Mantenuto per retrocompatibilità, ma usa il nuovo sistema
 */
export function detectAnomalies(movements) {
  // Import dinamico del nuovo sistema
  // Per ora ritorna array vuoto e lascia che il nuovo sistema gestisca tutto
  return []

  // VECCHIO CODICE DEPRECATO SOTTO (non più usato)
  /*
  const uscite = movements.filter(m => m.tipo === 'uscita')

  // Raggruppa per categoria
  const byCategory = {}
  uscite.forEach(mov => {
    const cat = mov.categoria || 'Non Categorizzato'
    if (!byCategory[cat]) {
      byCategory[cat] = []
    }
    byCategory[cat].push(parseFloat(mov.importo))
  })

  const anomalies = []

  // Analizza ogni categoria
  Object.entries(byCategory).forEach(([categoria, importi]) => {
    if (importi.length < 2) return

    // Calcola media e deviazione standard
    const media = importi.reduce((a, b) => a + b, 0) / importi.length
    const variance = importi.reduce((sum, val) => sum + Math.pow(val - media, 2), 0) / importi.length
    const stdDev = Math.sqrt(variance)

    // Trova outliers (valori > media + 2*stdDev)
    const soglia = media + (2 * stdDev)

    // Raccogli tutti i movimenti della categoria per confronto
    const movimentiCategoria = uscite.filter(m => m.categoria === categoria)

    uscite.forEach(mov => {
      if (mov.categoria === categoria) {
        const importo = parseFloat(mov.importo)
        if (importo > soglia && stdDev > 0) {
          // Calcola la percentuale di deviazione
          const percentualeDeviazione = ((importo - media) / media * 100).toFixed(0)

          // Altri movimenti per confronto (escluso questo)
          const altriMovimenti = movimentiCategoria
            .filter(m => m.id !== mov.id)
            .sort((a, b) => parseFloat(b.importo) - parseFloat(a.importo))
            .slice(0, 10) // Massimo 10 per confronto

          anomalies.push({
            movimento: mov,
            tipo: 'outlier',
            motivo: `Importo anomalo: ${importo.toFixed(2)}€ vs media ${media.toFixed(2)}€ (+${percentualeDeviazione}%)`,
            gravita: importo > (media + 3 * stdDev) ? 'alta' : 'media',
            categoria,
            mediaCategoria: media,
            deviazioneStandard: stdDev,
            soglia,
            altriMovimenti,
            numeroMovimentiCategoria: movimentiCategoria.length
          })
        }
      }
    })
  })

  // Rileva categorie con crescita anomala
  const categorieByMonth = {}
  const movimentiByMonth = {}

  uscite.forEach(mov => {
    const mese = mov.data.substring(0, 7) // YYYY-MM
    const cat = mov.categoria

    // Raggruppa totali
    if (!categorieByMonth[cat]) categorieByMonth[cat] = {}
    if (!categorieByMonth[cat][mese]) categorieByMonth[cat][mese] = 0
    categorieByMonth[cat][mese] += parseFloat(mov.importo)

    // Raggruppa movimenti effettivi
    if (!movimentiByMonth[cat]) movimentiByMonth[cat] = {}
    if (!movimentiByMonth[cat][mese]) movimentiByMonth[cat][mese] = []
    movimentiByMonth[cat][mese].push(mov)
  })

  Object.entries(categorieByMonth).forEach(([categoria, mesi]) => {
    const mesiOrdinati = Object.keys(mesi).sort()
    const valoriMensili = mesiOrdinati.map(m => mesi[m])

    if (valoriMensili.length >= 2) {
      const ultimoMeseKey = mesiOrdinati[mesiOrdinati.length - 1]
      const ultimoMese = valoriMensili[valoriMensili.length - 1]
      const mediaPrecedenti = valoriMensili.slice(0, -1).reduce((a, b) => a + b, 0) / (valoriMensili.length - 1)

      // Se l'ultimo mese è > 150% della media precedente
      if (ultimoMese > mediaPrecedenti * 1.5 && mediaPrecedenti > 0) {
        // Formatta i nomi dei mesi per visualizzazione
        const ultimoMeseNome = format(parseISO(ultimoMeseKey + '-01'), 'MMMM yyyy', { locale: it })
        const mesiPrecedenti = mesiOrdinati.slice(0, -1).map(m =>
          format(parseISO(m + '-01'), 'MMM', { locale: it })
        ).join(', ')

        const movimentiDelMese = movimentiByMonth[categoria]?.[ultimoMeseKey] || []

        // Debug log per verificare i movimenti
        console.log(`[Analytics] Crescita anomala rilevata per ${categoria}:`, {
          ultimoMese: ultimoMeseKey,
          numMovimenti: movimentiDelMese.length,
          movimenti: movimentiDelMese.map(m => ({ desc: m.descrizione, importo: m.importo, data: m.data }))
        })

        anomalies.push({
          categoria,
          tipo: 'crescita_anomala',
          motivo: `${ultimoMeseNome}: +${((ultimoMese / mediaPrecedenti - 1) * 100).toFixed(0)}% rispetto alla media di ${mesiPrecedenti}`,
          gravita: ultimoMese > mediaPrecedenti * 2 ? 'alta' : 'media',
          valoreAttuale: ultimoMese,
          valoreAtteso: mediaPrecedenti,
          movimenti: movimentiDelMese,
          periodoAttuale: ultimoMeseNome,
          periodoConfronto: mesiPrecedenti
        })
      }
    }
  })

  return anomalies.sort((a, b) => {
    const gravidaOrder = { alta: 3, media: 2, bassa: 1 }
    return gravidaOrder[b.gravita] - gravidaOrder[a.gravita]
  })
  */
}

import { SOGLIE_DEFAULT } from './analytics-alerts'

/**
 * Categorie tecniche da escludere dai costi ottimizzabili
 * (sono movimenti contabili, non costi reali)
 */
const CATEGORIE_TECNICHE = new Set([
  'Giroconti',
  'POS',
  'Finanziamenti'
])

/**
 * Analizza produttività e identifica costi potenzialmente ottimizzabili
 * basandosi su SOGLIE PERCENTUALI configurabili (default BeautyX o personalizzate)
 *
 * @param {Array} movements - Movimenti bancari
 * @param {string} startDate - Data inizio periodo
 * @param {string} endDate - Data fine periodo
 * @param {Object} soglieUtente - Soglie personalizzate dall'utente (opzionale)
 */
export function analyzeProductivity(movements, startDate, endDate, soglieUtente = null) {
  const filtered = filterMovementsByPeriod(movements, startDate, endDate)
  const byCategory = groupByCategory(filtered)

  const categorie_entrata = byCategory.filter(c => c.entrate > 0)
  const categorie_uscita = byCategory.filter(c => c.uscite > 0)

  // Calcola totali per le percentuali
  const totaleEntrate = categorie_entrata.reduce((sum, c) => sum + c.entrate, 0)
  const totaleUscite = categorie_uscita.reduce((sum, c) => sum + c.uscite, 0)

  // Usa soglie: utente se presenti, altrimenti default BeautyX
  const soglie = soglieUtente ? {
    maxSuFatturato: { ...SOGLIE_DEFAULT.maxSuFatturato, ...soglieUtente.maxSuFatturato },
    maxSuCosti: { ...SOGLIE_DEFAULT.maxSuCosti, ...soglieUtente.maxSuCosti }
  } : SOGLIE_DEFAULT

  // Identifica costi ottimizzabili basandosi su SOGLIE PERCENTUALI
  const costiOttimizzabili = []

  categorie_uscita.forEach(cat => {
    // Salta SOLO categorie tecniche (giroconti, POS, finanziamenti)
    // TUTTE le altre categorie (incluse Tasse, Affitto, Dipendenti) possono essere ottimizzabili
    if (CATEGORIE_TECNICHE.has(cat.categoria)) return

    // Salta importi troppo piccoli (< 100€)
    if (cat.uscite < 100) return

    const percentualeSuFatturato = totaleEntrate > 0 ? (cat.uscite / totaleEntrate) * 100 : 0
    const percentualeSuCosti = totaleUscite > 0 ? (cat.uscite / totaleUscite) * 100 : 0

    const sogliaSuFatturato = soglie.maxSuFatturato[cat.categoria] || soglie.maxSuFatturato.default
    const sogliaSuCosti = soglie.maxSuCosti[cat.categoria] || soglie.maxSuCosti.default

    // Verifica se supera una delle soglie
    const superaSogliaFatturato = totaleEntrate > 0 && percentualeSuFatturato > sogliaSuFatturato
    const superaSogliaCosti = percentualeSuCosti > sogliaSuCosti

    if (superaSogliaFatturato || superaSogliaCosti) {
      // Determina quale soglia è stata superata di più
      const eccedenzaFatturato = superaSogliaFatturato ? percentualeSuFatturato - sogliaSuFatturato : 0
      const eccedenzaCosti = superaSogliaCosti ? percentualeSuCosti - sogliaSuCosti : 0

      let motivo = ''
      let gravita = 'media'

      if (eccedenzaFatturato >= eccedenzaCosti && superaSogliaFatturato) {
        motivo = `Incide per il ${percentualeSuFatturato.toFixed(1)}% sul fatturato (soglia: ${sogliaSuFatturato}%)`
        gravita = eccedenzaFatturato > 10 ? 'alta' : 'media'
      } else if (superaSogliaCosti) {
        motivo = `Rappresenta il ${percentualeSuCosti.toFixed(1)}% dei costi totali (soglia: ${sogliaSuCosti}%)`
        gravita = eccedenzaCosti > 10 ? 'alta' : 'media'
      }

      costiOttimizzabili.push({
        ...cat,
        percentualeSuFatturato,
        percentualeSuCosti,
        sogliaSuFatturato,
        sogliaSuCosti,
        eccedenzaFatturato,
        eccedenzaCosti,
        motivo,
        gravita,
        suggerimento: getSuggerimentoOttimizzazione(cat.categoria)
      })
    }
  })

  // Ordina per eccedenza maggiore
  costiOttimizzabili.sort((a, b) => {
    const eccA = Math.max(a.eccedenzaFatturato, a.eccedenzaCosti)
    const eccB = Math.max(b.eccedenzaFatturato, b.eccedenzaCosti)
    return eccB - eccA
  })

  // Top categorie entrata
  const topEntrate = [...categorie_entrata]
    .sort((a, b) => b.entrate - a.entrate)
    .slice(0, 5)

  // Top categorie uscita
  const topUscite = [...categorie_uscita]
    .sort((a, b) => b.uscite - a.uscite)
    .slice(0, 5)

  return {
    topEntrate,
    topUscite,
    costiOttimizzabili,
    totaleCostiOttimizzabili: costiOttimizzabili.reduce((sum, c) => sum + c.uscite, 0),
    totaleEntrate,
    totaleUscite
  }
}

/**
 * Genera suggerimenti personalizzati per l'ottimizzazione
 */
function getSuggerimentoOttimizzazione(categoria) {
  const suggerimenti = {
    'Tasse': 'Verifica detrazioni non sfruttate, consulta un fiscalista per ottimizzazione',
    'Dipendenti': 'Valuta ottimizzazione turni e rapporto costo/produttività',
    'Affitto': 'Se possibile rinegozia il contratto o valuta spazi alternativi',
    'Utenze': 'Considera audit energetico e cambio fornitore',
    'Assicurazioni': 'Confronta preventivi di diverse compagnie',
    'Fornitori': 'Rinegozia contratti, cerca alternative, valuta acquisti in volume',
    'Marketing': 'Analizza ROI campagne, focalizza su canali performanti',
    'Manutenzione': 'Valuta contratti di manutenzione programmata vs interventi spot',
    'Formazione': 'Verifica se la formazione sta generando ritorno in produttività',
    'Abbonamenti': 'Rivedi abbonamenti attivi, elimina quelli inutilizzati',
    'Trasporti': 'Ottimizza logistica, valuta fornitori locali',
    'Materiali': 'Cerca fornitori alternativi, negozia prezzi all\'ingrosso'
  }

  return suggerimenti[categoria] || 'Analizza i movimenti principali e cerca margini di riduzione'
}

/**
 * Calcola variazioni percentuali tra due periodi
 */
function calculatePercentageChanges(current, previous) {
  const calc = (curr, prev) => {
    if (prev === 0) return curr > 0 ? 100 : 0
    return ((curr - prev) / Math.abs(prev)) * 100
  }

  return {
    entrate: calc(current.entrate, previous.entrate),
    uscite: calc(current.uscite, previous.uscite),
    saldo: calc(current.saldo, previous.saldo),
    margineOperativo: calc(current.margineOperativo, previous.margineOperativo),
    entrataMediaGiornaliera: calc(current.entrataMediaGiornaliera, previous.entrataMediaGiornaliera),
    entrataMediaOraria: calc(current.entrataMediaOraria, previous.entrataMediaOraria),
    costoGiornalieroEsercizio: calc(current.costoGiornalieroEsercizio, previous.costoGiornalieroEsercizio),
    costoOrarioEsercizio: calc(current.costoOrarioEsercizio, previous.costoOrarioEsercizio)
  }
}

/**
 * Calcola KPI anno su anno (Year-over-Year)
 */
export function calculateYoYKPIs(movements, period, openingHours, closures) {
  const { startDate, endDate } = period

  // Anno corrente
  const currentKPIs = calculateKPIs(movements, startDate, endDate, openingHours, closures)

  // Calcola stessi periodi anni precedenti
  const lastYear = {
    start: subYears(parseISO(startDate), 1),
    end: subYears(parseISO(endDate), 1)
  }
  const twoYears = {
    start: subYears(parseISO(startDate), 2),
    end: subYears(parseISO(endDate), 2)
  }
  const threeYears = {
    start: subYears(parseISO(startDate), 3),
    end: subYears(parseISO(endDate), 3)
  }

  const kpisLastYear = calculateKPIs(movements, format(lastYear.start, 'yyyy-MM-dd'), format(lastYear.end, 'yyyy-MM-dd'), openingHours, closures)
  const kpisTwoYears = calculateKPIs(movements, format(twoYears.start, 'yyyy-MM-dd'), format(twoYears.end, 'yyyy-MM-dd'), openingHours, closures)
  const kpisThreeYears = calculateKPIs(movements, format(threeYears.start, 'yyyy-MM-dd'), format(threeYears.end, 'yyyy-MM-dd'), openingHours, closures)

  // Calcola variazioni percentuali
  const changes = calculatePercentageChanges(currentKPIs, kpisLastYear)

  return {
    current: currentKPIs,
    lastYear: kpisLastYear,
    twoYears: kpisTwoYears,
    threeYears: kpisThreeYears,
    changes,
    years: [
      { year: getYear(parseISO(startDate)), data: currentKPIs },
      { year: getYear(lastYear.start), data: kpisLastYear },
      { year: getYear(twoYears.start), data: kpisTwoYears },
      { year: getYear(threeYears.start), data: kpisThreeYears }
    ]
  }
}

/**
 * Ottiene dati trend con confronto anno su anno
 */
export function getYoYTrendData(movements, period, viewMode) {
  const { startDate, endDate } = period
  const groupFn = viewMode === 'day' ? groupByDay : viewMode === 'week' ? groupByWeek : groupByMonth

  // Dati anno corrente
  const currentData = groupFn(movements, startDate, endDate)

  // Calcola stessi periodi anni precedenti
  const lastYearStart = format(subYears(parseISO(startDate), 1), 'yyyy-MM-dd')
  const lastYearEnd = format(subYears(parseISO(endDate), 1), 'yyyy-MM-dd')
  const lastYearData = groupFn(movements, lastYearStart, lastYearEnd)

  const twoYearsStart = format(subYears(parseISO(startDate), 2), 'yyyy-MM-dd')
  const twoYearsEnd = format(subYears(parseISO(endDate), 2), 'yyyy-MM-dd')
  const twoYearsData = groupFn(movements, twoYearsStart, twoYearsEnd)

  const threeYearsStart = format(subYears(parseISO(startDate), 3), 'yyyy-MM-dd')
  const threeYearsEnd = format(subYears(parseISO(endDate), 3), 'yyyy-MM-dd')
  const threeYearsData = groupFn(movements, threeYearsStart, threeYearsEnd)

  // Merge data per indice (giorno/settimana/mese corrispondente)
  return currentData.map((item, idx) => ({
    data: item.data,
    entrate: item.entrate,
    uscite: item.uscite,
    saldo: item.saldo,
    entrate_y1: lastYearData[idx]?.entrate || 0,
    uscite_y1: lastYearData[idx]?.uscite || 0,
    saldo_y1: lastYearData[idx]?.saldo || 0,
    entrate_y2: twoYearsData[idx]?.entrate || 0,
    uscite_y2: twoYearsData[idx]?.uscite || 0,
    saldo_y2: twoYearsData[idx]?.saldo || 0,
    entrate_y3: threeYearsData[idx]?.entrate || 0,
    uscite_y3: threeYearsData[idx]?.uscite || 0,
    saldo_y3: threeYearsData[idx]?.saldo || 0
  }))
}

/**
 * Raggruppa categorie per periodo temporale (giorno/settimana/mese)
 * Ritorna un array di oggetti per visualizzazione multi-linea
 */
export function groupCategoriesByTime(movements, startDate, endDate, viewMode) {
  // Prima raggruppa per categoria per trovare tutte le categorie
  const byCategory = groupByCategory(filterMovementsByPeriod(movements, startDate, endDate))
  const topCategories = byCategory.map(c => c.categoria) // Tutte le categorie

  // Poi crea i periodi temporali
  let periods = []
  if (viewMode === 'day') {
    periods = eachDayOfInterval({ start: parseISO(startDate), end: parseISO(endDate) })
  } else if (viewMode === 'week') {
    periods = eachWeekOfInterval({ start: parseISO(startDate), end: parseISO(endDate) }, { weekStartsOn: 1 })
  } else {
    periods = eachMonthOfInterval({ start: parseISO(startDate), end: parseISO(endDate) })
  }

  // Per ogni periodo, calcola i totali per categoria
  return periods.map(periodStart => {
    let periodEnd
    if (viewMode === 'day') {
      periodEnd = periodStart
    } else if (viewMode === 'week') {
      periodEnd = endOfWeek(periodStart, { weekStartsOn: 1 })
    } else {
      periodEnd = endOfMonth(periodStart)
    }

    const periodMovements = movements.filter(mov => {
      const movDate = parseISO(mov.data)
      return isWithinInterval(movDate, { start: periodStart, end: periodEnd })
    })

    const result = {
      data: viewMode === 'day'
        ? format(periodStart, 'dd MMM', { locale: it })
        : viewMode === 'week'
        ? format(periodStart, 'dd MMM', { locale: it })
        : format(periodStart, 'MMM yyyy', { locale: it }),
      dataCompleta: format(periodStart, 'yyyy-MM-dd')
    }

    // Calcola totale per ogni top categoria
    topCategories.forEach(cat => {
      const catMovements = periodMovements.filter(m => (m.categoria || 'Non Categorizzato') === cat)
      const total = catMovements.reduce((sum, m) => {
        const importo = parseFloat(m.importo)
        return sum + Math.abs(importo) // Usa valore assoluto per sommare entrate e uscite
      }, 0)
      result[cat] = total
    })

    return result
  })
}

/**
 * Confronta categorie anno su anno
 */
export function getYoYCategoryComparison(movements, period) {
  const { startDate, endDate } = period

  // Raggruppa per anno
  const currentCategories = groupByCategory(filterMovementsByPeriod(movements, startDate, endDate))

  const lastYearStart = format(subYears(parseISO(startDate), 1), 'yyyy-MM-dd')
  const lastYearEnd = format(subYears(parseISO(endDate), 1), 'yyyy-MM-dd')
  const lastYearCategories = groupByCategory(filterMovementsByPeriod(movements, lastYearStart, lastYearEnd))

  const twoYearsStart = format(subYears(parseISO(startDate), 2), 'yyyy-MM-dd')
  const twoYearsEnd = format(subYears(parseISO(endDate), 2), 'yyyy-MM-dd')
  const twoYearsCategories = groupByCategory(filterMovementsByPeriod(movements, twoYearsStart, twoYearsEnd))

  // Merge per categoria
  const allCategories = new Set([
    ...currentCategories.map(c => c.categoria),
    ...lastYearCategories.map(c => c.categoria),
    ...twoYearsCategories.map(c => c.categoria)
  ])

  return Array.from(allCategories).map(cat => {
    const current = currentCategories.find(c => c.categoria === cat) || { entrate: 0, uscite: 0, count: 0 }
    const lastYear = lastYearCategories.find(c => c.categoria === cat) || { entrate: 0, uscite: 0, count: 0 }
    const twoYears = twoYearsCategories.find(c => c.categoria === cat) || { entrate: 0, uscite: 0, count: 0 }

    const changeEntrate = lastYear.entrate > 0 ? ((current.entrate - lastYear.entrate) / lastYear.entrate) * 100 : 0
    const changeUscite = lastYear.uscite > 0 ? ((current.uscite - lastYear.uscite) / lastYear.uscite) * 100 : 0

    return {
      categoria: cat,
      current,
      lastYear,
      twoYears,
      changes: {
        entrate: changeEntrate,
        uscite: changeUscite
      }
    }
  }).sort((a, b) => (b.current.entrate + b.current.uscite) - (a.current.entrate + a.current.uscite))
}
