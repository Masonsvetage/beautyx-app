import Stripe from 'stripe'

// Inizializzazione lazy — non esplode durante il build se la key manca
let _stripe = null
export const stripe = new Proxy({}, {
  get(_, prop) {
    if (!_stripe) {
      if (!process.env.STRIPE_SECRET_KEY) {
        throw new Error('STRIPE_SECRET_KEY non configurata')
      }
      _stripe = new Stripe(process.env.STRIPE_SECRET_KEY, { apiVersion: '2023-10-16' })
    }
    return _stripe[prop]
  }
})

export const STRIPE_WEBHOOK_SECRET = process.env.STRIPE_WEBHOOK_SECRET

// Helper per formattare prezzo da centesimi a euro
export function formatPrice(priceInCents) {
  return new Intl.NumberFormat('it-IT', {
    style: 'currency',
    currency: 'EUR'
  }).format(priceInCents / 100)
}

// Helper per ottenere URL di successo/cancellazione
export function getCheckoutUrls(request) {
  const origin = request.headers.get('origin') || 'http://localhost:3000'
  return {
    success_url: `${origin}/impostazioni/abbonamento?success=true&session_id={CHECKOUT_SESSION_ID}`,
    cancel_url: `${origin}/impostazioni/abbonamento?canceled=true`
  }
}
