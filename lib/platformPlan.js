// Fonte di verità UNICA per "quali piani sbloccano i moduli gestionali reali
// della piattaforma" (Movimenti, Analytics, Obiettivi, Pianificazione, Centro
// gestionale, Strategie). Qualunque altro caso — nessun piano, o il piano
// report_profiling (assegnato gratis a chi ha comprato solo l'Identikit
// Strategico CURA, livello 2 dell'ecosistema, vedi memory/generale.md
// 04/09/2026) — NON deve mai vedere questi moduli: sono costruiti per centri
// con dati reali di incasso/obiettivi/accantonamenti, che un account
// solo-report non ha mai avuto modo di popolare.
//
// Storia: questo set esisteva PRIMA solo come costante locale dentro
// app/dashboard/page.js (fix del 04/09/2026 "gate widget gestionali per
// piano piattaforma reale"), mai estratto in un modulo condiviso e mai
// applicato altrove. Bug reale segnalato da Mason l'11/09/2026: un utente
// con SOLO report_profiling che arrivava su /movimenti, /analytics,
// /obiettivi (via link in Navbar o via URL diretto) vedeva comunque quelle
// pagine intere, perché né components/Navbar.js né le pagine gestionali
// stesse controllavano il piano — solo se l'utente fosse autenticato e
// avesse un centro_id (che un utente report_profiling ha comunque, creato
// dall'onboarding gratuito). Questo file centralizza la regola così che
// Navbar, le pagine gestionali e la dashboard la condividano invece di
// duplicarla (e rischiare che diverga di nuovo).
export const NON_PIATTAFORMA_PLAN_CODICI = new Set(['report_profiling'])

export function isPiattaformaPlanCodice(codice) {
  return !!codice && !NON_PIATTAFORMA_PLAN_CODICI.has(codice)
}
