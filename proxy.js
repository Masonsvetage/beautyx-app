import { createServerClient } from '@supabase/ssr'
import { NextResponse } from 'next/server'

// Route pubbliche (accessibili senza autenticazione)
const publicRoutes = ['/', '/login', '/signup', '/reset-password', '/api/public', '/newsletter', '/miniguida']

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
    // La landing '/': se non autenticato → /newsletter; se autenticato resta in homepage
    if (pathname === '/') {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) {
        return NextResponse.redirect(new URL('/newsletter', req.url))
      }
      return supabaseResponse
    }
    // Login/signup: se già loggato vai alla dashboard
    const { data: { user } } = await supabase.auth.getUser()
    if (user) {
      return NextResponse.redirect(new URL('/dashboard', req.url))
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
