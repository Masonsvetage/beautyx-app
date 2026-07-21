import { createClient } from '@supabase/supabase-js'
import { NextResponse } from 'next/server'

// GET: Controlla abbonamenti scaduti e processa cancellazioni pendenti
// Protetto da CRON_SECRET per evitare chiamate non autorizzate
export async function GET(request) {
  try {
    const authHeader = request.headers.get('authorization')
    const cronSecret = process.env.CRON_SECRET

    if (!cronSecret || authHeader !== `Bearer ${cronSecret}`) {
      return NextResponse.json({ error: 'Non autorizzato' }, { status: 401 })
    }

    const supabase = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL,
      process.env.SUPABASE_SERVICE_KEY
    )

    // 1. Controlla abbonamenti scaduti e blocca accesso
    const { data: expiredCount, error: expiredError } = await supabase.rpc('check_expired_subscriptions')

    if (expiredError) {
      console.error('Errore check abbonamenti:', expiredError)
      return NextResponse.json({ error: expiredError.message }, { status: 500 })
    }

    // 2. Disattiva utenti con cancellazione effettiva scaduta
    const { data: deletionCount, error: deletionError } = await supabase.rpc('cleanup_expired_deletions')

    if (deletionError) {
      console.error('Errore cleanup cancellazioni:', deletionError)
      return NextResponse.json({ error: deletionError.message }, { status: 500 })
    }

    // 3. Controlla compliance documenti legali (sospende profili con documenti scaduti non accettati)
    let legalCount = 0
    const { data: legalData, error: legalError } = await supabase.rpc('check_legal_compliance')

    if (legalError) {
      console.error('Errore check legal compliance:', legalError)
    } else {
      legalCount = legalData || 0
    }

    console.log(`[CRON] Check subscriptions: ${expiredCount} scaduti, ${deletionCount} cancellazioni processate, ${legalCount} sospesi per mancata accettazione legale`)

    return NextResponse.json({
      success: true,
      expired_processed: expiredCount,
      deletions_processed: deletionCount,
      legal_suspended: legalCount,
      timestamp: new Date().toISOString()
    })
  } catch (error) {
    console.error('Errore cron check-subscriptions:', error)
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
}
