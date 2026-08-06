'use client'

import { useEffect } from 'react'

const ACCESS_COOKIE = 'guida_access_token'
const MAX_AGE_SECONDS = 60 * 60 * 24 * 90 // 90 giorni

// Salva in cookie il token già validato dal server, cosi' i prossimi accessi
// a /guida (senza ?t= in coda) funzionano senza dover reinserire l'email.
export default function PersistAccessToken({ token }) {
  useEffect(() => {
    if (!token) return
    document.cookie = `${ACCESS_COOKIE}=${token}; path=/; max-age=${MAX_AGE_SECONDS}; SameSite=Lax`
  }, [token])

  return null
}
