import { createClient } from '@supabase/supabase-js'
import { NextResponse } from 'next/server'

// GET: Reset contatori mensili (chiamato da Vercel Cron o manualmente)
// Protetto da CRON_SECRET per evitare chiamate non autorizzate
export async function GET(request) {
  try {
    // Verifica autorizzazione
    const authHeader = request.headers.get('authorization')
    const cronSecret = process.env.CRON_SECRET

    if (!cronSecret || authHeader !== `Bearer ${cronSecret}`) {
      return NextResponse.json({ error: 'Non autorizzato' }, { status: 401 })
    }

    const supabase = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL,
      process.env.SUPABASE_SERVICE_KEY
    )

    // Chiama la funzione SQL che resetta i contatori
    const { data, error } = await supabase.rpc('reset_monthly_counters')

    if (error) {
      console.error('Errore reset contatori:', error)
      return NextResponse.json({ error: error.message }, { status: 500 })
    }

    console.log(`[CRON] Reset contatori mensili: ${data} utenti aggiornati`)

    return NextResponse.json({
      success: true,
      updated_count: data,
      timestamp: new Date().toISOString()
    })
  } catch (error) {
    console.error('Errore cron reset-counters:', error)
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
}
