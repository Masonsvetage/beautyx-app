import { cookies } from 'next/headers'
import { createServerClient } from '@supabase/ssr'

// GET: Statistiche aggregate per dashboard HPA
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
      return Response.json({ error: 'Solo HPA può vedere le statistiche' }, { status: 403 })
    }

    // Prima ottieni i centro_id assegnati all'HPA
    const todayStr = new Date().toISOString().split('T')[0]
    const { data: assignments } = await supabase
      .from('hpa_centro_assignments')
      .select('centro_id')
      .eq('hpa_id', user.id)
      .or(`data_fine.is.null,data_fine.gte.${todayStr}`)

    const centroIds = (assignments || []).map(a => a.centro_id)
    const centriCount = centroIds.length

    // Appuntamenti oggi
    const { data: appuntamentiOggi } = await supabase
      .from('hpa_appointments')
      .select('id, ora_inizio, ora_fine, durata_minuti, stato')
      .eq('hpa_id', user.id)
      .eq('data_appuntamento', todayStr)
      .neq('stato', 'cancellato')

    // Minuti call totali questo mese
    const startOfMonth = new Date()
    startOfMonth.setDate(1)
    const { data: appuntamentiMese } = await supabase
      .from('hpa_appointments')
      .select('durata_minuti')
      .eq('hpa_id', user.id)
      .eq('stato', 'completato')
      .gte('data_appuntamento', startOfMonth.toISOString().split('T')[0])

    const minutiMese = (appuntamentiMese || []).reduce((sum, a) => sum + (a.durata_minuti || 0), 0)

    // Obiettivi attivi dei clienti (filtra per centro_id dei centri assegnati)
    let obiettiviAttivi = 0
    let obiettiviCompletatiMese = 0

    if (centroIds.length > 0) {
      const { count: attivi } = await supabase
        .from('obiettivi')
        .select('*', { count: 'exact', head: true })
        .in('centro_id', centroIds)
        .eq('stato', 'in_corso')

      obiettiviAttivi = attivi || 0

      // Obiettivi completati questo mese
      const { count: completati } = await supabase
        .from('obiettivi')
        .select('*', { count: 'exact', head: true })
        .in('centro_id', centroIds)
        .eq('stato', 'completato')
        .gte('updated_at', startOfMonth.toISOString())

      obiettiviCompletatiMese = completati || 0
    }

    // Messaggi non letti
    const { data: unreadData } = await supabase
      .rpc('get_unread_message_count', { p_user_id: user.id })
    const messaggiNonLetti = (unreadData || []).reduce((sum, item) => sum + parseInt(item.unread_count || 0), 0)

    // Richieste contatto urgenti
    const { count: richiesteUrgenti } = await supabase
      .from('contact_requests')
      .select('*', { count: 'exact', head: true })
      .eq('stato', 'pending')
      .in('urgenza', ['alta', 'urgente'])

    return Response.json({
      centri_gestiti: centriCount,
      appuntamenti_oggi: appuntamentiOggi?.length || 0,
      appuntamenti_oggi_dettagli: appuntamentiOggi || [],
      minuti_call_mese: minutiMese,
      obiettivi_attivi: obiettiviAttivi,
      obiettivi_completati_mese: obiettiviCompletatiMese,
      messaggi_non_letti: messaggiNonLetti,
      richieste_urgenti: richiesteUrgenti || 0
    })
  } catch (error) {
    console.error('Errore get stats:', error)
    return Response.json({ error: error.message }, { status: 500 })
  }
}
