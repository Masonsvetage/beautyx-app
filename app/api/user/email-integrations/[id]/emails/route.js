import { cookies } from 'next/headers'
import { createServerClient } from '@supabase/ssr'

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY

function getClient(cookieStore) {
  return createServerClient(supabaseUrl, supabaseAnonKey, {
    cookies: {
      getAll() { return cookieStore.getAll() },
      setAll(cs) { cs.forEach(({ name, value, options }) => cookieStore.set(name, value, options)) }
    }
  })
}

// GET - Recupera email classificate
// ?category=gestionale|engagement|altro
// ?important=true
export async function GET(request, { params }) {
  try {
    const { id } = await params
    const { searchParams } = new URL(request.url)
    const category = searchParams.get('category')
    const importantOnly = searchParams.get('important') === 'true'

    const cookieStore = await cookies()
    const supabase = getClient(cookieStore)
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return Response.json({ error: 'Non autenticato' }, { status: 401 })

    // Verifica che l'integrazione appartenga all'utente
    const { data: integration } = await supabase
      .from('email_integrations')
      .select('id')
      .eq('id', id)
      .eq('user_id', user.id)
      .single()

    if (!integration) return Response.json({ error: 'Non autorizzato' }, { status: 403 })

    let query = supabase
      .from('email_messages')
      .select('*')
      .eq('integration_id', id)
      .order('received_at', { ascending: false })
      .limit(100)

    if (category) query = query.eq('category', category)
    if (importantOnly) query = query.eq('important', true)

    const { data, error } = await query
    if (error) throw new Error(error.message)

    return Response.json({ emails: data || [] })
  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 })
  }
}

// PATCH - Segna come letta
export async function PATCH(request, { params }) {
  try {
    const { id } = await params
    const { message_id } = await request.json()

    const cookieStore = await cookies()
    const supabase = getClient(cookieStore)
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return Response.json({ error: 'Non autenticato' }, { status: 401 })

    await supabase.from('email_messages').update({ is_read: true }).eq('id', message_id)
    return Response.json({ success: true })
  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 })
  }
}
