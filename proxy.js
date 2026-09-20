import { createServerClient } from '@supabase/ssr'
import { NextResponse } from 'next/server'

// Route pubbliche (accessibili senza autenticazione)
// '/auth' aggiunta (03/09/2026, collaudo Mason — bug #4): serve alla route
// app/auth/callback/route.js che scambia il `code` PKCE dopo la conferma
// email. Deve essere pubblica: al momento in cui il browser ci arriva
// dal link nell'email l'utente non ha ancora una sessione (è proprio questa
// route a crearla) — senza questa voce il middleware redirigeva a /login
// PRIMA che lo scambio del code potesse avvenire, e il link appariva rotto.
const publicRoutes = ['/', '/login', '/signup', '/reset-password', '/api/public', '/newsletter', '/miniguida', '/guida', '/report', '/listino', '/pilastri', '/privacy', '/auth']

// Route per ruolo specifico
const adminRoutes = ['/admin']
const hpaRoutes = ['/hpa']

export async function proxy(req) {
  const pathname = req.nextUrl.pathname

  // Route API: skip middleware completamente (gestiscono auth internamente)
  // Questo elimina una chiamata getUser() ridondante per ogni API call
  if (pathname.startsWith('/api')) {
    return NextResponse.next()
  }

  let supabaseResponse = NextResponse.next({
    request: req,
  })

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY,
    {
      cookies: {
        getAll() {
          return req.cookies.getAll()
        },
        setAll(cookiesToSet) {
          cookiesToSet.forEach(({ name, value }) => req.cookies.set(name, value))
          supabaseResponse = NextResponse.next({
            request: req,
          })
          cookiesToSet.forEach(({ name, value, options }) =>
            supabaseResponse.cookies.set(name, value, options)
          )
        },
      },
    }
  )

  // Route pubbliche: sempre accessibili
  if (publicRoutes.some(route => pathname === route || pathname.startsWith(route + '/'))) {
    if (pathname.startsWith('/reset-password/update')) {
      return supabaseResponse
    }
    // La landing '/' per utenti NON autenticati: redirect FISSO a /newsletter,
    // sempre — anche durante i 90 giorni gratuiti del report. Corretto il
    // 19/9/2026 (Mason): un giro di lavoro precedente, in questa stessa data,
    // aveva letto male la decisione chiusa il 4/9/2026 (vedi
    // mappa-ecosistema-beautyx.html, sezione "3. Decisioni chiuse il
    // 4/9/2026", primo punto — "il report... agisce da livello 1") come se
    // durante i 90gg il report dovesse SOSTITUIRE la newsletter come landing
    // della root. Non è così: quella riga descrive come il report viene
    // PROMOSSO con urgenza da dentro la newsletter e le campagne (countdown,
    // CTA "Fai il tuo Identikit strategico CURA" — vedi il redesign della
    // sezione Report CURA su /newsletter), non un cambio della porta
    // d'ingresso. La newsletter resta l'unica porta d'ingresso per il
    // traffico nuovo, sempre, indipendentemente dalla finestra dei 90gg.
    //
    // NOTA (non in scope qui): il redirect per utenti già loggati (→
    // /dashboard, fix 04/09/2026 sotto) è una landing "da rivedere" secondo
    // lo schema stesso — questione distinta, non toccata da questa modifica.
    if (pathname === '/') {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) {
        return NextResponse.redirect(new URL('/newsletter', req.url))
      }
      return NextResponse.redirect(new URL('/dashboard', req.url))
    }
    // Login/signup: se già loggato vai alla dashboard.
    // SOLO queste due route pubbliche fanno questo redirect — tutte le altre
    // route pubbliche (/report, /newsletter, /miniguida, /guida, /privacy,
    // /auth, /reset-password) restano navigabili sia da loggati sia da non
    // loggati. Fix 04/09/2026: prima questa condizione si applicava a
    // QUALUNQUE route pubblica diversa da '/', mandando in redirect a
    // /dashboard anche chi (già loggato) visitava /report — segnalato da
    // Mason ("la pagina /report non è accessibile").
    if (pathname === '/login' || pathname === '/signup') {
      const { data: { user } } = await supabase.auth.getUser()
      if (user) {
        return NextResponse.redirect(new URL('/dashboard', req.url))
      }
    }
    return supabaseResponse
  }

  // Route protette: verifica autenticazione (getUser refresha il token)
  const { data: { user } } = await supabase.auth.getUser()

  if (!user) {
    const loginUrl = new URL('/login', req.url)
    loginUrl.searchParams.set('redirect', pathname)
    return NextResponse.redirect(loginUrl)
  }

  // Verifica ruolo SOLO per route admin/hpa (evita query inutili per altre route)
  const needsRoleCheck = adminRoutes.some(route => pathname.startsWith(route)) ||
                         hpaRoutes.some(route => pathname.startsWith(route))

  if (needsRoleCheck) {
    try {
      const { data: profile } = await supabase
        .from('user_profiles')
        .select('ruolo, ruolo_livello, attivo')
        .eq('id', user.id)
        .maybeSingle()

      if (profile && !profile.attivo) {
        await supabase.auth.signOut()
        return NextResponse.redirect(new URL('/login?error=account_disabled', req.url))
      }

      const effectiveRole = profile?.ruolo_livello || profile?.ruolo

      if (adminRoutes.some(route => pathname.startsWith(route))) {
        if (effectiveRole !== 'admin') {
          return NextResponse.redirect(new URL('/?error=unauthorized', req.url))
        }
      }

      if (hpaRoutes.some(route => pathname.startsWith(route))) {
        if (effectiveRole !== 'hpa' && effectiveRole !== 'admin') {
          return NextResponse.redirect(new URL('/?error=unauthorized', req.url))
        }
      }
    } catch (error) {
      console.error('Errore middleware:', error)
    }
  }

  return supabaseResponse
}

export const config = {
  matcher: [
    /*
     * Match all request paths except for the ones starting with:
     * - _next/static (static files)
     * - _next/image (image optimization files)
     * - favicon.ico (favicon file)
     * - public folder
     */
    '/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)',
  ],
}
