/**
 * Classificatore di movimenti bancari
 * Distingue movimenti operativi da tecnici/finanziari
 */

/**
 * Determina il tipo di movimento
 * @param {Object} movement - Movimento bancario
 * @returns {string} 'operativo' | 'tecnico' | 'finanziamento'
 */
export function classifyMovement(movement) {
  const desc = (movement.descrizione || '').toUpperCase()
  const cat = movement.categoria || ''

  // 1. FINANZIAMENTI: Anticipi POS
  if (
    movement.tipo === 'entrata' &&
    cat === 'POS' &&
    (desc.includes('ANTICIPO') && desc.includes('POS') ||
     desc.includes('APERTURA ANTICIPO'))
  ) {
    return 'finanziamento'
  }

  // 2. FINANZIAMENTI: Categoria "Finanziamenti" (prestiti, mutui, erogazioni)
  if (cat === 'Finanziamenti') {
    return 'finanziamento'
  }

  // 3. TECNICI: Giroconti (ripagamenti anticipi, movimenti interni)
  if (cat === 'Giroconti') {
    return 'tecnico'
  }

  // 4. TECNICI: Commissioni molto basse (< 5€) su bonifici/POS
  if (
    movement.tipo === 'uscita' &&
    parseFloat(movement.importo) < 5 &&
    (desc.includes('COMMIS') || desc.includes('COMMISSION'))
  ) {
    // Le commissioni sono uscite operative reali, non tecniche
    return 'operativo'
  }

  // Default: operativo
  return 'operativo'
}

/**
 * Filtra solo i movimenti operativi
 * @param {Array} movements - Array di movimenti
 * @returns {Array} Movimenti operativi (esclude tecnici e finanziamenti)
 */
export function filterOperationalMovements(movements) {
  return movements.filter(m => classifyMovement(m) === 'operativo')
}

/**
 * Raggruppa movimenti per tipo
 * @param {Array} movements - Array di movimenti
 * @returns {Object} {operativi: [], tecnici: [], finanziamenti: []}
 */
export function groupByMovementType(movements) {
  const groups = {
    operativi: [],
    tecnici: [],
    finanziamenti: []
  }

  movements.forEach(m => {
    const type = classifyMovement(m)
    if (type === 'operativo') groups.operativi.push(m)
    else if (type === 'tecnico') groups.tecnici.push(m)
    else if (type === 'finanziamento') groups.finanziamenti.push(m)
  })

  return groups
}

/**
 * Calcola totali operativi (escludendo movimenti tecnici)
 * @param {Array} movements - Array di movimenti
 * @param {string} tipo - 'entrata' | 'uscita' | 'all'
 * @returns {number} Totale movimenti operativi
 */
export function calculateOperationalTotal(movements, tipo = 'all') {
  const operational = filterOperationalMovements(movements)

  let filtered = operational
  if (tipo === 'entrata') {
    filtered = operational.filter(m => m.tipo === 'entrata')
  } else if (tipo === 'uscita') {
    filtered = operational.filter(m => m.tipo === 'uscita')
  }

  return filtered.reduce((sum, m) => sum + Math.abs(parseFloat(m.importo || 0)), 0)
}

/**
 * Statistiche su movimenti tecnici vs operativi
 * @param {Array} movements - Array di movimenti
 * @returns {Object} Statistiche dettagliate
 */
export function getMovementStats(movements) {
  const groups = groupByMovementType(movements)

  const stats = {
    totale: movements.length,
    operativi: {
      count: groups.operativi.length,
      entrate: groups.operativi.filter(m => m.tipo === 'entrata').reduce((s, m) => s + parseFloat(m.importo || 0), 0),
      uscite: groups.operativi.filter(m => m.tipo === 'uscita').reduce((s, m) => s + Math.abs(parseFloat(m.importo || 0)), 0)
    },
    tecnici: {
      count: groups.tecnici.length,
      totale: groups.tecnici.reduce((s, m) => s + Math.abs(parseFloat(m.importo || 0)), 0)
    },
    finanziamenti: {
      count: groups.finanziamenti.length,
      totale: groups.finanziamenti.reduce((s, m) => s + parseFloat(m.importo || 0), 0)
    }
  }

  stats.operativi.saldo = stats.operativi.entrate - stats.operativi.uscite

  return stats
}
