import dotenv from 'dotenv'
import { createClient } from '@supabase/supabase-js'

dotenv.config({ path: '.env.local' })

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
const supabaseServiceKey = process.env.SUPABASE_SERVICE_KEY

async function runMigration() {
  const supabase = createClient(supabaseUrl, supabaseServiceKey)

  console.log('\n🔧 Aggiunta campo categorized_manually al database\n')
  console.log('='.repeat(80))

  try {
    // Prova ad aggiungere il campo
    console.log('\n⚠️  Supabase JS client non supporta ALTER TABLE direttamente.')
    console.log('\n📋 Esegui manualmente questa query nel Supabase SQL Editor:')
    console.log('   Dashboard → SQL Editor → New Query\n')
    console.log('='.repeat(80))
    console.log(`
ALTER TABLE bank_movements
ADD COLUMN IF NOT EXISTS categorized_manually BOOLEAN DEFAULT FALSE;

COMMENT ON COLUMN bank_movements.categorized_manually IS 'Indica se la categoria è stata impostata manualmente dall''utente. Se TRUE, le regole auto-categorizzazione non sovrascriveranno questa categoria.';
    `.trim())
    console.log('='.repeat(80))
    console.log('\n✅ Dopo aver eseguito la query, le modifiche al codice sono già pronte!')
    console.log('\nFunzionalità implementate:')
    console.log('  1. Quando modifichi manualmente una categoria, verrà impostato il flag')
    console.log('  2. Le regole auto-categorizzazione salteranno i movimenti con flag manuale')
    console.log('  3. Le tue correzioni manuali non verranno più sovrascritte')

  } catch (error) {
    console.error('\n❌ Errore:', error.message)
  }

  console.log('\n' + '='.repeat(80) + '\n')
}

runMigration()
