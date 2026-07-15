/**
 * BEAUTYX DATA HUB
 * ================
 * Centro dati centralizzato per Beautyx AI.
 *
 * REGOLA FONDAMENTALE:
 * Ogni volta che aggiungi una nuova funzionalità, tabella o calcolo al sistema,
 * DEVI aggiungerlo anche qui affinché Beautyx possa usarlo per le consulenze.
 *
 * Il sistema è costruito INTORNO a Beautyx - lei è il cuore intelligente
 * e deve avere accesso COMPLETO a tutti i dati per fare consulenze efficaci.
 */

import { createClient } from '@supabase/supabase-js'
import { format, subDays, parseISO, eachDayOfInterval, isWithinInterval, getYear, startOfMonth, endOfMonth, subMonths } from 'date-fns'
import { filterOperationalMovements, getMovementStats } from '@/lib/movement-classifier'

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
const supabaseServiceKey = process.env.SUPABASE_SERVICE_KEY

/**
 * Recupera TUTTI i dati del business per Beautyx
 * Questa funzione è il punto di accesso principale per tutte le informazioni
 */
export async function getCompleteBusinessData(centroId) {
  if (!centroId) return { error: 'centro_id richiesto' }

  const supabase = createClient(supabaseUrl, supabaseServiceKey)
  const today = new Date()
  const currentYear = getYear(today)

  console.log('[BEAUTYX DATA HUB] 🚀 Caricamento dati completi per centro:', centroId)

  try {
    // ============================================
    // 1. MOVIMENTI BANCARI (con paginazione)
    // ============================================
    const movements = await fetchAllMovements(supabase, centroId)
    const operationalMovements = filterOperationalMovements(movements)
    const movementStats = getMovementStats(movements)
    console.log(`[DATA HUB] 📊 Movimenti: ${movements.length} totali, ${operationalMovements.length} operativi`)

    // ============================================
    // 2. CONFIGURAZIONE CENTRO
    // ============================================
    const [openingHours, closures, customCategories] = await Promise.all([
      fetchOpeningHours(supabase, centroId),
      fetchClosures(supabase, centroId),
      fetchCustomCategories(supabase, centroId)
    ])
    console.log(`[DATA HUB] ⚙️ Config: ${openingHours.length} giorni apertura, ${closures.length} chiusure`)

    // ============================================
    // 3. DIPENDENTI E HR
    // ============================================
    const employees = await fetchEmployeesData(supabase, centroId)
    console.log(`[DATA HUB] 👥 Dipendenti: ${employees.list.length}`)

    // ============================================
    // 4. ACCANTONAMENTI E FONDI
    // ============================================
    const accantonamenti = await fetchAccantonamenti(supabase, centroId)
    console.log(`[DATA HUB] 💰 Accantonamenti: ${accantonamenti.fondi.length} fondi attivi`)

    // ============================================
    // 5. BUDGET E PIANIFICAZIONE
    // ============================================
    const budget = await fetchBudget(supabase, centroId, currentYear)
    console.log(`[DATA HUB] 📋 Budget: ${budget ? 'presente' : 'non configurato'}`)

    // ============================================
    // 6. OBIETTIVI E PROGRESSI
    // ============================================
    const obiettivi = await fetchObiettivi(supabase, centroId)
    console.log(`[DATA HUB] 🎯 Obiettivi: ${obiettivi.attivi.length} attivi`)

    // ============================================
    // 7. SOGLIE ALERT
    // ============================================
    const soglieAlert = await fetchSoglieAlert(supabase, centroId)
    console.log(`[DATA HUB] ⚠️ Soglie alert: ${soglieAlert.length} configurate`)

    // ============================================
    // 8. OTTIMIZZAZIONI
    // ============================================
    const optimizations = await fetchOptimizations(supabase, centroId)
    console.log(`[DATA HUB] 🔧 Ottimizzazioni: ${optimizations.plans.length} piani`)

    // ============================================
    // 9. RICAVI GIORNALIERI
    // ============================================
    const dailyRevenues = await fetchDailyRevenues(supabase, centroId)
    console.log(`[DATA HUB] 💵 Ricavi giornalieri: ${dailyRevenues.length} giorni`)

    // ============================================
    // 10. FORNITORI
    // ============================================
    const vendors = await fetchVendors(supabase, centroId)
    console.log(`[DATA HUB] 🏪 Fornitori: ${vendors.length}`)

    // ============================================
    // 11. ANOMALIE
    // ============================================
    const anomalies = await fetchAnomalies(supabase, centroId)
    console.log(`[DATA HUB] 🔍 Anomalie: ${anomalies.length}`)

    // ============================================
    // CALCOLI DERIVATI
    // ============================================

    // Range temporale
    const dateMovimenti = movements.map(m => m.data).filter(d => d)
    const dataMin = dateMovimenti.length > 0 ? dateMovimenti[dateMovimenti.length - 1] : null
    const dataMax = dateMovimenti.length > 0 ? dateMovimenti[0] : null

    // Costi giornalieri per vari periodi
    const dailyCosts = calculateDailyCosts(movements, openingHours, closures)
    console.log(`[DATA HUB] 📈 Costo giornaliero 2025: €${dailyCosts.prevYear?.costoGiornalieroNetto || 'N/A'}`)

    // Analisi mensile
    const monthlyAnalysis = calculateMonthlyAnalysis(operationalMovements)

    // Analisi per categoria
    const categoryAnalysis = calculateCategoryAnalysis(operationalMovements)

    // Trend recenti
    const trends = calculateTrends(operationalMovements, dailyRevenues)

    console.log('[BEAUTYX DATA HUB] ✅ Caricamento completato')

    // ============================================
    // VERIFICA COMPLETEZZA DATI
    // ============================================
    const dataCompleteness = calculateDataCompleteness(movements, dataMin, dataMax, today)
    console.log(`[DATA HUB] 📅 Ultimo dato: ${dataMax}, Giorni mancanti: ${dataCompleteness.giorniMancanti}`)

    // ============================================
    // STRUTTURA DATI COMPLETA PER BEAUTYX
    // ============================================
    return {
      // Metadata CRITICA - Beautyx DEVE leggere questo prima di ogni analisi
      _meta: {
        centroId,
        dataCaricamento: new Date().toISOString(),
        annoCorrente: currentYear,
        dataOggi: format(today, 'yyyy-MM-dd'),
        rangeTemporale: { da: dataMin, a: dataMax },
        // IMPORTANTE: Informazioni sulla completezza dei dati
        completezzaDati: dataCompleteness
      },

      // 1. COSTI E RICAVI GIORNALIERI (PRE-CALCOLATI!)
      // USA SEMPRE QUESTI per domande su costi/ricavi giornalieri
      costiGiornalieri: dailyCosts,

      // 2. MOVIMENTI
      movimenti: {
        totale: movements.length,
        operativi: operationalMovements.length,
        stats: movementStats,
        entrateOperative: operationalMovements.filter(m => m.tipo === 'entrata')
          .reduce((sum, m) => sum + Math.abs(parseFloat(m.importo)), 0),
        usciteOperative: operationalMovements.filter(m => m.tipo === 'uscita')
          .reduce((sum, m) => sum + Math.abs(parseFloat(m.importo)), 0)
      },

      // 3. ANALISI TEMPORALI
      analisiMensile: monthlyAnalysis,
      analisiCategorie: categoryAnalysis,
      trends,

      // 4. CONFIGURAZIONE CENTRO
      configurazione: {
        orariApertura: openingHours,
        chiusureEccezionali: closures,
        categoriePersonalizzate: customCategories,
        giorniAperturaSettimana: openingHours.filter(h => h.aperto).length
      },

      // 5. RISORSE UMANE
      dipendenti: employees,

      // 6. FINANZE E FONDI
      accantonamenti,
      budget,

      // 7. OBIETTIVI E PERFORMANCE
      obiettivi,
      soglieAlert,

      // 8. OTTIMIZZAZIONI
      ottimizzazioni: optimizations,

      // 9. OPERAZIONI
      ricaviGiornalieri: dailyRevenues.slice(0, 30), // Ultimi 30 giorni
      fornitori: vendors,
      anomalie: anomalies
    }
  } catch (error) {
    console.error('[BEAUTYX DATA HUB] ❌ Errore:', error)
    return { error: error.message }
  }
}

