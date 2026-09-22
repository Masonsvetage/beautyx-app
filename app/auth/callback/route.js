import { createServerClient } from '@supabase/ssr'
import { cookies } from 'next/headers'
import { NextResponse } from 'next/server'

// Campi anagrafici opzionali che possono arrivare in raw_user_meta_data
// (impostati da contexts/AuthContext.js signUp(), vedi task #218 21/09/2026).
// nome/cognome sono gestiti a parte perché NOT NULL su user_profiles (serve
// un fallback, mai lasciarli assenti dall'INSERT).
const OPTIONAL_METADATA_FIELDS = [
  'tipo_soggetto', 'ragione_sociale', 'tipo_societa', 'codice_fiscale', 'partita_iva',
  'cellulare', 'telefono_fisso', 'pec',
  'residenza_indirizzo', 'residenza_civico', 'residenza_cap', 'residenza_citta', 'residenza_provincia',
  'domicilio_diverso', 'domicilio_indirizzo', 'domicilio_civico', 'domicilio_cap', 'domicilio_citta', 'domicilio_provincia',
  'documento_tipo', 'documento_numero', 'documento_data_scadenza'
]

// Sincronizza public.user_profiles da auth.users.user_metadata (= raw_user_meta_data)
// nel primo momento in cui esiste una sessione autenticata reale — vedi
// spiegazione completa nel commento sopra alla chiamata, dentro GET().
// Auto-risanante: funziona sia se la riga manca del tutto (crea, come
// avrebbe dovuto fare il trigger DB) sia se esiste già ma incompleta
// (completa solo i campi anagrafici mancanti, non tocca mai ruolo/
// ruolo_livello/piano/attivo/centro_id di una riga già esistente — quelli
// sono decisioni prese altrove, es. dall'admin o da create-centro).
async function syncProfileFromAuthMetadata(supabase, user) {
  const meta = user.user_metadata || {}
  const nomeFallback = (meta.nome && String(meta.nome).trim()) || 'Nuovo'
  const cognomeFallback = (meta.cognome && String(meta.cognome).trim()) || 'Utente'

  const { data: existingProfile, error: readError } = await supabase
    .from('user_profiles')
    .select('id, nome, cognome, ' + OPTIONAL_METADATA_FIELDS.join(', '))
    .eq('id', user.id)
    .maybeSingle()

  if (readError) {
    console.error('[auth/callback] Lettura profilo per sync fallita:', readError.message)
    return
  }

  if (!existingProfile) {
    // Riga mancante (il caso del bug #218): creala per intero.
    const insertPayload = {
      id: user.id,
      email: user.email,
      nome: nomeFallback,
      cognome: cognomeFallback,
      ruolo: 'centro',
      ruolo_livello: 'titolare',
      piano: 'demo',
      attivo: true
    }
    for (const field of OPTIONAL_METADATA_FIELDS) {
      if (meta[field] !== undefined && meta[field] !== null && meta[field] !== '') {
        insertPayload[field] = meta[field]
      }
    }
    const { error: insertError } = await supabase.from('user_profiles').insert(insertPayload)
    if (insertError) {
      console.error('[auth/callback] Creazione profilo self-healing fallita:', insertError.message)
    }
    return
  }

  // Riga già esistente (es. il trigger DB ha funzionato): completa SOLO i
  // campi anagrafici ancora vuoti, senza mai sovrascrivere un valore già
  // presente (potrebbe essere stato modificato a mano dall'utente o
  // dall'admin dopo la creazione).
  const updatePayload = {}
  if (!existingProfile.nome || existingProfile.nome === 'Nuovo') {
    if (meta.nome) updatePayload.nome = meta.nome
  }
  if (!existingProfile.cognome || existingProfile.cognome === 'Utente') {
    if (meta.cognome) updatePayload.cognome = meta.cognome
  }
  for (const field of OPTIONAL_METADATA_FIELDS) {
    const current = existingProfile[field]
    const isEmpty = current === null || current === undefined || current === ''
    if (isEmpty && meta[field] !== undefined && meta[field] !== null && meta[field] !== '') {
      updatePayload[field] = meta[field]
    }
  }

  if (Object.keys(updatePayload).length > 0) {
    const { error: updateError } = await supabase
      .from('user_profiles')
      .update(updatePayload)
      .eq('id', user.id)
    if (updateError) {
      console.error('[auth/callback] Completamento profilo self-healing fallito:', updateError.message)
    }
  }
}

