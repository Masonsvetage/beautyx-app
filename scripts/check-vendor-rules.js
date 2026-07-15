import { createClient } from '@supabase/supabase-js'
import dotenv from 'dotenv'

dotenv.config({ path: '.env.local' })

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
const supabaseServiceKey = process.env.SUPABASE_SERVICE_KEY

async function checkVendorRules() {
  const supabase = createClient(supabaseUrl, supabaseServiceKey)
  const centroId = '1a72344b-aac1-465b-92d4-7e670f430340'

  try {
    // Carica tutte le regole dei vendors
    const { data: vendors, error } = await supabase
      .from('vendors')
      .select('*')
      .eq('centro_id', centroId)

    if (error) throw error

    console.log('\n📋 Regole di Categorizzazione Configurate:\n')

    if (!vendors || vendors.length === 0) {
      console.log('⚠️  Nessuna regola configurata')
    } else {
      vendors.forEach((v, idx) => {
        console.log(`${idx + 1}. ${v.nome}`)
        console.log(`   Pattern: "${v.pattern_match}"`)
        console.log(`   Categoria: ${v.categoria}`)
        if (v.note) console.log(`   Note: ${v.note}`)
        console.log('')
      })
    }

    // Cerca specificamente la regola per fagiolini
    const fagioliniRule = vendors?.find(v =>
      v.nome.toLowerCase().includes('fagiolini') ||
      v.pattern_match.toLowerCase().includes('fagiolini')
    )

    if (fagioliniRule) {
      console.log('✅ Trovata regola per "fagiolini":')
      console.log(`   Nome: ${fagioliniRule.nome}`)
      console.log(`   Pattern: ${fagioliniRule.pattern_match}`)
      console.log(`   Categoria: ${fagioliniRule.categoria}`)
    } else {
      console.log('❌ Nessuna regola trovata per "fagiolini"')
      console.log('\n💡 Creazione regola consigliata:')
      console.log('   Nome: Studio Fagiolini Ganni')
      console.log('   Pattern: fagiolini')
      console.log('   Categoria: Professionisti')
    }

    // Verifica movimenti con "fagiolini" nella descrizione
    const { data: movements, error: movError } = await supabase
      .from('bank_movements')
      .select('id, data, descrizione, categoria')
      .eq('centro_id', centroId)
      .ilike('descrizione', '%fagiolini%')

    if (movError) throw movError

    console.log(`\n\n🔍 Movimenti con "fagiolini" nella descrizione: ${movements?.length || 0}`)

    if (movements && movements.length > 0) {
      movements.forEach((m, idx) => {
        console.log(`\n${idx + 1}. Data: ${m.data}`)
        console.log(`   Descrizione: ${m.descrizione}`)
        console.log(`   Categoria attuale: ${m.categoria || 'Non categorizzato'}`)
      })
    }

  } catch (error) {
    console.error('❌ Errore:', error)
  }
}

checkVendorRules()
