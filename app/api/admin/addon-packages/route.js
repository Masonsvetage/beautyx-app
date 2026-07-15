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

// GET: Lista tutti i pacchetti addon (inclusi inattivi)
export async function GET(request) {
  try {
    const { user, supabaseAdmin, error } = await verifyAdmin()
    if (error) return error

    const { data, error: queryError } = await supabaseAdmin
      .from('addon_packages')
      .select('*')
      .order('ordine', { ascending: true })

    if (queryError) {
      console.error('Errore lista addon packages:', queryError)
      return NextResponse.json({ error: 'Errore nel recupero dei pacchetti addon' }, { status: 500 })
    }

    return NextResponse.json({ data: data || [] })
  } catch (error) {
    console.error('Errore addon-packages GET:', error)
    return NextResponse.json({ error: 'Errore interno' }, { status: 500 })
  }
}

// POST: Crea nuovo pacchetto addon
export async function POST(request) {
  try {
    const { user, supabaseAdmin, error } = await verifyAdmin()
    if (error) return error

    const body = await request.json()

    // Rimuovi campi che non devono essere impostati manualmente
    delete body.id
    delete body.created_at

    const { data, error: insertError } = await supabaseAdmin
      .from('addon_packages')
      .insert(body)
      .select()
      .single()

    if (insertError) {
      console.error('Errore creazione addon package:', insertError)
      return NextResponse.json({ error: 'Errore nella creazione del pacchetto addon' }, { status: 500 })
    }

    return NextResponse.json({ data }, { status: 201 })
  } catch (error) {
    console.error('Errore addon-packages POST:', error)
    return NextResponse.json({ error: 'Errore interno' }, { status: 500 })
  }
}

// PUT: Aggiorna pacchetto addon esistente
export async function PUT(request) {
  try {
    const { user, supabaseAdmin, error } = await verifyAdmin()
    if (error) return error

    const body = await request.json()
    const { id, ...fieldsToUpdate } = body

    if (!id) {
      return NextResponse.json(
        { error: 'ID pacchetto addon obbligatorio' },
        { status: 400 }
      )
    }

    // Rimuovi campi che non devono essere aggiornati direttamente
    delete fieldsToUpdate.created_at

    // Aggiorna updated_at
    fieldsToUpdate.updated_at = new Date().toISOString()

    const { data, error: updateError } = await supabaseAdmin
      .from('addon_packages')
      .update(fieldsToUpdate)
      .eq('id', id)
      .select()
      .single()

    if (updateError) {
      console.error('Errore aggiornamento addon package:', updateError)
      return NextResponse.json({ error: 'Errore nell\'aggiornamento del pacchetto addon' }, { status: 500 })
    }

    if (!data) {
      return NextResponse.json({ error: 'Pacchetto addon non trovato' }, { status: 404 })
    }

    return NextResponse.json({ data })
  } catch (error) {
    console.error('Errore addon-packages PUT:', error)
    return NextResponse.json({ error: 'Errore interno' }, { status: 500 })
  }
}

// DELETE: Disattiva pacchetto addon (soft delete: attivo = false)
export async function DELETE(request) {
  try {
    const { user, supabaseAdmin, error } = await verifyAdmin()
    if (error) return error

    const { searchParams } = new URL(request.url)
    const id = searchParams.get('id')

    if (!id) {
      return NextResponse.json(
        { error: 'ID pacchetto addon obbligatorio' },
        { status: 400 }
      )
    }

    const { data, error: updateError } = await supabaseAdmin
      .from('addon_packages')
      .update({ attivo: false, updated_at: new Date().toISOString() })
      .eq('id', id)
      .select()
      .single()

    if (updateError) {
      console.error('Errore disattivazione addon package:', updateError)
      return NextResponse.json({ error: 'Errore nella disattivazione del pacchetto addon' }, { status: 500 })
    }

    if (!data) {
      return NextResponse.json({ error: 'Pacchetto addon non trovato' }, { status: 404 })
    }

    return NextResponse.json({ success: true, data })
  } catch (error) {
    console.error('Errore addon-packages DELETE:', error)
    return NextResponse.json({ error: 'Errore interno' }, { status: 500 })
  }
}
