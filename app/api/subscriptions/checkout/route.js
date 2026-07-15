import { cookies } from 'next/headers'
import { createServerClient } from '@supabase/ssr'
import { stripe, getCheckoutUrls } from '@/lib/stripe'

// POST: Crea sessione Stripe Checkout
export async function POST(request) {
  try {
    const cookieStore = await cookies()
    const supabase = createServerClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY,
      {
        cookies: {
          getAll() { return cookieStore.getAll() },
          setAll(cookiesToSet) {
            cookiesToSet.forEach(({ name, value, options }) => {
              cookieStore.set(name, value, options)
            })
          }
        }
      }
    )

    const { data: { user } } = await supabase.auth.getUser()
    if (!user) {
      return Response.json({ error: 'Non autenticato' }, { status: 401 })
    }

    const body = await request.json()
    const { package_id, tipo } = body

    if (!package_id) {
      return Response.json({ error: 'package_id richiesto' }, { status: 400 })
    }

    // Ottieni centro_id dell'utente
    const { data: profile } = await supabase
      .from('user_profiles')
      .select('centro_id')
      .eq('id', user.id)
      .single()

    if (!profile?.centro_id) {
      return Response.json({ error: 'Nessun centro associato' }, { status: 400 })
    }

    // Ottieni dettagli pacchetto (addon o subscription)
    const isAddon = tipo === 'addon'
    const tableName = isAddon ? 'addon_packages' : 'subscription_packages'

    const { data: pkg, error: pkgError } = await supabase
      .from(tableName)
      .select('*')
      .eq('id', package_id)
      .eq('attivo', true)
      .maybeSingle()

    if (pkgError || !pkg) {
      return Response.json({ error: 'Pacchetto non trovato' }, { status: 404 })
    }

    // Verifica se esiste già una subscription Stripe per questo centro
    const { data: existingSub } = await supabase
      .from('client_subscriptions')
      .select('stripe_customer_id')
      .eq('centro_id', profile.centro_id)
      .maybeSingle()

    let customerId = existingSub?.stripe_customer_id

    // Se non esiste customer Stripe, crealo
    if (!customerId) {
      const { data: centro } = await supabase
        .from('beauty_centers')
        .select('nome, email')
        .eq('id', profile.centro_id)
        .maybeSingle()

      const customer = await stripe.customers.create({
        email: centro?.email || user.email,
        name: centro?.nome,
        metadata: {
          centro_id: profile.centro_id,
          user_id: user.id
        }
      })
      customerId = customer.id
    }

    const { success_url, cancel_url } = getCheckoutUrls(request)

    // Prepara line_item e mode in base al tipo
    let lineItem, checkoutMode, metadata

    if (isAddon) {
      lineItem = {
        price_data: {
          currency: 'eur',
          product_data: {
            name: pkg.nome,
            description: pkg.descrizione || `${pkg.token_ai_bonus} token AI aggiuntivi`
          },
          unit_amount: Math.round(Number(pkg.prezzo) * 100)
        },
        quantity: 1
      }
      checkoutMode = 'payment'
      metadata = {
        centro_id: profile.centro_id,
        user_id: user.id,
        package_id: package_id,
        tipo_acquisto: 'addon',
        token_ai_bonus: pkg.token_ai_bonus.toString()
      }
    } else {
      lineItem = {
        price_data: {
          currency: 'eur',
          product_data: {
            name: pkg.nome,
            description: `${pkg.minuti_inclusi} minuti di consulenza - ${pkg.descrizione || ''}`
          },
          unit_amount: pkg.prezzo_cents,
          recurring: pkg.periodo === 'mensile' ? { interval: 'month' } : undefined
        },
        quantity: 1
      }
      checkoutMode = pkg.periodo === 'mensile' ? 'subscription' : 'payment'
      metadata = {
        centro_id: profile.centro_id,
        package_id: package_id,
        minuti_inclusi: pkg.minuti_inclusi.toString()
      }
    }

    // Crea sessione checkout
    const session = await stripe.checkout.sessions.create({
      customer: customerId,
      payment_method_types: ['card'],
      line_items: [lineItem],
      mode: checkoutMode,
      success_url,
      cancel_url,
      metadata
    })

    return Response.json({
      sessionId: session.id,
      url: session.url
    })
  } catch (error) {
    console.error('Errore checkout:', error)
    return Response.json({ error: error.message }, { status: 500 })
  }
}
