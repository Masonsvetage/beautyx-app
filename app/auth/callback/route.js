import { createServerClient } from '@supabase/ssr'
import { cookies } from 'next/headers'
import { NextResponse } from 'next/server'

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
      return NextResponse.redirect(`${origin}${next}`)
    }

    console.error('[auth/callback] Scambio code->sessione fallito:', error.message)
  }

  // Nessun code, o scambio fallito: torna al login con un errore esplicito
  // invece di una pagina generica — più facile da diagnosticare la prossima
  // volta.
  return NextResponse.redirect(`${origin}/login?error=confirm_failed`)
}
