import { createClient } from '@supabase/supabase-js'

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_KEY
)

const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/

export async function POST(request) {
  try {
    const { email } = await request.json()

    if (!email || !EMAIL_REGEX.test(email)) {
      return Response.json({ error: 'Email non valida' }, { status: 400 })
    }

    const normalizedEmail = email.trim().toLowerCase()

    const { data, error } = await supabase
      .from('guida_access')
      .select('token')
      .eq('email', normalizedEmail)
      .maybeSingle()

    if (error) throw error

    if (!data) {
      return Response.json(
        { error: 'Email non trovata. Iscriviti alla newsletter per accedere alla guida.' },
        { status: 404 }
      )
    }

    return Response.json({ token: data.token })
  } catch (err) {
    console.error('Guida access error:', err)
    return Response.json({ error: 'Errore di rete, riprova.' }, { status: 500 })
  }
}
