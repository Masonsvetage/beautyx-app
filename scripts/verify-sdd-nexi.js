import { createClient } from '@supabase/supabase-js'
import dotenv from 'dotenv'

dotenv.config({ path: '.env.local' })

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
const supabaseServiceKey = process.env.SUPABASE_SERVICE_KEY

async function verifySDDNexi() {
  const supabase = createClient(supabaseUrl, supabaseServiceKey)
  const centroId = '1a72344b-aac1-465b-92d4-7e670f430340'

  try {
    console.log('\n✅ VERIFICA: SDD NEXI\n')
    console.log('='.repeat(80))

    // Trova movimenti SDD NEXI
    const { data: movements, error } = await supabase
      .from('bank_movements')
      .select('id, data, descrizione, categoria')
      .eq('centro_id', centroId)
      .ilike('descrizione', '%sdd a : nexi%')
      .order('data', { ascending: false })
      .limit(5)

    if (error) throw error

    console.log(`\nTrovati ${movements?.length || 0} movimenti "SDD A : NEXI"\n`)

    if (movements && movements.length > 0) {
      movements.forEach((m, idx) => {
        const isCorrect = m.categoria === 'POS'
        console.log(`${idx + 1}. ${m.data} ${isCorrect ? '✅' : '❌'}`)
        console.log(`   ${m.descrizione.substring(0, 70)}...`)
        console.log(`   Categoria: "${m.categoria}" ${isCorrect ? '(corretto)' : '(ERRORE!)'}`)
        console.log('')
      })

      const allCorrect = movements.every(m => m.categoria === 'POS')
      if (allCorrect) {
        console.log('✅ Tutti i movimenti SDD NEXI sono correttamente in categoria POS!')
      } else {
        console.log('⚠️  Alcuni movimenti SDD NEXI non sono in categoria POS')
      }
    } else {
      console.log('ℹ️  Nessun movimento SDD NEXI trovato')
    }

    console.log('\n' + '='.repeat(80) + '\n')

  } catch (error) {
    console.error('\n❌ Errore:', error.message)
  }
}

verifySDDNexi()
