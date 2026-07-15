import XLSX from 'xlsx'

const filePath = process.argv[2] || 'Lista Movimenti_CAI_apr_giu.xlsx'

try {
  console.log('📂 Lettura file:', filePath)

  const workbook = XLSX.readFile(filePath)
  const sheetName = workbook.SheetNames[0]
  console.log('📄 Foglio:', sheetName)

  const worksheet = workbook.Sheets[sheetName]
  const data = XLSX.utils.sheet_to_json(worksheet)

  console.log('\n📊 Numero totale di righe:', data.length)

  if (data.length > 0) {
    console.log('\n📋 Colonne trovate:')
    const columns = Object.keys(data[0])
    columns.forEach((col, idx) => {
      console.log(`  ${idx + 1}. ${col}`)
    })

    console.log('\n📝 Prime 5 righe:')
    const preview = data.slice(0, 5)
    console.log(JSON.stringify(preview, null, 2))
  } else {
    console.log('⚠️  Nessun dato trovato nel file')
  }

} catch (error) {
  console.error('❌ Errore durante la lettura:', error.message)
}
