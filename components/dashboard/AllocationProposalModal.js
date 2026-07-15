'use client'

import { useState, useEffect } from 'react'
import { formatEuro, formatDate, validateAllocations } from '@/lib/pianificazione-utils'

export default function AllocationProposalModal({
  dailyRevenue,
  suggestedAllocations,
  onConfirm,
  onCancel
}) {
  const [allocations, setAllocations] = useState([])
  const [validation, setValidation] = useState(null)
  const [loading, setLoading] = useState(false)

  useEffect(() => {
    // Inizializza allocations con i suggerimenti
    if (suggestedAllocations) {
      setAllocations(suggestedAllocations.map(a => ({
        ...a,
        importo_finale: a.importo_suggerito,
        modified_by_user: false
      })))
    }
  }, [suggestedAllocations])

  useEffect(() => {
    // Valida allocazioni ogni volta che cambiano
    if (allocations.length > 0 && dailyRevenue) {
      const val = validateAllocations(allocations, dailyRevenue.importo_totale)
      setValidation(val)
    }
  }, [allocations, dailyRevenue])

  function handleAmountChange(index, newAmount) {
    const newAllocations = [...allocations]
    const parsedAmount = parseFloat(newAmount || 0)

    newAllocations[index] = {
      ...newAllocations[index],
      importo_finale: parsedAmount,
      modified_by_user: parsedAmount !== newAllocations[index].importo_suggerito
    }

    setAllocations(newAllocations)
  }

  async function handleConfirm() {
    if (!validation?.isValid) return

    setLoading(true)
    try {
      const allocationsData = allocations.map(a => ({
        accantonamento_id: a.accantonamento_id,
        importo_proposto: a.importo_suggerito,
        importo_finale: a.importo_finale,
        modified_by_user: a.modified_by_user
      }))

      await onConfirm(allocationsData)
    } catch (error) {
      console.error('Errore conferma allocazioni:', error)
    } finally {
      setLoading(false)
    }
  }

  if (!dailyRevenue || !suggestedAllocations) return null

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-2xl shadow-2xl max-w-2xl w-full max-h-[90vh] overflow-y-auto">

        {/* Header */}
        <div className="bg-gradient-to-r from-purple-600 to-indigo-600 text-white p-6 rounded-t-2xl">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-2xl font-bold">Allocazione Incasso</h2>
              <p className="text-purple-100 mt-1">
                Incasso: <span className="font-bold">{formatEuro(dailyRevenue.importo_totale)} €</span>
                {dailyRevenue.data && ` · ${formatDate(dailyRevenue.data)}`}
              </p>
            </div>
            <button
              onClick={onCancel}
              className="text-white hover:bg-white/20 rounded-full p-2 transition-colors"
            >
              ✕
            </button>
          </div>
        </div>

        {/* Content */}
        <div className="p-6 space-y-4">

          {/* Descrizione */}
          <p className="text-gray-600 text-sm">
            Il sistema suggerisce le seguenti allocazioni agli accantonamenti.
            Puoi modificare gli importi prima di confermare.
          </p>

          {/* Allocazioni */}
          {allocations.length === 0 ? (
            <div className="bg-yellow-50 border border-yellow-200 rounded-xl p-6 text-center">
              <div className="text-4xl mb-2">📊</div>
              <p className="text-gray-700 font-semibold">Nessuna allocazione automatica configurata</p>
              <p className="text-sm text-gray-600 mt-1">
                Crea accantonamenti con tipo "% su incasso" per allocazioni automatiche
              </p>
            </div>
          ) : (
            <div className="space-y-3">
              {allocations.map((allocation, index) => (
                <div
                  key={allocation.accantonamento_id}
                  className="bg-gray-50 border border-gray-200 rounded-xl p-4"
                  style={{ borderLeft: `4px solid ${allocation.colore}` }}
                >
                  <div className="flex items-start gap-4">
                    {/* Icona e Nome */}
                    <div className="flex-shrink-0">
                      <div
                        className="w-12 h-12 rounded-xl flex items-center justify-center text-2xl"
                        style={{ backgroundColor: `${allocation.colore}20` }}
                      >
                        {allocation.icona}
                      </div>
                    </div>

                    {/* Info e Input */}
                    <div className="flex-1 space-y-2">
                      <div className="flex items-center gap-2">
                        <h3 className="font-bold text-gray-800">{allocation.nome}</h3>
                        {allocation.percentuale > 0 && (
                          <span className="bg-blue-100 text-blue-700 text-xs px-2 py-1 rounded-full font-semibold">
                            {allocation.percentuale}%
                          </span>
                        )}
                      </div>

                      <div className="flex items-center gap-3">
                        {/* Input Importo */}
                        <div className="flex-1">
                          <input
                            type="number"
                            step="0.01"
                            min="0"
                            value={allocation.importo_finale}
                            onChange={(e) => handleAmountChange(index, e.target.value)}
                            className="w-full px-3 py-2 border-2 border-gray-300 rounded-lg focus:border-purple-500 focus:outline-none text-lg font-bold"
                            placeholder="0.00"
                          />
                        </div>

                        {/* Suggerito */}
                        <div className="text-sm text-gray-600">
                          Suggerito: <span className="font-semibold">{formatEuro(allocation.importo_suggerito)} €</span>
                        </div>
                      </div>

                      {/* Indicatore modifica */}
                      {allocation.modified_by_user && (
                        <div className="text-xs text-orange-600 font-semibold">
                          ✏️ Modificato manualmente
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}

          {/* Riepilogo */}
          {validation && allocations.length > 0 && (
            <div className={`rounded-xl p-4 ${
              validation.isValid
                ? 'bg-green-50 border border-green-200'
                : 'bg-red-50 border border-red-200'
            }`}>
              <div className="flex items-center justify-between mb-2">
                <span className="font-semibold text-gray-700">Totale allocato:</span>
                <span className="text-xl font-bold text-gray-800">
                  {formatEuro(validation.totalAllocated)} €
                </span>
              </div>

              <div className="flex items-center justify-between">
                <span className="font-semibold text-gray-700">Rimanente:</span>
                <span className={`text-xl font-bold ${
                  validation.isValid ? 'text-green-600' : 'text-red-600'
                }`}>
                  {validation.isValid ? '✅ ' : '⚠️ '}
                  {formatEuro(Math.abs(validation.remaining))} €
                </span>
              </div>

              {!validation.isValid && (
                <div className="mt-3 text-sm text-red-600 font-semibold">
                  ⚠️ Attenzione: Le allocazioni superano l'incasso di {formatEuro(validation.exceededBy)} €
                </div>
              )}
            </div>
          )}

          {/* Info aggiuntiva */}
          {allocations.length > 0 && (
            <p className="text-xs text-gray-500 text-center">
              💡 Puoi modificare gli importi prima di confermare.
              Il rimanente sarà disponibile come liquidità.
            </p>
          )}
        </div>

        {/* Footer Actions */}
        <div className="bg-gray-50 p-6 rounded-b-2xl flex gap-3">
          <button
            onClick={onCancel}
            className="flex-1 px-6 py-3 bg-gray-200 hover:bg-gray-300 text-gray-700 rounded-xl font-semibold transition-colors"
            disabled={loading}
          >
            Annulla
          </button>
          <button
            onClick={handleConfirm}
            disabled={!validation?.isValid || loading || allocations.length === 0}
            className={`flex-1 px-6 py-3 rounded-xl font-semibold transition-all ${
              validation?.isValid && allocations.length > 0 && !loading
                ? 'bg-gradient-to-r from-purple-600 to-indigo-600 hover:from-purple-700 hover:to-indigo-700 text-white shadow-lg hover:shadow-xl'
                : 'bg-gray-300 text-gray-500 cursor-not-allowed'
            }`}
          >
            {loading ? '⏳ Confermando...' : 'Conferma e Versa'}
          </button>
        </div>
      </div>
    </div>
  )
}
