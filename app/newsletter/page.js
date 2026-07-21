'use client'

import { useState } from 'react'
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
            Non sai cosa sta funzionando adesso nei centri estetici italiani.{' '}
            <span style={{ fontStyle: 'italic', color: '#EC4899' }}>Noi sì.</span>
          </h1>

          <p style={{
            fontSize: 'clamp(16px, 2vw, 19px)',
            color: '#555',
            lineHeight: 1.75,
            marginBottom: '36px',
            maxWidth: '680px',
          }}>
            Beautyx è la newsletter bi-settimanale che ti porta quello che funziona davvero — non le teorie, non le tendenze TikTok, non i consigli che valgono per tutti e quindi non valgono per nessuno. Il mercato estetico italiano, monitorato ogni giorno, filtrato e sintetizzato per chi ha un centro da gestire.
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
              Come facciamo a sapere cosa funziona davvero?
            </h2>

            <div style={{ fontSize: 'clamp(15px, 1.8vw, 17px)', color: '#b0b0b0', lineHeight: 1.85 }}>
              <p style={{ marginBottom: '22px' }}>
                La maggior parte delle newsletter sull&apos;estetica è scritta da una persona. Con le sue opinioni, le sue esperienze, i suoi angoli ciechi. Noi abbiamo scelto un approccio diverso — e lo diciamo chiaramente, perché pensiamo che la trasparenza sia già un vantaggio competitivo.
              </p>
              <p style={{ marginBottom: '22px' }}>
                Un team di agenti AI lavora ogni giorno per scansionare il mercato estetico italiano: cosa stanno provando i centri, cosa si muove sul fronte della fidelizzazione, del pricing, dell&apos;offerta servizi. In parallelo, monitora le tendenze internazionali — così arrivi dove conta prima della tua concorrenza locale.
              </p>
              <p style={{ marginBottom: '22px' }}>
                Tutto quello che raccolgono viene filtrato, selezionato e scritto in modo che tu possa leggerlo in dieci minuti mentre aspetti tra un cliente e l&apos;altro.
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
                Non è l&apos;AI che prenota gli appuntamenti al posto tuo. È l&apos;AI che trova quello che funziona nel tuo tipo di mercato — e te lo mette davanti.
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
                Poi inizia la newsletter. Due volte a settimana, quello che conta sapere in questo periodo: non tutto, non il meglio del meglio, ma quello che è rilevante per il tuo centro <em>adesso</em>. Quello che le tue colleghe in altri centri stanno già provando. Quello che arriva dall&apos;estero e vale la pena guardare. Quello che potresti fare diversamente la settimana prossima.
              </p>
              <p>
                Una volta al mese, però, hai qualcosa che non trovi da nessun&apos;altra parte: puoi scrivere direttamente a un consulente del settore — una persona reale, non un bot, non un template — e ricevere una risposta pensata per te. Non per i centri estetici in generale: per il tuo centro, con le domande che hai tu. Prezzi, agenda, la cliente che non torna, quel servizio che non si vende mai come vorresti — una di quelle cose che pesano ogni settimana e che non sai bene a chi chiedere. Una domanda al mese, compresa nell&apos;iscrizione gratuita.
              </p>
            </div>
          </div>
        </section>

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
              Se gestisci un centro estetico e vuoi smettere di navigare a vista — il posto è qui.
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

      </div>
    </>
  )
}
