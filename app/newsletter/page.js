'use client'

import { useState } from 'react'
import Link from 'next/link'
import Image from 'next/image'

const argomenti = [
  {
    emoji: '💰',
    titolo: 'I soldi',
    descrizione: "L'AI scansiona dati di pricing, margini e modelli di revenue da centinaia di centri reali. Ogni settimana estraiamo i pattern che funzionano — e quelli che fanno perdere soldi senza che te ne accorga.",
  },
  {
    emoji: '👥',
    titolo: 'Le persone',
    descrizione: "Clienti che spariscono, personale che logora, conflitti che drenano. L'AI monitora i pattern ricorrenti di chi ce la fa e di chi no — così impari prima come gestire il lato umano che spesso fa tutta la differenza.",
  },
  {
    emoji: '⚙️',
    titolo: 'Il metodo',
    descrizione: "Come rendere il centro a tua immagine e somiglianza con il metodo dei 4 elementi SvetAge. L'AI ci aiuta a identificare dove il metodo funziona davvero — e dove invece si crea squilibrio senza che lo si veda.",
  },
  {
    emoji: '🌍',
    titolo: 'Il mercato',
    descrizione: "L'AI scansiona trend internazionali, centri all'estero, innovazioni del settore. Quello che arriverà in Italia tra 6-12 mesi — lo vedi prima e hai tempo per adattarti.",
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
      `}</style>

      <div style={{ background: '#f5f1ea', minHeight: '100vh', fontFamily: "'Inter', system-ui, sans-serif", color: '#1a1a0f' }}>

        {/* ── NAV ── */}
        <header style={{ padding: '20px 32px', display: 'flex', alignItems: 'center', justifyContent: 'space-between', maxWidth: '1100px', margin: '0 auto' }}>
          <Link href="/" style={{ display: 'flex', alignItems: 'center', gap: '10px', textDecoration: 'none' }}>
            <Image src="/logo_beautyx-oro.png" alt="Beautyx" width={32} height={32} style={{ borderRadius: '4px' }} />
            <span style={{ fontWeight: 700, color: '#1a1a0f', fontSize: '16px' }}>Beautyx</span>
          </Link>
          <a
            href="#iscriviti"
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

        {/* ── HERO ── */}
        <section style={{ maxWidth: '860px', margin: '0 auto', padding: '56px 32px 0' }}>

          {/* Soprattitolo */}
          <p style={{
            fontSize: '11px',
            fontWeight: 700,
            letterSpacing: '0.13em',
            textTransform: 'uppercase',
            color: '#999',
            marginBottom: '28px',
          }}>
            Il lato dell&apos;estetica che nessuna scuola insegna.
          </p>

          {/* Headline 3 righe */}
          <h1 style={{ fontFamily: "'Playfair Display', Georgia, serif", lineHeight: 1.05, marginBottom: '30px' }}>
            <span style={{ display: 'block', fontSize: 'clamp(42px, 7vw, 82px)', fontWeight: 900, color: '#1a1a0f' }}>
              Smetti di lavorare
            </span>
            <span style={{ display: 'block', fontSize: 'clamp(42px, 7vw, 82px)', fontWeight: 700, fontStyle: 'italic', color: '#EC4899' }}>
              di più.
            </span>
            <span style={{ display: 'block', fontSize: 'clamp(42px, 7vw, 82px)', fontWeight: 900, color: '#1a1a0f' }}>
              Inizia a guadagnare{' '}
              <span style={{ background: '#FFE44D', padding: '2px 6px', borderRadius: '3px' }}>meglio.</span>
            </span>
          </h1>

          {/* Sottotitolo italic */}
          <p style={{
            fontSize: '19px',
            fontStyle: 'italic',
            fontFamily: "'Playfair Display', Georgia, serif",
            color: '#555',
            lineHeight: 1.65,
            marginBottom: '14px',
            maxWidth: '640px',
          }}>
            Ogni settimana pochi minuti, un sistema diretto senza fronzoli inutili.
            Roba da usare subito per guardare con serenità al proprio futuro.
          </p>
          <p style={{ fontSize: '15px', color: '#777', marginBottom: '36px' }}>
            Ogni martedì, <strong style={{ color: '#1a1a0f' }}>centinaia di titolari</strong> la aprono col caffè.
          </p>

          {/* ── FORM ── */}
          <div id="iscriviti">
            {status === 'success' ? (
              <div style={{
                background: '#fff',
                border: '2.5px solid #1a1a0f',
                borderRadius: '16px',
                padding: '32px',
                maxWidth: '540px',
                textAlign: 'center',
              }}>
                <div style={{ fontSize: '36px', marginBottom: '12px' }}>🎉</div>
                <h3 style={{ fontFamily: "'Playfair Display', serif", fontSize: '22px', marginBottom: '8px', color: '#1a1a0f' }}>Sei dentro!</h3>
                <p style={{ color: '#666', fontSize: '15px', lineHeight: 1.65 }}>
                  Controlla la tua email — ti abbiamo inviato la miniguida gratuita e il messaggio di benvenuto.
                  La prima newsletter arriva martedì.
                </p>
              </div>
            ) : (
              <form onSubmit={handleSubmit} style={{ maxWidth: '540px' }}>
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
                  border: '2.5px solid #1a1a0f',
                  borderRadius: '12px',
                  overflow: 'hidden',
                  background: '#fff',
                }}>
                  <input
                    type="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder="la-tua@email.it"
                    required
                    style={{
                      flex: 1,
                      padding: '16px 20px',
                      border: 'none',
                      background: 'transparent',
                      fontSize: '16px',
                      outline: 'none',
                      color: '#1a1a0f',
                      fontFamily: "'Inter', sans-serif",
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
                      cursor: status === 'loading' ? 'not-allowed' : 'pointer',
                      fontSize: '15px',
                      whiteSpace: 'nowrap',
                      opacity: status === 'loading' ? 0.6 : 1,
                      fontFamily: "'Inter', sans-serif",
                    }}
                  >
                    {status === 'loading' ? 'Iscrizione...' : 'Sì, mi iscrivo →'}
                  </button>
                </div>
                {status === 'error' && (
                  <p style={{ marginTop: '8px', color: '#c00', fontSize: '13px' }}>{errorMsg}</p>
                )}
                <p style={{ marginTop: '10px', fontSize: '12px', color: '#aaa' }}>
                  Accetto la{' '}
                  <Link href="/privacy" style={{ color: '#aaa', textDecoration: 'underline' }}>Privacy Policy</Link>
                  {' '}e il trattamento dati. Cancellabile in un click.
                </p>
              </form>
            )}
          </div>

          {/* 3 micro-check */}
          <div style={{ display: 'flex', gap: '28px', marginTop: '18px', flexWrap: 'wrap' }}>
            {['✓ Gratis, per sempre', '✓ Ti cancelli in 1 click', '✓ 5 minuti a settimana'].map(t => (
              <span key={t} style={{ fontSize: '13px', color: '#888' }}>{t}</span>
            ))}
          </div>
        </section>

        {/* ── SEPARATOR ── */}
        <div style={{ maxWidth: '860px', margin: '60px auto 0', padding: '0 32px' }}>
          <hr style={{ border: 'none', borderTop: '1px solid #ddd' }} />
        </div>

        {/* ── 3 BENEFITS ── */}
        <section style={{ maxWidth: '860px', margin: '0 auto', padding: '48px 32px 60px' }}>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '28px' }}>
            {[
              { emoji: '⏱', title: 'Risparmi tempo', desc: 'Solo quello che puoi applicare lunedì mattina. Niente teoria da convegno.' },
              { emoji: '💰', title: 'Guadagni di più', desc: 'I numeri, i prezzi, i margini. Come fare in modo che il centro renda davvero.' },
              { emoji: '📚', title: 'Gli errori degli altri li paghi gratis', desc: "L'AI di Beautyx va a caccia ogni settimana di errori reali commessi da centri estetici in Italia e all'estero. Li analizziamo insieme e sviluppiamo la soluzione migliore — tu impari gratis da quello che agli altri è costato caro." },
              { emoji: '👑', title: 'Lavori da imprenditrice', desc: 'Non da dipendente di te stessa. Sistemi per smettere di correre senza avanzare.' },
            ].map(b => (
              <div key={b.title}>
                <div style={{ fontSize: '26px', marginBottom: '10px' }}>{b.emoji}</div>
                <h3 style={{ fontWeight: 700, fontSize: '15px', marginBottom: '8px', color: '#1a1a0f' }}>{b.title}</h3>
                <p style={{ fontSize: '14px', color: '#888', lineHeight: 1.65 }}>{b.desc}</p>
              </div>
            ))}
          </div>
          <p style={{
            textAlign: 'center',
            marginTop: '44px',
            fontSize: '14px',
            fontStyle: 'italic',
            color: '#bbb',
            fontFamily: "'Playfair Display', serif",
          }}>
            ✨ Ogni settimana peschiamo da queste aree, così non ti perdi nulla. ✨
          </p>
        </section>

        {/* ── COME FUNZIONA ── */}
        <section style={{ maxWidth: '860px', margin: '0 auto', padding: '0 32px 64px' }}>
          <div style={{ borderTop: '1px solid #e5e0d8', paddingTop: '52px' }}>
            <p style={{
              fontSize: '11px',
              fontWeight: 700,
              letterSpacing: '0.13em',
              textTransform: 'uppercase',
              color: '#bbb',
              marginBottom: '32px',
              textAlign: 'center',
            }}>
              Come funziona
            </p>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: '36px' }}>
              {[
                {
                  emoji: '🤖',
                  step: '01',
                  title: "L'AI monitora",
                  desc: "Ogni settimana scansiona centinaia di fonti: centri reali, dati di settore, casi internazionali. Cerca errori, pattern, opportunità — senza sosta.",
                },
                {
                  emoji: '🔍',
                  step: '02',
                  title: 'Analizziamo insieme',
                  desc: "Selezioniamo quello che conta davvero per il tuo centro. Lo smontiamo, lo spieghiamo e sviluppiamo insieme la soluzione migliore.",
                },
                {
                  emoji: '📬',
                  step: '03',
                  title: 'Tu applichi',
                  desc: "Ogni martedì trovi in casella solo ciò che puoi usare subito. Niente ricerca, niente filtri, niente perdite di tempo.",
                },
              ].map(s => (
                <div key={s.step} style={{ display: 'flex', gap: '16px', alignItems: 'flex-start' }}>
                  <div style={{ fontSize: '26px', flexShrink: 0, marginTop: '2px' }}>{s.emoji}</div>
                  <div>
                    <p style={{ fontSize: '10px', fontWeight: 700, letterSpacing: '0.1em', color: '#EC4899', marginBottom: '5px' }}>
                      STEP {s.step}
                    </p>
                    <h3 style={{ fontWeight: 700, fontSize: '15px', color: '#1a1a0f', marginBottom: '7px' }}>{s.title}</h3>
                    <p style={{ fontSize: '13px', color: '#888', lineHeight: 1.7 }}>{s.desc}</p>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* ── DARK SECTION — Argomenti ── */}
        <section style={{ background: '#1a1a0f', padding: '64px 32px' }}>
          <div style={{ maxWidth: '860px', margin: '0 auto' }}>
            <h2 style={{
              fontFamily: "'Playfair Display', serif",
              fontSize: '28px',
              fontWeight: 700,
              color: '#fff',
              marginBottom: '40px',
              textAlign: 'center',
            }}>
              Cosa trovi ogni martedì
            </h2>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: '20px' }}>
              {argomenti.map((a, i) => (
                <div
                  key={i}
                  style={{
                    background: 'rgba(255,255,255,0.04)',
                    border: '1px solid rgba(255,255,255,0.08)',
                    borderRadius: '14px',
                    padding: '28px',
                  }}
                >
                  <div style={{ fontSize: '26px', marginBottom: '10px' }}>{a.emoji}</div>
                  <h3 style={{ fontWeight: 700, fontSize: '14px', color: '#f1f1f1', marginBottom: '8px', lineHeight: 1.4 }}>{a.titolo}</h3>
                  <p style={{ fontSize: '13px', color: '#777', lineHeight: 1.65 }}>{a.descrizione}</p>
                </div>
              ))}
            </div>
            <p style={{
              textAlign: 'center',
              marginTop: '36px',
              fontSize: '13px',
              fontStyle: 'italic',
              color: '#444',
              fontFamily: "'Playfair Display', serif",
            }}>
              ← il cuore della newsletter
            </p>
          </div>
        </section>

        {/* ── CHI È BEAUTYX ── */}
        <section style={{ background: '#faf7f2', padding: '80px 32px' }}>
          <div style={{ maxWidth: '700px', margin: '0 auto' }}>

            {/* Logo + label */}
            <div style={{ display: 'flex', alignItems: 'center', gap: '14px', marginBottom: '36px' }}>
              <Image src="/logo_beautyx-oro.png" alt="Beautyx" width={40} height={40} style={{ borderRadius: '8px' }} />
              <p style={{ fontSize: '11px', fontWeight: 700, letterSpacing: '0.13em', textTransform: 'uppercase', color: '#bbb' }}>
                Ma cos&apos;è esattamente Beautyx?
              </p>
            </div>

            {/* Headline */}
            <h2 style={{
              fontFamily: "'Playfair Display', serif",
              fontSize: 'clamp(28px, 4vw, 42px)',
              fontWeight: 900,
              color: '#1a1a0f',
              lineHeight: 1.2,
              marginBottom: '32px',
            }}>
              Un team di agenti AI<br />
              <span style={{ fontStyle: 'italic', color: '#EC4899' }}>con un cuore umano.</span>
            </h2>

            {/* Corpo */}
            <div style={{ fontSize: '17px', color: '#555', lineHeight: 1.85 }}>
              <p style={{ marginBottom: '22px' }}>
                Non l&apos;ennesima newsletter scritta da qualcuno che ha letto troppi libri di business. Beautyx è qualcosa di diverso: un progetto che ridisegna il modo di lavorare nel mondo dell&apos;estetica. Una strategia gestionale spiegata in modo semplice, personalizzata su chi sei tu e su come funziona davvero il tuo centro — non su come funziona in teoria.
              </p>
              <p style={{ marginBottom: '22px' }}>
                Dietro ogni numero ci sono agenti AI che lavorano in parallelo — analizzano dati, scovano errori, monitorano trend internazionali — e persone che trasformano tutto questo in qualcosa che puoi usare il lunedì mattina. Trovi il metodo. Trovi le novità del settore prima che diventino problemi. E trovi la possibilità di interagire davvero: raccontare la tua difficoltà concreta — quella vera, quella che non racconti in pubblico — e costruire insieme la soluzione migliore.
              </p>
              <p style={{ marginBottom: '32px' }}>
                Iscrivendoti, non ottieni solo una newsletter. Ottieni un team — AI e umano — con un obiettivo solo. Perché qui nessuno finge che il lavoro sia &quot;solo lavoro&quot;: sappiamo benissimo che quando le cose non girano al centro, non restano al centro. Si portano a casa, si portano a letto, si portano ovunque.
              </p>

              {/* Frase chiave */}
              <div style={{
                borderLeft: '3px solid #EC4899',
                paddingLeft: '24px',
                marginBottom: '8px',
              }}>
                <p style={{
                  fontFamily: "'Playfair Display', serif",
                  fontStyle: 'italic',
                  fontSize: '20px',
                  color: '#1a1a0f',
                  lineHeight: 1.6,
                }}>
                  Beautyx esiste per fare in modo che questo succeda il meno possibile. Il tuo successo, nella sua forma più vera, si chiama così: <strong style={{ fontStyle: 'normal' }}>serenità</strong>.
                </p>
              </div>
            </div>
          </div>
        </section>


        {/* ── CHI È BEAUTYX ── */}
        <section style={{ background: '#faf7f2', padding: '80px 32px' }}>
          <div style={{ maxWidth: '700px', margin: '0 auto' }}>

            {/* Logo + label */}
            <div style={{ display: 'flex', alignItems: 'center', gap: '14px', marginBottom: '36px' }}>
              <Image src="/logo_beautyx-oro.png" alt="Beautyx" width={40} height={40} style={{ borderRadius: '8px' }} />
              <p style={{ fontSize: '11px', fontWeight: 700, letterSpacing: '0.13em', textTransform: 'uppercase', color: '#bbb' }}>
                Ma cos&apos;è esattamente Beautyx?
              </p>
            </div>

            {/* Headline */}
            <h2 style={{
              fontFamily: "'Playfair Display', serif",
              fontSize: 'clamp(28px, 4vw, 42px)',
              fontWeight: 900,
              color: '#1a1a0f',
              lineHeight: 1.2,
              marginBottom: '32px',
            }}>
              Un team di agenti AI<br />
              <span style={{ fontStyle: 'italic', color: '#EC4899' }}>con un cuore umano.</span>
            </h2>

            {/* Corpo */}
            <div style={{ fontSize: '17px', color: '#555', lineHeight: 1.85 }}>
              <p style={{ marginBottom: '22px' }}>
                Non l&apos;ennesima newsletter scritta da qualcuno che ha letto troppi libri di business. Beautyx è qualcosa di diverso: un progetto che ridisegna il modo di lavorare nel mondo dell&apos;estetica. Una strategia gestionale spiegata in modo semplice, personalizzata su chi sei tu e su come funziona davvero il tuo centro — non su come funziona in teoria.
              </p>
              <p style={{ marginBottom: '22px' }}>
                Dietro ogni numero ci sono agenti AI che lavorano in parallelo — analizzano dati, scovano errori, monitorano trend internazionali — e persone che trasformano tutto questo in qualcosa che puoi usare il lunedì mattina. Trovi il metodo. Trovi le novità del settore prima che diventino problemi. E trovi la possibilità di interagire davvero: raccontare la tua difficoltà concreta — quella vera, quella che non racconti in pubblico — e costruire insieme la soluzione migliore.
              </p>
              <p style={{ marginBottom: '32px' }}>
                Iscrivendoti, non ottieni solo una newsletter. Ottieni un team — AI e umano — con un obiettivo solo. Perché qui nessuno finge che il lavoro sia &quot;solo lavoro&quot;: sappiamo benissimo che quando le cose non girano al centro, non restano al centro. Si portano a casa, si portano a letto, si portano ovunque.
              </p>

              {/* Frase chiave */}
              <div style={{
                borderLeft: '3px solid #EC4899',
                paddingLeft: '24px',
                marginBottom: '8px',
              }}>
                <p style={{
                  fontFamily: "'Playfair Display', serif",
                  fontStyle: 'italic',
                  fontSize: '20px',
                  color: '#1a1a0f',
                  lineHeight: 1.6,
                }}>
                  Beautyx esiste per fare in modo che questo succeda il meno possibile. Il tuo successo, nella sua forma più vera, si chiama così: <strong style={{ fontStyle: 'normal' }}>serenità</strong>.
                </p>
              </div>
            </div>
          </div>
        </section>

        {/* ── FINAL CTA ── */}
        <section style={{ background: '#1a1a0f', padding: '72px 32px', textAlign: 'center' }}>
          <div style={{ maxWidth: '600px', margin: '0 auto' }}>
            <h2 style={{
              fontFamily: "'Playfair Display', serif",
              fontSize: 'clamp(26px, 5vw, 44px)',
              fontWeight: 900,
              color: '#fff',
              marginBottom: '24px',
              lineHeight: 1.2,
            }}>
              Pronta a guardare il tuo centro<br />
              <span style={{ color: '#EC4899', fontStyle: 'italic' }}>con occhi diversi?</span>
            </h2>
            {status !== 'success' && (
              <form onSubmit={handleSubmit} style={{ maxWidth: '480px', margin: '0 auto' }}>
                <input
                  type="text"
                  name="website"
                  value={website}
                  onChange={e => setWebsite(e.target.value)}
                  style={{ position: 'absolute', left: '-9999px', opacity: 0, height: 0 }}
                  tabIndex={-1}
                  autoComplete="off"
                  aria-hidden="true"
                />
                <div style={{ display: 'flex', border: '2px solid rgba(255,255,255,0.2)', borderRadius: '12px', overflow: 'hidden', background: '#fff' }}>
                  <input
                    type="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder="la-tua@email.it"
                    required
                    style={{ flex: 1, padding: '16px 20px', border: 'none', background: 'transparent', fontSize: '16px', outline: 'none', color: '#1a1a0f' }}
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
                      cursor: status === 'loading' ? 'not-allowed' : 'pointer',
                      fontSize: '15px',
                      whiteSpace: 'nowrap',
                      opacity: status === 'loading' ? 0.6 : 1,
                    }}
                  >
                    {status === 'loading' ? 'Iscrizione...' : 'Iscriviti gratis →'}
                  </button>
                </div>
                <p style={{ marginTop: '10px', fontSize: '12px', color: '#555' }}>
                  Gratis. Disiscriviti in 1 click.
                </p>
              </form>
            )}
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
