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

        {/* ── HERO ── */}
        <section style={{
          maxWidth: '640px',
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
            Identikit strategico CURA · La diagnosi del tuo centro, gratis nel lancio
          </div>

          {/* Headline — dolore concreto, non il doppio senso della parola */}
          <h1 style={{
            fontFamily: "var(--font-playfair), Georgia, serif",
            lineHeight: 1.1,
            marginBottom: '22px',
          }}>
            <span style={{
              display: 'block',
              fontSize: 'clamp(32px, 7vw, 52px)',
              fontWeight: 900,
              color: '#1a1a0f',
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

          {/* Sottotitolo — riscritto da zero (05/09/2026, Federica): il problema
              non era la frequenza d'uso, era che non si capiva cosa fa davvero il
              report. Qui si dice chiaro: prende i dati veri di QUEL centro e dice
              dove è bloccato oggi e cosa fare per prima — non un test generico,
              non un oroscopo, non un elenco di consigli. */}
          <p style={{
            fontSize: 'clamp(16px, 4vw, 19px)',
            color: '#444',
            lineHeight: 1.65,
            marginBottom: '32px',
            maxWidth: '520px',
            margin: '0 auto 32px',
          }}>
            Non è un test online e non è un oroscopo. L'Identikit strategico CURA guarda
            i dati veri del tuo centro — clienti, agenda, conto — e ti dice
            due cose chiare: dove sei bloccata oggi, e qual è la prima mossa
            da fare. Scritto su misura per il tuo centro, quello vero: non
            per "un centro estetico" qualsiasi.
          </p>

          {/* ── CTA PRINCIPALE ── */}
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

          <p style={{ fontSize: '13px', color: '#888', marginBottom: '8px' }}>
            Hai già un account?{' '}
            <Link href="/login" style={{ color: '#EC4899', fontWeight: 600, textDecoration: 'none' }}>
              Accedi
            </Link>
          </p>

          <p style={{ fontSize: '13px', color: '#888', marginBottom: '8px' }}>
            Con l'account arriva anche la newsletter gratuita di Beautyx, ogni martedì e venerdì.
          </p>

          {/* Nota di onestà: il questionario è in arrivo, non live oggi */}
          <p style={{
            fontSize: '13px',
            color: '#999',
            lineHeight: 1.6,
            maxWidth: '460px',
            margin: '18px auto 0',
          }}>
            Il questionario completo sta per essere attivato. Registrandoti
            ora fai partire comunque il tuo account gratuito e sarai tra le
            prime ad accedere al report, senza perdere i 90 giorni gratis.
          </p>
        </section>

        {/* ── SEPARATORE ── */}
        <div style={{ maxWidth: '560px', margin: '40px auto 0', padding: '0 24px' }}>
          <hr style={{ border: 'none', borderTop: '1px solid #ddd' }} />
        </div>

        {/* ── COSA SCOPRI ── */}
        <section style={{ maxWidth: '640px', margin: '0 auto', padding: '48px 24px' }}>
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
                titolo: 'Dove il centro è bloccato',
                desc: 'Il punto preciso — clienti, personale o spese — dove stai spendendo più energia di quella che ti torna indietro.',
              },
              {
                titolo: 'La leva giusta da muovere per prima',
                desc: 'Una priorità concreta, quella che oggi sblocca davvero il resto.',
              },
              {
                titolo: 'Un punto di partenza per parlarne con noi',
                desc: 'La base della tua domanda mensile gratuita al consulente: un percorso che continua con te.',
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
              Vale 60€: è il prezzo di una diagnosi scritta sui dati del tuo
              centro. Hai 90 giorni per farla gratis, proprio ora, dentro il
              countdown qui sopra. Passata la finestra, torna il prezzo
              pieno — 60€.
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
              Un regalo che arriva comunque: la miniguida gratuita sui 10
              errori più comuni, tua da subito, mentre il tuo identikit strategico prende forma.
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
