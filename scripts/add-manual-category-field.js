import { createClient } from '@supabase/supabase-js'
import dotenv from 'dotenv'
import fs from 'fs'

dotenv.config({ path: '.env.local' })

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
const supabaseServiceKey = process.env.SUPABASE_SERVICE_KEY

async function addManualCategoryField() {
  const supabase = createClient(supabaseUrl, supabaseServiceKey)

  try {
    console.log('\n🔧 Aggiunta campo categorized_manually\n')
    console.log('=' .repeat(80))

    // Leggi il file SQL
    const sql = fs.readFileSync('supabase/migrations/add_manual_category_flag.sql', 'utf8')

    console.log('\n📝 SQL da eseguire:')
    console.log(sql)
    console.log('\n🔍 Verifico se il campo esiste già...\n')

    const { data: testData, error: testError } = await supabase
      .from('bank_movements')
      .select('id, categorized_manually')
      .limit(1)

    if (testError) {
      console.log('❌ Campo NON esiste ancora.')
      console.log(`   Errore: ${testError.message}\n`)
      console.log('📋 Esegui manualmente questa query nel pannello Supabase SQL Editor:')
      console.log('   Dashboard → SQL Editor → New Query\n')
      console.log('='.repeat(80))
      console.log(sql)
      console.log('='.repeat(80))
    } else {
      console.log('✅ Il campo categorized_manually esiste già!')
      console.log(`   Testato su movimento ID: ${testData[0]?.id}`)
      console.log(`   Valore: ${testData[0]?.categorized_manually}`)
    }

    console.log('\n' + '='.repeat(80) + '\n')

  } catch (error) {
    console.error('\n❌ Errore:', error.message)
  }
}

addManualCategoryField()
