import { createServerClient } from '@supabase/ssr'
import { cookies } from 'next/headers'
import { NextResponse } from 'next/server'

// Server-side signout: invalida la sessione Supabase e cancella i cookie HttpOnly
// Chiamato direttamente con window.location.href = '/api/auth/signout'
export async function GET(request) {
  const cookieStore = await cookies()
  const response = NextResponse.redirect(new URL('/', request.url))

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY,
    {
      cookies: {
        getAll() {
          return cookieStore.getAll()
        },
        setAll(cookiesToSet) {
          // Scrive i cookie aggiornati (cancellati) sulla risposta di redirect
          cookiesToSet.forEach(({ name, value, options }) => {
            response.cookies.set(name, value, options)
          })
        }
      }
    }
  )

  // Invalida la sessione server-side su Supabase
  try {
    await supabase.auth.signOut()
  } catch (e) {
    // Ignora errori - la pulizia cookie è sufficiente
  }

  // Force-delete tutti i cookie sb-* rimasti (per sicurezza)
  cookieStore.getAll().forEach(cookie => {
    if (cookie.name.startsWith('sb-')) {
      response.cookies.set(cookie.name, '', {
        maxAge: 0,
        path: '/',
        expires: new Date(0)
      })
    }
  })

  return response
}
