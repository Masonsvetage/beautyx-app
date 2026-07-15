'use client'
import { useState, useEffect } from 'react'
import Link from 'next/link'

/**
 * OnboardingChecklist — widget dashboard per nuovi utenti.
 * Si nasconde automaticamente quando tutti gli step sono completati
 * e l'utente chiude il banner (salvato in localStorage).
 *
 * Quando aggiungi una nuova funzione principale a BeautyX:
 * 1. Aggiungi lo step in /api/user/onboarding-checklist/route.js (STEPS_DEF + flags)
 * 2. Il widget si aggiorna automaticamente
 */
export default function OnboardingChecklist({ onOpenChat }) {
  const [data, setData] = useState(null)
  const [loading, setLoading] = useState(true)
  const [collapsed, setCollapsed] = useState(false)
  const [dismissed, setDismissed] = useState(false)

  useEffect(() => {
    // Controlla se l'utente ha già chiuso definitivamente la checklist
    if (localStorage.getItem('bx_onboarding_dismissed') === '1') {
      setDismissed(true)
      setLoading(false)
      return
    }
    fetch('/api/user/onboarding-checklist')
      .then(r => r.json())
      .then(d => { setData(d); setLoading(false) })
      .catch(() => setLoading(false))
  }, [])

  const handleDismiss = () => {
    localStorage.setItem('bx_onboarding_dismissed', '1')
    setDismissed(true)
  }

  // Non mostrare se: loading, errore, dismissed, o tutti completati e l'utente ha già visto
  if (loading || dismissed || !data) return null
  const { steps = [], completati = 0, totale = 0 } = data
  const tuttiCompletati = completati === totale

  // Se tutti completati, mostra solo un banner di congratulazioni dismissibile
  if (tuttiCompletati) {
    return (
      <div className="bg-gradient-to-r from-teal-900/40 to-emerald-900/40 border border-teal-600/40 rounded-xl p-4 flex items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <span className="text-2xl">🎉</span>
          <div>
            <p className="text-sm font-semibold text-white">Setup completato!</p>
            <p className="text-xs text-slate-400">BeautyX è pronto per analizzare il tuo centro al 100%.</p>
          </div>
        </div>
        <button onClick={handleDismiss} className="text-slate-500 hover:text-slate-300 text-sm px-2">✕</button>
      </div>
    )
  }

  const perc = Math.round((completati / totale) * 100)

  return (
    <div className="bg-slate-800/60 border border-slate-700/50 rounded-xl overflow-hidden">
      {/* Header */}
      <div className="flex items-center justify-between px-4 py-3 border-b border-slate-700/50">
        <div className="flex items-center gap-3 flex-1 min-w-0">
          <span className="text-lg">🚀</span>
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2">
              <p className="text-sm font-semibold text-white">Inizia con BeautyX</p>
              <span className="text-xs text-teal-400 font-medium">{completati}/{totale}</span>
            </div>
            {/* Barra progresso */}
            <div className="mt-1 h-1.5 bg-slate-700 rounded-full overflow-hidden w-full max-w-xs">
              <div
                className="h-full bg-gradient-to-r from-teal-600 to-teal-400 rounded-full transition-all duration-500"
                style={{ width: `${perc}%` }}
              />
            </div>
          </div>
        </div>
        <div className="flex items-center gap-2 flex-shrink-0">
          <button
            onClick={() => setCollapsed(c => !c)}
            className="text-slate-400 hover:text-white text-xs px-2 py-1 rounded hover:bg-slate-700 transition-colors"
          >
            {collapsed ? '▼ Mostra' : '▲ Nascondi'}
          </button>
          <button
            onClick={handleDismiss}
            title="Non mostrare più"
            className="text-slate-600 hover:text-slate-400 text-xs px-1"
          >✕</button>
        </div>
      </div>

      {/* Steps */}
      {!collapsed && (
        <div className="divide-y divide-slate-700/30">
          {steps.map((step) => (
            <div
              key={step.id}
              className={`flex items-start gap-3 px-4 py-3 transition-colors ${
                step.done ? 'opacity-50' : 'hover:bg-slate-700/20'
              }`}
            >
              {/* Icona stato */}
              <div className={`mt-0.5 flex-shrink-0 w-5 h-5 rounded-full flex items-center justify-center text-xs ${
                step.done
                  ? 'bg-teal-600/30 text-teal-400'
                  : 'bg-slate-700 text-slate-500 border border-slate-600'
              }`}>
                {step.done ? '✓' : step.icon}
              </div>

              {/* Contenuto */}
              <div className="flex-1 min-w-0">
                <p className={`text-sm font-medium ${step.done ? 'line-through text-slate-500' : 'text-white'}`}>
                  {step.titolo}
                </p>
                {!step.done && (
                  <p className="text-xs text-slate-400 mt-0.5 leading-relaxed">{step.descrizione}</p>
                )}
              </div>

              {/* Azioni */}
              {!step.done && (
                <div className="flex items-center gap-1.5 flex-shrink-0 mt-0.5">
                  {step.chatAction ? (
                    <button
                      onClick={() => onOpenChat?.(step.prompt)}
                      className="px-2 py-1 bg-violet-700 hover:bg-violet-600 text-white text-xs rounded-md transition-colors whitespace-nowrap"
                    >
                      ✨ Chiedi a BeautyX
                    </button>
                  ) : step.hpaAction ? (
                    <Link
                      href="/contatta-hpa"
                      className="px-2 py-1 bg-teal-700 hover:bg-teal-600 text-white text-xs rounded-md transition-colors whitespace-nowrap"
                    >
                      👩‍💼 Contatta HPA
                    </Link>
                  ) : (
                    <>
                      {step.link && (
                        <Link
                          href={step.link}
                          className="px-2 py-1 bg-teal-700 hover:bg-teal-600 text-white text-xs rounded-md transition-colors whitespace-nowrap"
                        >
                          {step.linkLabel}
                        </Link>
                      )}
                      {step.prompt && onOpenChat && (
                        <button
                          onClick={() => onOpenChat(step.prompt)}
                          className="px-2 py-1 bg-slate-700 hover:bg-slate-600 text-slate-300 hover:text-white text-xs rounded-md transition-colors whitespace-nowrap"
                          title="Chiedi a BeautyX come farlo"
                        >
                          ✨
                        </button>
                      )}
                    </>
                  )}
                </div>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