// ============================================
// FUNZIONI DI FETCH DATI
// ============================================

async function fetchAllMovements(supabase, centroId) {
  const PAGE_SIZE = 1000
  let movements = []
  let page = 0
  let hasMore = true

  while (hasMore) {
    const { data, error } = await supabase
      .from('bank_movements')
      .select('*')
      .eq('centro_id', centroId)
      .order('data', { ascending: false })
      .range(page * PAGE_SIZE, (page + 1) * PAGE_SIZE - 1)

    if (error) throw error
    if (data?.length > 0) {
      movements = movements.concat(data)
      page++
      hasMore = data.length === PAGE_SIZE
    } else {
      hasMore = false
    }
  }
  return movements
}

async function fetchOpeningHours(supabase, centroId) {
  const { data } = await supabase
    .from('opening_hours')
    .select('*')
    .eq('centro_id', centroId)
  return data || []
}

async function fetchClosures(supabase, centroId) {
  const { data } = await supabase
    .from('exceptional_closures')
    .select('*')
    .eq('centro_id', centroId)
  return data || []
}

async function fetchCustomCategories(supabase, centroId) {
  const { data } = await supabase
    .from('custom_categories')
    .select('*')
    .eq('centro_id', centroId)
  return data || []
}

async function fetchEmployeesData(supabase, centroId) {
  const [employees, hours, absences, overtime] = await Promise.all([
    supabase.from('employees').select('*').eq('centro_id', centroId),
    supabase.from('employee_hours').select('*').eq('centro_id', centroId).order('data', { ascending: false }).limit(100),
    supabase.from('employee_absences').select('*').eq('centro_id', centroId).order('data_inizio', { ascending: false }).limit(50),
    supabase.from('employee_overtime').select('*').eq('centro_id', centroId).order('data', { ascending: false }).limit(50)
  ])

  const employeeList = employees.data || []
  const totalCostMensile = employeeList.reduce((sum, e) => sum + (parseFloat(e.costo_mensile) || 0), 0)

  return {
    list: employeeList,
    count: employeeList.length,
    costoMensileTotale: totalCostMensile,
    costoAnnuoStimato: totalCostMensile * 14, // 14 mensilità
    oreRecenti: hours.data || [],
    assenzeRecenti: absences.data || [],
    straordinariRecenti: overtime.data || []
  }
}

async function fetchAccantonamenti(supabase, centroId) {
  const [fondi, movimenti] = await Promise.all([
    supabase.from('accantonamenti').select('*').eq('centro_id', centroId).eq('attivo', true),
    supabase.from('accantonamenti_movimenti').select('*').eq('centro_id', centroId).order('data', { ascending: false }).limit(50)
  ])

  const fondList = fondi.data || []
  const saldoTotale = fondList.reduce((sum, f) => sum + (parseFloat(f.saldo_attuale) || 0), 0)
  const obiettivoTotale = fondList.reduce((sum, f) => sum + (parseFloat(f.importo_obiettivo) || 0), 0)

  return {
    fondi: fondList.map(f => ({
      nome: f.nome,
      tipo: f.tipo,
      saldo: f.saldo_attuale,
      obiettivo: f.importo_obiettivo,
      percentuale: f.importo_obiettivo > 0 ? Math.round((f.saldo_attuale / f.importo_obiettivo) * 100) : 0,
      periodicita: f.periodicita
    })),
    saldoTotale,
    obiettivoTotale,
    percentualeTotale: obiettivoTotale > 0 ? Math.round((saldoTotale / obiettivoTotale) * 100) : 0,
    movimentiRecenti: movimenti.data || []
  }
}

async function fetchBudget(supabase, centroId, year) {
  const { data: budget } = await supabase
    .from('budget_plans')
    .select('*')
    .eq('centro_id', centroId)
    .eq('anno', year)
    .single()

  if (!budget) return null

  return {
    anno: budget.anno,
    totalePianificato: budget.totale_pianificato,
    categorie: budget.categorie || [],
    note: budget.note
  }
}

async function fetchObiettivi(supabase, centroId) {
  const { data: obiettivi } = await supabase
    .from('obiettivi')
    .select('*')
    .eq('centro_id', centroId)
    .order('created_at', { ascending: false })

  const list = obiettivi || []
  const attivi = list.filter(o => o.stato === 'in_corso' || o.stato === 'non_iniziato')
  const completati = list.filter(o => o.stato === 'completato')
  const falliti = list.filter(o => o.stato === 'fallito')

  return {
    attivi: attivi.map(o => ({
      titolo: o.titolo,
      tipo: o.tipo,
      stato: o.stato,
      valoreFine: o.valore_fine,
      valoreInizio: o.valore_inizio,
      valoreCorrente: o.valore_corrente,
      percentuale: o.percentuale_completamento,
      dataScadenza: o.data_scadenza,
      giorniRimanenti: o.giorni_rimanenti,
      priorita: o.priorita
    })),
    completatiRecenti: completati.slice(0, 5),
    fallitiRecenti: falliti.slice(0, 5),
    totali: {
      attivi: attivi.length,
      completati: completati.length,
      falliti: falliti.length
    }
  }
}

