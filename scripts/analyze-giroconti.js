import { extractVendorKey } from '../lib/vendor-utils.js'

async function analyzeGiroconti() {
  const res = await fetch('http://localhost:3000/api/bank/movements?centro_id=1a72344b-aac1-465b-92d4-7e670f430340')
  const data = await res.json()
  const movements = data.movements

  // Filtra Giroconti 2025
  const giroconti = movements.filter(m =>
    m.data && m.data.startsWith('2025') &&
    m.categoria === 'Giroconti'
  )

  console.log(`=== ANALISI ${giroconti.length} GIROCONTI 2025 ===\n`)

  // Raggruppa per vendorKey (come fa GroupedView)
  const byVendor = {}
  giroconti.forEach(m => {
    const vendorKey = extractVendorKey(m.descrizione)
    if (!byVendor[vendorKey]) {
      byVendor[vendorKey] = { count: 0, totale: 0, esempi: [] }
    }
    byVendor[vendorKey].count++
    byVendor[vendorKey].totale += Math.abs(parseFloat(m.importo))
    if (byVendor[vendorKey].esempi.length < 2) {
      byVendor[vendorKey].esempi.push({
        data: m.data,
        importo: m.importo,
        descrizione: m.descrizione.substring(0, 70)
      })
    }
  })

  console.log('GIROCONTI RAGGRUPPATI PER VENDOR (come vista Raggruppata):')
  console.log(`Numero gruppi: ${Object.keys(byVendor).length}`)
  console.log()

  Object.entries(byVendor)
    .sort((a, b) => b[1].totale - a[1].totale)
    .slice(0, 10)
    .forEach(([vendor, data]) => {
      console.log(`${vendor}: ${data.count} mov = ${data.totale.toFixed(2)}€`)
      data.esempi.forEach(e => {
        console.log(`  - ${e.data} ${e.importo}€: ${e.descrizione}`)
      })
      console.log()
    })

  const totalGiroconti = giroconti.reduce((s, m) => s + Math.abs(parseFloat(m.importo)), 0)
  console.log(`\nTOTALE GIROCONTI: ${totalGiroconti.toFixed(2)}€`)
  console.log(`Numero gruppi diversi: ${Object.keys(byVendor).length}`)
}

analyzeGiroconti().catch(console.error)
