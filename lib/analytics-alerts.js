/**
 * Sistema di Alert Finanziari Intelligenti
 *
 * Analizza movimenti per identificare anomalie finanziarie.
 * OGNI CATEGORIA genera AL MASSIMO UN ALERT (quello più grave).
 */

import { filterOperationalMovements } from './movement-classifier'

/**
 * Soglie di alert di default (BeautyX)
 * Queste possono essere sovrascritte dalle soglie personalizzate dell'utente
 */
export const SOGLIE_DEFAULT = {
  // % massima accettabile sul totale costi
  maxSuCosti: {
    'Tasse': 15,
    'Dipendenti': 40,
    'Fornitori': 30,
    'Affitto': 20,
    'Utenze': 10,
    'Marketing': 15,
    'Manutenzione': 8,
    'Assicurazioni': 5,
    'Formazione': 5,
    'default': 20
  },

  // % massima accettabile sul fatturato
  maxSuFatturato: {
    'Tasse': 20,
    'Dipendenti': 45,
    'Fornitori': 35,
    'Affitto': 15,
    'Utenze': 8,
    'Marketing': 12,
    'default': 25
  },

  // Margine netto minimo accettabile (%)
  minMargine: 20,

  // Crescita mensile massima costi (%)
  maxCrescitaMensile: 20,

  // ============================================
  // PARAMETRI ANOMALIE
  // ============================================

  // % massima singolo movimento sul totale categoria (concentrazione)
  maxConcentrazioneMovimento: {
    'Tasse': 50,      // Le tasse possono avere movimenti grossi (F24 trimestrali)
    'Dipendenti': 25, // Stipendi dovrebbero essere distribuiti
    'Fornitori': 35,  // Attenzione a ordini troppo concentrati
    'Affitto': 100,   // Affitto è tipicamente 1 movimento/mese
    'Utenze': 40,     // Bollette possono variare
    'Marketing': 40,
    'Manutenzione': 50,
    'Assicurazioni': 80, // Polizze annuali sono normali
    'Formazione': 60,
    'default': 35
  },

  // Deviazione standard: quante DS sopra la media è anomalo
  deviazioneStandardMax: 2.5,

  // Frequenza: variazione % rispetto alla media storica
  frequenzaAnomaliaMin: -50, // -50% = troppo pochi movimenti
  frequenzaAnomaliaMax: 100, // +100% = troppi movimenti

  // Trend persistente: quanti mesi consecutivi di crescita
  mesiTrendPersistente: 3,
  crescitaMinTrend: 10, // % minima per considerare crescita

  // Confronto YoY: variazione % massima vs anno precedente
  maxVariazioneYoY: {
    'Tasse': 30,
    'Dipendenti': 25,
    'Fornitori': 40,
    'Affitto': 10,
    'Utenze': 30,
    'Marketing': 50,
    'default': 35
  },

  // Stagionalità: deviazione % dal pattern stagionale atteso
  maxDeviazioneStagonale: 40,

  // Timing: giorni di tolleranza per pagamenti ricorrenti
  timingTolleranzaGiorni: 7,

  // ============================================
  // PARAMETRI COSTI OTTIMIZZABILI
  // ============================================

  // Concentrazione fornitore: % massima su singolo vendor
  maxConcentrazioneFornitore: 70,

  // Soglie assolute: importi oltre cui segnalare (€)
  soglieAssolute: {
    'movimento_singolo': 5000,  // Qualsiasi movimento > 5k€
    'categoria_mensile': 10000, // Categoria > 10k€/mese
    'default': 3000
  },

  // Rapporto costo/ricavo: se costi stabili ma ricavi calano > X%
  maxCaloCostoRicavo: 15
}

/**
 * Genera alert intelligenti basati su analisi finanziaria
 * @param {Array} movements - Movimenti bancari
 * @param {Object} period - Periodo di analisi
 * @param {Object} soglieUtente - Soglie personalizzate dall'utente (opzionale)
 */
