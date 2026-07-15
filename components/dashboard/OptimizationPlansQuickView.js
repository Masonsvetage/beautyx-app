'use client'

import { useState, useEffect } from 'react'
import { format } from 'date-fns'
import { it } from 'date-fns/locale'
import OptimizationPlanDetail from '@/components/analytics/OptimizationPlanDetail'

/**
 * Componente per mostrare e gestire i piani di ottimizzazione dalla dashboard
 * Permette di visualizzare dettagli e interagire direttamente con i piani
 */
export default function OptimizationPlansQuickView({ centroId }) {
  const [plans, setPlans] = useState([])
  const [stats, setStats] = useState(null)
  const [loading, setLoading] = useState(true)
  const [selectedPlan, setSelectedPlan] = useState(null)

  useEffect(() => {
    if (centroId) loadPlans()
  }, [centroId])

  async function loadPlans() {
    if (!centroId) return
    setLoading(true)
    try {
      const res = await fetch(`/api/optimization-plans?centro_id=${centroId}`)
      const data = await res.json()
      setPlans(data.plans || [])
      setStats(data.stats || null)
    } catch (error) {
      console.error('Errore caricamento piani:', error)
    }
    setLoading(false)
  }

  function formatEuro(val) {
    return new Intl.NumberFormat('it-IT', { style: 'currency', currency: 'EUR' }).format(val || 0)
  }

  function formatDate(dateStr) {
    if (!dateStr) return '-'
    return format(new Date(dateStr), 'dd/MM', { locale: it })
  }

  function getPriorityIcon(priorita) {
    switch (priorita) {
      case 1: return '🔴'
      case 2: return '🟡'
      case 3: return '🟢'
      default: return '⚪'
    }
  }

  function getStatoBadge(stato) {
    switch (stato) {
      case 'attivo': return <span className="px-1.5 py-0.5 bg-blue-500/30 text-blue-200 rounded text-xs font-semibold">Attivo</span>
      case 'in_corso': return <span className="px-1.5 py-0.5 bg-purple-500/30 text-purple-200 rounded text-xs font-semibold">In Corso</span>
      default: return null
    }
  }

  function isScadenzaVicina(dataScadenza) {
    if (!dataScadenza) return false
    const scadenza = new Date(dataScadenza)
    const oggi = new Date()
    const giorniRimanenti = Math.ceil((scadenza - oggi) / (1000 * 60 * 60 * 24))
    return giorniRimanenti <= 7 && giorniRimanenti >= 0
  }

  function isScaduto(dataScadenza) {
    if (!dataScadenza) return false
    const scadenza = new Date(dataScadenza)
    const oggi = new Date()
    return scadenza < oggi
  }

  // Filtra solo i piani attivi/in corso
  const activePlans = plans.filter(p => p.stato === 'attivo' || p.stato === 'in_corso')

  // Ordina per priorità e scadenza
  const sortedPlans = [...activePlans].sort((a, b) => {
    // Prima i piani scaduti
    if (isScaduto(a.data_scadenza) && !isScaduto(b.data_scadenza)) return -1
    if (!isScaduto(a.data_scadenza) && isScaduto(b.data_scadenza)) return 1
    // Poi per priorità (1 = alta)
    if (a.priorita !== b.priorita) return a.priorita - b.priorita
    // Poi per scadenza più vicina
    if (a.data_scadenza && b.data_scadenza) {
      return new Date(a.data_scadenza) - new Date(b.data_scadenza)
    }
    return 0
  })

  if (loading) {
    return (
      <div className="bg-gradient-to-br from-slate-700/40 to-slate-800/40 backdrop-blur-xl rounded-xl p-6 border border-slate-600/40 shadow-2xl">
        <div className="text-center py-4">
          <div className="text-2xl mb-2 animate-pulse">📋</div>
          <div className="text-slate-300">Caricamento piani...</div>
        </div>
      </div>
    )
  }

  return (
    <>
      <div className="bg-slate-800/60 rounded-lg border border-teal-500/30 overflow-hidden">
        {/* Header */}
        <div className="flex items-center justify-between px-3 py-2 bg-teal-900/20 border-b border-slate-600/30">
          <h3 className="text-sm font-bold text-white">
            📋 Piani Ottimizzazione
            {activePlans.length > 0 && <span className="ml-1 px-1.5 py-0.5 bg-teal-500/30 text-teal-200 rounded text-xs">{activePlans.length}</span>}
          </h3>
          <button onClick={() => window.location.href = '/analytics'} className="px-2 py-1 bg-teal-600 hover:bg-teal-700 text-white rounded text-xs font-medium">
            Tutti
          </button>
        </div>

        <div className="p-2">
          {sortedPlans.length === 0 ? (
            <div className="text-center py-3 text-slate-400 text-xs">Nessun piano attivo</div>
          ) : (
            <>
              {/* Lista piani - Layout orizzontale */}
              <div className="flex flex-wrap gap-2">
                {sortedPlans.slice(0, 4).map((plan) => (
                  <div
                    key={plan.id}
                    onClick={() => setSelectedPlan(plan)}
                    className={`flex items-center gap-2 px-3 py-2 bg-slate-900/50 rounded-lg border cursor-pointer flex-1 min-w-[220px] ${
                      isScaduto(plan.data_scadenza) ? 'border-red-500/50' : isScadenzaVicina(plan.data_scadenza) ? 'border-amber-500/50' : 'border-teal-500/30'
                    } hover:border-teal-400/50`}
                  >
                    <span className="text-xl">{getPriorityIcon(plan.priorita)}</span>
                    <div className="flex-1 min-w-0">
                      <div className="text-sm font-semibold text-white truncate">{plan.titolo}</div>
                      <div className="text-xs text-slate-400">{plan.categoria} · <span className="text-emerald-400">{formatEuro(plan.obiettivo_risparmio)}</span></div>
                    </div>
                    {plan.data_scadenza && (
                      <div className={`text-xs px-2 py-1 rounded ${isScaduto(plan.data_scadenza) ? 'bg-red-500/20 text-red-400' : isScadenzaVicina(plan.data_scadenza) ? 'bg-amber-500/20 text-amber-400' : 'bg-slate-700/50 text-slate-400'}`}>
                        {isScaduto(plan.data_scadenza) ? '⚠️' : formatDate(plan.data_scadenza)}
                      </div>
                    )}
                  </div>
                ))}
                {sortedPlans.length > 4 && (
                  <div
                    onClick={() => window.location.href = '/analytics'}
                    className="flex items-center justify-center px-3 py-2 bg-teal-500/20 rounded-lg border border-teal-500/30 hover:bg-teal-500/30 cursor-pointer min-w-[100px]"
                  >
                    <span className="text-teal-400 text-sm font-medium">+{sortedPlans.length - 4} altri</span>
                  </div>
                )}
              </div>

              {/* Stats inline */}
              {stats && (
                <div className="flex items-center justify-end gap-4 pt-2 mt-2 border-t border-slate-600/30 text-xs">
                  <span className="text-slate-400"><span className="text-white font-bold">{activePlans.length}</span> attivi</span>
                  <span className="text-slate-400"><span className="text-cyan-400 font-bold">{stats.completati || 0}</span> completati</span>
                  <span className="text-slate-400">Risparmiato: <span className="text-emerald-400 font-bold">{formatEuro(stats.risparmioTotale)}</span></span>
                </div>
              )}
            </>
          )}
        </div>
      </div>

      {/* Modal dettaglio piano */}
      {selectedPlan && (
        <OptimizationPlanDetail
          plan={selectedPlan}
          onClose={() => setSelectedPlan(null)}
          onPlanUpdated={(updatedPlan) => {
            if (updatedPlan._deleted) {
              setPlans(plans.filter(p => p.id !== updatedPlan.id))
            } else {
              setPlans(plans.map(p => p.id === updatedPlan.id ? updatedPlan : p))
            }
            setSelectedPlan(null)
          }}
        />
      )}
    </>
  )
}
