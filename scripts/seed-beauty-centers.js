import { createClient } from '@supabase/supabase-js'
import * as dotenv from 'dotenv'

// Carica le variabili d'ambiente
dotenv.config({ path: '.env.local' })

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY

const supabase = createClient(supabaseUrl, supabaseAnonKey)

const beautyCenters = [
  {
    nome: 'Beauty Studio Milano',
    partita_iva: '12345678901',
    codice_fiscale: 'RSSLRA80A01F205X',
    email: 'info@beautystudiomilano.it',
    telefono: '+39 02 1234567',
    indirizzo: 'Via Roma 123',
    cap: '20121',
    citta: 'Milano',
    provincia: 'MI'
  },
  {
    nome: 'Centro Estetico Venere',
    partita_iva: '98765432109',
    codice_fiscale: 'BNCGLI85B42H501Y',
    email: 'contatti@venere.it',
    telefono: '+39 06 7654321',
    indirizzo: 'Corso Venezia 45',
    cap: '00186',
    citta: 'Roma',
    provincia: 'RM'
  },
  {
    nome: 'Spa & Wellness Firenze',
    partita_iva: '11223344556',
    codice_fiscale: 'VRDMRC78C15D612Z',
    email: 'info@spawellness.it',
    telefono: '+39 055 9876543',
    indirizzo: 'Piazza Duomo 10',
    cap: '50122',
    citta: 'Firenze',
    provincia: 'FI'
  }
]

async function seedBeautyCenters() {
  console.log('🌱 Inizio inserimento dati...')

  try {
    const { data, error } = await supabase
      .from('beauty_centers')
      .insert(beautyCenters)
      .select()

    if (error) {
      console.error('❌ Errore durante l\'inserimento:', error)
      process.exit(1)
    }

    console.log('✅ Dati inseriti con successo!')
    console.log('📊 Centri inseriti:', data.length)
    console.log(data)

  } catch (err) {
    console.error('❌ Errore:', err)
    process.exit(1)
  }
}

seedBeautyCenters()
