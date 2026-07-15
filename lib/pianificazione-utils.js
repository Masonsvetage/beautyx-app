import { parseISO, getMonth, getYear, getDaysInMonth, getDay, format } from 'date-fns'

/**
 * Budget Planning Utilities
 */

// Verifica se una data appartiene a un mese/anno specifico
export function matchesMonth(dateString, mese, anno) {
  try {
    const date = typeof dateString === 'string' ? parseISO(dateString) : dateString
    return getMonth(date) + 1 === mese && getYear(date) === anno
  } catch {
    return false
  }
}

// Calcola confronto budget vs actual per una categoria e mese
export function calculateBudgetComparison(budgetMonthly, bankMovements, categoria, mese, anno) {
  const budgeted = budgetMonthly.find(b => b.mese === mese)?.importo_mensile || 0

  const actual = bankMovements
    .filter(m => m.categoria === categoria && matchesMonth(m.data, mese, anno))
    .reduce((sum, m) => sum + parseFloat(m.importo || 0), 0)

  const difference = budgeted - actual
  const percentage = budgeted > 0 ? (actual / budgeted) * 100 : 0

  // Status: green se sotto 80%, yellow se 80-100%, red se sopra 100%
  let status = 'green'
  if (percentage >= 100) status = 'red'
  else if (percentage >= 80) status = 'yellow'

  return {
    budgeted: parseFloat(budgeted),
    actual: parseFloat(actual),
    difference: parseFloat(difference),
    percentage: parseFloat(percentage.toFixed(2)),
    status
  }
}

// Calcola totale budget per anno
export function calculateYearlyBudget(budgetPlans) {
  return budgetPlans.reduce((sum, plan) => sum + parseFloat(plan.importo_annuale || 0), 0)
}

// Distribuisci budget annuale equamente nei 12 mesi
export function distributeAnnualBudget(importoAnnuale) {
  const importoMensile = parseFloat(importoAnnuale) / 12
  return Array.from({ length: 12 }, (_, i) => ({
    mese: i + 1,
    importo_mensile: parseFloat(importoMensile.toFixed(2))
  }))
}

/**
 * Accantonamenti Utilities
 */

// Calcola liquidità disponibile
export function calculateLiquidity(bankMovements, accantonamenti) {
  const totalBank = bankMovements.reduce((sum, m) => {
    const importo = parseFloat(m.importo || 0)
    return sum + (m.tipo === 'entrata' ? importo : -importo)
  }, 0)

  const totalReserved = accantonamenti
    .filter(a => a.attivo)
    .reduce((sum, a) => sum + parseFloat(a.saldo_attuale || 0), 0)

  return {
    totalBank: parseFloat(totalBank.toFixed(2)),
    totalReserved: parseFloat(totalReserved.toFixed(2)),
    available: parseFloat((totalBank - totalReserved).toFixed(2))
  }
}

// Calcola percentuale completamento accantonamento
export function calculateAccantonamentoProgress(saldoAttuale, importoObiettivo) {
  if (!importoObiettivo || importoObiettivo === 0) return 0
  const percentage = (parseFloat(saldoAttuale) / parseFloat(importoObiettivo)) * 100
  return Math.min(parseFloat(percentage.toFixed(2)), 100)
}

// Filtra movimenti accantonamento per periodo
export function filterAccantonamentoMovements(movements, startDate, endDate) {
  return movements.filter(m => {
    const data = parseISO(m.data)
    const start = parseISO(startDate)
    const end = parseISO(endDate)
    return data >= start && data <= end
  })
}

/**
 * Employee Management Utilities
 */

// Calcola numero di settimane in un mese
export function getWeeksInMonth(mese, anno) {
  const daysInMonth = getDaysInMonth(new Date(anno, mese - 1))
  return parseFloat((daysInMonth / 7).toFixed(2))
}

