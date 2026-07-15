import { cookies } from 'next/headers'
import { createServerClient } from '@supabase/ssr'
import { createClient } from '@supabase/supabase-js'
import { NextResponse } from 'next/server'

// Helper: verifica autenticazione e ruolo admin
async function verifyAdmin() {
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
    return { error: NextResponse.json({ error: 'Non autenticato' }, { status: 401 }) }
  }

  // Verifica ruolo admin
  const { data: profile } = await supabase
    .from('user_profiles')
    .select('ruolo, ruolo_livello')
    .eq('id', user.id)
    .single()

  if (profile?.ruolo_livello !== 'admin' && profile?.ruolo !== 'admin') {
    return { error: NextResponse.json({ error: 'Non autorizzato' }, { status: 403 }) }
  }

  // Client con service role per accesso completo
  const supabaseAdmin = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL,
    process.env.SUPABASE_SERVICE_KEY
  )

  return { user, supabaseAdmin }
}

// GET: Overview abbonamenti con KPI e lista sottoscrizioni
export async function GET(request) {
  try {
    const { user, supabaseAdmin, error } = await verifyAdmin()
    if (error) return error

    const { searchParams } = new URL(request.url)
    const plan = searchParams.get('plan')
    const stato = searchParams.get('stato')
    const search = searchParams.get('search')
    const userIdExact = searchParams.get('user_id_exact')

    // Recupera KPI overview tramite RPC
    const { data: overview, error: overviewError } = await supabaseAdmin
      .rpc('get_admin_subscription_overview')

    if (overviewError) {
      console.error('Errore RPC overview:', overviewError)
    }

    // Escludi admin/HPA dalle sottoscrizioni (non hanno profilo abbonamento)
    const { data: exemptUsers } = await supabaseAdmin
      .from('user_profiles')
      .select('id')
      .in('ruolo_livello', ['admin', 'hpa'])

    // Query sottoscrizioni con join a piani e profili utente
    let query = supabaseAdmin
      .from('user_subscriptions')
      .select(`
        *,
        plan:subscription_plans(id, codice, nome, prezzo_mensile, prezzo_annuale, is_free, is_trial),
        user:user_profiles!user_subscriptions_user_id_fkey(id, email, nome, cognome, ruolo_livello, piano, centro_id)
      `)
      .order('created_at', { ascending: false })

    if (exemptUsers?.length > 0) {
      const exemptIds = exemptUsers.map(u => u.id)
      query = query.not('user_id', 'in', `(${exemptIds.join(',')})`)
    }

    // Filtro per user_id esatto (pagina dettaglio utente)
    if (userIdExact) {
      query = query.eq('user_id', userIdExact)
    }

    // Filtro per piano (codice)
    if (plan) {
      // Cerchiamo prima l'id del piano per codice
      const { data: planData } = await supabaseAdmin
        .from('subscription_plans')
        .select('id')
        .eq('codice', plan)
        .single()

      if (planData) {
        query = query.eq('plan_id', planData.id)
      }
    }

    // Filtro per stato
    if (stato) {
      query = query.eq('stato', stato)
    }

    // Filtro per ricerca email
    if (search) {
      // Per cercare per email dobbiamo fare una query separata sugli user_profiles
      const { data: matchingUsers } = await supabaseAdmin
        .from('user_profiles')
        .select('id')
        .ilike('email', `%${search}%`)

      if (matchingUsers && matchingUsers.length > 0) {
        const userIds = matchingUsers.map(u => u.id)
        query = query.in('user_id', userIds)
      } else {
        // Nessun utente trovato, ritorna array vuoto
        return NextResponse.json({
          overview: overview?.[0] || overview || {},
          subscriptions: []
        })
      }
    }

    const { data: subscriptions, error: subsError } = await query

    if (subsError) {
      console.error('Errore query sottoscrizioni:', subsError)
      return NextResponse.json({ error: 'Errore nel recupero delle sottoscrizioni' }, { status: 500 })
    }

    return NextResponse.json({
      overview: overview?.[0] || overview || {},
      subscriptions: subscriptions || []
    })
  } catch (error) {
    console.error('Errore admin subscriptions GET:', error)
    return NextResponse.json({ error: 'Errore interno' }, { status: 500 })
  }
}