export function generateIntelligentAlerts(movements, period, soglieUtente = null) {
  // Usa solo movimenti operativi
  const operational = filterOperationalMovements(movements)

  // Calcola KPI base
  const totalRevenue = operational
    .filter(m => m.tipo === 'entrata')
    .reduce((s, m) => s + parseFloat(m.importo), 0)

  const totalCosts = operational
    .filter(m => m.tipo === 'uscita')
    .reduce((s, m) => s + Math.abs(parseFloat(m.importo)), 0)

  const netMargin = totalRevenue - totalCosts
  const marginPercent = totalRevenue > 0 ? (netMargin / totalRevenue) * 100 : 0

  // Raggruppa per categoria
  const byCategory = groupByCategory(operational)

  // Merge soglie: utente sovrascrive default
  const soglie = mergeSoglie(SOGLIE_DEFAULT, soglieUtente)

  // Analizza ogni categoria e genera AL MASSIMO UN alert per categoria
  const alertsPerCategoria = {}

  // Analizza tutte le categorie di uscita
  Object.entries(byCategory.uscite || {}).forEach(([categoria, data]) => {
    const analisi = analizzaCategoria(categoria, data, totalCosts, totalRevenue, soglie, movements)

    if (analisi) {
      // Se c'è già un alert per questa categoria, tieni quello più grave
      if (!alertsPerCategoria[categoria] ||
          getGravityScore(analisi.gravita) > getGravityScore(alertsPerCategoria[categoria].gravita)) {
        alertsPerCategoria[categoria] = analisi
      }
    }
  })

  // Converti in array
  const alerts = Object.values(alertsPerCategoria)

  // Aggiungi alert margine basso (questo è generale, non per categoria)
  const margineAlert = checkMargineAlert(marginPercent, netMargin, totalRevenue, totalCosts, byCategory, soglie)
  if (margineAlert) {
    alerts.push(margineAlert)
  }

  // Ordina per gravità
  return alerts.sort((a, b) => getGravityScore(b.gravita) - getGravityScore(a.gravita))
}

/**
 * Analizza una singola categoria e restituisce l'alert più rilevante
 */
