'use client'

import Image from 'next/image'
import Link from 'next/link'
import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { useAuth } from '@/contexts/AuthContext'
import GuidaFooterLink from '@/components/common/GuidaFooterLink'
import ReportCountdownBanner from '@/components/common/ReportCountdownBanner'

// Pagina pubblica del Report di profiling CURA (nome rinominato da CARE il
// 03/09/2026 per collisione di marchio — vedi nome-metodo-CARE.md) — vera
// CTA del funnel per il "traffico caldo" (chi ci conosce già), punto di
// atterraggio futuro per ads/outreach mirati sul report.
//
// Meccanismo interno (per il team, NON per il testo pubblico): chi completa
// il report entro i 90 giorni dal lancio non paga nulla (valore 60€ in
// regalo); chi lo completa dopo paga 60€ una tantum, mai un canone; il
// credito è scalabile sull'abbonamento se poi si continua con la piattaforma.
//
// *** AGGIORNAMENTO 05/09/2026 (Federica) — riscrittura completa di hero e
// blocco prezzo. Bocciatura durissima di Mason: "sembra una vaccinazione",
// "non si capisce a che cazzo serve il report". Causa reale: la spiegazione
// sopra (una tantum / non un abbonamento) — pensata per il team — era finita
// nel testo per le clienti, in tre punti diversi, con toni da foglietto
// illustrativo. Ora è bandita dal copy pubblico: se proprio serve compare
// UNA sola volta, di sfuggita, nel blocco prezzo, mai come titolo o argomento
// principale. Il vero problema non era la frequenza d'uso, era che non si
// capiva COSA FA il report: hero e blocco prezzo ora partono da lì — è una
// diagnosi sui dati veri di quel centro, non un test online, non un
// oroscopo — e dal perché convenga farlo ora (gratis solo nel lancio).
//
// STATO ATTUALE (28/08/2026): il motore del questionario e la UI del quiz
// (punti 3/8 del piano tecnico) non sono ancora pronti — questa pagina è
// intenzionalmente una landing/placeholder che comunica il framing corretto
// e incanala verso la registrazione gratuita esistente (/signup), NON verso
// un questionario funzionante. Vedi piano-sviluppo-report-care.md, sezione
// in cima, per il dettaglio della sequenza.
// Fix bug (21/09/2026, task #219, segnalato da Mason): "Identikit CURA" da
// dentro la piattaforma (voce in Navbar, raggiungibile anche da /listino)
// portava SEMPRE qui, a questa landing pubblica con invito a registrarsi —
// assurdo per chi ha già un account ed è già loggato. Questa pagina resta la
// landing pubblica invariata SOLO per un visitatore anonimo (vedi
// ReportPublicLanding sotto, invariata). Per un utente autenticato, il
// componente sotto (ReportLoggedInGate) chiede lo stato reale
// dell'Identikit a /api/identikit/status e decide dove portarlo:
// - non ancora attivato, dentro i 90gg gratis -> CTA "Attivalo gratis" con
//   lo stesso countdown già in uso qui sotto (riusato, non duplicato);
// - non ancora attivato, fuori dai 90gg -> messaggio di acquisto (nessun
//   checkout reale esiste ancora per l'Identikit da solo, stesso gap già
//   noto per il Tool Listino — non ne inventiamo uno qui, vedi commento
//   dedicato più sotto);
// - già attivato -> apre direttamente il questionario o il report, a
//   seconda di dove si trova nel suo percorso (mai la landing marketing).
export default function ReportPage() {
  const { user, loading } = useAuth()

  if (loading) {
    return (
      <div style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', background: '#f5f1ea' }}>
        <div style={{ width: 32, height: 32, border: '3px solid #EC4899', borderTopColor: 'transparent', borderRadius: '50%' }} />
      </div>
    )
  }

  if (!user) {
    return <ReportPublicLanding />
  }

  return <ReportLoggedInGate />
}

