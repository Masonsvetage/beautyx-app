'use client'

import { useState, useEffect } from 'react'
import { formatEuro } from '@/lib/formatters'
import CostDetailModal from './CostDetailModal'
import AnomalyValidationModal from './AnomalyValidationModal'
import OptimizationPlanModal from './OptimizationPlanModal'
import OptimizationPlansList from './OptimizationPlansList'

export default function AnomaliesPanel({ anomalies, productivity, centroId, onAnomalyValidated }) {
  const [selectedCost, setSelectedCost] = useState(null)
  const [selectedAnomaly, setSelectedAnomaly] = useState(null)
  const [validatedAnomaliesFromDB, setValidatedAnomaliesFromDB] = useState([])
  const [expandedCosts, setExpandedCosts] = useState(false)
  const [expandedAnomalies, setExpandedAnomalies] = useState(false)
  const [planToCreate, setPlanToCreate] = useState(null) // Per creare piano da costo/anomalia
  const [refreshPlans, setRefreshPlans] = useState(0) // Trigger refresh lista piani

  // Carica anomalie validate dal database
  useEffect(() => {
    if (!centroId) return
    loadValidatedAnomalies()
  }, [centroId])

  async function loadValidatedAnomalies() {
    try {
      const res = await fetch(`/api/anomalies?centro_id=${centroId}&stato=validato_legittimo`)
      const data = await res.json()
      setValidatedAnomaliesFromDB(data.anomalies || [])
    } catch (error) {
      console.error('Errore caricamento anomalie validate:', error)
    }
  }

  function handleAnomalyValidated(anomaly, stato) {
    setSelectedAnomaly(null)
    loadValidatedAnomalies() // Ricarica dal database
    if (onAnomalyValidated) onAnomalyValidated()
  }

  // Filtra le anomalie già validate (supporta vecchi e nuovi tipi)
  const activeAnomalies = anomalies?.filter(a => {
    // Per anomalie outlier (vecchio sistema), confronta movimento_id
    if (a.tipo === 'outlier' && a.movimento?.id) {
      return !validatedAnomaliesFromDB.some(v =>
        v.movimento_id === a.movimento.id && v.stato === 'validato_legittimo'
      )
    }

    // Per tutti gli altri tipi, confronta tipo + categoria
    if (a.categoria) {
      return !validatedAnomaliesFromDB.some(v =>
        v.categoria === a.categoria &&
        v.tipo_anomalia === a.tipo &&
        v.stato === 'validato_legittimo'
      )
    }

    return true
  }) || []

  const getGravityIcon = (gravita) => {
    switch (gravita) {
      case 'alta': return '🔴'
      case 'media': return '🟡'
      default: return '🟢'
    }
  }

  const getGravityColor = (gravita) => {
    switch (gravita) {
      case 'alta': return 'border-red-300 bg-red-50'
      case 'media': return 'border-yellow-300 bg-yellow-50'
      default: return 'border-green-300 bg-green-50'
    }
  }

  return (
    <div className="space-y-2">
      {/* Costi Ottimizzabili */}
      {productivity && productivity.costiOttimizzabili.length > 0 && (
        <div className="bg-white rounded border border-orange-200 p-2">
          <button
            onClick={() => setExpandedCosts(!expandedCosts)}
            className="w-full flex items-center gap-2 cursor-pointer hover:bg-orange-50 rounded p-1 transition-colors"
          >
            <div className="w-6 h-6 bg-orange-500 rounded flex items-center justify-center shrink-0">
              <span className="text-sm">💡</span>
            </div>
            <h3 className="font-bold text-gray-800 text-xs flex-1 text-left">Costi Ottimizzabili</h3>
            <div className="flex items-center gap-2">
              <span className="text-xs font-semibold text-orange-700">
                {productivity.costiOttimizzabili.length} categorie
              </span>
              <span className="text-xs font-bold text-orange-600">
                {formatEuro(productivity.totaleCostiOttimizzabili)}
              </span>
              <span className="text-gray-500 text-xs">{expandedCosts ? '▼' : '▶'}</span>
            </div>
          </button>

          {expandedCosts && (
            <>
              <div className="space-y-1 mt-2">
                {productivity.costiOttimizzabili.map((cat, idx) => (
                  <div
                    key={idx}
                    className={`flex items-center gap-2 p-2 rounded border transition-colors ${
                      cat.gravita === 'alta'
                        ? 'bg-red-50 border-red-200'
                        : 'bg-orange-50 border-orange-200'
                    }`}
                  >
                    <button
                      onClick={() => setSelectedCost(cat)}
                      className="flex items-center justify-between flex-1 min-w-0 cursor-pointer text-left hover:opacity-80"
                    >
                      <div className="flex items-center gap-2 flex-1 min-w-0">
                        <span className="text-sm">{cat.gravita === 'alta' ? '🔴' : '🟡'}</span>
                        <div className="flex flex-col min-w-0">
                          <span className="font-semibold text-gray-800 text-sm truncate">{cat.categoria}</span>
                          <span className="text-xs text-gray-500 truncate">{cat.motivo}</span>
                        </div>
                      </div>
                      <div className="flex flex-col items-end gap-0.5 ml-2">
                        <div className={`text-sm font-bold whitespace-nowrap ${
                          cat.gravita === 'alta' ? 'text-red-600' : 'text-orange-600'
                        }`}>
                          -{formatEuro(cat.uscite)}
                        </div>
                        <div className="text-xs text-gray-500">
                          {cat.count} mov.
                        </div>
                      </div>
                    </button>
                    <button
                      onClick={(e) => {
                        e.stopPropagation()
                        setPlanToCreate({ type: 'cost', data: cat })
                      }}
                      className="shrink-0 bg-green-600 text-white px-2 py-1 rounded text-xs font-semibold hover:bg-green-700 whitespace-nowrap"
                      title="Crea piano di ottimizzazione"
                    >
                      📋 Piano
                    </button>
                  </div>
                ))}
              </div>

              <div className="mt-2 p-2 bg-blue-50 rounded border border-blue-200">
                <div className="flex items-start gap-1">
                  <span className="text-sm">💡</span>
                  <div className="text-xs text-gray-700 leading-tight">
                    <strong className="text-blue-700">Tip:</strong> Questi costi superano le soglie percentuali consigliate. Clicca per vedere i dettagli e valutare ottimizzazioni.
                  </div>
                </div>
              </div>
            </>
          )}
        </div>
      )}

      {/* Anomalie Rilevate */}
      {activeAnomalies && activeAnomalies.length > 0 && (
        <div className="bg-white rounded border border-red-200 p-2">
          <button
            onClick={() => setExpandedAnomalies(!expandedAnomalies)}
            className="w-full flex items-center gap-2 cursor-pointer hover:bg-red-50 rounded p-1 transition-colors"
          >
            <div className="w-6 h-6 bg-red-500 rounded flex items-center justify-center shrink-0">
              <span className="text-sm">🚨</span>
            </div>
            <h3 className="font-bold text-gray-800 text-xs flex-1 text-left">Anomalie e Costi Sospetti</h3>
            <div className="flex items-center gap-2">
              <span className="text-xs font-semibold text-red-700">
                {activeAnomalies.length} anomalie
              </span>
              <span className="text-xs font-bold text-red-600">
                {activeAnomalies.filter(a => a.gravita === 'alta').length} alte
              </span>
              <span className="text-gray-500 text-xs">{expandedAnomalies ? '▼' : '▶'}</span>
            </div>
          </button>

          {expandedAnomalies && (
            <>
              <div className="space-y-1 mt-2">
                {activeAnomalies.slice(0, 10).map((anomaly, idx) => (
                  <div
                    key={idx}
                    className={`p-2 rounded border ${getGravityColor(anomaly.gravita)}`}
                  >
                    <div className="flex items-center justify-between gap-2 mb-1">
                      <div className="flex items-center gap-1.5 flex-1 min-w-0">
                        <span className="text-sm">{getGravityIcon(anomaly.gravita)}</span>
                        <span className="font-semibold text-gray-800 text-xs truncate">
                          {anomaly.categoria}
                        </span>
                        {anomaly.numeroMovimenti > 0 && (
                          <span className="text-xs text-gray-500">• {anomaly.numeroMovimenti} mov.</span>
                        )}
                      </div>
                      <div className="flex items-center gap-1">
                        {anomaly.importo > 0 && (
                          <span className="text-xs font-bold text-gray-700">
                            {formatEuro(anomaly.importo)}
                          </span>
                        )}
                        <span className={`px-1.5 py-0.5 rounded text-xs font-bold whitespace-nowrap ${
                          anomaly.gravita === 'alta' ? 'bg-red-200 text-red-800' :
                          anomaly.gravita === 'media' ? 'bg-yellow-200 text-yellow-800' :
                          'bg-green-200 text-green-800'
                        }`}>
                          {anomaly.gravita === 'alta' ? 'ALTA' : anomaly.gravita === 'media' ? 'MEDIA' : 'BASSA'}
                        </span>
                      </div>
                    </div>

                    <div className="flex items-center gap-2">
                      <div className="flex-1 text-xs text-gray-700 leading-tight min-w-0">
                        {anomaly.motivo || anomaly.descrizione}
                      </div>
                      <button
                        onClick={() => setPlanToCreate({ type: 'anomaly', data: anomaly })}
                        className="shrink-0 bg-green-600 text-white px-2 py-1 rounded text-xs font-semibold hover:bg-green-700 whitespace-nowrap"
                        title="Crea piano di ottimizzazione"
                      >
                        📋 Piano
                      </button>
                      <button
                        onClick={() => {
                          console.log('[AnomaliesPanel] Opening validation modal for:', {
                            tipo: anomaly.tipo,
                            categoria: anomaly.categoria,
                            hasMovimenti: !!anomaly.movimenti,
                            movimentiCount: anomaly.movimenti?.length || 0
                          })
                          setSelectedAnomaly(anomaly)
                        }}
                        className="shrink-0 bg-blue-600 text-white px-2 py-1 rounded text-xs font-semibold hover:bg-blue-700 whitespace-nowrap"
                      >
                        Dettagli
                      </button>
                    </div>
                  </div>
                ))}
              </div>

              {activeAnomalies.length > 10 && (
                <div className="mt-2 text-center text-xs text-gray-500">
                  + altre {activeAnomalies.length - 10}
                </div>
              )}
            </>
          )}
        </div>
      )}

      {/* Nessuna anomalia */}
      {(!activeAnomalies || activeAnomalies.length === 0) && (!productivity || productivity.costiOttimizzabili.length === 0) && (
        <div className="bg-white rounded border border-green-200 p-2">
          <div className="flex items-center gap-2">
            <div className="w-6 h-6 bg-green-500 rounded flex items-center justify-center">
              <span className="text-sm">✅</span>
            </div>
            <div>
              <h3 className="font-bold text-gray-800 text-xs">Tutto OK!</h3>
              <p className="text-xs text-gray-600">Nessuna anomalia</p>
            </div>
          </div>
        </div>
      )}

      {/* Modal Dettaglio Costi */}
      {selectedCost && (
        <CostDetailModal
          category={selectedCost}
          centroId={centroId}
          onClose={() => setSelectedCost(null)}
          onMovementUpdated={() => {
            setSelectedCost(null)
            if (onAnomalyValidated) onAnomalyValidated()
          }}
        />
      )}

      {/* Modal Validazione Anomalie */}
      {selectedAnomaly && (
        <AnomalyValidationModal
          anomaly={selectedAnomaly}
          centroId={centroId}
          onValidate={handleAnomalyValidated}
          onClose={() => setSelectedAnomaly(null)}
        />
      )}

      {/* Modal Creazione Piano */}
      {planToCreate && (
        <OptimizationPlanModal
          centroId={centroId}
          anomaly={planToCreate.type === 'anomaly' ? planToCreate.data : null}
          cost={planToCreate.type === 'cost' ? planToCreate.data : null}
          onClose={() => setPlanToCreate(null)}
          onPlanCreated={() => {
            setPlanToCreate(null)
            setRefreshPlans(r => r + 1)
          }}
        />
      )}

      {/* Lista Piani di Ottimizzazione */}
      <OptimizationPlansList
        key={refreshPlans}
        centroId={centroId}
        onRefresh={onAnomalyValidated}
      />
    </div>
  )
}
