import { cookies } from 'next/headers'
import { createServerClient } from '@supabase/ssr'

// GET: Lista clienti HPA con metriche
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

    // Verifica ruolo HPA
    const { data: profile } = await supabase
      .from('user_profiles')
      .select('ruolo_livello')
      .eq('id', user.id)
      .single()

    if (!profile || !['admin', 'hpa'].includes(profile.ruolo_livello)) {
      return Response.json({ error: 'Solo HPA può vedere i clienti' }, { status: 403 })
    }

    const { searchParams } = new URL(request.url)
    const orderBy = searchParams.get('order_by') || 'last_activity' // last_activity, score, name
    const orderDir = searchParams.get('order_dir') || 'desc'

    // Prima ottieni gli ID dei centri assegnati all'HPA dalla tabella hpa_centro_assignments
    const today = new Date().toISOString().split('T')[0]
    const { data: assignments, error: assignError } = await supabase
      .from('hpa_centro_assignments')
      .select('centro_id')
      .eq('hpa_id', user.id)
      .or(`data_fine.is.null,data_fine.gte.${today}`)

    if (assignError) throw assignError

    const centroIds = (assignments || []).map(a => a.centro_id)

    if (centroIds.length === 0) {
      return Response.json({
        clients: [],
        total: 0,
        orderBy,
        orderDir
      })
    }

    // Ottieni centri gestiti con metriche
    const { data: centri, error: centriError } = await supabase
      .from('beauty_centers')
      .select(`
        id, nome, email, telefono, citta, created_at,
        score:client_scores(
          punteggio_totale,
          punteggio_mese_corrente,
          obiettivi_completati,
          livello
        )
      `)
      .in('id', centroIds)

    if (centriError) throw centriError

    // Per ogni centro, ottieni metriche aggiuntive
    const clientsWithMetrics = await Promise.all((centri || []).map(async (centro) => {
      // Ultimo messaggio/contatto
      const { data: lastMessage } = await supabase
        .from('hpa_client_messages')
        .select('created_at')
        .eq('hpa_id', user.id)
        .eq('centro_id', centro.id)
        .order('created_at', { ascending: false })
        .limit(1)
        .single()

      // Ultimo appuntamento
      const { data: lastAppointment } = await supabase
        .from('hpa_appointments')
        .select('data_appuntamento, stato')
        .eq('hpa_id', user.id)
        .eq('centro_id', centro.id)
        .order('data_appuntamento', { ascending: false })
        .limit(1)
        .single()

      // Obiettivi attivi
      const { count: obiettiviAttivi } = await supabase
        .from('obiettivi')
        .select('*', { count: 'exact', head: true })
        .eq('centro_id', centro.id)
        .eq('stato', 'in_corso')

      // Messaggi non letti
      const { count: messaggiNonLetti } = await supabase
        .from('hpa_client_messages')
        .select('*', { count: 'exact', head: true })
        .eq('hpa_id', user.id)
        .eq('centro_id', centro.id)
        .eq('letto', false)
        .eq('sender_type', 'client')

      // Ultima attività utente (login)
      const { data: userActivity } = await supabase
        .from('user_profiles')
        .select('last_login_at, last_activity_at')
        .eq('centro_id', centro.id)
        .order('last_activity_at', { ascending: false, nullsFirst: false })
        .limit(1)
        .single()

      // Determina ultimo contatto (messaggio o appuntamento più recente)
      const lastContactDate = [
        lastMessage?.created_at,
        lastAppointment?.data_appuntamento
      ].filter(Boolean).sort().reverse()[0]

      return {
        ...centro,
        score: centro.score?.[0] || null,
        ultimo_contatto: lastContactDate || null,
        ultimo_appuntamento: lastAppointment?.data_appuntamento || null,
        ultima_attivita_utente: userActivity?.last_activity_at || userActivity?.last_login_at || null,
        obiettivi_attivi: obiettiviAttivi || 0,
        messaggi_non_letti: messaggiNonLetti || 0
      }
    }))

    // Ordina i risultati
    const sortedClients = clientsWithMetrics.sort((a, b) => {
      let comparison = 0
      switch (orderBy) {
        case 'last_activity':
          const dateA = a.ultima_attivita_utente || a.ultimo_contatto || '1970-01-01'
          const dateB = b.ultima_attivita_utente || b.ultimo_contatto || '1970-01-01'
          comparison = new Date(dateA) - new Date(dateB)
          break
        case 'score':
          comparison = (a.score?.punteggio_totale || 0) - (b.score?.punteggio_totale || 0)
          break
        case 'name':
          comparison = (a.nome || '').localeCompare(b.nome || '')
          break
        case 'last_contact':
          const contactA = a.ultimo_contatto || '1970-01-01'
          const contactB = b.ultimo_contatto || '1970-01-01'
          comparison = new Date(contactA) - new Date(contactB)
          break
        default:
          comparison = 0
      }
      return orderDir === 'desc' ? -comparison : comparison
    })

    return Response.json({
      clients: sortedClients,
      total: sortedClients.length,
      orderBy,
      orderDir
    })
  } catch (error) {
    console.error('Errore get clients:', error)
    return Response.json({ error: error.message }, { status: 500 })
  }
}
