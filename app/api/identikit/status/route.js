import { createServerClient } from '@supabase/ssr'
import { createClient } from '@supabase/supabase-js'
import { cookies } from 'next/headers'
import { NextResponse } from 'next/server'
import { isWithinReportFreeWindow } from '@/lib/report/freeWindow'
import { isPiattaformaPlanCodice } from '@/lib/platformPlan'

// Nuovo endpoint (21/09/2026, task #219): dice all'app dove deve portare il
// click su "Identikit CURA" per un utente GIÀ LOGGATO — prima cliccare quel
// link (in Navbar, raggiungibile anche da /listino) mandava SEMPRE alla
// landing pubblica /report con l'invito a registrarsi, anche per chi era già
// dentro la piattaforma col suo account (bug segnalato da Mason). La landing
// pubblica resta corretta SOLO per un visitatore anonimo — vedi app/report/page.js,
// che ora chiama questo endpoint per un utente autenticato prima di decidere
// cosa mostrare.
//
// "Attivo" = l'utente ha un piano che include l'Identikit: il piano dedicato
// `report_profiling` (assegnato gratis in fase di registrazione, vedi
// app/api/onboarding/create-centro/route.js) OPPURE un piano piattaforma vero
// (starter/professional/enterprise, che include tutto — isPiattaformaPlanCodice,
// lib/platformPlan.js). "demo"/nessun piano = non attivo.
function adminClient() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL,
    process.env.SUPABASE_SERVICE_KEY
  )
}

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

    const admin = adminClient()

    const { data: profile } = await admin
      .from('user_profiles')
      .select('centro_id')
      .eq('id', user.id)
      .maybeSingle()

    // Stesso pattern/stessa priorità già in uso in
    // lib/auth/verifyCentroOwnership.js (requirePiattaformaPlanForUser): un
    // utente ha al massimo una riga (UNIQUE(user_id)), l'ordinamento è solo
    // difensivo se mai smettesse di esserlo.
    const { data: subRows } = await admin
      .from('user_subscriptions')
      .select('plan:subscription_plans(codice)')
      .eq('user_id', user.id)
      .order('assegnato_da_admin', { ascending: false })
      .order('created_at', { ascending: false })
      .limit(1)

    const codice = subRows?.[0]?.plan?.codice || null
    const active = codice === 'report_profiling' || isPiattaformaPlanCodice(codice)

    if (!active) {
      return NextResponse.json({
        active: false,
        hasCentro: !!profile?.centro_id,
        withinFreeWindow: isWithinReportFreeWindow(),
      })
    }

    // Attivo: capiamo a che punto è nel suo percorso, per aprire direttamente
    // l'esperienza giusta invece di un generico "vai al questionario".
    let stage = 'not_started'
    if (profile?.centro_id) {
      const { data: reportRow } = await admin
        .from('profiling_reports')
        .select('id')
        .eq('centro_id', profile.centro_id)
        .eq('stato', 'generato')
        .maybeSingle()

      if (reportRow) {
        stage = 'completed'
      } else {
        const { data: sessionRow } = await admin
          .from('profiling_sessions')
          .select('id')
          .eq('centro_id', profile.centro_id)
          .maybeSingle()
        if (sessionRow) stage = 'in_progress'
      }
    }

    return NextResponse.json({ active: true, hasCentro: !!profile?.centro_id, stage })
  } catch (error) {
    console.error('[identikit/status] Errore:', error)
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
}
