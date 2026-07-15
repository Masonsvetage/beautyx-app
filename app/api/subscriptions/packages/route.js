import { cookies } from 'next/headers'
import { createServerClient } from '@supabase/ssr'

// GET: Lista pacchetti abbonamento disponibili
export async function GET(request) {
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

    const { data: packages, error } = await supabase
      .from('subscription_packages')
      .select('*')
      .eq('attivo', true)
      .order('prezzo_cents', { ascending: true })

    if (error) throw error

    // Formatta prezzi per display
    const formattedPackages = (packages || []).map(pkg => ({
      ...pkg,
      prezzo_display: new Intl.NumberFormat('it-IT', {
        style: 'currency',
        currency: 'EUR'
      }).format(pkg.prezzo_cents / 100)
    }))

    return Response.json({ packages: formattedPackages })
  } catch (error) {
    console.error('Errore get packages:', error)
    return Response.json({ error: error.message }, { status: 500 })
  }
}
