import { cookies } from 'next/headers'
import { createServerClient } from '@supabase/ssr'
import { createClient } from '@supabase/supabase-js'
import { NextResponse } from 'next/server'

// Helper: verifica autenticazione e ruolo admin
async function verifyAdmin() {
  const cookieStore = await cookies()

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
    return { error: NextResponse.json({ error: 'Non autenticato' }, { status: 401 }) }
  }

  // Verifica ruolo admin
  const { data: profile } = await supabase
    .from('user_profiles')
    .select('ruolo, ruolo_livello')
    .eq('id', user.id)
    .single()

  if (profile?.ruolo_livello !== 'admin' && profile?.ruolo !== 'admin') {
    return { error: NextResponse.json({ error: 'Non autorizzato' }, { status: 403 }) }
  }

  // Client con service role per accesso completo
  const supabaseAdmin = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL,
    process.env.SUPABASE_SERVICE_KEY
  )

  return { user, supabaseAdmin }
}

// GET: Lista tutte le campagne con statistiche utilizzo
export async function GET(request) {
  try {
    const { user, supabaseAdmin, error } = await verifyAdmin()
    if (error) return error

    const { data, error: queryError } = await supabaseAdmin
      .from('discount_campaigns')
      .select('*')
      .order('created_at', { ascending: false })

    if (queryError) {
      console.error('Errore lista campagne:', queryError)
      return NextResponse.json({ error: 'Errore nel recupero delle campagne' }, { status: 500 })
    }

    return NextResponse.json({ data: data || [] })
  } catch (error) {
    console.error('Errore campaigns GET:', error)
    return NextResponse.json({ error: 'Errore interno' }, { status: 500 })
  }
}

// POST: Crea nuova campagna sconto
export async function POST(request) {
  try {
    const { user, supabaseAdmin, error } = await verifyAdmin()
    if (error) return error

    const body = await request.json()

    // Rimuovi campi che non devono essere impostati manualmente
    delete body.id
    delete body.created_at

    // Imposta il creatore della campagna
    body.created_by = user.id

    const { data, error: insertError } = await supabaseAdmin
      .from('discount_campaigns')
      .insert(body)
      .select()
      .single()

    if (insertError) {
      console.error('Errore creazione campagna:', insertError)
      return NextResponse.json({ error: 'Errore nella creazione della campagna' }, { status: 500 })
    }

    return NextResponse.json({ data }, { status: 201 })
  } catch (error) {
    console.error('Errore campaigns POST:', error)
    return NextResponse.json({ error: 'Errore interno' }, { status: 500 })
  }
}

// PUT: Aggiorna campagna esistente
export async function PUT(request) {
  try {
    const { user, supabaseAdmin, error } = await verifyAdmin()
    if (error) return error

    const body = await request.json()
    const { id, ...fieldsToUpdate } = body

    if (!id) {
      return NextResponse.json(
        { error: 'ID campagna obbligatorio' },
        { status: 400 }
      )
    }

    // Rimuovi campi che non devono essere aggiornati direttamente
    delete fieldsToUpdate.created_at
    delete fieldsToUpdate.created_by

    // Aggiorna updated_at
    fieldsToUpdate.updated_at = new Date().toISOString()

    const { data, error: updateError } = await supabaseAdmin
      .from('discount_campaigns')
      .update(fieldsToUpdate)
      .eq('id', id)
      .select()
      .single()

    if (updateError) {
      console.error('Errore aggiornamento campagna:', updateError)
      return NextResponse.json({ error: 'Errore nell\'aggiornamento della campagna' }, { status: 500 })
    }

    if (!data) {
      return NextResponse.json({ error: 'Campagna non trovata' }, { status: 404 })
    }

    return NextResponse.json({ data })
  } catch (error) {
    console.error('Errore campaigns PUT:', error)
    return NextResponse.json({ error: 'Errore interno' }, { status: 500 })
  }
}

// DELETE: Disattiva campagna (soft delete: attivo = false)
export async function DELETE(request) {
  try {
    const { user, supabaseAdmin, error } = await verifyAdmin()
    if (error) return error

    const { searchParams } = new URL(request.url)
    const id = searchParams.get('id')

    if (!id) {
      return NextResponse.json(
        { error: 'ID campagna obbligatorio' },
        { status: 400 }
      )
    }

    const { data, error: updateError } = await supabaseAdmin
      .from('discount_campaigns')
      .update({ attivo: false, updated_at: new Date().toISOString() })
      .eq('id', id)
      .select()
      .single()

    if (updateError) {
      console.error('Errore disattivazione campagna:', updateError)
      return NextResponse.json({ error: 'Errore nella disattivazione della campagna' }, { status: 500 })
    }

    if (!data) {
      return NextResponse.json({ error: 'Campagna non trovata' }, { status: 404 })
    }

    return NextResponse.json({ success: true, data })
  } catch (error) {
    console.error('Errore campaigns DELETE:', error)
    return NextResponse.json({ error: 'Errore interno' }, { status: 500 })
  }
}