function analizzaCategoria(categoria, data, totalCosts, totalRevenue, soglie, allMovements) {
  const problemi = []

  // 1. Controlla incidenza sui costi totali
  if (totalCosts > 0) {
    const incidenzaCosti = (data.totale / totalCosts) * 100
    const sogliaCosti = soglie.maxSuCosti[categoria] || soglie.maxSuCosti.default

    if (incidenzaCosti > sogliaCosti) {
      const eccedenza = incidenzaCosti - sogliaCosti
      problemi.push({
        tipo: 'incidenza_costi',
        gravita: eccedenza > 10 ? 'alta' : 'media',
        percentuale: incidenzaCosti,
        soglia: sogliaCosti,
        eccedenza,
        descrizione: `Incide per il ${incidenzaCosti.toFixed(1)}% sui costi totali (soglia: ${sogliaCosti}%)`
      })
    }
  }

  // 2. Controlla impatto sul fatturato
  if (totalRevenue > 0) {
    const impattoFatturato = (data.totale / totalRevenue) * 100
    const sogliaFatturato = soglie.maxSuFatturato[categoria] || soglie.maxSuFatturato.default

    if (impattoFatturato > sogliaFatturato) {
      const eccedenza = impattoFatturato - sogliaFatturato
      problemi.push({
        tipo: 'impatto_fatturato',
        gravita: eccedenza > 15 ? 'alta' : 'media',
        percentuale: impattoFatturato,
        soglia: sogliaFatturato,
        eccedenza,
        descrizione: `Assorbe il ${impattoFatturato.toFixed(1)}% del fatturato (soglia: ${sogliaFatturato}%)`
      })
    }
  }

  // 3. Controlla trend di crescita mensile
  const trendAnalisi = analizzaTrend(categoria, allMovements, soglie.maxCrescitaMensile)
  if (trendAnalisi) {
    problemi.push(trendAnalisi)
  }

  // 4. Controlla concentrazione singolo movimento
  const concentrazioneAnalisi = analizzaConcentrazioneMovimento(categoria, data, soglie)
  if (concentrazioneAnalisi) {
    problemi.push(concentrazioneAnalisi)
  }

  // 5. Controlla deviazione standard (outlier)
  const devStdAnalisi = analizzaDeviazioneStandard(categoria, data, soglie)
  if (devStdAnalisi) {
    problemi.push(devStdAnalisi)
  }

  // 6. Controlla frequenza anomala
  const frequenzaAnalisi = analizzaFrequenza(categoria, data, allMovements, soglie)
  if (frequenzaAnalisi) {
    problemi.push(frequenzaAnalisi)
  }

  // 7. Controlla trend persistente (crescita per N mesi consecutivi)
  const trendPersistenteAnalisi = analizzaTrendPersistente(categoria, allMovements, soglie)
  if (trendPersistenteAnalisi) {
    problemi.push(trendPersistenteAnalisi)
  }

  // Se non ci sono problemi, nessun alert
  if (problemi.length === 0) return null

  // Seleziona il problema più grave
  problemi.sort((a, b) => getGravityScore(b.gravita) - getGravityScore(a.gravita))
  const problemaPrincipale = problemi[0]

  // Costruisci l'alert unificato
  return {
    tipo: problemaPrincipale.tipo,
    gravita: problemaPrincipale.gravita,
    categoria,
    titolo: getTitolo(problemaPrincipale.tipo, categoria),
    descrizione: problemaPrincipale.descrizione,
    motivo: problemaPrincipale.descrizione,
    importo: data.totale,
    percentuale: problemaPrincipale.percentuale,
    soglia: problemaPrincipale.soglia,
    eccedenza: problemaPrincipale.eccedenza,
    suggerimento: getSuggerimento(categoria, problemaPrincipale),
    azione: getAzione(categoria, problemaPrincipale, data.totale),
    // Movimenti di dettaglio
    movimenti: data.movements || [],
    numeroMovimenti: data.count || 0,
    mediaMovimento: data.count > 0 ? data.totale / data.count : 0,
    // Altri problemi rilevati (per info)
    altriProblemi: problemi.slice(1).map(p => p.descrizione)
  }
}

/**
 * Analizza il trend di crescita per una categoria
 */
function analizzaTrend(categoria, movements, sogliaMax) {
  const uscite = movements.filter(m => m.tipo === 'uscita' && m.categoria === categoria)

  // Raggruppa per mese
  const byMonth = {}
  uscite.forEach(m => {
    const month = m.data.substring(0, 7)
    if (!byMonth[month]) byMonth[month] = 0
    byMonth[month] += Math.abs(parseFloat(m.importo))
  })

  const months = Object.keys(byMonth).sort()
  if (months.length < 2) return null

  const lastMonth = months[months.length - 1]
  const prevMonth = months[months.length - 2]
  const currentCost = byMonth[lastMonth]
  const previousCost = byMonth[prevMonth]

  if (previousCost <= 0) return null

  const growth = ((currentCost - previousCost) / previousCost) * 100

  if (growth > sogliaMax) {
    return {
      tipo: 'trend_crescita',
      gravita: growth > 50 ? 'alta' : 'media',
      percentuale: growth,
      soglia: sogliaMax,
      eccedenza: growth - sogliaMax,
      descrizione: `Cresciuto del ${growth.toFixed(1)}% rispetto al mese precedente (soglia: ${sogliaMax}%)`
    }
  }

  return null
}

/**
 * Analizza concentrazione singolo movimento
 * Rileva quando un singolo movimento rappresenta una % troppo alta del totale categoria
 */