async function fetchSoglieAlert(supabase, centroId) {
  const { data } = await supabase
    .from('soglie_alert')
    .select('*')
    .eq('centro_id', centroId)
    .eq('attiva', true)
  return data || []
}

async function fetchOptimizations(supabase, centroId) {
  const [plans, actions, logs] = await Promise.all([
    supabase.from('optimization_plans').select('*').eq('centro_id', centroId).order('created_at', { ascending: false }).limit(10),
    supabase.from('optimization_actions').select('*').eq('centro_id', centroId).order('created_at', { ascending: false }).limit(20),
    supabase.from('optimization_logs').select('*').eq('centro_id', centroId).order('created_at', { ascending: false }).limit(20)
  ])

  return {
    plans: plans.data || [],
    actions: actions.data || [],
    logs: logs.data || []
  }
}

async function fetchDailyRevenues(supabase, centroId) {
  // Legge da registro_giornate (fonte unica: registro manuale + bridge Koibox)
  // con fallback a daily_revenues (legacy)
  const dataLimite = format(subDays(new Date(), 90), 'yyyy-MM-dd')
  const [registroRes, legacyRes, pagamentiRes] = await Promise.all([
    supabase
      .from('registro_giornate')
      .select('data, incasso_effettivo, n_clienti, n_servizi, source')
      .eq('centro_id', centroId)
      .gte('data', dataLimite)
      .order('data', { ascending: false })
      .limit(90),
    supabase
      .from('daily_revenues')
      .select('data, totale, pos, contanti, bonifici, altro')
      .eq('centro_id', centroId)
      .order('data', { ascending: false })
      .limit(90),
    // Breakdown pagamenti per metodo — necessario per analisi corretta
    supabase
      .from('registro_pagamenti')
      .select('data, metodo, importo')
      .eq('centro_id', centroId)
      .gte('data', dataLimite)
  ])

  // Aggrega pagamenti per data+metodo
  const pagamentiPerData = {}
  for (const p of pagamentiRes.data || []) {
    if (!pagamentiPerData[p.data]) pagamentiPerData[p.data] = {}
    pagamentiPerData[p.data][p.metodo] = (pagamentiPerData[p.data][p.metodo] || 0) + parseFloat(p.importo || 0)
  }

  const map = {}
  // Legacy come base
  for (const r of legacyRes.data || []) {
    map[r.data] = { data: r.data, totale: parseFloat(r.totale) || 0, n_clienti: null, source: 'legacy' }
  }
  // registro_giornate sovrascrive (è più recente e affidabile)
  // Soglia sanity: ignora giorni con valori impossibili (dati corrotti)
  const SANITY_MAX = 15000
  for (const r of registroRes.data || []) {
    const totale = parseFloat(r.incasso_effettivo) || 0
    if (totale > SANITY_MAX) continue // dato corrotto, salta
    map[r.data] = {
      data: r.data,
      totale,
      n_clienti: r.n_clienti,
      n_servizi: r.n_servizi,
      source: r.source || 'manuale',
      pagamenti: pagamentiPerData[r.data] || null, // { pos: X, contanti: Y, ... } oppure null se non disponibile
    }
  }

  return Object.values(map).sort((a, b) => b.data.localeCompare(a.data))
}

async function fetchVendors(supabase, centroId) {
  const { data } = await supabase
    .from('vendors')
    .select('*')
    .eq('centro_id', centroId)
  return data || []
}

async function fetchAnomalies(supabase, centroId) {
  const { data } = await supabase
    .from('anomalies')
    .select('*')
    .eq('centro_id', centroId)
    .order('created_at', { ascending: false })
    .limit(20)
  return data || []
}

// ============================================
// FUNZIONI DI CALCOLO
// ============================================

function calculateWorkingDays(startDate, endDate, openingHours, closures) {
  try {
    const days = eachDayOfInterval({
      start: parseISO(startDate),
      end: parseISO(endDate)
    })

    let workingDays = 0

    days.forEach(day => {
      const dayOfWeek = day.getDay() === 0 ? 6 : day.getDay() - 1
      const dayConfig = openingHours.find(h => h.giorno_settimana === dayOfWeek)

      if (!dayConfig || !dayConfig.aperto) return

      const isClosed = closures?.some(closure => {
        if (closure.ricorrente && closure.tipo_ricorrenza === 'annuale') {
          const closureDate = parseISO(closure.data_inizio)
          return day.getDate() === closureDate.getDate() &&
                 day.getMonth() === closureDate.getMonth()
        }
        const closureStart = parseISO(closure.data_inizio)
        const closureEnd = parseISO(closure.data_fine)
        return isWithinInterval(day, { start: closureStart, end: closureEnd })
      })

      if (!isClosed) workingDays++
    })

    return workingDays
  } catch (e) {
    const diffTime = new Date(endDate) - new Date(startDate)
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24))
    return Math.round(diffDays * 5 / 7)
  }
}

function calculateDailyCosts(movements, openingHours, closures) {
  const CATEGORIE_ESCLUSE = new Set(['Giroconti', 'Finanziamenti'])
  const IVA_RATE = 22
  const today = new Date()
  const currentYear = getYear(today)

  const periods = {
    prevYear: {
      label: String(currentYear - 1),
      start: `${currentYear - 1}-01-01`,
      end: `${currentYear - 1}-12-31`
    },
    currentYear: {
      label: String(currentYear),
      start: `${currentYear}-01-01`,
      end: format(today, 'yyyy-MM-dd')
    },
    rolling12m: {
      label: '12 mesi',
      start: format(subDays(today, 365), 'yyyy-MM-dd'),
      end: format(today, 'yyyy-MM-dd')
    },
    days90: {
      label: '90gg',
      start: format(subDays(today, 90), 'yyyy-MM-dd'),
      end: format(today, 'yyyy-MM-dd')
    },
    days30: {
      label: '30gg',
      start: format(subDays(today, 30), 'yyyy-MM-dd'),
      end: format(today, 'yyyy-MM-dd')
    }
  }

  const results = {}

  for (const [key, period] of Object.entries(periods)) {
    const filtered = movements.filter(mov =>
      mov.data >= period.start && mov.data <= period.end
    )

    const usciteOperative = filtered
      .filter(m => m.tipo === 'uscita' && !CATEGORIE_ESCLUSE.has(m.categoria))
      .reduce((sum, m) => sum + Math.abs(parseFloat(m.importo)), 0)

    const entrateOperative = filtered
      .filter(m => m.tipo === 'entrata' && !CATEGORIE_ESCLUSE.has(m.categoria))
      .reduce((sum, m) => sum + Math.abs(parseFloat(m.importo)), 0)

    const ivaDetraibile = usciteOperative * (IVA_RATE / (100 + IVA_RATE))
    const usciteNette = usciteOperative - ivaDetraibile

    const giorniLavorativi = calculateWorkingDays(period.start, period.end, openingHours, closures)

    const costoGiornalieroNetto = giorniLavorativi > 0 ? usciteNette / giorniLavorativi : 0
    const ricavoGiornaliero = giorniLavorativi > 0 ? entrateOperative / giorniLavorativi : 0

    results[key] = {
      label: period.label,
      periodo: { start: period.start, end: period.end },
      costoGiornalieroNetto: Math.round(costoGiornalieroNetto * 100) / 100,
      ricavoGiornaliero: Math.round(ricavoGiornaliero * 100) / 100,
      margineGiornaliero: Math.round((ricavoGiornaliero - costoGiornalieroNetto) * 100) / 100,
      giorniLavorativi,
      totaleCosti: Math.round(usciteNette * 100) / 100,
      totaleRicavi: Math.round(entrateOperative * 100) / 100
    }
  }

  return results
}

