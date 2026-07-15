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
 * (stessa funzione usata in analyze-bank-movements.js)
 */
function extractVendorName(descrizione, causale) {
  if (!descrizione) return causale || 'Non specificato'

  let vendor = descrizione.trim()
  vendor = vendor.replace(/\s+/g, ' ')

  const patternsToRemove = [
    /\d{2}\/\d{2}\/\d{2,4}/g,
    /\d{6,}/g,
    /KEY:[^\s]+/gi,
    /SCT:[^\s]+/gi,
    /V\/ORDINE/gi,
    /DESCR\.OPERAZIONE/gi,
    /IDENTIFICATIVO/gi,
    /DEL \d{2}\/\d{2}\/\d{2}/gi,
    /<\*>/g,
    /\s{2,}/g
  ]

  patternsToRemove.forEach(pattern => {
    vendor = vendor.replace(pattern, ' ')
  })

  const words = vendor.trim().split(/\s+/)
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

async function applyCategories() {
  console.log('🔄 Applicazione categorie ai movimenti bancari\n')

  try {
    // 1. Recupera tutti i vendor mappings
    const { data: mappings, error: mapError } = await supabase
      .from('vendor_mappings')
      .select('*, categories(nome)')

    if (mapError) {
      console.error('❌ Errore recupero mappings:', mapError.message)
      process.exit(1)
    }

    console.log(`✅ Trovati ${mappings.length} mapping\n`)

    // Crea una mappa vendor_key -> categoria
    const vendorMap = new Map()
    mappings.forEach(m => {
      const categoryName = m.categories?.nome || m.categoria_custom || 'Non categorizzato'
      vendorMap.set(m.vendor_key, categoryName)
    })

    // 2. Recupera tutti i movimenti
    const { data: movements, error: movError } = await supabase
      .from('bank_movements')
      .select('*')

    if (movError) {
      console.error('❌ Errore recupero movimenti:', movError.message)
      process.exit(1)
    }

    console.log(`✅ Trovati ${movements.length} movimenti da aggiornare\n`)

    // 3. Aggiorna i movimenti con le categorie
    let updated = 0
    let notFound = 0
    const batchSize = 100

    for (let i = 0; i < movements.length; i += batchSize) {
      const batch = movements.slice(i, i + batchSize)

      const updates = batch.map(mov => {
        const vendorKey = extractVendorName(mov.descrizione, mov.categoria).toLowerCase().trim()
        const newCategory = vendorMap.get(vendorKey)

        if (newCategory) {
          updated++
        } else {
          notFound++
        }

        // Mantieni tutti i campi obbligatori
        return {
          id: mov.id,
          centro_id: mov.centro_id,
          data: mov.data,
          tipo: mov.tipo,
          importo: mov.importo,
          categoria: newCategory || mov.categoria,
          descrizione: mov.descrizione
        }
      })

      // Aggiorna il batch
      const { error: updateError } = await supabase
        .from('bank_movements')
        .upsert(updates, {
          onConflict: 'id'
        })

      if (updateError) {
        console.error('❌ Errore aggiornamento batch:', updateError.message)
      } else {
        console.log(`✓ Aggiornati ${Math.min(i + batchSize, movements.length)}/${movements.length} movimenti`)
      }
    }

    console.log('\n✅ Categorizzazione completata!\n')
    console.log('📊 Statistiche:')
    console.log(`   Movimenti categorizzati: ${updated}`)
    console.log(`   Movimenti senza categoria: ${notFound}`)

    // 4. Mostra riepilogo per categoria
    const { data: summary } = await supabase
      .from('bank_movements')
      .select('categoria, tipo, importo')

    if (summary) {
      const categoryStats = new Map()

      summary.forEach(mov => {
        if (!categoryStats.has(mov.categoria)) {
          categoryStats.set(mov.categoria, {
            entrate: 0,
            uscite: 0,
            count: 0
          })
        }

        const stat = categoryStats.get(mov.categoria)
        stat.count++

        if (mov.tipo === 'entrata') {
          stat.entrate += parseFloat(mov.importo)
        } else {
          stat.uscite += parseFloat(mov.importo)
        }
      })

      console.log('\n📈 Riepilogo per categoria:\n')
      console.log('─'.repeat(90))
      console.log(
        'Categoria'.padEnd(35) +
        'Transazioni'.padStart(15) +
        'Entrate'.padStart(20) +
        'Uscite'.padStart(20)
      )
      console.log('─'.repeat(90))

      Array.from(categoryStats.entries())
        .sort((a, b) => b[1].count - a[1].count)
        .forEach(([cat, stats]) => {
          console.log(
            cat.substring(0, 34).padEnd(35) +
            stats.count.toString().padStart(15) +
            `€${stats.entrate.toFixed(2)}`.padStart(20) +
            `€${stats.uscite.toFixed(2)}`.padStart(20)
          )
        })

      console.log('─'.repeat(90))
    }

  } catch (err) {
    console.error('❌ Errore:', err.message)
    process.exit(1)
  }
}

applyCategories()
