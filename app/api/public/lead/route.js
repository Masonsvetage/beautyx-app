import { createClient } from '@supabase/supabase-js'

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_KEY
)

export async function POST(request) {
  try {
    const { nome, email, centro, citta, telefono } = await request.json()

    if (!nome?.trim() || !email?.trim()) {
      return Response.json({ error: 'Nome ed email sono obbligatori' }, { status: 400 })
    }
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      return Response.json({ error: 'Email non valida' }, { status: 400 })
    }

    const { error } = await supabase.from('leads').insert({
      nome: nome.trim(),
      email: email.trim().toLowerCase(),
      centro: centro?.trim() || null,
      citta: citta?.trim() || null,
      telefono: telefono?.trim() || null,
      source: 'landing',
    })

    if (error) throw error
    return Response.json({ success: true })
  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 })
  }
}
