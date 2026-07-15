import { createClient } from '@supabase/supabase-js'
import dotenv from 'dotenv'

dotenv.config({ path: '.env.local' })

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
const supabaseServiceKey = process.env.SUPABASE_SERVICE_KEY

async function fixPOSPatternComplete() {
  const supabase = createClient(supabaseUrl, supabaseServiceKey)
  const centroId = '1a72344b-aac1-465b-92d4-7e670f430340'

  try {
    console.log('\n🔧 Aggiornamento Pattern POS Completo\n')
    console.log('='.repeat(80))

    // Trova la regola POS
    const { data: vendors, error } = await supabase
      .from('vendors')
      .select('*')
      .eq('centro_id', centroId)
      .eq('nome', 'pos')

    if (error) throw error

    if (vendors && vendors.length > 0) {
      const posRule = vendors[0]
      console.log(`\n📋 Pattern POS attuale:`)
      console.log(`   "${posRule.pattern_match}"`)

      console.log(`\n⚠️  Mancano alcuni movimenti POS:`)
      console.log(`   - "Spese di gestione POS" (commissioni/canoni)`)
      console.log(`   - "SDD A : NEXI..." (addebiti NEXI)`)

      const newPattern = 'incasso pos, pos bancomat, pos nexi, spese pos, sdd nexi, addebito nexi'

      console.log(`\n✅ Nuovo pattern completo:`)
      console.log(`   "${newPattern}"`)
      console.log(`\n   Questo catturerà:`)
      console.log(`   ✓ INCASSO POS ... (incassi POS)`)
      console.log(`   ✓ POS BANCOMAT ... (incassi con bancomat)`)
      console.log(`   ✓ POS NEXI ... (incassi con nexi)`)
      console.log(`   ✓ Spese di gestione POS ... (commissioni/canoni)`)
      console.log(`   ✓ SDD A : NEXI ... (addebiti NEXI)`)
      console.log(`   ✓ ADDEBITO ... NEXI ... (altri addebiti NEXI)`)
      console.log(`\n   NON catturerà:`)
      console.log(`   ✗ VERSAMENTO CONTANTI ... DEPOSITA (resta in Contanti)`)

      console.log(`\n🔄 Aggiornamento in corso...`)

      const { error: updateError } = await supabase
        .from('vendors')
        .update({
          pattern_match: newPattern
        })
        .eq('id', posRule.id)

      if (updateError) {
        console.error(`\n❌ Errore aggiornamento:`, updateError.message)
      } else {
        console.log(`\n✅ Pattern aggiornato con successo!`)
        console.log(`\n💡 Ora applica di nuovo le regole dalla UI per categorizzare`)
        console.log(`   anche le spese e gli addebiti POS.`)
      }
    } else {
      console.log(`\n⚠️  Regola POS non trovata`)
    }

    console.log('\n' + '='.repeat(80) + '\n')

  } catch (error) {
    console.error('\n❌ Errore:', error.message)
  }
}

fixPOSPatternComplete()
