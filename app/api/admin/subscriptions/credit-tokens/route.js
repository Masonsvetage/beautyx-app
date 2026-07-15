import { cookies } from 'next/headers'
import { createServerClient } from '@supabase/ssr'
import { createClient } from '@supabase/supabase-js'
import { NextResponse } from 'next/server'

async function verifyAdmin() {
  const cookieStore = await cookies()
  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY,
    { cookies: { getAll() { return cookieStore.getAll() } } }
  )
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { error: NextResponse.json({ error: 'Non autenticato' }, { status: 401 }) }

  const { data: profile } = await supabase
    .from('user_profiles')
    .select('ruolo_livello')
    .eq('id', user.id)
    .maybeSingle()

  if (profile?.ruolo_livello !== 'admin') {
    return { error: NextResponse.json({ error: 'Non autorizzato' }, { status: 403 }) }
  }

  const supabaseAdmin = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL,
    process.env.SUPABASE_SERVICE_ROLE_KEY
  )
  return { supabaseAdmin, adminUser: user }
}

// POST: accredita token manualmente a un utente
// Body: { user_id, token_amount, note? }
export async function POST(request) {
  const { error, supabaseAdmin, adminUser } = await verifyAdmin()
  if (error) return error

  try {
    const body = await request.json()
    const { user_id, token_amount, note } = body

    if (!user_id || !token_amount || token_amount <= 0) {
      return NextResponse.json(
        { error: 'user_id e token_amount (> 0) sono richiesti' },
        { status: 400 }
      )
    }

    // Recupera subscription utente
    const { data: sub, error: subError } = await supabaseAdmin
      .from('user_subscriptions')
      .select('id, token_ai_bonus')
      .eq('user_id', user_id)
      .maybeSingle()

    if (subError || !sub) {
      return NextResponse.json(
        { error: 'Abbonamento non trovato per questo utente' },
        { status: 404 }
      )
    }

    // Incrementa bonus pool
    const { error: updateError } = await supabaseAdmin
      .from('user_subscriptions')
      .update({
        token_ai_bonus: sub.token_ai_bonus + token_amount,
        updated_at: new Date().toISOString()
      })
      .eq('id', sub.id)

    if (updateError) {
      return NextResponse.json({ error: updateError.message }, { status: 500 })
    }

    // Logga in user_purchases come credito manuale admin
    await supabaseAdmin
      .from('user_purchases')
      .insert({
        user_id,
        tipo: 'addon',
        importo: 0,
        importo_originale: 0,
        stato: 'completato',
        // Nota admin nella descrizione (nessun campo specifico, usiamo stripe_checkout_session_id come marker)
        stripe_checkout_session_id: `admin_manual_${adminUser.id}_${Date.now()}`
      })

    // Aggiorna note_admin su user_subscriptions se fornita
    if (note) {
      await supabaseAdmin
        .from('user_subscriptions')
        .update({ note_admin: note })
        .eq('id', sub.id)
    }

    return NextResponse.json({
      success: true,
      token_ai_bonus_nuovo: sub.token_ai_bonus + token_amount,
      token_aggiunti: token_amount
    })
  } catch (err) {
    return NextResponse.json({ error: err.message }, { status: 500 })
  }
}
