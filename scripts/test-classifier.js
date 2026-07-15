import { classifyMovement, filterOperationalMovements, getMovementStats } from '../lib/movement-classifier.js'

async function testClassifier() {
  const res = await fetch('http://localhost:3000/api/bank/movements?centro_id=1a72344b-aac1-465b-92d4-7e670f430340')
  const data = await res.json()
  const movements = data.movements

  // Filtra per anno 2025
  const movements2025 = movements.filter(m => m.data && m.data.startsWith('2025'))

  console.log('=== TEST CLASSIFICATORE MOVIMENTI 2025 ===\n')

  // Usa il classificatore
  const stats = getMovementStats(movements2025)

  console.log('📊 STATISTICHE CLASSIFICAZIONE:')
  console.log(`Totale movimenti: ${stats.totale}`)
  console.log(`- Operativi: ${stats.operativi.count} movimenti`)
  console.log(`- Tecnici: ${stats.tecnici.count} movimenti`)
  console.log(`- Finanziamenti: ${stats.finanziamenti.count} movimenti`)

  console.log('\n💰 ENTRATE OPERATIVE (FATTURATO REALE):')
  console.log(`Entrate: ${stats.operativi.entrate.toFixed(2)}€`)
  console.log(`Uscite: ${stats.operativi.uscite.toFixed(2)}€`)
  console.log(`Saldo: ${stats.operativi.saldo.toFixed(2)}€`)

  console.log('\n🏦 MOVIMENTI TECNICI (ESCLUSI):')
  console.log(`Totale: ${stats.tecnici.totale.toFixed(2)}€`)

  console.log('\n💵 FINANZIAMENTI (ESCLUSI):')
  console.log(`Totale: ${stats.finanziamenti.totale.toFixed(2)}€`)

  // Dettaglio entrate operative per categoria
  const operational = filterOperationalMovements(movements2025)
  const entrateOperative = operational.filter(m => m.tipo === 'entrata')

  const entratePerCat = {}
  entrateOperative.forEach(m => {
    const cat = m.categoria || 'Non categorizzato'
    if (!entratePerCat[cat]) entratePerCat[cat] = { count: 0, totale: 0 }
    entratePerCat[cat].count++
    entratePerCat[cat].totale += parseFloat(m.importo)
  })

  console.log('\n📂 ENTRATE OPERATIVE PER CATEGORIA:')
  Object.entries(entratePerCat)
    .sort((a, b) => b[1].totale - a[1].totale)
    .forEach(([cat, data]) => {
      console.log(`${cat}: ${data.count} movimenti = ${data.totale.toFixed(2)}€`)
    })

  // Verifica finanziamenti esclusi
  console.log('\n❌ FINANZIAMENTI ESCLUSI (dettaglio):')
  const finanziamenti = movements2025.filter(m => classifyMovement(m) === 'finanziamento')
  const finanzPerCat = {}
  finanziamenti.forEach(m => {
    const cat = m.categoria || 'Non categorizzato'
    if (!finanzPerCat[cat]) finanzPerCat[cat] = { count: 0, totale: 0 }
    finanzPerCat[cat].count++
    finanzPerCat[cat].totale += parseFloat(m.importo)
  })

  Object.entries(finanzPerCat)
    .sort((a, b) => b[1].totale - a[1].totale)
    .forEach(([cat, data]) => {
      console.log(`${cat}: ${data.count} movimenti = ${data.totale.toFixed(2)}€`)
    })
}

testClassifier().catch(console.error)
