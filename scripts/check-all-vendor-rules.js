import { createClient } from '@supabase/supabase-js'
import dotenv from 'dotenv'

dotenv.config({ path: '.env.local' })

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
const supabaseServiceKey = process.env.SUPABASE_SERVICE_KEY

async function checkAllVendorRules() {
  const supabase = createClient(supabaseUrl, supabaseServiceKey)
  const centroId = '1a72344b-aac1-465b-92d4-7e670f430340'

  try {
    console.log('\n📋 TUTTE LE REGOLE VENDOR\n')
    console.log('='.repeat(80))

    // Carica tutte le regole
    const { data: vendors, error } = await supabase
      .from('vendors')
      .select('*')
      .eq('centro_id', centroId)
      .order('created_at')

    if (error) throw error

    console.log(`\nTrovate ${vendors?.length || 0} regole:\n`)

    vendors?.forEach((v, idx) => {
      console.log(`${idx + 1}. ${v.nome}`)
      console.log(`   Pattern: "${v.pattern_match}"`)
      console.log(`   Categoria: "${v.categoria}"`)
      console.log(`   Created: ${v.created_at}`)
      console.log('')
    })

    // Test con un movimento "INCASSO POS"
    const testDesc = "INCASSO POS BANCOMAT DEL 27/03/25 SvetAge 4622656/00003"
    console.log('\n🧪 Test con movimento: "' + testDesc + '"')
    console.log('='.repeat(80))

    for (const vendor of vendors) {
      const patterns = vendor.pattern_match
        .toLowerCase()
        .split(/[;,]/)
        .map(p => p.trim())
        .filter(p => p.length > 0)

      let matched = false
      let matchedPattern = null

      for (const pattern of patterns) {
        if (testDesc.toLowerCase().includes(pattern)) {
          matched = true
          matchedPattern = pattern
          break
        }
      }

      if (matched) {
        console.log(`\n✅ MATCH: "${vendor.nome}"`)
        console.log(`   Pattern matchato: "${matchedPattern}"`)
        console.log(`   Categoria: "${vendor.categoria}"`)
        console.log(`   ⚠️  Questa regola sarebbe applicata per prima (loop break)`)
        break // Simula il comportamento dell'API
      } else {
        console.log(`\n❌ NO MATCH: "${vendor.nome}"`)
      }
    }

    console.log('\n' + '='.repeat(80) + '\n')

  } catch (error) {
    console.error('\n❌ Errore:', error)
  }
}

checkAllVendorRules()
