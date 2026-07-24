import { NextResponse } from 'next/server'

export function middleware(request) {
  const { pathname } = request.nextUrl

  // Solo per la homepage
  if (pathname !== '/') return NextResponse.next()

  // Supabase salva la sessione in cookie che iniziano con "sb-"
  // Se non esiste nessun cookie di sessione → utente non autenticato → /newsletter
  const hasSession = request.cookies.getAll().some(c => c.name.startsWith('sb-'))

  if (!hasSession) {
    return NextResponse.redirect(new URL('/newsletter', request.url))
  }

  return NextResponse.next()
}

export const config = {
  matcher: ['/'],
}
