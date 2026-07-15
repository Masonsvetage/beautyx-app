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
    .select('ruolo, ruolo_livello')
    .eq('id', user.id)
    .single()

  if (profile?.ruolo_livello !== 'admin' && profile?.ruolo !== 'admin') {
    return { error: NextResponse.json({ error: 'Non autorizzato' }, { status: 403 }) }
  }

  const supabaseAdmin = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL,
    process.env.SUPABASE_SERVICE_KEY
  )

  return { user, supabaseAdmin }
}

// GET: Tutte le impostazioni
export async function GET() {
  try {
    const { supabaseAdmin, error } = await verifyAdmin()
    if (error) return error

    const { data, error: queryError } = await supabaseAdmin
      .from('admin_settings')
      .select('*')
      .order('chiave')

    if (queryError) {
      return NextResponse.json({ error: queryError.message }, { status: 500 })
    }

    return NextResponse.json({ data })
  } catch (err) {
    return NextResponse.json({ error: 'Errore interno' }, { status: 500 })
  }
}

// PUT: Aggiorna un'impostazione
export async function PUT(request) {
  try {
    const { user, supabaseAdmin, error } = await verifyAdmin()
    if (error) return error

    const { chiave, valore } = await request.json()
    if (!chiave || valore === undefined) {
      return NextResponse.json({ error: 'Chiave e valore obbligatori' }, { status: 400 })
    }

    const { data, error: rpcError } = await supabaseAdmin
      .rpc('set_admin_setting', { p_chiave: chiave, p_valore: String(valore), p_admin_id: user.id })

    if (rpcError) {
      return NextResponse.json({ error: rpcError.message }, { status: 500 })
    }

    return NextResponse.json({ success: true })
  } catch (err) {
    return NextResponse.json({ error: 'Errore interno' }, { status: 500 })
  }
}
