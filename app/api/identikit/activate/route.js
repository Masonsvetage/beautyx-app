import { createServerClient } from '@supabase/ssr'
import { createClient } from '@supabase/supabase-js'
import { cookies } from 'next/headers'
import { NextResponse } from 'next/server'
import { isWithinReportFreeWindow } from '@/lib/report/freeWindow'

// Nuovo endpoint (21/09/2026, task #219): attiva gratis l'Identikit
// strategico CURA per un utente GIA' REGISTRATO che non lo ha ancora (oggi
// un caso raro — create-centro/route.js lo assegna già in automatico a ogni
// nuovo centro — ma resta possibile: account creati prima che quel
// meccanismo esistesse, o il piano report_profiling perso per il bug del
// trigger DB appena corretto nel task #218). Stesso identico meccanismo già
// in uso in app/api/onboarding/create-centro/route.js (upsert su
// user_subscriptions, mai un insert cieco, mai sovrascrive
// un'assegnazione fatta a mano da un admin) — non un pattern nuovo.
const REPORT_PROFILING_PLAN_CODICE = 'report_profiling'

function adminClient() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL,
    process.env.SUPABASE_SERVICE_KEY
  )
}

export async function POST() {
  try {
    const cookieStore = await cookies()
    const supabaseAuth = createServerClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY,
      { cookies: { getAll: () => cookieStore.getAll(), setAll: () => {} } }
    )
    const { data: { user } } = await supabaseAuth.auth.getUser()
    if (!user) {
      return NextResponse.json({ error: 'Non autorizzato' }, { status: 401 })
    }

    if (!isWithinReportFreeWindow()) {
      return NextResponse.json({ error: 'La finestra gratuita dei 90 giorni è scaduta' }, { status: 403 })
    }

    const admin = adminClient()

    const { data: profile } = await admin
      .from('user_profiles')
      .select('centro_id')
      .eq('id', user.id)
      .maybeSingle()

    if (!profile?.centro_id) {
      // Non ha ancora completato lo step "crea il tuo centro" — l'Identikit
      // si attiva insieme al centro (create-centro/route.js), qui non c'è
      // nulla da attivare finché quello step non è fatto.
      return NextResponse.json({ error: 'Completa prima la creazione del tuo centro' }, { status: 400 })
    }

    const { data: existingSub } = await admin
      .from('user_subscriptions')
      .select('id, assegnato_da_admin')
      .eq('user_id', user.id)
      .maybeSingle()

    if (existingSub?.assegnato_da_admin) {
      return NextResponse.json({ error: 'Il tuo piano è stato impostato manualmente dal supporto beautyx — contattaci per attivare l\'Identikit' }, { status: 409 })
    }

    const { data: piano, error: pianoError } = await admin
      .from('subscription_plans')
      .select('id')
      .eq('codice', REPORT_PROFILING_PLAN_CODICE)
      .single()

    if (pianoError || !piano) {
      console.error('[identikit/activate] Piano report_profiling non trovato:', pianoError?.message)
      return NextResponse.json({ error: 'Errore di configurazione, riprova più tardi' }, { status: 500 })
    }

    const { error: subError } = await admin
      .from('user_subscriptions')
      .upsert({
        user_id: user.id,
        plan_id: piano.id,
        stato: 'attivo',
        assegnato_da_admin: false,
        note_admin: 'Attivazione post-registrazione da /report (task #219, 21/09/2026)',
        updated_at: new Date().toISOString()
      }, { onConflict: 'user_id' })

    if (subError) {
      console.error('[identikit/activate] Errore upsert user_subscriptions:', subError.message)
      return NextResponse.json({ error: subError.message }, { status: 500 })
    }

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('[identikit/activate] Errore:', error)
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
}