function analizzaConcentrazioneMovimento(categoria, data, soglie) {
  if (!data.movements || data.movements.length < 2) return null
  if (data.totale <= 0) return null

  const sogliaConcentrazione = soglie.maxConcentrazioneMovimento?.[categoria]
    || soglie.maxConcentrazioneMovimento?.default
    || 35

  // Trova il movimento più grande
  let maxMovimento = null
  let maxImporto = 0

  data.movements.forEach(m => {
    const importo = Math.abs(parseFloat(m.importo))
    if (importo > maxImporto) {
      maxImporto = importo
      maxMovimento = m
    }
  })

  if (!maxMovimento) return null

  const percentualeConcentrazione = (maxImporto / data.totale) * 100

  if (percentualeConcentrazione > sogliaConcentrazione) {
    const eccedenza = percentualeConcentrazione - sogliaConcentrazione
    return {
      tipo: 'concentrazione_movimento',
      gravita: eccedenza > 20 ? 'alta' : 'media',
      percentuale: percentualeConcentrazione,
      soglia: sogliaConcentrazione,
      eccedenza,
      movimentoAnomalo: maxMovimento,
      importoMovimento: maxImporto,
      descrizione: `Un singolo movimento (€${maxImporto.toFixed(2)}) rappresenta il ${percentualeConcentrazione.toFixed(1)}% del totale categoria (soglia: ${sogliaConcentrazione}%)`
    }
  }

  return null
}

/**
 * Analizza deviazione standard
 * Rileva movimenti outlier rispetto alla media della categoria
 */
function analizzaDeviazioneStandard(categoria, data, soglie) {
  if (!data.movements || data.movements.length < 3) return null

  const importi = data.movements.map(m => Math.abs(parseFloat(m.importo)))
  const media = importi.reduce((a, b) => a + b, 0) / importi.length

  // Calcola deviazione standard
  const squaredDiffs = importi.map(x => Math.pow(x - media, 2))
  const avgSquaredDiff = squaredDiffs.reduce((a, b) => a + b, 0) / squaredDiffs.length
  const devStd = Math.sqrt(avgSquaredDiff)

  if (devStd === 0) return null

  const sogliaDS = soglie.deviazioneStandardMax || 2.5

  // Trova movimenti outlier
  const outliers = data.movements.filter(m => {
    const importo = Math.abs(parseFloat(m.importo))
    const zScore = (importo - media) / devStd
    return zScore > sogliaDS
  })

  if (outliers.length === 0) return null

  const maxOutlier = outliers.reduce((max, m) => {
    const importo = Math.abs(parseFloat(m.importo))
    return importo > Math.abs(parseFloat(max.importo)) ? m : max
  }, outliers[0])

  const importoOutlier = Math.abs(parseFloat(maxOutlier.importo))
  const zScore = (importoOutlier - media) / devStd

  return {
    tipo: 'outlier_statistico',
    gravita: zScore > 4 ? 'alta' : 'media',
    percentuale: zScore,
    soglia: sogliaDS,
    eccedenza: zScore - sogliaDS,
    movimentoAnomalo: maxOutlier,
    importoMovimento: importoOutlier,
    media: media,
    deviazioneStandard: devStd,
    numOutliers: outliers.length,
    descrizione: `Movimento di €${importoOutlier.toFixed(2)} è ${zScore.toFixed(1)} deviazioni standard sopra la media (€${media.toFixed(2)})`
  }
}

/**
 * Analizza frequenza anomala
 * Rileva quando il numero di movimenti è anomalo rispetto allo storico
 */
