import { createServerClient } from '@supabase/ssr'
import { NextResponse } from 'next/server'

// Route pubbliche (accessibili senza autenticazione)
const publicRoutes = ['/login', '/signup', '/reset-password', '/api/public', '/newsletter', '/miniguida', '/privacy']

// Route per ruolo specifico
const adminRoutes = ['/admin']
const hpaRoutes = ['/hpa']

export async function middleware(req) {
  const pathname = req.nextUrl.pathname

  // Route API: skip middleware completamente
  if (pathname.startsWith('/api')) {
    return NextResponse.next()
  }

  let supabaseResponse = NextResponse.next({ request: req })

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
          supabaseResponse = NextResponse.next({ request: req })
          cookiesToSet.forEach(({ name, value, options }) =>
            supabaseResponse.cookies.set(name, value, options)
          )
        },
      },
    }
  )

  // Homepage '/': redirect a /newsletter se non autenticato
  if (pathname === '/') {
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) {
      return NextResponse.redirect(new URL('/newsletter', req.url))
    }
    return supabaseResponse
  }

  // Route pubbliche: sempre accessibili (se loggato su login/signup → dashboard)
  if (publicRoutes.some(route => pathname === route || pathname.startsWith(route + '/'))) {
    if (pathname.startsWith('/reset-password/update')) {
      return supabaseResponse
    }
    const { data: { user } } = await supabase.auth.getUser()
    if (user) {
      return NextResponse.redirect(new URL('/dashboard', req.url))
    }
    return supabaseResponse
  }

  // Route protette: verifica autenticazione
  const { data: { user } } = await supabase.auth.getUser()

  if (!user) {
    const loginUrl = new URL('/login', req.url)
    loginUrl.searchParams.set('redirect', pathname)
    return NextResponse.redirect(loginUrl)
  }

  // Verifica ruolo per route admin/hpa
  const needsRoleCheck =
    adminRoutes.some(route => pathname.startsWith(route)) ||
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

      if (adminRoutes.some(route => pathname.startsWith(route)) && effectiveRole !== 'admin') {
        return NextResponse.redirect(new URL('/?error=unauthorized', req.url))
      }

      if (hpaRoutes.some(route => pathname.startsWith(route)) && effectiveRole !== 'hpa' && effectiveRole !== 'admin') {
        return NextResponse.redirect(new URL('/?error=unauthorized', req.url))
      }
    } catch (error) {
      console.error('Errore middleware:', error)
    }
  }

  return supabaseResponse
}

export const config = {
  matcher: [
    '/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)',
  ],
}
