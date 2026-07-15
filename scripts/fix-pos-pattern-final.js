import { createClient } from '@supabase/supabase-js'
import dotenv from 'dotenv'

dotenv.config({ path: '.env.local' })

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
const supabaseServiceKey = process.env.SUPABASE_SERVICE_KEY

async function fixPOSPatternFinal() {
  const supabase = createClient(supabaseUrl, supabaseServiceKey)
  const centroId = '1a72344b-aac1-465b-92d4-7e670f430340'

  try {
    console.log('\n🔧 Correzione Finale Pattern POS\n')
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
      console.log(`\n📋 Pattern attuale:`)
      console.log(`   "${posRule.pattern_match}"`)

      console.log(`\n❌ Problemi trovati:`)
      console.log(`   - "sdd nexi" non matcha "SDD A : NEXI" (c'è "A :" in mezzo)`)
      console.log(`   - "spese pos" non matcha "Spese di gestione POS" (c'è "di gestione" in mezzo)`)

      const newPattern = 'incasso pos, pos bancomat, pos nexi, gestione pos, sdd a'

      console.log(`\n✅ Pattern corretto:`)
      console.log(`   "${newPattern}"`)
      console.log(`\n   Questo catturerà CORRETTAMENTE:`)
      console.log(`   ✓ "INCASSO POS BANCOMAT ..." → incasso pos`)
      console.log(`   ✓ "INCASSO POS NEXI ..." → incasso pos, pos nexi`)
      console.log(`   ✓ "POS BANCOMAT ..." → pos bancomat`)
      console.log(`   ✓ "Spese di gestione POS ..." → gestione pos`)
      console.log(`   ✓ "SDD A : NEXI ..." → sdd a`)
      console.log(`\n   NON catturerà:`)
      console.log(`   ✗ "VERSAMENTO CONTANTI SU ATM ... DEPOSITA" (nessun match)`)

      console.log(`\n🔄 Aggiornamento...`)

      const { error: updateError } = await supabase
        .from('vendors')
        .update({
          pattern_match: newPattern
        })
        .eq('id', posRule.id)

      if (updateError) {
        console.error(`\n❌ Errore:`, updateError.message)
      } else {
        console.log(`\n✅ Pattern aggiornato!`)
        console.log(`\n💡 Questi movimenti sono già categorizzati come POS,`)
        console.log(`   quindi NON serve riapplicare le regole.`)
        console.log(`   Il nuovo pattern servirà per i futuri import.`)
      }
    } else {
      console.log(`\n⚠️  Regola POS non trovata`)
    }

    console.log('\n' + '='.repeat(80) + '\n')

  } catch (error) {
    console.error('\n❌ Errore:', error.message)
  }
}

fixPOSPatternFinal()
