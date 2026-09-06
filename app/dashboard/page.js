'use client'
import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { useAuth } from '@/contexts/AuthContext'
import WeeklyRevenueChart from '@/components/dashboard/WeeklyRevenueChart'
import AccantonamentiQuickView from '@/components/dashboard/AccantonamentiQuickView'
import OnboardingChecklist from '@/components/dashboard/OnboardingChecklist'
import RegistroGiornataWidget from '@/components/dashboard/RegistroGiornataWidget'
import ConsoleDatiWidget from '@/components/dashboard/ConsoleDatiWidget'
import GamificationWidget from '@/components/dashboard/GamificationWidget'
import ReportCuraCard from '@/components/dashboard/ReportCuraCard'
import { useBeautyx } from '@/contexts/BeautyxContext'

function CollapsibleOnboarding({ children }) {
  const [open, setOpen] = useState(false)
  return (
    <div className="bg-slate-800/40 rounded-xl border border-slate-700/50 overflow-hidden">
      <button onClick={() => setOpen(v => !v)} className="w-full flex items-center justify-between px-4 py-2.5 text-sm text-slate-400 hover:text-white transition-colors">
        <span className="flex items-center gap-2">🚀 <span>Inizia con BeautyX</span></span>
        <svg className={`w-4 h-4 transition-transform ${open ? 'rotate-180' : ''}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
        </svg>
      </button>
      {open && <div className="border-t border-slate-700/40">{children}</div>}
    </div>
  )
}

// Piani che sbloccano davvero i widget gestionali (incassi, obiettivi,
// accantonamenti, import dati). Qualunque altro caso — nessun piano, o il
// piano report_profiling (assegnato gratis a chi ha comprato solo il Report
// CURA, livello 2 dell'ecosistema, vedi memory/generale.md 04/09/2026) — NON
// deve mai vedere questi widget: sono costruiti per centri con dati reali di
// incasso/obiettivi/accantonamenti, che un account solo-report non ha mai
// avuto modo di popolare. Prima di questo fix la dashboard mostrava questi
// widget a chiunque avesse un centro_id, a prescindere dal piano — un utente
// report_profiling-only li vedeva comunque, con fetch su dati inesistenti.
const NON_PIATTAFORMA_PLAN_CODICI = new Set(['report_profiling'])

export default function Home() {
  const { currentCentro, profile, loading: authLoading, centriAccess, switchCentro, isAdmin, isHpa, isGlobalView } = useAuth()
  // Bug fix (06/09/2026, crash post reset-password segnalato da Mason —
  // vedi app/global-error.js in produzione): BeautyxProviderWrapper.js NON
  // monta <BeautyxProvider> quando l'utente è autenticato ma senza centro_id
  // (non-admin, non-hpa) — lo fa apposta, per lasciar renderizzare questa
  // pagina così può fare il redirect a /impostazioni?primo-accesso=1 più
  // sotto (riga `if (!centroId) {...}`). In quella finestra useBeautyx()
  // (contexts/BeautyxContext.js) ritorna `null` (nessun Provider sopra
  // nell'albero), e la destrutturazione SENZA fallback qui esplodeva con
  // "Cannot destructure property 'openSidebar' of 'null'" — un errore non
  // catturato da nessun error boundary locale, quindi risolto solo dal
  // global-error.js di root. Il crash è deterministico per QUALSIASI utente
  // autenticato senza centro (capita facilmente su un account appena
  // creato/di test su cui non è mai stato completato l'onboarding, come
  // probabilmente quello con cui è stato provato il reset password) — non è
  // legato in sé al flusso di recovery, ma al primo path che lo espone.
  // `openSidebar`/`sendMessage` restano `undefined` in quel caso, ma non
  // vengono mai chiamati: il return sotto (`if (!centroId)`) esce prima di
  // arrivare al JSX che li usa (OnboardingChecklist).
  const { openSidebar, sendMessage } = useBeautyx() || {}
  const router = useRouter()
  const [dataVersion, setDataVersion] = useState(0) // incrementa dopo ogni sync/import → ricarica chart e medie

  const centroId = currentCentro?.centro_id || profile?.centro_id || null

  // Piano attivo dell'utente — nessun context espone oggi questo dato
  // (verificato: useAuth()/useBeautyx() non hanno un campo piano/plan), quindi
  // lo recuperiamo dallo stesso endpoint già usato da ReportCuraCard.js.
  // planLoaded distingue "ancora non so" da "so che non ha piano piattaforma":
  // finché non è true i widget gestionali restano nascosti, per non fare un
  // flash della dashboard piena seguito da uno sparire.
  const [planCodice, setPlanCodice] = useState(null)
  const [planLoaded, setPlanLoaded] = useState(false)

  useEffect(() => {
    if (isAdmin || isHpa) { setPlanLoaded(true); return }
    if (!centroId) return
    let cancelled = false
    fetch('/api/subscriptions/balance')
      .then(r => (r.ok ? r.json() : null))
      .then(data => { if (!cancelled) setPlanCodice(data?.plan?.codice || null) })
      .catch(() => {})
      .finally(() => { if (!cancelled) setPlanLoaded(true) })
    return () => { cancelled = true }
  }, [isAdmin, isHpa, centroId])

  const hasPiattaformaPlan = planLoaded && !!planCodice && !NON_PIATTAFORMA_PLAN_CODICI.has(planCodice)
  const showWidgetGestionali = !isAdmin && !isHpa && centroId && hasPiattaformaPlan

  // Admin/HPA in vista globale: redirect alla loro dashboard
  useEffect(() => {
    if (!authLoading && isGlobalView) {
      router.push('/admin')
    }
  }, [authLoading, isGlobalView, router])

  // Utente senza centro: redirect a impostazioni per configurarlo.
  // Nota (verifica 05/09/2026): questo effetto scatta solo se `profile` è
  // valorizzato — un utente autenticato ma SENZA alcuna riga in user_profiles
  // (onboarding mai completato: create-centro non chiamato) non rientra in
  // questo ramo e resta sullo spinner di caricamento più sotto, invece di
  // essere rimandato all'onboarding. Segnalato, non ancora deciso se estendere
  // la condizione anche a `profile === null`: cambierebbe il comportamento per
  // un caso che va verificato con Mason (potrebbe sovrapporsi al redirect già
  // gestito da proxy.js per utenti non autenticati).
  useEffect(() => {
    if (!authLoading && !isAdmin && !isHpa && profile && !centroId) {
      router.push('/impostazioni?primo-accesso=1')
    }
  }, [authLoading, isAdmin, isHpa, profile, centroId, router])

  // Solo se i widget gestionali sono davvero visibili: un account senza piano
  // piattaforma (es. solo report_profiling) non deve innescare fetch su dati
  // di incasso che non ha mai potuto avere.
  useEffect(() => {
    if (showWidgetGestionali) loadDailyRevenue()
  }, [showWidgetGestionali])

  async function loadDailyRevenue() {
    try {
      const today = new Date().toISOString().split('T')[0]
      await fetch(`/api/daily-revenues?centro_id=${centroId}&data=${today}`)
    } catch (error) {
      console.error('Errore caricamento incasso giornaliero:', error)
    }
  }

  // Loading auth o nessun centro assegnato
  if (authLoading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-800 via-slate-900 to-slate-800 flex items-center justify-center">
        <div className="text-center">
          <div className="w-12 h-12 border-4 border-teal-500 border-t-transparent rounded-full animate-spin mx-auto"></div>
          <p className="mt-4 text-slate-400">Caricamento...</p>
        </div>
      </div>
    )
  }

  if (!centroId) {
    if (isAdmin) {
      return (
        <div className="min-h-screen bg-gradient-to-br from-slate-800 via-slate-900 to-slate-800 flex items-center justify-center">
          <div className="text-center">
            <div className="w-12 h-12 border-4 border-teal-500 border-t-transparent rounded-full animate-spin mx-auto"></div>
            <p className="mt-4 text-slate-400">Redirect al pannello admin...</p>
          </div>
        </div>
      )
    }
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-800 via-slate-900 to-slate-800 flex items-center justify-center">
        <div className="text-center">
          <div className="w-12 h-12 border-4 border-teal-500 border-t-transparent rounded-full animate-spin mx-auto"></div>
          <p className="mt-4 text-slate-400">Caricamento...</p>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-800 via-slate-900 to-slate-800">
      <div className="max-w-[1600px] mx-auto px-4 py-3 space-y-3">

        {/* Selettore centro per admin/HPA con più centri */}
        {centriAccess.length > 1 && (
          <div className="flex items-center gap-3 bg-slate-800/60 rounded-xl p-3 border border-slate-700/50">
            <span className="text-sm text-slate-400">Centro:</span>
            <div className="flex gap-2 flex-wrap">
              {centriAccess.map(c => (
                <button
                  key={c.centro_id}
                  onClick={() => switchCentro(c.centro_id)}
                  className={`px-3 py-1.5 rounded-lg text-sm font-medium transition-all ${
                    currentCentro?.centro_id === c.centro_id
                      ? 'bg-teal-500 text-white'
                      : 'bg-slate-700/50 text-slate-400 hover:text-white hover:bg-slate-600/50'
                  }`}
                >
                  {c.centro_nome}
                </button>
              ))}
            </div>
          </div>
        )}

        {/* Report CURA — entry point verso /questionario (visibile solo se
            il piano attivo è report_profiling, controllato dal componente stesso) */}
        {!isAdmin && !isHpa && <ReportCuraCard />}

        {/* Checklist onboarding — collassata di default */}
        {!isAdmin && !isHpa && (
          <CollapsibleOnboarding>
            <OnboardingChecklist
              onOpenChat={(prompt) => {
                openSidebar()
                setTimeout(() => sendMessage(prompt), 300)
              }}
            />
          </CollapsibleOnboarding>
        )}

        {/* ROW 1 — Incassi settimana: full width, compatto.
            Gestionale: visibile SOLO con piano piattaforma reale (non
            report_profiling, non nessun piano) — vedi hasPiattaformaPlan. */}
        {showWidgetGestionali && (
          <WeeklyRevenueChart
            centroId={centroId}
            taxRate={25}
            onRevenueUpdated={loadDailyRevenue}
            refreshKey={dataVersion}
          />
        )}

        {/* ROW 2 — Sfide & Obiettivi | Accantonamenti (50/50) */}
        {showWidgetGestionali && (
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-3">
            <GamificationWidget />
            <AccantonamentiQuickView centroId={centroId} />
          </div>
        )}

        {/* ROW 3 — Importazione Dati (3/4) | Registro Oggi (1/4) */}
        {showWidgetGestionali && (
          <div className="flex flex-col lg:flex-row gap-3">
            <div className="flex-[3] min-w-0 bg-slate-800/40 rounded-2xl border border-slate-700/50 p-3">
              <p className="text-xs font-semibold text-white mb-2">Importazione Dati</p>
              <ConsoleDatiWidget compact onDataChanged={() => setDataVersion(v => v + 1)} />
            </div>
            <div className="flex-1 min-w-0">
              <RegistroGiornataWidget centroId={centroId} />
            </div>
          </div>
        )}

      </div>
    </div>
  )
}