function calculateMonthlyAnalysis(movements) {
  const byMonth = {}

  movements.forEach(m => {
    const monthKey = m.data ? m.data.substring(0, 7) : 'unknown'
    const importo = Math.abs(parseFloat(m.importo) || 0)
    const isEntrata = m.tipo === 'entrata'

    if (!byMonth[monthKey]) {
      byMonth[monthKey] = { entrate: 0, uscite: 0, count: 0 }
    }
    byMonth[monthKey].count++
    if (isEntrata) {
      byMonth[monthKey].entrate += importo
    } else {
      byMonth[monthKey].uscite += importo
    }
  })

  return Object.entries(byMonth)
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([mese, dati]) => ({
      mese,
      entrate: Math.round(dati.entrate * 100) / 100,
      uscite: Math.round(dati.uscite * 100) / 100,
      saldo: Math.round((dati.entrate - dati.uscite) * 100) / 100,
      movimenti: dati.count
    }))
}

function calculateCategoryAnalysis(movements) {
  const byCategory = {}

  movements.forEach(m => {
    const categoria = m.categoria || 'Non categorizzato'
    const importo = Math.abs(parseFloat(m.importo) || 0)
    const isEntrata = m.tipo === 'entrata'

    if (!byCategory[categoria]) {
      byCategory[categoria] = { entrate: 0, uscite: 0, count: 0 }
    }
    byCategory[categoria].count++
    if (isEntrata) {
      byCategory[categoria].entrate += importo
    } else {
      byCategory[categoria].uscite += importo
    }
  })

  return Object.entries(byCategory)
    .sort(([, a], [, b]) => (b.entrate + b.uscite) - (a.entrate + a.uscite))
    .slice(0, 20)
    .map(([categoria, dati]) => ({
      categoria,
      entrate: Math.round(dati.entrate * 100) / 100,
      uscite: Math.round(dati.uscite * 100) / 100,
      totale: Math.round((dati.entrate + dati.uscite) * 100) / 100,
      movimenti: dati.count
    }))
}

function calculateTrends(movements, dailyRevenues) {
  const today = new Date()
  const last30Days = format(subDays(today, 30), 'yyyy-MM-dd')
  const prev30Days = format(subDays(today, 60), 'yyyy-MM-dd')

  // Movimenti ultimi 30 giorni vs 30 giorni precedenti
  const recent = movements.filter(m => m.data >= last30Days)
  const previous = movements.filter(m => m.data >= prev30Days && m.data < last30Days)

  const recentUscite = recent.filter(m => m.tipo === 'uscita')
    .reduce((sum, m) => sum + Math.abs(parseFloat(m.importo)), 0)
  const previousUscite = previous.filter(m => m.tipo === 'uscita')
    .reduce((sum, m) => sum + Math.abs(parseFloat(m.importo)), 0)

  const recentEntrate = recent.filter(m => m.tipo === 'entrata')
    .reduce((sum, m) => sum + Math.abs(parseFloat(m.importo)), 0)
  const previousEntrate = previous.filter(m => m.tipo === 'entrata')
    .reduce((sum, m) => sum + Math.abs(parseFloat(m.importo)), 0)

  return {
    ultimi30Giorni: {
      entrate: Math.round(recentEntrate * 100) / 100,
      uscite: Math.round(recentUscite * 100) / 100,
      saldo: Math.round((recentEntrate - recentUscite) * 100) / 100
    },
    precedenti30Giorni: {
      entrate: Math.round(previousEntrate * 100) / 100,
      uscite: Math.round(previousUscite * 100) / 100,
      saldo: Math.round((previousEntrate - previousUscite) * 100) / 100
    },
    variazione: {
      entrate: previousEntrate > 0 ? Math.round(((recentEntrate - previousEntrate) / previousEntrate) * 100) : 0,
      uscite: previousUscite > 0 ? Math.round(((recentUscite - previousUscite) / previousUscite) * 100) : 0
    }
  }
}

/**
 * Calcola la completezza dei dati disponibili
 * CRITICO: Beautyx deve SEMPRE verificare questo prima di fare analisi su periodi recenti
 */
function calculateDataCompleteness(movements, dataMin, dataMax, today) {
  if (!dataMax) {
    return {
      ultimoDatoDisponibile: null,
      giorniMancanti: null,
      avviso: 'NESSUN DATO DISPONIBILE',
      datiCompleti: false
    }
  }

  const lastDataDate = parseISO(dataMax)
  const diffTime = today - lastDataDate
  const giorniMancanti = Math.floor(diffTime / (1000 * 60 * 60 * 24))

  // Determina l'ultimo mese con dati completi
  const lastMonth = dataMax.substring(0, 7) // YYYY-MM
  const movimentiUltimoMese = movements.filter(m => m.data?.startsWith(lastMonth)).length

  // Calcola quali periodi hanno dati affidabili
  const periodiAffidabili = {
    ultimi30Giorni: giorniMancanti <= 7,  // Affidabile se mancano max 7 giorni
    ultimi90Giorni: giorniMancanti <= 30, // Affidabile se mancano max 30 giorni
    annoCorrente: giorniMancanti <= 45    // Affidabile se mancano max 45 giorni
  }

  let avviso = null
  if (giorniMancanti > 7) {
    avviso = `ATTENZIONE: L'ultimo dato disponibile è del ${dataMax}. Mancano ${giorniMancanti} giorni di dati. I periodi "ultimi 30/90 giorni" NON sono affidabili perché includono giorni senza dati caricati!`
  }

  return {
    ultimoDatoDisponibile: dataMax,
    primoDatoDisponibile: dataMin,
    giorniMancanti,
    ultimoMeseCompleto: giorniMancanti > 7 ? format(subMonths(parseISO(dataMax), 0), 'yyyy-MM') : lastMonth,
    movimentiUltimoMese,
    periodiAffidabili,
    avviso,
    datiCompleti: giorniMancanti <= 7,
    // Suggerimento per Beautyx
    suggerimentoAnalisi: giorniMancanti > 7
      ? `Per analisi trend recenti, usa i dati fino a ${dataMax} o confronta mesi completi (es. dicembre 2025 vs novembre 2025)`
      : 'Dati aggiornati, tutte le analisi sono affidabili'
  }
}

