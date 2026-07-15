async function analyzePOS() {
  const res = await fetch('http://localhost:3000/api/bank/movements?centro_id=1a72344b-aac1-465b-92d4-7e670f430340')
  const data = await res.json()
  const movements = data.movements

  // Filtra POS 2025
  const pos2025 = movements.filter(m =>
    m.data && m.data.startsWith('2025') &&
    m.tipo === 'entrata' &&
    m.categoria === 'POS'
  )

  console.log(`=== ANALISI ${pos2025.length} MOVIMENTI POS 2025 ===\n`)

  // Cerca anticipi
  const anticipi = pos2025.filter(m => {
    const desc = (m.descrizione || '').toUpperCase()
    return desc.includes('ANTICIPO') || desc.includes('APERTURA ANTICIPO')
  })

  const incassiReali = pos2025.filter(m => {
    const desc = (m.descrizione || '').toUpperCase()
    return !desc.includes('ANTICIPO') && !desc.includes('APERTURA ANTICIPO')
  })

  console.log('ANTICIPI POS (da escludere):')
  console.log(`Numero: ${anticipi.length}`)
  console.log(`Totale: ${anticipi.reduce((s, m) => s + parseFloat(m.importo), 0).toFixed(2)}€`)
  if (anticipi.length > 0) {
    console.log('Esempi:')
    anticipi.slice(0, 5).forEach(m => {
      console.log(`  - ${m.data} ${m.importo}€: ${(m.descrizione || '').substring(0, 70)}`)
    })
  }

  console.log('\nINCASSI POS REALI:')
  console.log(`Numero: ${incassiReali.length}`)
  console.log(`Totale: ${incassiReali.reduce((s, m) => s + parseFloat(m.importo), 0).toFixed(2)}€`)
  console.log('Esempi ultimi 5:')
  incassiReali.slice(0, 5).forEach(m => {
    console.log(`  - ${m.data} ${m.importo}€: ${(m.descrizione || '').substring(0, 70)}`)
  })

  // Cerca anche giroconti
  const giroconti = movements.filter(m =>
    m.data && m.data.startsWith('2025') &&
    m.categoria === 'Giroconti'
  )

  console.log('\n=== GIROCONTI 2025 ===')
  console.log(`Trovati: ${giroconti.length} movimenti`)
  if (giroconti.length > 0) {
    const girEntrate = giroconti.filter(m => m.tipo === 'entrata')
    const girUscite = giroconti.filter(m => m.tipo === 'uscita')
    console.log(`Entrate: ${girEntrate.length} = ${girEntrate.reduce((s, m) => s + parseFloat(m.importo), 0).toFixed(2)}€`)
    console.log(`Uscite: ${girUscite.length} = ${girUscite.reduce((s, m) => s + Math.abs(parseFloat(m.importo)), 0).toFixed(2)}€`)
  }
}

analyzePOS().catch(console.error)
