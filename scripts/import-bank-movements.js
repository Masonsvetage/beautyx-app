import { createClient } from '@supabase/supabase-js'
import * as dotenv from 'dotenv'
import xlsx from 'xlsx'
import { fileURLToPath } from 'url'
import { dirname, join } from 'path'
import { readFileSync } from 'fs'

const __filename = fileURLToPath(import.meta.url)
const __dirname = dirname(__filename)

// Carica le variabili d'ambiente
dotenv.config({ path: join(__dirname, '..', '.env.local') })

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
const supabaseServiceKey = process.env.SUPABASE_SERVICE_KEY

if (!supabaseServiceKey) {
  console.error('❌ SUPABASE_SERVICE_KEY non trovata nel file .env.local')
  console.log('   Aggiungi questa riga al file .env.local:')
  console.log('   SUPABASE_SERVICE_KEY=your_service_key_here')
  console.log('\n   Puoi trovare la service key su:')
  console.log('   Supabase Dashboard > Project Settings > API > service_role key')
  process.exit(1)
}

const supabase = createClient(supabaseUrl, supabaseServiceKey)

// File da importare (tutti CSV per avere tutti i dati)
const files = [
  { path: 'Lista Movimenti_gen_mar.csv', type: 'csv' },
  { path: 'Lista Movimenti_CAI_apr_giu.csv', type: 'csv' },
  { path: 'Lista Movimenti_CAI_lug_sett.csv', type: 'csv' }
]

/**
 * Converte una data Excel in formato ISO
 */
function excelDateToISO(excelDate) {
  if (typeof excelDate === 'number') {
    // Excel memorizza le date come numero di giorni dal 1 gennaio 1900
    const date = new Date((excelDate - 25569) * 86400 * 1000)
    return date.toISOString().split('T')[0]
  }

  // Se è già una stringa, prova a parsarla
  if (typeof excelDate === 'string') {
    // Formato italiano: gg/mm/aaaa
    const parts = excelDate.split('/')
    if (parts.length === 3) {
      const [day, month, year] = parts
      return `${year}-${month.padStart(2, '0')}-${day.padStart(2, '0')}`
    }
  }

  return null
}

/**
 * Processa un file CSV e ritorna i movimenti bancari
 */
function processCSVFile(filePath, centroId) {
  console.log(`\n📄 Processando file CSV: ${filePath}`)

  const content = readFileSync(filePath, 'utf-8')
  const lines = content.split('\n')

  console.log(`   Trovate ${lines.length} righe totali`)

  // Trova la riga con l'intestazione "Data Op."
  let headerIndex = -1
  for (let i = 0; i < lines.length; i++) {
    if (lines[i].includes('Data Op.')) {
      headerIndex = i
      break
    }
  }

  if (headerIndex === -1) {
    console.log('   ⚠️ Intestazione non trovata')
    return []
  }

  console.log(`   📋 Intestazione trovata alla riga ${headerIndex + 1}`)

  const movements = []
  let skipped = 0

  // Processa le righe dopo l'intestazione
  for (let i = headerIndex + 1; i < lines.length; i++) {
    const line = lines[i].trim()
    if (!line) {
      skipped++
      continue
    }

    // Dividi per punto e virgola
    const fields = line.split(';')

    if (fields.length < 5) {
      skipped++
      continue
    }

    const dataOp = fields[0]
    const causale = fields[2]
    const descrizione = fields[3]
    const importoStr = fields[4]

    // Salta righe senza dati essenziali
    if (!dataOp || !importoStr) {
      skipped++
      continue
    }

    // Converti la data
    const data = excelDateToISO(dataOp)
    if (!data) {
      skipped++
      continue
    }

    // Processa l'importo (formato CSV: -1.403,93)
    let importo = 0
    let tipo = 'entrata'

    const cleanImporto = importoStr.trim()
      .replace(/\./g, '')  // Rimuovi punti (separatore migliaia)
      .replace(',', '.')   // Sostituisci virgola con punto (separatore decimale)

    if (cleanImporto.startsWith('-')) {
      tipo = 'uscita'
      importo = Math.abs(parseFloat(cleanImporto))
    } else {
      tipo = 'entrata'
      importo = parseFloat(cleanImporto)
    }

    // Salta righe con importo non valido
    if (isNaN(importo) || importo === 0) {
      skipped++
      continue
    }

    movements.push({
      centro_id: centroId,
      data: data,
      tipo: tipo,
      importo: importo,
      categoria: causale || 'Non specificata',
      descrizione: descrizione || ''
    })
  }

  console.log(`   ✅ ${movements.length} movimenti validi`)
  if (skipped > 0) {
    console.log(`   ⚠️ ${skipped} righe saltate (dati mancanti)`)
  }

  return movements
}

