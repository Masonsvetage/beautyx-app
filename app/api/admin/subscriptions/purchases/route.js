import { cookies } from 'next/headers'
import { createServerClient } from '@supabase/ssr'
import { createClient } from '@supabase/supabase-js'
import { NextResponse } from 'next/server'

async function verifyAdmin() {
  const cookieStore = await cookies()
  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY,
    { cookies: { getAll() { return cookieStore.getAll() } } }
  )
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { error: NextResponse.json({ error: 'Non autenticato' }, { status: 401 }) }

  const { data: profile } = await supabase
    .from('user_profiles')
    .select('ruolo_livello')
    .eq('id', user.id)
    .maybeSingle()

  if (profile?.ruolo_livello !== 'admin') {
    return { error: NextResponse.json({ error: 'Non autorizzato' }, { status: 403 }) }
  }

  const supabaseAdmin = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL,
    process.env.SUPABASE_SERVICE_ROLE_KEY
  )
  return { supabaseAdmin, user }
}

// GET: lista acquisti addon con info utente
export async function GET(request) {
  const { error, supabaseAdmin } = await verifyAdmin()
  if (error) return error

  try {
    const { searchParams } = new URL(request.url)
    const limit = parseInt(searchParams.get('limit') || '50')
    const offset = parseInt(searchParams.get('offset') || '0')
    const userId = searchParams.get('user_id')

    let query = supabaseAdmin
      .from('user_purchases')
      .select(`
        id,
        user_id,
        tipo,
        addon_package_id,
        importo,
        importo_originale,
        sconto_applicato,
        stripe_checkout_session_id,
        stato,
        created_at,
        addon_packages ( nome, token_ai_bonus, prezzo ),
        user_profiles ( email, nome, cognome, centro_id )
      `)
      .eq('tipo', 'addon')
      .order('created_at', { ascending: false })
      .range(offset, offset + limit - 1)

    if (userId) query = query.eq('user_id', userId)

    const { data: purchases, error: purchasesError, count } = await query

    if (purchasesError) {
      return NextResponse.json({ error: purchasesError.message }, { status: 500 })
    }

    return NextResponse.json({ purchases: purchases || [], count })
  } catch (err) {
    return NextResponse.json({ error: err.message }, { status: 500 })
  }
}
