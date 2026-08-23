import { cookies } from 'next/headers'
import { createServerClient } from '@supabase/ssr'
import { createClient } from '@supabase/supabase-js'
import { verifyRowCentroOwnership, centroOwnershipErrorResponse } from '@/lib/auth/verifyCentroOwnership'

// Client con SERVICE_KEY, usato SOLO per il controllo di ownership e per
// l'update in PATCH (stesso pattern di `verifyRowCentroOwnership`: leggere il
// centro_id reale della riga con un client che non dipende da policy RLS non
// garantite su questa tabella, poi verificare che l'utente abbia accesso a
// quel centro tramite `verifyCentroOwnership`). NOTA (corretta il 23/08/2026,
// audit Riccardo): `verifyCentroOwnership` copre l'accesso al CENTRO (admin,
// titolare, hpa con assegnazione su `hpa_centro_assignments`), ma NON basta da
// sola per un HPA — vedi controllo aggiuntivo `hpa_id === user.id` nel PATCH.
const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_KEY
)

// GET: Lista appuntamenti
// POST: Crea appuntamento (usato internamente, clienti usano /api/booking)
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
    const stato = searchParams.get('stato') // 'confermato', 'completato', etc.
    const from = searchParams.get('from') // data inizio
    const to = searchParams.get('to') // data fine
    const centro_id = searchParams.get('centro_id')

    // Ottieni profilo
    const { data: profile } = await supabase
      .from('user_profiles')
      .select('ruolo_livello, centro_id')
      .eq('id', user.id)
      .single()

    const isHpa = ['admin', 'hpa'].includes(profile?.ruolo_livello)

    let query = supabase
      .from('hpa_appointments')
      .select(`
        *,
        centro:beauty_centers(id, nome)
      `)
      .order('data_appuntamento', { ascending: true })
      .order('ora_inizio', { ascending: true })

    // Filtro per ruolo
    if (isHpa) {
      query = query.eq('hpa_id', user.id)
    } else if (profile?.centro_id) {
      query = query.eq('centro_id', profile.centro_id)
    } else {
      return Response.json({ error: 'Nessun centro associato' }, { status: 400 })
    }

    // Filtri opzionali
    if (stato) {
      query = query.eq('stato', stato)
    }
    if (from) {
      query = query.gte('data_appuntamento', from)
    }
    if (to) {
      query = query.lte('data_appuntamento', to)
    }
    if (centro_id && isHpa) {
      query = query.eq('centro_id', centro_id)
    }

    const { data: appointments, error } = await query

    if (error) throw error

    return Response.json({ appointments: appointments || [] })
  } catch (error) {
    console.error('Errore get appuntamenti:', error)
    return Response.json({ error: error.message }, { status: 500 })
  }
}

export async function PATCH(request) {
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

    const body = await request.json()
    const { appointment_id, stato, note, cancellation_reason } = body

    if (!appointment_id) {
      return Response.json({ error: 'appointment_id richiesto' }, { status: 400 })
    }

    // SICUREZZA (2026-08-23, audit Riccardo): prima di questo fix l'update
    // avveniva per solo `id`, senza ALCUN controllo di ownership/assegnazione
    // — chiunque autenticato poteva aggiornare (o cancellare) l'appuntamento
    // di QUALSIASI centro conoscendo/indovinando un `appointment_id`. Stesso
    // schema già usato per `obiettivi_step` PATCH e per le altre risorse
    // mutate per id senza `centro_id` nel payload: si legge prima il
    // `centro_id` reale della riga (con `supabaseAdmin`, per non dipendere da
    // RLS non garantita su questa tabella) e poi si verifica che l'utente
    // autenticato abbia accesso a quel centro — `verifyCentroOwnership`
    // copre già il caso admin, titolare/direttore del proprio centro E hpa
    // con assegnazione attiva su `hpa_centro_assignments`, quindi non serve
    // reinventare la logica multi-centro HPA qui.
    const ownership = await verifyRowCentroOwnership(request, supabaseAdmin, {
      table: 'hpa_appointments',
      id: appointment_id
    })
    if (!ownership.ok) return centroOwnershipErrorResponse(ownership)

    // SICUREZZA (2026-08-23, audit Riccardo — gap confermato sul fix precedente):
    // `verifyRowCentroOwnership`/`verifyCentroOwnership` verificano solo che
    // l'utente abbia accesso al CENTRO della riga (admin, titolare del centro,
    // oppure hpa con assegnazione attiva su `hpa_centro_assignments`). Ma la
    // migrazione originale `20260205_03_hpa_availability.sql` (righe 100-102)
    // definisce l'accesso HPA come "solo i propri appuntamenti"
    // (`hpa_id = auth.uid()`), e la GET in questo stesso file applica infatti
    // `.eq('hpa_id', user.id)` per il ruolo hpa. Senza questo controllo, un HPA
    // con assegnazione attiva sullo stesso centro potrebbe modificare/cancellare
    // l'appuntamento di un ALTRO HPA sul centro. Admin e titolare/direttore del
    // centro (autorizzati sopra tramite ruolo admin o centro_id proprio, non
    // tramite assegnazione hpa) restano autorizzati su tutti gli appuntamenti
    // del centro, coerente col resto del progetto (es. `hpa/reports` GET lista,
    // `hpa/dashboard/*`).
    const isHpaRole = ownership.profile?.ruolo === 'hpa' || ownership.profile?.ruolo_livello === 'hpa'
    const isAdminRole = ownership.profile?.ruolo === 'admin' || ownership.profile?.ruolo_livello === 'admin'
    if (isHpaRole && !isAdminRole) {
      const { data: apptRow, error: apptError } = await supabaseAdmin
        .from('hpa_appointments')
        .select('hpa_id')
        .eq('id', appointment_id)
        .maybeSingle()

      if (apptError) throw apptError
      if (!apptRow || apptRow.hpa_id !== user.id) {
        return Response.json({ error: 'Non autorizzato: non è un tuo appuntamento' }, { status: 403 })
      }
    }

    const updates = { updated_at: new Date().toISOString() }

    if (stato) {
      updates.stato = stato
      if (stato === 'cancellato') {
        updates.cancelled_by = user.id
        updates.cancelled_at = new Date().toISOString()
        updates.cancellation_reason = cancellation_reason
      }
    }
    if (note !== undefined) {
      updates.note = note
    }

    // Update tramite supabaseAdmin (stesso client già usato per il controllo
    // di ownership sopra): l'ownership è già verificata, il filtro su `id` è
    // sufficiente e non serve rifiltrare su centro_id/hpa_id qui.
    const { data, error } = await supabaseAdmin
      .from('hpa_appointments')
      .update(updates)
      .eq('id', appointment_id)
      .select()
      .single()

    if (error) throw error

    return Response.json({ success: true, appointment: data })
  } catch (error) {
    console.error('Errore update appuntamento:', error)
    return Response.json({ error: error.message }, { status: 500 })
  }
}
