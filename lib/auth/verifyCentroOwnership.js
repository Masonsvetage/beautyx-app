import { createSupabaseServerClient } from '@/lib/supabase-server'
import { createClient } from '@supabase/supabase-js'
import { isPiattaformaPlanCodice } from '@/lib/platformPlan'

// ============================================
// requirePiattaformaPlanForUser
// ============================================
// Task #183 (11/09-19/09/2026): il fix originale di verifyCentroOwnership
// verifica SOLO autenticazione+ownership del centro, mai il piano
// commerciale — un utente col solo piano Identikit Strategico CURA
// (codice `report_profiling`, vedi lib/platformPlan.js) autenticato e
// titolare del proprio centro passava comunque il controllo ownership e
// poteva quindi chiamare direttamente le API dei moduli gestionali
// (bypassando la UI, dove il gate esiste già via hooks/usePiattaformaPlan.js
// su Navbar e pagine). Questa funzione applica LATO SERVER la stessa regola
// già in vigore lato client, riusando `isPiattaformaPlanCodice` da
// `lib/platformPlan.js` (fonte unica di verità, non ridefinita qui).
//
// Query identica a quella già in uso in `app/api/subscriptions/balance/route.js`
// (stessa priorità: `assegnato_da_admin` prima, poi più recente) — usa un
// client service-key dedicato (non il client RLS-bound già in mano al
// chiamante) perché `balance/route.js` bypassa deliberatamente RLS per
// leggere lo stesso dato, segno che una policy SELECT permissiva su
// `user_subscriptions` per l'utente stesso non è garantita.
//
// Usata internamente da `verifyCentroOwnership`/`verifyRowCentroOwnership`
// (opzione `requirePiattaformaPlan`) per i circa 40 endpoint che ricevono un
// `centro_id`/`id` dal client. Esportata anche direttamente per gli endpoint
// `app/api/centro/*` che invece derivano l'ownership dal PROFILO
// dell'utente autenticato (`user_profiles.centro_id`), mai da un input
// client — lì non c'è un `centro_id` da passare a `verifyCentroOwnership`,
// quindi il gate piano va applicato chiamando questa funzione direttamente
// con `user.id` (bypass admin/hpa da replicare a mano lato chiamante,
// guardando `profile.ruolo`/`ruolo_livello` come fa `verifyCentroOwnership`
// sopra — vedi commenti nelle singole route `centro/*`).
export async function requirePiattaformaPlanForUser(userId) {
  const supabaseAdmin = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL,
    process.env.SUPABASE_SERVICE_KEY
  )

  const { data: rows, error } = await supabaseAdmin
    .from('user_subscriptions')
    .select('plan:subscription_plans(codice)')
    .eq('user_id', userId)
    .order('assegnato_da_admin', { ascending: false })
    .order('created_at', { ascending: false })
    .limit(1)

  if (error) {
    // Fail-closed: se non riusciamo a determinare il piano reale, non
    // concediamo l'accesso ai moduli gestionali (coerente col default-deny
    // di `planLoaded`/`hasPiattaformaPlan` in hooks/usePiattaformaPlan.js).
    return { ok: false, status: 403, error: 'Funzionalità non inclusa nel tuo piano attuale' }
  }

  const codice = rows?.[0]?.plan?.codice || null
  if (!isPiattaformaPlanCodice(codice)) {
    return { ok: false, status: 403, error: 'Funzionalità non inclusa nel tuo piano attuale' }
  }

  return { ok: true }
}