function analizzaFrequenza(categoria, data, allMovements, soglie) {
  // Raggruppa tutti i movimenti della categoria per mese
  const movimentiCategoria = allMovements.filter(
    m => m.tipo === 'uscita' && m.categoria === categoria
  )

  const byMonth = {}
  movimentiCategoria.forEach(m => {
    const month = m.data.substring(0, 7)
    if (!byMonth[month]) byMonth[month] = 0
    byMonth[month]++
  })

  const months = Object.keys(byMonth).sort()
  if (months.length < 3) return null

  // Calcola media movimenti per mese (escluso ultimo mese)
  const monthsForAvg = months.slice(0, -1)
  const avgMovimenti = monthsForAvg.reduce((sum, m) => sum + byMonth[m], 0) / monthsForAvg.length

  if (avgMovimenti === 0) return null

  const lastMonth = months[months.length - 1]
  const movimentiUltimoMese = byMonth[lastMonth]

  const variazione = ((movimentiUltimoMese - avgMovimenti) / avgMovimenti) * 100
  const sogliaMin = soglie.frequenzaAnomaliaMin || -50
  const sogliaMax = soglie.frequenzaAnomaliaMax || 100

  if (variazione < sogliaMin) {
    return {
      tipo: 'frequenza_bassa',
      gravita: variazione < -70 ? 'alta' : 'media',
      percentuale: variazione,
      soglia: sogliaMin,
      eccedenza: Math.abs(variazione - sogliaMin),
      movimentiMese: movimentiUltimoMese,
      mediaStorica: avgMovimenti,
      descrizione: `Solo ${movimentiUltimoMese} movimenti questo mese vs media di ${avgMovimenti.toFixed(1)} (${variazione.toFixed(1)}%)`
    }
  }

  if (variazione > sogliaMax) {
    return {
      tipo: 'frequenza_alta',
      gravita: variazione > 150 ? 'alta' : 'media',
      percentuale: variazione,
      soglia: sogliaMax,
      eccedenza: variazione - sogliaMax,
      movimentiMese: movimentiUltimoMese,
      mediaStorica: avgMovimenti,
      descrizione: `${movimentiUltimoMese} movimenti questo mese vs media di ${avgMovimenti.toFixed(1)} (+${variazione.toFixed(1)}%)`
    }
  }

  return null
}

/**
 * Analizza trend persistente
 * Rileva crescita costante per N mesi consecutivi
 */
function analizzaTrendPersistente(categoria, allMovements, soglie) {
  const uscite = allMovements.filter(m => m.tipo === 'uscita' && m.categoria === categoria)

  // Raggruppa per mese
  const byMonth = {}
  uscite.forEach(m => {
    const month = m.data.substring(0, 7)
    if (!byMonth[month]) byMonth[month] = 0
    byMonth[month] += Math.abs(parseFloat(m.importo))
  })

  const months = Object.keys(byMonth).sort()
  const mesiRichiesti = soglie.mesiTrendPersistente || 3
  const crescitaMin = soglie.crescitaMinTrend || 10

  if (months.length < mesiRichiesti + 1) return null

  // Controlla gli ultimi N mesi
  let mesiCrescitaConsecutivi = 0
  let crescitaTotale = 0

  for (let i = months.length - 1; i > 0; i--) {
    const currentMonth = months[i]
    const prevMonth = months[i - 1]
    const currentCost = byMonth[currentMonth]
    const prevCost = byMonth[prevMonth]

    if (prevCost <= 0) break

    const crescitaMese = ((currentCost - prevCost) / prevCost) * 100

    if (crescitaMese >= crescitaMin) {
      mesiCrescitaConsecutivi++
      crescitaTotale += crescitaMese
    } else {
      break
    }

    if (mesiCrescitaConsecutivi >= mesiRichiesti) {
      const crescitaMedia = crescitaTotale / mesiCrescitaConsecutivi
      return {
        tipo: 'trend_persistente',
        gravita: crescitaMedia > 20 ? 'alta' : 'media',
        percentuale: crescitaMedia,
        soglia: crescitaMin,
        eccedenza: crescitaMedia - crescitaMin,
        mesiConsecutivi: mesiCrescitaConsecutivi,
        crescitaTotale,
        descrizione: `Crescita costante da ${mesiCrescitaConsecutivi} mesi consecutivi (media +${crescitaMedia.toFixed(1)}%/mese)`
      }
    }
  }

  return null
}

