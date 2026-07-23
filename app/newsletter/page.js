'use client'

import { useState, useEffect } from 'react'
import Link from 'next/link'
import Image from 'next/image'

const faqs = [
  {
    domanda: 'Quanto spesso arriva la newsletter?',
    risposta: 'Due volte a settimana. Di mattina, così hai qualcosa di utile prima di aprire il centro.',
  },
  {
    domanda: "C'è davvero un consulente umano? Non è tutto automatico?",
    risposta:
      "Sì, davvero. L'AI lavora ogni giorno per raccogliere e filtrare le informazioni — è il motore. Il consulente è una persona reale a cui puoi fare una domanda al mese e ricevere una risposta personalizzata: non una risposta generica, una risposta sul tuo centro. I due livelli lavorano insieme, non si escludono.",
  },
  {
    domanda: 'Ho già un commercialista. Non mi serve altro, no?',
    risposta:
      "Il commercialista ti protegge dal fisco — ed è fondamentale. Ma i prezzi giusti, l'agenda che non si svuota, la cliente che non torna: non è il suo campo. Non perché non sia bravo, ma perché è un altro mestiere. Beautyx lavora lì.",
  },
  {
    domanda: "Ho già pochissimo tempo. Un'altra newsletter è l'ultima cosa di cui ho bisogno.",
    risposta:
      'Ogni numero si legge in dieci minuti. Se nella prima settimana non ti porta niente di utile, ti disiscrivi senza sensi di colpa.',
  },
]

