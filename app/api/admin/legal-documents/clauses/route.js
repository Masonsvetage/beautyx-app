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

// GET: Lista clausole di un documento
export async function GET(request) {
  try {
    const { supabaseAdmin, error } = await verifyAdmin()
    if (error) return error

    const { searchParams } = new URL(request.url)
    const documentId = searchParams.get('document_id')

    if (!documentId) {
      return NextResponse.json({ error: 'document_id obbligatorio' }, { status: 400 })
    }

    const { data, error: queryError } = await supabaseAdmin
      .from('legal_clauses')
      .select('*')
      .eq('document_id', documentId)
      .order('ordinamento')

    if (queryError) {
      return NextResponse.json({ error: queryError.message }, { status: 500 })
    }

    return NextResponse.json({ data })
  } catch (err) {
    return NextResponse.json({ error: 'Errore interno' }, { status: 500 })
  }
}

// POST: Aggiungi clausola
export async function POST(request) {
  try {
    const { supabaseAdmin, error } = await verifyAdmin()
    if (error) return error

    const { document_id, titolo, contenuto, ordinamento, richiede_accettazione_singola } = await request.json()

    if (!document_id || !titolo || !contenuto) {
      return NextResponse.json({ error: 'document_id, titolo e contenuto obbligatori' }, { status: 400 })
    }

    const { data, error: insertError } = await supabaseAdmin
      .from('legal_clauses')
      .insert({
        document_id,
        titolo,
        contenuto,
        ordinamento: ordinamento || 0,
        richiede_accettazione_singola: richiede_accettazione_singola || false
      })
      .select()
      .single()

    if (insertError) {
      return NextResponse.json({ error: insertError.message }, { status: 500 })
    }

    return NextResponse.json({ data }, { status: 201 })
  } catch (err) {
    return NextResponse.json({ error: 'Errore interno' }, { status: 500 })
  }
}

// PUT: Aggiorna clausola
export async function PUT(request) {
  try {
    const { supabaseAdmin, error } = await verifyAdmin()
    if (error) return error

    const { id, titolo, contenuto, ordinamento, richiede_accettazione_singola } = await request.json()

    if (!id) {
      return NextResponse.json({ error: 'ID clausola obbligatorio' }, { status: 400 })
    }

    const updates = {}
    if (titolo !== undefined) updates.titolo = titolo
    if (contenuto !== undefined) updates.contenuto = contenuto
    if (ordinamento !== undefined) updates.ordinamento = ordinamento
    if (richiede_accettazione_singola !== undefined) updates.richiede_accettazione_singola = richiede_accettazione_singola

    const { data, error: updateError } = await supabaseAdmin
      .from('legal_clauses')
      .update(updates)
      .eq('id', id)
      .select()
      .single()

    if (updateError) {
      return NextResponse.json({ error: updateError.message }, { status: 500 })
    }

    return NextResponse.json({ data })
  } catch (err) {
    return NextResponse.json({ error: 'Errore interno' }, { status: 500 })
  }
}

// DELETE: Rimuovi clausola
export async function DELETE(request) {
  try {
    const { supabaseAdmin, error } = await verifyAdmin()
    if (error) return error

    const { searchParams } = new URL(request.url)
    const id = searchParams.get('id')

    if (!id) {
      return NextResponse.json({ error: 'ID clausola obbligatorio' }, { status: 400 })
    }

    const { error: deleteError } = await supabaseAdmin
      .from('legal_clauses')
      .delete()
      .eq('id', id)

    if (deleteError) {
      return NextResponse.json({ error: deleteError.message }, { status: 500 })
    }

    return NextResponse.json({ success: true })
  } catch (err) {
    return NextResponse.json({ error: 'Errore interno' }, { status: 500 })
  }
}