/**
 * Controlla il margine netto
 */
function checkMargineAlert(marginPercent, netMargin, totalRevenue, totalCosts, byCategory, soglie) {
  if (totalRevenue <= 0) return null
  if (marginPercent >= soglie.minMargine) return null

  const topCosti = Object.entries(byCategory.uscite || {})
    .map(([cat, data]) => ({ categoria: cat, ...data }))
    .sort((a, b) => b.totale - a.totale)
    .slice(0, 5)

  return {
    tipo: 'margine_basso',
    gravita: marginPercent < 10 ? 'alta' : 'media',
    categoria: 'GENERALE',
    titolo: '⚠️ Margine Netto Insufficiente',
    descrizione: `Il margine netto è solo del ${marginPercent.toFixed(1)}% (minimo: ${soglie.minMargine}%)`,
    motivo: `Il margine netto è solo del ${marginPercent.toFixed(1)}% (minimo: ${soglie.minMargine}%)`,
    importo: netMargin,
    percentuale: marginPercent,
    soglia: soglie.minMargine,
    suggerimento: marginPercent < 10
      ? 'URGENTE: Il margine è critico. Rivedi i costi principali e valuta aumenti di prezzo.'
      : 'Analizza le categorie con incidenza alta e cerca opportunità di ottimizzazione.',
    totaleEntrate: totalRevenue,
    totaleCosti: totalCosts,
    topCostiCategorie: topCosti
  }
}

/**
 * Helper: raggruppa movimenti per categoria
 */
function groupByCategory(movements) {
  const result = { entrate: {}, uscite: {} }

  movements.forEach(m => {
    const categoria = m.categoria || 'Non categorizzato'
    const tipo = m.tipo === 'entrata' ? 'entrate' : 'uscite'

    if (!result[tipo][categoria]) {
      result[tipo][categoria] = {
        totale: 0,
        count: 0,
        movements: []
      }
    }

    result[tipo][categoria].totale += Math.abs(parseFloat(m.importo))
    result[tipo][categoria].count++
    result[tipo][categoria].movements.push(m)
  })

  return result
}

/**
 * Merge soglie utente con default
 */
function mergeSoglie(defaultSoglie, userSoglie) {
  if (!userSoglie) return defaultSoglie

  return {
    // Soglie esistenti
    maxSuCosti: { ...defaultSoglie.maxSuCosti, ...userSoglie.maxSuCosti },
    maxSuFatturato: { ...defaultSoglie.maxSuFatturato, ...userSoglie.maxSuFatturato },
    minMargine: userSoglie.minMargine ?? defaultSoglie.minMargine,
    maxCrescitaMensile: userSoglie.maxCrescitaMensile ?? defaultSoglie.maxCrescitaMensile,

    // Nuovi parametri ANOMALIE
    maxConcentrazioneMovimento: {
      ...defaultSoglie.maxConcentrazioneMovimento,
      ...userSoglie.maxConcentrazioneMovimento
    },
    deviazioneStandardMax: userSoglie.deviazioneStandardMax ?? defaultSoglie.deviazioneStandardMax,
    frequenzaAnomaliaMin: userSoglie.frequenzaAnomaliaMin ?? defaultSoglie.frequenzaAnomaliaMin,
    frequenzaAnomaliaMax: userSoglie.frequenzaAnomaliaMax ?? defaultSoglie.frequenzaAnomaliaMax,
    mesiTrendPersistente: userSoglie.mesiTrendPersistente ?? defaultSoglie.mesiTrendPersistente,
    crescitaMinTrend: userSoglie.crescitaMinTrend ?? defaultSoglie.crescitaMinTrend,
    maxVariazioneYoY: { ...defaultSoglie.maxVariazioneYoY, ...userSoglie.maxVariazioneYoY },
    maxDeviazioneStagonale: userSoglie.maxDeviazioneStagonale ?? defaultSoglie.maxDeviazioneStagonale,
    timingTolleranzaGiorni: userSoglie.timingTolleranzaGiorni ?? defaultSoglie.timingTolleranzaGiorni,

    // Nuovi parametri COSTI OTTIMIZZABILI
    maxConcentrazioneFornitore: userSoglie.maxConcentrazioneFornitore ?? defaultSoglie.maxConcentrazioneFornitore,
    soglieAssolute: { ...defaultSoglie.soglieAssolute, ...userSoglie.soglieAssolute },
    maxCaloCostoRicavo: userSoglie.maxCaloCostoRicavo ?? defaultSoglie.maxCaloCostoRicavo
  }
}

