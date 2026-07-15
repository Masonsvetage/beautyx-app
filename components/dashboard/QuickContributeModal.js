'use client'

import { useState } from 'react'

export default function QuickContributeModal({ accantonamento, onConfirm, onCancel }) {
  const [importo, setImporto] = useState('')
  const [descrizione, setDescrizione] = useState('')
  const [loading, setLoading] = useState(false)

  const quickAmounts = [10, 25, 50, 100]

  async function handleConfirm(e) {
    e.preventDefault()
    if (!importo || parseFloat(importo) <= 0) return

    setLoading(true)
    try {
      await onConfirm(parseFloat(importo), descrizione || 'Versamento manuale rapido')
      // Reset form
      setImporto('')
      setDescrizione('')
    } catch (error) {
      console.error('Errore versamento:', error)
    } finally {
      setLoading(false)
    }
  }

  function handleQuickAmount(amount) {
    setImporto(amount.toString())
  }

  if (!accantonamento) return null

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-2xl shadow-2xl max-w-md w-full">

        {/* Header */}
        <div
          className="p-6 rounded-t-2xl text-white"
          style={{
            background: `linear-gradient(135deg, ${accantonamento.colore || '#8b5cf6'} 0%, ${accantonamento.colore || '#6366f1'}dd 100%)`
          }}
        >
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="w-12 h-12 bg-white/20 rounded-xl flex items-center justify-center text-2xl">
                {accantonamento.icona || '💰'}
              </div>
              <div>
                <h2 className="text-xl font-bold">Versa Contributo</h2>
                <p className="text-sm opacity-90">{accantonamento.nome}</p>
              </div>
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
        <form onSubmit={handleConfirm} className="p-6 space-y-4">

          {/* Info Saldo */}
          <div className="bg-gray-50 border border-gray-200 rounded-xl p-4">
            <div className="text-sm text-gray-600">Saldo attuale</div>
            <div className="text-2xl font-bold text-gray-800">
              {parseFloat(accantonamento.saldo_attuale || 0).toLocaleString('it-IT', {
                minimumFractionDigits: 2,
                maximumFractionDigits: 2
              })} €
            </div>
            {accantonamento.importo_obiettivo > 0 && (
              <div className="text-sm text-gray-500 mt-1">
                Obiettivo: {parseFloat(accantonamento.importo_obiettivo).toLocaleString('it-IT', {
                  minimumFractionDigits: 2,
                  maximumFractionDigits: 2
                })} €
              </div>
            )}
          </div>

          {/* Input Importo */}
          <div>
            <label className="block text-sm font-semibold text-gray-700 mb-2">
              Importo da versare (€)
            </label>
            <input
              type="number"
              step="0.01"
              min="0.01"
              value={importo}
              onChange={(e) => setImporto(e.target.value)}
              className="w-full px-4 py-3 border-2 border-gray-300 rounded-xl focus:border-purple-500 focus:outline-none text-2xl font-bold text-center"
              placeholder="0.00"
              required
              autoFocus
            />
          </div>

          {/* Quick Amount Buttons */}
          <div>
            <div className="text-xs text-gray-500 mb-2 text-center">Importi rapidi</div>
            <div className="grid grid-cols-4 gap-2">
              {quickAmounts.map(amount => (
                <button
                  key={amount}
                  type="button"
                  onClick={() => handleQuickAmount(amount)}
                  className="px-3 py-2 bg-gray-100 hover:bg-gray-200 text-gray-700 rounded-lg font-semibold transition-colors text-sm"
                >
                  +{amount}€
                </button>
              ))}
            </div>
          </div>

          {/* Input Descrizione */}
          <div>
            <label className="block text-sm font-semibold text-gray-700 mb-2">
              Descrizione (opzionale)
            </label>
            <input
              type="text"
              value={descrizione}
              onChange={(e) => setDescrizione(e.target.value)}
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:border-purple-500 focus:outline-none"
              placeholder="Es: Versamento settimanale"
            />
          </div>

          {/* Actions */}
          <div className="flex gap-3 pt-2">
            <button
              type="button"
              onClick={onCancel}
              className="flex-1 px-6 py-3 bg-gray-200 hover:bg-gray-300 text-gray-700 rounded-xl font-semibold transition-colors"
              disabled={loading}
            >
              Annulla
            </button>
            <button
              type="submit"
              disabled={!importo || parseFloat(importo) <= 0 || loading}
              className={`flex-1 px-6 py-3 rounded-xl font-semibold transition-all ${
                importo && parseFloat(importo) > 0 && !loading
                  ? 'bg-gradient-to-r from-green-500 to-emerald-500 hover:from-green-600 hover:to-emerald-600 text-white shadow-lg hover:shadow-xl'
                  : 'bg-gray-300 text-gray-500 cursor-not-allowed'
              }`}
            >
              {loading ? '⏳ Versando...' : '✅ Versa'}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}
