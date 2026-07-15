'use client'

import { useState, useEffect } from 'react'
import { formatEuro } from '@/lib/formatters'

export default function CostDetailModal({ category, onClose, onMovementUpdated, centroId }) {
  const [editingId, setEditingId] = useState(null)
  const [updating, setUpdating] = useState(false)
  const [categories, setCategories] = useState([])

  useEffect(() => {
    if (centroId) {
      loadCategories()
    }
  }, [centroId])

  async function loadCategories() {
    try {
      const res = await fetch(`/api/categories?centro_id=${centroId}`)
      const data = await res.json()
      setCategories(data.categories || [])
    } catch (error) {
      console.error('Errore caricamento categorie:', error)
    }
  }

  if (!category) return null

  async function handleUpdateCategory(movementId, newCategoria) {
    setUpdating(true)
    try {
      const res = await fetch('/api/bank/movements', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id: movementId, categoria: newCategoria })
      })

      if (res.ok) {
        alert('✅ Categoria aggiornata!')
        setEditingId(null)
        if (onMovementUpdated) onMovementUpdated()
      } else {
        alert('❌ Errore durante l\'aggiornamento')
      }
    } catch (error) {
      console.error('Errore aggiornamento:', error)
      alert('❌ Errore durante l\'aggiornamento')
    }
    setUpdating(false)
  }

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-xl shadow-2xl max-w-4xl w-full max-h-[90vh] overflow-hidden">
        {/* Header */}
        <div className="bg-gradient-to-r from-orange-600 to-amber-600 text-white p-6">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="w-12 h-12 bg-white/20 backdrop-blur-sm rounded-xl flex items-center justify-center shadow-lg">
                <span className="text-2xl">💡</span>
              </div>
              <div>
                <h2 className="text-2xl font-bold">{category.categoria}</h2>
                <p className="text-sm text-orange-100 mt-1">
                  {category.count} {category.count === 1 ? 'movimento' : 'movimenti'} • Totale: {formatEuro(category.uscite)}
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

        {/* Content */}
        <div className="p-6 overflow-y-auto max-h-[calc(90vh-180px)]">
          {/* Box informativo con motivo e suggerimento */}
          <div className={`mb-6 p-4 rounded-lg border ${
            category.gravita === 'alta' ? 'bg-red-50 border-red-200' : 'bg-orange-50 border-orange-200'
          }`}>
            <div className="flex items-start gap-2 mb-3">
              <span className="text-xl">{category.gravita === 'alta' ? '🔴' : '🟡'}</span>
              <div className="text-sm text-gray-700">
                <strong className={category.gravita === 'alta' ? 'text-red-700' : 'text-orange-700'}>
                  {category.motivo || 'Costo potenzialmente ottimizzabile'}
                </strong>
              </div>
            </div>

            {/* Statistiche percentuali */}
            {(category.percentualeSuFatturato !== undefined || category.percentualeSuCosti !== undefined) && (
              <div className="grid grid-cols-2 gap-3 mb-3">
                {category.percentualeSuFatturato !== undefined && (
                  <div className="p-2 bg-white rounded border border-gray-200">
                    <div className="text-xs text-gray-600">Incidenza su fatturato</div>
                    <div className={`text-lg font-bold ${
                      category.percentualeSuFatturato > category.sogliaSuFatturato ? 'text-red-600' : 'text-gray-700'
                    }`}>
                      {category.percentualeSuFatturato.toFixed(1)}%
                    </div>
                    <div className="text-xs text-gray-500">
                      soglia: {category.sogliaSuFatturato}%
                    </div>
                  </div>
                )}
                {category.percentualeSuCosti !== undefined && (
                  <div className="p-2 bg-white rounded border border-gray-200">
                    <div className="text-xs text-gray-600">Incidenza su costi totali</div>
                    <div className={`text-lg font-bold ${
                      category.percentualeSuCosti > category.sogliaSuCosti ? 'text-red-600' : 'text-gray-700'
                    }`}>
                      {category.percentualeSuCosti.toFixed(1)}%
                    </div>
                    <div className="text-xs text-gray-500">
                      soglia: {category.sogliaSuCosti}%
                    </div>
                  </div>
                )}
              </div>
            )}

            {/* Suggerimento */}
            {category.suggerimento && (
              <div className="flex items-start gap-2 p-2 bg-blue-50 rounded border border-blue-200">
                <span className="text-lg">💡</span>
                <div className="text-sm text-gray-700">
                  <strong className="text-blue-700">Suggerimento:</strong> {category.suggerimento}
                </div>
              </div>
            )}
          </div>

          {/* Lista movimenti */}
          <div className="space-y-2">
            <h3 className="font-bold text-gray-800 mb-3">Dettaglio Movimenti:</h3>
            {category.movements.map((mov, idx) => (
              <div
                key={mov.id || idx}
                className="p-4 bg-gradient-to-r from-gray-50 to-transparent rounded-lg border border-gray-200 hover:shadow-md transition-shadow"
              >
                <div className="flex items-center justify-between mb-2">
                  <div className="flex-1">
                    <div className="font-medium text-gray-800">{mov.descrizione}</div>
                    <div className="text-sm text-gray-500 mt-1">
                      {new Date(mov.data).toLocaleDateString('it-IT')} • Categoria attuale: <strong>{mov.categoria}</strong>
                    </div>
                  </div>
                  <div className="text-right flex items-center gap-3">
                    <div className="text-lg font-bold text-red-600">
                      -{formatEuro(parseFloat(mov.importo))}
                    </div>
                    {editingId !== mov.id && (
                      <button
                        onClick={() => setEditingId(mov.id)}
                        className="px-3 py-1 bg-blue-100 text-blue-700 rounded-lg text-sm font-semibold hover:bg-blue-200 transition-all"
                      >
                        ✏️ Modifica
                      </button>
                    )}
                  </div>
                </div>

                {editingId === mov.id && (
                  <div className="mt-3 p-3 bg-blue-50 rounded-lg border border-blue-200">
                    <label className="block text-sm font-semibold text-gray-700 mb-2">
                      Cambia categoria:
                    </label>
                    <div className="flex gap-2">
                      <select
                        id={`categoria-${mov.id}`}
                        defaultValue={mov.categoria}
                        className="flex-1 px-3 py-2 border-2 border-blue-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                        disabled={updating}
                      >
                        {categories.map(cat => (
                          <option key={cat.id} value={cat.nome}>{cat.nome}</option>
                        ))}
                      </select>
                      <button
                        onClick={() => {
                          const select = document.getElementById(`categoria-${mov.id}`)
                          handleUpdateCategory(mov.id, select.value)
                        }}
                        disabled={updating}
                        className="px-4 py-2 bg-gradient-to-r from-green-600 to-emerald-600 text-white rounded-lg font-semibold hover:from-green-700 hover:to-emerald-700 transition-all disabled:opacity-50"
                      >
                        ✓ Salva
                      </button>
                      <button
                        onClick={() => setEditingId(null)}
                        disabled={updating}
                        className="px-4 py-2 bg-gray-300 text-gray-700 rounded-lg font-semibold hover:bg-gray-400 transition-all disabled:opacity-50"
                      >
                        ✕
                      </button>
                    </div>
                  </div>
                )}
              </div>
            ))}
          </div>

          {/* Statistiche */}
          <div className="mt-6 grid grid-cols-3 gap-4">
            <div className="p-4 bg-red-50 rounded-lg border border-red-200 text-center">
              <div className="text-sm text-gray-600 mb-1">Totale Uscite</div>
              <div className="text-xl font-bold text-red-600">{formatEuro(category.uscite)}</div>
            </div>
            <div className="p-4 bg-gray-50 rounded-lg border border-gray-200 text-center">
              <div className="text-sm text-gray-600 mb-1">Media per Movimento</div>
              <div className="text-xl font-bold text-gray-700">
                {formatEuro(category.uscite / category.count)}
              </div>
            </div>
            <div className="p-4 bg-orange-50 rounded-lg border border-orange-200 text-center">
              <div className="text-sm text-gray-600 mb-1">Movimenti</div>
              <div className="text-xl font-bold text-orange-600">{category.count}</div>
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="p-6 border-t bg-gray-50">
          <button
            onClick={onClose}
            className="w-full bg-gradient-to-r from-gray-600 to-gray-700 text-white px-6 py-3 rounded-xl font-semibold hover:from-gray-700 hover:to-gray-800 transition-all shadow-lg"
          >
            Chiudi
          </button>
        </div>
      </div>
    </div>
  )
}