/**
 * Score per ordinare per gravità
 */
function getGravityScore(gravita) {
  return { alta: 3, media: 2, bassa: 1 }[gravita] || 0
}

/**
 * Genera titolo per tipo di alert
 */
function getTitolo(tipo, categoria) {
  const titoli = {
    'incidenza_costi': `📊 ${categoria}: Incidenza Alta sui Costi`,
    'impatto_fatturato': `💰 ${categoria}: Impatto Alto sul Fatturato`,
    'trend_crescita': `📈 ${categoria}: Crescita Anomala`,
    // Nuovi tipi
    'concentrazione_movimento': `🎯 ${categoria}: Movimento Concentrato`,
    'outlier_statistico': `📉 ${categoria}: Outlier Statistico`,
    'frequenza_bassa': `📉 ${categoria}: Frequenza Movimenti Bassa`,
    'frequenza_alta': `📈 ${categoria}: Frequenza Movimenti Alta`,
    'trend_persistente': `⚡ ${categoria}: Trend Crescita Persistente`,
    'variazione_yoy': `📅 ${categoria}: Variazione Anno su Anno`,
    'stagionalita_anomala': `🌡️ ${categoria}: Stagionalità Anomala`,
    'timing_anomalo': `⏰ ${categoria}: Timing Pagamento Anomalo`,
    // Costi ottimizzabili
    'concentrazione_fornitore': `🏪 ${categoria}: Concentrazione Fornitore`,
    'soglia_assoluta': `💵 ${categoria}: Importo Significativo`,
    'rapporto_costo_ricavo': `📊 ${categoria}: Rapporto Costo/Ricavo Anomalo`
  }
  return titoli[tipo] || `⚠️ ${categoria}: Anomalia Rilevata`
}

/**
 * Genera suggerimento personalizzato
 */
function getSuggerimento(categoria, problema) {
  const suggerimentiBase = {
    'Tasse': 'Verifica detrazioni non sfruttate e consulta un fiscalista per ottimizzazione.',
    'Dipendenti': 'Valuta ottimizzazione turni e rapporto costo/produttività per dipendente.',
    'Fornitori': 'Rinegozia contratti, cerca alternative e valuta acquisti in volume.',
    'Affitto': 'Se possibile rinegozia il contratto o valuta spazi alternativi.',
    'Utenze': 'Considera audit energetico e cambio fornitore.',
    'Marketing': 'Analizza ROI delle campagne e focalizza sui canali performanti.',
    'Manutenzione': 'Valuta contratti di manutenzione programmata.',
    'Assicurazioni': 'Confronta preventivi di diverse compagnie.'
  }

  return suggerimentiBase[categoria] ||
    `Analizza i movimenti di ${categoria} per identificare opportunità di risparmio.`
}

/**
 * Genera azione consigliata
 */
function getAzione(categoria, problema, importo) {
  if (problema.eccedenza && problema.eccedenza > 0) {
    const risparmioTarget = (importo * (problema.eccedenza / problema.percentuale)).toFixed(0)
    return `Obiettivo: ridurre di circa ${risparmioTarget}€ per rientrare nella soglia`
  }
  return `Monitora ${categoria} e cerca margini di ottimizzazione`
}
