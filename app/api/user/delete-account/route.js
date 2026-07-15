import { cookies } from 'next/headers'
import { createServerClient } from '@supabase/ssr'
import { NextResponse } from 'next/server'

// POST: Richiedi eliminazione account
export async function POST(request) {
  try {
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
      return NextResponse.json({ error: 'Non autenticato' }, { status: 401 })
    }

    const body = await request.json()
    const motivo = body.motivo || 'Richiesta dall\'utente'

    const { data, error } = await supabase.rpc('request_account_deletion', {
      p_user_id: user.id,
      p_motivo: motivo
    })

    if (error) {
      console.error('Errore richiesta cancellazione:', error)
      return NextResponse.json({ error: error.message }, { status: 400 })
    }

    return NextResponse.json(data)

  } catch (error) {
    console.error('Errore delete-account POST:', error)
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
}

// DELETE: Annulla richiesta di eliminazione
export async function DELETE() {
  try {
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
      return NextResponse.json({ error: 'Non autenticato' }, { status: 401 })
    }

    const { data, error } = await supabase.rpc('cancel_account_deletion', {
      p_user_id: user.id
    })

    if (error) {
      console.error('Errore annullamento cancellazione:', error)
      return NextResponse.json({ error: error.message }, { status: 400 })
    }

    if (!data) {
      return NextResponse.json(
        { error: 'Nessuna richiesta di cancellazione trovata o gia scaduta' },
        { status: 404 }
      )
    }

    return NextResponse.json({ success: true })

  } catch (error) {
    console.error('Errore delete-account DELETE:', error)
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
}
