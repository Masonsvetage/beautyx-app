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

  const { data: profile } = await supabase
    .from('user_profiles')
    .select('ruolo, ruolo_livello')
    .eq('id', user.id)
    .single()

  if (profile?.ruolo_livello !== 'admin' && profile?.ruolo !== 'admin') {
    return { error: NextResponse.json({ error: 'Non autorizzato' }, { status: 403 }) }
  }

  const supabaseAdmin = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL,
    process.env.SUPABASE_SERVICE_KEY
  )

  return { user, supabaseAdmin }
}

// GET: Lista piani — ?all=true include i vecchi piani inattivi (tab gestione)
//      default: solo piani attivi (per dropdown assegnazione)
export async function GET(request) {
  try {
    const { user, supabaseAdmin, error } = await verifyAdmin()
    if (error) return error

    const { searchParams } = new URL(request.url)
    const showAll = searchParams.get('all') === 'true'

    let query = supabaseAdmin
      .from('subscription_plans')
      .select('*')
      .order('ordine', { ascending: true })

    // Di default mostra solo piani attivi; con ?all=true mostra tutti
    if (!showAll) {
      query = query.eq('attivo', true)
    }

    const { data, error: queryError } = await query

    if (queryError) {
      console.error('Errore lista piani:', queryError)
      return NextResponse.json({ error: 'Errore nel recupero dei piani' }, { status: 500 })
    }

    return NextResponse.json({ plans: data || [] })
  } catch (error) {
    console.error('Errore admin plans GET:', error)
    return NextResponse.json({ error: 'Errore interno' }, { status: 500 })
  }
}

// PUT: Aggiorna un piano esistente
export async function PUT(request) {
  try {
    const { user, supabaseAdmin, error } = await verifyAdmin()
    if (error) return error

    const body = await request.json()
    const { id, ...fields } = body

    if (!id) {
      return NextResponse.json({ error: 'ID piano obbligatorio' }, { status: 400 })
    }

    // Campi non modificabili
    delete fields.created_at
    delete fields.codice // il codice non si cambia

    // Sanitizza funzionalita: se stringa, converti in array
    if (typeof fields.funzionalita === 'string') {
      fields.funzionalita = fields.funzionalita
        .split(',')
        .map(f => f.trim())
        .filter(Boolean)
    }

    // Sanitizza numeri
    if (fields.prezzo_mensile != null) fields.prezzo_mensile = parseFloat(fields.prezzo_mensile) || 0
    if (fields.prezzo_trimestrale != null) fields.prezzo_trimestrale = parseFloat(fields.prezzo_trimestrale) || 0
    if (fields.prezzo_annuale != null) fields.prezzo_annuale = parseFloat(fields.prezzo_annuale) || 0
    if (fields.token_ai_mensili != null) fields.token_ai_mensili = parseInt(fields.token_ai_mensili) || 0
    if (fields.ore_hpa_mensili != null) fields.ore_hpa_mensili = parseFloat(fields.ore_hpa_mensili) || 0
    if (fields.centri_max != null) fields.centri_max = parseInt(fields.centri_max) || 0
    if (fields.utenti_max != null) fields.utenti_max = parseInt(fields.utenti_max) || 0
    if (fields.durata_trial_giorni != null) fields.durata_trial_giorni = parseInt(fields.durata_trial_giorni) || 30
    if (fields.ordine != null) fields.ordine = parseInt(fields.ordine) || 0

    const { data, error: updateError } = await supabaseAdmin
      .from('subscription_plans')
      .update(fields)
      .eq('id', id)
      .select()
      .single()

    if (updateError) {
      console.error('Errore aggiornamento piano:', updateError)
      return NextResponse.json({ error: 'Errore nell\'aggiornamento del piano' }, { status: 500 })
    }

    if (!data) {
      return NextResponse.json({ error: 'Piano non trovato' }, { status: 404 })
    }

    return NextResponse.json({ plan: data })
  } catch (error) {
    console.error('Errore admin plans PUT:', error)
    return NextResponse.json({ error: 'Errore interno' }, { status: 500 })
  }
}
