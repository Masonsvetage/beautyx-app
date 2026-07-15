// Script per applicare la migrazione
const { createClient } = require('@supabase/supabase-js')

const supabaseUrl = 'https://xgdjlybiqizsmdacwiql.supabase.co'
const supabaseServiceKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InhnZGpseWJpcWl6c21kYWN3aXFsIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc2MTA1NTEyNywiZXhwIjoyMDc2NjMxMTI3fQ.ri8-43JyKhqhys_nejNyh6iEoG23tUMe_SjW38b7hAY'

const supabase = createClient(supabaseUrl, supabaseServiceKey, {
  db: { schema: 'public' }
})

async function testConnection() {
  console.log('Test connessione e verifica tabella...\n')

  // Verifica se la tabella esiste e le colonne
  const { data, error } = await supabase
    .from('beautyx_conversations')
    .select('id, pinned_by_hpa, deleted_at')
    .limit(1)

  if (error) {
    if (error.message.includes('pinned_by_hpa') || error.message.includes('deleted_at')) {
      console.log('Le nuove colonne NON esistono ancora.')
      console.log('\nDevi applicare la migrazione manualmente:')
      console.log('1. Vai su: https://supabase.com/dashboard/project/xgdjlybiqizsmdacwiql/sql/new')
      console.log('2. Incolla il contenuto di: supabase/migrations/20260126_conversation_pin_delete.sql')
      console.log('3. Clicca "Run"')
    } else {
      console.log('Errore:', error.message)
    }
    return false
  }

  // Se arriviamo qui, le colonne esistono (o la tabella è vuota)
  console.log('Connessione OK!')

  if (data && data.length > 0) {
    const cols = Object.keys(data[0])
    if (cols.includes('pinned_by_hpa') && cols.includes('deleted_at')) {
      console.log('Le colonne pinned_by_hpa e deleted_at ESISTONO!')
      console.log('Migrazione già applicata o appena completata.')
      return true
    }
  }

  // Tabella vuota, verifichiamo con un insert/select di test
  console.log('Tabella vuota, verifico schema con query diretta...')

  // Proviamo a fare un update fittizio per verificare le colonne
  const { error: updateError } = await supabase
    .from('beautyx_conversations')
    .update({ pinned_by_hpa: false })
    .eq('id', '00000000-0000-0000-0000-000000000000') // ID che non esiste

  if (updateError && updateError.message.includes('pinned_by_hpa')) {
    console.log('\nLe colonne NON esistono. Applica la migrazione manualmente.')
    return false
  }

  console.log('Le colonne sembrano esistere! Migrazione OK.')
  return true
}

testConnection()
  .then(success => {
    if (!success) {
      console.log('\n--- SQL DA ESEGUIRE ---\n')
      const fs = require('fs')
      const path = require('path')
      const sql = fs.readFileSync(
        path.join(__dirname, '..', 'supabase', 'migrations', '20260126_conversation_pin_delete.sql'),
        'utf8'
      )
      console.log(sql)
    }
  })
  .catch(console.error)
