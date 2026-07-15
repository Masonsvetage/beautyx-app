import { cookies } from 'next/headers'
import { createServerClient } from '@supabase/ssr'
import { createClient } from '@supabase/supabase-js'
import { NextResponse } from 'next/server'

// Helper: verifica autenticazione utente
async function verifyUser() {
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

  // Client con service role per operazioni privilegiate
  const supabaseAdmin = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL,
    process.env.SUPABASE_SERVICE_KEY
  )

  return { user, supabaseAdmin }
}

// GET: Recupera annunci attivi per l'utente autenticato
export async function GET(request) {
  try {
    const { user, supabaseAdmin, error } = await verifyUser()
    if (error) return error

    const { data, error: rpcError } = await supabaseAdmin
      .rpc('get_user_announcements', { p_user_id: user.id })

    if (rpcError) {
      console.error('Errore recupero annunci utente:', rpcError)
      return NextResponse.json({ error: 'Errore nel recupero degli annunci' }, { status: 500 })
    }

    return NextResponse.json({ data: data || [] })
  } catch (error) {
    console.error('Errore annunci GET:', error)
    return NextResponse.json({ error: 'Errore interno' }, { status: 500 })
  }
}

// POST: Segna annuncio come letto o dismissato
export async function POST(request) {
  try {
    const { user, supabaseAdmin, error } = await verifyUser()
    if (error) return error

    const body = await request.json()
    const { announcement_id, action } = body

    if (!announcement_id) {
      return NextResponse.json(
        { error: 'announcement_id obbligatorio' },
        { status: 400 }
      )
    }

    if (!action || !['read', 'dismiss'].includes(action)) {
      return NextResponse.json(
        { error: 'action deve essere "read" o "dismiss"' },
        { status: 400 }
      )
    }

    // Verifica che l'annuncio esista
    const { data: announcement, error: checkError } = await supabaseAdmin
      .from('admin_announcements')
      .select('id, visualizzazioni')
      .eq('id', announcement_id)
      .single()

    if (checkError || !announcement) {
      return NextResponse.json({ error: 'Annuncio non trovato' }, { status: 404 })
    }

    const now = new Date().toISOString()

    if (action === 'read') {
      // Upsert receipt con letto=true
      const { error: upsertError } = await supabaseAdmin
        .from('announcement_receipts')
        .upsert(
          {
            announcement_id,
            user_id: user.id,
            letto: true,
            letto_at: now
          },
          {
            onConflict: 'announcement_id,user_id'
          }
        )

      if (upsertError) {
        console.error('Errore upsert receipt (read):', upsertError)
        return NextResponse.json({ error: 'Errore nel salvataggio della lettura' }, { status: 500 })
      }

      // Incrementa contatore visualizzazioni
      await supabaseAdmin
        .from('admin_announcements')
        .update({
          visualizzazioni: (announcement.visualizzazioni || 0) + 1
        })
        .eq('id', announcement_id)

    } else if (action === 'dismiss') {
      // Upsert receipt con dismissato=true
      const { error: upsertError } = await supabaseAdmin
        .from('announcement_receipts')
        .upsert(
          {
            announcement_id,
            user_id: user.id,
            dismissato: true,
            dismissato_at: now
          },
          {
            onConflict: 'announcement_id,user_id'
          }
        )

      if (upsertError) {
        console.error('Errore upsert receipt (dismiss):', upsertError)
        return NextResponse.json({ error: 'Errore nel salvataggio del dismiss' }, { status: 500 })
      }
    }

    return NextResponse.json({ success: true, action })
  } catch (error) {
    console.error('Errore annunci POST:', error)
    return NextResponse.json({ error: 'Errore interno' }, { status: 500 })
  }
}
