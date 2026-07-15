import { createClient } from '@supabase/supabase-js'
import { cookies } from 'next/headers'
import { createServerClient } from '@supabase/ssr'
import { NextResponse } from 'next/server'

export async function POST(request, { params }) {
  try {
    const { id: userId } = await params
    const cookieStore = await cookies()

    // Verifica autenticazione
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

    // Validazione body
    const { password } = await request.json()
    if (!password || password.length < 8) {
      return NextResponse.json({ error: 'La password deve essere di almeno 8 caratteri' }, { status: 400 })
    }

    // Verifica che l'utente target esista e non sia admin
    const { data: targetProfile } = await supabase
      .from('user_profiles')
      .select('ruolo, nome, cognome, email')
      .eq('id', userId)
      .single()

    if (!targetProfile) {
      return NextResponse.json({ error: 'Utente non trovato' }, { status: 404 })
    }

    if (targetProfile.ruolo === 'admin') {
      return NextResponse.json({ error: 'Non puoi resettare la password di un admin' }, { status: 403 })
    }

    // Service role per operazioni admin
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

    // Aggiorna password in Supabase Auth
    const { error: authError } = await supabaseAdmin.auth.admin.updateUserById(userId, {
      password
    })

    if (authError) {
      console.error('Errore aggiornamento password auth:', authError)
      return NextResponse.json({ error: `Errore auth: ${authError.message}` }, { status: 500 })
    }

    // Setta flag deve_cambiare_password
    const { error: profileError } = await supabaseAdmin
      .from('user_profiles')
      .update({ deve_cambiare_password: true })
      .eq('id', userId)

    if (profileError) {
      console.error('Errore aggiornamento profilo:', profileError)
      return NextResponse.json({ error: 'Password aggiornata ma errore nel flag cambio obbligatorio' }, { status: 500 })
    }

    return NextResponse.json({
      success: true,
      message: `Password resettata per ${targetProfile.nome} ${targetProfile.cognome}`
    })

  } catch (error) {
    console.error('Errore reset password:', error)
    return NextResponse.json({ error: 'Errore interno del server' }, { status: 500 })
  }
}
