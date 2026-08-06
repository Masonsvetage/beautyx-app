'use client'

import { useState, useEffect } from 'react'
import Link from 'next/link'
import Image from 'next/image'

// Tassonomia tag per l'archivio "Newsletter già uscite" (/api/public/newsletter-archive).
// Tassonomia definitiva Alessia (8 categorie) — i valori salvati nel DB devono
// combaciare esattamente con "label" qui sotto per far funzionare il filtro.
const TAG_TASSONOMIA = [
  { label: 'Mindset & identità', colore: '#14B8A6' },
  { label: 'Numeri & margini', colore: '#EC4899' },
  { label: 'Agenda & tempo', colore: '#F59E0B' },
  { label: 'Clienti & relazione', colore: '#8B5CF6' },
  { label: 'Marketing & posizionamento', colore: '#10B981' },
  { label: 'Vendita & pacchetti', colore: '#EF4444' },
  { label: 'Squadra & delega', colore: '#3B82F6' },
  { label: 'Normative & strumenti', colore: '#6366F1' },
]
const COLORE_TAG_DEFAULT = '#EC4899'
const coloreTag = (tag) => TAG_TASSONOMIA.find((t) => t.label === tag)?.colore || COLORE_TAG_DEFAULT

const faqs = [
  {
    domanda: 'Quanto spesso arriva la newsletter?',
    risposta:
      'Due volte a settimana — martedì e venerdì mattina. Così prima di aprire il centro hai già qualcosa di utile da leggere.',
  },
  {
    domanda: "C'è davvero un consulente umano? Non è tutto automatico?",
    risposta:
      "Sì, davvero. Una persona reale — non un bot, non un template — a cui puoi fare una domanda al mese sul tuo centro specifico. Non sui centri estetici in generale: sul tuo. È compresa nell'iscrizione gratuita.",
  },
  {
    domanda: 'Ho già un commercialista. Non mi serve altro, no?',
    risposta:
      "Il commercialista ti protegge dal fisco — ed è fondamentale. Ma i prezzi giusti, l'agenda che non si svuota, la cliente che non torna: è un altro mestiere. Beautyx lavora lì.",
  },
  {
    domanda: "Ho già pochissimo tempo. Un'altra newsletter è l'ultima cosa di cui ho bisogno.",
    risposta:
      'Dieci minuti, due volte a settimana. Se nella prima settimana non trovi niente di utile, ti disiscrivi senza sensi di colpa. La miniguida te la tieni comunque.',
  },
]

