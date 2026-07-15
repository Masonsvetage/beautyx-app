import { createClient } from '@supabase/supabase-js'
import dotenv from 'dotenv'

dotenv.config({ path: '.env.local' })

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
const supabaseServiceKey = process.env.SUPABASE_SERVICE_KEY

async function debugAgenziaEntrate() {
  const supabase = createClient(supabaseUrl, supabaseServiceKey)
  const centroId = '1a72344b-aac1-465b-92d4-7e670f430340'

  try {
    console.log('\n🔍 DEBUG: Agenzia delle Entrate\n')
    console.log('='.repeat(80))

    // 1. Trova movimenti Agenzia delle Entrate
    console.log('\n1️⃣  Movimenti "AGENZIA DELLE ENTRATE":')
    const { data: movements, error: movError } = await supabase
      .from('bank_movements')
      .select('id, data, descrizione, categoria')
      .eq('centro_id', centroId)
      .ilike('descrizione', '%agenzia%entrate%')
      .order('data', { ascending: false })
      .limit(5)

    if (movError) throw movError

    if (movements && movements.length > 0) {
      movements.forEach((m, idx) => {
        console.log(`\n   ${idx + 1}. Data: ${m.data}`)
        console.log(`      Descrizione: ${m.descrizione.substring(0, 80)}...`)
        console.log(`      Categoria: "${m.categoria}"`)
      })
    } else {
      console.log('   ⚠️  Nessun movimento trovato')
    }

    // 2. Controlla regole vendor in ordine
    console.log('\n\n2️⃣  Regole Vendor (in ordine cronologico):')
    const { data: vendors, error: vendorError } = await supabase
      .from('vendors')
      .select('*')
      .eq('centro_id', centroId)
      .order('created_at')

    if (vendorError) throw vendorError

    if (vendors && vendors.length > 0) {
      vendors.forEach((v, idx) => {
        console.log(`\n   ${idx + 1}. "${v.nome}"`)
        console.log(`      Pattern: "${v.pattern_match}"`)
        console.log(`      Categoria: "${v.categoria}"`)
        if (v.nome.toLowerCase().includes('agenzia') || v.nome.toLowerCase().includes('entrate')) {
          console.log(`      🎯 QUESTA È LA REGOLA AGENZIA ENTRATE!`)
        }
        if (v.nome === 'pos') {
          console.log(`      ⚠️  QUESTA È LA REGOLA POS`)
        }
      })
    }

    // 3. Test pattern matching
    if (movements && movements.length > 0) {
      const testMov = movements[0]
      console.log('\n\n3️⃣  Test Pattern Matching:')
      console.log(`   Movimento: "${testMov.descrizione.substring(0, 70)}..."`)
      console.log(`   Categoria attuale: "${testMov.categoria}"`)
      console.log('')

      const descrizione = testMov.descrizione.toLowerCase()

      for (const vendor of vendors) {
        const patterns = vendor.pattern_match
          .toLowerCase()
          .split(/[;,]/)
          .map(p => p.trim())
          .filter(p => p.length > 0)

        let matched = false
        let matchedPattern = null

        for (const pattern of patterns) {
          if (descrizione.includes(pattern)) {
            matched = true
            matchedPattern = pattern
            break
          }
        }

        if (matched) {
          console.log(`   ✅ MATCH: "${vendor.nome}"`)
          console.log(`      Pattern matchato: "${matchedPattern}"`)
          console.log(`      Categoria: "${vendor.categoria}"`)
          if (vendor.nome === 'pos') {
            console.log(`      🔴 PROBLEMA: La regola POS matcha per prima con "sdd a"!`)
          } else {
            console.log(`      ✓ Questa sarebbe la categoria corretta`)
          }
          console.log(`      ⚠️  Loop si ferma qui (break)`)
          break
        } else {
          console.log(`   ❌ NO MATCH: "${vendor.nome}"`)
        }
      }
    }

    console.log('\n' + '='.repeat(80) + '\n')

  } catch (error) {
    console.error('\n❌ Errore:', error.message)
  }
}

debugAgenziaEntrate()
