'use client'

import { useEffect, useState, Fragment } from 'react'
import Link from 'next/link'
import { FREE_PERIOD_DAYS, MS_PER_DAY, getReportLaunchDate } from '@/lib/report/freeWindow'

// Countdown reale dei giorni rimanenti del periodo gratuito (90gg) del report
// di profiling CURA (rinominato da CARE il 03/09/2026, vedi nome-metodo-CARE.md).
// Richiesta di Mason (29/08/2026): un countdown visibile e immediato su
// /newsletter ("offerta assolutamente irripetibile"). Riadattato per /report
// il 04/09/2026 con una variante più prominente (numero grande in evidenza),
// dopo il collaudo dal vivo in cui Mason ha chiesto un countdown ben visibile
// lì (vedi app/report/page.js, sezione "PREZZO E URGENZA TEMPORALE").
//
// PUNTO TECNICO CRITICO (segnalato esplicitamente, vedi memory/davide.md):
// i 90 giorni partono dal LANCIO PUBBLICO REALE del report, che NON è la data
// di oggi — il motore/UI del questionario (task #151-153) non sono ancora
// pronti. La data di lancio è quindi configurabile via env var
// NEXT_PUBLIC_REPORT_LAUNCH_DATE (formato 'YYYY-MM-DD'), e quando è impostata
// ha SEMPRE la priorità sul fallback qui sotto.
//
// *** AGGIORNAMENTO 05/09/2026 — istruzione diretta di Mason, sovrascrive la
// regola precedente ("nessun countdown finché la env var non è impostata") ***
// Mason vuole il countdown visibile SUBITO su /newsletter, senza aspettare che
// qualcuno configuri NEXT_PUBLIC_REPORT_LAUNCH_DATE su Vercel. Finché quella
// env var reale non viene impostata, questo componente usa un fallback
// PLACEHOLDER calcolato a runtime come `new Date() + 60 giorni` (mai una data
// scritta a mano) — il countdown mostra quindi sempre "~60 giorni" finché
// nessuno fissa la data di lancio reale. Non è una scadenza vera: è un
// riempitivo per non lasciare la sezione vuota, ed è chiaramente segnalato
// come tale qui e nel commento a bordo pagina in app/newsletter/page.js.
// NON è ancora stato verificato che il motore del questionario (#151-153) sia
// pronto end-to-end: quando la data reale di lancio sarà nota, va impostata la
// env var reale su Vercel — a quel punto questo fallback smette di essere
// usato automaticamente (priorità: env var reale > fallback placeholder).
//
// *** AGGIORNAMENTO 05/09/2026 (sera) — collaudo dal vivo di Mason su
// /newsletter, sezione Report CURA bocciata: "il countdown non ha lo stile
// classico (DD:HH:MM:SS)". Il calcolo del target (env var reale > fallback
// placeholder now+60gg) NON cambia — resta quello sopra. Cambia solo la RESA:
// prima il componente ricalcolava daysLeft a ogni render con `new Date()`
// sempre fresco, quindi anche nel fallback placeholder "ora" e "target"
// avanzavano insieme e il countdown non scendeva mai davvero (restava sempre
// "~60 giorni"). Per farlo scorrere per davvero (richiesta esplicita di
// Mason: "che scorre davvero", non un numero statico) il target va fissato
// UNA VOLA SOLA al mount del componente (stessa formula di prima: env var
// reale se impostata, altrimenti `Date.now() + 60 giorni` calcolato in quel
// momento) e poi il tempo restante va ricalcolato ogni secondo con
// `setInterval` rispetto a QUEL target fisso. È l'unico modo per avere un
// countdown che scende sul serio invece di restare congelato: la logica di
// calcolo del target è la stessa, cambia solo quando viene "fotografata".
// Il countdown viene calcolato solo lato client (mount-only, via useEffect)
// per evitare mismatch di idratazione SSR/CSR sui secondi esatti.

const MS_PER_HOUR = 60 * 60 * 1000
const MS_PER_MINUTE = 60 * 1000
const PLACEHOLDER_FALLBACK_DAYS = 60 // istruzione Mason 05/09/2026, vedi nota sopra