// ============================================
// EXPORT PUBBLICI PER TOOL USE
// Ogni funzione instanzia il proprio client Supabase.
// Le funzioni private esistenti sopra restano invariate.
// ============================================

function createSupabaseClient() {
  return createClient(supabaseUrl, supabaseServiceKey)
}

/**
 * LEGGERO: solo count movimenti + data ultimo movimento.
 * Usato nella prima chiamata Claude per buildShortSystemPrompt (completezzaDati).
 */
export async function fetchMetaData(centroId) {
  if (!centroId) return { completezzaDati: {} }
  const supabase = createSupabaseClient()
  const today = new Date()

  const [countResult, lastResult] = await Promise.all([
    supabase
      .from('bank_movements')
      .select('id', { count: 'exact', head: true })
      .eq('centro_id', centroId),
    supabase
      .from('bank_movements')
      .select('data')
      .eq('centro_id', centroId)
      .order('data', { ascending: false })
      .limit(1)
  ])

  const dataMax = lastResult.data?.[0]?.data || null
  const dataMin = null
  const count = countResult.count || 0

  const completezzaDati = calculateDataCompleteness(
    dataMax ? [{ data: dataMax }] : [],
    dataMin,
    dataMax,
    today
  )

  return {
    centroId,
    annoCorrente: today.getFullYear(),
    dataOggi: format(today, 'yyyy-MM-dd'),
    totaleMovimenti: count,
    completezzaDati
  }
}

/**
 * FINANCIALS: movimenti completi + tutti i calcoli derivati.
 * Equivale alle sezioni 1-3 di getCompleteBusinessData.
 */
export async function fetchFinancialsData(centroId) {
  if (!centroId) return { error: 'centro_id richiesto' }
  const supabase = createSupabaseClient()
  const today = new Date()

  const movements = await fetchAllMovements(supabase, centroId)
  const operationalMovements = filterOperationalMovements(movements)
  const movementStats = getMovementStats(movements)

  const [openingHours, closures] = await Promise.all([
    fetchOpeningHours(supabase, centroId),
    fetchClosures(supabase, centroId)
  ])

  const dateMovimenti = movements.map(m => m.data).filter(d => d)
  const dataMin = dateMovimenti.length > 0 ? dateMovimenti[dateMovimenti.length - 1] : null
  const dataMax = dateMovimenti.length > 0 ? dateMovimenti[0] : null

  return {
    costiGiornalieri: calculateDailyCosts(movements, openingHours, closures),
    movimenti: {
      totale: movements.length,
      operativi: operationalMovements.length,
      stats: movementStats,
      entrateOperative: operationalMovements
        .filter(m => m.tipo === 'entrata')
        .reduce((sum, m) => sum + Math.abs(parseFloat(m.importo)), 0),
      usciteOperative: operationalMovements
        .filter(m => m.tipo === 'uscita')
        .reduce((sum, m) => sum + Math.abs(parseFloat(m.importo)), 0)
    },
    analisiMensile: calculateMonthlyAnalysis(operationalMovements),
    analisiCategorie: calculateCategoryAnalysis(operationalMovements),
    trends: calculateTrends(operationalMovements, []),
    _meta: {
      rangeTemporale: { da: dataMin, a: dataMax },
      completezzaDati: calculateDataCompleteness(movements, dataMin, dataMax, today)
    }
  }
}

/**
 * DIPENDENTI: lista + costi + ore/assenze/straordinari recenti.
 */
export async function fetchDipendentiData(centroId) {
  if (!centroId) return { error: 'centro_id richiesto' }
  const supabase = createSupabaseClient()
  return await fetchEmployeesData(supabase, centroId)
}

/**
 * ACCANTONAMENTI: fondi attivi + movimenti recenti.
 */
export async function fetchAccantonamentiData(centroId) {
  if (!centroId) return { error: 'centro_id richiesto' }
  const supabase = createSupabaseClient()
  return await fetchAccantonamenti(supabase, centroId)
}

/**
 * BUDGET: piano anno corrente.
 */
export async function fetchBudgetData(centroId) {
  if (!centroId) return { error: 'centro_id richiesto' }
  const supabase = createSupabaseClient()
  const currentYear = new Date().getFullYear()
  return await fetchBudget(supabase, centroId, currentYear)
}

/**
 * OBIETTIVI: attivi + completati/falliti recenti.
 */
export async function fetchObiettiviData(centroId) {
  if (!centroId) return { error: 'centro_id richiesto' }
  const supabase = createSupabaseClient()
  return await fetchObiettivi(supabase, centroId)
}

/**
 * RICAVI GIORNALIERI: ultimi 30 giorni.
 */
export async function fetchRicaviData(centroId) {
  if (!centroId) return { error: 'centro_id richiesto' }
  const supabase = createSupabaseClient()
  const giorni = await fetchDailyRevenues(supabase, centroId)

  // Raggruppa per settimana Lun-Dom — restituisce le ultime 8 settimane con i giorni già espansi
  const mapSettimane = {}
  const GIORNI_IT = ['Dom', 'Lun', 'Mar', 'Mer', 'Gio', 'Ven', 'Sab']
  for (const g of giorni) {
    const d = new Date(g.data + 'T12:00:00Z')
    const dow = d.getUTCDay() // 0=dom
    const lun = new Date(d)
    lun.setUTCDate(d.getUTCDate() - (dow === 0 ? 6 : dow - 1))
    const key = lun.toISOString().split('T')[0]
    if (!mapSettimane[key]) mapSettimane[key] = { lunedi: key, giorni_con_dati: [] }
    const domData = new Date(g.data + 'T12:00:00Z')
    mapSettimane[key].giorni_con_dati.push({
      data:       g.data,
      giorno:     GIORNI_IT[domData.getUTCDay()],
      totale:     g.totale,
      n_clienti:  g.n_clienti,
      source:     g.source,
      pagamenti:  g.pagamenti || null,
    })
  }
  const settimane = Object.values(mapSettimane)
    .sort((a, b) => b.lunedi.localeCompare(a.lunedi))
    .slice(0, 8)

  return {
    // ── Array piatto dei giorni (ultimi 90 gg) — per chart e analisi personalizzate
    giorni,
    // ── Settimane pre-raggruppate (Lun-Dom) — usa per "scorsa settimana", "questa settimana"
    // Ogni settimana ha: lunedi (data lunedì), giorni_con_dati (solo i giorni che hanno registrazioni)
    // IMPORTANTE: giorni_con_dati NON include giorni a zero — costruisci il chart aggiungendo 0 per i giorni mancanti
    settimana_corrente:  settimane[0] || null,
    settimana_scorsa:    settimane[1] || null,
    settimane_precedenti: settimane.slice(2),
  }
}