// Bug fix (03/09/2026, collaudo Mason — bug #4): "cliccando sul link
// nell'email di conferma si ottiene un errore, non si riesce ad accedere".
//
// Causa reale trovata: nel progetto NON esisteva nessuna route
// `/auth/callback` (o equivalente), e `signUp()` in contexts/AuthContext.js
// non passava mai `options.emailRedirectTo`. `createBrowserClient` di
// @supabase/ssr usa di default il flow PKCE (necessario per la sessione
// cookie-based letta dal middleware server-side) — per il flow PKCE, dopo
// che l'endpoint GoTrue `/auth/v1/verify` verifica il token dell'email,
// reindirizza il browser al `redirect_to` con un parametro `?code=...` da
// scambiare esplicitamente con `exchangeCodeForSession`. Senza una route che
// lo faccia, quel `code` restava inutilizzato nell'URL: nessuna sessione
// veniva mai creata lato server, e l'utente restava a guardare una pagina
// che sembrava un errore (o comunque non risultava loggato).
//
// Verificato nei log Auth di Supabase (query_logs, progetto scfumedmisbuxhdywwpb,
// finestra del test di Mason del 03/09/2026 22:53-22:54 UTC): la chiamata
// GET /verify è arrivata con successo a Supabase (status 303, evento
// "user_signedup") — cioè il link email di per sé funziona lato Supabase.
// Il problema è tutto lato nostra app, nella pagina di atterraggio dopo la
// verifica.
//
// Fix: questa route riceve il redirect da Supabase, scambia il `code` per
// una sessione vera (cookie HttpOnly, quindi visibile anche al middleware
// server-side in proxy.js) e poi manda l'utente al passo giusto della
// registrazione. `signUp()` in AuthContext ora passa
// `emailRedirectTo: {origin}/auth/callback` così il link nell'email punta
// qui invece che al Site URL di default configurato su Supabase.
//
// IMPORTANTE (da verificare da chi ha accesso alla dashboard Supabase, non
// disponibile da qui): perché questo funzioni, l'URL Configuration del
// progetto (Authentication → URL Configuration → Redirect URLs) deve
// includere sia `https://www.beautyx.it/auth/callback` (produzione) sia,
// se si continua a testare in locale, `http://localhost:3000/auth/callback`
// — Supabase rifiuta silenziosamente (torna al Site URL di default) i
// redirect verso URL non in questa allow-list.
export async function GET(request) {
  const { searchParams, origin } = new URL(request.url)
  const code = searchParams.get('code')
  // Dopo la conferma email il passo naturale è "crea il tuo centro" (se non
  // già fatto) — stesso URL già usato altrove nel progetto per il primo
  // accesso (vedi app/dashboard/page.js). Se in futuro serve un `next`
  // diverso per altri flussi (es. reset password), lo si può passare come
  // querystring extra nel redirectTo e leggerlo qui.
  //
  // Aggiornamento (06/09/2026, bug reset-password trovato nei query_logs
  // Supabase): questo `next` era già previsto e già letto qui sotto — era
  // solo inutilizzato. Il vero bug era che `resetPassword()` in
  // AuthContext.js puntava `redirectTo` direttamente a
  // `/reset-password/update`, saltando questa route: dopo la verifica del
  // link (redirect 303 lato Supabase, confermato nei log), il browser
  // arrivava sulla pagina client senza che nessuno scambiasse mai il `code`
  // PKCE con `exchangeCodeForSession` — zero richieste di rete, zero
  // errori, nessuna sessione. Ora `resetPassword()` passa
  // `redirectTo: {origin}/auth/callback?next=/reset-password/update`, che
  // arriva qui: il `next` letto sotto diventa `/reset-password/update` e lo
  // scambio del code avviene esplicitamente lato server come per il flusso
  // signup.
  const next = searchParams.get('next') || '/impostazioni?primo-accesso=1'

  if (code) {
    const cookieStore = await cookies()
    const supabase = createServerClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY,
      {
        cookies: {
          getAll() {
            return cookieStore.getAll()
          },
          setAll(cookiesToSet) {
            cookiesToSet.forEach(({ name, value, options }) => {
              cookieStore.set(name, value, options)
            })
          },
        },
      }
    )

    const { error } = await supabase.auth.exchangeCodeForSession(code)
    if (!error) {
      // Fix bug critico (21/09/2026, collaudo live Mason, task #218): "nessun
      // utente trovato" sulla pagina di completamento centro subito dopo la
      // conferma email, pur essendo l'utente davvero loggato (provato: aprendo
      // /listino il tool si apriva correttamente).
      //
      // Causa reale trovata sui dati veri di produzione (non un'ipotesi): il
      // trigger `handle_new_user()` su auth.users (creato il 07/09/2026) non
      // includeva mai le colonne nome/cognome nell'INSERT su user_profiles —
      // colonne NOT NULL senza default. Ogni INSERT del trigger falliva
      // SEMPRE con una violazione di vincolo, presa in silenzio dal blocco
      // EXCEPTION WHEN OTHERS (solo un RAISE WARNING nei log Postgres): da
      // quando il trigger esiste, NESSUNA riga user_profiles è mai stata
      // creata per un signup nuovo. Verificato sull'account di test reale di
      // Mason di oggi (query diretta auth.users/user_profiles) e corretto
      // anche lato DB (trigger ora legge nome/cognome da raw_user_meta_data,
      // con fallback se assenti). Quel fix da solo però non basta: il
      // secondo tentativo di creare il profilo, quello lato client in
      // contexts/AuthContext.js signUp(), è SEMPRE bloccato dalle policy RLS
      // in questo punto del flusso (nessuna sessione autenticata esiste
      // ancora finché l'email non è confermata) — quindi anche con conferma
      // email il resto dell'anagrafica raccolta nel form (residenza,
      // documento, ecc.) andava persa in silenzio.
      //
      // Fix strutturale: qui, che è il PRIMO momento in cui esiste davvero
      // una sessione autenticata (cookie appena scritti da
      // exchangeCodeForSession, quindi `auth.uid()` è valorizzato per le
      // policy RLS), sincronizziamo il profilo da `user.user_metadata`
      // (= raw_user_meta_data, dove signUp() ora salva l'intera anagrafica,
      // non solo nome/cognome — vedi AuthContext.js). Auto-risanante e
      // indipendente dall'affidabilità del trigger DB: se la riga manca la
      // crea, se esiste già la completa SENZA sovrascrivere ruolo/piano/
      // centro_id o dati già presenti. Non blocca mai il redirect: è
      // avvolto in try/catch, un fallimento qui non deve impedire il login.
      if (!next.startsWith('/reset-password')) {
        try {
          const { data: { user: sessionUser } } = await supabase.auth.getUser()
          if (sessionUser) {
            await syncProfileFromAuthMetadata(supabase, sessionUser)
          }
        } catch (syncError) {
          console.error('[auth/callback] Sync profilo da metadata fallito (non bloccante):', syncError.message)
        }
      }

      return NextResponse.redirect(`${origin}${next}`)
    }

    console.error('[auth/callback] Scambio code->sessione fallito:', error.message)
  }

  // Bug fix (06/09/2026 sera, collaudo Mason — nuovo sintomo, diverso dal
  // precedente: il link ora "arriva" ma rimbalza dritto al login invece
  // che a /reset-password/update, niente più rimbalzo muto).
  //
  // Causa reale trovata nei query_logs Supabase (progetto
  // scfumedmisbuxhdywwpb, tentativo di luigixri@gmail.com 15:44-15:45 UTC
  // del 06/09/2026): GET /verify risponde 303 (il link email è valido e
  // Supabase lo conferma), ma la POST /token successiva (grant_type=pkce,
  // scatenata da exchangeCodeForSession qui sopra) fallisce con 400
  // "invalid request: both auth code and code verifier should be
  // non-empty" — il `code` arriva (altrimenti non saremmo dentro
  // `if (code)`), ma il code_verifier PKCE (il cookie creato dal browser
  // al momento della richiesta reset in AuthContext.resetPassword) non è
  // presente sulla richiesta che arriva qui. Nei log si vede anche una
  // seconda /verify sullo stesso token, quasi in contemporanea, che
  // fallisce con "One-time token not found" — compatibile con link aperto
  // da un browser/dispositivo diverso da quello con cui è stato
  // richiesto il reset, o con un client email che "prefetcha" il link
  // consumando il token one-time prima del click reale.
  //
  // Il bug VERO però era qui sotto: qualunque fosse la causa dello
  // scambio fallito, questa route mandava SEMPRE a `/login?error=
  // confirm_failed` — un messaggio scritto per la conferma email di
  // signup ("prova ad accedere... o registrati di nuovo"), fuorviante e
  // senza via d'uscita per chi sta solo recuperando la password — invece
  // di sfruttare la UI già pronta in app/reset-password/update/page.js
  // (stato `linkInvalid`, con CTA "Richiedi un nuovo link") che legge
  // proprio `error`/`error_description` dalla querystring. Ora, se il
  // flusso in corso è quello di reset password (next punta a
  // /reset-password), l'errore torna lì invece che al login.
  if (next.startsWith('/reset-password')) {
    const errorDescription = searchParams.get('error_description') || 'Il link non è più valido.'
    const params = new URLSearchParams({ error: 'access_denied', error_description: errorDescription })
    return NextResponse.redirect(`${origin}${next}?${params.toString()}`)
  }

  // Altri flussi (es. conferma signup): torna al login con un errore
  // esplicito invece di una pagina generica — più facile da diagnosticare
  // la prossima volta.
  return NextResponse.redirect(`${origin}/login?error=confirm_failed`)
}
