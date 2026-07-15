import { cookies } from 'next/headers'
import { createServerClient } from '@supabase/ssr'
import { createClient } from '@supabase/supabase-js'

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
const supabaseServiceKey = process.env.SUPABASE_SERVICE_KEY

// GET: Ritorna l'HPA assegnato al centro del cliente autenticato,
// con info di contatto, ultimo messaggio e prossimo appuntamento
export async function GET(request) {
  try {
    const cookieStore = await cookies()
    // Auth check con anon key
    const authClient = createServerClient(supabaseUrl, process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY, {
      cookies: {
        getAll() { return cookieStore.getAll() },
        setAll(cookiesToSet) {
          cookiesToSet.forEach(({ name, value, options }) => cookieStore.set(name, value, options))
        }
      }
    })

    const { data: { user } } = await authClient.auth.getUser()
    if (!user) return Response.json({ error: 'Non autenticato' }, { status: 401 })

    // Ottieni il centro_id del cliente (auth client per RLS su user_profiles)
    const { searchParams } = new URL(request.url)
    const centro_id = searchParams.get('centro_id')

    const { data: profile } = await authClient
      .from('user_profiles')
      .select('ruolo_livello, centro_id')
      .eq('id', user.id)
      .single()

    if (!profile) return Response.json({ error: 'Profilo non trovato' }, { status: 404 })

    const targetCentroId = centro_id || profile.centro_id
    if (!targetCentroId) return Response.json({ hpa: null })

    // Usa service key per query cross-tabella senza RLS issues
    const admin = createClient(supabaseUrl, supabaseServiceKey)

    // Trova assegnazione attiva per il centro
    const { data: assignment } = await admin
      .from('hpa_centro_assignments')
      .select(`
        id,
        puo_creare_obiettivi, puo_pinnare_conversazioni,
        puo_vedere_movimenti, puo_modificare_budget,
        data_inizio,
        hpa:user_profiles!hpa_id(
          id, nome, cognome, email, telefono, avatar_url, bio, specializzazione
        )
      `)
      .eq('centro_id', targetCentroId)
      .or('data_fine.is.null,data_fine.gte.' + new Date().toISOString().split('T')[0])
      .limit(1)
      .maybeSingle()

    if (!assignment) return Response.json({ hpa: null })

    // Esegui le tre query in parallelo
    const today = new Date().toISOString().split('T')[0]
    const [lastMsgResult, unreadResult, appointmentResult] = await Promise.all([
      // Ultimo messaggio scambiato
      admin
        .from('hpa_client_messages')
        .select('contenuto, sender_type, created_at')
        .eq('centro_id', targetCentroId)
        .eq('hpa_id', assignment.hpa.id)
        .order('created_at', { ascending: false })
        .limit(1)
        .maybeSingle(),
      // Messaggi non letti dall'HPA (da mostrare al cliente)
      admin
        .from('hpa_client_messages')
        .select('id', { count: 'exact', head: true })
        .eq('centro_id', targetCentroId)
        .eq('hpa_id', assignment.hpa.id)
        .eq('sender_type', 'hpa')
        .eq('letto', false),
      // Prossimo appuntamento confermato
      admin
        .from('hpa_appointments')
        .select('data_appuntamento, ora_inizio, tipo, durata_minuti, tipo_contatto, room_url')
        .eq('centro_id', targetCentroId)
        .eq('hpa_id', assignment.hpa.id)
        .eq('stato', 'confermato')
        .gte('data_appuntamento', today)
        .order('data_appuntamento', { ascending: true })
        .order('ora_inizio', { ascending: true })
        .limit(1)
        .maybeSingle()
    ])

    return Response.json({
      hpa: {
        ...assignment.hpa,
        assignment_id: assignment.id,
        permissions: {
          puo_creare_obiettivi: assignment.puo_creare_obiettivi,
          puo_pinnare_conversazioni: assignment.puo_pinnare_conversazioni,
          puo_vedere_movimenti: assignment.puo_vedere_movimenti,
          puo_modificare_budget: assignment.puo_modificare_budget,
        },
        data_inizio: assignment.data_inizio,
        last_message: lastMsgResult.data || null,
        unread_count: unreadResult.count || 0,
        next_appointment: appointmentResult.data || null
      }
    })
  } catch (error) {
    console.error('Errore mio-hpa:', error)
    return Response.json({ error: error.message }, { status: 500 })
  }
}
