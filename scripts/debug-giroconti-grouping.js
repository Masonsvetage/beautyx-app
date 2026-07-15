import { extractVendorKey } from '../lib/vendor-utils.js'

async function debugGiroconti() {
  const res = await fetch('http://localhost:3000/api/bank/movements?centro_id=1a72344b-aac1-465b-92d4-7e670f430340')
  const data = await res.json()
  const movements = data.movements

  // Filtra movimenti con categoria Giroconti
  const giroconti = movements.filter(m => m.categoria === 'Giroconti')

  console.log(`\n=== ANALISI ${giroconti.length} MOVIMENTI CON CATEGORIA "Giroconti" ===\n`)

  // Raggruppa per vendorKey (come fa GroupedView)
  const byVendorKey = {}
  giroconti.forEach(m => {
    const vendorKey = extractVendorKey(m.descrizione)
    if (!byVendorKey[vendorKey]) {
      byVendorKey[vendorKey] = {
        movements: [],
        totalAmount: 0
      }
    }
    byVendorKey[vendorKey].movements.push(m)
    byVendorKey[vendorKey].totalAmount += Math.abs(parseFloat(m.importo))
  })

  console.log(`RAGGRUPPATI IN ${Object.keys(byVendorKey).length} GRUPPI:\n`)

  Object.entries(byVendorKey)
    .sort((a, b) => b[1].totalAmount - a[1].totalAmount)
    .forEach(([vendorKey, data]) => {
      console.log(`VendorKey: "${vendorKey}"`)
      console.log(`  Movimenti: ${data.movements.length}`)
      console.log(`  Totale: ${data.totalAmount.toFixed(2)}€`)
      console.log(`  Esempi descrizioni:`)
      data.movements.slice(0, 3).forEach(m => {
        console.log(`    - ${m.data}: ${m.descrizione.substring(0, 60)}`)
      })
      console.log()
    })

  // Verifica se ci sono movimenti con stessa descrizione base ma categoria diversa
  console.log('\n=== VERIFICA INCONSISTENZE ===\n')

  const allMovements = movements
  const giroVendorKeys = new Set(Object.keys(byVendorKey))

  console.log('Cerco movimenti con stesso vendorKey ma categoria diversa da "Giroconti"...\n')

  giroVendorKeys.forEach(vendorKey => {
    const movementsWithSameKey = allMovements.filter(m => extractVendorKey(m.descrizione) === vendorKey)
    const categoriesInGroup = new Set(movementsWithSameKey.map(m => m.categoria))

    if (categoriesInGroup.size > 1) {
      console.log(`⚠️ TROVATO GRUPPO CON CATEGORIE MISTE!`)
      console.log(`VendorKey: "${vendorKey}"`)
      console.log(`Categorie nel gruppo:`)
      categoriesInGroup.forEach(cat => {
        const count = movementsWithSameKey.filter(m => m.categoria === cat).length
        console.log(`  - ${cat}: ${count} movimenti`)
      })
      console.log()
    }
  })
}

debugGiroconti().catch(console.error)
