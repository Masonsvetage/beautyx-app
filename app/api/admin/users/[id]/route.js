import { createClient } from '@supabase/supabase-js'
import { cookies } from 'next/headers'
import { createServerClient } from '@supabase/ssr'
import { NextResponse } from 'next/server'

// Elimina un utente (solo admin)
export async function DELETE(request, { params }) {
  try {
    const { id: userId } = await params
    if (!userId) {
      return NextResponse.json({ error: 'ID utente mancante' }, { status: 400 })
    }

    const cookieStore = await cookies()

    // Verifica che l'utente corrente sia admin
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

    // Verifica ruolo admin
    const { data: profile } = await supabase
      .from('user_profiles')
      .select('ruolo')
      .eq('id', user.id)
      .single()

    if (profile?.ruolo !== 'admin') {
      return NextResponse.json({ error: 'Non autorizzato' }, { status: 403 })
    }

    // Client admin con service key
    const supabaseAdmin = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL,
      process.env.SUPABASE_SERVICE_KEY,
      {
        auth: {
          autoRefreshToken: false,
          persistSession: false
        }
      }
    )

    // Recupera info utente per eventuale cancellazione Stripe
    const { data: targetUser } = await supabaseAdmin
      .from('user_subscriptions')
      .select('stripe_subscription_id')
      .eq('user_id', userId)
      .single()

    // Elimina profilo e dati collegati via RPC
    const { data, error: rpcError } = await supabaseAdmin.rpc('admin_delete_user_data', {
      p_user_id: userId,
      p_admin_id: user.id
    })

    if (rpcError) {
      console.error('Errore RPC eliminazione:', rpcError)
      return NextResponse.json({ error: rpcError.message }, { status: 400 })
    }

    // Elimina utente da Supabase Auth
    const { error: authError } = await supabaseAdmin.auth.admin.deleteUser(userId)
    if (authError) {
      console.error('Errore eliminazione auth:', authError)
      // Il profilo è già stato eliminato, logga l'errore ma non bloccare
    }

    // Se c'era un abbonamento Stripe, andrebbe cancellato
    // (richiede configurazione Stripe nel progetto)
    if (targetUser?.stripe_subscription_id) {
      console.log(`[ADMIN] Subscription Stripe da cancellare: ${targetUser.stripe_subscription_id}`)
      // TODO: stripe.subscriptions.cancel(targetUser.stripe_subscription_id)
    }

    return NextResponse.json({
      success: true,
      deleted_user_id: userId
    })

  } catch (error) {
    console.error('Errore eliminazione utente:', error)
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
}