/**
 * Processa un file Excel e ritorna i movimenti bancari
 */
function processExcelFile(filePath, centroId) {
  console.log(`\n📄 Processando file: ${filePath}`)

  const workbook = xlsx.readFile(filePath)
  const sheetName = workbook.SheetNames[0]
  const sheet = workbook.Sheets[sheetName]

  // Converti il foglio in array di array, partendo dalla riga 12 (indice 11)
  // Le righe 1-10 sono intestazione, riga 11 sono i nomi colonne, dati dalla 12
  let data = xlsx.utils.sheet_to_json(sheet, {
    header: 1, // Ritorna array di array invece di oggetti
    range: 11, // Parte dalla riga 12 (indice 11)
    raw: false,
    defval: null
  })

  console.log(`   Trovate ${data.length} righe di dati`)

  // Debug: mostra la prima riga di dati
  if (data.length > 0) {
    console.log(`   📋 Prima riga:`, data[0])

    // Se la prima riga contiene "Data Op.", è l'intestazione, quindi skippa
    if (data[0] && data[0][0] === 'Data Op.') {
      console.log(`   ℹ️ Intestazione trovata alla riga 12, skippo...`)
      data = data.slice(1) // Rimuovi la prima riga (intestazione)
    }
  }

  const movements = []
  let skipped = 0

  for (const row of data) {
    // I dati sono posizionali:
    // [0] = Data Op.
    // [1] = Data Val.
    // [2] = Causale
    // [3] = Descrizione
    // [4] = Importo
    // [5] = Div.

    const dataOp = row[0]
    const causale = row[2]
    const descrizione = row[3]
    const importoStr = row[4]

    // Salta righe senza dati essenziali o righe vuote
    if (!dataOp || !importoStr || row.length === 0) {
      skipped++
      continue
    }

    // Converti la data
    const data = excelDateToISO(dataOp)
    if (!data) {
      console.warn(`   ⚠️ Data non valida: ${dataOp}`)
      skipped++
      continue
    }

    // Processa l'importo
    let importo = 0
    let tipo = 'entrata'

    if (typeof importoStr === 'string') {
      // Rimuovi spazi
      let cleanImporto = importoStr.trim()

      // Gestisci parentesi come segno negativo (es: "(93.50)" = -93.50)
      const hasParentheses = cleanImporto.startsWith('(') && cleanImporto.endsWith(')')
      if (hasParentheses) {
        tipo = 'uscita'
        cleanImporto = cleanImporto.slice(1, -1) // Rimuovi le parentesi
      }

      // Rimuovi spazi interni
      cleanImporto = cleanImporto.replace(/\s/g, '')

      // Gestisci separatori di migliaia e decimali
      // Se contiene sia virgola che punto, determina quale è il separatore decimale
      const lastComma = cleanImporto.lastIndexOf(',')
      const lastDot = cleanImporto.lastIndexOf('.')

      if (lastComma > lastDot) {
        // La virgola è il separatore decimale (formato italiano/tedesco)
        cleanImporto = cleanImporto.replace(/\./g, '').replace(',', '.')
      } else if (lastDot > lastComma) {
        // Il punto è il separatore decimale (formato inglese)
        cleanImporto = cleanImporto.replace(/,/g, '')
      }

      // Se inizia con '-', è un'uscita
      if (cleanImporto.startsWith('-')) {
        tipo = 'uscita'
        cleanImporto = cleanImporto.substring(1)
      }

      importo = parseFloat(cleanImporto)
    } else {
      importo = parseFloat(importoStr)
      if (importo < 0) {
        tipo = 'uscita'
        importo = Math.abs(importo)
      }
    }

    // Salta righe con importo non valido
    if (isNaN(importo) || importo === 0) {
      skipped++
      continue
    }

    movements.push({
      centro_id: centroId,
      data: data,
      tipo: tipo,
      importo: importo,
      categoria: causale || 'Non specificata',
      descrizione: descrizione || ''
    })
  }

  console.log(`   ✅ ${movements.length} movimenti validi`)
  if (skipped > 0) {
    console.log(`   ⚠️ ${skipped} righe saltate (dati mancanti)`)
  }

  return movements
}