/**
 * CONFIGURAZIONE: orari apertura + chiusure eccezionali + categorie personalizzate.
 */
export async function fetchConfigurazioneData(centroId) {
  if (!centroId) return { error: 'centro_id richiesto' }
  const supabase = createSupabaseClient()
  const [openingHours, closures, customCategories] = await Promise.all([
    fetchOpeningHours(supabase, centroId),
    fetchClosures(supabase, centroId),
    fetchCustomCategories(supabase, centroId)
  ])
  return {
    orariApertura: openingHours,
    chiusureEccezionali: closures,
    categoriePersonalizzate: customCategories,
    giorniAperturaSettimana: openingHours.filter(h => h.aperto).length
  }
}

/**
 * FORNITORI: lista completa.
 */
export async function fetchFornitoriData(centroId) {
  if (!centroId) return { error: 'centro_id richiesto' }
  const supabase = createSupabaseClient()
  return await fetchVendors(supabase, centroId)
}

/**
 * ANOMALIE: ultime 20 rilevate.
 */
export async function fetchAnomalieData(centroId) {
  if (!centroId) return { error: 'centro_id richiesto' }
  const supabase = createSupabaseClient()
  return await fetchAnomalies(supabase, centroId)
}

/**
 * OTTIMIZZAZIONI: piani, azioni, log recenti.
 */
export async function fetchOttimizzazioniData(centroId) {
  if (!centroId) return { error: 'centro_id richiesto' }
  const supabase = createSupabaseClient()
  return await fetchOptimizations(supabase, centroId)
}

/**
 * SOGLIE ALERT: soglie configurate attive.
 */
export async function fetchSoglieAlertData(centroId) {
  if (!centroId) return { error: 'centro_id richiesto' }
  const supabase = createSupabaseClient()
  return await fetchSoglieAlert(supabase, centroId)
}

/**
 * KOIBOX: dati reali del centro estetico importati da Koibox.
 * Disponibili anche senza centro_id (dati del titolare, non multi-tenant).
 * Restituisce analisi aggregata su clienti, casse e servizi.
 */
