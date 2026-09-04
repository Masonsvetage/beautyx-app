'use client'

// Countdown reale dei giorni rimanenti del periodo gratuito (90gg) del report
// di profiling CARE. Richiesta di Mason (29/08/2026): un countdown visibile
// e immediato su /newsletter ("offerta assolutamente irripetibile").
//
// PUNTO TECNICO CRITICO (segnalato esplicitamente, vedi memory/davide.md):
// i 90 giorni partono dal LANCIO PUBBLICO REALE del report, che NON è la data
// di oggi — il motore/UI del questionario (task #151-153) non sono ancora
// pronti. La data di lancio è quindi configurabile via env var
// NEXT_PUBLIC_REPORT_LAUNCH_DATE (formato 'YYYY-MM-DD'), MAI hardcoded.
// Finché quella env var non è impostata su Vercel, questo componente non
// renderizza nulla (fallback silenzioso, non un countdown finto/sbagliato).
//
// Quando fissare la data: solo quando il motore del questionario (#151-153)
// è pronto E collaudato end-to-end — è Davide stesso a doverlo segnalare al
// Coordinatore/Mason, come da istruzione ricevuta. Non è stata fissata oggi.

const FREE_PERIOD_DAYS = 90
const MS_PER_DAY = 24 * 60 * 60 * 1000

function computeCountdown() {
  const launchDateRaw = process.env.NEXT_PUBLIC_REPORT_LAUNCH_DATE
  if (!launchDateRaw) return null

  const launch = new Date(`${launchDateRaw}T00:00:00`)
  if (Number.isNaN(launch.getTime())) {
    console.warn('[ReportCountdownBanner] NEXT_PUBLIC_REPORT_LAUNCH_DATE non è una data valida:', launchDateRaw)
    return null
  }

  const deadline = new Date(launch.getTime() + FREE_PERIOD_DAYS * MS_PER_DAY)
  const now = new Date()
  const daysLeft = Math.ceil((deadline.getTime() - now.getTime()) / MS_PER_DAY)

  return { daysLeft, expired: daysLeft <= 0 }
}

export default function ReportCountdownBanner({ className = '' }) {
  const countdown = computeCountdown()

  // Nessuna env var configurata (caso normale finché il lancio non è fissato)
  // o periodo già scaduto: niente banner, mai un countdown finto o rotto.
  if (!countdown || countdown.expired) return null

  const { daysLeft } = countdown

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
        Offerta assolutamente irripetibile: il report CARE è gratis ancora per{' '}
        <strong>{daysLeft} {daysLeft === 1 ? 'giorno' : 'giorni'}</strong>
        {' '}— poi 60€, sempre credito pieno sull'abbonamento.
      </span>
    </div>
  )
}
