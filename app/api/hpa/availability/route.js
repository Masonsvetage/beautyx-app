import { cookies } from 'next/headers'
import { createServerClient } from '@supabase/ssr'

// GET: Ottieni disponibilità HPA
// POST: Imposta/aggiorna slot disponibilità
export async function GET(request) {
  try {
    const cookieStore = await cookies()
    const supabase = createServerClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY,
      {
        cookies: {
          getAll() { return cookieStore.getAll() },
          setAll(cookiesToSet) {
            cookiesToSet.forEach(({ name, value, options }) => {
              cookieStore.set(name, value, options)
            })
          }
        }
      }
    )

    const { data: { user } } = await supabase.auth.getUser()
    if (!user) {
      return Response.json({ error: 'Non autenticato' }, { status: 401 })
    }

    const { searchParams } = new URL(request.url)
    const hpa_id = searchParams.get('hpa_id') || user.id

    // Ottieni slot settimanali
    const { data: slots, error } = await supabase
      .from('hpa_availability_slots')
      .select('*')
      .eq('hpa_id', hpa_id)
      .order('giorno_settimana')

    if (error) throw error

    // Ottieni eccezioni prossime 30 giorni
    const today = new Date().toISOString().split('T')[0]
    const thirtyDays = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0]

    const { data: exceptions } = await supabase
      .from('hpa_availability_exceptions')
      .select('*')
      .eq('hpa_id', hpa_id)
      .gte('data_eccezione', today)
      .lte('data_eccezione', thirtyDays)
      .order('data_eccezione')

    return Response.json({
      slots: slots || [],
      exceptions: exceptions || []
    })
  } catch (error) {
    console.error('Errore get disponibilità:', error)
    return Response.json({ error: error.message }, { status: 500 })
  }
}

export async function POST(request) {
  try {
    const cookieStore = await cookies()
    const supabase = createServerClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY,
      {
        cookies: {
          getAll() { return cookieStore.getAll() },
          setAll(cookiesToSet) {
            cookiesToSet.forEach(({ name, value, options }) => {
              cookieStore.set(name, value, options)
            })
          }
        }
      }
    )

    const { data: { user } } = await supabase.auth.getUser()
    if (!user) {
      return Response.json({ error: 'Non autenticato' }, { status: 401 })
    }

    // Verifica ruolo HPA
    const { data: profile } = await supabase
      .from('user_profiles')
      .select('ruolo_livello')
      .eq('id', user.id)
      .single()

    if (!profile || !['admin', 'hpa'].includes(profile.ruolo_livello)) {
      return Response.json({ error: 'Solo HPA può impostare disponibilità' }, { status: 403 })
    }

    const body = await request.json()
    const { slots } = body // Array di { giorno_settimana, ora_inizio, ora_fine, durate_disponibili, attivo }

    if (!Array.isArray(slots)) {
      return Response.json({ error: 'slots deve essere un array' }, { status: 400 })
    }

    // Upsert ogni slot
    const results = []
    for (const slot of slots) {
      const { data, error } = await supabase
        .from('hpa_availability_slots')
        .upsert({
          hpa_id: user.id,
          giorno_settimana: slot.giorno_settimana,
          ora_inizio: slot.ora_inizio,
          ora_fine: slot.ora_fine,
          durate_disponibili: slot.durate_disponibili || [15, 30, 45, 60],
          attivo: slot.attivo !== false,
          note: slot.note
        }, {
          onConflict: 'hpa_id,giorno_settimana'
        })
        .select()
        .single()

      if (error) {
        console.error('Errore upsert slot:', error)
      } else {
        results.push(data)
      }
    }

    return Response.json({ success: true, slots: results })
  } catch (error) {
    console.error('Errore set disponibilità:', error)
    return Response.json({ error: error.message }, { status: 500 })
  }
}
