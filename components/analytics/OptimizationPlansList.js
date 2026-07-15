'use client'

import { useState, useEffect } from 'react'
import { format } from 'date-fns'
import { it } from 'date-fns/locale'
import OptimizationPlanDetail from './OptimizationPlanDetail'
import OptimizationPlanModal from './OptimizationPlanModal'

/**
 * Lista dei piani di ottimizzazione per un centro
 * Mostra piani attivi, in corso e statistiche
 */
export default function OptimizationPlansList({ centroId, onRefresh }) {
  const [plans, setPlans] = useState([])
  const [stats, setStats] = useState(null)
  const [loading, setLoading] = useState(true)
  const [selectedPlan, setSelectedPlan] = useState(null)
  const [showNewPlanModal, setShowNewPlanModal] = useState(false)
  const [filter, setFilter] = useState('attivi') // 'attivi', 'completati', 'annullati', 'tutti'
  const [collapsed, setCollapsed] = useState(false)

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

  function getStatoBadge(stato) {
    switch (stato) {
      case 'attivo': return <span className="px-1.5 py-0.5 bg-blue-100 text-blue-700 rounded text-xs font-semibold">Attivo</span>
      case 'in_corso': return <span className="px-1.5 py-0.5 bg-purple-100 text-purple-700 rounded text-xs font-semibold">In Corso</span>
      case 'completato': return <span className="px-1.5 py-0.5 bg-green-100 text-green-700 rounded text-xs font-semibold">Completato</span>
      case 'annullato': return <span className="px-1.5 py-0.5 bg-gray-100 text-gray-700 rounded text-xs font-semibold">Annullato</span>
      default: return null
    }
  }

  function getPriorityIcon(priorita) {
    switch (priorita) {
      case 1: return '🔴'
      case 2: return '🟡'
      case 3: return '🟢'
      default: return '⚪'
    }
  }

  // Filtra piani
  const filteredPlans = plans.filter(p => {
    if (filter === 'attivi') return p.stato === 'attivo' || p.stato === 'in_corso'
    if (filter === 'completati') return p.stato === 'completato'
    if (filter === 'annullati') return p.stato === 'annullato'
    return true
  })

  // Conta piani annullati
  const cancelledPlansCount = plans.filter(p => p.stato === 'annullato').length

  // Conta piani attivi per badge header
  const activePlansCount = plans.filter(p => p.stato === 'attivo' || p.stato === 'in_corso').length

  if (loading) {
    return (
      <div className="bg-white/90 backdrop-blur-md rounded-xl shadow-lg border border-gray-200 p-4">
        <div className="text-center py-4">
          <div className="text-2xl mb-2">⏳</div>
          <div className="text-gray-600">Caricamento piani...</div>
        </div>
      </div>
    )
  }

  return (
    <>
      <div className="bg-white/90 backdrop-blur-md rounded-xl shadow-lg border border-gray-200 overflow-hidden">
        {/* Header */}
        <div
          className="bg-gradient-to-r from-indigo-600 to-purple-600 text-white p-3 cursor-pointer"
          onClick={() => setCollapsed(!collapsed)}
        >
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <span className="text-xl">📋</span>
              <h3 className="font-bold">Piani di Ottimizzazione</h3>
              {activePlansCount > 0 && (
                <span className="px-2 py-0.5 bg-white/20 rounded-full text-xs font-bold">
                  {activePlansCount} attivi
                </span>
              )}
            </div>
            <div className="flex items-center gap-2">
              {stats && stats.risparmioTotale > 0 && (
                <span className="text-xs bg-green-500/30 px-2 py-1 rounded">
                  Risparmiati: {formatEuro(stats.risparmioTotale)}
                </span>
              )}
              <span className="text-lg">{collapsed ? '▼' : '▲'}</span>
            </div>
          </div>
        </div>

        {!collapsed && (
          <>
            {/* Toolbar */}
            <div className="p-2 border-b border-gray-200 bg-gray-50 flex items-center justify-between">
              <div className="flex gap-1">
                <button
                  onClick={() => setFilter('attivi')}
                  className={`px-2 py-1 rounded text-xs font-semibold transition-colors ${
                    filter === 'attivi'
                      ? 'bg-indigo-600 text-white'
                      : 'bg-gray-200 text-gray-700 hover:bg-gray-300'
                  }`}
                >
                  Attivi ({plans.filter(p => p.stato === 'attivo' || p.stato === 'in_corso').length})
                </button>
                <button
                  onClick={() => setFilter('completati')}
                  className={`px-2 py-1 rounded text-xs font-semibold transition-colors ${
                    filter === 'completati'
                      ? 'bg-green-600 text-white'
                      : 'bg-gray-200 text-gray-700 hover:bg-gray-300'
                  }`}
                >
                  Completati ({plans.filter(p => p.stato === 'completato').length})
                </button>
                <button
                  onClick={() => setFilter('annullati')}
                  className={`px-2 py-1 rounded text-xs font-semibold transition-colors ${
                    filter === 'annullati'
                      ? 'bg-gray-600 text-white'
                      : 'bg-gray-200 text-gray-700 hover:bg-gray-300'
                  }`}
                >
                  Annullati ({cancelledPlansCount})
                </button>
                <button
                  onClick={() => setFilter('tutti')}
                  className={`px-2 py-1 rounded text-xs font-semibold transition-colors ${
                    filter === 'tutti'
                      ? 'bg-slate-600 text-white'
                      : 'bg-gray-200 text-gray-700 hover:bg-gray-300'
                  }`}
                >
                  Tutti ({plans.length})
                </button>
              </div>
              <button
                onClick={() => setShowNewPlanModal(true)}
                className="px-2 py-1 bg-green-600 text-white rounded text-xs font-semibold hover:bg-green-700 transition-colors"
              >
                + Nuovo Piano
              </button>
            </div>

            {/* Lista piani */}
            <div className="p-2 max-h-64 overflow-y-auto">
              {filteredPlans.length === 0 ? (
                <div className="text-center py-6 text-gray-500">
                  <div className="text-3xl mb-2">📋</div>
                  <p className="text-sm">
                    {filter === 'attivi'
                      ? 'Nessun piano attivo'
                      : filter === 'completati'
                      ? 'Nessun piano completato'
                      : filter === 'annullati'
                      ? 'Nessun piano annullato'
                      : 'Nessun piano'}
                  </p>
                  <p className="text-xs mt-1">
                    {filter === 'annullati'
                      ? 'I piani annullati appariranno qui'
                      : 'Crea un piano da un costo ottimizzabile o anomalia'}
                  </p>
                </div>
              ) : (
                <div className="space-y-2">
                  {filteredPlans.map((plan) => (
                    <div
                      key={plan.id}
                      onClick={() => setSelectedPlan(plan)}
                      className="p-3 bg-white rounded-lg border border-gray-200 hover:border-indigo-300 hover:shadow-md transition-all cursor-pointer"
                    >
                      <div className="flex items-start justify-between">
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2 mb-1">
                            <span>{getPriorityIcon(plan.priorita)}</span>
                            <span className="font-semibold text-gray-800 truncate">
                              {plan.titolo}
                            </span>
                            {getStatoBadge(plan.stato)}
                          </div>
                          <div className="flex items-center gap-3 text-xs text-gray-500">
                            <span>{plan.categoria}</span>
                            <span>•</span>
                            <span>{formatEuro(plan.importo_rilevato)}</span>
                            {plan.optimization_logs?.length > 0 && (
                              <>
                                <span>•</span>
                                <span>{plan.optimization_logs.length} note</span>
                              </>
                            )}
                          </div>
                          {/* Ultimo log */}
                          {plan.optimization_logs?.length > 0 && (
                            <div className="mt-1 text-xs text-indigo-600 truncate">
                              Ultimo: {formatDate(plan.optimization_logs[0]?.data_attivita)} - {plan.optimization_logs[0]?.descrizione?.substring(0, 50)}...
                            </div>
                          )}
                        </div>
                        <div className="text-right ml-2">
                          {plan.risparmio_effettivo ? (
                            <div className="text-sm font-bold text-green-600">
                              {formatEuro(plan.risparmio_effettivo)}
                            </div>
                          ) : plan.obiettivo_risparmio ? (
                            <div className="text-sm text-gray-500">
                              Obj: {formatEuro(plan.obiettivo_risparmio)}
                            </div>
                          ) : null}
                          {plan.data_scadenza && plan.stato !== 'completato' && (
                            <div className="text-xs text-gray-400">
                              Scad: {formatDate(plan.data_scadenza)}
                            </div>
                          )}
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* Stats Footer */}
            {stats && (stats.completati > 0 || stats.risparmioTotale > 0 || cancelledPlansCount > 0) && (
              <div className="p-2 border-t border-gray-200 bg-gray-50">
                <div className="flex items-center justify-around text-xs">
                  <div className="text-center">
                    <div className="font-bold text-gray-800">{stats.completati}</div>
                    <div className="text-gray-500">Completati</div>
                  </div>
                  <div className="text-center">
                    <div className="font-bold text-green-600">{formatEuro(stats.risparmioTotale)}</div>
                    <div className="text-gray-500">Risparmio Totale</div>
                  </div>
                  {cancelledPlansCount > 0 && (
                    <div className="text-center">
                      <div className="font-bold text-gray-500">{cancelledPlansCount}</div>
                      <div className="text-gray-500">Annullati</div>
                    </div>
                  )}
                </div>
              </div>
            )}
          </>
        )}
      </div>

      {/* Modal dettaglio piano */}
      {selectedPlan && (
        <OptimizationPlanDetail
          plan={selectedPlan}
          onClose={() => setSelectedPlan(null)}
          onPlanUpdated={(updatedPlan) => {
            // Se il piano è stato eliminato, rimuovilo dalla lista
            if (updatedPlan._deleted) {
              setPlans(plans.filter(p => p.id !== updatedPlan.id))
            } else {
              setPlans(plans.map(p => p.id === updatedPlan.id ? updatedPlan : p))
            }
            setSelectedPlan(null)
            if (onRefresh) onRefresh()
          }}
        />
      )}

      {/* Modal nuovo piano */}
      {showNewPlanModal && (
        <OptimizationPlanModal
          centroId={centroId}
          onClose={() => setShowNewPlanModal(false)}
          onPlanCreated={(newPlan) => {
            setPlans([newPlan, ...plans])
            setShowNewPlanModal(false)
            if (onRefresh) onRefresh()
          }}
        />
      )}
    </>
  )
}
