import { createServerClient } from '@supabase/ssr'
import { NextResponse } from 'next/server'

// Route pubbliche (accessibili senza autenticazione)
// '/auth' aggiunta (03/09/2026, collaudo Mason — bug #4): serve alla route
// app/auth/callback/route.js che scambia il `code` PKCE dopo la conferma
// email. Deve essere pubblica: al momento in cui il browser ci arriva
// dal link nell'email l'utente non ha ancora una sessione (è proprio questa
// route a crearla) — senza questa voce il middleware redirigeva a /login
// PRIMA che lo scambio del code potesse avvenire, e il link appariva rotto.
const publicRoutes = ['/', '/login', '/signup', '/reset-password', '/api/public', '/newsletter', '/miniguida', '/guida', '/report', '/privacy', '/auth']

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
    // La landing '/': se non autenticato → /newsletter (invariato).
    // Fix 04/09/2026 (bug segnalato da Mason in collaudo live): il livello 3
    // (piattaforma/abbonamenti) non è ancora un livello offerto agli utenti,
    // quindi la vecchia landing SaaS generica di app/page.js (piani Demo/
    // Starter/Professional/Enterprise) non va più mostrata a nessuno, nemmeno
    // a chi è loggato. Un utente autenticato va quindi in /dashboard, che
    // mostra solo ciò che ha davvero attivo (es. ReportCuraCard).
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
