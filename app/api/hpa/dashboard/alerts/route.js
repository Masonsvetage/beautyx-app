import { cookies } from 'next/headers'
import { createServerClient } from '@supabase/ssr'

// GET: Alert per dashboard HPA (utenti inattivi, richieste urgenti)
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
      return Response.json({ error: 'Solo HPA può vedere gli alert' }, { status: 403 })
    }

    // Utenti inattivi (più di 7 giorni senza login)
    const { data: inactiveUsers, error: inactiveError } = await supabase
      .rpc('get_inactive_users', {
        p_hpa_id: user.id,
        p_days_threshold: 7
      })

    if (inactiveError) throw inactiveError

    // Richieste contatto urgenti pending
    const { data: urgentRequests, error: urgentError } = await supabase
      .rpc('get_urgent_contact_requests', { p_hpa_id: user.id })

    if (urgentError) throw urgentError

    // Ottieni i centro_id assegnati all'HPA
    const todayDate = new Date().toISOString().split('T')[0]
    const { data: assignments } = await supabase
      .from('hpa_centro_assignments')
      .select('centro_id')
      .eq('hpa_id', user.id)
      .or(`data_fine.is.null,data_fine.gte.${todayDate}`)

    const centroIds = (assignments || []).map(a => a.centro_id)

    // Obiettivi in scadenza (prossimi 3 giorni)
    const threeDaysFromNow = new Date()
    threeDaysFromNow.setDate(threeDaysFromNow.getDate() + 3)

    let obiettiviInScadenza = []
    if (centroIds.length > 0) {
      const { data } = await supabase
        .from('obiettivi')
        .select(`
          id, titolo, data_target, stato,
          centro:beauty_centers(id, nome)
        `)
        .in('centro_id', centroIds)
        .eq('stato', 'in_corso')
        .lte('data_target', threeDaysFromNow.toISOString().split('T')[0])
        .order('data_target', { ascending: true })

      obiettiviInScadenza = data || []
    }

    // Appuntamenti imminenti (prossime 2 ore)
    const now = new Date()
    const twoHoursLater = new Date(now.getTime() + 2 * 60 * 60 * 1000)
    const today = now.toISOString().split('T')[0]
    const currentTime = now.toTimeString().slice(0, 8)
    const laterTime = twoHoursLater.toTimeString().slice(0, 8)

    const { data: appuntamentiImminenti } = await supabase
      .from('hpa_appointments')
      .select(`
        id, ora_inizio, durata_minuti, stato,
        centro:beauty_centers(id, nome)
      `)
      .eq('hpa_id', user.id)
      .eq('data_appuntamento', today)
      .eq('stato', 'confermato')
      .gte('ora_inizio', currentTime)
      .lte('ora_inizio', laterTime)
      .order('ora_inizio', { ascending: true })

    const alerts = []

    // Alert utenti inattivi
    if (inactiveUsers?.length > 0) {
      alerts.push({
        tipo: 'utenti_inattivi',
        priorita: 'media',
        titolo: `${inactiveUsers.length} utenti inattivi`,
        descrizione: 'Utenti che non accedono da più di 7 giorni',
        count: inactiveUsers.length,
        dettagli: inactiveUsers.slice(0, 5)
      })
    }

    // Alert richieste urgenti
    if (urgentRequests?.length > 0) {
      alerts.push({
        tipo: 'richieste_urgenti',
        priorita: 'alta',
        titolo: `${urgentRequests.length} richieste urgenti`,
        descrizione: 'Richieste di contatto da gestire',
        count: urgentRequests.length,
        dettagli: urgentRequests
      })
    }

    // Alert obiettivi in scadenza
    if (obiettiviInScadenza?.length > 0) {
      alerts.push({
        tipo: 'obiettivi_scadenza',
        priorita: 'media',
        titolo: `${obiettiviInScadenza.length} obiettivi in scadenza`,
        descrizione: 'Obiettivi che scadono nei prossimi 3 giorni',
        count: obiettiviInScadenza.length,
        dettagli: obiettiviInScadenza
      })
    }

    // Alert appuntamenti imminenti
    if (appuntamentiImminenti?.length > 0) {
      alerts.push({
        tipo: 'appuntamenti_imminenti',
        priorita: 'alta',
        titolo: `${appuntamentiImminenti.length} appuntamenti imminenti`,
        descrizione: 'Appuntamenti nelle prossime 2 ore',
        count: appuntamentiImminenti.length,
        dettagli: appuntamentiImminenti
      })
    }

    // Ordina per priorità
    const priorityOrder = { 'alta': 1, 'media': 2, 'bassa': 3 }
    alerts.sort((a, b) => priorityOrder[a.priorita] - priorityOrder[b.priorita])

    return Response.json({
      alerts,
      totale_alert: alerts.length
    })
  } catch (error) {
    console.error('Errore get alerts:', error)
    return Response.json({ error: error.message }, { status: 500 })
  }
}
