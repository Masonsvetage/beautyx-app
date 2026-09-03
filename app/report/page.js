'use client'

import Image from 'next/image'
import Link from 'next/link'
import GuidaFooterLink from '@/components/common/GuidaFooterLink'

// Pagina pubblica del Report di profiling CURA (nome rinominato da CARE il
// 03/09/2026 per collisione di marchio — vedi nome-metodo-CARE.md) — vera
// CTA del funnel per il "traffico caldo" (chi ci conosce già), punto di
// atterraggio futuro per ads/outreach mirati sul report. Framing: gratis
// per i primi 90 giorni dal lancio, poi 60€ scalabili come credito
// sull'abbonamento (mai due volte).
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
            Report CURA · Gratis nei primi 90 giorni
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
              fontStyle: 'italic',
              color: '#EC4899',
            }}>
              Chi si prende cura di te?
            </span>
          </h1>

          {/* Sottotitolo — cosa fa il report, senza spiegare il metodo */}
          <p style={{
            fontSize: 'clamp(16px, 4vw, 19px)',
            color: '#444',
            lineHeight: 1.65,
            marginBottom: '32px',
            maxWidth: '520px',
            margin: '0 auto 32px',
          }}>
            Il Report CURA è una fotografia onesta di dove il tuo centro è
            bloccato — e di cosa puoi far ripartire per prima, subito. Nasce
            da un metodo che guardiamo insieme a te, non un test online
            generico: risponde a te, titolare, non alla tua cliente.
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

          <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
            {[
              {
                titolo: 'Dove il centro è bloccato',
                desc: 'Non un voto generico: il punto preciso — clienti, personale o spese — dove stai spendendo più energia di quella che ti torna indietro.',
              },
              {
                titolo: 'La leva giusta da muovere per prima',
                desc: 'Una sola priorità concreta, non dieci consigli tutti uguali. Quella che oggi sblocca davvero il resto.',
              },
              {
                titolo: 'Un punto di partenza per parlarne con noi',
                desc: 'Il report è la base della domanda mensile gratuita al consulente — non resta un PDF chiuso in un cassetto.',
              },
            ].map((v, i) => (
              <div
                key={i}
                style={{
                  background: '#1a1a0f',
                  borderRadius: '14px',
                  padding: '22px 24px',
                  display: 'flex',
                  gap: '16px',
                  alignItems: 'flex-start',
                }}
              >
                <span style={{
                  fontFamily: "var(--font-playfair), serif",
                  fontSize: '13px',
                  fontWeight: 700,
                  color: '#EC4899',
                  flexShrink: 0,
                  marginTop: '2px',
                  minWidth: '20px',
                }}>
                  {String(i + 1).padStart(2, '0')}
                </span>
                <div>
                  <h3 style={{
                    fontFamily: "var(--font-playfair), serif",
                    fontWeight: 700,
                    fontSize: '15px',
                    color: '#f5f1ea',
                    marginBottom: '6px',
                    lineHeight: 1.35,
                  }}>
                    {v.titolo}
                  </h3>
                  <p style={{ fontSize: '13px', color: '#aaa', lineHeight: 1.6 }}>
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
              Gratis ora. Mai un doppio pagamento dopo.
            </h3>
            <p style={{ color: '#555', fontSize: '15px', lineHeight: 1.7, marginBottom: '10px' }}>
              Per i primi 90 giorni dal lancio il Report CURA è completamente
              gratuito. Passato questo periodo costa <strong>60€</strong> —
              ma se poi scegli di proseguire con l'abbonamento alla
              piattaforma Beautyx, quei 60€ diventano credito pieno
              sull'abbonamento: non paghi due volte.
            </p>
            <p style={{ color: '#999', fontSize: '12.5px', lineHeight: 1.6 }}>
              Nessun limite di posti: il vantaggio è nel farlo ora, mentre è gratis.
            </p>
          </div>
        </section>

        {/* ── ALTERNATIVA PER CHI NON CI CONOSCE ANCORA (traffico freddo) ── */}
        <section style={{ maxWidth: '560px', margin: '0 auto', padding: '0 24px 56px' }}>
          <div style={{
            background: 'rgba(26,26,15,0.05)',
            border: '1.5px dashed #ccc',
            borderRadius: '14px',
            padding: '22px 24px',
            textAlign: 'center',
          }}>
            <p style={{ fontSize: '13.5px', color: '#666', lineHeight: 1.7, marginBottom: '10px' }}>
              Preferisci un primo passo più leggero? La miniguida gratuita sui
              10 errori più comuni è un buon punto di partenza, senza impegno.
            </p>
            <Link href="/miniguida" style={{ color: '#EC4899', fontWeight: 700, fontSize: '13.5px', textDecoration: 'none' }}>
              Scarica la miniguida gratuita →
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
            © 2025 Beautyx ·{' '}
            <Link href="/privacy" style={{ color: '#bbb', textDecoration: 'none' }}>Privacy</Link>
            <GuidaFooterLink style={{ color: '#bbb', textDecoration: 'none' }} separator=" · " />
          </p>
        </footer>

      </div>
    </>
  )
}
