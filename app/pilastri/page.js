'use client'

// Pagina pubblica "vetrina 4 pilastri" — SEPARATA da /newsletter (task #205,
// vedi memory/generale.md, voce "Tool 'Listino intelligente' — 4° pilastro
// dell'ecosistema, architettura di lancio definitiva", nota aggiunta il
// 20/09/2026 su "Dove vive la vetrina 4 pilastri").
//
// Motivo per cui questa pagina esiste come landing a sé e non dentro
// /newsletter: /newsletter ha la regola permanente "CTA sull'Identikit CURA
// unica e massima per tutta la finestra dei 90gg" — un secondo blocco/CTA lì
// romperebbe quella priorità (segnalato da Federica/Chiara mentre scrivevano
// il copy del blocco Listino, deciso da Mason il 20/09/2026). /newsletter
// resta quindi INVARIATA: questa pagina mostra i 4 pilastri gratuiti/freemium
// di beautyx con PARI dignità visiva — Identikit strategico CURA (hero),
// Newsletter+Miniguida (un unico blocco, la miniguida non ha CTA propria,
// coerente con memory/voce-beautyx.md), Listino intelligente.
//
// Copy hero Identikit e CTA: riusa il testo già approvato da Elena su
// /newsletter (sezione id="report-cura", vedi app/newsletter/page.js) — stesso
// eyebrow/countdown/paragrafi, titolo nella versione più compatta indicata da
// Federica/Chiara per questa pagina (coerente con un hero che qui è seguito
// da altri due blocchi, non l'unico contenuto della pagina).
// Copy card Newsletter+Miniguida e Listino: copy definitivo di Federica,
// concept visivo di Chiara (task #202/#203), confermato da Mason il
// 20/09/2026 insieme alla decisione di dove costruire questa pagina.
//
// Countdown: stesso componente ReportCountdownBanner riusato da /newsletter e
// /report (nessuna logica duplicata) — stessa fonte lib/report/freeWindow.js.
//
// Iscrizione newsletter: stesso endpoint /api/newsletter/subscribe di
// /newsletter (stesso contratto: {email, website-honeypot} → {success,
// guidaToken?}), qui montato come form compatto dentro la card, non come link
// verso /newsletter — è la card stessa a essere il punto di iscrizione.

import { useState } from 'react'
import Link from 'next/link'
import Image from 'next/image'
import GuidaFooterLink from '@/components/common/GuidaFooterLink'
import ReportCountdownBanner from '@/components/common/ReportCountdownBanner'

// Teal per il pilastro Listino intelligente: stesso colore già assegnato al
// tool nello schema mappa-ecosistema-beautyx.html (classe .c-teal, stroke
// #0F6E56, gruppo "Listino intelligente" nel diagramma Livello 1) — non un
// colore nuovo inventato qui, riusa la tassonomia visiva già in uso
// nell'ecosistema per questo stesso strumento. Vicino anche al --plum
// (#1F6A4E) del tool stesso in app/listino/page.js (tema "Bosco" di default),
// così chi arriva da /listino a /pilastri (o viceversa) ritrova lo stesso
// accento cromatico.
const TEAL = '#0F6E56'
const TEAL_BG = 'rgba(15,110,86,0.08)'
const TEAL_BORDER = 'rgba(15,110,86,0.35)'
const PINK = '#EC4899'
const INK = '#1a1a0f'

function IconPriceTag() {
  // Icona lineare, niente foto stock — cartellino prezzo, stroke teal.
  return (
    <svg width="30" height="30" viewBox="0 0 24 24" fill="none" stroke={TEAL} strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <path d="M20.5 12.5 12 21l-9-9V4a2 2 0 0 1 2-2h8z" />
      <path d="M3 4v8" />
      <circle cx="7.5" cy="7.5" r="1.6" />
    </svg>
  )
}

function IconEnvelope() {
  // Icona lineare per il blocco Newsletter+Miniguida, stroke rosa (colore
  // brand primario, già in uso ovunque nel sito).
  return (
    <svg width="30" height="30" viewBox="0 0 24 24" fill="none" stroke={PINK} strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <rect x="2.5" y="5" width="19" height="14" rx="2.5" />
      <path d="m3 6.5 9 6.5 9-6.5" />
    </svg>
  )
}

