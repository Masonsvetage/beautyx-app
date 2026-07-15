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

  if (profile?.ruolo !== 'admin' && profile?.ruolo_livello !== 'admin') {
    return { error: NextResponse.json({ error: 'Non autorizzato' }, { status: 403 }) }
  }

  // Client con service role per accesso completo
  const supabaseAdmin = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL,
    process.env.SUPABASE_SERVICE_KEY
  )

  return { user, supabaseAdmin }
}

// GET: Lista tutti gli annunci con info del sender
export async function GET(request) {
  try {
    const { user, supabaseAdmin, error } = await verifyAdmin()
    if (error) return error

    const { searchParams } = new URL(request.url)
    const stato = searchParams.get('stato')

    let query = supabaseAdmin
      .from('admin_announcements')
      .select(`
        *,
        sender:user_profiles!admin_announcements_sender_id_fkey(
          id, nome, cognome, email
        )
      `)
      .order('created_at', { ascending: false })

    if (stato) {
      query = query.eq('stato', stato)
    }

    const { data, error: queryError } = await query

    if (queryError) {
      console.error('Errore lista annunci:', queryError)
      return NextResponse.json({ error: 'Errore nel recupero degli annunci' }, { status: 500 })
    }

    return NextResponse.json({ data })
  } catch (error) {
    console.error('Errore annunci admin GET:', error)
    return NextResponse.json({ error: 'Errore interno' }, { status: 500 })
  }
}

// POST: Crea un nuovo annuncio
export async function POST(request) {
  try {
    const { user, supabaseAdmin, error } = await verifyAdmin()
    if (error) return error

    const body = await request.json()
    const {
      titolo,
      contenuto,
      tipo,
      display_mode,
      target_type,
      target_filter,
      data_inizio,
      data_fine,
      stato
    } = body

    if (!titolo || !contenuto) {
      return NextResponse.json(
        { error: 'Titolo e contenuto sono obbligatori' },
        { status: 400 }
      )
    }

    const { data, error: insertError } = await supabaseAdmin
      .from('admin_announcements')
      .insert({
        titolo,
        contenuto,
        tipo: tipo || 'info',
        display_mode: display_mode || 'banner',
        target_type: target_type || 'all',
        target_filter: target_filter || null,
        data_inizio: data_inizio || new Date().toISOString(),
        data_fine: data_fine || null,
        stato: stato || 'bozza',
        sender_id: user.id
      })
      .select(`
        *,
        sender:user_profiles!admin_announcements_sender_id_fkey(
          id, nome, cognome, email
        )
      `)
      .single()

    if (insertError) {
      console.error('Errore creazione annuncio:', insertError)
      return NextResponse.json({ error: 'Errore nella creazione dell\'annuncio' }, { status: 500 })
    }

    return NextResponse.json({ data }, { status: 201 })
  } catch (error) {
    console.error('Errore annunci admin POST:', error)
    return NextResponse.json({ error: 'Errore interno' }, { status: 500 })
  }
}

// PUT: Aggiorna un annuncio esistente
export async function PUT(request) {
  try {
    const { user, supabaseAdmin, error } = await verifyAdmin()
    if (error) return error

    const body = await request.json()
    const { id, ...fieldsToUpdate } = body

    if (!id) {
      return NextResponse.json(
        { error: 'ID annuncio obbligatorio' },
        { status: 400 }
      )
    }

    // Rimuovi campi che non devono essere aggiornati direttamente
    delete fieldsToUpdate.sender_id
    delete fieldsToUpdate.created_at
    delete fieldsToUpdate.sender

    // Aggiorna updated_at
    fieldsToUpdate.updated_at = new Date().toISOString()

    const { data, error: updateError } = await supabaseAdmin
      .from('admin_announcements')
      .update(fieldsToUpdate)
      .eq('id', id)
      .select(`
        *,
        sender:user_profiles!admin_announcements_sender_id_fkey(
          id, nome, cognome, email
        )
      `)
      .single()

    if (updateError) {
      console.error('Errore aggiornamento annuncio:', updateError)
      return NextResponse.json({ error: 'Errore nell\'aggiornamento dell\'annuncio' }, { status: 500 })
    }

    if (!data) {
      return NextResponse.json({ error: 'Annuncio non trovato' }, { status: 404 })
    }

    return NextResponse.json({ data })
  } catch (error) {
    console.error('Errore annunci admin PUT:', error)
    return NextResponse.json({ error: 'Errore interno' }, { status: 500 })
  }
}

// DELETE: Elimina un annuncio
export async function DELETE(request) {
  try {
    const { user, supabaseAdmin, error } = await verifyAdmin()
    if (error) return error

    const { searchParams } = new URL(request.url)
    const id = searchParams.get('id')

    if (!id) {
      return NextResponse.json(
        { error: 'ID annuncio obbligatorio' },
        { status: 400 }
      )
    }

    const { error: deleteError } = await supabaseAdmin
      .from('admin_announcements')
      .delete()
      .eq('id', id)

    if (deleteError) {
      console.error('Errore eliminazione annuncio:', deleteError)
      return NextResponse.json({ error: 'Errore nell\'eliminazione dell\'annuncio' }, { status: 500 })
    }

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('Errore annunci admin DELETE:', error)
    return NextResponse.json({ error: 'Errore interno' }, { status: 500 })
  }
}
