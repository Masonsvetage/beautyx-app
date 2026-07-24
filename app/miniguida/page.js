'use client'

import { useState } from 'react'
import Image from 'next/image'
import Link from 'next/link'

const errori = [
  {
    numero: '01',
    titolo: 'Costruire un centro che non ti somiglia',
    desc: 'Hai arredato, scelto i trattamenti, fissato i prezzi — ma il centro racconta un\'altra persona.',
  },
  {
    numero: '02',
    titolo: 'Fare i prezzi guardando i concorrenti',
    desc: 'Il listino del centro qui accanto non c\'entra nulla con i tuoi costi, i tuoi margini o il tuo valore.',
  },
  {
    numero: '03',
    titolo: 'Gestire tutto da sola senza sistemi',
    desc: 'Senza processi scritti, sei l\'unico ingranaggio indispensabile — e non puoi permetterti di fermarti.',
  },
  {
    numero: null,
    titolo: '+ altri 7 errori nella guida completa',
    desc: 'Dal marketing ai turni, dalla fidelizzazione alle aspettative. Tutto quello che di solito si impara a caro prezzo.',
    isTeaser: true,
  },
]

export default function MiniguidaPage() {
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
    <>
      <style>{`
        
        *, *::before, *::after { box-sizing: border-box; margin: 0; padding: 0; }
      `}</style>

      <div style={{
        background: '#f5f1ea',
        minHeight: '100vh',
        fontFamily: "var(--font-inter), system-ui, sans-serif",
        color: '#1a1a0f',
      }}>

        {/* ── LOGO (no link, no nav) ── */}
        <header style={{
          paddingTop: '28px',
          paddingBottom: '0',
          display: 'flex',
          justifyContent: 'center',
          alignItems: 'center',
          gap: '8px',
        }}>
          <Image
            src="/logo_beautyx-oro.png"
            alt="Beautyx"
            width={28}
            height={28}
            style={{ borderRadius: '4px' }}
          />
          <span style={{
            fontWeight: 700,
            fontSize: '15px',
            color: '#1a1a0f',
            letterSpacing: '0.01em',
          }}>
            Beautyx
          </span>
        </header>

        {/* ── HERO ── */}
        <section style={{
          maxWidth: '620px',
          margin: '0 auto',
          padding: '20px 24px 0',
          textAlign: 'center',
        }}>

          {/* Badge */}
          <div style={{
            display: 'inline-flex',
            alignItems: 'center',
            gap: '6px',
            background: '#FFE44D',
            color: '#1a1a0f',
            fontWeight: 700,
            fontSize: '11px',
            letterSpacing: '0.1em',
            textTransform: 'uppercase',
            padding: '6px 14px',
            borderRadius: '100px',
            marginBottom: '28px',
          }}>
            Miniguida gratuita · Beautyx
          </div>

          {/* Headline 3 righe */}
          <h1 style={{
            fontFamily: "var(--font-playfair), Georgia, serif",
            lineHeight: 1.08,
            marginBottom: '24px',
          }}>
            <span style={{
              display: 'block',
              fontSize: 'clamp(36px, 8vw, 60px)',
              fontWeight: 900,
              color: '#1a1a0f',
            }}>
              I 10 errori che
            </span>
            <span style={{
              display: 'block',
              fontSize: 'clamp(36px, 8vw, 60px)',
              fontWeight: 700,
              fontStyle: 'italic',
              color: '#EC4899',
            }}>
              tradiscono il tuo centro
            </span>
            <span style={{
              display: 'block',
              fontSize: 'clamp(28px, 6vw, 46px)',
              fontWeight: 900,
              color: '#1a1a0f',
              marginTop: '4px',
            }}>
              e come evitarli —{' '}
              <span style={{ background: '#FFE44D', padding: '2px 6px', borderRadius: '3px' }}>gratis.</span>
            </span>
          </h1>

          {/* Sottotitolo */}
          <p style={{
            fontSize: 'clamp(16px, 4vw, 19px)',
            fontStyle: 'italic',
            fontFamily: "var(--font-playfair), Georgia, serif",
            color: '#666',
            lineHeight: 1.6,
            marginBottom: '32px',
            maxWidth: '480px',
            margin: '0 auto 32px',
          }}>
            Scaricala subito. Te la mandiamo via email insieme al primo numero della newsletter.
          </p>

          {/* ── FORM ── */}
          <div id="form">
            {status === 'success' ? (
              <div style={{
                background: '#fff',
                border: '2.5px solid #1a1a0f',
                borderRadius: '16px',
                padding: '32px 24px',
                textAlign: 'center',
              }}>
                <div style={{ fontSize: '40px', marginBottom: '14px' }}>🎉</div>
                <h3 style={{
                  fontFamily: "var(--font-playfair), serif",
                  fontSize: '22px',
                  fontWeight: 700,
                  marginBottom: '10px',
                  color: '#1a1a0f',
                }}>
                  Perfetto!
                </h3>
                <p style={{ color: '#666', fontSize: '16px', lineHeight: 1.65 }}>
                  Controlla la tua email! Ti abbiamo inviato la miniguida e il benvenuto.
                </p>
              </div>
            ) : (
              <form onSubmit={handleSubmit}>
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
                <div style={{
                  display: 'flex',
                  flexDirection: 'column',
                  gap: '10px',
                }}>
                  {/* Su mobile: colonna, su desktop: riga */}
                  <div style={{
                    display: 'flex',
                    border: '2.5px solid #1a1a0f',
                    borderRadius: '12px',
                    overflow: 'hidden',
                    background: '#fff',
                    flexWrap: 'wrap',
                  }}>
                    <input
                      type="email"
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      placeholder="la-tua@email.it"
                      required
                      style={{
                        flex: '1 1 200px',
                        padding: '18px 20px',
                        border: 'none',
                        background: 'transparent',
                        fontSize: '16px',
                        outline: 'none',
                        color: '#1a1a0f',
                        fontFamily: "var(--font-inter), sans-serif",
                        minWidth: '0',
                      }}
                    />
                    <button
                      type="submit"
                      disabled={status === 'loading'}
                      style={{
                        flex: '1 1 160px',
                        padding: '18px 24px',
                        background: '#EC4899',
                        color: '#fff',
                        fontWeight: 700,
                        border: 'none',
                        cursor: status === 'loading' ? 'not-allowed' : 'pointer',
                        fontSize: '16px',
                        whiteSpace: 'nowrap',
                        opacity: status === 'loading' ? 0.6 : 1,
                        fontFamily: "var(--font-inter), sans-serif",
                        letterSpacing: '0.01em',
                      }}
                    >
                      {status === 'loading' ? 'Invio...' : 'Mandamela →'}
                    </button>
                  </div>
                  {status === 'error' && (
                    <p style={{ color: '#c00', fontSize: '13px', textAlign: 'center' }}>{errorMsg}</p>
                  )}
                </div>
              </form>
            )}
          </div>

          {/* 3 micro-punti */}
          <div style={{
            display: 'flex',
            justifyContent: 'center',
            gap: '20px',
            marginTop: '14px',
            flexWrap: 'wrap',
          }}>
            {['✓ Gratis', '✓ Niente spam', '✓ Disiscriviti in 1 click'].map(t => (
              <span key={t} style={{ fontSize: '12px', color: '#999' }}>{t}</span>
            ))}
          </div>

          {/* Privacy note */}
          <p style={{ marginTop: '12px', fontSize: '11px', color: '#bbb', lineHeight: 1.65 }}>
            Iscrivendoti accetti il trattamento dei tuoi dati per ricevere la newsletter Beautyx. Usiamo Beehiiv e Supabase per gestire invii e contenuti. I tuoi dati non vengono mai venduti a terzi.{' '}
            <Link href="/privacy" style={{ color: '#aaa', textDecoration: 'underline' }}>Privacy policy</Link>.
          </p>
        </section>

        {/* ── SEPARATORE ── */}
        <div style={{ maxWidth: '560px', margin: '16px auto 0', padding: '0 24px' }}>
          <hr style={{ border: 'none', borderTop: '1px solid #ddd' }} />
        </div>

        {/* ── PREVIEW ERRORI ── */}
        <section style={{ maxWidth: '620px', margin: '0 auto', padding: '48px 24px' }}>
          <p style={{
            textAlign: 'center',
            fontSize: '11px',
            fontWeight: 700,
            letterSpacing: '0.12em',
            textTransform: 'uppercase',
            color: '#999',
            marginBottom: '24px',
          }}>
            Un assaggio di quello che trovi
          </p>

          <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
            {errori.map((e, i) => (
              <div
                key={i}
                style={{
                  background: e.isTeaser ? 'rgba(26,26,15,0.06)' : '#1a1a0f',
                  border: e.isTeaser ? '1.5px dashed #ccc' : 'none',
                  borderRadius: '14px',
                  padding: '22px 24px',
                  display: 'flex',
                  gap: '16px',
                  alignItems: 'flex-start',
                }}
              >
                {e.numero && (
                  <span style={{
                    fontFamily: "var(--font-playfair), serif",
                    fontSize: '13px',
                    fontWeight: 700,
                    color: '#EC4899',
                    flexShrink: 0,
                    marginTop: '2px',
                    minWidth: '24px',
                  }}>
                    {e.numero}
                  </span>
                )}
                {!e.numero && (
                  <span style={{ minWidth: '24px', flexShrink: 0 }} />
                )}
                <div>
                  <h3 style={{
                    fontFamily: "var(--font-playfair), serif",
                    fontWeight: 700,
                    fontSize: '15px',
                    color: e.isTeaser ? '#888' : '#f5f1ea',
                    marginBottom: '6px',
                    lineHeight: 1.35,
                    fontStyle: e.isTeaser ? 'italic' : 'normal',
                  }}>
                    {e.titolo}
                  </h3>
                  <p style={{
                    fontSize: '13px',
                    color: e.isTeaser ? '#aaa' : '#888',
                    lineHeight: 1.6,
                  }}>
                    {e.desc}
                  </p>
                </div>
              </div>
            ))}
          </div>
        </section>

        {/* ── PROVA SOCIALE ── */}
        <section style={{ maxWidth: '560px', margin: '0 auto', padding: '0 24px 56px' }}>
          <div style={{
            background: '#fff',
            border: '1.5px solid #e8e2d8',
            borderRadius: '16px',
            padding: '28px 28px',
            position: 'relative',
          }}>
            <span style={{
              fontFamily: "var(--font-playfair), serif",
              fontSize: '48px',
              color: '#EC4899',
              lineHeight: 1,
              position: 'absolute',
              top: '12px',
              left: '20px',
              opacity: 0.35,
            }}>
              "
            </span>
            <p style={{
              fontFamily: "var(--font-playfair), Georgia, serif",
              fontStyle: 'italic',
              fontSize: '16px',
              color: '#444',
              lineHeight: 1.7,
              marginBottom: '16px',
              paddingTop: '16px',
            }}>
              Ho letto la miniguida in 20 minuti e ho già trovato due errori che stavo facendo da anni.
              Cose che sembrano ovvie — ma che non mi aveva mai detto nessuno.
            </p>
            <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
              <div style={{
                width: '36px',
                height: '36px',
                borderRadius: '50%',
                background: '#EC4899',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                color: '#fff',
                fontWeight: 700,
                fontSize: '13px',
                flexShrink: 0,
              }}>
                C
              </div>
              <div>
                <p style={{ fontWeight: 700, fontSize: '13px', color: '#1a1a0f' }}>Chiara R.</p>
                <p style={{ fontSize: '12px', color: '#aaa' }}>Titolare, Milano</p>
              </div>
            </div>
          </div>
        </section>

        {/* ── FOOTER MINIMAL ── */}
        <footer style={{
          borderTop: '1px solid #e0dbd3',
          padding: '20px 24px',
          textAlign: 'center',
        }}>
          <p style={{ fontSize: '12px', color: '#bbb' }}>
            © 2025 Beautyx ·{' '}
            <Link href="/privacy" style={{ color: '#bbb', textDecoration: 'none' }}>Privacy</Link>
          </p>
        </footer>

      </div>
    </>
  )
}
