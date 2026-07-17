'use client'

import { useState } from 'react'
import Link from 'next/link'
import Image from 'next/image'

const argomenti = [
  {
    emoji: '👥',
    titolo: 'Il personale che non rende',
    descrizione: 'Come capire quali collaboratori stanno frenando il tuo centro — e cosa fare davvero.',
  },
  {
    emoji: '💰',
    titolo: 'Vendere prodotti senza sembrare una venditrice',
    descrizione: 'Il metodo che trasforma il consiglio in acquisto, senza pressione e senza imbarazzo.',
  },
  {
    emoji: '📅',
    titolo: "L'agenda piena non è il tuo obiettivo",
    descrizione: 'Perché lavorare meno ore può farti guadagnare di più — i numeri che non ti aspetti.',
  },
  {
    emoji: '🔄',
    titolo: 'Il modello abbonamento per i centri estetici',
    descrizione: 'Come costruire entrate fisse mensili anche senza cambiare i tuoi servizi.',
  },
  {
    emoji: '📊',
    titolo: 'I numeri che ogni titolare dovrebbe guardare ogni settimana',
    descrizione: 'Non il fatturato. Non i clienti. I tre indicatori che ti dicono davvero come stai andando.',
  },
  {
    emoji: '🌍',
    titolo: "Cosa fanno i centri estetici all'estero che qui non facciamo ancora",
    descrizione: 'Trend internazionali beauty & wellness che stanno arrivando in Italia — e come prepararsi.',
  },
]

