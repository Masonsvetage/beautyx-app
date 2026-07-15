import { NextResponse } from 'next/server'
import { cookies } from 'next/headers'
import { createServerClient } from '@supabase/ssr'
import { createClient } from '@supabase/supabase-js'

export async function POST(request) {
  try {
    const body = await request.json()
    const { nome, email, telefono, indirizzo, citta, cap, partita_iva } = body

    if (!nome?.trim()) {
      return NextResponse.json({ error: 'Il nome del centro è obbligatorio' }, { status: 400 })
    }

    // Auth check tramite SSR client
    const cookieStore = await cookies()
    const supabaseAuth = createServerClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY,
      {
        cookies: {
          getAll: () => cookieStore.getAll(),
          setAll: (cookiesToSet) => {
            cookiesToSet.forEach(({ name, value, options }) =>
              cookieStore.set(name, value, options)
            )
          }
        }
      }
    )

    const { data: { user } } = await supabaseAuth.auth.getUser()
    if (!user) {
      return NextResponse.json({ error: 'Non autorizzato' }, { status: 401 })
    }

    // Verifica che l'utente non abbia già un centro
    const { data: profile } = await supabaseAuth
      .from('user_profiles')
      .select('centro_id, ruolo_livello')
      .eq('id', user.id)
      .single()

    if (profile?.centro_id) {
      return NextResponse.json({ error: 'Hai già un centro associato' }, { status: 400 })
    }

    // Operazioni privilegiate con service key
    const supabaseAdmin = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL,
      process.env.SUPABASE_SERVICE_KEY
    )

    // 1. Crea il centro
    const { data: centro, error: centroError } = await supabaseAdmin
      .from('beauty_centers')
      .insert([{
        nome: nome.trim(),
        email: email?.trim() || null,
        telefono: telefono?.trim() || null,
        indirizzo: indirizzo?.trim() || null,
        citta: citta?.trim() || null,
        cap: cap?.trim() || null,
        partita_iva: partita_iva?.trim() || null
      }])
      .select()
      .single()

    if (centroError) throw centroError

    // 2. Associa il centro al profilo utente
    const { error: profileError } = await supabaseAdmin
      .from('user_profiles')
      .update({ centro_id: centro.id })
      .eq('id', user.id)

    if (profileError) throw profileError

    return NextResponse.json({ centro }, { status: 201 })

  } catch (error) {
    console.error('Errore creazione centro:', error)
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
}