export async function fetchKoiboxData(centroId) {
  if (!centroId) return { error: 'centro_id richiesto per i dati Koibox' }
  const supabase = createSupabaseClient()
  const now = new Date()

  // ── CASSE: trend mensile — ultimi 12 mesi ──────────────────────────────────
  const dodiciMesiFa = new Date(now)
  dodiciMesiFa.setMonth(dodiciMesiFa.getMonth() - 12)
  const { data: casse } = await supabase
    .from('koibox_casse')
    .select('data, incasso_contanti, incasso_carta, incasso_online, incasso_bonifico, incasso_coupon, incasso_bizum, incasso_paypal, incasso_carta_regalo, incasso_carta_fedelta, debiti_contanti, debiti_carta, debiti_altri, n_coupon, contanti_in_cassa, quantita_reale_cassa, differenza_cassa, totale_giorno, n_scontrini')
    .eq('centro_id', centroId)
    .gte('data', dodiciMesiFa.toISOString().split('T')[0])
    .order('data', { ascending: true })

  // Soglia sanity: un centro estetico non può incassare >€15.000/giorno
  // Se il dato supera, è probabile un errore di mapping dal gestionale
  const SANITY_MAX_DAY = 15000

  const casseMensili = {}
  let totaleIncassato = 0, giorniLavorati = 0, bestDay = 0

  for (const r of casse || []) {
    const mese = r.data.substring(0, 7) // 'YYYY-MM'
    if (!casseMensili[mese]) casseMensili[mese] = {
      mese, contanti: 0, carta: 0, online: 0, bonifico: 0,
      coupon: 0, bizum: 0, paypal: 0, carta_regalo: 0, carta_fedelta: 0,
      debiti_contanti: 0, debiti_carta: 0, debiti_altri: 0,
      totale: 0, giorni: 0
    }
    casseMensili[mese].contanti        += r.incasso_contanti || 0
    casseMensili[mese].carta           += r.incasso_carta || 0
    casseMensili[mese].online          += r.incasso_online || 0
    casseMensili[mese].bonifico        += r.incasso_bonifico || 0
    casseMensili[mese].coupon          += r.incasso_coupon || 0
    casseMensili[mese].bizum           += r.incasso_bizum || 0
    casseMensili[mese].paypal          += r.incasso_paypal || 0
    casseMensili[mese].carta_regalo    += r.incasso_carta_regalo || 0
    casseMensili[mese].carta_fedelta   += r.incasso_carta_fedelta || 0
    casseMensili[mese].debiti_contanti += r.debiti_contanti || 0
    casseMensili[mese].debiti_carta    += r.debiti_carta || 0
    casseMensili[mese].debiti_altri    += r.debiti_altri || 0
    const totaleGiorno = r.totale_giorno || 0
    // Ignora giorni con valori palesemente errati (> soglia sanity)
    if (totaleGiorno > SANITY_MAX_DAY) continue
    casseMensili[mese].totale          += totaleGiorno
    if (totaleGiorno > 0) {
      casseMensili[mese].giorni++
      giorniLavorati++
      totaleIncassato += totaleGiorno
      if (totaleGiorno > bestDay) bestDay = totaleGiorno
    }
  }
  const casseMensiliArr = Object.values(casseMensili).slice(-14) // ultimi 14 mesi
  const mediaGiornaliera = giorniLavorati > 0 ? Math.round(totaleIncassato / giorniLavorati) : 0

  // ── CLIENTI: segmentazione per dormienza e valore ─────────────────────────
  const { data: clienti, count: totaleClienti } = await supabase
    .from('koibox_clienti')
    .select('fatturato_totale, ultima_vendita, importo_debiti, newsletter, rgpd, come_conosciuto', { count: 'exact' })
    .eq('centro_id', centroId)

  let conVendite = 0, senzaVendite = 0
  let dormanti90 = 0, dormanti180 = 0, dormanti365 = 0
  let vipDormanti = 0  // fatturato > 500 && >90gg
  let sommaFatturati = 0, topClientiCount = 0
  let totaleDebiti = 0, clientiConDebiti = 0
  let newsletterIscritti = 0, rgpdConsenso = 0
  const fasceFatturato = { '0': 0, '1-100': 0, '101-300': 0, '301-500': 0, '501-1000': 0, '1001-3000': 0, '3000+': 0 }
  const canalAcquisizione = {}

  for (const c of clienti || []) {
    const fat = parseFloat(c.fatturato_totale) || 0
    if (fat > 0) { conVendite++; sommaFatturati += fat } else { senzaVendite++ }
    if (fat >= 1000) topClientiCount++

    // Debiti
    const deb = parseFloat(c.importo_debiti) || 0
    if (deb > 0) { clientiConDebiti++; totaleDebiti += deb }

    // Marketing
    if (c.newsletter) newsletterIscritti++
    if (c.rgpd) rgpdConsenso++
    if (c.come_conosciuto) {
      const canale = c.come_conosciuto.trim()
      if (canale) canalAcquisizione[canale] = (canalAcquisizione[canale] || 0) + 1
    }

    // Fasce
    if (fat === 0) fasceFatturato['0']++
    else if (fat <= 100) fasceFatturato['1-100']++
    else if (fat <= 300) fasceFatturato['101-300']++
    else if (fat <= 500) fasceFatturato['301-500']++
    else if (fat <= 1000) fasceFatturato['501-1000']++
    else if (fat <= 3000) fasceFatturato['1001-3000']++
    else fasceFatturato['3000+']++

    if (c.ultima_vendita) {
      const gg = Math.floor((now - new Date(c.ultima_vendita)) / 86400000)
      if (gg > 90)  { dormanti90++;  if (fat > 500) vipDormanti++ }
      if (gg > 180) dormanti180++
      if (gg > 365) dormanti365++
    }
  }
  const ltv_medio = conVendite > 0 ? Math.round(sommaFatturati / conVendite) : 0

  // ── TOP 10 CLIENTI ──────────────────────────────────────────────────────────
  const { data: top10 } = await supabase
    .from('koibox_clienti')
    .select('nome, cognome, fatturato_totale, ultima_vendita, telefono')
    .eq('centro_id', centroId)
    .order('fatturato_totale', { ascending: false })
    .gt('fatturato_totale', 0)
    .limit(10)

  const top10Formatted = (top10 || []).map(c => ({
    nome: `${c.nome || ''} ${c.cognome || ''}`.trim(),
    fatturato: c.fatturato_totale,
    gg_fa: c.ultima_vendita
      ? Math.floor((now - new Date(c.ultima_vendita)) / 86400000)
      : null,
    telefono: c.telefono
  }))

  // ── VIP DORMIENTI (top 15 per recupero) ────────────────────────────────────
  const cutoff90 = new Date(now.getTime() - 90 * 86400000).toISOString()
  const { data: vipDorm } = await supabase
    .from('koibox_clienti')
    .select('nome, cognome, fatturato_totale, ultima_vendita, telefono')
    .eq('centro_id', centroId)
    .gt('fatturato_totale', 500)
    .lt('ultima_vendita', cutoff90)
    .order('fatturato_totale', { ascending: false })
    .limit(15)

  // ── SERVIZI: per categoria ──────────────────────────────────────────────────
  const { data: servizi } = await supabase
    .from('koibox_servizi')
    .select('nome, prezzo, categoria, durata_minuti, attivo')
    .eq('centro_id', centroId)
    .eq('attivo', true)
    .order('prezzo', { ascending: false })

  const serviziPerCategoria = {}
  for (const s of servizi || []) {
    const cat = s.categoria || 'Altro'
    if (!serviziPerCategoria[cat]) serviziPerCategoria[cat] = { categoria: cat, servizi: [], prezzoMedio: 0 }
    serviziPerCategoria[cat].servizi.push({ nome: s.nome, prezzo: s.prezzo, durata_minuti: s.durata_minuti })
  }
  for (const cat of Object.values(serviziPerCategoria)) {
    const prezzi = cat.servizi.filter(s => s.prezzo > 0).map(s => s.prezzo)
    cat.prezzoMedio = prezzi.length > 0 ? Math.round(prezzi.reduce((a, b) => a + b) / prezzi.length) : 0
    cat.count = cat.servizi.length
  }

  // ── APPUNTAMENTI: statistiche generali ─────────────────────────────────────
  const { data: appuntamenti } = await supabase
    .from('koibox_appuntamenti')
    .select('data_ora, dipendente, status, servizi')
    .eq('centro_id', centroId)
    .order('data_ora', { ascending: false })
    .limit(500)

  let appTotali = 0, appUltimi30 = 0
  const dipendentiFreq = {}, statusFreq = {}
  const cutoff30 = new Date(now.getTime() - 30 * 86400000)

  for (const a of appuntamenti || []) {
    appTotali++
    if (a.data_ora && new Date(a.data_ora) >= cutoff30) appUltimi30++
    if (a.dipendente) dipendentiFreq[a.dipendente] = (dipendentiFreq[a.dipendente] || 0) + 1
    if (a.status) statusFreq[a.status] = (statusFreq[a.status] || 0) + 1
  }

  return {
    fonte: 'Koibox (importazione manuale)',
    periodoRilevato: casse?.length > 0
      ? `${casse[0].data} → ${casse[casse.length - 1].data}`
      : 'N/A',

    fatturato: {
      totale: Math.round(totaleIncassato),
      mediaGiornaliera,
      bestDay: Math.round(bestDay),
      giorniLavorati,
      percContanti: totaleIncassato > 0
        ? Math.round((casseMensiliArr.reduce((a, m) => a + m.contanti, 0) / totaleIncassato) * 100)
        : 0,
      percCarta: totaleIncassato > 0
        ? Math.round((casseMensiliArr.reduce((a, m) => a + m.carta, 0) / totaleIncassato) * 100)
        : 0,
      percOnline: totaleIncassato > 0
        ? Math.round((casseMensiliArr.reduce((a, m) => a + m.online, 0) / totaleIncassato) * 100)
        : 0,
      percBonifico: totaleIncassato > 0
        ? Math.round((casseMensiliArr.reduce((a, m) => a + m.bonifico, 0) / totaleIncassato) * 100)
        : 0,
      percCoupon: totaleIncassato > 0
        ? Math.round((casseMensiliArr.reduce((a, m) => a + m.coupon, 0) / totaleIncassato) * 100)
        : 0,
      percBizum: totaleIncassato > 0
        ? Math.round((casseMensiliArr.reduce((a, m) => a + m.bizum, 0) / totaleIncassato) * 100)
        : 0,
      percPaypal: totaleIncassato > 0
        ? Math.round((casseMensiliArr.reduce((a, m) => a + m.paypal, 0) / totaleIncassato) * 100)
        : 0,
      andamentoMensile: casseMensiliArr.map(m => ({
        mese: m.mese,
        totale: Math.round(m.totale),
        contanti: Math.round(m.contanti),
        carta: Math.round(m.carta),
        online: Math.round(m.online),
        bonifico: Math.round(m.bonifico),
        coupon: Math.round(m.coupon),
        bizum: Math.round(m.bizum),
        paypal: Math.round(m.paypal),
        carta_regalo: Math.round(m.carta_regalo),
        carta_fedelta: Math.round(m.carta_fedelta),
        debiti_contanti: Math.round(m.debiti_contanti),
        debiti_carta: Math.round(m.debiti_carta),
        debiti_altri: Math.round(m.debiti_altri),
        giorni: m.giorni
      }))
    },

    clienti: {
      totale: totaleClienti || 0,
      conVendite,
      senzaVendite,
      ltvMedio: ltv_medio,
      clientiVip: topClientiCount,
      dormanti: { gg90: dormanti90, gg180: dormanti180, gg365: dormanti365 },
      vipDormantiOltre90gg: vipDormanti,
      distribuzioneValore: fasceFatturato,
      debiti: {
        clientiConDebiti,
        totaleDebiti: Math.round(totaleDebiti * 100) / 100
      },
      marketing: {
        newsletterIscritti,
        rgpdConsenso,
        canalAcquisizione: Object.entries(canalAcquisizione)
          .sort(([, a], [, b]) => b - a)
          .slice(0, 10)
          .map(([canale, count]) => ({ canale, count }))
      },
      top10: top10Formatted,
      vipDormantiDaRicuperare: (vipDorm || []).map(c => ({
        nome: `${c.nome || ''} ${c.cognome || ''}`.trim(),
        fatturato: c.fatturato_totale,
        gg_fa: c.ultima_vendita
          ? Math.floor((now - new Date(c.ultima_vendita)) / 86400000)
          : null,
        telefono: c.telefono
      }))
    },

    servizi: {
      totale: servizi?.length || 0,
      perCategoria: Object.values(serviziPerCategoria),
      topPerPrezzo: (servizi || []).slice(0, 10).map(s => ({
        nome: s.nome,
        prezzo: s.prezzo,
        categoria: s.categoria,
        durata_minuti: s.durata_minuti
      }))
    },

    appuntamenti: {
      totale: appTotali,
      ultimi30gg: appUltimi30,
      perDipendente: Object.entries(dipendentiFreq)
        .sort(([, a], [, b]) => b - a)
        .slice(0, 10)
        .map(([nome, count]) => ({ nome, count })),
      perStatus: statusFreq
    },

    datiDisponibili: {
      casse: (casse?.length || 0) > 0,
      clienti: (totaleClienti || 0) > 0,
      servizi: (servizi?.length || 0) > 0,
      appuntamenti: appTotali > 0
    }
  }
}

