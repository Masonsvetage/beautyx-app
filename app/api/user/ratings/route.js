import { cookies } from 'next/headers'
import { createServerClient } from '@supabase/ssr'

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY

function getClient(cookieStore) {
  return createServerClient(supabaseUrl, supabaseAnonKey, {
    cookies: {
      getAll() { return cookieStore.getAll() },
      setAll(cookiesToSet) {
        cookiesToSet.forEach(({ name, value, options }) => cookieStore.set(name, value, options))
      }
    }
  })
}

// GET - Recupera le valutazioni dell'utente corrente
export async function GET() {
  try {
    const cookieStore = await cookies()
    const supabase = getClient(cookieStore)

    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return Response.json({ error: 'Non autenticato' }, { status: 401 })

    const { data, error } = await supabase
      .from('ratings')
      .select('*')
      .eq('user_id', user.id)

    if (error) throw new Error(error.message)

    return Response.json({ ratings: data || [] })
  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 })
  }
}

// POST - Crea o aggiorna una valutazione
export async function POST(request) {
  try {
    const cookieStore = await cookies()
    const supabase = getClient(cookieStore)

    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return Response.json({ error: 'Non autenticato' }, { status: 401 })

    const { target_type, target_id, target_name, rating, review, centro_id } = await request.json()

    if (!target_type || !['beautyx', 'hpa'].includes(target_type)) {
      return Response.json({ error: 'target_type non valido' }, { status: 400 })
    }
    if (!rating || rating < 1 || rating > 5) {
      return Response.json({ error: 'Valutazione non valida (1-5)' }, { status: 400 })
    }

    const { data, error } = await supabase
      .from('ratings')
      .upsert({
        user_id: user.id,
        centro_id: centro_id || null,
        target_type,
        target_id: target_id || null,
        target_name: target_name || null,
        rating,
        review: review?.trim() || null,
        updated_at: new Date().toISOString()
      }, {
        onConflict: 'user_id,target_type'
      })
      .select()
      .single()

    if (error) throw new Error(error.message)

    return Response.json({ success: true, rating: data })
  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 })
  }
}
