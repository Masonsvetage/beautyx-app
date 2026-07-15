/**
 * Script per creare obiettivi di esempio
 * Esegui con: node scripts/seed-obiettivi-esempio.js
 */

import { createClient } from '@supabase/supabase-js'
import dotenv from 'dotenv'

dotenv.config({ path: '.env.local' })

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
)

const CENTRO_ID = '1a72344b-aac1-465b-92d4-7e670f430340'

// Obiettivi di default - INATTIVI fino a consulenza
const obiettiviEsempio = [
  {
    centro_id: CENTRO_ID,
    nome: 'Clienti giornalieri',
    descrizione: 'Aumentare il numero di clienti serviti rispetto alla media storica',
    icona: '👥',
    tipo: 'clienti',
    unita_misura: 'numero',
    valore_riferimento: 6,      // Media attuale
    valore_obiettivo: 8,        // Target
    direzione: 'maggiore',
    frequenza: 'giornaliero',
    creato_da: 'beautyx',
    priorita: 1,
    stato: 'bozza',             // INATTIVO - da attivare dopo consulenza
    attivo: false
  },
  {
    centro_id: CENTRO_ID,
    nome: 'Incasso giornaliero',
    descrizione: 'Superare il punto di pareggio e generare margine',
    icona: '💰',
    tipo: 'economico',
    unita_misura: 'euro',
    valore_riferimento: 714,
    valore_obiettivo: 900,
    direzione: 'maggiore',
    frequenza: 'giornaliero',
    creato_da: 'beautyx',
    priorita: 1,
    stato: 'bozza',
    attivo: false
  },
  {
    centro_id: CENTRO_ID,
    nome: 'Vendita prodotti',
    descrizione: 'Incrementare la vendita di prodotti per aumentare lo scontrino medio',
    icona: '🛍️',
    tipo: 'prodotti',
    unita_misura: 'numero',
    valore_riferimento: 2,
    valore_obiettivo: 4,
    direzione: 'maggiore',
    frequenza: 'giornaliero',
    creato_da: 'beautyx',
    priorita: 2,
    stato: 'bozza',
    attivo: false
  },
  {
    centro_id: CENTRO_ID,
    nome: 'Scontrino medio',
    descrizione: 'Aumentare il valore medio per cliente',
    icona: '🧾',
    tipo: 'economico',
    unita_misura: 'euro',
    valore_riferimento: 65,
    valore_obiettivo: 80,
    direzione: 'maggiore',
    frequenza: 'giornaliero',
    creato_da: 'beautyx',
    priorita: 2,
    stato: 'bozza',
    attivo: false
  },
  {
    centro_id: CENTRO_ID,
    nome: 'Tempo medio servizio',
    descrizione: 'Ottimizzare i tempi di servizio mantenendo la qualità',
    icona: '⏱️',
    tipo: 'efficienza',
    unita_misura: 'minuti',
    valore_riferimento: 45,
    valore_obiettivo: 40,
    direzione: 'minore',
    frequenza: 'giornaliero',
    creato_da: 'hpa',
    priorita: 3,
    stato: 'bozza',
    attivo: false
  },
  {
    centro_id: CENTRO_ID,
    nome: 'Recensioni positive',
    descrizione: 'Raccogliere feedback positivi dai clienti',
    icona: '⭐',
    tipo: 'qualita',
    unita_misura: 'numero',
    valore_riferimento: 1,
    valore_obiettivo: 2,
    direzione: 'maggiore',
    frequenza: 'giornaliero',
    creato_da: 'beautyx',
    priorita: 3,
    stato: 'bozza',
    attivo: false
  }
]

async function seedObiettivi() {
  console.log('🎯 Creazione obiettivi di esempio...\n')

  // Verifica se la tabella esiste
  const { data: testData, error: testError } = await supabase
    .from('obiettivi')
    .select('id')
    .limit(1)

  if (testError) {
    console.error('❌ Errore: la tabella "obiettivi" non esiste.')
    console.error('   Esegui prima la migration: add-objectives-tracking.sql')
    console.error('\n   Dettaglio errore:', testError.message)
    process.exit(1)
  }

  // Elimina obiettivi esistenti per questo centro (opzionale)
  const { error: deleteError } = await supabase
    .from('obiettivi')
    .delete()
    .eq('centro_id', CENTRO_ID)

  if (deleteError) {
    console.warn('⚠️  Attenzione durante eliminazione:', deleteError.message)
  }

  // Inserisci nuovi obiettivi
  for (const obiettivo of obiettiviEsempio) {
    const { data, error } = await supabase
      .from('obiettivi')
      .insert(obiettivo)
      .select()
      .single()

    if (error) {
      console.error(`❌ Errore creazione "${obiettivo.nome}":`, error.message)
    } else {
      console.log(`✅ ${obiettivo.icona} ${obiettivo.nome}`)
      console.log(`   Riferimento: ${obiettivo.valore_riferimento} ${obiettivo.unita_misura}`)
      console.log(`   Obiettivo: ${obiettivo.valore_obiettivo} ${obiettivo.unita_misura}`)
      console.log('')
    }
  }

  console.log('\n🎉 Obiettivi creati con successo!')
  console.log('   Ricarica la dashboard per vederli.')
}

seedObiettivi().catch(console.error)