// Oro reale del brand (22/09/2026, task #227) — campionato via canvas pixel
// sampling sul PNG di produzione https://beautyx.it/beautyx-wordmark-gold.png
// (fill piatto, non gradiente: 123.349 pixel opachi campionati, tutti
// identici a RGB 209,171,58) e incrociato col tono medio del gradiente di
// public/logo_beautyx-oro.png (bucket dominante RGB 210,174,60 — stesso
// oro, lì solo con luci/ombre aggiunte). NON un hex indovinato: prima di
// questa verifica il colore "oro" usato nel banner topbar (#FFE44D) era un
// giallo acceso placeholder, mai preso dal logo reale — bocciato da Mason
// come stonato. Vedi report di Davide in memory/davide.md per il dettaglio
// del campionamento.
const BRAND_GOLD = '#D1AB3A'

// La data/costante di lancio (env var + regola dei 90gg) vive in
// lib/report/freeWindow.js — stessa fonte usata dal redirect server-side
// della root in proxy.js, per non avere due calcoli della stessa scadenza
// che potrebbero disallinearsi (vedi mappa-ecosistema-beautyx.html, sezione
// "3. Decisioni chiuse il 4/9/2026").
function computeDeadline() {
  const launch = getReportLaunchDate()

  if (launch) {
    return new Date(launch.getTime() + FREE_PERIOD_DAYS * MS_PER_DAY)
  }

  // PLACEHOLDER in attesa della data reale di lancio (nessuna env var
  // impostata su Vercel, o env var malformata — getReportLaunchDate() torna
  // null in entrambi i casi e logga già l'eventuale warning): "60 giorni da
  // adesso", fissato UNA VOLTA al mount (vedi nota 05/09/2026 sopra) — non
  // più ricalcolato ad ogni tick, altrimenti il countdown non scenderebbe mai.
  return new Date(Date.now() + PLACEHOLDER_FALLBACK_DAYS * MS_PER_DAY)
}

function splitRemaining(remainingMs) {
  const clamped = Math.max(remainingMs, 0)
  const days = Math.floor(clamped / MS_PER_DAY)
  const hours = Math.floor((clamped % MS_PER_DAY) / MS_PER_HOUR)
  const minutes = Math.floor((clamped % MS_PER_HOUR) / MS_PER_MINUTE)
  const seconds = Math.floor((clamped % MS_PER_MINUTE) / 1000)
  return { days, hours, minutes, seconds, expired: remainingMs <= 0 }
}

// Countdown live: target fissato al mount (client-only), poi un tick al
// secondo ricalcola solo il tempo restante rispetto a quel target. Ritorna
// `null` finché non è montato lato client (evita mismatch SSR/CSR sui secondi).
function useReportCountdown() {
  const [countdown, setCountdown] = useState(null)

  useEffect(() => {
    const deadline = computeDeadline()

    const tick = () => {
      setCountdown(splitRemaining(deadline.getTime() - Date.now()))
    }

    tick()
    const id = setInterval(tick, 1000)
    return () => clearInterval(id)
  }, [])

  return countdown
}

function pad2(n) {
  return String(n).padStart(2, '0')
}

const MONO_STACK = 'ui-monospace, SFMono-Regular, "SF Mono", Menlo, Consolas, monospace'