// Calcola ore contrattuali mensili
export function calculateMonthlyContractedHours(oreSettimanali, mese, anno) {
  const weeks = getWeeksInMonth(mese, anno)
  return parseFloat((oreSettimanali * weeks).toFixed(2))
}

// Calcola straordinari per un dipendente in un mese
export function calculateOvertimeMonth(employee, hours, mese, anno) {
  const contractedHours = calculateMonthlyContractedHours(
    parseFloat(employee.ore_contrattuali_settimanali || 0),
    mese,
    anno
  )

  const actualHours = hours
    .filter(h => matchesMonth(h.data, mese, anno))
    .reduce((sum, h) => sum + parseFloat(h.ore_lavorate || 0), 0)

  const overtime = Math.max(0, actualHours - contractedHours)
  const percentage = contractedHours > 0 ? (actualHours / contractedHours) * 100 : 0

  return {
    contractedHours: parseFloat(contractedHours.toFixed(2)),
    actualHours: parseFloat(actualHours.toFixed(2)),
    overtime: parseFloat(overtime.toFixed(2)),
    percentage: parseFloat(percentage.toFixed(2))
  }
}

// Calcola ore totali di assenza
export function calculateAbsenceHours(dataInizio, dataFine, oreGiornaliereStandard = 8) {
  const start = parseISO(dataInizio)
  const end = parseISO(dataFine)

  let giorni = 0
  let currentDate = start

  // Conta solo giorni lavorativi (Lun-Ven)
  while (currentDate <= end) {
    const dayOfWeek = getDay(currentDate)
    if (dayOfWeek !== 0 && dayOfWeek !== 6) { // Non domenica (0) e non sabato (6)
      giorni++
    }
    currentDate = new Date(currentDate.getTime() + 24 * 60 * 60 * 1000)
  }

  return parseFloat((giorni * oreGiornaliereStandard).toFixed(2))
}

// Calcola saldo ferie rimanenti
export function calculateVacationBalance(employee, absences) {
  // Ferie standard Italia: ~22-26 giorni/anno
  const ferieTotaliAnno = 26
  const oreGiornaliereStandard = parseFloat(employee.ore_contrattuali_settimanali || 40) / 5
  const oreFerieTotali = ferieTotaliAnno * oreGiornaliereStandard

  const ferieUsate = absences
    .filter(a => a.tipo === 'ferie')
    .reduce((sum, a) => sum + parseFloat(a.ore_totali || 0), 0)

  return {
    totali: parseFloat(oreFerieTotali.toFixed(2)),
    usate: parseFloat(ferieUsate.toFixed(2)),
    rimanenti: parseFloat((oreFerieTotali - ferieUsate).toFixed(2))
  }
}

// Formatta nome dipendente
export function formatEmployeeName(employee, format = 'full') {
  if (format === 'full') {
    return `${employee.cognome} ${employee.nome}`
  } else if (format === 'short') {
    return `${employee.cognome} ${employee.nome.charAt(0)}.`
  } else if (format === 'initials') {
    return `${employee.nome.charAt(0)}${employee.cognome.charAt(0)}`
  }
  return `${employee.nome} ${employee.cognome}`
}

/**
 * Date Utilities
 */

// Ottieni nome mese italiano
export function getItalianMonthName(mese) {
  const mesi = [
    'Gennaio', 'Febbraio', 'Marzo', 'Aprile', 'Maggio', 'Giugno',
    'Luglio', 'Agosto', 'Settembre', 'Ottobre', 'Novembre', 'Dicembre'
  ]
  return mesi[mese - 1] || ''
}

// Ottieni abbreviazione mese italiano
export function getItalianMonthAbbr(mese) {
  const mesi = [
    'Gen', 'Feb', 'Mar', 'Apr', 'Mag', 'Giu',
    'Lug', 'Ago', 'Set', 'Ott', 'Nov', 'Dic'
  ]
  return mesi[mese - 1] || ''
}

