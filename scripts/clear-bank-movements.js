import { createClient } from '@supabase/supabase-js'
import * as dotenv from 'dotenv'
import { fileURLToPath } from 'url'
import { dirname, join } from 'path'

const __filename = fileURLToPath(import.meta.url)
const __dirname = dirname(__filename)

// Carica le variabili d'ambiente
dotenv.config({ path: join(__dirname, '..', '.env.local') })

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
const supabaseServiceKey = process.env.SUPABASE_SERVICE_KEY

const supabase = createClient(supabaseUrl, supabaseServiceKey)

async function clearBankMovements() {
  console.log('🗑️  Cancellazione movimenti bancari...\n')

  try {
    const { error } = await supabase
      .from('bank_movements')
      .delete()
      .neq('id', '00000000-0000-0000-0000-000000000000') // Cancella tutti (condizione sempre vera)

    if (error) {
      console.error('❌ Errore durante la cancellazione:', error)
      process.exit(1)
    }

    console.log('✅ Tutti i movimenti bancari sono stati cancellati')

  } catch (err) {
    console.error('❌ Errore:', err)
    process.exit(1)
  }
}

clearBankMovements()
