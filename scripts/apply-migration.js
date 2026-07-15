// Script per applicare la migrazione usando Supabase REST API
const fs = require('fs')
const path = require('path')

const supabaseUrl = 'https://xgdjlybiqizsmdacwiql.supabase.co'
const supabaseServiceKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InhnZGpseWJpcWl6c21kYWN3aXFsIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc2MTA1NTEyNywiZXhwIjoyMDc2NjMxMTI3fQ.ri8-43JyKhqhys_nejNyh6iEoG23tUMe_SjW38b7hAY'

async function applyMigration() {
  console.log('Applicando migrazione pin/delete conversazioni...\n')

  // Leggi il file SQL
  const sqlPath = path.join(__dirname, '..', 'supabase', 'migrations', '20260126_conversation_pin_delete.sql')
  const sql = fs.readFileSync(sqlPath, 'utf8')

  // Usa l'endpoint SQL di Supabase (richiede service key)
  const response = await fetch(`${supabaseUrl}/rest/v1/rpc/exec_sql`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'apikey': supabaseServiceKey,
      'Authorization': `Bearer ${supabaseServiceKey}`
    },
    body: JSON.stringify({ sql })
  })

  if (!response.ok) {
    console.log('RPC exec_sql non disponibile, applico manualmente via Supabase Dashboard.\n')
    console.log('Copia e incolla il seguente SQL nel SQL Editor di Supabase:\n')
    console.log('=' .repeat(60))
    console.log(sql)
    console.log('=' .repeat(60))
    console.log('\nURL Dashboard: https://supabase.com/dashboard/project/xgdjlybiqizsmdacwiql/sql/new')
    return
  }

  const data = await response.json()
  console.log('Migrazione applicata con successo!')
  console.log(data)
}

applyMigration().catch(console.error)
