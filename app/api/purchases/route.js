import { cookies } from 'next/headers'
import { createServerClient } from '@supabase/ssr'
import { NextResponse } from 'next/server'

// GET: Storico acquisti dell'utente corrente
export async function GET(request) {
  try {
    const cookieStore = await cookies()
    const supabase = createServerClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY,
      {
        cookies: {
          getAll() { return cookieStore.getAll() },
        }
      }
    )

    const { data: { user } } = await supabase.auth.getUser()
    if (!user) {
      return NextResponse.json({ error: 'Non autenticato' }, { status: 401 })
    }

    const { data: purchases, error } = await supabase
      .from('user_purchases')
      .select(`
        *,
        plan:subscription_plans(codice, nome),
        addon:addon_packages(codice, nome),
        campaign:discount_campaigns(nome, tipo_sconto, valore_sconto)
      `)
      .eq('user_id', user.id)
      .order('created_at', { ascending: false })
      .limit(50)

    if (error) {
      console.error('Errore recupero acquisti:', error)
      // Fallback senza join se le tabelle non esistono ancora
      const { data: fallback } = await supabase
        .from('user_purchases')
        .select('*')
        .eq('user_id', user.id)
        .order('created_at', { ascending: false })
        .limit(50)

      return NextResponse.json({ purchases: fallback || [] })
    }

    return NextResponse.json({ purchases: purchases || [] })
  } catch (error) {
    console.error('Errore GET purchases:', error)
    return NextResponse.json({ purchases: [] })
  }
}
