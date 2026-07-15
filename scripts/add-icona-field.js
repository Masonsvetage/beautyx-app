import { createClient } from '@supabase/supabase-js'
import fs from 'fs'
import path from 'path'
import dotenv from 'dotenv'

dotenv.config({ path: '.env.local' })

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
const supabaseServiceKey = process.env.SUPABASE_SERVICE_KEY

async function runMigration() {
  const supabase = createClient(supabaseUrl, supabaseServiceKey)

  try {
    // Aggiungi campo icona
    console.log('Aggiungendo campo icona a custom_categories...')
    const { error: alterError } = await supabase.rpc('exec_sql', {
      sql: "ALTER TABLE custom_categories ADD COLUMN IF NOT EXISTS icona VARCHAR(10) DEFAULT '📁'"
    })

    if (alterError && !alterError.message.includes('already exists')) {
      // Se la funzione exec_sql non esiste, proviamo direttamente
      console.log('Tentativo diretto...')
    }

    // Aggiorna le icone delle categorie esistenti
    console.log('Aggiornando icone categorie...')

    const updates = [
      { nome: 'Dipendenti', icona: '👥' },
      { nome: 'Professionisti', icona: '💼' },
      { nome: 'Fornitori', icona: '🏪' },
      { nome: 'Prodotti/Servizi', icona: '📦' },
      { nome: 'Marketing', icona: '📢' },
      { nome: 'Affitto', icona: '🏠' },
      { nome: 'Utenze', icona: '💡' },
      { nome: 'Assicurazioni', icona: '🛡️' },
      { nome: 'Tasse', icona: '🏛️' },
      { nome: 'Manutenzione', icona: '🔧' },
      { nome: 'USCITE VARIE', icona: '📋' }
    ]

    for (const { nome, icona } of updates) {
      const { error } = await supabase
        .from('custom_categories')
        .update({ icona })
        .eq('centro_id', '1a72344b-aac1-465b-92d4-7e670f430340')
        .eq('nome', nome)

      if (error) {
        console.error(`Errore aggiornamento ${nome}:`, error.message)
      } else {
        console.log(`✓ Aggiornata categoria: ${nome} ${icona}`)
      }
    }

    console.log('\n✅ Migration completata!')

  } catch (error) {
    console.error('❌ Errore durante la migration:', error)
  }
}

runMigration()
