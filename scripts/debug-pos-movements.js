import { createClient } from '@supabase/supabase-js'
import dotenv from 'dotenv'

dotenv.config({ path: '.env.local' })

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
const supabaseServiceKey = process.env.SUPABASE_SERVICE_KEY

async function debugPOSMovements() {
  const supabase = createClient(supabaseUrl, supabaseServiceKey)
  const centroId = '1a72344b-aac1-465b-92d4-7e670f430340'

  try {
    console.log('\n🔍 DEBUG: Movimenti POS\n')
    console.log('=' .repeat(80))

    // 1. Carica regole vendors per "pos"
    console.log('\n1️⃣  Regole Vendor per POS:')
    const { data: vendors, error: vendorError } = await supabase
      .from('vendors')
      .select('*')
      .eq('centro_id', centroId)
      .ilike('pattern_match', '%pos%')

    if (vendorError) throw vendorError

    if (vendors && vendors.length > 0) {
      vendors.forEach(v => {
        console.log(`   ✓ Nome: ${v.nome}`)
        console.log(`     Pattern: "${v.pattern_match}"`)
        console.log(`     Categoria Target: "${v.categoria}"`)
        console.log('')
      })
    } else {
      console.log('   ⚠️  Nessuna regola trovata per POS')
    }

    // 2. Verifica categorie disponibili
    console.log('\n2️⃣  Categorie Disponibili:')
    const { data: categories, error: catError } = await supabase
      .from('custom_categories')
      .select('id, nome')
      .eq('centro_id', centroId)
      .order('nome')

    if (catError) throw catError

    if (categories && categories.length > 0) {
      categories.forEach(c => {
        console.log(`   - "${c.nome}" (ID: ${c.id})`)
      })
    }

    // 3. Trova movimenti con "pos", "nexi", "bancomat"
    console.log('\n3️⃣  Movimenti con pattern POS (primi 20):')
    const { data: movements, error: movError } = await supabase
      .from('bank_movements')
      .select('id, data, descrizione, categoria')
      .eq('centro_id', centroId)
      .or('descrizione.ilike.%pos%,descrizione.ilike.%nexi%,descrizione.ilike.%bancomat%')
      .order('data', { ascending: false })
      .limit(20)

    if (movError) throw movError

    if (movements && movements.length > 0) {
      const byCategory = {}
      movements.forEach(m => {
        const cat = m.categoria || 'Non categorizzato'
        if (!byCategory[cat]) byCategory[cat] = []
        byCategory[cat].push(m)
      })

      Object.keys(byCategory).forEach(cat => {
        console.log(`\n   📁 Categoria: "${cat}" (${byCategory[cat].length} movimenti)`)
        byCategory[cat].slice(0, 3).forEach(m => {
          console.log(`      - ${m.data}: ${m.descrizione.substring(0, 60)}...`)
        })
        if (byCategory[cat].length > 3) {
          console.log(`      ... e altri ${byCategory[cat].length - 3} movimenti`)
        }
      })
    } else {
      console.log('   ⚠️  Nessun movimento trovato')
    }

    // 4. Test pattern matching
    if (vendors && vendors.length > 0 && movements && movements.length > 0) {
      console.log('\n4️⃣  Simulazione Pattern Matching:')
      const vendor = vendors[0]
      const patterns = vendor.pattern_match
        .toLowerCase()
        .split(/[;,]/)
        .map(p => p.trim())
        .filter(p => p.length > 0)

      console.log(`   Pattern da testare: [${patterns.join(', ')}]`)
      console.log(`   Categoria target: "${vendor.categoria}"`)

      let matchCount = 0
      let wrongCategoryCount = 0

      movements.forEach(m => {
        const descrizione = (m.descrizione || '').toLowerCase()
        let matched = false

        for (const pattern of patterns) {
          if (descrizione.includes(pattern)) {
            matched = true
            break
          }
        }

        if (matched) {
          matchCount++
          if (m.categoria !== vendor.categoria) {
            wrongCategoryCount++
          }
        }
      })

      console.log(`\n   ✓ Movimenti che matchano: ${matchCount}/${movements.length}`)
      console.log(`   ⚠️  Movimenti con categoria errata: ${wrongCategoryCount}`)

      if (wrongCategoryCount > 0) {
        console.log(`\n   💡 Questi ${wrongCategoryCount} movimenti dovrebbero essere nella categoria "${vendor.categoria}"`)
        console.log(`      ma sono in altre categorie.`)
      }
    }

    console.log('\n' + '='.repeat(80))
    console.log('\n✅ Debug completato\n')

  } catch (error) {
    console.error('\n❌ Errore:', error.message)
  }
}

debugPOSMovements()