// Blocchi digitali GG / HH / MM / SS, in due taglie: "lg" (variante prominent,
// box grandi ben leggibili) e "sm" (variante pill, versione compatta inline).
// Stile "countdown classico": numeri monospace, separatori netti tra i blocchi,
// niente testo in prosa al posto dei numeri.
function CountdownDigits({ days, hours, minutes, seconds, size = 'lg', theme = 'dark' }) {
  const isLg = size === 'lg'
  // theme "dark" (default, invariato): chip rosa translucido/nero translucido
  // su sfondo scuro (#1a1a0f) — uso hero pill, richiamo di chiusura, sezione
  // Report CURA, /report.
  // theme "onBrand" (05/09/2026, ricolorato 22/09/2026 — task #227): per la
  // variant "topbar". Montata oggi su uno sfondo pieno SCURO (gradiente
  // bordeaux, non più il giallo→rosa di prima) — chip scuro opaco con cifre
  // nell'ORO REALE del brand (BRAND_GOLD, campionato dal logo — vedi sopra),
  // stesso principio "display digitale autosufficiente" della variante "lg",
  // solo con un tono dedicato per restare leggibile e riconoscibile come
  // brand sul suo sfondo specifico invece di dipendere da esso.
  const isOnBrand = theme === 'onBrand'

  const numStyle = {
    fontFamily: MONO_STACK,
    fontWeight: 800,
    fontVariantNumeric: 'tabular-nums',
    // *** AGGIORNAMENTO (Davide) — collaudo dal vivo Mason su /newsletter,
    // sezione Identikit Strategico CURA: "countdown troppo piccolo, va reso
    // prominente". Taglia "lg" ingrandita (26-38px → 32-48px, minWidth
    // 54→64px, padding aumentato) per essere il primo elemento che si nota
    // nella sezione, non un dettaglio marginale. La taglia "sm" (pill hero,
    // richiamo di chiusura, topbar) resta invariata — non è quella
    // contestata da Mason.
    fontSize: isLg ? 'clamp(32px, 7vw, 48px)' : '15px',
    lineHeight: 1,
    // Entrambe le taglie sono pensate per la resa reale nel sito: sia l'uso
    // "lg" (sezione Report CURA, sfondo scuro) sia l'uso "sm" (pill nella hero
    // e nel richiamo di chiusura, entrambi su sfondo #1a1a0f) stanno su sfondo
    // scuro — testo chiaro in entrambi i casi (bug di contrasto testo scuro
    // su scuro nella versione precedente della pill, corretto qui).
    color: isOnBrand ? BRAND_GOLD : '#fff',
    background: isOnBrand ? '#1a1a0f' : (isLg ? 'rgba(0,0,0,0.32)' : 'rgba(236,72,153,0.28)'),
    borderRadius: isLg ? '12px' : '5px',
    padding: isLg ? '14px 10px' : '3px 6px',
    minWidth: isLg ? '68px' : '28px',
    textAlign: 'center',
    display: 'inline-block',
  }

  const labelStyle = {
    display: 'block',
    fontSize: isLg ? '11px' : '8px',
    fontWeight: 700,
    letterSpacing: '0.09em',
    textTransform: 'uppercase',
    color: isOnBrand ? 'rgba(255,255,255,0.6)' : 'rgba(255,255,255,0.65)',
    marginTop: isLg ? '7px' : '2px',
    textAlign: 'center',
  }

  const sepStyle = {
    fontFamily: MONO_STACK,
    fontWeight: 800,
    fontSize: isLg ? 'clamp(24px, 5vw, 34px)' : '13px',
    // Il separatore, a differenza dei numeri, sta DIRETTAMENTE sullo sfondo
    // del genitore (non dentro il chip scuro) — su "onBrand" quello sfondo è
    // oggi il gradiente bordeaux scuro (non più il chiaro oro→rosa di prima),
    // quindi serve un tono chiaro/oro traslucido per restare visibile; su
    // "dark" resta lo sfondo scuro esistente, stesso tono chiaro.
    color: isOnBrand ? 'rgba(209,171,58,0.55)' : 'rgba(255,255,255,0.4)',
    alignSelf: 'flex-start',
    marginTop: isLg ? '8px' : '2px',
  }

  const blocks = [
    { value: days, label: 'GG' },
    { value: hours, label: 'HH' },
    { value: minutes, label: 'MM' },
    { value: seconds, label: 'SS' },
  ]

  return (
    <div style={{ display: 'inline-flex', alignItems: 'flex-start', gap: isLg ? '6px' : '3px' }} aria-hidden="true">
      {blocks.map((b, i) => (
        <Fragment key={b.label}>
          {i > 0 && <span style={sepStyle}>:</span>}
          <span>
            <span style={numStyle}>{pad2(b.value)}</span>
            <span style={labelStyle}>{b.label}</span>
          </span>
        </Fragment>
      ))}
    </div>
  )
}