// Genera array di tutti i 12 mesi
export function getAllMonths() {
  return Array.from({ length: 12 }, (_, i) => ({
    numero: i + 1,
    nome: getItalianMonthName(i + 1),
    abbr: getItalianMonthAbbr(i + 1)
  }))
}

/**
 * Allocazioni Utilities (Nuove funzioni per sistema allocazioni)
 */

/**
 * Calcola allocazioni suggerite per incasso giornaliero
 * @param {Array} accantonamenti - Array di accantonamenti attivi
 * @param {number} importoTotale - Importo totale dell'incasso
 * @returns {Object} { suggestions, totalAllocated, unallocated }
 */
export function calculateSuggestedAllocations(accantonamenti, importoTotale) {
  const suggestions = []
  let totalAllocated = 0

  accantonamenti
    .filter(a => a.attivo && a.tipo_versamento === 'percentuale_incasso')
    .forEach(acc => {
      const percentuale = parseFloat(acc.percentuale_incasso || 0)
      if (percentuale > 0) {
        const importo = (parseFloat(importoTotale) * percentuale) / 100
        const importoArrotondato = parseFloat(importo.toFixed(2))

        suggestions.push({
          accantonamento_id: acc.id,
          nome: acc.nome,
          tipo_versamento: acc.tipo_versamento,
          percentuale,
          importo_suggerito: importoArrotondato,
          colore: acc.colore || '#8b5cf6',
          icona: acc.icona || '💰'
        })

        totalAllocated += importoArrotondato
      }
    })

  return {
    suggestions,
    totalAllocated: parseFloat(totalAllocated.toFixed(2)),
    unallocated: parseFloat((parseFloat(importoTotale) - totalAllocated).toFixed(2))
  }
}

/**
 * Valida che allocazioni non superino l'incasso totale
 * @param {Array} allocations - Array di allocazioni con importo_finale
 * @param {number} importoTotale - Importo totale disponibile
 * @returns {Object} { isValid, totalAllocated, exceededBy, remaining }
 */
export function validateAllocations(allocations, importoTotale) {
  const total = allocations.reduce((sum, a) => sum + parseFloat(a.importo_finale || 0), 0)

  return {
    isValid: total <= importoTotale,
    totalAllocated: parseFloat(total.toFixed(2)),
    exceededBy: parseFloat((total - importoTotale).toFixed(2)),
    remaining: parseFloat((importoTotale - total).toFixed(2))
  }
}

/**
 * Ottieni label display per tipo_versamento
 * @param {string} tipo - tipo_versamento value
 * @returns {string} Label da mostrare
 */
export function getTipoVersamentoLabel(tipo) {
  const labels = {
    'percentuale_incasso': '% su incasso',
    'fisso_mensile': '€/mese',
    'manuale': 'Manuale'
  }
  return labels[tipo] || tipo
}

/**
 * Ottieni icona per tipo_versamento
 * @param {string} tipo - tipo_versamento value
 * @returns {string} Emoji icona
 */
export function getTipoVersamentoIcon(tipo) {
  const icons = {
    'percentuale_incasso': '📊',
    'fisso_mensile': '📅',
    'manuale': '✍️'
  }
  return icons[tipo] || '📝'
}

/**
 * Formatta importo in euro con 2 decimali
 * @param {number|string} importo - Importo da formattare
 * @returns {string} Importo formattato (es: "1.234,56")
 */
export function formatEuro(importo) {
  const num = parseFloat(importo || 0)
  return num.toLocaleString('it-IT', {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2
  })
}

/**
 * Formatta data in formato italiano
 * @param {string|Date} data - Data da formattare
 * @returns {string} Data formattata (es: "07/01/2025")
 */
export function formatDate(data) {
  if (!data) return ''
  const date = typeof data === 'string' ? parseISO(data) : data
  return format(date, 'dd/MM/yyyy')
}
