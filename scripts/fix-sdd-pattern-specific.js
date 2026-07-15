import { createClient } from '@supabase/supabase-js'
import dotenv from 'dotenv'

dotenv.config({ path: '.env.local' })

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
const supabaseServiceKey = process.env.SUPABASE_SERVICE_KEY

async function fixSDDPattern() {
  const supabase = createClient(supabaseUrl, supabaseServiceKey)
  const centroId = '1a72344b-aac1-465b-92d4-7e670f430340'

  try {
    console.log('\n🔧 Correzione Pattern SDD\n')
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

      console.log(`\n❌ PROBLEMA: "sdd a" è troppo generico!`)
      console.log(`   Matcha anche:`)
      console.log(`   - "SDD A : NEXI ..." ✓ (corretto, è POS)`)
      console.log(`   - "SDD A : AGENZIA DELLE ENTRATE ..." ✗ (sbagliato, non è POS!)`)

      const newPattern = 'incasso pos, pos bancomat, pos nexi, gestione pos, sdd a : nexi'

      console.log(`\n✅ Soluzione: Aggiungere ": nexi" al pattern`)
      console.log(`   Nuovo pattern: "${newPattern}"`)
      console.log(`\n   Questo matcherà:`)
      console.log(`   ✓ "SDD A : NEXI S.P.A. ..." → sdd a : nexi`)
      console.log(`   ✓ "SDD A : NEXI PAYMENTS ..." → sdd a : nexi`)
      console.log(`\n   NON matcherà:`)
      console.log(`   ✗ "SDD A : AGENZIA DELLE ENTRATE ..." (verrà categorizzato correttamente)`)

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
        console.log(`\n💡 Ora applica le regole dalla UI per ricategorizzare`)
        console.log(`   i movimenti Agenzia delle Entrate.`)
      }
    } else {
      console.log(`\n⚠️  Regola POS non trovata`)
    }

    console.log('\n' + '='.repeat(80) + '\n')

  } catch (error) {
    console.error('\n❌ Errore:', error.message)
  }
}

fixSDDPattern()
