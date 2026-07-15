import { cookies } from 'next/headers'
import { createServerClient } from '@supabase/ssr'
import { createClient } from '@supabase/supabase-js'
import { NextResponse } from 'next/server'

// GET: Ottieni abbonamento e consumo per l'utente corrente
export async function GET(request) {
  try {
    const cookieStore = await cookies()
    const supabase = createServerClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY,
      { cookies: { getAll() { return cookieStore.getAll() } } }
    )

    const { data: { user } } = await supabase.auth.getUser()
    if (!user) {
      return NextResponse.json({ error: 'Non autenticato' }, { status: 401 })
    }

    // Usa service key per bypassare RLS — stessa logica del pannello admin
    const supabaseAdmin = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL,
      process.env.SUPABASE_SERVICE_KEY
    )

    // Query diretta identica a quella admin: assegnato_da_admin prima, poi attivo, poi più recente
    const { data: rows, error } = await supabaseAdmin
      .from('user_subscriptions')
      .select(`
        id, stato, periodo, data_inizio, data_fine, data_prossimo_rinnovo,
        token_ai_usati, ore_hpa_usate, mese_conteggio,
        assegnato_da_admin, note_admin,
        plan:subscription_plans(
          id, codice, nome, descrizione,
          prezzo_mensile, prezzo_annuale,
          token_ai_mensili, ore_hpa_mensili,
          centri_max, utenti_max, funzionalita,
          is_free, is_trial
        )
      `)
      .eq('user_id', user.id)
      .order('assegnato_da_admin', { ascending: false })   // true prima
      .order('created_at', { ascending: false })            // poi più recente

    if (error) {
      console.error('[balance] Errore query:', error)
      return NextResponse.json({ subscription: null, plan: null, usage: null })
    }

    if (!rows || rows.length === 0) {
      return NextResponse.json({ subscription: null, plan: null, usage: null })
    }

    // Prendi la prima riga (priorità: admin-assegnata > più recente)
    const row = rows[0]
    const { plan, ...sub } = row

    const tokenMensili = plan?.token_ai_mensili ?? 0
    const oreMensili   = plan?.ore_hpa_mensili  ?? 0
    const tokenUsati   = sub.token_ai_usati ?? 0
    const oreUsate     = sub.ore_hpa_usate  ?? 0

    const usage = {
      token_percentage: tokenMensili > 0 ? Math.round((tokenUsati / tokenMensili) * 100 * 10) / 10 : 0,
      hpa_percentage:   oreMensili   > 0 ? Math.round((oreUsate   / oreMensili)   * 100 * 10) / 10 : 0,
      token_remaining:  tokenMensili > 0 ? tokenMensili - tokenUsati : -1,
      hpa_remaining:    oreMensili   > 0 ? oreMensili   - oreUsate   : -1,
    }

    return NextResponse.json({ subscription: sub, plan, usage })
  } catch (error) {
    console.error('Errore GET balance:', error)
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
}
