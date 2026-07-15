import { cookies } from 'next/headers'
import { createServerClient } from '@supabase/ssr'
import { NextResponse } from 'next/server'

export async function GET() {
  try {
    const cookieStore = await cookies()

    // Client server-side per ottenere l'utente autenticato
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

    // Ottieni utente corrente
    const { data: { user }, error: userError } = await supabase.auth.getUser()

    if (userError || !user) {
      return NextResponse.json({
        error: 'Non autenticato',
        userError: userError?.message
      }, { status: 401 })
    }

    // Prova a caricare il profilo
    const { data: profile, error: profileError } = await supabase
      .from('user_profiles')
      .select('*')
      .eq('id', user.id)
      .single()

    return NextResponse.json({
      user: {
        id: user.id,
        email: user.email
      },
      profile: profile,
      profileError: profileError?.message || profileError?.code || null,
      diagnosis: profileError
        ? 'RLS policy blocca la lettura del profilo. Esegui ESEGUI_SUBITO_user_profiles_rls.sql su Supabase Dashboard'
        : profile?.ruolo === 'admin'
          ? 'Profilo admin OK - dovresti poter accedere'
          : `Profilo caricato ma ruolo è: ${profile?.ruolo || 'null'}`
    })
  } catch (error) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
}
