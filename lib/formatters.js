/**
 * Formatta un importo in euro con formato italiano
 * @param {number} amount - Importo da formattare
 * @returns {string} - Importo formattato (es: "1.234,56 €")
 */
export function formatEuro(amount) {
  if (amount === null || amount === undefined || isNaN(amount)) {
    return '0,00 €'
  }

  return new Intl.NumberFormat('it-IT', {
    style: 'currency',
    currency: 'EUR',
    minimumFractionDigits: 2,
    maximumFractionDigits: 2
  }).format(amount)
}

/**
 * Formatta una data in formato italiano
 * @param {string|Date} date - Data da formattare
 * @returns {string} - Data formattata (es: "15/12/2025")
 */
export function formatDate(date) {
  if (!date) return ''

  const d = typeof date === 'string' ? new Date(date) : date
  return d.toLocaleDateString('it-IT')
}