// variant "pill": badge compatto in linea (uso originale, hero /newsletter, e
// versione mini per la chiusura fondo pagina).
// variant "prominent": blocchi countdown grandi in evidenza (uso /report e
// sezione Report CURA su /newsletter), richiesta esplicita di Mason dopo il
// collaudo dal vivo — "countdown VISIBILE" in stile classico DD:HH:MM:SS.
//
// variant "topbar" (05/09/2026, terzo giro di feedback sulla visibilità di
// questa sezione — vedi memory/davide.md): NON è la "pill" ridipinta. Mason ha
// bocciato la pill in testa hero perché contenuta nella colonna centrale
// (max-width 640px) su sfondo scuro poco diverso dal resto — "invisibile e
// incomprensibile". "topbar" è pensata per essere un elemento a sé: barra a
// piena larghezza pagina, sfondo pieno a contrasto forte (dal 22/09/2026 il
// gradiente bordeaux di brand — vedi nota nel corpo della variante più sotto
// — non più il giallo→rosa iniziale), MAI un tint trasparente, un solo claim
// breve + countdown incorporato nella stessa riga. Va montata dal chiamante
// FUORI da qualsiasi contenitore con
// max-width (vedi app/newsletter/page.js, subito sotto l'header, prima
// dell'intera sezione hero) — qui non applichiamo noi stessi un max-width
// perché lo scopo è occupare la larghezza intera del viewport.
export default function ReportCountdownBanner({ className = '', variant = 'pill' }) {
  const countdown = useReportCountdown()

  // Ancora non montato lato client, oppure scaduto (col fallback placeholder
  // `expired` non scatta mai, si ricalcola sempre a ~60gg da adesso): niente
  // banner, mai un countdown negativo/rotto o un flash di contenuto SSR errato.
  if (!countdown || countdown.expired) return null

  const { days, hours, minutes, seconds } = countdown
  const readableLabel = `${days} giorni, ${hours} ore, ${minutes} minuti e ${seconds} secondi rimasti per l'identikit strategico gratis`

  if (variant === 'prominent') {
    return (
      <div
        className={`bx-report-countdown bx-report-countdown--prominent ${className}`}
        style={{
          // *** AGGIORNAMENTO (Davide) — collaudo Mason su /newsletter,
          // sezione Identikit Strategico CURA (05/09/2026 + successivo giro):
          // "countdown troppo piccolo/marginale". Prima il pannello era
          // `inline-flex` (dimensionato SOLO sul proprio contenuto, quindi
          // restava una scatola piccola persa in mezzo allo spazio bianco
          // della sezione). Ora è `flex` a `width:100%`: riempie qualunque
          // contenitore lo ospiti — sia il wrapper largo dedicato in
          // app/newsletter/page.js (sezione report-cura, pensato apposta più
          // largo della colonna di testo per fare da banner vero) sia la
          // card di /report — invece di restare un pill piccolo al centro.
          display: 'flex',
          width: '100%',
          boxSizing: 'border-box',
          flexDirection: 'column',
          alignItems: 'center',
          gap: '16px',
          padding: '30px 32px',
          borderRadius: '18px',
          // Pannello scuro OPACO (non un tint semi-trasparente sul colore del
          // genitore): questo componente viene montato sia su sfondi scuri
          // (sezione Report CURA su /newsletter) sia su una card bianca
          // (/report, "PREZZO E URGENZA TEMPORALE") — un pannello scuro
          // autosufficiente in stile "display digitale" resta leggibile e
          // riconoscibile in entrambi i casi, invece di dipendere dal colore
          // del contenitore che lo ospita.
          background: 'linear-gradient(145deg, #241019 0%, #1a1a0f 100%)',
          border: '1.5px solid rgba(236,72,153,0.55)',
          boxShadow: '0 12px 32px rgba(0,0,0,0.25)',
        }}
        role="timer"
        aria-live="off"
        aria-label={readableLabel}
      >
        <CountdownDigits days={days} hours={hours} minutes={minutes} seconds={seconds} size="lg" />
        <span style={{
          fontFamily: 'var(--font-inter), sans-serif',
          fontSize: '14px',
          fontWeight: 700,
          letterSpacing: '0.06em',
          textTransform: 'uppercase',
          color: '#fff',
          textAlign: 'center',
        }}>
          rimasti per l'identikit strategico gratis
        </span>
      </div>
    )
  }

  if (variant === 'topbar') {
    // *** CORREZIONE 05/09/2026 — collaudo Mason bocciato duramente: "i
    // caratteri piccoli non si capisce, non c'è un invito all'azione, 'ancora
    // qualche giorno per assicurartelo' non si capisce cosa deve assicurare".
    // Due difetti risolti qui (non un ritocco estetico):
    // 1) claim riscritto per essere ESPLICITO su cosa si ottiene ("Report CURA
    //    gratis") invece di alludervi con un pronome ("...assicurartelo") privo
    //    di referente chiaro in un banner letto di corsa;
    // 2) aggiunto un vero bottone cliccabile verso /report (prima il banner era
    //    solo testo + countdown, senza alcun invito all'azione dentro la barra
    //    stessa). Font del claim aumentato (14px → clamp 16-19px) perché
    //    doveva leggersi a colpo d'occhio. Testo del claim è una versione
    //    diretta di Davide, non definitiva: Federica lavora in parallelo sul
    //    resto della sezione e può affinarlo sopra senza toccare
    //    bottone/countdown.
    //
    // *** RICOLORATO 22/09/2026 (task #227, correzione diretta di Mason) —
    // il gradiente giallo acceso→rosa (#FFE44D→#EC4899) è stato bocciato come
    // "stonato", mai preso dalla vera palette del brand. Nuova base: stesso
    // gradiente bordeaux già stabilito come riferimento nella sezione
    // Identikit di /newsletter (#2a1420→#1f0f18), qui in orizzontale perché
    // la barra è orizzontale. Testo del claim ora rosa (#EC4899, già in uso
    // ovunque nel sito) invece di nero su sfondo chiaro. Il bottone CTA passa
    // da "chip scuro opaco + testo oro" (aveva senso SOLO su uno sfondo
    // chiaro, per fare contrasto) a rosa pieno con testo bianco — stesso
    // colore di ogni altro CTA primario del sito (hero /newsletter, sezione
    // Identikit, /report, /listino), cosi la barra non introduce un terzo
    // colore di bottone. L'oro reale del brand (BRAND_GOLD, vedi sopra)
    // resta come accento riservato alle cifre del countdown (chip
    // "onBrand") — non sul bottone, per non affollare la barra di 3 colori
    // diversi con pari peso. Struttura/logica/countdown invariati: solo
    // colori.
    return (
      <div
        className={`bx-report-countdown bx-report-countdown--topbar ${className}`}
        role="note"
        aria-label={readableLabel}
        style={{ width: '100%' }}
      >
        {/* Stile scoped qui invece che nel <style> globale di page.js: il
            componente deve restare autosufficiente (può finire su qualunque
            pagina). SCELTA DELL'EFFETTO DI RICHIAMO (uno solo, come richiesto):
            pulse/glow discreto sul SOLO blocco countdown (non su tutta la
            barra). Motivo della scelta rispetto a shimmer o entrata animata:
            il countdown è l'unico elemento che comunica un'urgenza reale (i
            secondi scendono davvero) — fargli respirare un alone luminoso
            attira l'occhio esattamente lì invece di far "lampeggiare" l'intera
            barra (che rischierebbe l'effetto banner pubblicitario). Ciclo
            lento (2.6s) e ampiezza contenuta = percepibile ma signorile;
            rispetta prefers-reduced-motion (si disattiva del tutto). */}
        <style>{`
          /* Anello del pulse ricolorato (22/09/2026, task #227): era un
             alone scuro (rgba(26,26,15,...)) pensato per staccare su uno
             sfondo CHIARO — su bordeaux scuro sarebbe quasi invisibile. Ora
             un alone nell'oro reale del brand (BRAND_GOLD), coerente con
             l'accento oro riservato alle cifre del countdown. */
          @keyframes bx-topbar-pulse {
            0%, 100% { box-shadow: 0 0 0 0 rgba(209,171,58,0), 0 2px 6px rgba(0,0,0,0.35); }
            50% { box-shadow: 0 0 0 5px rgba(209,171,58,0.35), 0 2px 6px rgba(0,0,0,0.35); }
          }
          .bx-topbar-pulse { animation: bx-topbar-pulse 2.6s ease-in-out infinite; border-radius: 8px; }
          @media (prefers-reduced-motion: reduce) {
            .bx-topbar-pulse { animation: none; }
          }
          .bx-topbar-cta { transition: background 0.15s ease, transform 0.1s ease; }
          .bx-topbar-cta:hover, .bx-topbar-cta:focus-visible { background: #d63d80 !important; }
          .bx-topbar-cta:active { transform: scale(0.97); }
          @media (max-width: 560px) {
            .bx-topbar-row { padding: 12px 16px !important; gap: 8px !important; }
            .bx-topbar-claim { font-size: 15px !important; }
            .bx-topbar-cta { width: 100%; }
          }
        `}</style>
        <div
          className="bx-topbar-row"
          style={{
            width: '100%',
            // Sfondo PIENO a contrasto forte, non un tint pallido: richiesta
            // esplicita di Mason dopo la bocciatura della pill ("deve saltare
            // all'occhio nel primo mezzo secondo") — quel principio resta
            // valido, cambia solo la palette (22/09/2026, task #227): non più
            // il giallo→rosa acceso (stonato, mai preso dal brand reale), ora
            // lo stesso gradiente bordeaux di riferimento (sezione Identikit
            // /newsletter), qui in orizzontale.
            background: 'linear-gradient(90deg, #2a1420 0%, #1f0f18 100%)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            flexWrap: 'wrap',
            rowGap: '10px',
            columnGap: '14px',
            padding: '13px 24px',
          }}
        >
          <span
            className="bx-topbar-claim"
            style={{
              fontFamily: 'var(--font-inter), sans-serif',
              // Aumentato da 14px (bocciato: "i caratteri piccoli non si
              // capisce") — deve leggersi a colpo d'occhio senza avvicinarsi
              // allo schermo.
              fontSize: 'clamp(16px, 2.6vw, 19px)',
              fontWeight: 800,
              // Testo rosa (22/09/2026, task #227) — era nero, pensato per lo
              // sfondo chiaro giallo→rosa di prima; su sfondo bordeaux scuro
              // serve il rosa brand già in uso ovunque nel sito (#EC4899).
              color: '#EC4899',
              textAlign: 'center',
              lineHeight: 1.25,
            }}
          >
            Identikit strategico CURA gratis
          </span>
          <span className="bx-topbar-pulse" style={{ display: 'inline-flex' }}>
            <CountdownDigits days={days} hours={hours} minutes={minutes} seconds={seconds} size="sm" theme="onBrand" />
          </span>
          <span
            className="bx-topbar-claim"
            style={{
              fontFamily: 'var(--font-inter), sans-serif',
              fontSize: 'clamp(16px, 2.6vw, 19px)',
              fontWeight: 800,
              color: '#EC4899',
              textAlign: 'center',
              lineHeight: 1.25,
            }}
          >
            rimasti
          </span>
          <Link
            href="/report"
            className="bx-topbar-cta"
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              justifyContent: 'center',
              gap: '6px',
              // Bottone vero (non un link testuale sottolineato). Ricolorato
              // 22/09/2026 (task #227): prima era un chip scuro opaco con
              // testo oro — aveva senso SOLO come contrasto su uno sfondo
              // chiaro. Ora che la barra è scura, il bottone passa a rosa
              // pieno con testo bianco, lo STESSO colore di ogni altro CTA
              // primario del sito (hero /newsletter, Identikit, /report,
              // /listino) — cosi la barra non introduce un terzo colore di
              // bottone. L'oro reale (BRAND_GOLD) resta riservato alle cifre
              // del countdown, non duplicato qui.
              background: '#EC4899',
              color: '#fff',
              fontFamily: 'var(--font-inter), sans-serif',
              fontWeight: 800,
              fontSize: 'clamp(14px, 2vw, 16px)',
              padding: '13px 24px',
              minHeight: '44px', // touch-friendly su mobile
              borderRadius: '999px',
              textDecoration: 'none',
              whiteSpace: 'nowrap',
              boxShadow: '0 2px 14px rgba(236,72,153,0.45)',
              border: `1.5px solid ${BRAND_GOLD}`,
            }}
          >
            Richiedilo ora →
          </Link>
        </div>
      </div>
    )
  }

  return (
    <div
      className={`bx-report-countdown ${className}`}
      style={{
        display: 'inline-flex',
        alignItems: 'center',
        gap: '10px',
        padding: '8px 16px',
        borderRadius: '999px',
        background: 'rgba(236,72,153,0.14)',
        border: '1px solid rgba(236,72,153,0.4)',
        color: '#fff',
        fontFamily: 'var(--font-inter)',
        fontSize: '0.85rem',
        fontWeight: 600,
      }}
      role="timer"
      aria-live="off"
      aria-label={readableLabel}
    >
      <span aria-hidden="true">⏳</span>
      <CountdownDigits days={days} hours={hours} minutes={minutes} seconds={seconds} size="sm" />
      <span aria-hidden="true">identikit strategico gratis, poi 60€</span>
    </div>
  )
}
