import { createClient } from '@supabase/supabase-js'
import * as dotenv from 'dotenv'
import { fileURLToPath } from 'url'
import { dirname, join } from 'path'

const __filename = fileURLToPath(import.meta.url)
const __dirname = dirname(__filename)

dotenv.config({ path: join(__dirname, '..', '.env.local') })

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
const supabaseServiceKey = process.env.SUPABASE_SERVICE_KEY

const supabase = createClient(supabaseUrl, supabaseServiceKey)

/**
 * Estrae il nome del fornitore dalla descrizione
 * Rimuove dettagli tecnici e mantiene solo l'essenziale
 */
function extractVendorName(descrizione, causale) {
  if (!descrizione) return causale || 'Non specificato'

  let vendor = descrizione.trim()

  // Rimuovi spazi multipli
  vendor = vendor.replace(/\s+/g, ' ')

  // Pattern comuni da rimuovere
  const patternsToRemove = [
    /\d{2}\/\d{2}\/\d{2,4}/g,  // Date
    /\d{6,}/g,                  // Numeri lunghi (riferimenti)
    /KEY:[^\s]+/gi,             // Key references
    /SCT:[^\s]+/gi,             // SCT references
    /V\/ORDINE/gi,
    /DESCR\.OPERAZIONE/gi,
    /IDENTIFICATIVO/gi,
    /DEL \d{2}\/\d{2}\/\d{2}/gi,
    /<\*>/g,
    /\s{2,}/g                   // Spazi multipli
  ]

  patternsToRemove.forEach(pattern => {
    vendor = vendor.replace(pattern, ' ')
  })

  // Estrai la parte più significativa (prime parole)
  const words = vendor.trim().split(/\s+/)

  // Se inizia con nomi comuni di servizi, prendili
  const significantWords = []
  for (let i = 0; i < Math.min(3, words.length); i++) {
    const word = words[i]
    if (word.length > 2 && !word.match(/^\d+$/)) {
      significantWords.push(word)
    }
  }

  return significantWords.length > 0
    ? significantWords.join(' ').substring(0, 50)
    : causale || 'Non specificato'
}

async function analyzeMovements() {
  console.log('📊 Analisi movimenti bancari...\n')

  try {
    // Recupera tutti i movimenti
    const { data: movements, error } = await supabase
      .from('bank_movements')
      .select('*')
      .order('data', { ascending: false })

    if (error) throw error

    console.log(`✅ Trovati ${movements.length} movimenti\n`)

    // Raggruppa per fornitore/descrizione
    const vendorsMap = new Map()

    movements.forEach(mov => {
      const vendor = extractVendorName(mov.descrizione, mov.categoria)

      if (!vendorsMap.has(vendor)) {
        vendorsMap.set(vendor, {
          vendor: vendor,
          causale: mov.categoria,
          count: 0,
          totalAmount: 0,
          tipo: mov.tipo,
          esempiDescrizioni: []
        })
      }

      const info = vendorsMap.get(vendor)
      info.count++
      info.totalAmount += parseFloat(mov.importo)

      // Salva max 3 esempi di descrizioni
      if (info.esempiDescrizioni.length < 3) {
        info.esempiDescrizioni.push(mov.descrizione?.substring(0, 100))
      }
    })

    // Converti in array e ordina per count
    const vendors = Array.from(vendorsMap.values())
      .sort((a, b) => b.count - a.count)

    console.log(`📋 Fornitori/Descrizioni univoche trovate: ${vendors.length}\n`)
    console.log('Top 30 fornitori per numero di transazioni:\n')
    console.log('─'.repeat(100))
    console.log(
      'Fornitore'.padEnd(40) +
      'Causale'.padEnd(25) +
      'N°'.padStart(6) +
      'Totale'.padStart(15) +
      'Tipo'.padStart(10)
    )
    console.log('─'.repeat(100))

    vendors.slice(0, 30).forEach(v => {
      console.log(
        v.vendor.substring(0, 39).padEnd(40) +
        v.causale.substring(0, 24).padEnd(25) +
        v.count.toString().padStart(6) +
        `€${v.totalAmount.toFixed(2)}`.padStart(15) +
        v.tipo.padStart(10)
      )
    })

    console.log('─'.repeat(100))
    console.log(`\n📊 Statistiche:`)
    console.log(`   Totale fornitori univoci: ${vendors.length}`)
    console.log(`   Fornitori con 1 sola transazione: ${vendors.filter(v => v.count === 1).length}`)
    console.log(`   Fornitori con >5 transazioni: ${vendors.filter(v => v.count > 5).length}`)
    console.log(`   Fornitori con >10 transazioni: ${vendors.filter(v => v.count > 10).length}`)

    // Salva il risultato in un file JSON
    const fs = await import('fs')
    const outputPath = join(__dirname, '..', 'vendors-to-categorize.json')
    fs.writeFileSync(outputPath, JSON.stringify(vendors, null, 2))
    console.log(`\n💾 Elenco completo salvato in: vendors-to-categorize.json`)

  } catch (err) {
    console.error('❌ Errore:', err)
    process.exit(1)
  }
}

analyzeMovements()