// ============================================
// verifyCentroOwnership
// ============================================
// Riusa ESATTAMENTE il meccanismo di autenticazione già in uso e verificato
// corretto in `app/api/contact-requests/route.js`, `app/api/booking/route.js`,
// `app/api/onboarding/create-centro/route.js`, `app/api/admin/users/route.js`
// e `app/api/hpa/dashboard/stats/route.js`:
//   1. sessione utente letta dai cookie via `createServerClient` (@supabase/ssr)
//      → qui tramite l'helper condiviso `createSupabaseServerClient` (lib/supabase-server.js)
//   2. `supabase.auth.getUser()` per verificare che la sessione sia valida
//   3. lookup su `user_profiles` (colonne `ruolo` / `ruolo_livello` — usate in modo
//      intercambiabile nei vari endpoint esistenti, quindi qui controlliamo entrambe)
//      per determinare il ruolo e il `centro_id` di appartenenza
//   4. per gli HPA, verifica dell'assegnazione attiva su `hpa_centro_assignments`
//      (stessa tabella/logica usata in `app/api/hpa/dashboard/stats/route.js`,
//      righe 39-48: `hpa_id = user.id` e `data_fine IS NULL OR data_fine >= oggi`)
//
// Regole di accesso ad un `centro_id`:
//   - ruolo/ruolo_livello 'admin'                          → accesso a qualsiasi centro
//   - user_profiles.centro_id === centro_id richiesto       → accesso (titolare/direttore/
//                                                              amministrativo del proprio centro)
//   - ruolo/ruolo_livello 'hpa' con assegnazione attiva su
//     hpa_centro_assignments per quel centro_id             → accesso
//   - in tutti gli altri casi                                → NON autorizzato
//
// Non inventa un nuovo meccanismo: è l'estrazione in un helper condiviso di un
// pattern già scritto (con piccole variazioni copia-incolla) in una decina di
// endpoint diversi del progetto.

/**
 * Verifica che la richiesta corrente abbia una sessione Supabase valida E che
 * l'utente autenticato abbia accesso al `centro_id` indicato.
 *
 * @param {Request} _request - non usato direttamente (i cookie si leggono da
 *   `next/headers`, coerente con tutti gli endpoint di riferimento), tenuto in
 *   firma per chiarezza della call-site e per eventuali usi futuri.
 * @param {string|null|undefined} centroId - centro_id dichiarato dal client da verificare.
 * @param {{ requirePiattaformaPlan?: boolean }} [options] - se
 *   `requirePiattaformaPlan: true`, dopo aver verificato l'ownership controlla
 *   anche che l'utente autenticato abbia un piano commerciale che sblocca i
 *   moduli gestionali reali (vedi `lib/platformPlan.js` — un utente col solo
 *   piano `report_profiling` viene respinto con 403 anche se è titolare del
 *   centro). Admin e HPA fanno sempre bypass di questo controllo aggiuntivo,
 *   stesso comportamento già in vigore lato client in
 *   `hooks/usePiattaformaPlan.js` (non hanno un piano "cliente" proprio).
 * @returns {Promise<
 *   | { ok: true, user: object, profile: object, supabase: object }
 *   | { ok: false, status: 401 | 403 | 400, error: string }
 * >}
 */
export async function verifyCentroOwnership(_request, centroId, options = {}) {
  const { requirePiattaformaPlan = false } = options
  const supabase = await createSupabaseServerClient()

  const { data: { user }, error: authError } = await supabase.auth.getUser()
  if (authError || !user) {
    return { ok: false, status: 401, error: 'Non autenticato' }
  }

  if (!centroId) {
    return { ok: false, status: 400, error: 'centro_id richiesto' }
  }

  const { data: profile, error: profileError } = await supabase
    .from('user_profiles')
    .select('centro_id, ruolo, ruolo_livello')
    .eq('id', user.id)
    .single()

  if (profileError || !profile) {
    return { ok: false, status: 403, error: 'Profilo utente non trovato' }
  }

  // Admin: accesso completo a qualsiasi centro (bypass anche del gate piano:
  // un admin non ha un piano "cliente" proprio, stesso comportamento di
  // hooks/usePiattaformaPlan.js lato client)
  if (profile.ruolo === 'admin' || profile.ruolo_livello === 'admin') {
    return { ok: true, user, profile, supabase }
  }

  // Titolare/direttore/amministrativo: solo il proprio centro — qui si
  // applica anche il gate sul piano piattaforma, se richiesto: è il caso
  // reale del bug (utente Identikit-only, titolare del proprio centro).
  if (profile.centro_id && String(profile.centro_id) === String(centroId)) {
    if (requirePiattaformaPlan) {
      const planCheck = await requirePiattaformaPlanForUser(user.id)
      if (!planCheck.ok) return planCheck
    }
    return { ok: true, user, profile, supabase }
  }

  // HPA: verifica assegnazione attiva sul centro richiesto (bypass del gate
  // piano, stesso motivo del ramo admin: gestisce centri altrui per lavoro,
  // non ha un piano cliente proprio sul centro)
  if (profile.ruolo === 'hpa' || profile.ruolo_livello === 'hpa') {
    const todayStr = new Date().toISOString().split('T')[0]
    const { data: assignment } = await supabase
      .from('hpa_centro_assignments')
      .select('centro_id')
      .eq('hpa_id', user.id)
      .eq('centro_id', centroId)
      .or(`data_fine.is.null,data_fine.gte.${todayStr}`)
      .maybeSingle()

    if (assignment) {
      return { ok: true, user, profile, supabase }
    }
  }

  return { ok: false, status: 403, error: 'Non autorizzato per questo centro' }
}