// POST: Assegna piano a un utente
export async function POST(request) {
  try {
    const { user, supabaseAdmin, error } = await verifyAdmin()
    if (error) return error

    const body = await request.json()
    const { user_id, plan_codice, note_admin, is_free } = body

    if (!user_id || !plan_codice) {
      return NextResponse.json(
        { error: 'user_id e plan_codice sono obbligatori' },
        { status: 400 }
      )
    }

    // Admin e HPA non hanno profilo abbonamento (contrattualizzati/liberi professionisti)
    const { data: targetProfile } = await supabaseAdmin
      .from('user_profiles')
      .select('ruolo_livello')
      .eq('id', user_id)
      .maybeSingle()

    if (targetProfile?.ruolo_livello === 'admin' || targetProfile?.ruolo_livello === 'hpa') {
      return NextResponse.json(
        { error: 'Amministratori e HPA non hanno un profilo di abbonamento. Sono professionisti contrattualizzati o pagati a parcella.' },
        { status: 400 }
      )
    }

    // Lookup plan_id dal codice
    const { data: plan, error: planError } = await supabaseAdmin
      .from('subscription_plans')
      .select('*')
      .eq('codice', plan_codice)
      .single()

    if (planError || !plan) {
      return NextResponse.json(
        { error: `Piano non trovato con codice: ${plan_codice}` },
        { status: 404 }
      )
    }

    // Demo non è riassegnabile: se l'utente l'ha già avuto, blocca
    if (plan.codice === 'demo') {
      const { data: existingSub } = await supabaseAdmin
        .from('user_subscriptions')
        .select('id, data_fine, data_inizio')
        .eq('user_id', user_id)
        .maybeSingle()

      if (existingSub?.data_fine) {
        // Ha già avuto/ha il demo con scadenza → non rinnovabile
        const scadenzaStr = new Date(existingSub.data_fine).toLocaleDateString('it-IT')
        return NextResponse.json(
          { error: `Il piano Demo è non rinnovabile. Scadenza: ${scadenzaStr}. Assegna un piano a pagamento.` },
          { status: 400 }
        )
      }
    }

    // Calcola date
    const now = new Date()
    const currentMonth = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`
    let dataFine = null

    if (plan.is_trial) {
      // Trial: data_fine = NOW + durata_trial_giorni
      const trialEnd = new Date(now)
      trialEnd.setDate(trialEnd.getDate() + (plan.durata_trial_giorni || 30))
      dataFine = trialEnd.toISOString()
    } else if (!plan.is_free && !is_free) {
      // Piano a pagamento: data_fine a 30 giorni (gestita poi da Stripe/rinnovo)
      const paidEnd = new Date(now)
      paidEnd.setDate(paidEnd.getDate() + 30)
      dataFine = paidEnd.toISOString()
    }
    // Piano free o assegnato come free: data_fine = NULL (illimitato)

    // UPSERT nella tabella user_subscriptions (user_id e' UNIQUE)
    const subscriptionData = {
      user_id,
      plan_id: plan.id,
      stato: 'attivo',
      data_inizio: now.toISOString(),
      data_fine: dataFine,
      assegnato_da_admin: true,
      admin_assegnante_id: user.id,
      note_admin: note_admin || null,
      // Reset contatori
      token_ai_usati: 0,
      ore_hpa_usate: 0,
      mese_conteggio: currentMonth,
      updated_at: now.toISOString()
    }

    const { data: subscription, error: upsertError } = await supabaseAdmin
      .from('user_subscriptions')
      .upsert(subscriptionData, { onConflict: 'user_id' })
      .select(`
        *,
        plan:subscription_plans(id, codice, nome, prezzo_mensile, is_free, is_trial)
      `)
      .single()

    if (upsertError) {
      console.error('Errore upsert sottoscrizione:', upsertError)
      return NextResponse.json(
        { error: 'Errore nell\'assegnazione del piano' },
        { status: 500 }
      )
    }

    // Aggiorna user_profiles.piano per retrocompatibilita
    const { error: profileError } = await supabaseAdmin
      .from('user_profiles')
      .update({ piano: plan_codice, updated_at: now.toISOString() })
      .eq('id', user_id)

    if (profileError) {
      console.error('Errore aggiornamento profilo piano:', profileError)
      // Non bloccare: la sottoscrizione e' gia' stata creata
    }

    return NextResponse.json({
      success: true,
      subscription
    }, { status: 201 })
  } catch (error) {
    console.error('Errore admin subscriptions POST:', error)
    return NextResponse.json({ error: 'Errore interno' }, { status: 500 })
  }
}
