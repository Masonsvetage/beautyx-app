'use client'

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

const FREE_PERIOD_DAYS = 90
const MS_PER_DAY = 24 * 60 * 60 * 1000
const PLACEHOLDER_FALLBACK_DAYS = 60 // istruzione Mason 05/09/2026, vedi nota sopra

function computeCountdown() {
  const launchDateRaw = process.env.NEXT_PUBLIC_REPORT_LAUNCH_DATE

  let deadline

  if (launchDateRaw) {
    const launch = new Date(`${launchDateRaw}T00:00:00`)
    if (Number.isNaN(launch.getTime())) {
      console.warn('[ReportCountdownBanner] NEXT_PUBLIC_REPORT_LAUNCH_DATE non è una data valida:', launchDateRaw)
      // data reale malformata: non blocchiamo la UI, ripieghiamo comunque sul
      // placeholder invece di nascondere tutto il banner.
      deadline = new Date(Date.now() + PLACEHOLDER_FALLBACK_DAYS * MS_PER_DAY)
    } else {
      deadline = new Date(launch.getTime() + FREE_PERIOD_DAYS * MS_PER_DAY)
    }
  } else {
    // PLACEHOLDER in attesa della data reale di lancio (nessuna env var
    // impostata su Vercel): sempre "60 giorni da adesso", ricalcolato a ogni
    // render con new Date() — mai una data fissa scritta a mano.
    deadline = new Date(Date.now() + PLACEHOLDER_FALLBACK_DAYS * MS_PER_DAY)
  }

  const now = new Date()
  const daysLeft = Math.ceil((deadline.getTime() - now.getTime()) / MS_PER_DAY)

  return { daysLeft, expired: daysLeft <= 0 }
}

// variant "pill": badge compatto in linea (uso originale, hero /newsletter).
// variant "prominent": numero dei giorni in grande evidenza (uso /report,
// richiesta esplicita di Mason dopo il collaudo dal vivo del 04/09/2026 —
// "countdown VISIBILE", non un rigo di testo tra i tanti).
export default function ReportCountdownBanner({ className = '', variant = 'pill' }) {
  const countdown = computeCountdown()

  // Con env var reale scaduta (daysLeft <= 0): niente banner, mai un countdown
  // negativo/rotto. Col fallback placeholder invece `expired` non scatta mai
  // (si ricalcola sempre a ~60gg da adesso) — vale per entrambe le varianti.
  if (!countdown || countdown.expired) return null

  const { daysLeft } = countdown
  const label = daysLeft === 1 ? 'giorno' : 'giorni'

  if (variant === 'prominent') {
    return (
      <div
        className={`bx-report-countdown bx-report-countdown--prominent ${className}`}
        style={{
          display: 'inline-flex',
          flexDirection: 'column',
          alignItems: 'center',
          gap: '4px',
          padding: '18px 28px',
          borderRadius: '16px',
          background: 'rgba(236,72,153,0.08)',
          border: '1.5px solid rgba(236,72,153,0.3)',
        }}
        role="status"
      >
        <span style={{
          fontFamily: 'var(--font-playfair), Georgia, serif',
          fontWeight: 900,
          fontSize: 'clamp(40px, 10vw, 56px)',
          lineHeight: 1,
          color: '#EC4899',
        }}>
          {daysLeft}
        </span>
        <span style={{
          fontFamily: 'var(--font-inter), sans-serif',
          fontSize: '13px',
          fontWeight: 700,
          letterSpacing: '0.06em',
          textTransform: 'uppercase',
          color: '#1a1a0f',
        }}>
          {label} rimasti per il report gratis
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
        padding: '10px 18px',
        borderRadius: '999px',
        background: 'rgba(236,72,153,0.12)',
        border: '1px solid rgba(236,72,153,0.35)',
        color: '#1a1a0f',
        fontFamily: 'var(--font-inter)',
        fontSize: '0.85rem',
        fontWeight: 600,
      }}
      role="status"
    >
      <span aria-hidden="true">⏳</span>
      <span>
        Offerta assolutamente irripetibile: il report CURA è gratis ancora per{' '}
        <strong>{daysLeft} {label}</strong>
        {' '}— poi 60€, sempre credito pieno sull'abbonamento.
      </span>
    </div>
  )
}