/**
 * Costruisce la Response 401/403/400 da restituire quando `verifyCentroOwnership`
 * fallisce. Uso tipico:
 *
 *   const check = await verifyCentroOwnership(request, centro_id)
 *   if (!check.ok) return centroOwnershipErrorResponse(check)
 *
 * @param {{ ok: false, status: number, error: string }} result
 */
export function centroOwnershipErrorResponse(result) {
  return Response.json({ error: result.error }, { status: result.status })
}

/**
 * Variante di `verifyCentroOwnership` per gli endpoint che mutano/leggono una
 * riga per `id` senza ricevere `centro_id` nel payload (es. `PATCH { id, ... }`,
 * `DELETE ?id=...`). Recupera prima il `centro_id` reale della riga (tramite il
 * client Supabase con SERVICE_KEY già istanziato nella route, per non dipendere
 * da policy RLS non garantite su ogni tabella) e poi applica la stessa verifica
 * di `verifyCentroOwnership`.
 *
 * Uso tipico:
 *   const check = await verifyRowCentroOwnership(request, supabase, { table: 'accantonamenti', id })
 *   if (!check.ok) return centroOwnershipErrorResponse(check)
 *   // check.row contiene la riga { id, centro_id } già letta — evita una query doppia
 *
 * @param {Request} request
 * @param {object} supabaseAdmin - client Supabase (tipicamente con SERVICE_KEY) già usato dalla route
 * @param {{ table: string, id: string|null|undefined, idColumn?: string, centroColumn?: string, requirePiattaformaPlan?: boolean }} opts
 *   `requirePiattaformaPlan` viene semplicemente passato a `verifyCentroOwnership` (stessa
 *   semantica, stesso bypass admin/HPA — vedi sopra).
 * @returns {Promise<
 *   | { ok: true, user: object, profile: object, supabase: object, row: object }
 *   | { ok: false, status: 400 | 401 | 403 | 404 | 500, error: string }
 * >}
 */
export async function verifyRowCentroOwnership(request, supabaseAdmin, { table, id, idColumn = 'id', centroColumn = 'centro_id', requirePiattaformaPlan = false }) {
  if (!id) {
    return { ok: false, status: 400, error: `${idColumn} richiesto` }
  }

  const { data: row, error } = await supabaseAdmin
    .from(table)
    .select(`${idColumn}, ${centroColumn}`)
    .eq(idColumn, id)
    .maybeSingle()

  if (error) {
    return { ok: false, status: 500, error: error.message }
  }
  if (!row) {
    return { ok: false, status: 404, error: 'Risorsa non trovata' }
  }

  const centroId = row[centroColumn]
  if (!centroId) {
    // Riga senza centro_id valorizzato: nessun ownership verificabile, nega per sicurezza
    return { ok: false, status: 403, error: 'Non autorizzato per questa risorsa' }
  }

  const ownership = await verifyCentroOwnership(request, centroId, { requirePiattaformaPlan })
  if (!ownership.ok) return ownership

  return { ...ownership, row }
}