// ReportLoggedInGate — interroga /api/identikit/status e:
// (a) mentre carica, mostra uno spinner (mai un flash della landing pubblica
//     né un flash del questionario sbagliato);
// (b) se già attivato, fa un redirect immediato (mai un secondo click):
//     report pronto -> /questionario/risultato, altrimenti -> /questionario
//     (la pagina del questionario riprende da sola da dove l'utente aveva
//     lasciato, vedi commento in app/questionario/page.js — non serve
//     sapere qui il dettaglio esatto dello step);
// (c) se non attivato, mostra una card di attivazione invece della landing
//     marketing: dentro i 90gg un vero pulsante "Attivalo gratis" (chiama
//     /api/identikit/activate) con lo stesso ReportCountdownBanner usato
//     nella landing pubblica; fuori dai 90gg, un messaggio di acquisto
//     onesto (vedi nota sotto sul checkout non ancora esistente).
function ReportLoggedInGate() {
  const router = useRouter()
  const [status, setStatus] = useState(null) // { active, stage, withinFreeWindow, hasCentro } | 'error'
  const [activating, setActivating] = useState(false)
  const [activateError, setActivateError] = useState(null)

  useEffect(() => {
    let cancelled = false
    fetch('/api/identikit/status')
      .then(r => r.json())
      .then(data => {
        if (cancelled) return
        if (data?.error) { setStatus('error'); return }
        setStatus(data)
        if (data.active) {
          router.replace(data.stage === 'completed' ? '/questionario/risultato' : '/questionario')
        }
      })
      .catch(() => { if (!cancelled) setStatus('error') })
    return () => { cancelled = true }
  }, [router])

  const handleActivate = async () => {
    setActivating(true)
    setActivateError(null)
    try {
      const res = await fetch('/api/identikit/activate', { method: 'POST' })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error || 'Attivazione non riuscita')
      router.replace('/questionario')
    } catch (err) {
      setActivateError(err.message)
      setActivating(false)
    }
  }

  // Caricamento status, o attivo-e-in-attesa-del-redirect: stesso spinner,
  // mai un flash di contenuto sbagliato nel mezzo (l'errore reale è gestito
  // esplicitamente più sotto, come stato distinto).
  if (status === null || (status && status.active)) {
    return (
      <div style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', background: '#f5f1ea' }}>
        <div style={{ width: 32, height: 32, border: '3px solid #EC4899', borderTopColor: 'transparent', borderRadius: '50%' }} />
      </div>
    )
  }

  if (status === 'error') {
    return (
      <div style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', background: '#f5f1ea', padding: 24 }}>
        <div style={{ maxWidth: 420, textAlign: 'center' }}>
          <p style={{ fontSize: 15, color: '#555', marginBottom: 16 }}>
            Non riusciamo a verificare lo stato del tuo Identikit in questo momento.
          </p>
          <Link href="/dashboard" style={{ color: '#EC4899', fontWeight: 700, textDecoration: 'none' }}>Torna alla dashboard →</Link>
        </div>
      </div>
    )
  }

  // Non attivo. Non ha ancora nemmeno un centro (registrazione a metà) —
  // stesso passo che manca comunque, indipendentemente dall'Identikit.
  if (!status.hasCentro) {
    return (
      <div style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', background: '#f5f1ea', padding: 24 }}>
        <div style={{ maxWidth: 420, textAlign: 'center' }}>
          <p style={{ fontSize: 15, color: '#555', marginBottom: 16 }}>
            Completa prima la creazione del tuo centro: l&apos;Identikit si attiva insieme.
          </p>
          <Link href="/impostazioni?primo-accesso=1" style={{ display: 'inline-block', padding: '14px 28px', background: '#EC4899', color: '#fff', fontWeight: 700, borderRadius: 12, textDecoration: 'none' }}>
            Crea il tuo centro →
          </Link>
        </div>
      </div>
    )
  }

  return (
    <div style={{ background: '#f5f1ea', minHeight: '100vh', fontFamily: "var(--font-inter), system-ui, sans-serif", color: '#1a1a0f' }}>
      <header style={{ paddingTop: '28px', display: 'flex', justifyContent: 'center', alignItems: 'center', gap: '8px' }}>
        <Image src="/logo_beautyx-oro.png" alt="Beautyx" width={26} height={28} style={{ borderRadius: '4px' }} />
        <span style={{ fontWeight: 700, fontSize: '15px', color: '#1a1a0f' }}>Beautyx</span>
      </header>

      <section style={{ maxWidth: '560px', margin: '0 auto', padding: '40px 24px 56px', textAlign: 'center' }}>
        <h1 style={{
          fontFamily: "var(--font-playfair), Georgia, serif",
          fontSize: 'clamp(26px, 5.5vw, 36px)', fontWeight: 800, lineHeight: 1.2, marginBottom: '18px',
        }}>
          {status.withinFreeWindow ? 'Il tuo Identikit strategico CURA ti aspetta.' : 'Sblocca il tuo Identikit strategico CURA.'}
        </h1>

        <p style={{ fontSize: 'clamp(15px, 3vw, 17px)', color: '#444', lineHeight: 1.7, marginBottom: '28px' }}>
          Non è un test online: è la diagnosi scritta sui dati veri del tuo centro — dove sei
          bloccata oggi e qual è la prima mossa da fare.
        </p>

        {status.withinFreeWindow ? (
          <>
            <div style={{ display: 'flex', justifyContent: 'center', marginBottom: '22px' }}>
              <ReportCountdownBanner variant="prominent" />
            </div>
            {activateError && (
              <p style={{ color: '#B0473E', fontSize: 13.5, marginBottom: 12 }}>{activateError}</p>
            )}
            <button
              onClick={handleActivate}
              disabled={activating}
              style={{
                padding: '18px 36px', background: '#EC4899', color: '#fff', fontWeight: 700, fontSize: '16px',
                borderRadius: '12px', border: 'none', cursor: activating ? 'default' : 'pointer',
                opacity: activating ? 0.7 : 1,
              }}
            >
              {activating ? 'Attivazione…' : 'Attivalo gratis →'}
            </button>
          </>
        ) : (
          // Fuori dai 90gg gratuiti: NESSUN checkout Stripe esiste ancora per
          // l'Identikit acquistato da solo (verificato sul codice reale, stesso
          // gap già noto e documentato per il Tool Listino — vedi memory/generale.md,
          // "Modello commerciale corretto"). Non inventiamo un flusso di
          // pagamento finto: messaggio onesto + contatto, come da convenzione
          // del team su ciò che non è ancora costruito.
          <div style={{ background: '#fff', border: '2px solid #1a1a0f', borderRadius: 16, padding: '24px 26px' }}>
            <p style={{ fontSize: 15, color: '#444', lineHeight: 1.7, marginBottom: 10 }}>
              La finestra gratuita dei 90 giorni è terminata. L&apos;Identikit strategico CURA
              costa 60€ una tantum — scrivici e te lo attiviamo noi.
            </p>
            <a href="mailto:info@beautyx.it" style={{ color: '#EC4899', fontWeight: 700, textDecoration: 'none' }}>
              info@beautyx.it →
            </a>
          </div>
        )}
      </section>
    </div>
  )
}

