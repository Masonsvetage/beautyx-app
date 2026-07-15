/**
 * Script per setup sistema autenticazione con ruoli
 * Esegue la migrazione e crea l'utente admin
 */

import { createClient } from '@supabase/supabase-js'

const supabaseUrl = 'https://xgdjlybiqizsmdacwiql.supabase.co'
const supabaseServiceKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InhnZGpseWJpcWl6c21kYWN3aXFsIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc2MTA1NTEyNywiZXhwIjoyMDc2NjMxMTI3fQ.ri8-43JyKhqhys_nejNyh6iEoG23tUMe_SjW38b7hAY'

// Client con service role per operazioni admin
const supabase = createClient(supabaseUrl, supabaseServiceKey, {
  auth: {
    autoRefreshToken: false,
    persistSession: false
  }
})

async function createAdminUser() {
  console.log('\n👤 Creazione utente admin...\n')

  const adminEmail = 'admin@beautyx.it'
  const adminPassword = 'Admin123!'

  try {
    // 1. Crea utente in auth.users
    const { data: authData, error: authError } = await supabase.auth.admin.createUser({
      email: adminEmail,
      password: adminPassword,
      email_confirm: true
    })

    if (authError) {
      if (authError.message.includes('already been registered')) {
        console.log('ℹ️  Utente admin esiste gia, cerco ID...')

        // Trova l'utente esistente
        const { data: users } = await supabase.auth.admin.listUsers()
        const existingUser = users?.users?.find(u => u.email === adminEmail)

        if (existingUser) {
          console.log('   ID utente:', existingUser.id)
          return existingUser.id
        }
        return null
      }
      throw authError
    }

    console.log('✅ Utente auth creato:', authData.user.id)
    return authData.user.id

  } catch (error) {
    console.log('❌ Errore creazione admin:', error.message)
    return null
  }
}

async function main() {
  console.log('='.repeat(50))
  console.log('  SETUP SISTEMA AUTENTICAZIONE BEAUTYX')
  console.log('='.repeat(50))
  console.log('')

  // Verifica connessione
  const { data: testData, error: testError } = await supabase
    .from('beauty_centers')
    .select('id')
    .limit(1)

  if (testError) {
    console.log('❌ Errore connessione Supabase:', testError.message)
    return
  }

  console.log('✅ Connessione Supabase OK\n')

  // Crea utente admin
  const adminId = await createAdminUser()

  console.log('')
  console.log('='.repeat(50))
  console.log('')
  console.log('📋 PROSSIMI PASSI:')
  console.log('')
  console.log('1. Apri Supabase Dashboard SQL Editor:')
  console.log('   https://supabase.com/dashboard/project/xgdjlybiqizsmdacwiql/sql')
  console.log('')
  console.log('2. Copia e incolla TUTTO il contenuto di:')
  console.log('   supabase/migrations/20260127_auth_roles.sql')
  console.log('')
  console.log('3. Clicca "Run" per eseguire la migrazione')
  console.log('')

  if (adminId) {
    console.log('4. Dopo la migrazione, esegui questa query per creare il profilo admin:')
    console.log('')
    console.log(`   INSERT INTO user_profiles (id, email, ruolo, piano, attivo, nome, cognome)`)
    console.log(`   VALUES ('${adminId}', 'admin@beautyx.it', 'admin', 'pro', true, 'Admin', 'Beautyx');`)
    console.log('')
  }

  console.log('='.repeat(50))
  console.log('🔐 CREDENZIALI ADMIN')
  console.log('='.repeat(50))
  console.log('   Email:    admin@beautyx.it')
  console.log('   Password: Admin123!')
  console.log('='.repeat(50))
  console.log('')
}

main().catch(console.error)
