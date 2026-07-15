import { createClient } from '@supabase/supabase-js'
import dotenv from 'dotenv'

dotenv.config({ path: '.env.local' })

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
const supabaseServiceKey = process.env.SUPABASE_SERVICE_KEY

async function checkAllPOSVariations() {
  const supabase = createClient(supabaseUrl, supabaseServiceKey)
  const centroId = '1a72344b-aac1-465b-92d4-7e670f430340'

  try {
    console.log('\n🔍 VERIFICA: Tutte le Variazioni POS\n')
    console.log('='.repeat(80))

    // Cerca tutti i movimenti che potrebbero essere POS
    const { data: movements, error } = await supabase
      .from('bank_movements')
      .select('id, data, descrizione, categoria, tipo')
      .eq('centro_id', centroId)
      .or('descrizione.ilike.%pos%,descrizione.ilike.%nexi%,descrizione.ilike.%bancomat%')
      .order('data', { ascending: false })

    if (error) throw error

    console.log(`\nTrovati ${movements?.length || 0} movimenti con "pos", "nexi" o "bancomat"\n`)

    // Raggruppa per pattern
    const patterns = {
      'INCASSO POS': [],
      'POS (senza INCASSO)': [],
      'NEXI (senza POS)': [],
      'BANCOMAT (senza POS)': [],
      'VERSAMENTO/DEPOSITA': []
    }

    movements?.forEach(m => {
      const desc = m.descrizione.toUpperCase()

      if (desc.includes('VERSAMENTO') || desc.includes('DEPOSITA')) {
        patterns['VERSAMENTO/DEPOSITA'].push(m)
      } else if (desc.includes('INCASSO') && desc.includes('POS')) {
        patterns['INCASSO POS'].push(m)
      } else if (desc.includes('POS') && !desc.includes('INCASSO')) {
        patterns['POS (senza INCASSO)'].push(m)
      } else if (desc.includes('NEXI') && !desc.includes('POS')) {
        patterns['NEXI (senza POS)'].push(m)
      } else if (desc.includes('BANCOMAT') && !desc.includes('POS')) {
        patterns['BANCOMAT (senza POS)'].push(m)
      }
    })

    // Mostra risultati
    Object.keys(patterns).forEach(pattern => {
      const items = patterns[pattern]
      if (items.length > 0) {
        console.log(`\n📋 ${pattern}: ${items.length} movimenti`)
        console.log('─'.repeat(80))

        items.slice(0, 5).forEach((m, idx) => {
          console.log(`   ${idx + 1}. ${m.data} | ${m.tipo} | Cat: "${m.categoria}"`)
          console.log(`      ${m.descrizione.substring(0, 70)}...`)
        })

        if (items.length > 5) {
          console.log(`   ... e altri ${items.length - 5} movimenti`)
        }
      }
    })

    // Test con la regola attuale dal database
    const { data: posVendor } = await supabase
      .from('vendors')
      .select('pattern_match')
      .eq('centro_id', centroId)
      .eq('nome', 'pos')
      .single()

    const patternString = posVendor?.pattern_match || 'incasso pos, pos bancomat, pos nexi'
    const currentPatterns = patternString.toLowerCase().split(/[;,]/).map(p => p.trim()).filter(p => p.length > 0)

    console.log(`\n\n🧪 TEST con pattern attuale: "${patternString}"`)
    console.log('='.repeat(80))
    let matchedCount = 0
    let unmatchedPOS = []

    movements?.forEach(m => {
      const desc = m.descrizione.toLowerCase()

      // Escludi versamenti/depositi
      if (desc.includes('versamento') || desc.includes('deposita')) {
        return
      }

      let matched = false
      for (const pattern of currentPatterns) {
        if (desc.includes(pattern)) {
          matched = true
          break
        }
      }

      if (matched) {
        matchedCount++
      } else {
        // Potrebbe essere un movimento POS non matchato?
        if (desc.includes('pos') || desc.includes('nexi') || desc.includes('bancomat')) {
          unmatchedPOS.push(m)
        }
      }
    })

    console.log(`\n✅ Movimenti POS matchati: ${matchedCount}`)
    console.log(`⚠️  Movimenti potenzialmente POS NON matchati: ${unmatchedPOS.length}`)

    if (unmatchedPOS.length > 0) {
      console.log('\n⚠️  ATTENZIONE: Questi movimenti potrebbero essere POS ma non matchano:')
      unmatchedPOS.slice(0, 10).forEach((m, idx) => {
        console.log(`\n   ${idx + 1}. ${m.descrizione.substring(0, 70)}...`)
        console.log(`      Categoria attuale: "${m.categoria}"`)
      })
    }

    console.log('\n' + '='.repeat(80) + '\n')

  } catch (error) {
    console.error('\n❌ Errore:', error.message)
  }
}

checkAllPOSVariations()
