import { createClient } from '@supabase/supabase-js'
import { createServerClient } from '@supabase/ssr'
import { cookies } from 'next/headers'
import { NextResponse } from 'next/server'
import { isWithinReportFreeWindow } from '@/lib/report/freeWindow'

// Tracciamento interno (non esposto in UI, vedi
// supabase/migrations/20260920_user_resource_access.sql e memory/generale.md
// 20/09/2026, "Modello commerciale corretto"): registra quali risorse
// (identikit/tool) un utente ha selezionato/ottenuto e quanto ha
// REALMENTE pagato. Nessun flusso di pagamento reale qui dentro — durante
// i 90gg tutto quello che passa da questo endpoint e' sempre gratis
// (importo_pagato=0), coerente con "prima sono comunque entrambi gratis"
// (bundle post-90gg, deciso ma non implementato ora).

const RISORSE_VALIDE = ['identikit', 'tool']

function adminClient() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL,
    process.env.SUPABASE_SERVICE_KEY
  )
}

// POST: registra le risorse selezionate al momento della registrazione
// (chiamata da app/signup/page.js subito dopo signUp, stesso pattern gia'
// in uso per /api/user/legal-public — user_id appena creato, nessuna
// sessione garantita ancora attiva se l'email non e' stata confermata).
export async function POST(request) {
  try {
    const body = await request.json()
    const { user_id, risorse } = body

    if (!user_id || !Array.isArray(risorse) || risorse.length === 0) {
      return NextResponse.json({ error: 'Dati mancanti' }, { status: 400 })
    }

    const risorseValide = risorse.filter(r => RISORSE_VALIDE.includes(r))
    if (risorseValide.length === 0) {
      return NextResponse.json({ error: 'Nessuna risorsa valida' }, { status: 400 })
    }

    const supabase = adminClient()

    // Verifica che l'utente esista (stesso controllo di legal-public)
    const { data: profile } = await supabase
      .from('user_profiles')
      .select('id, centro_id')
      .eq('id', user_id)
      .maybeSingle()

    if (!profile) {
      return NextResponse.json({ error: 'Utente non trovato' }, { status: 404 })
    }

    // Fuori dalla finestra dei 90gg gratuiti: nessun checkout reale esiste
    // ancora per queste risorse (ne' 60€ Identikit ne' 29€ Tool), quindi
    // non c'e' nulla di corretto da registrare qui — non inseriamo righe
    // "pagato" finte. Il chiamante (signup) non mostra comunque la
    // selezione come "gratis" fuori finestra.
    if (!isWithinReportFreeWindow()) {
      return NextResponse.json({ success: true, skipped: true, reason: 'fuori dalla finestra 90gg, nessun checkout reale disponibile' })
    }

    const rows = risorseValide.map(risorsa => ({
      user_id,
      centro_id: profile.centro_id || null,
      risorsa,
      tipo_accesso: 'gratuito_90gg',
      importo_pagato: 0,
      richiesta_al_signup: true,
    }))

    const { error } = await supabase
      .from('user_resource_access')
      .upsert(rows, { onConflict: 'user_id,risorsa', ignoreDuplicates: true })

    if (error) {
      // Tabella predisposta ma non ancora applicata al DB di produzione
      // (vedi nota in testa alla migration) — non deve bloccare la
      // registrazione dell'utente, che e' gia' andata a buon fine a monte.
      console.error('Errore registrazione risorse (tabella forse non ancora applicata):', error)
      return NextResponse.json({ success: false, error: error.message }, { status: 200 })
    }

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('Errore API resource-access POST:', error)
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
}

// GET: per l'utente autenticato corrente, ritorna le risorse gia' concesse
// (uso futuro: dashboard/impostazioni, badge "hai gia' sbloccato" — non
// ancora collegato a nessuna UI oggi). Sessione vera via cookie, mai un
// user_id passato dal client.
export async function GET() {
  try {
    const cookieStore = await cookies()
    const supabaseAuth = createServerClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY,
      { cookies: { getAll: () => cookieStore.getAll(), setAll: () => {} } }
    )
    const { data: { user } } = await supabaseAuth.auth.getUser()
    if (!user) {
      return NextResponse.json({ error: 'Non autenticato' }, { status: 401 })
    }

    const supabase = adminClient()
    const { data, error } = await supabase
      .from('user_resource_access')
      .select('risorsa, tipo_accesso, importo_pagato, data_concessione')
      .eq('user_id', user.id)

    if (error) {
      // Stesso motivo del POST: la tabella potrebbe non essere ancora
      // applicata al DB — non un errore per il chiamante, semplicemente
      // nessuna risorsa tracciata ancora.
      return NextResponse.json({ data: [] })
    }

    return NextResponse.json({ data: data || [] })
  } catch (error) {
    console.error('Errore API resource-access GET:', error)
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
}
