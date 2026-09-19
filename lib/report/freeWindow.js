// Finestra dei 90 giorni gratuiti del report di profiling CURA.
//
// Decisione chiusa il 4/9/2026 (vedi mappa-ecosistema-beautyx.html, sezione
// "3. Decisioni chiuse il 4/9/2026", primo punto): "90 giorni: il report
// gratuito nei primi 90 giorni dal lancio agisce da livello 1 (civetta a
// basso CPL); dopo, la newsletter torna ad essere l'unico portone permanente
// per il traffico nuovo."
//
// Questo modulo è l'UNICA fonte di verità per "siamo ancora dentro i 90
// giorni gratuiti?" — riusa la stessa data di lancio configurabile già
// impiegata da components/common/ReportCountdownBanner.js (che importa da
// qui, vedi sotto) invece di far vivere due calcoli della stessa scadenza in
// posti diversi con rischio di disallineamento. Nessuna logica JSX/React qui
// dentro: file plain-JS, sicuro da importare sia da un middleware
// (proxy.js, Edge runtime) sia da un componente client.
//
// process.env.NEXT_PUBLIC_REPORT_LAUNCH_DATE (formato 'YYYY-MM-DD') ha
// SEMPRE la priorità quando è impostata. Finché non lo è (fase pre-lancio,
// motore questionario #151-153 non ancora collaudato end-to-end — vedi
// commento in app/api/onboarding/create-centro/route.js), chi arriva/si
// registra oggi rientra "per costruzione" nei 90 giorni gratuiti: qui
// trattiamo quindi l'assenza (o l'invalidità) della env var come "dentro la
// finestra", coerente con quella stessa assunzione già in produzione.

export const FREE_PERIOD_DAYS = 90
export const MS_PER_DAY = 24 * 60 * 60 * 1000

/**
 * Ritorna la data di lancio pubblico reale del report, oppure `null` se la
 * env var non è impostata o non è una data valida (fase pre-lancio /
 * placeholder — stesso comportamento di fallback usato altrove).
 */
export function getReportLaunchDate() {
  const launchDateRaw = process.env.NEXT_PUBLIC_REPORT_LAUNCH_DATE
  if (!launchDateRaw) return null

  const launch = new Date(`${launchDateRaw}T00:00:00`)
  if (Number.isNaN(launch.getTime())) {
    console.warn('[freeWindow] NEXT_PUBLIC_REPORT_LAUNCH_DATE non è una data valida:', launchDateRaw)
    return null
  }
  return launch
}

/**
 * Ritorna la scadenza reale dei 90 giorni (data di lancio + 90gg), oppure
 * `null` se la data di lancio non è (ancora) configurata.
 */
export function getReportFreeWindowDeadline() {
  const launch = getReportLaunchDate()
  if (!launch) return null
  return new Date(launch.getTime() + FREE_PERIOD_DAYS * MS_PER_DAY)
}

/**
 * true se siamo ancora dentro la finestra dei 90 giorni gratuiti (il report
 * agisce da livello 1 d'ingresso), false se è scaduta (la newsletter torna
 * ad essere l'unico portone permanente).
 *
 * Nessuna data di lancio configurata → true (fase pre-lancio: per
 * costruzione dentro la finestra, vedi nota in testa al file).
 */
export function isWithinReportFreeWindow(now = new Date()) {
  const deadline = getReportFreeWindowDeadline()
  if (!deadline) return true
  return now.getTime() < deadline.getTime()
}
