'use client'

// Error boundary GLOBALE dell'App Router (task #42/#165). Cattura gli errori di
// rendering non gestiti a livello root, mostra un fallback sobrio in voce
// Beautyx e li inoltra al reporter minimo (lib/monitoring/reportError — no-op
// di rete finché il webhook non è configurato). Deve dichiarare <html>/<body>
// perché sostituisce il layout root quando scatta.

import { useEffect } from 'react'
import { reportError } from '@/lib/monitoring/reportError'

export default function GlobalError({ error, reset }) {
  useEffect(() => {
    reportError(error, { where: 'app/global-error', digest: error?.digest })
  }, [error])

  return (
    <html lang="it">
      <body style={{ margin: 0, fontFamily: 'var(--font-inter, system-ui, sans-serif)', background: '#f5f1ea', color: '#1a1a0f' }}>
        <div style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '24px' }}>
          <div style={{ maxWidth: 440, textAlign: 'center' }}>
            <h1 style={{ fontFamily: 'var(--font-playfair, Georgia, serif)', fontStyle: 'italic', fontSize: '1.6rem', color: '#1a1a0f', marginBottom: 12 }}>
              Qualcosa si è inceppato
            </h1>
            <p style={{ color: '#4a4636', lineHeight: 1.6, marginBottom: 20 }}>
              Ci scusiamo per l’intoppo. Puoi riprovare subito: se capita di nuovo, ci pensiamo noi.
            </p>
            <button
              type="button"
              onClick={() => reset()}
              style={{
                background: 'linear-gradient(135deg, #e8c874, #c9a34a)', color: '#120f0a', fontWeight: 800,
                border: 'none', borderRadius: 12, padding: '11px 26px', cursor: 'pointer', fontSize: '0.95rem',
              }}
            >
              Riprova
            </button>
          </div>
        </div>
      </body>
    </html>
  )
}
