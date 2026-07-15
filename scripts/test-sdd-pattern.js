// Test rapido pattern matching
const testDescriptions = [
  "SDD A : NEXI S.P.A. CORSO SEMP ADDEBITO SPESE CARTA",
  "SDD A : NEXI PAYMENTS SPA PV 7568416 ADDEBITO",
  "Spese di gestione POS (canone, commissioni)"
]

const patterns = [
  { name: "sdd nexi", value: "sdd nexi" },
  { name: "sdd a", value: "sdd a" },
  { name: "sdd", value: "sdd" },
  { name: "spese pos", value: "spese pos" },
  { name: "addebito nexi", value: "addebito nexi" }
]

console.log('\n🧪 Test Pattern Matching\n')
console.log('='.repeat(80))

testDescriptions.forEach((desc, idx) => {
  console.log(`\n${idx + 1}. "${desc.substring(0, 60)}..."`)
  const descLower = desc.toLowerCase()

  patterns.forEach(p => {
    const match = descLower.includes(p.value)
    console.log(`   ${match ? '✅' : '❌'} "${p.name}" ${match ? 'MATCH' : 'NO'}`)
  })
})

console.log('\n' + '='.repeat(80))
console.log('\n💡 Risultato: Usare "sdd a" invece di "sdd nexi"\n')
