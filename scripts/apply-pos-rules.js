import { createClient } from '@supabase/supabase-js'
import dotenv from 'dotenv'

dotenv.config({ path: '.env.local' })

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
const supabaseServiceKey = process.env.SUPABASE_SERVICE_KEY

async function applyPOSRules() {
  const supabase = createClient(supabaseUrl, supabaseServiceKey)
  const centroId = '1a72344b-aac1-465b-92d4-7e670f430340'

  try {
    console.log('\n🔧 Applicazione Regole POS\n')
    console.log('=' .repeat(80))

    // Carica tutte le regole vendor
    const { data: vendors, error: vendorsError } = await supabase
      .from('vendors')
      .select('*')
      .eq('centro_id', centroId)

    if (vendorsError) throw vendorsError

    console.log(`\n📋 Trovate ${vendors?.length || 0} regole vendor`)

    // Carica tutti i movimenti
    const { data: movements, error: movementsError } = await supabase
      .from('bank_movements')
      .select('*')
      .eq('centro_id', centroId)

    if (movementsError) throw movementsError

    console.log(`📦 Trovati ${movements?.length || 0} movimenti totali\n`)

    let updatedCount = 0
    const updates = []

    // Per ogni movimento, verifica se corrisponde a un pattern
    for (const movement of movements) {
      const descrizione = movement.descrizione?.toLowerCase() || ''

      for (const vendor of vendors) {
        const patterns = vendor.pattern_match
          .toLowerCase()
          .split(/[;,]/)
          .map(p => p.trim())
          .filter(p => p.length > 0)

        let matched = false
        for (const pattern of patterns) {
          if (descrizione.includes(pattern)) {
            matched = true
            break
          }
        }

        if (matched) {
          if (movement.categoria !== vendor.categoria) {
            updates.push({
              id: movement.id,
              old_categoria: movement.categoria,
              new_categoria: vendor.categoria,
              descrizione: movement.descrizione.substring(0, 60)
            })
            updatedCount++
          }
          break
        }
      }
    }

    console.log(`✅ Trovati ${updatedCount} movimenti da aggiornare\n`)

    if (updatedCount > 0) {
      console.log('📝 Primi 10 aggiornamenti da fare:')
      updates.slice(0, 10).forEach((u, idx) => {
        console.log(`   ${idx + 1}. "${u.old_categoria}" → "${u.new_categoria}"`)
        console.log(`      ${u.descrizione}...`)
      })

      console.log('\n🚀 Applicazione aggiornamenti...\n')

      let successCount = 0
      let errorCount = 0

      for (const update of updates) {
        try {
          const { error } = await supabase
            .from('bank_movements')
            .update({ categoria: update.new_categoria })
            .eq('id', update.id)

          if (error) {
            console.error(`   ❌ Errore aggiornamento ID ${update.id}:`, error.message)
            errorCount++
          } else {
            successCount++
            if (successCount % 10 === 0) {
              console.log(`   ✓ Aggiornati ${successCount}/${updates.length} movimenti...`)
            }
          }
        } catch (err) {
          console.error(`   ❌ Eccezione ID ${update.id}:`, err.message)
          errorCount++
        }
      }

      console.log(`\n✅ Completato!`)
      console.log(`   - Successi: ${successCount}`)
      console.log(`   - Errori: ${errorCount}`)
    } else {
      console.log('ℹ️  Nessun movimento da aggiornare')
    }

    console.log('\n' + '='.repeat(80) + '\n')

  } catch (error) {
    console.error('\n❌ Errore:', error.message)
    console.error(error)
  }
}

applyPOSRules()
