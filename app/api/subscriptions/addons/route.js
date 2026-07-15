import { cookies } from 'next/headers'
import { createServerClient } from '@supabase/ssr'
import { NextResponse } from 'next/server'

// GET: lista pacchetti addon token_ai acquistabili
export async function GET() {
  try {
    const cookieStore = await cookies()
    const supabase = createServerClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY,
      {
        cookies: { getAll() { return cookieStore.getAll() } }
      }
    )

    const { data: { user } } = await supabase.auth.getUser()
    if (!user) {
      return NextResponse.json({ error: 'Non autenticato' }, { status: 401 })
    }

    const { data: addons, error } = await supabase
      .from('addon_packages')
      .select('id, nome, descrizione, token_ai_bonus, prezzo, prezzo_originale')
      .eq('tipo', 'token_ai')
      .eq('attivo', true)
      .order('ordine', { ascending: true })

    if (error) {
      return NextResponse.json({ addons: [] })
    }

    return NextResponse.json({ addons: addons || [] })
  } catch (error) {
    return NextResponse.json({ addons: [] })
  }
}
