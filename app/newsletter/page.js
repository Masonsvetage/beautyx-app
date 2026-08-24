'use client'

import { useState, useEffect } from 'react'
import Link from 'next/link'
import Image from 'next/image'
import GuidaFooterLink from '@/components/common/GuidaFooterLink'

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

// Stesso cookie di accesso usato da /guida (vedi app/guida/_components/PersistAccessToken.js
// e app/guida/page.js): riusiamo il token già persistito per sbloccare qui il testo
// integrale delle newsletter già uscite, senza creare un secondo sistema di auth.
const ACCESS_COOKIE = 'guida_access_token'

function readAccessCookie() {
  if (typeof document === 'undefined') return null
  const match = document.cookie.match(new RegExp('(?:^|; )' + ACCESS_COOKIE + '=([^;]*)'))
  return match ? decodeURIComponent(match[1]) : null
}

const faqs = [
  {
    domanda: 'Quanto spesso arriva la newsletter?',
    risposta:
      'Due volte a settimana — martedì e venerdì mattina. Così prima di aprire il centro hai già qualcosa di utile da leggere.',
  },
  {
    domanda: "C'è davvero un consulente umano? Non è tutto automatico?",
    risposta:
      "Una persona reale, in carne e ossa, a cui puoi fare una domanda al mese sul tuo centro specifico — quello vero, quello che conosci a memoria. È compresa nell'iscrizione gratuita.",
  },
  {
    domanda: 'Ho già un commercialista. Non mi serve altro, no?',
    risposta:
      "Il commercialista ti protegge dal fisco — ed è fondamentale. Ma i prezzi giusti, l'agenda sempre piena, la cliente che sceglie di tornare: è un altro mestiere. Beautyx lavora lì.",
  },
  {
    domanda: "Ho già pochissimo tempo. Un'altra newsletter è l'ultima cosa di cui ho bisogno.",
    risposta:
      'Dieci minuti, due volte a settimana: prova la prima settimana e giudica tu. Ti disiscrivi quando vuoi, in un clic — la miniguida resta comunque tua.',
  },
]

