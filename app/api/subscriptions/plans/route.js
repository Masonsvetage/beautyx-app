import { cookies } from 'next/headers'
import { createServerClient } from '@supabase/ssr'
import { NextResponse } from 'next/server'

// GET: Lista piani abbonamento attivi (utenti autenticati)
export async function GET(request) {
  try {
    const cookieStore = await cookies()

    const supabase = createServerClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY,
      {
        cookies: {
          getAll() {
            return cookieStore.getAll()
          },
        },
      }
    )

    const { data: { user } } = await supabase.auth.getUser()
    if (!user) {
      return NextResponse.json({ error: 'Non autenticato' }, { status: 401 })
    }

    // Recupera piani attivi ordinati per ordine
    const { data: plans, error: plansError } = await supabase
      .from('subscription_plans')
      .select('*')
      .eq('attivo', true)
      .order('ordine', { ascending: true })

    if (plansError) {
      console.error('Errore recupero piani:', plansError)
      return NextResponse.json({ error: 'Errore nel recupero dei piani' }, { status: 500 })
    }

    // Recupera campagne sconto attive applicabili ai piani
    const now = new Date().toISOString()
    const { data: campaigns, error: campaignsError } = await supabase
      .from('discount_campaigns')
      .select('*')
      .eq('attivo', true)
      .lte('data_inizio', now)
      .or(`data_fine.is.null,data_fine.gte.${now}`)

    if (campaignsError) {
      console.error('Errore recupero campagne:', campaignsError)
      // Non bloccare la risposta per errore campagne
    }

    return NextResponse.json({
      plans: plans || [],
      campaigns: campaigns || []
    })
  } catch (error) {
    console.error('Errore GET piani abbonamento:', error)
    return NextResponse.json({ error: 'Errore interno' }, { status: 500 })
  }
}
