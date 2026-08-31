'use client'

// Meta Pixel — PREDISPOSTO MA SPENTO finché mancano le env var (task #164).
//
// Doppio gate, entrambi obbligatori prima che lo script venga anche solo
// caricato:
// 1. `NEXT_PUBLIC_META_PIXEL_ID` presente (oggi assente deliberatamente —
//    nessun ID hardcodato, nessuna chiamata a Facebook finché Mason non lo
//    imposta su Vercel).
// 2. Consenso marketing esplicito e ACCETTATO da CookieNotice.js
//    (lib/consent.js, chiave localStorage `beautyx-cookie-consent`). Se
//    l'utente non ha ancora scelto, o ha rifiutato, il componente resta
//    no-op — anche quando l'ID pixel è presente. Il gate si aggiorna in
//    tempo reale (evento CONSENT_CHANGE_EVENT) se l'utente accetta dal
//    banner senza ricaricare la pagina.
//
// Stesso principio di gating già in uso per Plausible in app/layout.js,
// esteso col vincolo GDPR imposto dal Meta Pixel (cookie di profilazione).

import Script from 'next/script'
import { useEffect, useState } from 'react'
import { hasMarketingConsent, CONSENT_CHANGE_EVENT } from '@/lib/consent'

const PIXEL_ID = process.env.NEXT_PUBLIC_META_PIXEL_ID

// Helper riusabile per tracciare eventi custom lato client, se e solo se il
// pixel è realmente attivo (fbq definito). No-op silenzioso altrimenti — se
// il consenso non è stato dato, fbq non esiste mai, quindi questo helper è
// già al sicuro senza bisogno di un controllo consenso separato.
export function trackMetaEvent(eventName, params) {
  if (typeof window === 'undefined' || typeof window.fbq !== 'function') return
  window.fbq('track', eventName, params || {})
}

export default function MetaPixel() {
  const [consented, setConsented] = useState(false)

  // Hook sempre chiamato, a prescindere da PIXEL_ID/consenso (regole degli
  // hook React) — il no-op vero e proprio avviene dentro, non nell'ordine
  // di chiamata degli hook.
  useEffect(() => {
    if (!PIXEL_ID) return
    setConsented(hasMarketingConsent())
    const onConsentChange = () => setConsented(hasMarketingConsent())
    window.addEventListener(CONSENT_CHANGE_EVENT, onConsentChange)
    return () => window.removeEventListener(CONSENT_CHANGE_EVENT, onConsentChange)
  }, [])

  // PageView iniziale, solo dopo che script+consenso sono entrambi pronti.
  useEffect(() => {
    if (!PIXEL_ID || !consented) return
    if (typeof window !== 'undefined' && typeof window.fbq === 'function') {
      window.fbq('track', 'PageView')
    }
  }, [consented])

  // Gate 1: nessun ID → nessun rendering, nessuno script.
  if (!PIXEL_ID) return null

  // Gate 2: nessun consenso marketing esplicito → resta no-op anche con
  // l'ID pixel presente.
  if (!consented) return null

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