// ============================================
// REGISTRO GIORNATA — fetch functions
// ============================================

export async function fetchRegistroOggiData(centroId) {
  if (!centroId) return { error: 'centro_id richiesto' }
  const supabase = createClient(supabaseUrl, supabaseServiceKey)
  const oggi = new Date().toISOString().split('T')[0]

  const [giornataRes, pagRes, speseRes] = await Promise.all([
    supabase.from('registro_giornate').select('*').eq('centro_id', centroId).eq('data', oggi).maybeSingle(),
    supabase.from('registro_pagamenti').select('id, metodo, importo, descrizione, operatrice_nome, feedback_tipo, feedback_testo, interesse_futuro, created_at').eq('centro_id', centroId).eq('data', oggi).order('created_at', { ascending: false }),
    supabase.from('registro_spese').select('id, descrizione, importo, categoria, created_at').eq('centro_id', centroId).eq('data', oggi).order('created_at', { ascending: false })
  ])

  const pagamenti = pagRes.data || []
  const spese = speseRes.data || []

  // Raggruppa pagamenti per metodo
  const perMetodo = {}
  pagamenti.forEach(p => {
    perMetodo[p.metodo] = (perMetodo[p.metodo] || 0) + Number(p.importo)
  })

  // Sommario operatrici e feedback del giorno
  const operatrici = {}
  const feedbacks  = pagamenti.filter(p => p.feedback_tipo || p.feedback_testo)
  const interessi  = pagamenti.filter(p => p.interesse_futuro).map(p => ({ cliente: p.descrizione, interesse: p.interesse_futuro }))
  pagamenti.forEach(p => {
    if (p.operatrice_nome) operatrici[p.operatrice_nome] = (operatrici[p.operatrice_nome] || 0) + 1
  })

  return {
    data: oggi,
    giornata: giornataRes.data || null,
    incasso_effettivo: giornataRes.data?.incasso_effettivo || 0,
    incasso_maturato:  giornataRes.data?.incasso_maturato  || 0,
    spese_totali:      giornataRes.data?.spese_totali      || 0,
    n_clienti:         giornataRes.data?.n_clienti         || 0,
    n_servizi:         giornataRes.data?.n_servizi         || 0,
    pagamenti_per_metodo: perMetodo,
    pagamenti_lista: pagamenti.map(p => ({ id: p.id, importo: p.importo, metodo: p.metodo, descrizione: p.descrizione, operatrice: p.operatrice_nome })),
    spese_dettaglio: spese.map(s => ({ id: s.id, importo: s.importo, descrizione: s.descrizione, categoria: s.categoria })),
    operatrici_servizi: operatrici,
    feedbacks_oggi: feedbacks.map(p => ({ tipo: p.feedback_tipo, testo: p.feedback_testo, descrizione: p.descrizione })),
    interessi_futuri: interessi
  }
}

export async function fetchCreditiApertiData(centroId) {
  if (!centroId) return { crediti: [], totale_residuo: 0 }
  const supabase = createClient(supabaseUrl, supabaseServiceKey)
  const oggi = new Date().toISOString().split('T')[0]

  const { data } = await supabase
    .from('registro_crediti')
    .select('id, nome_cliente, servizio, importo_totale, acconto_versato, residuo, data_attesa_saldo, data_servizio, metodo_acconto, note')
    .eq('centro_id', centroId)
    .eq('saldato', false)
    .order('data_attesa_saldo', { ascending: true, nullsFirst: false })

  const crediti = data || []
  const scaduti      = crediti.filter(c => c.data_attesa_saldo && c.data_attesa_saldo < oggi)
  const in_scadenza  = crediti.filter(c => c.data_attesa_saldo && c.data_attesa_saldo === oggi)
  const futuri       = crediti.filter(c => !c.data_attesa_saldo || c.data_attesa_saldo > oggi)
  const totale_residuo = crediti.reduce((s, c) => s + Number(c.residuo || 0), 0)

  return { crediti, scaduti, in_scadenza, futuri, totale_residuo, n_aperti: crediti.length }
}
