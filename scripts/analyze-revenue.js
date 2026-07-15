async function analyzeRevenue() {
  const res = await fetch('http://localhost:3000/api/bank/movements?centro_id=1a72344b-aac1-465b-92d4-7e670f430340')
  const data = await res.json()
  const movements = data.movements

  // Filtra per anno 2025
  const movements2025 = movements.filter(m => m.data && m.data.startsWith('2025'))

  const entrate = movements2025.filter(m => m.tipo === 'entrata')
  const uscite = movements2025.filter(m => m.tipo === 'uscita')

  console.log('=== ANALISI MOVIMENTI 2025 ===')
  console.log('Totale movimenti 2025:', movements2025.length)
  console.log('Entrate:', entrate.length)
  console.log('Uscite:', uscite.length)

  // Raggruppa entrate per categoria
  const entratePerCategoria = {}
  entrate.forEach(m => {
    const cat = m.categoria || 'Non categorizzato'
    if (!entratePerCategoria[cat]) {
      entratePerCategoria[cat] = { count: 0, totale: 0, esempi: [] }
    }
    entratePerCategoria[cat].count++
    entratePerCategoria[cat].totale += parseFloat(m.importo)
    if (entratePerCategoria[cat].esempi.length < 3) {
      entratePerCategoria[cat].esempi.push({
        data: m.data,
        importo: m.importo,
        descrizione: (m.descrizione || '').substring(0, 60)
      })
    }
  })

  console.log('\n=== ENTRATE 2025 PER CATEGORIA ===')
  Object.entries(entratePerCategoria)
    .sort((a, b) => b[1].totale - a[1].totale)
    .forEach(([cat, data]) => {
      console.log(`\n${cat}: ${data.count} movimenti = ${data.totale.toFixed(2)}€`)
      console.log('Esempi:')
      data.esempi.forEach(e => {
        console.log(`  - ${e.data} ${e.importo}€: ${e.descrizione}`)
      })
    })

  const totaleEntrate = entrate.reduce((sum, m) => sum + parseFloat(m.importo), 0)
  const totaleUscite = uscite.reduce((sum, m) => sum + Math.abs(parseFloat(m.importo)), 0)

  console.log('\n=== TOTALI 2025 ===')
  console.log('TOTALE ENTRATE:', totaleEntrate.toFixed(2), '€')
  console.log('TOTALE USCITE:', totaleUscite.toFixed(2), '€')
  console.log('SALDO:', (totaleEntrate - totaleUscite).toFixed(2), '€')
}

analyzeRevenue().catch(console.error)
