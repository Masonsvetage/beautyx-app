'use client'

import { useState, useEffect } from 'react'
import { getStoredConsent, setStoredConsent } from '@/lib/consent'

export default function CookieNotice() {
  const [visible, setVisible] = useState(false)

  useEffect(() => {
    // Nessuna scelta ancora fatta (né accettata né rifiutata) → mostra il banner.
    if (!getStoredConsent()) setVisible(true)
  }, [])

  const accetta = () => {
    setStoredConsent('accepted')
    setVisible(false)
  }

  const rifiuta = () => {
    setStoredConsent('rejected')
    setVisible(false)
  }

  if (!visible) return null

  return (
    <div style={{
      position: 'fixed',
      bottom: 0,
      left: 0,
      right: 0,
      background: '#1a1a0f',
      color: '#f5f1ea',
      padding: '14px 24px',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'space-between',
      gap: '16px',
      flexWrap: 'wrap',
      zIndex: 9999,
      fontSize: '13px',
      lineHeight: 1.5,
      borderTop: '1px solid rgba(255,255,255,0.1)',
    }}>
      <p style={{ margin: 0, maxWidth: '800px', color: '#ccc' }}>
        I cookie tecnici che servono a far funzionare il sito restano sempre attivi.
        Con il tuo sì, accendiamo anche i cookie di marketing (es. Meta Pixel) per capire
        come vanno le nostre campagne — partono solo se dici sì, mai prima.{' '}
        <a href="/privacy" style={{ color: '#EC4899', textDecoration: 'none' }}>
          Privacy Policy
        </a>
      </p>
      <div style={{ display: 'flex', gap: '10px', flexShrink: 0 }}>
        <button
          onClick={rifiuta}
          style={{
            background: 'transparent',
            color: '#f5f1ea',
            border: '1px solid rgba(255,255,255,0.3)',
            borderRadius: '6px',
            padding: '8px 16px',
            fontWeight: 600,
            fontSize: '13px',
            cursor: 'pointer',
            whiteSpace: 'nowrap',
          }}
        >
          Solo tecnici
        </button>
        <button
          onClick={accetta}
          style={{
            background: '#EC4899',
            color: '#fff',
            border: 'none',
            borderRadius: '6px',
            padding: '8px 18px',
            fontWeight: 700,
            fontSize: '13px',
            cursor: 'pointer',
            whiteSpace: 'nowrap',
            flexShrink: 0,
          }}
        >
          Accetta
        </button>
      </div>
    </div>
  )
}
