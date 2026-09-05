'use client'

import { useEffect, useState, Fragment } from 'react'

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

const FREE_PERIOD_DAYS = 90
const MS_PER_DAY = 24 * 60 * 60 * 1000
const MS_PER_HOUR = 60 * 60 * 1000
const MS_PER_MINUTE = 60 * 1000
const PLACEHOLDER_FALLBACK_DAYS = 60 // istruzione Mason 05/09/2026, vedi nota sopra

function computeDeadline() {
  const launchDateRaw = process.env.NEXT_PUBLIC_REPORT_LAUNCH_DATE

  if (launchDateRaw) {
    const launch = new Date(`${launchDateRaw}T00:00:00`)
    if (Number.isNaN(launch.getTime())) {
      console.warn('[ReportCountdownBanner] NEXT_PUBLIC_REPORT_LAUNCH_DATE non è una data valida:', launchDateRaw)
      // data reale malformata: non blocchiamo la UI, ripieghiamo comunque sul
      // placeholder invece di nascondere tutto il banner.
      return new Date(Date.now() + PLACEHOLDER_FALLBACK_DAYS * MS_PER_DAY)
    }
    return new Date(launch.getTime() + FREE_PERIOD_DAYS * MS_PER_DAY)
  }

  // PLACEHOLDER in attesa della data reale di lancio (nessuna env var
  // impostata su Vercel): "60 giorni da adesso", fissato UNA VOLTA al mount
  // (vedi nota 05/09/2026 sopra) — non più ricalcolato ad ogni tick, altrimenti
  // il countdown non scenderebbe mai.
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
function CountdownDigits({ days, hours, minutes, seconds, size = 'lg' }) {
  const isLg = size === 'lg'

  const numStyle = {
    fontFamily: MONO_STACK,
    fontWeight: 800,
    fontVariantNumeric: 'tabular-nums',
    fontSize: isLg ? 'clamp(26px, 6vw, 38px)' : '15px',
    lineHeight: 1,
    // Entrambe le taglie sono pensate per la resa reale nel sito: sia l'uso
    // "lg" (sezione Report CURA, sfondo scuro) sia l'uso "sm" (pill nella hero
    // e nel richiamo di chiusura, entrambi su sfondo #1a1a0f) stanno su sfondo
    // scuro — testo chiaro in entrambi i casi (bug di contrasto testo scuro
    // su scuro nella versione precedente della pill, corretto qui).
    color: '#fff',
    background: isLg ? 'rgba(0,0,0,0.32)' : 'rgba(236,72,153,0.28)',
    borderRadius: isLg ? '10px' : '5px',
    padding: isLg ? '10px 8px' : '3px 6px',
    minWidth: isLg ? '54px' : '28px',
    textAlign: 'center',
    display: 'inline-block',
  }

  const labelStyle = {
    display: 'block',
    fontSize: isLg ? '10px' : '8px',
    fontWeight: 700,
    letterSpacing: '0.09em',
    textTransform: 'uppercase',
    color: 'rgba(255,255,255,0.65)',
    marginTop: isLg ? '6px' : '2px',
    textAlign: 'center',
  }

  const sepStyle = {
    fontFamily: MONO_STACK,
    fontWeight: 800,
    fontSize: isLg ? 'clamp(20px, 4vw, 28px)' : '13px',
    color: 'rgba(255,255,255,0.4)',
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
export default function ReportCountdownBanner({ className = '', variant = 'pill' }) {
  const countdown = useReportCountdown()

  // Ancora non montato lato client, oppure scaduto (col fallback placeholder
  // `expired` non scatta mai, si ricalcola sempre a ~60gg da adesso): niente
  // banner, mai un countdown negativo/rotto o un flash di contenuto SSR errato.
  if (!countdown || countdown.expired) return null

  const { days, hours, minutes, seconds } = countdown
  const readableLabel = `${days} giorni, ${hours} ore, ${minutes} minuti e ${seconds} secondi rimasti per il report gratis`

  if (variant === 'prominent') {
    return (
      <div
        className={`bx-report-countdown bx-report-countdown--prominent ${className}`}
        style={{
          display: 'inline-flex',
          flexDirection: 'column',
          alignItems: 'center',
          gap: '14px',
          padding: '24px 32px',
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
          fontSize: '13px',
          fontWeight: 700,
          letterSpacing: '0.06em',
          textTransform: 'uppercase',
          color: '#fff',
          textAlign: 'center',
        }}>
          rimasti per il report gratis
        </span>
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
      <span aria-hidden="true">report gratis, poi 60€</span>
    </div>
  )
}
