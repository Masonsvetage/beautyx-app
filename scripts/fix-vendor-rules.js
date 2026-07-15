import { createClient } from '@supabase/supabase-js'
import dotenv from 'dotenv'

dotenv.config({ path: '.env.local' })

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
const supabaseServiceKey = process.env.SUPABASE_SERVICE_KEY

async function fixVendorRules() {
  const supabase = createClient(supabaseUrl, supabaseServiceKey)
  const centroId = '1a72344b-aac1-465b-92d4-7e670f430340'

  try {
    console.log('\n🔧 CORREZIONE REGOLE VENDOR\n')
    console.log('='.repeat(80))

    // Trova la regola "Svetage srl"
    const { data: vendors, error } = await supabase
      .from('vendors')
      .select('*')
      .eq('centro_id', centroId)
      .ilike('nome', '%svetage%')

    if (error) throw error

    if (vendors && vendors.length > 0) {
      console.log(`\n📋 Trovata regola da eliminare:`)
      vendors.forEach(v => {
        console.log(`   Nome: "${v.nome}"`)
        console.log(`   Pattern: "${v.pattern_match}"`)
        console.log(`   Categoria: "${v.categoria}"`)
        console.log(`   ID: ${v.id}`)
      })

      console.log(`\n⚠️  Questa regola causa conflitto con la regola POS.`)
      console.log(`   Svetage è il software POS, quindi i movimenti dovrebbero essere categor izzati come "POS" non "Fornitori".`)
      console.log(`\n🗑️  Eliminazione regola...`)

      for (const v of vendors) {
        const { error: deleteError } = await supabase
          .from('vendors')
          .delete()
          .eq('id', v.id)

        if (deleteError) {
          console.error(`   ❌ Errore eliminazione:`, deleteError.message)
        } else {
          console.log(`   ✅ Eliminata regola "${v.nome}"`)
        }
      }

      console.log(`\n🔄 Ora applica di nuovo le regole dalla UI per ricategorizzare i movimenti.`)

    } else {
      console.log(`\n✓ Nessuna regola Svetage trovata (potrebbe essere già stata eliminata)`)
    }

    console.log('\n' + '='.repeat(80) + '\n')

  } catch (error) {
    console.error('\n❌ Errore:', error)
  }
}

fixVendorRules()