function ReportPublicLanding() {
  return (
    <>
      <style>{`
        *, *::before, *::after { box-sizing: border-box; margin: 0; padding: 0; }

        /* Redesign 22/09/2026 (task #227) — SOSTITUISCE il redesign del task
           #226 di poche ore prima. Quello (hero a due colonne, immagine dentro
           un riquadro con bordi arrotondati/vignettatura sfumata su sfondo
           crema) seguiva alla lettera il gate di Elena del 21/09
           (drafts/gate-elena-redesign-report-listino-2026-09-21.md), ma Mason
           lo ha bocciato lo stesso giorno appena visto dal vivo: vuole lo
           STESSO trattamento della hero/sezione Identikit di /newsletter —
           foto desaturata a piena larghezza con overlay scuro, non un
           riquadro su sfondo chiaro. Le classi .bx-hero-grid/.bx-hero-image-frame
           (layout a due colonne, cornice/vignettatura) sono quindi rimosse:
           la nuova hero è una sezione full-bleed unica, niente breakpoint per
           il layout immagine (niente più immagine "a parte" da disporre in
           colonna — è lo sfondo dell'intera sezione), copy invariato. */
        .bx-hero-p-center { margin-left: auto; margin-right: auto; }

        /* Pannello "Cosa trovi" — pass da testo puro a blocco che stacca per
           colore/consistenza (richiesta esplicita del gate Elena, Parte 3). */
        .bx-cosa-trovi-panel {
          background: linear-gradient(180deg, rgba(236,73,153,0.07), rgba(255,228,77,0.07));
          border-radius: 32px;
          padding: 48px 28px;
        }
        .bx-pull-quote {
          font-family: var(--font-playfair), Georgia, serif;
          font-style: italic;
          font-weight: 700;
          color: #1a1a0f;
          text-align: center;
          line-height: 1.35;
          margin: 0 auto 36px;
          max-width: 480px;
          font-size: clamp(20px, 4vw, 27px);
        }
      `}</style>

      <div style={{
        background: '#f5f1ea',
        minHeight: '100vh',
        fontFamily: "var(--font-inter), system-ui, sans-serif",
        color: '#1a1a0f',
      }}>

        {/* ── LOGO ── */}
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
            width={26}
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

        {/* ── HERO ──
            Redesign 22/09/2026 (task #227, sostituisce il task #226 di poche
            ore prima — vedi commento nello style sopra). Copy INVARIATO
            (Federica, drafts/copy-redesign-report-listino-2026-09-21.md):
            solo il contenitore cambia, da due colonne su crema con immagine
            in riquadro a foto piena larghezza desaturata con overlay scuro +
            testo sopra — stesso identico pattern della sezione Identikit su
            /newsletter (gradiente bordeaux di base, overlay radiale rosa,
            foto full-bleed sotto). Immagine: design Canva DAHV0IFvZDE
            (Chiara, drafts/immagini-redesign-report-listino-2026-09-21.md) —
            stesso file di prima, cambia solo come viene mostrato. */}
        <section style={{
          position: 'relative',
          background: 'linear-gradient(180deg, #2a1420 0%, #23111c 55%, #1f0f18 100%)',
          padding: '72px 24px 96px',
          overflow: 'hidden',
        }}>
          {/* Foto full-bleed — desaturata via filtro CSS (il sorgente Canva è
              a colori pieni, non pre-desaturato come /images/hero-titolare-bw.jpg
              usato nella hero di /newsletter) + opacità ridotta cosi il
              gradiente bordeaux sotto resta il vero "colore" della sezione e
              il testo sopra resta leggibile senza un secondo scrim dedicato.
              File NON ancora presente su disco — vedi nota nel report di
              Davide: stesso path già referenziato da prima (/hero-report.jpg),
              cambia solo il trattamento CSS, non il nome del file. */}
          <div style={{
            position: 'absolute', inset: 0,
            backgroundImage: 'url(/hero-report.jpg)',
            backgroundSize: 'cover',
            backgroundPosition: 'center 15%',
            filter: 'grayscale(0.5) contrast(1.05) brightness(0.85)',
            opacity: 0.55,
          }} />
          <div style={{
            position: 'absolute', inset: 0,
            background: 'radial-gradient(circle at 50% 0%, rgba(236,72,153,0.26), transparent 60%)',
            pointerEvents: 'none',
          }} />

          <div style={{ position: 'relative', maxWidth: '720px', margin: '0 auto', textAlign: 'center' }}>
            {/* Badge — invariato */}
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
              Identikit strategico CURA · La diagnosi del tuo centro, gratis per il lancio
            </div>

            {/* Headline — dolore concreto, non il doppio senso della parola.
                Prima riga passata da scuro (#1a1a0f, pensato per sfondo
                crema) a bianco: unico cambio di colore nell'H1, la seconda
                riga era già rosa ed è rimasta identica. */}
            <h1 style={{
              fontFamily: "var(--font-playfair), Georgia, serif",
              lineHeight: 1.1,
              marginBottom: '22px',
            }}>
              <span style={{
                display: 'block',
                fontSize: 'clamp(32px, 7vw, 52px)',
                fontWeight: 900,
                color: '#fff',
              }}>
                Ti prendi cura di tutte.
              </span>
              <span style={{
                display: 'block',
                fontSize: 'clamp(32px, 7vw, 52px)',
                fontWeight: 700,
                color: '#EC4899',
              }}>
                Chi si prende CURA di te?
              </span>
            </h1>

            {/* Sottotitolo — copy invariato (Federica, 21/09/2026), solo
                colore portato da grigio scuro (#444) a bianco quasi pieno per
                restare leggibile sopra la foto scura. */}
            <p className="bx-hero-p-center" style={{
              fontSize: 'clamp(16px, 4vw, 19px)',
              color: 'rgba(255,255,255,0.88)',
              lineHeight: 1.65,
              marginBottom: '20px',
              maxWidth: '520px',
            }}>
              Non è un test online, né un oroscopo: è una diagnosi seria.
              L'Identikit strategico CURA guarda dentro i numeri veri del
              tuo centro — chi sono le tue clienti, come si muove la tua
              agenda, come stanno davvero i conti — e torna con due cose
              sole, chiare: dove sei bloccata oggi, e qual è la prima mossa
              da fare. Fatto apposta per il tuo centro, quello vero.
            </p>

            {/* ── CTA PRINCIPALE — invariata ── */}
            <div style={{ marginBottom: '14px' }}>
              <Link
                href="/signup"
                style={{
                  display: 'inline-block',
                  padding: '18px 36px',
                  background: '#EC4899',
                  color: '#fff',
                  fontWeight: 700,
                  fontSize: '16px',
                  borderRadius: '12px',
                  textDecoration: 'none',
                  fontFamily: "var(--font-inter), sans-serif",
                  letterSpacing: '0.01em',
                }}
              >
                Crea il tuo account gratuito →
              </Link>
            </div>

            <p style={{ fontSize: '13px', color: 'rgba(255,255,255,0.55)', marginBottom: '8px' }}>
              Hai già un account?{' '}
              <Link href="/login" style={{ color: '#EC4899', fontWeight: 600, textDecoration: 'none' }}>
                Accedi
              </Link>
            </p>

            <p style={{ fontSize: '13px', color: 'rgba(255,255,255,0.55)', marginBottom: '8px' }}>
              Con l'account arriva in regalo anche la newsletter di Beautyx, gratuita, ogni martedì e venerdì.
            </p>

            {/* Prova di competenza reale — i 15 anni sono dei fondatori, mai
                dell'azienda Beautyx (regola in vigore in memory/federica.md).
                Risponde all'obiezione implicita "sarà un algoritmo che tira
                a indovinare". */}
            <p style={{ fontSize: '13px', color: 'rgba(255,255,255,0.55)', fontStyle: 'italic', marginBottom: '8px', lineHeight: 1.6 }}>
              Dietro ogni identikit ci sono i fondatori di Beautyx: 15 anni di esperienza vera nella gestione di centri estetici. L'AI legge i tuoi dati; il metodo che li interpreta viene da lì.
            </p>

            {/* Nota di onestà: il questionario è in arrivo, non live oggi */}
            <p className="bx-hero-p-center" style={{
              fontSize: '13px',
              color: 'rgba(255,255,255,0.5)',
              lineHeight: 1.6,
              maxWidth: '460px',
              marginTop: '10px',
            }}>
              Il questionario completo sta per partire. Registrandoti adesso il tuo account gratuito parte comunque, sei tra le prime ad accedere al report, e i 90 giorni gratis restano tuoi dal primo giorno.
            </p>
          </div>
        </section>

        {/* ── SEPARATORE ── */}
        <div style={{ maxWidth: '560px', margin: '40px auto 0', padding: '0 24px' }}>
          <hr style={{ border: 'none', borderTop: '1px solid #ddd' }} />
        </div>

        {/* ── COSA SCOPRI ──
            Redesign 22/09/2026: il pannello ora stacca per colore/consistenza
            (richiesta esplicita del gate Elena, Parte 3 — "il resto della
            pagina sotto l'hero resta 100% testo puro"), con una citazione in
            Playfair grande che riprende testualmente il sottotitolo già
            approvato (nessun copy nuovo, solo enfasi visiva). */}
        <section style={{ maxWidth: '700px', margin: '0 auto', padding: '48px 24px' }}>
          <div className="bx-cosa-trovi-panel">
            <p className="bx-pull-quote">
              &ldquo;Dove sei bloccata oggi, e qual è la prima mossa da fare.&rdquo;
            </p>

            <p style={{
              textAlign: 'center',
              fontSize: '11px',
              fontWeight: 700,
              letterSpacing: '0.12em',
              textTransform: 'uppercase',
              color: '#999',
              marginBottom: '24px',
            }}>
              Cosa trovi nel tuo identikit strategico
            </p>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
              {[
                {
                  titolo: 'Dove il tuo centro sta perdendo energia',
                  desc: 'Il punto preciso dove oggi dai più di quanto ti torna indietro — che sia nelle clienti che non tornano, nel personale che non rende come dovrebbe, o nelle spese cresciute senza che te ne accorgessi.',
                },
                {
                  titolo: 'La prima mossa, non dieci insieme',
                  desc: 'Non un elenco di cose da sistemare. Una priorità sola, quella vera — la leva che oggi sblocca davvero il resto.',
                },
                {
                  titolo: 'Il punto di partenza per il confronto con il consulente',
                  desc: 'La base concreta per la tua domanda mensile gratuita — a un consulente vero, Luigi, che lavora insieme all\'AI che ha già letto i tuoi dati. Un percorso che continua con te, non un file che chiudi e dimentichi.',
                },
              ].map((v, i) => (
              <div
                key={i}
                style={{
                  background: '#fff',
                  border: '1.5px solid rgba(26,26,15,0.08)',
                  boxShadow: '0 2px 14px rgba(26,26,15,0.05)',
                  borderRadius: '16px',
                  padding: '24px 26px',
                  display: 'flex',
                  gap: '18px',
                  alignItems: 'flex-start',
                }}
              >
                <span style={{
                  fontFamily: "var(--font-playfair), serif",
                  fontWeight: 800,
                  fontSize: '15px',
                  color: '#1a1a0f',
                  background: '#FFE44D',
                  borderRadius: '50%',
                  width: '34px',
                  height: '34px',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  flexShrink: 0,
                }}>
                  {String(i + 1).padStart(2, '0')}
                </span>
                <div>
                  <h3 style={{
                    fontFamily: "var(--font-playfair), serif",
                    fontWeight: 700,
                    fontSize: '19px',
                    color: '#1a1a0f',
                    marginBottom: '8px',
                    lineHeight: 1.3,
                  }}>
                    {v.titolo}
                  </h3>
                  <p style={{ fontSize: '15.5px', color: '#555', lineHeight: 1.7 }}>
                    {v.desc}
                  </p>
                </div>
              </div>
              ))}
            </div>
          </div>
        </section>

        {/* ── PREZZO E URGENZA TEMPORALE (mai scarsità di quantità) ── */}
        <section style={{ maxWidth: '560px', margin: '0 auto', padding: '0 24px 24px' }}>
          <div style={{
            background: '#fff',
            border: '2.5px solid #1a1a0f',
            borderRadius: '16px',
            padding: '28px 28px',
            textAlign: 'center',
          }}>
            <h3 style={{
              fontFamily: "var(--font-playfair), serif",
              fontSize: '20px',
              fontWeight: 700,
              marginBottom: '12px',
              color: '#1a1a0f',
            }}>
              La tua diagnosi vale 60€. Ora è gratis.
            </h3>

            {/* Countdown visibile dei 90 giorni (richiesta di Mason dopo il
                collaudo dal vivo del 04/09/2026). Si nasconde da solo finché
                NEXT_PUBLIC_REPORT_LAUNCH_DATE non è impostata su Vercel — vedi
                components/common/ReportCountdownBanner.js. NON ancora
                impostata oggi: il motore del questionario (task #152/#153)
                non è ancora pronto/collaudato end-to-end, quindi qui non
                comparirà nulla finché quella condizione non è soddisfatta —
                segnalato esplicitamente a Mason, non un bug silenzioso. */}
            <div style={{ display: 'flex', justifyContent: 'center', marginBottom: '18px' }}>
              <ReportCountdownBanner variant="prominent" />
            </div>

            <p style={{ color: '#555', fontSize: '15px', lineHeight: 1.7 }}>
              Vale 60€: è il prezzo di una diagnosi scritta sui dati veri del
              tuo centro. Il countdown qui sopra segna il tempo che hai per
              farla gratis — non uno sconto lampo, è la finestra del lancio.
              Quando si chiude, il prezzo torna pieno: 60€.
            </p>
          </div>
        </section>

        {/* ── OMAGGIO: miniguida come bonus, non alternativa al report ── */}
        <section style={{ maxWidth: '560px', margin: '0 auto', padding: '0 24px 56px' }}>
          <div style={{
            background: 'rgba(26,26,15,0.05)',
            border: '1.5px dashed #ccc',
            borderRadius: '14px',
            padding: '22px 24px',
            textAlign: 'center',
          }}>
            <p style={{ fontSize: '13.5px', color: '#666', lineHeight: 1.7, marginBottom: '10px' }}>
              Un regalo che arriva comunque, subito: la miniguida gratuita sui
              10 errori più comuni. Non aspetta che l'identikit sia pronto —
              è già tua, da leggere mentre il resto prende forma.
            </p>
            <Link href="/miniguida" style={{ color: '#EC4899', fontWeight: 700, fontSize: '13.5px', textDecoration: 'none' }}>
              Ricevi la miniguida gratuita →
            </Link>
          </div>
        </section>

        {/* ── FOOTER MINIMAL ── */}
        <footer style={{
          borderTop: '1px solid #e0dbd3',
          padding: '20px 24px',
          textAlign: 'center',
        }}>
          <p style={{ fontSize: '12px', color: '#bbb' }}>
            © {new Date().getFullYear()} Beautyx ·{' '}
            <Link href="/privacy" style={{ color: '#bbb', textDecoration: 'none' }}>Privacy</Link>
            <GuidaFooterLink style={{ color: '#bbb', textDecoration: 'none' }} separator=" · " />
          </p>
        </footer>

      </div>
    </>
  )
}
