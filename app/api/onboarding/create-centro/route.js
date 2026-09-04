import { NextResponse } from 'next/server'
import { cookies } from 'next/headers'
import { createServerClient } from '@supabase/ssr'
import { createClient } from '@supabase/supabase-js'
import { subscribeToBeehiiv, ensureGuidaAccessToken, GUIDA_ALLOWED_STATUSES } from '@/lib/newsletter/beehiiv'

// Piano assegnato gratuitamente in fase di registrazione (29/08/2026, decisione
// Mason): niente iscrizioni separate per newsletter/miniguida/report — la
// creazione del centro (questo endpoint) è l'UNICA azione di registrazione e
// attiva in un colpo solo le 3 cose. Nessun checkout Stripe in questa fase:
// il piano è assegnato direttamente, gratis, per i primi 90 giorni dal lancio
// pubblico del report (vedi components/common/ReportCountdownBanner.js per la
// data di lancio configurabile — qui l'assegnazione NON verifica ancora quella
// finestra: siamo in fase pre-lancio, quindi chiunque si registra oggi rientra
// per costruzione nei 90 giorni gratuiti). Coerente con
// piano-sviluppo-report-care.md, punto 2 (aggiornamento 28/08 sera).
const REPORT_PROFILING_PLAN_CODICE = 'report_profiling'

export async function POST(request) {
  try {
    const body = await request.json()
    const { nome, email, telefono, indirizzo, citta, cap, partita_iva } = body

    if (!nome?.trim()) {
      return NextResponse.json({ error: 'Il nome del centro è obbligatorio' }, { status: 400 })
    }

    // Auth check tramite SSR client
    const cookieStore = await cookies()
    const supabaseAuth = createServerClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY,
      {
        cookies: {
          getAll: () => cookieStore.getAll(),
          setAll: (cookiesToSet) => {
            cookiesToSet.forEach(({ name, value, options }) =>
              cookieStore.set(name, value, options)
            )
          }
        }
      }
    )

    const { data: { user } } = await supabaseAuth.auth.getUser()
    if (!user) {
      return NextResponse.json({ error: 'Non autorizzato' }, { status: 401 })
    }

    // Verifica che l'utente non abbia già un centro
    const { data: profile } = await supabaseAuth
      .from('user_profiles')
      .select('centro_id, ruolo_livello')
      .eq('id', user.id)
      .single()

    if (profile?.centro_id) {
      return NextResponse.json({ error: 'Hai già un centro associato' }, { status: 400 })
    }

    // Operazioni privilegiate con service key
    const supabaseAdmin = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL,
      process.env.SUPABASE_SERVICE_KEY
    )

    // 1. Crea il centro
    const { data: centro, error: centroError } = await supabaseAdmin
      .from('beauty_centers')
      .insert([{
        nome: nome.trim(),
        email: email?.trim() || null,
        telefono: telefono?.trim() || null,
        indirizzo: indirizzo?.trim() || null,
        citta: citta?.trim() || null,
        cap: cap?.trim() || null,
        partita_iva: partita_iva?.trim() || null
      }])
      .select()
      .single()

    if (centroError) throw centroError

    // 2. Associa il centro al profilo utente
    const { error: profileError } = await supabaseAdmin
      .from('user_profiles')
      .update({ centro_id: centro.id })
      .eq('id', user.id)

    if (profileError) throw profileError

    // =====================================================
    // REGISTRAZIONE UNIFICATA (29/08/2026, decisione Mason) — best-effort,
    // NON deve mai far fallire la creazione del centro (già avvenuta sopra).
    // Attiva in un colpo solo: (a) iscrizione newsletter, (b) accesso miniguida,
    // (c) assegnazione piano report_profiling gratuito. Ogni pezzo è isolato in
    // try/catch indipendente: un fallimento su uno dei tre non deve bloccare
    // gli altri né la risposta 201 già garantita dalla creazione del centro.
    // =====================================================
    const registrazioneUnificata = { newsletter: false, guidaToken: null, reportProfiling: false }

    // (a) + (b) — iscrizione Beehiiv + token miniguida (stessa funzione già
    // usata da /api/newsletter/subscribe, vedi lib/newsletter/beehiiv.js).
    // L'email è quella reale della sessione autenticata (user.email), mai
    // presa dal body: non deve poter essere spoofata.
    if (user.email) {
      try {
        const subscribeResult = await subscribeToBeehiiv(user.email, { utmMedium: 'create-centro' })
        if (subscribeResult.ok) {
          registrazioneUnificata.newsletter = true
          if (GUIDA_ALLOWED_STATUSES.has(subscribeResult.status)) {
            registrazioneUnificata.guidaToken = await ensureGuidaAccessToken(user.email)
          }
        } else {
          console.error('[create-centro] Iscrizione Beehiiv fallita (non bloccante):', subscribeResult.error)
        }
      } catch (err) {
        console.error('[create-centro] Errore iscrizione newsletter/miniguida (non bloccante):', err.message)
      }
    }

    // (c) — assegnazione piano report_profiling gratuito. Upsert (mai insert
    // cieco): user_subscriptions ha UNIQUE(user_id), un utente potrebbe già
    // avere una riga (es. piano free/demo pre-esistente). Non sovrascrive
    // un'assegnazione fatta a mano da un admin (assegnato_da_admin=true) —
    // in quel caso l'admin ha già deciso il piano per un motivo specifico.
    try {
      const { data: existingSub } = await supabaseAdmin
        .from('user_subscriptions')
        .select('id, assegnato_da_admin')
        .eq('user_id', user.id)
        .maybeSingle()

      if (existingSub?.assegnato_da_admin) {
        console.log('[create-centro] Utente ha già un piano assegnato manualmente da admin — report_profiling NON sovrascritto:', user.id)
      } else {
        const { data: piano, error: pianoError } = await supabaseAdmin
          .from('subscription_plans')
          .select('id')
          .eq('codice', REPORT_PROFILING_PLAN_CODICE)
          .single()

        if (pianoError || !piano) {
          console.error('[create-centro] Piano report_profiling non trovato in subscription_plans (migration applicata?):', pianoError?.message)
        } else {
          const { error: subError } = await supabaseAdmin
            .from('user_subscriptions')
            .upsert({
              user_id: user.id,
              plan_id: piano.id,
              stato: 'attivo',
              assegnato_da_admin: false,
              note_admin: 'Assegnazione automatica in fase di registrazione (report CARE gratuito primi 90 giorni dal lancio pubblico — vedi memory/davide.md 29/08/2026)',
              updated_at: new Date().toISOString()
            }, { onConflict: 'user_id' })

          if (subError) {
            console.error('[create-centro] Errore upsert user_subscriptions report_profiling (non bloccante):', subError.message)
          } else {
            registrazioneUnificata.reportProfiling = true
          }
        }
      }
    } catch (err) {
      console.error('[create-centro] Errore assegnazione piano report_profiling (non bloccante):', err.message)
    }

    return NextResponse.json({ centro, registrazioneUnificata }, { status: 201 })

  } catch (error) {
    console.error('Errore creazione centro:', error)
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
}
