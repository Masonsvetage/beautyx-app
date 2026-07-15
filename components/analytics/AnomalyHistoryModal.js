'use client'

import { useState, useEffect } from 'react'
import { formatEuro } from '@/lib/formatters'

export default function AnomalyHistoryModal({ centroId, onClose }) {
  const [anomalies, setAnomalies] = useState([])
  const [loading, setLoading] = useState(true)
  const [filter, setFilter] = useState('all') // all, confermato, validato_legittimo

  useEffect(() => {
    if (centroId) {
      loadHistory()
    }
  }, [centroId, filter])

  async function loadHistory() {
    setLoading(true)
    try {
      let url = `/api/anomalies?centro_id=${centroId}`
      if (filter !== 'all') {
        url += `&stato=${filter}`
      }
      const res = await fetch(url)
      const data = await res.json()
      setAnomalies(data.anomalies || [])
    } catch (error) {
      console.error('Errore caricamento storico:', error)
    }
    setLoading(false)
  }

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-xl shadow-2xl max-w-4xl w-full max-h-[90vh] flex flex-col">
        {/* Header */}
        <div className="bg-gradient-to-r from-teal-600 to-cyan-600 text-white p-6">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="w-12 h-12 bg-white/20 backdrop-blur-sm rounded-xl flex items-center justify-center shadow-lg">
                <span className="text-2xl">📋</span>
              </div>
              <div>
                <h2 className="text-2xl font-bold">Storico Anomalie Validate</h2>
                <p className="text-sm text-teal-100 mt-1">
                  Consulta tutte le anomalie che hai già validato
                </p>
              </div>
            </div>
            <button
              onClick={onClose}
              className="w-10 h-10 bg-white/20 hover:bg-white/30 rounded-lg flex items-center justify-center transition-all"
            >
              <span className="text-2xl">✕</span>
            </button>
          </div>
        </div>

        {/* Filters */}
        <div className="p-4 border-b border-gray-200 bg-gray-50">
          <div className="flex gap-2">
            <button
              onClick={() => setFilter('all')}
              className={`px-4 py-2 rounded-lg font-semibold text-sm transition-all ${
                filter === 'all'
                  ? 'bg-gradient-to-r from-teal-600 to-cyan-600 text-white shadow-lg'
                  : 'bg-white text-gray-700 hover:bg-gray-100 border border-gray-300'
              }`}
            >
              Tutte ({anomalies.length})
            </button>
            <button
              onClick={() => setFilter('confermato')}
              className={`px-4 py-2 rounded-lg font-semibold text-sm transition-all ${
                filter === 'confermato'
                  ? 'bg-gradient-to-r from-red-600 to-rose-600 text-white shadow-lg'
                  : 'bg-white text-gray-700 hover:bg-gray-100 border border-gray-300'
              }`}
            >
              🚨 Confermate
            </button>
            <button
              onClick={() => setFilter('validato_legittimo')}
              className={`px-4 py-2 rounded-lg font-semibold text-sm transition-all ${
                filter === 'validato_legittimo'
                  ? 'bg-gradient-to-r from-green-600 to-emerald-600 text-white shadow-lg'
                  : 'bg-white text-gray-700 hover:bg-gray-100 border border-gray-300'
              }`}
            >
              ✅ Legittime
            </button>
          </div>
        </div>

        {/* Content */}
        <div className="p-6 overflow-y-auto flex-1">
          {loading ? (
            <div className="text-center py-12">
              <div className="text-4xl mb-4">⏳</div>
              <div className="text-gray-600">Caricamento storico...</div>
            </div>
          ) : anomalies.length === 0 ? (
            <div className="text-center py-12">
              <div className="text-6xl mb-4">📭</div>
              <div className="text-xl font-semibold text-gray-600 mb-2">
                Nessuna anomalia validata
              </div>
              <p className="text-gray-500">
                {filter === 'all'
                  ? 'Non hai ancora validato nessuna anomalia'
                  : `Nessuna anomalia con stato "${filter === 'confermato' ? 'Confermata' : 'Legittima'}"`
                }
              </p>
            </div>
          ) : (
            <div className="space-y-4">
              {anomalies.map((anomaly, idx) => (
                <div
                  key={idx}
                  className={`p-4 rounded-lg border-2 ${
                    anomaly.stato === 'confermato'
                      ? 'bg-red-50 border-red-200'
                      : 'bg-green-50 border-green-200'
                  }`}
                >
                  <div className="flex items-start justify-between mb-3">
                    <div className="flex items-center gap-2">
                      <span className="text-xl">
                        {anomaly.stato === 'confermato' ? '🚨' : '✅'}
                      </span>
                      <div>
                        <div className="font-semibold text-gray-800">
                          {anomaly.tipo_anomalia === 'outlier' ? 'Importo Anomalo' : 'Crescita Anomala'}
                        </div>
                        <div className="text-sm text-gray-600">
                          {anomaly.categoria} • {new Date(anomaly.data_rilevamento).toLocaleDateString('it-IT')}
                        </div>
                      </div>
                    </div>
                    <div className={`px-3 py-1 rounded-full text-xs font-bold ${
                      anomaly.stato === 'confermato'
                        ? 'bg-red-200 text-red-800'
                        : 'bg-green-200 text-green-800'
                    }`}>
                      {anomaly.stato === 'confermato' ? 'CONFERMATA' : 'LEGITTIMA'}
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-4 mb-3">
                    <div className="p-3 bg-white rounded border border-gray-200">
                      <div className="text-xs text-gray-600">Importo</div>
                      <div className="text-lg font-bold text-gray-800">
                        {formatEuro(anomaly.importo)}
                      </div>
                    </div>
                    {anomaly.data_validazione && (
                      <div className="p-3 bg-white rounded border border-gray-200">
                        <div className="text-xs text-gray-600">Validata il</div>
                        <div className="text-sm font-semibold text-gray-800">
                          {new Date(anomaly.data_validazione).toLocaleDateString('it-IT')}
                        </div>
                      </div>
                    )}
                  </div>

                  {anomaly.note_utente && (
                    <div className="p-3 bg-white rounded border border-gray-300">
                      <div className="text-xs font-semibold text-gray-600 mb-1">📝 Note:</div>
                      <div className="text-sm text-gray-700">{anomaly.note_utente}</div>
                    </div>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="p-4 border-t border-gray-200 bg-gray-50">
          <button
            onClick={onClose}
            className="w-full bg-gradient-to-r from-indigo-600 to-purple-600 text-white px-6 py-3 rounded-xl font-semibold hover:from-indigo-700 hover:to-purple-700 transition-all shadow-lg"
          >
            Chiudi
          </button>
        </div>
      </div>
    </div>
  )
}
