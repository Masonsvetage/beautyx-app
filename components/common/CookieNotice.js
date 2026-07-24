'use client'

import { useState, useEffect } from 'react'

export default function CookieNotice() {
  const [visible, setVisible] = useState(false)

  useEffect(() => {
    const dismissed = localStorage.getItem('cookie-notice-dismissed')
    if (!dismissed) setVisible(true)
  }, [])

  const dismiss = () => {
    localStorage.setItem('cookie-notice-dismissed', '1')
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
      zIndex: 9999,
      fontSize: '13px',
      lineHeight: 1.5,
      borderTop: '1px solid rgba(255,255,255,0.1)',
    }}>
      <p style={{ margin: 0, maxWidth: '800px', color: '#ccc' }}>
        Questo sito utilizza esclusivamente cookie tecnici necessari al funzionamento.
        Non utilizziamo cookie di profilazione o per pubblicità.{' '}
        <a href="/privacy" style={{ color: '#EC4899', textDecoration: 'none' }}>
          Privacy Policy
        </a>
      </p>
      <button
        onClick={dismiss}
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
        OK, ho capito
      </button>
    </div>
  )
}