export default function NewsletterPage() {
  const [email, setEmail] = useState('')
  const [website, setWebsite] = useState('')
  const [status, setStatus] = useState('idle')
  const [errorMsg, setErrorMsg] = useState('')

  const handleSubmit = async (e) => {
    e.preventDefault()
    setStatus('loading')
    setErrorMsg('')

    try {
      const res = await fetch('/api/newsletter/subscribe', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, website }),
      })

      const data = await res.json()

      if (data.success) {
        setStatus('success')
        setEmail('')
      } else {
        setStatus('error')
        setErrorMsg(data.error || 'Qualcosa è andato storto. Riprova.')
      }
    } catch {
      setStatus('error')
      setErrorMsg('Errore di connessione. Riprova tra qualche secondo.')
    }
  }

  return (
    <div style={{ background: '#080c2a', minHeight: '100vh', color: '#fff', fontFamily: 'system-ui, sans-serif' }}>

      {/* Top nav */}
      <header style={{ padding: '20px 24px', display: 'flex', alignItems: 'center', justifyContent: 'space-between', maxWidth: '1100px', margin: '0 auto' }}>
        <Link href="/" style={{ display: 'flex', alignItems: 'center', gap: '10px', textDecoration: 'none' }}>
          <Image src="/logo_beautyx-oro.png" alt="Beautyx" width={36} height={36} style={{ borderRadius: '4px' }} />
          <span style={{ fontWeight: 700, color: '#fff', fontSize: '16px' }}>Beautyx</span>
        </Link>
        <Link
          href="/login"
          style={{ fontSize: '13px', color: '#94a3b8', textDecoration: 'none' }}
        >
          Hai già un account?{' '}
          <span style={{ color: '#EC4899', fontWeight: 600 }}>Accedi</span>
        </Link>
      </header>

      {/* Matrix header banner */}
      <div style={{ width: '100%', maxWidth: '1200px', margin: '0 auto', lineHeight: 0 }}>
        <Image
          src="/header_beautyx_matrix.png"
          alt="Beautyx — L'AI che fa crescere il tuo centro"
          width={1200}
          height={440}
          style={{ width: '100%', height: 'auto', display: 'block' }}
          priority
        />
      </div>

      {/* Hero text + form */}
      <section style={{ maxWidth: '720px', margin: '0 auto', padding: '56px 24px 48px', textAlign: 'center' }}>
        <span style={{
          display: 'inline-block',
          background: 'rgba(236,72,153,0.15)',
          border: '1px solid rgba(236,72,153,0.4)',
          color: '#EC4899',
          fontSize: '11px',
          fontWeight: 700,
          padding: '4px 14px',
          borderRadius: '999px',
          letterSpacing: '0.08em',
          textTransform: 'uppercase',
          marginBottom: '24px',
        }}>
          Newsletter gratuita · Ogni settimana
        </span>

        <h1 style={{ fontSize: 'clamp(28px, 5vw, 46px)', fontWeight: 800, lineHeight: 1.2, marginBottom: '20px', color: '#fff' }}>
          Il centro estetico che vuoi<br />
          <span style={{ color: '#EC4899' }}>si costruisce con le giuste informazioni</span>
        </h1>

        <p style={{ fontSize: '17px', color: '#94a3b8', lineHeight: 1.7, marginBottom: '36px' }}>
          Ogni settimana un argomento concreto sulla gestione del tuo centro: personale, prezzi, clienti, numeri.
          Niente teoria, niente fronzoli. Solo quello che puoi applicare subito.
        </p>

        {status === 'success' ? (
          <div style={{
            background: 'rgba(16,185,129,0.1)',
            border: '1px solid rgba(16,185,129,0.3)',
            borderRadius: '16px',
            padding: '32px',
            maxWidth: '440px',
            margin: '0 auto',
          }}>
            <div style={{ fontSize: '36px', marginBottom: '12px' }}>🎉</div>
            <h3 style={{ fontSize: '18px', fontWeight: 700, color: '#6ee7b7', marginBottom: '8px' }}>Sei dentro!</h3>
            <p style={{ fontSize: '14px', color: '#a7f3d0' }}>
              Controlla la tua email — ti abbiamo inviato un messaggio di benvenuto.
              La prima newsletter arriva martedì.
            </p>
          </div>
        ) : (
          <form onSubmit={handleSubmit} style={{ maxWidth: '480px', margin: '0 auto' }}>
            {/* Honeypot */}
            <input
              type="text"
              name="website"
              value={website}
              onChange={(e) => setWebsite(e.target.value)}
              style={{ position: 'absolute', left: '-9999px', opacity: 0, height: 0 }}
              tabIndex={-1}
              autoComplete="off"
              aria-hidden="true"
            />
            <div style={{ display: 'flex', gap: '10px', flexWrap: 'wrap' }}>
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="la-tua-email@centro.it"
                required
                style={{
                  flex: '1 1 220px',
                  padding: '13px 16px',
                  borderRadius: '10px',
                  border: '1px solid rgba(255,255,255,0.12)',
                  background: 'rgba(255,255,255,0.06)',
                  color: '#fff',
                  fontSize: '14px',
                  outline: 'none',
                }}
              />
              <button
                type="submit"
                disabled={status === 'loading'}
                style={{
                  padding: '13px 24px',
                  background: 'linear-gradient(135deg, #EC4899, #a855f7)',
                  color: '#fff',
                  fontWeight: 700,
                  borderRadius: '10px',
                  border: 'none',
                  cursor: status === 'loading' ? 'not-allowed' : 'pointer',
                  fontSize: '14px',
                  whiteSpace: 'nowrap',
                  opacity: status === 'loading' ? 0.6 : 1,
                }}
              >
                {status === 'loading' ? 'Iscrizione...' : 'Iscriviti gratis →'}
              </button>
            </div>
            {status === 'error' && (
              <p style={{ marginTop: '10px', color: '#f87171', fontSize: '13px' }}>{errorMsg}</p>
            )}
            <p style={{ marginTop: '10px', fontSize: '12px', color: '#475569' }}>
              Niente spam. Disiscriviti quando vuoi con un click.
            </p>
          </form>
        )}
      </section>

      {/* Argomenti trattati */}
      <section style={{ maxWidth: '1100px', margin: '0 auto', padding: '16px 24px 56px' }}>
        <h2 style={{ textAlign: 'center', fontSize: '22px', fontWeight: 700, color: '#fff', marginBottom: '8px' }}>
          Di cosa parla la newsletter
        </h2>
        <p style={{ textAlign: 'center', color: '#64748b', fontSize: '14px', marginBottom: '36px' }}>
          Argomenti che abbiamo già trattato — e altri in arrivo
        </p>
        <div style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))',
          gap: '16px',
        }}>
          {argomenti.map((a, i) => (
            <div
              key={i}
              style={{
                background: 'rgba(255,255,255,0.04)',
                border: '1px solid rgba(255,255,255,0.08)',
                borderRadius: '16px',
                padding: '24px',
                transition: 'border-color 0.2s',
              }}
            >
              <div style={{ fontSize: '28px', marginBottom: '12px' }}>{a.emoji}</div>
              <h3 style={{ fontWeight: 600, color: '#f1f5f9', fontSize: '14px', marginBottom: '8px', lineHeight: 1.4 }}>{a.titolo}</h3>
              <p style={{ color: '#64748b', fontSize: '13px', lineHeight: 1.6 }}>{a.descrizione}</p>
            </div>
          ))}
        </div>
      </section>

      {/* Social proof */}
      <section style={{ maxWidth: '720px', margin: '0 auto', padding: '0 24px 56px', textAlign: 'center' }}>
        <div style={{
          background: 'rgba(255,255,255,0.04)',
          border: '1px solid rgba(236,72,153,0.2)',
          borderRadius: '20px',
          padding: '36px 32px',
        }}>
          <p style={{ color: '#cbd5e1', fontSize: '16px', fontStyle: 'italic', lineHeight: 1.7, marginBottom: '16px' }}>
            &ldquo;Finalmente una newsletter che parla di gestione vera — non di prodotti o tendenze nail art.
            Ogni numero ha almeno una cosa che riesco ad applicare subito nel mio centro.&rdquo;
          </p>
          <p style={{ fontSize: '14px', fontWeight: 700, color: '#fff' }}>Chiara R.</p>
          <p style={{ fontSize: '12px', color: '#475569' }}>Titolare di centro estetico, Milano</p>
        </div>
      </section>

      {/* CTA finale */}
      <section style={{ maxWidth: '720px', margin: '0 auto', padding: '0 24px 80px', textAlign: 'center' }}>
        <h2 style={{ fontSize: '24px', fontWeight: 800, color: '#fff', marginBottom: '12px' }}>
          Pronta a gestire il tuo centro in modo diverso?
        </h2>
        <p style={{ color: '#64748b', fontSize: '14px', marginBottom: '28px' }}>
          Iscriviti gratis. Nessuna carta di credito, nessun impegno.
        </p>
        {status !== 'success' && (
          <form onSubmit={handleSubmit} style={{ maxWidth: '480px', margin: '0 auto' }}>
            <input
              type="text"
              name="website"
              value={website}
              onChange={(e) => setWebsite(e.target.value)}
              style={{ position: 'absolute', left: '-9999px', opacity: 0, height: 0 }}
              tabIndex={-1}
              autoComplete="off"
              aria-hidden="true"
            />
            <div style={{ display: 'flex', gap: '10px', flexWrap: 'wrap' }}>
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="la-tua-email@centro.it"
                required
                style={{
                  flex: '1 1 220px',
                  padding: '13px 16px',
                  borderRadius: '10px',
                  border: '1px solid rgba(255,255,255,0.12)',
                  background: 'rgba(255,255,255,0.06)',
                  color: '#fff',
                  fontSize: '14px',
                  outline: 'none',
                }}
              />
              <button
                type="submit"
                disabled={status === 'loading'}
                style={{
                  padding: '13px 24px',
                  background: 'linear-gradient(135deg, #EC4899, #a855f7)',
                  color: '#fff',
                  fontWeight: 700,
                  borderRadius: '10px',
                  border: 'none',
                  cursor: status === 'loading' ? 'not-allowed' : 'pointer',
                  fontSize: '14px',
                  whiteSpace: 'nowrap',
                  opacity: status === 'loading' ? 0.6 : 1,
                }}
              >
                {status === 'loading' ? 'Iscrizione...' : 'Iscriviti gratis →'}
              </button>
            </div>
          </form>
        )}
      </section>

      {/* Footer */}
      <footer style={{ borderTop: '1px solid rgba(255,255,255,0.06)', padding: '24px', textAlign: 'center' }}>
        <p style={{ fontSize: '12px', color: '#334155' }}>
          © 2025 Beautyx ·{' '}
          <Link href="/privacy" style={{ color: '#475569', textDecoration: 'none' }}>Privacy</Link>
          {' · '}
          <Link href="/login" style={{ color: '#475569', textDecoration: 'none' }}>Accedi al gestionale</Link>
        </p>
      </footer>

    </div>
  )
}
