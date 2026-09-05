'use client'

import Image from 'next/image'
import Link from 'next/link'
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
export default function ReportPage() {
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
            Report CURA · La diagnosi del tuo centro, gratis nel lancio
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
            Non è un test online e non è un oroscopo. Il Report CURA guarda
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
            Cosa trovi nel report
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
              centro, non di un abbonamento. Falla ora, dentro il countdown
              qui sopra, e non paghi nulla. Se il countdown scade prima,
              resta un investimento singolo — e diventa credito pieno se poi
              scegli di continuare con noi.
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
              errori più comuni, tua da subito, mentre il report prende forma.
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