export default function NewsletterPage() {
  const [email, setEmail] = useState('')
  const [website, setWebsite] = useState('')
  const [status, setStatus] = useState('idle')
  const [errorMsg, setErrorMsg] = useState('')
  const [articoliState, setArticoliState] = useState({ status: 'loading', items: [] })
  const [tagAttivo, setTagAttivo] = useState(null)
  const [activeArticle, setActiveArticle] = useState(null)

  useEffect(() => {
    fetch('/api/public/newsletter-archive?limit=12')
      .then((r) => r.json())
      .then((d) => {
        const items = Array.isArray(d.articoli) ? d.articoli : []
        setArticoliState({ status: items.length > 0 ? 'ready' : 'empty', items })
      })
      .catch(() => setArticoliState({ status: 'empty', items: [] }))
  }, [])

  const articoliFiltrati = tagAttivo
    ? articoliState.items.filter((a) => Array.isArray(a.tags) && a.tags.includes(tagAttivo))
    : articoliState.items

  const tagPresenti = TAG_TASSONOMIA.filter((t) =>
    articoliState.items.some((a) => Array.isArray(a.tags) && a.tags.includes(t.label))
  )

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
        html { scroll-behavior: smooth; }
        .bx-art-card { transition: transform 0.18s ease, box-shadow 0.18s ease; cursor: pointer; }
        .bx-art-card:hover { transform: translateY(-4px); box-shadow: 0 16px 40px rgba(0,0,0,0.12); }
        .bx-article h3 { font-family: var(--font-playfair), Georgia, serif; font-size: 20px; color: #1a1a0f; margin: 28px 0 10px; line-height: 1.3; }
        .bx-article p { font-size: 16px; color: #333; line-height: 1.8; margin-bottom: 16px; }
        .bx-article ul { margin: 0 0 16px 22px; }
        .bx-article li { font-size: 16px; color: #333; line-height: 1.7; margin-bottom: 8px; }
        .bx-article hr { border: none; border-top: 1px solid #e7e0d5; margin: 24px 0; }
        .bx-article strong { color: #1a1a0f; }
        @media (max-width: 700px) {
          .hero-split { flex-direction: column !important; }
          .differenziatore-grid { flex-direction: column !important; }
        }
      `}</style>

      <div style={{ background: '#f5f1ea', minHeight: '100vh', fontFamily: "var(--font-inter), system-ui, sans-serif", color: '#1a1a0f' }}>

        {/* ── NAV ── */}
        <header style={{ padding: '20px 32px', display: 'flex', alignItems: 'center', justifyContent: 'space-between', maxWidth: '1100px', margin: '0 auto' }}>
          <Link href="/" style={{ display: 'flex', alignItems: 'center', gap: '10px', textDecoration: 'none' }}>
            <Image src="/logo_beautyx-oro.png" alt="Beautyx" width={32} height={32} style={{ borderRadius: '4px' }} />
            <span style={{ fontWeight: 700, color: '#1a1a0f', fontSize: '16px' }}>Beautyx</span>
          </Link>
          <a
            href="#form-section"
            style={{ background: '#1a1a0f', color: '#fff', padding: '12px 24px', borderRadius: '8px', fontWeight: 700, fontSize: '14px', textDecoration: 'none' }}
          >
            Iscriviti gratis →
          </a>
        </header>

        {/* ── HERO ── */}
        <section style={{ background: '#1a1a0f', position: 'relative', overflow: 'hidden' }}>
          <div style={{
            position: 'absolute', inset: 0,
            backgroundImage: 'url(/images/hero-titolare-bw.jpg)',
            backgroundSize: 'cover', backgroundPosition: 'center top', opacity: 0.25,
          }} />

          <div
            className="hero-split"
            style={{ position: 'relative', maxWidth: '1100px', margin: '0 auto', padding: '80px 32px 96px', display: 'flex', alignItems: 'center', gap: '60px' }}
          >
            <div style={{ maxWidth: '640px' }}>
              <div style={{ display: 'inline-flex', alignItems: 'center', background: 'rgba(236,72,153,0.15)', border: '1px solid rgba(236,72,153,0.3)', color: '#EC4899', fontWeight: 700, fontSize: '11px', letterSpacing: '0.1em', textTransform: 'uppercase', padding: '6px 14px', borderRadius: '100px', marginBottom: '32px' }}>
                Newsletter gratuita · Beautyx
              </div>

              <h1 style={{ fontFamily: "var(--font-playfair), Georgia, serif", fontSize: 'clamp(34px, 5vw, 62px)', fontWeight: 900, lineHeight: 1.08, color: '#fff', marginBottom: '28px' }}>
                Il tuo lavoro<br />lo sai fare.<br />
                <span style={{ fontStyle: 'italic', color: '#EC4899' }}>Gestirlo bene<br />è un&apos;altra storia.</span>
              </h1>

              <p style={{ fontSize: 'clamp(16px, 2vw, 19px)', color: '#aaa', lineHeight: 1.75, marginBottom: '36px', maxWidth: '520px' }}>
                Agenda piena da mattina a sera. A fine mese il conto che non torna mai come dovrebbe. Una stanchezza che il sonno perso non spiega. Se il centro lo mandi avanti da anni, sai già di cosa sto parlando — e scommetto che pensi sia colpa tua. Non lo è: nessuno ti ha mai insegnato a leggere i problemi di gestione che quasi tutte le titolari come te si portano dietro. Due volte a settimana, in dieci minuti, te li mostriamo noi. Il tuo centro non cresce copiando una formula: cresce quando la gestione va nella stessa direzione di chi sei. Niente da studiare. Solo da riconoscere.
              </p>

              <div style={{ display: 'flex', alignItems: 'center', gap: '20px', flexWrap: 'wrap' }}>
                <a href="#form-section" style={{ display: 'inline-block', background: '#EC4899', color: '#fff', padding: '16px 32px', borderRadius: '10px', fontWeight: 700, fontSize: '16px', textDecoration: 'none' }}>
                  Iscriviti gratis →
                </a>
                <p style={{ fontSize: '13px', color: '#666' }}>La miniguida oggi in email. Più: una domanda al mese a un consulente vero, gratis.</p>
              </div>
            </div>

          </div>
        </section>

        {/* ── DIFFERENZIATORE ── */}
        <section style={{ background: '#fff', padding: '80px 32px' }}>
          <div
            className="differenziatore-grid"
            style={{ maxWidth: '960px', margin: '0 auto', display: 'flex', gap: '64px', alignItems: 'center' }}
          >
            <div style={{ flex: '0 0 340px' }}>
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src="/images/punto-gestione.jpg"
                alt="Gestione centro estetico"
                style={{ width: '100%', borderRadius: '12px', objectFit: 'cover', height: '380px', display: 'block' }}
              />
            </div>

            <div style={{ flex: '1 1 360px' }}>
              <p style={{ fontSize: '11px', fontWeight: 700, letterSpacing: '0.12em', textTransform: 'uppercase', color: '#EC4899', marginBottom: '16px' }}>
                Il punto
              </p>
              <h2 style={{ fontFamily: "var(--font-playfair), Georgia, serif", fontSize: 'clamp(24px, 3.5vw, 36px)', fontWeight: 900, color: '#1a1a0f', lineHeight: 1.15, marginBottom: '24px' }}>
                Non è una rivista.<br />È uno strumento di lavoro.
              </h2>
              <div style={{ fontSize: 'clamp(15px, 1.8vw, 17px)', color: '#555', lineHeight: 1.85 }}>
                <p style={{ marginBottom: '18px' }}>
                  Le newsletter di settore ti raccontano le tendenze. Bene — le tendenze servono. Ma noi ci fermiamo un passo dopo: <em>cosa significa quella tendenza per la gestione del tuo centro?</em>
                </p>
                <p style={{ marginBottom: '18px' }}>
                  Ecco come funziona, senza fronzoli: un&apos;intelligenza artificiale seleziona — tra tutto quello che si scrive sulla gestione di un centro estetico — gli argomenti che contano davvero per chi lo manda avanti da anni, non per chi lo sta aprendo adesso. Poi quel materiale passa nelle mani di un consulente umano vero, che lo trasforma in qualcosa che puoi usare per il tuo centro, questa settimana. Non tendenze da ammirare: un tema solo, un problema reale, spiegato senza giri di parole, e una cosa precisa da provare — non &ldquo;considera di valutare&rdquo;, una cosa precisa.
                </p>
                <p style={{ fontFamily: "var(--font-playfair), Georgia, serif", fontStyle: 'italic', fontSize: '18px', color: '#EC4899', borderLeft: '3px solid #EC4899', paddingLeft: '18px', lineHeight: 1.6 }}>
                  Non informazione. Consulenza — due volte a settimana, gratis. E una volta al mese, quella consulenza ha anche una faccia, e risponde solo a te.
                </p>
              </div>
            </div>
          </div>
        </section>

        {/* ── COSA OTTIENI ── */}
        <section style={{ background: '#f5f1ea', padding: '80px 32px' }}>
          <div style={{ maxWidth: '760px', margin: '0 auto' }}>
            <h2 style={{ fontFamily: "var(--font-playfair), Georgia, serif", fontSize: 'clamp(24px, 3.5vw, 38px)', fontWeight: 900, color: '#1a1a0f', marginBottom: '48px', lineHeight: 1.2 }}>
              Cosa succede quando ti iscrivi
            </h2>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '36px' }}>
              {[
                {
                  num: '01',
                  titolo: 'Subito: la miniguida',
                  desc: '"10 errori che (quasi) tutte fanno nella gestione del centro" — nella tua email oggi. Non la settimana prossima. Oggi.',
                },
                {
                  num: '02',
                  titolo: 'Martedì e venerdì mattina: la newsletter',
                  desc: 'Un tema di gestione, spiegato bene: quello che puoi provare già questa settimana.',
                },
                {
                  num: '03',
                  titolo: 'Una volta al mese: il consulente',
                  desc: "Scrivi la domanda che ti tieni per te da mesi — quella specifica, sul tuo centro. Una persona reale ti risponde pensando al tuo caso, non ai centri estetici in generale. Compresa nell'iscrizione gratuita.",
                },
              ].map((item) => (
                <div key={item.num} style={{ display: 'flex', gap: '24px', alignItems: 'flex-start' }}>
                  <span style={{ fontFamily: "var(--font-playfair), serif", fontSize: '13px', fontWeight: 700, color: '#EC4899', flexShrink: 0, minWidth: '28px', marginTop: '4px' }}>
                    {item.num}
                  </span>
                  <div>
                    <h3 style={{ fontFamily: "var(--font-playfair), serif", fontSize: '19px', fontWeight: 700, color: '#1a1a0f', marginBottom: '8px', lineHeight: 1.3 }}>
                      {item.titolo}
                    </h3>
                    <p style={{ fontSize: 'clamp(14px, 1.6vw, 16px)', color: '#666', lineHeight: 1.75 }}>{item.desc}</p>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* ── NEWSLETTER GIÀ USCITE ── */}
        <section style={{ background: '#faf7f2', padding: '80px 32px' }}>
          <div style={{ maxWidth: '1040px', margin: '0 auto' }}>
            <h2 style={{ fontFamily: "var(--font-playfair), Georgia, serif", fontSize: 'clamp(24px, 3.5vw, 36px)', fontWeight: 900, color: '#1a1a0f', marginBottom: '12px', lineHeight: 1.2 }}>
              Intanto, leggi cosa ti sei persa
            </h2>

            {articoliState.status === 'empty' && (
              <p style={{ fontSize: 'clamp(15px, 1.8vw, 17px)', color: '#666', lineHeight: 1.7, maxWidth: '560px' }}>
                I primi numeri arrivano a breve — iscriviti per non perderli.
              </p>
            )}

            {articoliState.status === 'ready' && (
              <>
                <p style={{ fontSize: 'clamp(15px, 1.8vw, 17px)', color: '#666', lineHeight: 1.7, marginBottom: '28px', maxWidth: '560px' }}>
                  Leggile — poi decidi se iscriverti.
                </p>

                {tagPresenti.length > 0 && (
                  <div style={{ display: 'flex', flexWrap: 'wrap', gap: '8px', marginBottom: '28px' }}>
                    <button
                      onClick={() => setTagAttivo(null)}
                      style={{
                        fontSize: '12px', fontWeight: 700, letterSpacing: '0.03em', padding: '6px 14px', borderRadius: '999px', cursor: 'pointer',
                        border: tagAttivo === null ? '1.5px solid #1a1a0f' : '1.5px solid #e7e0d5',
                        background: tagAttivo === null ? '#1a1a0f' : '#fff',
                        color: tagAttivo === null ? '#fff' : '#1a1a0f',
                      }}
                    >
                      Tutti
                    </button>
                    {tagPresenti.map((t) => (
                      <button
                        key={t.label}
                        onClick={() => setTagAttivo(t.label)}
                        style={{
                          fontSize: '12px', fontWeight: 700, letterSpacing: '0.03em', padding: '6px 14px', borderRadius: '999px', cursor: 'pointer',
                          border: tagAttivo === t.label ? `1.5px solid ${t.colore}` : '1.5px solid #e7e0d5',
                          background: tagAttivo === t.label ? `${t.colore}18` : '#fff',
                          color: tagAttivo === t.label ? t.colore : '#1a1a0f',
                        }}
                      >
                        {t.label}
                      </button>
                    ))}
                  </div>
                )}

                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(260px, 1fr))', gap: '20px' }}>
                  {articoliFiltrati.map((a) => (
                    <button
                      key={a.id}
                      className="bx-art-card"
                      onClick={() => setActiveArticle(a)}
                      style={{ textAlign: 'left', background: '#fff', border: '1px solid #e7e0d5', borderRadius: '14px', padding: '24px', display: 'flex', flexDirection: 'column', gap: '12px', fontFamily: "var(--font-inter), sans-serif", cursor: 'pointer' }}
                    >
                      {Array.isArray(a.tags) && a.tags.length > 0 && (
                        <div style={{ display: 'flex', flexWrap: 'wrap', gap: '6px' }}>
                          {a.tags.slice(0, 2).map((tag) => (
                            <span key={tag} style={{ alignSelf: 'flex-start', fontSize: '11px', fontWeight: 700, letterSpacing: '0.06em', textTransform: 'uppercase', color: coloreTag(tag), background: `${coloreTag(tag)}18`, padding: '4px 10px', borderRadius: '999px' }}>
                              {tag}
                            </span>
                          ))}
                        </div>
                      )}
                      <h3 style={{ fontFamily: "var(--font-playfair), Georgia, serif", fontSize: '17px', fontWeight: 700, color: '#1a1a0f', lineHeight: 1.35 }}>
                        {a.titolo}
                      </h3>
                      {a.estratto && (
                        <p style={{ fontSize: '14px', color: '#666', lineHeight: 1.6 }}>{a.estratto}</p>
                      )}
                      <span style={{ marginTop: 'auto', fontSize: '14px', fontWeight: 700, color: '#1a1a0f' }}>Leggi →</span>
                    </button>
                  ))}
                </div>
              </>
            )}
          </div>
        </section>

        {/* ── FORM ── */}
        <section id="form-section" style={{ background: '#0d1b2a', padding: '80px 32px' }}>
          <div style={{ maxWidth: '600px', margin: '0 auto', textAlign: 'center' }}>
            <h2 style={{ fontFamily: "var(--font-playfair), Georgia, serif", fontSize: 'clamp(26px, 4vw, 44px)', fontWeight: 900, color: '#fff', marginBottom: '12px', lineHeight: 1.1 }}>
              Fai una cosa.
            </h2>
            <p style={{ fontSize: '17px', color: '#8899aa', marginBottom: '36px', lineHeight: 1.65 }}>
              Iscriviti gratis, prendi la miniguida, leggiti i primi due numeri. Poi vedi tu.
            </p>

            {status === 'success' ? (
              <div style={{ background: 'rgba(255,255,255,0.06)', border: '1.5px solid rgba(255,255,255,0.12)', borderRadius: '16px', padding: '36px 28px', textAlign: 'center' }}>
                <div style={{ fontSize: '36px', marginBottom: '14px' }}>✓</div>
                <h3 style={{ fontFamily: "var(--font-playfair), serif", fontSize: '22px', marginBottom: '10px', color: '#fff' }}>Sei dentro!</h3>
                <p style={{ color: '#8899aa', fontSize: '15px', lineHeight: 1.7 }}>
                  Controlla la tua email — la miniguida è già in arrivo.
                </p>
              </div>
            ) : (
              <form onSubmit={handleSubmit} style={{ maxWidth: '520px', margin: '0 auto' }}>
                <input
                  type="text" name="website" value={website}
                  onChange={(e) => setWebsite(e.target.value)}
                  style={{ position: 'absolute', left: '-9999px', opacity: 0, height: 0 }}
                  tabIndex={-1} autoComplete="off" aria-hidden="true"
                />
                <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                  <input
                    type="email" value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder="la-tua@email.it" required
                    style={{ padding: '16px 20px', border: '1.5px solid rgba(255,255,255,0.15)', borderRadius: '10px', background: 'rgba(255,255,255,0.06)', fontSize: '16px', outline: 'none', color: '#fff', fontFamily: "var(--font-inter), sans-serif", width: '100%' }}
                  />
                  <button
                    type="submit" disabled={status === 'loading'}
                    style={{ padding: '16px 24px', background: '#EC4899', color: '#fff', fontWeight: 700, border: 'none', borderRadius: '10px', cursor: status === 'loading' ? 'not-allowed' : 'pointer', fontSize: '16px', opacity: status === 'loading' ? 0.6 : 1, fontFamily: "var(--font-inter), sans-serif", width: '100%' }}
                  >
                    {status === 'loading' ? 'Iscrizione in corso...' : 'Iscriviti e scarica la miniguida →'}
                  </button>
                </div>
                {status === 'error' && (
                  <p style={{ marginTop: '10px', color: '#ff6b6b', fontSize: '13px' }}>{errorMsg}</p>
                )}
                <p style={{ marginTop: '14px', fontSize: '13px', color: '#55667a', lineHeight: 1.6 }}>
                  Ricevi subito la miniguida, poi la newsletter martedì e venerdì. Puoi disiscriverti quando vuoi.
                </p>
                <p style={{ marginTop: '10px', fontSize: '11px', color: '#3d4f60', lineHeight: 1.65 }}>
                  Iscrivendoti accetti il trattamento dei tuoi dati per ricevere la newsletter Beautyx. Usiamo Beehiiv e Supabase. I tuoi dati non vengono mai venduti a terzi.{' '}
                  <Link href="/privacy" style={{ color: '#55667a', textDecoration: 'underline' }}>Privacy policy</Link>.
                </p>
              </form>
            )}
          </div>
        </section>

        {/* ── SPUNTO DI RIFLESSIONE ── */}
        <section style={{ background: '#f5f1ea', padding: '72px 32px' }}>
          <div style={{ maxWidth: '720px', margin: '0 auto', textAlign: 'center' }}>
            <p style={{
              fontFamily: "var(--font-playfair), Georgia, serif",
              fontStyle: 'italic',
              fontSize: 'clamp(19px, 2.4vw, 25px)',
              color: '#1a1a0f',
              lineHeight: 1.6,
              borderLeft: '3px solid #EC4899',
              paddingLeft: '24px',
              textAlign: 'left',
              display: 'inline-block',
            }}>
              Ogni anno in Italia aprono circa 7.000 centri estetici. Nello stesso anno, altrettanti chiudono. Pensi davvero che dipenda dal fatto che 7.000 persone non sapessero fare l&apos;estetista? O che il problema fosse un altro — non saper gestire il centro?<br /><br />
              <strong style={{ fontStyle: 'normal', color: '#EC4899' }}>Tu da che parte vuoi stare?</strong>
            </p>
          </div>
        </section>

        {/* ── FAQ ── */}
        <section style={{ background: '#f5f1ea', padding: '80px 32px' }}>
          <div style={{ maxWidth: '720px', margin: '0 auto' }}>
            <h2 style={{ fontFamily: "var(--font-playfair), Georgia, serif", fontSize: 'clamp(24px, 3.5vw, 36px)', fontWeight: 700, color: '#1a1a0f', marginBottom: '48px', lineHeight: 1.2 }}>
              Hai domande? Ci siamo già passate.
            </h2>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '32px' }}>
              {faqs.map((faq, i) => (
                <div key={i} style={{ borderTop: '1px solid #ddd', paddingTop: '28px' }}>
                  <h3 style={{ fontWeight: 700, fontSize: 'clamp(15px, 1.8vw, 17px)', color: '#1a1a0f', marginBottom: '12px', lineHeight: 1.4 }}>
                    {faq.domanda}
                  </h3>
                  <p style={{ fontSize: 'clamp(14px, 1.6vw, 16px)', color: '#666', lineHeight: 1.75 }}>
                    {faq.risposta}
                  </p>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* ── CHIUSURA ── */}
        <section style={{ background: '#1a1a0f', padding: '80px 32px', textAlign: 'center' }}>
          <div style={{ maxWidth: '600px', margin: '0 auto' }}>
            <p style={{ fontFamily: "var(--font-playfair), Georgia, serif", fontSize: 'clamp(22px, 3.5vw, 36px)', fontWeight: 700, fontStyle: 'italic', color: '#fff', lineHeight: 1.35, marginBottom: '36px' }}>
              Hai aperto il tuo centro.<br />Adesso è il momento di gestirlo davvero.
            </p>
            <a
              href="#form-section"
              style={{ display: 'inline-block', background: '#EC4899', color: '#fff', padding: '18px 40px', borderRadius: '10px', fontWeight: 700, fontSize: '16px', textDecoration: 'none' }}
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
          </p>
        </footer>

        {/* ── MODALE ARTICOLO ── */}
        {activeArticle && (
          <div
            onClick={() => setActiveArticle(null)}
            style={{ position: 'fixed', inset: 0, background: 'rgba(15,15,10,0.65)', display: 'flex', alignItems: 'flex-start', justifyContent: 'center', padding: '32px 16px', overflowY: 'auto', zIndex: 1000 }}
          >
            <article
              onClick={(e) => e.stopPropagation()}
              style={{ position: 'relative', background: '#fff', maxWidth: '720px', width: '100%', borderRadius: '16px', padding: 'clamp(28px, 5vw, 56px)', margin: 'auto', boxShadow: '0 24px 60px rgba(0,0,0,0.3)' }}
            >
              <button
                onClick={() => setActiveArticle(null)}
                aria-label="Chiudi"
                style={{ position: 'absolute', top: '16px', right: '16px', width: '38px', height: '38px', borderRadius: '50%', border: 'none', background: '#f5f1ea', color: '#1a1a0f', fontSize: '22px', lineHeight: 1, cursor: 'pointer' }}
              >
                &times;
              </button>

              {Array.isArray(activeArticle.tags) && activeArticle.tags.length > 0 && (
                <div style={{ display: 'flex', flexWrap: 'wrap', gap: '6px', marginBottom: '16px' }}>
                  {activeArticle.tags.map((tag) => (
                    <span key={tag} style={{ display: 'inline-block', fontSize: '11px', fontWeight: 700, letterSpacing: '0.06em', textTransform: 'uppercase', color: coloreTag(tag), background: `${coloreTag(tag)}18`, padding: '4px 10px', borderRadius: '999px' }}>
                      {tag}
                    </span>
                  ))}
                </div>
              )}

              <h2 style={{ fontFamily: "var(--font-playfair), Georgia, serif", fontSize: 'clamp(24px, 4vw, 34px)', fontWeight: 900, color: '#1a1a0f', lineHeight: 1.2, marginBottom: '24px' }}>
                {activeArticle.titolo}
              </h2>

              <div
                className="bx-article"
                dangerouslySetInnerHTML={{
                  __html: activeArticle.contenuto ||
                    `<p>${activeArticle.estratto || ''}</p><p><em>Iscriviti per leggere il numero completo.</em></p>`,
                }}
              />

              <div style={{ marginTop: '40px', paddingTop: '28px', borderTop: '1px solid #e7e0d5', textAlign: 'center' }}>
                <p style={{ fontSize: '15px', color: '#666', marginBottom: '16px' }}>
                  Ti è stato utile? Ricevi ogni numero nella tua email.
                </p>
                <a
                  href="#form-section"
                  onClick={() => setActiveArticle(null)}
                  style={{ display: 'inline-block', background: '#EC4899', color: '#fff', padding: '14px 28px', borderRadius: '10px', fontWeight: 700, fontSize: '15px', textDecoration: 'none' }}
                >
                  Iscriviti gratis →
                </a>
              </div>
            </article>
          </div>
        )}

      </div>
    </>
  )
}
