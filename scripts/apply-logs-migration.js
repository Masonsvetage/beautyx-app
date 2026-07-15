import { createClient } from '@supabase/supabase-js'
import { config } from 'dotenv'
import { resolve, dirname } from 'path'
import { fileURLToPath } from 'url'

const __dirname = dirname(fileURLToPath(import.meta.url))
config({ path: resolve(__dirname, '../.env.local') })

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_KEY
)

const migrationSQL = `
-- Tabella per i log/note datate
CREATE TABLE IF NOT EXISTS optimization_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  plan_id UUID NOT NULL REFERENCES optimization_plans(id) ON DELETE CASCADE,
  data_attivita DATE NOT NULL DEFAULT CURRENT_DATE,
  descrizione TEXT NOT NULL,
  esito TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Indici per performance
CREATE INDEX IF NOT EXISTS idx_optimization_logs_plan ON optimization_logs(plan_id);
CREATE INDEX IF NOT EXISTS idx_optimization_logs_data ON optimization_logs(data_attivita DESC);
`

async function applyMigration() {
  console.log('Applicando migrazione optimization_logs...')

  const { data, error } = await supabase.rpc('exec_sql', { sql: migrationSQL })

  if (error) {
    // Se exec_sql non esiste, proviamo direttamente
    console.log('Tentativo diretto via query...')

    // Creiamo la tabella passo per passo
    const { error: createError } = await supabase
      .from('optimization_logs')
      .select('id')
      .limit(1)

    if (createError && createError.code === '42P01') {
      console.log('Tabella non esiste. Vai su Supabase SQL Editor e esegui:')
      console.log(migrationSQL)
      process.exit(1)
    } else if (!createError) {
      console.log('Tabella optimization_logs esiste già!')
    } else {
      console.log('Errore:', createError.message)
      console.log('\nApplica manualmente questo SQL nel SQL Editor di Supabase:')
      console.log(migrationSQL)
    }
  } else {
    console.log('Migrazione applicata con successo!')
  }
}

applyMigration()
