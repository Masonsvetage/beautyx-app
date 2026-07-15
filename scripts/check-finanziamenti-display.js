import { filterOperationalMovements, classifyMovement } from '../lib/movement-classifier.js'

async function checkFinanziamenti() {
  const res = await fetch('http://localhost:3000/api/bank/movements?centro_id=1a72344b-aac1-465b-92d4-7e670f430340')
  const data = await res.json()
  const movements = data.movements

  const movements2025 = movements.filter(m => m.data && m.data.startsWith('2025'))

  console.log('=== ANALISI CATEGORIA FINANZIAMENTI ===\n')

  // Movimenti con categoria Finanziamenti
  const catFinanziamenti = movements2025.filter(m => m.categoria === 'Finanziamenti')
  console.log(`Movimenti con categoria "Finanziamenti": ${catFinanziamenti.length}`)

  // Come vengono classificati dal classifier?
  const classificati = {
    operativo: 0,
    tecnico: 0,
    finanziamento: 0
  }

  catFinanziamenti.forEach(m => {
    const tipo = classifyMovement(m)
    classificati[tipo]++
  })

  console.log('\nClassificazione movimenti con categoria "Finanziamenti":')
  console.log(`- Operativi: ${classificati.operativo}`)
  console.log(`- Tecnici: ${classificati.tecnico}`)
  console.log(`- Finanziamenti: ${classificati.finanziamento}`)

  // Totali
  const totaleEntrate = catFinanziamenti
    .filter(m => m.tipo === 'entrata')
    .reduce((s, m) => s + parseFloat(m.importo), 0)

  const totaleUscite = catFinanziamenti
    .filter(m => m.tipo === 'uscita')
    .reduce((s, m) => s + Math.abs(parseFloat(m.importo)), 0)

  console.log(`\nTotale Entrate categoria Finanziamenti: ${totaleEntrate.toFixed(2)}€`)
  console.log(`Totale Uscite categoria Finanziamenti: ${totaleUscite.toFixed(2)}€`)

  // Verifica se vengono esclusi da operativi
  const operational = filterOperationalMovements(movements2025)
  const finanzInOperational = operational.filter(m => m.categoria === 'Finanziamenti')

  console.log(`\n⚠️ Movimenti "Finanziamenti" nei movimenti OPERATIVI: ${finanzInOperational.length}`)
  console.log(`❌ Movimenti "Finanziamenti" ESCLUSI: ${catFinanziamenti.length - finanzInOperational.length}`)
}

checkFinanziamenti().catch(console.error)
