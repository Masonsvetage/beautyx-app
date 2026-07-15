import XLSX from 'xlsx'

const filePath = process.argv[2] || 'Lista Movimenti_CAI_apr_giu.xlsx'

try {
  console.log('📂 Lettura file:', filePath)

  const workbook = XLSX.readFile(filePath)
  const sheetName = workbook.SheetNames[0]
  console.log('📄 Foglio:', sheetName)

  const worksheet = workbook.Sheets[sheetName]

  // Leggi senza header per vedere la struttura grezza
  const data = XLSX.utils.sheet_to_json(worksheet, { header: 1 })

  console.log('\n📊 Numero totale di righe:', data.length)
  console.log('\n📝 Tutte le righe:\n')

  data.forEach((row, idx) => {
    console.log(`Riga ${idx + 1}:`, JSON.stringify(row))
  })

} catch (error) {
  console.error('❌ Errore durante la lettura:', error.message)
}
