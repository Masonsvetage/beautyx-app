'use client'

// Pagina che mostra il report CURA generato al cliente. Legge
// `profiling_reports.contenuto_html` per il centro dell'utente autenticato
// tramite /api/beautyx/profiling (action:'report'), che a sua volta passa
// da verifyCentroOwnership — stesso meccanismo di ownership già in uso nel
// resto dell'app, nessun nuovo sistema di auth. L'HTML è già sanitizzato in
// origine (escapeHtml in lib/beautyx/reportAssembler.js, verificato da
// Riccardo) quindi è sicuro renderizzarlo con dangerouslySetInnerHTML.

import { useState, useEffect, useCallback } from 'react'
import Image from 'next/image'
import Link from 'next/link'
import { useAuth } from '@/contexts/AuthContext'

export default function RisultatoQuestionarioPage() {
  const { centroId, loading: authLoading, isAuthenticated } = useAuth()
  const [report, setReport] = useState(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)

  const load = useCallback(async () => {
    if (!centroId) return
    setError(null)
    try {
      const res = await fetch('/api/beautyx/profiling', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ centro_id: centroId, action: 'report' }),
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error || 'Errore nel caricamento del report')
      setReport(data.report)
    } catch (err) {
      setError(err.message)
    } finally {
      setLoading(false)
    }
  }, [centroId])

  useEffect(() => {
    if (!authLoading && isAuthenticated && centroId) load()
  }, [authLoading, isAuthenticated, centroId, load])

  return (
    <div style={{ background: '#f5f1ea', minHeight: '100vh', fontFamily: 'var(--font-inter), system-ui, sans-serif', color: '#1a1a0f' }}>
      <header style={{ paddingTop: 28, paddingBottom: 12, display: 'flex', justifyContent: 'center', alignItems: 'center', gap: 8 }}>
        <Image src="/logo_beautyx-oro.png" alt="Beautyx" width={26} height={28} style={{ borderRadius: 4 }} />
        <span style={{ fontWeight: 700, fontSize: 15 }}>Beautyx</span>
      </header>

      <main style={{ maxWidth: 760, margin: '0 auto', padding: '20px 20px 80px' }}>
        {(authLoading || loading) && (
          <div style={{ textAlign: 'center', padding: '60px 0', color: '#a97e1f' }}>
            Carichiamo il tuo report CURA...
          </div>
        )}

        {!authLoading && !loading && error && (
          <div style={{ textAlign: 'center', padding: '60px 20px' }}>
            <p style={{ marginBottom: 16, color: '#8a4a2a' }}>{error}</p>
            <Link href="/questionario" style={{ color: '#a97e1f', fontWeight: 700, textDecoration: 'underline' }}>Torna al questionario</Link>
          </div>
        )}

        {!authLoading && !loading && !error && !report && (
          <div style={{ textAlign: 'center', padding: '60px 20px' }}>
            <h1 style={{ fontFamily: 'var(--font-playfair), Georgia, serif', fontStyle: 'italic', fontSize: 24, marginBottom: 12 }}>
              Il tuo report non è ancora pronto
            </h1>
            <p style={{ color: '#6b6555', marginBottom: 20 }}>
              Non risulta ancora un report generato per il tuo centro — completa prima il questionario.
            </p>
            <Link
              href="/questionario"
              style={{
                display: 'inline-block', background: 'linear-gradient(135deg,#e8c874,#c9a34a)',
                color: '#1a1a0f', fontWeight: 800, padding: '11px 28px', borderRadius: 14, textDecoration: 'none',
              }}
            >
              Vai al questionario
            </Link>
          </div>
        )}

        {!authLoading && !loading && report && (
          <>
            <div
              className="care-report-wrapper"
              dangerouslySetInnerHTML={{ __html: report.contenuto_html }}
            />
            <div style={{ textAlign: 'center', marginTop: 40 }}>
              <Link href="/dashboard" style={{ color: '#a97e1f', fontWeight: 700, textDecoration: 'underline', fontSize: 14 }}>
                Torna alla dashboard
              </Link>
            </div>
          </>
        )}
      </main>
    </div>
  )
}
