import { createClient } from '@supabase/supabase-js'
import * as dotenv from 'dotenv'
import { fileURLToPath } from 'url'
import { dirname, join } from 'path'
import { readFileSync, writeFileSync } from 'fs'
import readline from 'readline'

const __filename = fileURLToPath(import.meta.url)
const __dirname = dirname(__filename)

dotenv.config({ path: join(__dirname, '..', '.env.local') })

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
const supabaseServiceKey = process.env.SUPABASE_SERVICE_KEY

const supabase = createClient(supabaseUrl, supabaseServiceKey)

// Mapping automatico basato su pattern comuni
const AUTO_MAPPINGS = {
  // ENTRATE
  'INCASSO POS NEXI': 'POS',
  'INCASSO POS BANCOMAT': 'POS',
  'INCASSO POS': 'POS',
  'INCASSO TRAMITE POS': 'POS',
  'VERSAMENTO CONTANTI': 'Contanti',
  'VERSAMENTO CONTANTE': 'Contanti',
  'BONIFICO': 'Bonifici',
  'GIROCONTO': 'Bonifici',
  'ORD:': 'Bonifici',

  // USCITE - Utenze
  'SDD': 'Utenze',
  'PAGAMENTO UTENZE': 'Utenze',
  'PAGAMENTO INCASSI VARI': 'Utenze',
  'ADDEBITO UTENZE': 'Utenze',

  // USCITE - Tributi
  'I24 WEB': 'Tributi Correnti',
  'F24': 'Tributi Correnti',
  'FNHBA': 'Tributi Correnti',
  'IMPOSTE E TASSE': 'Tributi Correnti',
  'BOLLO': 'Tributi Correnti',

  // USCITE - Finanziamenti
  'PAG.RATA': 'Finanziamenti',
  'PAGAMENTO RATE': 'Finanziamenti',
  'ADD.PREMIO POLIZZA': 'Finanziamenti',

  // USCITE - Personale (prelievi titolare)
  'CC8ZP SVET': 'Personale',
  'SVET MONICA OCTAVIANA': 'Personale',
  'SVET MONICA': 'Personale',

  // USCITE - Commissioni Bancarie
  'COMMISSIONI BONIFICO': 'Commissioni Bancarie',
  'COMMISSIONI SU BONIFICO': 'Commissioni Bancarie',
  'COMMIS.SU ADDEB': 'Commissioni Bancarie',
  'COMMISSIONI INCASSI': 'Commissioni Bancarie',
  'COMMISSIONI ADDEBITO': 'Commissioni Bancarie',
  'CANONE MENSILE': 'Commissioni Bancarie',
  'SPESE GESTIONE': 'Commissioni Bancarie',
  'COMPETENZE LIQUIDAZIONE': 'Commissioni Bancarie',
  'INTERESSI/COMPETENZE': 'Commissioni Bancarie',

  // Giroconti (movimenti interni, non entrate/uscite reali)
  'GIRO C/C': 'Giroconti',
  'GIRO A C/C': 'Giroconti',
  'RETTIFICA IMPORTO': 'Giroconti',
  'GIROCONTO COMP': 'Giroconti',

  // Effetti
  'PAG.EFF.': 'Altre Uscite'
}

/**
 * Cerca di mappare automaticamente un fornitore a una categoria
 */
function autoMapCategory(vendor) {
  const vendorUpper = vendor.toUpperCase()

  for (const [pattern, category] of Object.entries(AUTO_MAPPINGS)) {
    if (vendorUpper.includes(pattern)) {
      return category
    }
  }

  return null
}

async function categorizeVendors() {
  console.log('🏷️  Categorizzazione fornitori\n')

  try {
    // 1. Carica i fornitori dal JSON
    const vendorsPath = join(__dirname, '..', 'vendors-to-categorize.json')
    const vendors = JSON.parse(readFileSync(vendorsPath, 'utf-8'))

    console.log(`📋 Trovati ${vendors.length} fornitori da categorizzare\n`)

    // 2. Recupera le categorie disponibili
    const { data: categories, error: catError } = await supabase
      .from('categories')
      .select('*')
      .order('nome')

    if (catError) {
      console.error('❌ Errore recupero categorie:', catError.message)
      console.log('\n⚠️ Assicurati di aver eseguito la migrazione SQL prima!')
      process.exit(1)
    }

    console.log(`✅ Categorie disponibili: ${categories.length}\n`)

    // 3. Recupera il centro ID
    const { data: centers } = await supabase
      .from('beauty_centers')
      .select('id')
      .limit(1)

    const centroId = centers[0].id

    // 4. Mappa automaticamente i fornitori
    const mappings = []

    for (const vendor of vendors) {
      const autoCategory = autoMapCategory(vendor.vendor)

      if (autoCategory) {
        const category = categories.find(c => c.nome === autoCategory)

        mappings.push({
          centro_id: centroId,
          vendor_key: vendor.vendor.toLowerCase().trim(),
          vendor_display: vendor.vendor,
          category_id: category?.id || null,
          categoria_custom: category ? null : autoCategory
        })

        console.log(`✓ ${vendor.vendor.padEnd(40)} → ${autoCategory}`)
      } else {
        // Non mappato automaticamente
        mappings.push({
          centro_id: centroId,
          vendor_key: vendor.vendor.toLowerCase().trim(),
          vendor_display: vendor.vendor,
          category_id: null,
          categoria_custom: 'Non categorizzato'
        })

        console.log(`? ${vendor.vendor.padEnd(40)} → Non categorizzato`)
      }
    }

    // 5. Salva i mapping nel database
    console.log(`\n💾 Salvataggio ${mappings.length} mapping...`)

    const { error: insertError } = await supabase
      .from('vendor_mappings')
      .upsert(mappings, {
        onConflict: 'centro_id,vendor_key'
      })

    if (insertError) {
      console.error('❌ Errore salvataggio:', insertError.message)
      process.exit(1)
    }

    console.log('✅ Mapping salvati con successo!\n')

    // 6. Statistiche
    const mapped = mappings.filter(m => m.category_id !== null).length
    const unmapped = mappings.filter(m => m.category_id === null).length

    console.log('📊 Statistiche:')
    console.log(`   Mappati automaticamente: ${mapped}`)
    console.log(`   Non categorizzati: ${unmapped}`)

    if (unmapped > 0) {
      console.log(`\n💡 I fornitori non categorizzati possono essere modificati`)
      console.log(`   manualmente nel database o tramite interfaccia web`)
    }

    // 7. Salva un file CSV per revisione manuale
    const csvPath = join(__dirname, '..', 'vendor-mappings.csv')
    const csvContent = [
      'Fornitore;Categoria;Transazioni;Totale;Tipo',
      ...vendors.map((v, i) => {
        const mapping = mappings[i]
        const categoryName = categories.find(c => c.id === mapping.category_id)?.nome || mapping.categoria_custom
        return `${v.vendor};${categoryName};${v.count};${v.totalAmount.toFixed(2)};${v.tipo}`
      })
    ].join('\n')

    writeFileSync(csvPath, csvContent, 'utf-8')
    console.log(`\n📄 File CSV generato: vendor-mappings.csv`)
    console.log(`   Puoi aprirlo con Excel per revisionare le categorizzazioni`)

  } catch (err) {
    console.error('❌ Errore:', err.message)
    process.exit(1)
  }
}

categorizeVendors()