export default function PilastriPage() {
  const [email, setEmail] = useState('')
  const [website, setWebsite] = useState('')
  const [status, setStatus] = useState('idle')
  const [errorMsg, setErrorMsg] = useState('')
  const [guidaToken, setGuidaToken] = useState(null)

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
        setGuidaToken(data.guidaToken || null)
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
      {/* Reset e classi tutte prefissate "bx-pil-" (nessuna generica tipo
          .card/.btn) per non collidere con le classi già in uso su altre
          pagine (bx-nl-*, bx-listino-*): questo <style> vive solo finché il
          componente resta montato — React lo rimuove dal DOM alla
          navigazione via client-side routing, stesso pattern già in uso su
          /newsletter, /report, /listino. */}
      <style>{`
        *, *::before, *::after { box-sizing: border-box; margin: 0; padding: 0; }
        html { scroll-behavior: smooth; }
        .bx-pil-accedi-link { transition: color 0.15s ease; }
        .bx-pil-accedi-link:hover, .bx-pil-accedi-link:focus-visible { color: #1a1a0f !important; }

        @keyframes bx-pil-cta-pulse {
          0%, 100% { box-shadow: 0 14px 36px rgba(236,72,153,0.5), 0 0 0 0 rgba(236,72,153,0); }
          50% { box-shadow: 0 14px 36px rgba(236,72,153,0.5), 0 0 0 8px rgba(236,72,153,0.28); }
        }
        .bx-pil-cta-pulse { animation: bx-pil-cta-pulse 2.6s ease-in-out infinite; transition: transform 0.15s ease; }
        .bx-pil-cta-pulse:hover, .bx-pil-cta-pulse:focus-visible { transform: translateY(-2px); }
        .bx-pil-cta-pulse:active { transform: scale(0.98); }
        @media (prefers-reduced-motion: reduce) {
          .bx-pil-cta-pulse { animation: none; }
        }

        .bx-pil-card { transition: transform 0.18s ease, box-shadow 0.18s ease; }
        .bx-pil-card:hover { transform: translateY(-3px); box-shadow: 0 20px 48px rgba(0,0,0,0.10); }

        .bx-pil-teal-btn { transition: background 0.15s ease, transform 0.1s ease, border-color 0.15s ease; }
        .bx-pil-teal-btn:hover, .bx-pil-teal-btn:focus-visible { background: ${TEAL_BG}; border-color: ${TEAL} !important; }
        .bx-pil-teal-btn:active { transform: scale(0.98); }

        .bx-pil-logo { left: 0; top: 0; width: 137px; height: 150px; filter: drop-shadow(0 2px 4px rgba(26,26,15,.55)); }
        .bx-pil-brandlink { padding-left: 164px; }
        .bx-pil-wordmark-img { height: 54px; width: auto; display: block; }

        @media (max-width: 480px) {
          .bx-pil-logo { width: 95px; height: 104px; top: 0; filter: drop-shadow(0 1.5px 3px rgba(26,26,15,.55)); }
          .bx-pil-brandlink { padding-left: 118px; }
          .bx-pil-wordmark-img { height: 42px; }
        }

        @media (max-width: 760px) {
          .bx-pil-cards { flex-direction: column !important; }
        }
      `}</style>

      <div className="bx-pil-page" style={{ background: '#f5f1ea', minHeight: '100vh', fontFamily: 'var(--font-inter), system-ui, sans-serif', color: INK }}>

        {/* ── NAV ── */}
        <header style={{ padding: '0 32px', height: '56px', display: 'flex', alignItems: 'center', justifyContent: 'space-between', maxWidth: '1100px', margin: '0 auto', position: 'relative', zIndex: 20 }}>
          <Link href="/" className="bx-pil-brandlink" style={{ display: 'flex', alignItems: 'center', textDecoration: 'none' }}>
            <Image src="/logo_beautyx-oro.png" alt="Beautyx" width={137} height={150} className="bx-pil-logo" style={{ position: 'absolute', borderRadius: '4px' }} />
            <Image src="/beautyx-wordmark.png" alt="Beautyx" width={220} height={151} className="bx-pil-wordmark-img" />
          </Link>
          {/* Nessun bottone CTA pieno nell'header, di proposito: questa pagina
              mostra 3 strumenti con pari dignità, un CTA d'header
              spingerebbe uno di loro sugli altri due (quel ruolo resta di
              /newsletter). Solo "Accedi" per chi ha già un account. */}
          <Link
            href="/login"
            className="bx-pil-accedi-link"
            style={{ color: 'rgba(26,26,15,0.55)', fontSize: '14px', fontWeight: 600, textDecoration: 'none' }}
          >
            Accedi
          </Link>
        </header>

        {/* ── INTRO BREVE ── */}
        <section style={{ padding: '28px 32px 0' }}>
          <div style={{ maxWidth: '760px', margin: '0 auto', textAlign: 'center' }}>
            <p style={{ fontSize: '11px', fontWeight: 700, letterSpacing: '0.12em', textTransform: 'uppercase', color: PINK, marginBottom: '10px' }}>
              4 strumenti gratuiti · beautyx
            </p>
            <h1 style={{ fontFamily: 'var(--font-playfair), Georgia, serif', fontSize: 'clamp(24px, 3.6vw, 36px)', fontWeight: 900, color: INK, lineHeight: 1.2 }}>
              Prova quello che ti serve oggi. Il resto, quando ti va.
            </h1>
          </div>
        </section>

        {/* ── HERO IDENTIKIT CURA ──
            Stesso stile bordeaux scuro già in uso su /newsletter per questo
            blocco (sezione id="report-cura"), stesso countdown 90gg
            (ReportCountdownBanner, riusato — nessuna logica duplicata).
            Titolo nella versione compatta indicata da Federica/Chiara per
            questa pagina; paragrafi ed eyebrow riusano il testo già
            approvato da Elena su /newsletter. */}
        <section
          id="identikit-hero"
          style={{
            position: 'relative',
            marginTop: '32px',
            background: 'linear-gradient(180deg, #2a1420 0%, #23111c 55%, #1f0f18 100%)',
            padding: '80px 32px 72px',
            borderTop: '10px solid #EC4899',
            borderBottom: '10px solid #EC4899',
            boxShadow: 'inset 0 24px 40px -32px rgba(0,0,0,0.6)',
            overflow: 'hidden',
          }}
        >
          <div style={{
            position: 'absolute', inset: 0,
            background: 'radial-gradient(circle at 50% 0%, rgba(236,72,153,0.26), transparent 60%)',
            pointerEvents: 'none',
          }} />
          <div style={{ position: 'relative', maxWidth: '760px', margin: '0 auto', textAlign: 'center' }}>
            <p style={{
              display: 'inline-flex', alignItems: 'center', gap: '8px',
              fontSize: '14px', fontWeight: 800, letterSpacing: '0.12em', textTransform: 'uppercase',
              color: '#1a1a0f', background: '#EC4899',
              padding: '10px 22px', borderRadius: '999px', marginBottom: '24px',
            }}>
              <span aria-hidden="true">★</span> Identikit strategico CURA — vale 60€, oggi gratis
            </p>
            <h2 style={{ fontFamily: 'var(--font-playfair), Georgia, serif', fontSize: 'clamp(26px, 3.8vw, 42px)', fontWeight: 900, color: '#fff', lineHeight: 1.2, marginBottom: '20px' }}>
              Il tuo centro ha un punto bloccato. Trovalo oggi, gratis.
            </h2>
            <p style={{ fontSize: 'clamp(15px, 1.8vw, 17px)', color: '#d8cdd2', lineHeight: 1.85, marginBottom: '16px', maxWidth: '620px', marginLeft: 'auto', marginRight: 'auto' }}>
              Non è un quiz online e non è un oroscopo travestito da consulenza. L&apos;Identikit strategico CURA prende i dati veri del tuo centro — clienti, agenda, conto — e ti restituisce una diagnosi scritta solo per te: dove sei bloccata oggi, e qual è la prima cosa su cui mettere le mani domani mattina.
            </p>
            <p style={{ fontSize: 'clamp(15px, 1.8vw, 17px)', color: '#d8cdd2', lineHeight: 1.85, marginBottom: '36px', maxWidth: '620px', marginLeft: 'auto', marginRight: 'auto' }}>
              Vale 60€. In questo momento è gratis — la finestra di lancio è aperta adesso, e si chiude quando il countdown qui sotto arriva a zero.
            </p>
          </div>

          <div style={{ position: 'relative', maxWidth: '920px', margin: '0 auto', padding: '0 8px', marginBottom: '40px' }}>
            <ReportCountdownBanner variant="prominent" />
          </div>

          <div style={{ position: 'relative', maxWidth: '760px', margin: '0 auto', textAlign: 'center' }}>
            <Link
              href="/report"
              className="bx-pil-cta-pulse"
              style={{ display: 'inline-block', background: '#EC4899', color: '#fff', padding: '22px 48px', borderRadius: '12px', fontWeight: 800, fontSize: 'clamp(17px, 2.2vw, 19px)', textDecoration: 'none', boxShadow: '0 14px 36px rgba(236,72,153,0.5)' }}
            >
              Fai il tuo Identikit strategico CURA, gratis adesso →
            </Link>
            <p style={{ marginTop: '16px', fontSize: '13px', color: '#b8a8b0', lineHeight: 1.6 }}>
              Bastano pochi minuti e un account completo — che ti serve comunque, qualunque cosa deciderai dopo.
            </p>
          </div>
        </section>

        {/* ── LE DUE CARD — Newsletter+Miniguida | Listino intelligente ──
            Pari dignità visiva richiesta dal task #205: stessa larghezza,
            stesso stile di card, nessuna delle due "vince" sull'altra.
            Affiancate su desktop, impilate su mobile (.bx-pil-cards). */}
        <section style={{ background: '#fff', padding: '72px 32px 88px' }}>
          <div className="bx-pil-cards" style={{ maxWidth: '1040px', margin: '0 auto', display: 'flex', gap: '28px', alignItems: 'stretch' }}>

            {/* ── CARD: NEWSLETTER + MINIGUIDA (un unico blocco) ── */}
            <div
              className="bx-pil-card"
              style={{ flex: '1 1 0', background: '#faf7f2', border: '1px solid #e7e0d5', borderRadius: '18px', padding: 'clamp(28px, 4vw, 40px)', display: 'flex', flexDirection: 'column' }}
            >
              <div style={{ marginBottom: '18px' }}>
                <IconEnvelope />
              </div>
              <p style={{ fontSize: '11px', fontWeight: 700, letterSpacing: '0.12em', textTransform: 'uppercase', color: PINK, marginBottom: '14px' }}>
                Gratis per sempre
              </p>
              <h3 style={{ fontFamily: 'var(--font-playfair), Georgia, serif', fontSize: 'clamp(21px, 2.6vw, 27px)', fontWeight: 900, color: INK, lineHeight: 1.25, marginBottom: '16px' }}>
                Il portone che resta aperto: due email a settimana, senza scadenza.
              </h3>
              <p style={{ fontSize: '15px', color: '#555', lineHeight: 1.8, marginBottom: '28px' }}>
                Ti iscrivi una volta e resti dentro finché vuoi: niente scadenze, niente rinnovi. Appena confermi l&apos;email, la miniguida &quot;10 errori che (quasi) tutte fanno nella gestione del centro&quot; è già lì che ti aspetta — arriva subito, cucita all&apos;iscrizione, senza un passaggio in più da fare.
              </p>

              <div style={{ marginTop: 'auto' }}>
                {status === 'success' ? (
                  <div style={{ background: '#fff', border: '1.5px solid #e7e0d5', borderRadius: '12px', padding: '18px 20px' }}>
                    <p style={{ margin: 0, fontSize: '14px', color: INK, marginBottom: guidaToken ? '12px' : 0 }}>
                      <strong style={{ color: PINK }}>✓ Sei dentro!</strong>{' '}
                      <span style={{ color: '#666' }}>Controlla l&apos;email per confermare.</span>
                    </p>
                    {guidaToken && (
                      <Link
                        href={`/guida?t=${guidaToken}`}
                        style={{ display: 'inline-block', padding: '10px 20px', background: PINK, color: '#fff', fontWeight: 700, borderRadius: '8px', textDecoration: 'none', fontSize: '14px' }}
                      >
                        Vai alla tua guida →
                      </Link>
                    )}
                  </div>
                ) : (
                  <form onSubmit={handleSubmit}>
                    <input
                      type="text" name="website" value={website}
                      onChange={(e) => setWebsite(e.target.value)}
                      style={{ position: 'absolute', left: '-9999px', opacity: 0, height: 0 }}
                      tabIndex={-1} autoComplete="off" aria-hidden="true"
                    />
                    <div style={{ display: 'flex', gap: '10px', flexWrap: 'wrap', marginBottom: '10px' }}>
                      <input
                        type="email" value={email}
                        onChange={(e) => setEmail(e.target.value)}
                        placeholder="La tua email" required
                        aria-label="La tua email"
                        style={{ flex: '1 1 160px', padding: '13px 16px', border: '1.5px solid #ddd', borderRadius: '10px', background: '#fff', fontSize: '15px', outline: 'none', color: INK, fontFamily: 'var(--font-inter), sans-serif' }}
                      />
                      <button
                        type="submit" disabled={status === 'loading'}
                        style={{ padding: '13px 20px', background: PINK, color: '#fff', fontWeight: 700, border: 'none', borderRadius: '10px', cursor: status === 'loading' ? 'not-allowed' : 'pointer', fontSize: '14.5px', opacity: status === 'loading' ? 0.6 : 1, fontFamily: 'var(--font-inter), sans-serif', whiteSpace: 'nowrap' }}
                      >
                        {status === 'loading' ? 'Un attimo...' : 'Iscriviti gratis — la miniguida arriva subito →'}
                      </button>
                    </div>
                    {status === 'error' && (
                      <p style={{ color: '#c0392b', fontSize: '13px', marginTop: '6px' }}>{errorMsg}</p>
                    )}
                    <p style={{ fontSize: '12px', color: '#888', marginTop: '10px', lineHeight: 1.6 }}>
                      Due email a settimana, ti disiscrivi quando vuoi in un clic.
                    </p>
                  </form>
                )}
              </div>
            </div>

            {/* ── CARD: LISTINO INTELLIGENTE ──
                Bottone outline teal (non pieno, niente pulse): priorità
                visiva volutamente inferiore rispetto al bottone pieno+pulse
                dell'Identikit, per non competere con la civetta dei 90gg —
                ma stessa dimensione di card, stesso trattamento tipografico,
                pari dignità come blocco. */}
            <div
              className="bx-pil-card"
              style={{ flex: '1 1 0', background: '#fff', border: `1.5px solid ${TEAL_BORDER}`, borderRadius: '18px', padding: 'clamp(28px, 4vw, 40px)', display: 'flex', flexDirection: 'column' }}
            >
              <div style={{ marginBottom: '18px' }}>
                <IconPriceTag />
              </div>
              <p style={{ fontSize: '11px', fontWeight: 700, letterSpacing: '0.08em', textTransform: 'uppercase', color: TEAL, marginBottom: '14px', lineHeight: 1.6 }}>
                Listino intelligente — gratis per i primi 90 giorni, poi 29€ una tantum
              </p>
              <h3 style={{ fontFamily: 'var(--font-playfair), Georgia, serif', fontSize: 'clamp(21px, 2.6vw, 27px)', fontWeight: 900, color: INK, lineHeight: 1.25, marginBottom: '16px' }}>
                Margini e costo orario, a colpo d&apos;occhio
              </h3>
              <p style={{ fontSize: '15px', color: '#555', lineHeight: 1.8, marginBottom: '28px' }}>
                Se calcoli i prezzi a mano — con carta e penna, un foglio Excel o l&apos;occhio che ti sei fatta in anni di lavoro — stai già facendo la cosa giusta: nessuno conosce il tuo centro come te. Il Listino intelligente è solo un modo in più per vedere margini e costo orario in pochi secondi, da usare quando e se ti va.
              </p>

              <div style={{ marginTop: 'auto' }}>
                <Link
                  href="/listino"
                  className="bx-pil-teal-btn"
                  style={{ display: 'inline-block', background: 'transparent', color: TEAL, padding: '15px 26px', borderRadius: '10px', fontWeight: 700, fontSize: '15px', textDecoration: 'none', border: `1.5px solid ${TEAL}` }}
                >
                  Il tuo primo prezzo ti aspetta su /listino, quando ti va di provarlo ↗
                </Link>
                <p style={{ fontSize: '12px', color: '#888', marginTop: '12px', lineHeight: 1.6 }}>
                  Serve un account gratuito — lo stesso che usi per l&apos;Identikit, pronto in due minuti: 90 giorni gratis, poi 29€ una tantum.
                </p>
              </div>
            </div>

          </div>
        </section>

        {/* ── FOOTER ── */}
        <footer style={{ background: '#111', borderTop: '1px solid rgba(255,255,255,0.05)', padding: '24px 32px', textAlign: 'center' }}>
          <p style={{ fontSize: '12px', color: '#555' }}>
            © {new Date().getFullYear()} Beautyx ·{' '}
            <Link href="/privacy" style={{ color: '#666', textDecoration: 'none' }}>Privacy</Link>
            <GuidaFooterLink style={{ color: '#666', textDecoration: 'none' }} separator=" · " />
          </p>
          <p style={{ fontSize: '11px', color: '#444', marginTop: '8px' }}>
            Beautyx è un progetto di Svetage S.r.l. — P.IVA/C.F. 01959270495 · Via Toscana 6/8, 57128 Livorno (LI), Italia · REA LI 216353 · Capitale sociale 10.000 € interamente versato
          </p>
        </footer>

      </div>
    </>
  )
}
