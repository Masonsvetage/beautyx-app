import { headers } from 'next/headers'
import { stripe, STRIPE_WEBHOOK_SECRET } from '@/lib/stripe'
import { createClient } from '@supabase/supabase-js'

// Supabase admin client per webhook (no cookies)
const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
)

export async function POST(request) {
  try {
    const body = await request.text()
    const headersList = await headers()
    const signature = headersList.get('stripe-signature')

    if (!signature) {
      return Response.json({ error: 'Firma mancante' }, { status: 400 })
    }

    let event
    try {
      event = stripe.webhooks.constructEvent(body, signature, STRIPE_WEBHOOK_SECRET)
    } catch (err) {
      console.error('Errore verifica webhook:', err.message)
      return Response.json({ error: 'Firma non valida' }, { status: 400 })
    }

    // Gestisci eventi
    switch (event.type) {
      case 'checkout.session.completed': {
        const session = event.data.object
        await handleCheckoutCompleted(session)
        break
      }

      case 'invoice.paid': {
        const invoice = event.data.object
        await handleInvoicePaid(invoice)
        break
      }

      case 'customer.subscription.deleted': {
        const subscription = event.data.object
        await handleSubscriptionCanceled(subscription)
        break
      }

      default:
        console.log(`Evento non gestito: ${event.type}`)
    }

    return Response.json({ received: true })
  } catch (error) {
    console.error('Errore webhook Stripe:', error)
    return Response.json({ error: error.message }, { status: 500 })
  }
}

async function handleCheckoutCompleted(session) {
  const { centro_id, package_id, tipo_acquisto, token_ai_bonus, user_id, minuti_inclusi } = session.metadata

  if (!centro_id || !package_id) {
    console.error('Metadata mancanti nella sessione checkout')
    return
  }

  // ── Addon token AI ──────────────────────────────────────
  if (tipo_acquisto === 'addon') {
    await handleAddonCheckoutCompleted({ session, user_id, package_id, token_ai_bonus: parseInt(token_ai_bonus) || 0 })
    return
  }

  // ── Pacchetto HPA minuti (flusso originale) ─────────────
  const minuti = parseInt(minuti_inclusi) || 0

  // Calcola data scadenza (1 mese da oggi)
  const dataScadenza = new Date()
  dataScadenza.setMonth(dataScadenza.getMonth() + 1)

  // Verifica se esiste già una subscription
  const { data: existingSub } = await supabaseAdmin
    .from('client_subscriptions')
    .select('id, minuti_totali, minuti_usati')
    .eq('centro_id', centro_id)
    .maybeSingle()

  if (existingSub) {
    // Aggiorna subscription esistente (aggiungi minuti)
    const { error } = await supabaseAdmin
      .from('client_subscriptions')
      .update({
        package_id,
        minuti_totali: existingSub.minuti_totali + minuti,
        data_scadenza: dataScadenza.toISOString().split('T')[0],
        stato: 'attivo',
        stripe_subscription_id: session.subscription,
        stripe_customer_id: session.customer,
        updated_at: new Date().toISOString()
      })
      .eq('id', existingSub.id)

    if (error) {
      console.error('Errore aggiornamento subscription:', error)
      return
    }

    // Log transazione bonus minuti
    await supabaseAdmin.rpc('add_bonus_minutes', {
      p_centro_id: centro_id,
      p_minuti: minuti,
      p_descrizione: `Acquisto pacchetto - ${minuti} minuti`
    })
  } else {
    // Crea nuova subscription
    const { error } = await supabaseAdmin
      .from('client_subscriptions')
      .insert({
        centro_id,
        package_id,
        data_scadenza: dataScadenza.toISOString().split('T')[0],
        minuti_totali: minuti,
        minuti_usati: 0,
        stato: 'attivo',
        stripe_subscription_id: session.subscription,
        stripe_customer_id: session.customer
      })

    if (error) {
      console.error('Errore creazione subscription:', error)
    }
  }

  console.log(`Subscription creata/aggiornata per centro ${centro_id}`)
}

async function handleAddonCheckoutCompleted({ session, user_id, package_id, token_ai_bonus }) {
  if (!user_id || !token_ai_bonus) {
    console.error('Metadata addon mancanti:', { user_id, token_ai_bonus })
    return
  }

  // Supabase non supporta increment diretto — select + update
  const { data: sub, error: subError } = await supabaseAdmin
    .from('user_subscriptions')
    .select('id, token_ai_bonus')
    .eq('user_id', user_id)
    .maybeSingle()

  if (subError || !sub) {
    console.error('user_subscriptions non trovata per user_id:', user_id, subError)
    return
  }

  const { error: updateError } = await supabaseAdmin
    .from('user_subscriptions')
    .update({
      token_ai_bonus: sub.token_ai_bonus + token_ai_bonus,
      updated_at: new Date().toISOString()
    })
    .eq('id', sub.id)

  if (updateError) {
    console.error('Errore accredito token_ai_bonus:', updateError)
    return
  }

  // Logga l'acquisto in user_purchases
  await supabaseAdmin
    .from('user_purchases')
    .insert({
      user_id,
      tipo: 'addon',
      addon_package_id: package_id,
      importo: session.amount_total ? session.amount_total / 100 : 0,
      importo_originale: session.amount_subtotal ? session.amount_subtotal / 100 : 0,
      stripe_checkout_session_id: session.id,
      stato: 'completato'
    })

  console.log(`Addon accreditato: ${token_ai_bonus} token per user ${user_id}`)
}

async function handleInvoicePaid(invoice) {
  // Rinnovo subscription mensile
  const subscription = await stripe.subscriptions.retrieve(invoice.subscription)
  const centroId = subscription.metadata?.centro_id

  if (!centroId) return

  // Ottieni pacchetto attuale
  const { data: sub } = await supabaseAdmin
    .from('client_subscriptions')
    .select('package_id')
    .eq('stripe_subscription_id', invoice.subscription)
    .single()

  if (!sub) return

  const { data: pkg } = await supabaseAdmin
    .from('subscription_packages')
    .select('minuti_inclusi')
    .eq('id', sub.package_id)
    .single()

  if (!pkg) return

  // Aggiungi minuti mensili
  await supabaseAdmin.rpc('add_bonus_minutes', {
    p_centro_id: centroId,
    p_minuti: pkg.minuti_inclusi,
    p_descrizione: `Rinnovo mensile - ${pkg.minuti_inclusi} minuti`
  })

  // Aggiorna data scadenza
  const dataScadenza = new Date()
  dataScadenza.setMonth(dataScadenza.getMonth() + 1)

  await supabaseAdmin
    .from('client_subscriptions')
    .update({
      data_scadenza: dataScadenza.toISOString().split('T')[0],
      updated_at: new Date().toISOString()
    })
    .eq('stripe_subscription_id', invoice.subscription)

  console.log(`Subscription rinnovata per centro ${centroId}`)
}

async function handleSubscriptionCanceled(subscription) {
  const { error } = await supabaseAdmin
    .from('client_subscriptions')
    .update({
      stato: 'cancellato',
      updated_at: new Date().toISOString()
    })
    .eq('stripe_subscription_id', subscription.id)

  if (error) {
    console.error('Errore cancellazione subscription:', error)
  }
}