export default function NewsletterPage() {
  const [email, setEmail] = useState('')
  const [website, setWebsite] = useState('')
  const [status, setStatus] = useState('idle')
  const [errorMsg, setErrorMsg] = useState('')
  const [articles, setArticles] = useState([])
  const [activeArticle, setActiveArticle] = useState(null)

  useEffect(() => {
    fetch('/api/public/news?limit=12')
      .then((r) => r.json())
      .then((d) => setArticles(Array.isArray(d.news) ? d.news : []))
      .catch(() => {})
  }, [])

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
        @import url('https://fonts.googleapis.com/css2?family=Playfair+Display:ital,wght@0,700;0,900;1,700;1,900&family=Inter:wght@400;500;600;700&display=swap');
        *, *::before, *::after { box-sizing: border-box; margin: 0; padding: 0; }
        html { scroll-behavior: smooth; }
        .bx-card:hover { transform: translateY(-3px); box-shadow: 0 12px 30px rgba(0,0,0,0.10); }
        .bx-article h3 { font-family: 'Playfair Display', Georgia, serif; font-size: 20px; color: #1a1a0f; margin: 28px 0 10px; line-height: 1.3; }
        .bx-article p { font-size: 16px; color: #333; line-height: 1.8; margin-bottom: 16px; }
        .bx-article ul { margin: 0 0 16px 22px; }
        .bx-article li { font-size: 16px; color: #333; line-height: 1.7; margin-bottom: 8px; }
        .bx-article hr { border: none; border-top: 1px solid #e7e0d5; margin: 24px 0; }
        .bx-article strong { color: #1a1a0f; }
        .bx-article em { color: #444; }
      `}</style>

      <div style={{ background: '#f5f1ea', minHeight: '100vh', fontFamily: "'Inter', system-ui, sans-serif", color: '#1a1a0f' }}>

        {/* ── NAV ── */}
        <header style={{ padding: '20px 32px', display: 'flex', alignItems: 'center', justifyContent: 'space-between', maxWidth: '1100px', margin: '0 auto' }}>
          <Link href="/" style={{ display: 'flex', alignItems: 'center', gap: '10px', textDecoration: 'none' }}>
            <Image src="/logo_beautyx-oro.png" alt="Beautyx" width={32} height={32} style={{ borderRadius: '4px' }} />
            <span style={{ fontWeight: 700, color: '#1a1a0f', fontSize: '16px' }}>Beautyx</span>
          </Link>
          <a
            href="#form-section"
            style={{
              background: '#1a1a0f',
              color: '#fff',
              padding: '12px 24px',
              borderRadius: '8px',
              fontWeight: 700,
              fontSize: '14px',
              textDecoration: 'none',
              letterSpacing: '0.01em',
            }}
          >
            Iscriviti gratis →
          </a>
        </header>

        {/* ── SEZIONE 1: HERO ── */}
        <section style={{ maxWidth: '860px', margin: '0 auto', padding: '56px 32px 64px' }}>
          <h1 style={{
            fontFamily: "'Playfair Display', Georgia, serif",
            fontSize: 'clamp(32px, 5.5vw, 64px)',
            fontWeight: 900,
            lineHeight: 1.1,
            color: '#1a1a0f',
            marginBottom: '28px',
            maxWidth: '760px',
          }}>
            Gestire un centro estetico è un mestiere.{' '}
            <span style={{ fontStyle: 'italic', color: '#EC4899' }}>La gestione è un altro mestiere ancora.</span>
          </h1>

          <p style={{
            fontSize: 'clamp(16px, 2vw, 19px)',
            color: '#555',
            lineHeight: 1.75,
            marginBottom: '36px',
            maxWidth: '680px',
          }}>
            Beautyx è la newsletter bi-settimanale sulla gestione strategica del centro estetico. Pricing, agenda, fidelizzazione, margini, dipendenti — un pezzo alla volta, spiegato bene, con qualcosa di concreto da provare. Non teorie. Non le ultime tendenze TikTok. Roba che funziona nel mercato italiano, adesso.
          </p>

          <a
            href="#form-section"
            style={{
              display: 'inline-block',
              background: '#EC4899',
              color: '#fff',
              padding: '16px 32px',
              borderRadius: '10px',
              fontWeight: 700,
              fontSize: '16px',
              textDecoration: 'none',
              letterSpacing: '0.01em',
              marginBottom: '14px',
            }}
          >
            Iscriviti gratis →
          </a>

          <p style={{ fontSize: '13px', color: '#999' }}>
            Immediato: la miniguida gratuita arriva nella tua email oggi stesso.
          </p>
        </section>

        {/* ── SEZIONE 2: IL DIFFERENZIATORE ── */}
        <section style={{ background: '#1a1a0f', padding: '72px 32px' }}>
          <div style={{ maxWidth: '760px', margin: '0 auto' }}>
            <h2 style={{
              fontFamily: "'Playfair Display', Georgia, serif",
              fontSize: 'clamp(24px, 3.5vw, 38px)',
              fontWeight: 700,
              color: '#fff',
              marginBottom: '36px',
              lineHeight: 1.2,
            }}>
              Non è una rivista di settore. È uno strumento di lavoro.
            </h2>

            <div style={{ fontSize: 'clamp(15px, 1.8vw, 17px)', color: '#b0b0b0', lineHeight: 1.85 }}>
              <p style={{ marginBottom: '22px' }}>
                La maggior parte delle newsletter sul settore ti racconta quello che succede. Noi partiamo da lì, ma il punto non è tenerti informata — il punto è aiutarti a prendere decisioni migliori sulla gestione del tuo centro.
              </p>
              <p style={{ marginBottom: '22px' }}>
                Ogni numero ha una cosa sola da capire e, se vuoi, qualcosa da fare. Prezzi che reggono il margine. Clienti che tornano senza che tu debba rincorrerle. Dipendenti che rendono. L&apos;agenda che non si svuota a metà settimana. Un pezzo alla volta — quello più urgente per chi gestisce un centro adesso.
              </p>
              <p style={{ marginBottom: '22px' }}>
                La ricerca la facciamo noi: mercato italiano, cosa stanno provando i centri che funzionano, cosa arriva dall&apos;estero e vale la pena guardare. Il nostro lavoro è trovare quello che è rilevante — e togliere tutto il resto.
              </p>
              <p style={{
                fontFamily: "'Playfair Display', Georgia, serif",
                fontStyle: 'italic',
                fontSize: 'clamp(16px, 2vw, 20px)',
                color: '#EC4899',
                borderLeft: '3px solid #EC4899',
                paddingLeft: '20px',
                lineHeight: 1.6,
              }}>
                Non è informazione. È consulenza — due volte a settimana, dieci minuti, gratis.
              </p>
            </div>
          </div>
        </section>

        {/* ── SEZIONE 3: COSA SUCCEDE QUANDO TI ISCRIVI ── */}
        <section style={{ background: '#faf7f2', padding: '72px 32px' }}>
          <div style={{ maxWidth: '760px', margin: '0 auto' }}>
            <h2 style={{
              fontFamily: "'Playfair Display', Georgia, serif",
              fontSize: 'clamp(24px, 3.5vw, 38px)',
              fontWeight: 700,
              color: '#1a1a0f',
              marginBottom: '36px',
              lineHeight: 1.2,
            }}>
              Cosa succede quando ti iscrivi
            </h2>

            <div style={{ fontSize: 'clamp(15px, 1.8vw, 17px)', color: '#555', lineHeight: 1.85 }}>
              <p style={{ marginBottom: '22px' }}>
                Prima di tutto: nella tua casella arriva subito la miniguida <em>&ldquo;10 errori che (quasi) tutte facciamo&rdquo;</em>. Non dopo qualche giorno, non alla prossima settimana — subito.
              </p>
              <p style={{ marginBottom: '22px' }}>
                Poi inizia la newsletter — ogni martedì e venerdì mattina, prima di aprire. Non le ultime news del settore: un aspetto della gestione che puoi guardare in modo diverso, spiegato in modo che arrivi subito. Quello che potresti provare già questa settimana. Quello che le tue colleghe in altri centri stanno già facendo. Quello che vale la pena sapere adesso — non in generale.
              </p>
              <p>
                Una volta al mese, però, hai qualcosa che non trovi da nessun&apos;altra parte: puoi scrivere direttamente a un consulente del settore — una persona reale, non un bot, non un template — e ricevere una risposta pensata per te. Non per i centri estetici in generale: per il tuo centro, con le domande che hai tu. Prezzi, agenda, la cliente che non torna, quel servizio che non si vende mai come vorresti — una di quelle cose che pesano ogni settimana e che non sai bene a chi chiedere. Una domanda al mese, compresa nell&apos;iscrizione gratuita.
              </p>
            </div>
          </div>
        </section>

        {/* ── SEZIONE 3.5: NUMERI PASSATI ── */}
        {articles.length > 0 && (
          <section style={{ background: '#f5f1ea', padding: '72px 32px' }}>
            <div style={{ maxWidth: '1040px', margin: '0 auto' }}>
              <h2 style={{
                fontFamily: "'Playfair Display', Georgia, serif",
                fontSize: 'clamp(24px, 3.5vw, 38px)',
                fontWeight: 700,
                color: '#1a1a0f',
                marginBottom: '12px',
                lineHeight: 1.2,
              }}>
                Intanto, leggi cosa ti sei persa
              </h2>
              <p style={{ fontSize: 'clamp(15px, 1.8vw, 17px)', color: '#666', lineHeight: 1.7, marginBottom: '40px', maxWidth: '640px' }}>
                Alcuni numeri già usciti. Iscriviti per riceverli tutti — due volte a settimana, la mattina.
              </p>

              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))', gap: '20px' }}>
                {articles.map((a) => (
                  <button
                    key={a.id}
                    className="bx-card"
                    onClick={() => setActiveArticle(a)}
                    style={{
                      textAlign: 'left',
                      background: '#fff',
                      border: '1px solid #e7e0d5',
                      borderRadius: '14px',
                      padding: '24px',
                      cursor: 'pointer',
                      transition: 'transform 0.18s ease, box-shadow 0.18s ease',
                      display: 'flex',
                      flexDirection: 'column',
                      gap: '12px',
                      fontFamily: "'Inter', sans-serif",
                    }}
                  >
                    {a.categoria && (
                      <span style={{
                        alignSelf: 'flex-start',
                        fontSize: '11px',
                        fontWeight: 700,
                        letterSpacing: '0.06em',
                        textTransform: 'uppercase',
                        color: '#EC4899',
                        background: 'rgba(236,72,153,0.08)',
                        padding: '4px 10px',
                        borderRadius: '999px',
                      }}>
                        {a.categoria}
                      </span>
                    )}
                    <h3 style={{
                      fontFamily: "'Playfair Display', Georgia, serif",
                      fontSize: '19px',
                      fontWeight: 700,
                      color: '#1a1a0f',
                      lineHeight: 1.3,
                    }}>
                      {a.titolo}
                    </h3>
                    {a.excerpt && (
                      <p style={{ fontSize: '14px', color: '#666', lineHeight: 1.6 }}>{a.excerpt}</p>
                    )}
                    <span style={{ marginTop: 'auto', fontSize: '14px', fontWeight: 700, color: '#1a1a0f' }}>
                      Leggi &rarr;
                    </span>
                  </button>
                ))}
              </div>
            </div>
          </section>
        )}

        {/* ── SEZIONE 4: FORM DI ISCRIZIONE ── */}
        <section id="form-section" style={{ background: '#0d1b2a', padding: '72px 32px' }}>
          <div style={{ maxWidth: '600px', margin: '0 auto', textAlign: 'center' }}>
            <h2 style={{
              fontFamily: "'Playfair Display', Georgia, serif",
              fontSize: 'clamp(26px, 4vw, 42px)',
              fontWeight: 900,
              color: '#fff',
              marginBottom: '12px',
              lineHeight: 1.15,
            }}>
              Inizia adesso — è gratis
            </h2>

            <p style={{ fontSize: '15px', color: '#8899aa', marginBottom: '32px' }}>
              Niente spam. Niente corsi da comprare. Solo quello che serve.
            </p>

            {/* [X iscritti] — placeholder social proof, da visualizzare solo dopo conferma numero reale */}
            {/* <p style={{ fontSize: '13px', color: '#8899aa', marginBottom: '24px' }}>Già [X iscritti] titolari si aggiornano ogni settimana con Beautyx.</p> */}

            {status === 'success' ? (
              <div style={{
                background: 'rgba(255,255,255,0.06)',
                border: '1.5px solid rgba(255,255,255,0.12)',
                borderRadius: '16px',
                padding: '36px 28px',
                textAlign: 'center',
              }}>
                <div style={{ fontSize: '36px', marginBottom: '14px' }}>✓</div>
                <h3 style={{ fontFamily: "'Playfair Display', serif", fontSize: '22px', marginBottom: '10px', color: '#fff' }}>
                  Sei dentro!
                </h3>
                <p style={{ color: '#8899aa', fontSize: '15px', lineHeight: 1.7 }}>
                  Controlla la tua email — la miniguida gratuita è già in arrivo.
                  La newsletter inizia subito, due volte a settimana.
                </p>
              </div>
            ) : (
              <form onSubmit={handleSubmit} style={{ maxWidth: '520px', margin: '0 auto' }}>
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
                  gap: '12px',
                }}>
                  <input
                    type="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder="la-tua@email.it"
                    required
                    style={{
                      padding: '16px 20px',
                      border: '1.5px solid rgba(255,255,255,0.15)',
                      borderRadius: '10px',
                      background: 'rgba(255,255,255,0.06)',
                      fontSize: '16px',
                      outline: 'none',
                      color: '#fff',
                      fontFamily: "'Inter', sans-serif",
                      width: '100%',
                    }}
                  />
                  <button
                    type="submit"
                    disabled={status === 'loading'}
                    style={{
                      padding: '16px 24px',
                      background: '#EC4899',
                      color: '#fff',
                      fontWeight: 700,
                      border: 'none',
                      borderRadius: '10px',
                      cursor: status === 'loading' ? 'not-allowed' : 'pointer',
                      fontSize: '16px',
                      opacity: status === 'loading' ? 0.6 : 1,
                      fontFamily: "'Inter', sans-serif",
                      width: '100%',
                      letterSpacing: '0.01em',
                    }}
                  >
                    {status === 'loading' ? 'Iscrizione in corso...' : 'Iscriviti e scarica la miniguida →'}
                  </button>
                </div>
                {status === 'error' && (
                  <p style={{ marginTop: '10px', color: '#ff6b6b', fontSize: '13px' }}>{errorMsg}</p>
                )}
                <p style={{ marginTop: '14px', fontSize: '13px', color: '#55667a', lineHeight: 1.6 }}>
                  Ricevi subito la miniguida in email, poi la newsletter due volte a settimana.{' '}
                  Puoi disiscriverti quando vuoi.
                </p>
                <p style={{ marginTop: '10px', fontSize: '11px', color: '#3d4f60', lineHeight: 1.65 }}>
                  Iscrivendoti accetti il trattamento dei tuoi dati per ricevere la newsletter Beautyx. Usiamo Beehiiv e Supabase per gestire invii e contenuti. I tuoi dati non vengono mai venduti a terzi.{' '}
                  <Link href="/privacy" style={{ color: '#55667a', textDecoration: 'underline' }}>Privacy policy</Link>.
                </p>
              </form>
            )}
          </div>
        </section>

        {/* ── SEZIONE 5: FAQ ── */}
        <section style={{ background: '#f5f1ea', padding: '72px 32px' }}>
          <div style={{ maxWidth: '720px', margin: '0 auto' }}>
            <h2 style={{
              fontFamily: "'Playfair Display', Georgia, serif",
              fontSize: 'clamp(24px, 3.5vw, 36px)',
              fontWeight: 700,
              color: '#1a1a0f',
              marginBottom: '48px',
              lineHeight: 1.2,
            }}>
              Hai domande? Ci siamo già passate.
            </h2>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '32px' }}>
              {faqs.map((faq, i) => (
                <div
                  key={i}
                  style={{
                    borderTop: '1px solid #ddd',
                    paddingTop: '28px',
                  }}
                >
                  <h3 style={{
                    fontWeight: 700,
                    fontSize: 'clamp(15px, 1.8vw, 17px)',
                    color: '#1a1a0f',
                    marginBottom: '12px',
                    lineHeight: 1.4,
                  }}>
                    {faq.domanda}
                  </h3>
                  <p style={{
                    fontSize: 'clamp(14px, 1.6vw, 16px)',
                    color: '#666',
                    lineHeight: 1.75,
                  }}>
                    {faq.risposta}
                  </p>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* ── SEZIONE 6: CHIUSURA ── */}
        <section style={{ background: '#1a1a0f', padding: '80px 32px', textAlign: 'center' }}>
          <div style={{ maxWidth: '600px', margin: '0 auto' }}>
            <p style={{
              fontFamily: "'Playfair Display', Georgia, serif",
              fontSize: 'clamp(22px, 3.5vw, 34px)',
              fontWeight: 700,
              fontStyle: 'italic',
              color: '#fff',
              lineHeight: 1.35,
              marginBottom: '36px',
            }}>
              Hai aperto il tuo centro. Adesso è ora di imparare a gestirlo — davvero.
            </p>
            <a
              href="#form-section"
              style={{
                display: 'inline-block',
                background: '#EC4899',
                color: '#fff',
                padding: '18px 40px',
                borderRadius: '10px',
                fontWeight: 700,
                fontSize: '16px',
                textDecoration: 'none',
                letterSpacing: '0.01em',
              }}
            >
              Iscriviti gratis →
            </a>
          </div>
        </section>

        {/* ── FOOTER ── */}
        <footer style={{ background: '#111', borderTop: '1px solid rgba(255,255,255,0.05)', padding: '24px 32px', textAlign: 'center' }}>
          <p style={{ fontSize: '12px', color: '#555' }}>
            © 2025 Beautyx ·{' '}
            <Link href="/privacy" style={{ color: '#666', textDecoration: 'none' }}>Privacy</Link>
            {' · '}
            <Link href="/login" style={{ color: '#666', textDecoration: 'none' }}>Accedi al gestionale</Link>
          </p>
        </footer>

        {/* ── MODALE LETTURA ARTICOLO ── */}
        {activeArticle && (
          <div
            onClick={() => setActiveArticle(null)}
            style={{
              position: 'fixed',
              inset: 0,
              background: 'rgba(15,15,10,0.6)',
              display: 'flex',
              alignItems: 'flex-start',
              justifyContent: 'center',
              padding: '32px 16px',
              overflowY: 'auto',
              zIndex: 1000,
            }}
          >
            <article
              onClick={(e) => e.stopPropagation()}
              style={{
                position: 'relative',
                background: '#fff',
                maxWidth: '720px',
                width: '100%',
                borderRadius: '16px',
                padding: 'clamp(28px, 5vw, 56px)',
                margin: 'auto',
                boxShadow: '0 24px 60px rgba(0,0,0,0.3)',
              }}
            >
              <button
                onClick={() => setActiveArticle(null)}
                aria-label="Chiudi"
                style={{
                  position: 'absolute',
                  top: '16px',
                  right: '16px',
                  width: '38px',
                  height: '38px',
                  borderRadius: '50%',
                  border: 'none',
                  background: '#f5f1ea',
                  color: '#1a1a0f',
                  fontSize: '22px',
                  lineHeight: 1,
                  cursor: 'pointer',
                }}
              >
                &times;
              </button>

              {activeArticle.categoria && (
                <span style={{
                  display: 'inline-block',
                  fontSize: '11px',
                  fontWeight: 700,
                  letterSpacing: '0.06em',
                  textTransform: 'uppercase',
                  color: '#EC4899',
                  background: 'rgba(236,72,153,0.08)',
                  padding: '4px 10px',
                  borderRadius: '999px',
                  marginBottom: '16px',
                }}>
                  {activeArticle.categoria}
                </span>
              )}

              <h2 style={{
                fontFamily: "'Playfair Display', Georgia, serif",
                fontSize: 'clamp(24px, 4vw, 34px)',
                fontWeight: 900,
                color: '#1a1a0f',
                lineHeight: 1.2,
                marginBottom: '24px',
              }}>
                {activeArticle.titolo}
              </h2>

              <div className="bx-article" dangerouslySetInnerHTML={{ __html: activeArticle.contenuto || '' }} />

              <div style={{ marginTop: '40px', paddingTop: '28px', borderTop: '1px solid #e7e0d5', textAlign: 'center' }}>
                <p style={{ fontSize: '15px', color: '#666', marginBottom: '16px' }}>
                  Ti è stato utile? Ricevi ogni numero nella tua email.
                </p>
                <a
                  href="#form-section"
                  onClick={() => setActiveArticle(null)}
                  style={{
                    display: 'inline-block',
                    background: '#EC4899',
                    color: '#fff',
                    padding: '14px 28px',
                    borderRadius: '10px',
                    fontWeight: 700,
                    fontSize: '15px',
                    textDecoration: 'none',
                  }}
                >
                  Iscriviti gratis &rarr;
                </a>
              </div>
            </article>
          </div>
        )}

      </div>
    </>
  )
}
