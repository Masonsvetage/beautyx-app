import { createClient } from '@supabase/supabase-js'
import dotenv from 'dotenv'

dotenv.config({ path: '.env.local' })

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
const supabaseServiceKey = process.env.SUPABASE_SERVICE_KEY

async function fixPOSPattern() {
  const supabase = createClient(supabaseUrl, supabaseServiceKey)
  const centroId = '1a72344b-aac1-465b-92d4-7e670f430340'

  try {
    console.log('\n🔧 Correzione Pattern POS\n')
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
      console.log(`\n📋 Regola POS attuale:`)
      console.log(`   Nome: "${posRule.nome}"`)
      console.log(`   Pattern: "${posRule.pattern_match}"`)
      console.log(`   Categoria: "${posRule.categoria}"`)

      console.log(`\n⚠️  Il pattern "pos" è troppo generico e matcha anche "dePOSita"`)
      console.log(`\n🔄 Aggiornamento pattern a: "incasso pos, pos bancomat, pos nexi"`)

      const { error: updateError } = await supabase
        .from('vendors')
        .update({
          pattern_match: 'incasso pos, pos bancomat, pos nexi'
        })
        .eq('id', posRule.id)

      if (updateError) {
        console.error(`\n❌ Errore aggiornamento:`, updateError.message)
      } else {
        console.log(`\n✅ Pattern aggiornato con successo!`)
        console.log(`\n💡 Ora il pattern è più specifico e non matcherà "deposita"`)
        console.log(`   Matcherà solo:`)
        console.log(`   - "INCASSO POS ..."`)
        console.log(`   - "POS BANCOMAT ..."`)
        console.log(`   - "POS NEXI ..."`)

        console.log(`\n🔄 Ora devi:`)
        console.log(`   1. Applicare di nuovo le regole dalla UI`)
        console.log(`   2. I movimenti "VERSAMENTO CONTANTI" passeranno alla categoria "Contanti"`)
        console.log(`   3. Gli "INCASSO POS" resteranno in "POS"`)
      }
    } else {
      console.log(`\n⚠️  Regola POS non trovata`)
    }

    console.log('\n' + '='.repeat(80) + '\n')

  } catch (error) {
    console.error('\n❌ Errore:', error.message)
  }
}

fixPOSPattern()
