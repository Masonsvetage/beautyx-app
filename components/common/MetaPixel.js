'use client'

// Meta Pixel — PREDISPOSTO MA SPENTO (task #164).
//
// No-op totale finché non esiste un ID reale: se `NEXT_PUBLIC_META_PIXEL_ID`
// è assente (com'è oggi, deliberatamente), il componente ritorna null e non
// carica nulla — nessun ID hardcodato, nessuna chiamata a Facebook, nessun
// cookie di profilazione. Stesso principio di gating già in uso per Plausible
// in app/layout.js.
//
// ⚠️ PRIMA DI IMPOSTARE L'ID IN PRODUZIONE (nota GDPR, non tecnica): il Meta
// Pixel usa cookie di PROFILAZIONE — oggi il sito ha solo cookie tecnici e un
// CookieNotice puramente informativo (memory/davide.md, sezione "Cookie e
// GDPR"). Attivare il pixel richiede prima di trasformare quel banner in un
// vero banner di CONSENSO (opt-in) e di far partire il pixel solo dopo il
// consenso. Questo componente lascia il gancio `hasConsent` pronto proprio per
// quello: finché non c'è un meccanismo di consenso, tenerlo su default (init
// solo se ID presente E, in futuro, consenso dato).

import Script from 'next/script'
import { useEffect } from 'react'

const PIXEL_ID = process.env.NEXT_PUBLIC_META_PIXEL_ID

// Helper riusabile per tracciare eventi custom lato client, se e solo se il
// pixel è realmente attivo (fbq definito). No-op silenzioso altrimenti.
export function trackMetaEvent(eventName, params) {
  if (typeof window === 'undefined' || typeof window.fbq !== 'function') return
  window.fbq('track', eventName, params || {})
}

export default function MetaPixel() {
  // Gate primario: nessun ID → nessun rendering, nessuno script.
  if (!PIXEL_ID) return null

  // PageView iniziale, solo dopo che lo script è pronto.
  useEffect(() => {
    if (typeof window !== 'undefined' && typeof window.fbq === 'function') {
      window.fbq('track', 'PageView')
    }
  }, [])

  return (
    <>
      <Script id="meta-pixel-base" strategy="afterInteractive">
        {`
          !function(f,b,e,v,n,t,s)
          {if(f.fbq)return;n=f.fbq=function(){n.callMethod?
          n.callMethod.apply(n,arguments):n.queue.push(arguments)};
          if(!f._fbq)f._fbq=n;n.push=n;n.loaded=!0;n.version='2.0';
          n.queue=[];t=b.createElement(e);t.async=!0;
          t.src=v;s=b.getElementsByTagName(e)[0];
          s.parentNode.insertBefore(t,s)}(window,document,'script',
          'https://connect.facebook.net/en_US/fbevents.js');
          fbq('init', '${PIXEL_ID}');
        `}
      </Script>
      <noscript>
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          height="1"
          width="1"
          style={{ display: 'none' }}
          alt=""
          src={`https://www.facebook.com/tr?id=${PIXEL_ID}&ev=PageView&noscript=1`}
        />
      </noscript>
    </>
  )
}
