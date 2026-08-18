'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'

// Stesso cookie di accesso usato da /guida (vedi app/guida/page.js,
// app/guida/_components/PersistAccessToken.js e app/newsletter/page.js — ACCESS_COOKIE).
// Il link "Rileggi la guida" nel footer deve comparire SOLO per chi è già passato da /guida
// come iscritto — mai per un visitatore qualunque ("il curioso"). La presenza del cookie qui
// è solo un'euristica economica di VISUALIZZAZIONE: non convalida nulla contro Supabase.
// La validazione vera (token contro la tabella guida_access) resta interamente in
// app/guida/page.js quando il link viene effettivamente cliccato — qui non si può trapelare
// alcun contenuto, si decide solo se mostrare o no il link.
//
// Componente client (document.cookie) perché è usato da pagine 'use client'
// (app/newsletter/page.js, app/page.js) dove cookies() di next/headers non è disponibile.
const ACCESS_COOKIE = 'guida_access_token'

function hasAccessCookie() {
  if (typeof document === 'undefined') return false
  return new RegExp('(?:^|; )' + ACCESS_COOKIE + '=').test(document.cookie)
}

export default function GuidaFooterLink({ style, className, separator = null }) {
  const [show, setShow] = useState(false)

  useEffect(() => {
    setShow(hasAccessCookie())
  }, [])

  if (!show) return null

  return (
    <>
      {separator}
      <Link href="/guida" style={style} className={className}>
        Rileggi la guida →
      </Link>
    </>
  )
}