export default function NewsletterPage() {
  const [email, setEmail] = useState('')
  const [website, setWebsite] = useState('')
  const [status, setStatus] = useState('idle')
  const [errorMsg, setErrorMsg] = useState('')
  const [guidaToken, setGuidaToken] = useState(null)
  const [articoliState, setArticoliState] = useState({ status: 'loading', items: [], unlocked: false })
  const [tagAttivo, setTagAttivo] = useState(null)
  const [activeArticle, setActiveArticle] = useState(null)

  useEffect(() => {
    const token = readAccessCookie()
    const url = `/api/public/newsletter-archive?limit=12${token ? `&token=${encodeURIComponent(token)}` : ''}`
    fetch(url)
      .then((r) => r.json())
      .then((d) => {
        const items = Array.isArray(d.articoli) ? d.articoli : []
        setArticoliState({ status: items.length > 0 ? 'ready' : 'empty', items, unlocked: !!d.unlocked })
      })
      .catch(() => setArticoliState({ status: 'empty', items: [], unlocked: false }))
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
        /* Logo FUORI FLUSSO: position:absolute (mai relative+transform, sennò l'header
           si allarga per contenerlo — bug bocciato due volte). left/top qui in CSS
           (con variante mobile) cosi' restano responsive; "position:absolute" e' ripetuto
           anche inline sull'elemento <Image> per avere certezza che vinca sempre.
           IMPORTANTE: .bx-nl-brandlink NON deve avere position:relative — altrimenti
           diventa lui il contenitore di riferimento del logo assoluto (alto quanto il
           wordmark, non quanto l'header) e il logo con top/bottom finisce tagliato dal
           bordo della pagina. L'unico positioning context deve essere l'<header>
           (position:relative, altezza fissa 56px). Con top:0 il bordo superiore del logo
           combacia col bordo superiore dell'header e il logo sporge naturalmente sotto
           la barra (150px logo - 56px header = 94px di overlap su desktop, 104-56=48px
           su mobile) — bug bocciato quattro volte, causa reale: positioning context
           sbagliato per colpa di position:relative sul Link. */
        .bx-nl-logo { left: 0; top: 0; width: 137px; height: 150px; filter: drop-shadow(0 2px 4px rgba(26,26,15,.55)); }
        .bx-nl-brandlink { padding-left: 164px; }
        .bx-nl-wordmark-img { height: 54px; width: auto; display: block; }
        /* Spazio extra sopra il badge eyebrow dell'hero: il logo (150px, fuori flusso)
           sporge 94px sotto l'header (56px) e finiva a y=150, mentre il badge (dopo
           padding-top 80px dell'hero) partiva a y=136 — 14px di sovrapposizione reale
           (bug segnalato da Mason con screenshot, 2026-08-11). +32px di margin-top sul
           badge porta il gap a ~18px di respiro, sopra la soglia minima di sicurezza
           12-16px, senza toccare la dimensione del logo (richiesta esplicita di Mason:
           logo grande, mai rimpicciolito). Su mobile (logo 104px) il gap naturale è
           già ~32px: nessun margin extra necessario, quindi si azzera sotto 480px. */
        .bx-nl-eyebrow { margin-top: 32px; }
        @media (max-width: 480px) {
          .bx-nl-logo { width: 95px; height: 104px; top: 0; filter: drop-shadow(0 1.5px 3px rgba(26,26,15,.55)); }
          .bx-nl-brandlink { padding-left: 118px; }
          .bx-nl-wordmark-img { height: 42px; }
          .bx-nl-eyebrow { margin-top: 0; }
        }
        .bx-cosa-item { position: relative; padding-left: 8px; }
        .bx-cosa-num {
          position: absolute;
          top: -6px;
          left: -6px;
          font-family: var(--font-playfair), Georgia, serif;
          font-weight: 900;
          line-height: 1;
          color: rgba(236, 72, 153, 0.13);
          z-index: 0;
          user-select: none;
          pointer-events: none;
          white-space: nowrap;
        }
        .bx-cosa-num-1 { font-size: clamp(3.2rem, 9vw, 5.5rem); }
        .bx-cosa-num-2 { font-size: clamp(2.6rem, 7vw, 4rem); }
        .bx-cosa-num-3 { font-size: clamp(4rem, 12vw, 7.5rem); }
        @media (max-width: 480px) {
          .bx-cosa-num-1 { font-size: clamp(2.4rem, 16vw, 3.4rem); }
          .bx-cosa-num-2 { font-size: clamp(2rem, 13vw, 2.6rem); }
          .bx-cosa-num-3 { font-size: clamp(2.8rem, 20vw, 4.6rem); }
        }
      `}</style>

      <div className="bx-nl-page" style={{ background: '#f5f1ea', minHeight: '100vh', fontFamily: "var(--font-inter), system-ui, sans-serif", color: '#1a1a0f' }}>

        {/* ── NAV ── */}
        {/* Barra header stretta: altezza FISSA ed esplicita 56px sul tag <header> stesso
            (non calcolata dal contenuto/figli). Il logo e' position:absolute (fuori
            flusso) quindi NON puo' piu' farla crescere, qualunque sia la sua altezza. */}
        <header style={{ padding: '0 32px', height: '56px', display: 'flex', alignItems: 'center', justifyContent: 'space-between', maxWidth: '1100px', margin: '0 auto', position: 'relative', zIndex: 20 }}>
          <Link href="/" className="bx-nl-brandlink" style={{ display: 'flex', alignItems: 'center', textDecoration: 'none' }}>
            <Image src="/logo_beautyx-oro.png" alt="Beautyx" width={137} height={150} className="bx-nl-logo" style={{ position: 'absolute', borderRadius: '4px' }} />
            <Image src="/beautyx-wordmark.png" alt="Beautyx" width={220} height={151} className="bx-nl-wordmark-img" />
          </Link>
          <a
            href="#form-section"
            style={{ background: '#1a1a0f', color: '#fff', padding: '12px 24px', borderRadius: '8px', fontWeight: 700, fontSize: '14px', lineHeight: 1, textDecoration: 'none' }}
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
              <div className="bx-nl-eyebrow" style={{ display: 'inline-flex', alignItems: 'center', background: 'rgba(236,72,153,0.15)', border: '1px solid rgba(236,72,153,0.3)', color: '#EC4899', fontWeight: 700, fontSize: '11px', letterSpacing: '0.1em', textTransform: 'uppercase', padding: '6px 14px', borderRadius: '100px', marginBottom: '32px' }}>
                Newsletter gratuita · Beautyx
              </div>

              <h1 style={{ fontFamily: "var(--font-playfair), Georgia, serif", fontSize: 'clamp(34px, 5vw, 62px)', fontWeight: 900, lineHeight: 1.08, color: '#fff', marginBottom: '28px' }}>
                Il tuo lavoro<br />lo sai fare.<br />
                <span style={{ fontStyle: 'italic', color: '#EC4899' }}>Gestirlo bene<br />è un&apos;altra storia.</span>
              </h1>

              <p style={{ fontSize: 'clamp(16px, 2vw, 19px)', color: '#aaa', lineHeight: 1.75, marginBottom: '36px', maxWidth: '520px' }}>
                Ti alzi presto, vai a letto tardi, e in mezzo c&apos;è un centro che sembra reggersi tutto sulle tue spalle: agenda piena, mani sempre impegnate, clienti che aspettano il loro turno. Poi arriva la sera, ti fermi un attimo su quel conto a fine mese — e il numero racconta sempre la stessa storia, quella che fatica a tornare come vorresti. Conosci bene questa stanchezza: va ben oltre le ore di sonno perse, è la sensazione di correre tutto il giorno e restare comunque ferma, un passo indietro rispetto a dove vorresti essere. Ti sei convinta che la colpa sia tua — poca organizzazione, poco polso, poca qualcosa. Ecco la verità, ed è più semplice di quanto pensi: ti hanno insegnato alla perfezione il mestiere delle mani. La gestione, quella vera, è rimasta un capitolo bianco. Oggi però le cose possono prendere un&apos;altra direzione. Un metodo, dieci minuti due volte a settimana, e la gestione comincia a remare insieme a te, con un impegno piccolo e costante — altro che formule fotocopiate: è una visione del tuo lavoro che diventa finalmente tua. E quando il conto torna, cambia molto più del centro: cambia l&apos;umore quando rientri la sera, la testa leggera a cena con chi ami, una vacanza vissuta davvero, con la testa lì e basta. La serenità economica è anche la conferma che sei brava — ma soprattutto è la sicurezza che porti con te ovunque: a casa, in famiglia, anche in vacanza, quando finalmente stacchi.
              </p>

              {/* Form email compatto in hero — riusa STESSI state/handler del form completo
                  più sotto (#form-section): stessa `email`/`setEmail`, stesso `status`,
                  stesso `handleSubmit`. Nessuna logica duplicata (validazione, rate limit,
                  chiamata a /api/newsletter/subscribe restano solo in handleSubmit). Essendo
                  lo stesso `status` a pilotare anche il form completo più sotto, le due
                  istanze non possono disallinearsi: se una mostra "successo" lo mostra
                  anche l'altra, sempre in sincrono. Qui il messaggio di successo resta
                  volutamente compatto (il dettaglio completo — link guida, spiegazione
                  double opt-in — resta nel form pieno più sotto). */}
              <form onSubmit={handleSubmit} style={{ marginBottom: '28px', maxWidth: '480px' }}>
                {status === 'success' ? (
                  <div style={{ background: 'rgba(255,255,255,0.06)', border: '1.5px solid rgba(255,255,255,0.12)', borderRadius: '12px', padding: '18px 20px' }}>
                    <p style={{ margin: 0, fontSize: '15px', color: '#fff' }}>
                      <strong style={{ color: '#EC4899' }}>✓ Sei dentro!</strong>{' '}
                      <span style={{ color: '#aaa' }}>Controlla l&apos;email per confermare.</span>
                    </p>
                  </div>
                ) : (
                  <>
                    <div style={{ display: 'flex', gap: '10px', flexWrap: 'wrap' }}>
                      <input
                        type="email" value={email}
                        onChange={(e) => setEmail(e.target.value)}
                        placeholder="La tua email" required
                        aria-label="La tua email"
                        style={{ flex: '1 1 220px', padding: '14px 18px', border: '1.5px solid rgba(255,255,255,0.15)', borderRadius: '10px', background: 'rgba(255,255,255,0.06)', fontSize: '15px', outline: 'none', color: '#fff', fontFamily: "var(--font-inter), sans-serif" }}
                      />
                      <button
                        type="submit" disabled={status === 'loading'}
                        style={{ padding: '14px 22px', background: '#EC4899', color: '#fff', fontWeight: 700, border: 'none', borderRadius: '10px', cursor: status === 'loading' ? 'not-allowed' : 'pointer', fontSize: '15px', opacity: status === 'loading' ? 0.6 : 1, fontFamily: "var(--font-inter), sans-serif", whiteSpace: 'nowrap' }}
                      >
                        {status === 'loading' ? 'Un attimo...' : 'Iscriviti gratis →'}
                      </button>
                    </div>
                    {status === 'error' && (
                      <p style={{ marginTop: '8px', color: '#ff8080', fontSize: '13px' }}>{errorMsg}</p>
                    )}
                  </>
                )}
              </form>

              {status !== 'success' && (
                <div style={{ display: 'flex', alignItems: 'center', gap: '20px', flexWrap: 'wrap' }}>
                  <a href="#form-section" style={{ display: 'inline-block', background: '#EC4899', color: '#fff', padding: '16px 32px', borderRadius: '10px', fontWeight: 700, fontSize: '16px', textDecoration: 'none' }}>
                    Iscriviti gratis →
                  </a>
                  <p style={{ fontSize: '13px', color: '#666' }}>Conferma l&apos;email e la miniguida è tua. Più: una domanda al mese a un consulente vero, gratis.</p>
                </div>
              )}
            </div>

          </div>
        </section>

        {/* ── CHI SIAMO ── */}
        <section style={{ background: '#fff', padding: '80px 32px' }}>
          <div style={{ maxWidth: '720px', margin: '0 auto' }}>
            <p style={{ fontSize: '11px', fontWeight: 700, letterSpacing: '0.12em', textTransform: 'uppercase', color: '#EC4899', marginBottom: '16px' }}>
              Chi siamo
            </p>
            <h2 style={{ fontFamily: "var(--font-playfair), Georgia, serif", fontSize: 'clamp(24px, 3.5vw, 36px)', fontWeight: 900, color: '#1a1a0f', lineHeight: 1.15, marginBottom: '24px' }}>
              Quindici anni di centri estetici veri. Il metodo nasce da lì.
            </h2>
            <div style={{ fontSize: 'clamp(15px, 1.8vw, 17px)', color: '#555', lineHeight: 1.85 }}>
              <p style={{ marginBottom: '18px' }}>
                Prima di scrivere una riga su come si gestisce un centro estetico, i centri estetici li abbiamo gestiti — davvero, con le mani in pasta, per oltre quindici anni. Abbiamo coperto turni, tenuto a bada fornitori, attraversato mesi belli e mesi in cui bisognava stringere i denti, imparato a capire le clienti tanto in cabina quanto nei conti di fine anno. Quello che sappiamo sulla gestione è tutto pratica vissuta, fatta di bancone e cassa, di notti passate a far tornare i numeri.
              </p>
              <p style={{ marginBottom: '18px' }}>
                Una parte del lavoro, oggi, la fa anche l&apos;intelligenza artificiale di Beautyx: setaccia case history, ricerche di settore e buone pratiche da centri estetici di tutto il mondo, giorno dopo giorno, cose che altrimenti richiederebbero ore che tu preferisci passare in cabina con una cliente. Un aiuto prezioso, un ingrediente scelto con cura. La ricetta, però, resta un&apos;altra cosa: è il metodo.
              </p>
              <p style={{ marginBottom: '18px' }}>
                Il valore vero comincia lì, quando quel materiale passa attraverso il metodo costruito centro dopo centro, anno dopo anno: diventa un&apos;indicazione concreta, misurabile, che puoi applicare da subito nella tua realtà — i tuoi numeri, le tue clienti, il tuo team. È qui che entra l&apos;esperienza di chi la gestione l&apos;ha fatta sul campo, ed è qui che nasce il supporto vero: qualcuno che ti accompagna, passo dopo passo, a costruire competenze di gestione e autonomia che finora nessuno ti aveva insegnato davvero.
              </p>
              <p>
                Quello che arriva nella tua email due volte a settimana è già cucito addosso al tuo mestiere: spiegato, tradotto in pratica, pronto da usare. Il resto — capire come applicarlo esattamente al tuo centro — lo costruiamo insieme, con il supporto di chi la gestione la conosce da dentro. Dietro ogni newsletter Beautyx c&apos;è un metodo pensato per durare, nato da quindici anni di esperienza reale sul campo, con l&apos;intelligenza artificiale che lo affianca facendo da esploratrice nel mondo.
              </p>
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
                Si legge come una rivista di settore.<br />Si usa come uno strumento di lavoro.
              </h2>
              <div style={{ fontSize: 'clamp(15px, 1.8vw, 17px)', color: '#555', lineHeight: 1.85 }}>
                <p style={{ marginBottom: '18px' }}>
                  Le newsletter di settore ti raccontano le tendenze. Bene — le tendenze servono. Ma noi andiamo un passo più in profondità: <em>cosa significa quella tendenza per la gestione del tuo centro?</em>
                </p>
                <p style={{ marginBottom: '18px' }}>
                  Un tema alla volta, un problema reale, spiegato in modo diretto e chiaro — e una cosa precisa da provare questa settimana: concreta, mirata, pronta all&apos;uso. <em>(Chi sceglie questi temi e come, te l&apos;abbiamo raccontato qui sopra.)</em>
                </p>
                <p style={{ fontFamily: "var(--font-playfair), Georgia, serif", fontStyle: 'italic', fontSize: '18px', color: '#EC4899', borderLeft: '3px solid #EC4899', paddingLeft: '18px', lineHeight: 1.6 }}>
                  È consulenza vera — due volte a settimana, gratis. E una volta al mese, quella consulenza ha anche una faccia, e risponde solo a te.
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
                  titolo: 'Appena confermi: la miniguida',
                  desc: 'Ti mandiamo un\'email, tu confermi con un click — un attimo, non di più. E "10 errori che (quasi) tutte fanno nella gestione del centro" è già lì che ti aspetta.',
                },
                {
                  num: '02',
                  titolo: 'Martedì e venerdì mattina: la newsletter',
                  desc: 'Un tema di gestione, spiegato bene: quello che puoi provare già questa settimana.',
                },
                {
                  num: '03',
                  titolo: 'Una volta al mese: il consulente',
                  desc: "Scrivi la domanda che ti tieni per te da mesi — quella specifica, sul tuo centro. Una persona reale ti risponde pensando proprio al tuo centro, quello vero, con le sue clienti e i suoi numeri. Compresa nell'iscrizione gratuita.",
                },
              ].map((item, i) => (
                <div key={item.num} className="bx-cosa-item">
                  <span aria-hidden="true" className={`bx-cosa-num bx-cosa-num-${i + 1}`}>
                    {item.num}
                  </span>
                  <div style={{ position: 'relative', zIndex: 1 }}>
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
                I primi numeri arrivano a breve — iscriviti per essere tra le prime a leggerli.
              </p>
            )}

            {articoliState.status === 'ready' && (
              <>
                <p style={{ fontSize: 'clamp(15px, 1.8vw, 17px)', color: '#666', lineHeight: 1.7, marginBottom: '28px', maxWidth: '560px' }}>
                  Leggi l'assaggio — il resto è per chi è già dentro.
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
                      <div style={{ marginTop: 'auto', display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '8px', flexWrap: 'wrap' }}>
                        <span style={{ fontSize: '14px', fontWeight: 700, color: '#1a1a0f' }}>Leggi →</span>
                        {!articoliState.unlocked && (
                          <span style={{ fontSize: '11px', fontWeight: 700, letterSpacing: '0.06em', textTransform: 'uppercase', color: '#EC4899', background: '#EC489918', padding: '4px 10px', borderRadius: '999px' }}>
                            Solo per chi è dentro
                          </span>
                        )}
                      </div>
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
                {guidaToken ? (
                  <>
                    <p style={{ color: '#8899aa', fontSize: '15px', lineHeight: 1.7, marginBottom: '20px' }}>
                      La tua guida ti aspetta già, senza bisogno di aprire l'email.
                    </p>
                    <Link
                      href={`/guida?t=${guidaToken}`}
                      style={{ display: 'inline-block', padding: '14px 28px', background: '#EC4899', color: '#fff', fontWeight: 700, borderRadius: '10px', textDecoration: 'none', fontSize: '16px' }}
                    >
                      Vai alla tua guida →
                    </Link>
                    <p style={{ marginTop: '18px', color: '#55667a', fontSize: '13px', lineHeight: 1.6 }}>
                      La newsletter invece arriva regolarmente via email, martedì e venerdì.
                    </p>
                  </>
                ) : (
                  <>
                    <p style={{ color: '#8899aa', fontSize: '15px', lineHeight: 1.7, marginBottom: '14px' }}>
                      Ti abbiamo appena mandato un&apos;email di conferma — di solito arriva in pochi minuti, e se non la vedi subito dai un&apos;occhiata anche allo spam: ogni tanto si nasconde lì.
                    </p>
                    <p style={{ color: '#8899aa', fontSize: '15px', lineHeight: 1.7, marginBottom: '14px' }}>
                      Un click sul link dentro l&apos;email, ed è fatta: è il nostro modo per essere sicuri che la guida arrivi proprio a te, alla casella giusta, quella vera.
                    </p>
                    <p style={{ color: '#8899aa', fontSize: '15px', lineHeight: 1.7 }}>
                      Fatto il click, torna su{' '}
                      <Link href="/guida" style={{ color: '#fff', textDecoration: 'underline' }}>beautyx.it/guida</Link>, reinserisci qui la tua email, e la guida si sblocca — tutta tua.
                    </p>
                  </>
                )}
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
                    {status === 'loading' ? 'Iscrizione in corso...' : 'Iscriviti e sblocca la miniguida →'}
                  </button>
                </div>
                {status === 'error' && (
                  <p style={{ marginTop: '10px', color: '#ff6b6b', fontSize: '13px' }}>{errorMsg}</p>
                )}
                <p style={{ marginTop: '14px', fontSize: '13px', color: '#55667a', lineHeight: 1.6 }}>
                  Conferma l&apos;email e la miniguida è tua, poi la newsletter martedì e venerdì. Puoi disiscriverti quando vuoi.
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
              Ogni anno in Italia aprono circa 7.000 centri estetici. Nello stesso anno, altrettanti chiudono. Pensi davvero che dipenda dalla loro bravura come estetiste? O che il problema sia un altro — la gestione del centro, quella vera?<br /><br />
              <strong style={{ fontStyle: 'normal', color: '#EC4899' }}>Tu da che parte vuoi stare?</strong>
            </p>
          </div>
        </section>

        {/* ── FAQ ── */}
        <section style={{ background: '#f5f1ea', padding: '80px 32px' }}>
          <div style={{ maxWidth: '720px', margin: '0 auto' }}>
            <h2 style={{ fontFamily: "var(--font-playfair), Georgia, serif", fontSize: 'clamp(24px, 3.5vw, 36px)', fontWeight: 700, color: '#1a1a0f', marginBottom: '48px', lineHeight: 1.2 }}>
              I dubbi più comuni, chiariti subito.
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
            © {new Date().getFullYear()} Beautyx ·{' '}
            <Link href="/privacy" style={{ color: '#666', textDecoration: 'none' }}>Privacy</Link>
            <GuidaFooterLink style={{ color: '#666', textDecoration: 'none' }} separator=" · " />
          </p>
          <p style={{ fontSize: '11px', color: '#444', marginTop: '8px' }}>
            Beautyx è un progetto di Svetage S.r.l. — P.IVA/C.F. 01959270495 · Via Toscana 6/8, 57128 Livorno (LI), Italia · REA LI 216353 · Capitale sociale 10.000 € interamente versato
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

              {articoliState.unlocked && activeArticle.contenuto ? (
                <>
                  <div
                    className="bx-article"
                    dangerouslySetInnerHTML={{ __html: activeArticle.contenuto }}
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
                </>
              ) : (
                <div style={{ marginTop: '8px', paddingTop: '24px', borderTop: '1px solid #e7e0d5', textAlign: 'center' }}>
                  <p style={{ fontSize: '16px', color: '#333', lineHeight: 1.8, marginBottom: '24px' }}>
                    Il testo intero di ogni numero è il primo regalo per chi si iscrive — il resto arriva dopo, due volte a settimana, dritto in email. Entra anche tu: iscriviti, conferma con un click, e questo numero (e tutti gli altri) è tuo.
                  </p>
                  <a
                    href="#form-section"
                    onClick={() => setActiveArticle(null)}
                    style={{ display: 'inline-block', background: '#EC4899', color: '#fff', padding: '14px 28px', borderRadius: '10px', fontWeight: 700, fontSize: '15px', textDecoration: 'none' }}
                  >
                    Voglio leggere tutto →
                  </a>
                </div>
              )}
            </article>
          </div>
        )}

      </div>
    </>
  )
}