/**
 * Importa tutti i movimenti bancari
 */
async function importBankMovements() {
  console.log('🏦 Inizio import movimenti bancari...\n')

  try {
    // 1. Recupera il primo centro di esempio (o crea uno di default)
    console.log('🔍 Recupero centro di esempio...')
    const { data: centers, error: centerError } = await supabase
      .from('beauty_centers')
      .select('id')
      .limit(1)

    if (centerError) {
      console.error('❌ Errore recupero centro:', centerError)
      process.exit(1)
    }

    if (!centers || centers.length === 0) {
      console.error('❌ Nessun centro trovato! Esegui prima lo script seed-beauty-centers.js')
      process.exit(1)
    }

    const centroId = centers[0].id
    console.log(`✅ Centro trovato: ${centroId}\n`)

    // 2. Processa tutti i file (Excel e CSV)
    const allMovements = []

    for (const fileInfo of files) {
      const filePath = join(__dirname, '..', fileInfo.path)
      try {
        let movements
        if (fileInfo.type === 'csv') {
          movements = processCSVFile(filePath, centroId)
        } else {
          movements = processExcelFile(filePath, centroId)
        }
        allMovements.push(...movements)
      } catch (error) {
        console.error(`❌ Errore nel file ${fileInfo.path}:`, error.message)
      }
    }

    console.log(`\n📊 Totale movimenti da importare: ${allMovements.length}`)

    if (allMovements.length === 0) {
      console.log('⚠️ Nessun movimento da importare!')
      return
    }

    // 3. Inserisci i movimenti in batch (Supabase ha un limite di ~1000 righe per insert)
    const batchSize = 500
    let totalInserted = 0

    for (let i = 0; i < allMovements.length; i += batchSize) {
      const batch = allMovements.slice(i, i + batchSize)

      console.log(`\n💾 Inserimento batch ${Math.floor(i / batchSize) + 1} (${batch.length} movimenti)...`)

      const { data, error } = await supabase
        .from('bank_movements')
        .insert(batch)
        .select()

      if (error) {
        console.error('❌ Errore durante l\'inserimento:', error)
        throw error
      }

      totalInserted += batch.length
      console.log(`✅ Batch inserito con successo`)
    }

    console.log(`\n✨ Import completato con successo!`)
    console.log(`📊 Totale movimenti inseriti: ${totalInserted}`)

    // 4. Mostra statistiche
    const { data: stats } = await supabase
      .from('bank_movements')
      .select('tipo, importo')
      .eq('centro_id', centroId)

    if (stats) {
      const entrate = stats.filter(m => m.tipo === 'entrata')
      const uscite = stats.filter(m => m.tipo === 'uscita')

      const totaleEntrate = entrate.reduce((sum, m) => sum + parseFloat(m.importo), 0)
      const totaleUscite = uscite.reduce((sum, m) => sum + parseFloat(m.importo), 0)

      console.log('\n📈 Statistiche:')
      console.log(`   Entrate: ${entrate.length} movimenti - €${totaleEntrate.toFixed(2)}`)
      console.log(`   Uscite: ${uscite.length} movimenti - €${totaleUscite.toFixed(2)}`)
      console.log(`   Saldo: €${(totaleEntrate - totaleUscite).toFixed(2)}`)
    }

  } catch (err) {
    console.error('❌ Errore:', err)
    process.exit(1)
  }
}

// Esegui l'import
importBankMovements()
