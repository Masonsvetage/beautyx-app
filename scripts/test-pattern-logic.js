import { createClient } from '@supabase/supabase-js'
import dotenv from 'dotenv'

dotenv.config({ path: '.env.local' })

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
const supabaseServiceKey = process.env.SUPABASE_SERVICE_KEY

async function testPatternLogic() {
  const supabase = createClient(supabaseUrl, supabaseServiceKey)
  const centroId = '1a72344b-aac1-465b-92d4-7e670f430340'

  try {
    console.log('\n🧪 TEST LOGICA PATTERN MATCHING\n')
    console.log('='.repeat(80))

    // Prendi un movimento specifico con "pos"
    const { data: movements, error } = await supabase
      .from('bank_movements')
      .select('*')
      .eq('centro_id', centroId)
      .ilike('descrizione', '%INCASSO POS BANCOMAT%')
      .limit(1)

    if (error) throw error

    if (movements && movements.length > 0) {
      const mov = movements[0]
      console.log('\n📦 Movimento di Test:')
      console.log(`   ID: ${mov.id}`)
      console.log(`   Descrizione: "${mov.descrizione}"`)
      console.log(`   Categoria Attuale: "${mov.categoria}"`)
      console.log(`   Tipo: ${mov.tipo}`)

      // Carica regola POS
      const { data: vendors } = await supabase
        .from('vendors')
        .select('*')
        .eq('centro_id', centroId)
        .ilike('pattern_match', '%pos%')

      if (vendors && vendors.length > 0) {
        const vendor = vendors[0]
        console.log('\n🏷️  Regola Vendor:')
        console.log(`   Nome: "${vendor.nome}"`)
        console.log(`   Pattern: "${vendor.pattern_match}"`)
        console.log(`   Categoria Target: "${vendor.categoria}"`)

        // Test pattern matching
        const descrizione = mov.descrizione.toLowerCase()
        const patterns = vendor.pattern_match
          .toLowerCase()
          .split(/[;,]/)
          .map(p => p.trim())
          .filter(p => p.length > 0)

        console.log('\n🔍 Test Pattern:')
        console.log(`   Descrizione lowercase: "${descrizione}"`)
        console.log(`   Patterns: [${patterns.map(p => `"${p}"`).join(', ')}]`)

        let matched = false
        let matchedPattern = null
        for (const pattern of patterns) {
          console.log(`   - Cerca "${pattern}" in descrizione: ${descrizione.includes(pattern) ? '✅ MATCH' : '❌ NO'}`)
          if (descrizione.includes(pattern)) {
            matched = true
            matchedPattern = pattern
            break
          }
        }

        console.log(`\n   Risultato: ${matched ? `✅ MATCH (pattern: "${matchedPattern}")` : '❌ NO MATCH'}`)

        if (matched) {
          console.log(`\n🔄 Dovrebbe Aggiornare?`)
          console.log(`   Categoria attuale: "${mov.categoria}"`)
          console.log(`   Categoria target: "${vendor.categoria}"`)
          console.log(`   Sono diverse? ${mov.categoria !== vendor.categoria ? '✅ SÌ' : '❌ NO'}`)

          if (mov.categoria !== vendor.categoria) {
            console.log(`\n   ⚠️  QUESTO MOVIMENTO DOVREBBE ESSERE AGGIORNATO!`)
            console.log(`   "${mov.categoria}" → "${vendor.categoria}"`)
          } else {
            console.log(`\n   ✓ Categoria già corretta`)
          }
        }
      }
    }

    console.log('\n' + '='.repeat(80) + '\n')

  } catch (error) {
    console.error('\n❌ Errore:', error)
  }
}

testPatternLogic()
