'use client'

import { useState, useEffect } from 'react'
import { formatEuro } from '@/lib/formatters'
import { getItalianMonthName } from '@/lib/pianificazione-utils'

export default function MonthlyBreakdownModal({ budget, onClose, onSave }) {
  const [monthlyData, setMonthlyData] = useState([])
  const [loading, setLoading] = useState(true)
  const [editing, setEditing] = useState({})

  useEffect(() => {
    loadMonthlyData()
  }, [])

  async function loadMonthlyData() {
    try {
      const res = await fetch(`/api/budget/monthly?budget_plan_id=${budget.id}`)
      const data = await res.json()

      // Assicura tutti i 12 mesi
      const months = Array.from({ length: 12 }, (_, i) => {
        const existing = data.monthly?.find(m => m.mese === i + 1)
        return existing || {
          mese: i + 1,
          importo_mensile: parseFloat(budget.importo_annuale) / 12
        }
      })

      setMonthlyData(months)
    } catch (error) {
      console.error('Errore caricamento monthly:', error)
    }
    setLoading(false)
  }

  function handleChange(mese, value) {
    setEditing({ ...editing, [mese]: value })
  }

  function handleBlur(mese) {
    const newValue = parseFloat(editing[mese])
    if (!isNaN(newValue)) {
      setMonthlyData(monthlyData.map(m =>
        m.mese === mese ? { ...m, importo_mensile: newValue } : m
      ))
    }
    delete editing[mese]
    setEditing({ ...editing })
  }

  async function handleDistribute() {
    const perMonth = parseFloat(budget.importo_annuale) / 12
    const distributed = monthlyData.map(m => ({
      ...m,
      importo_mensile: parseFloat(perMonth.toFixed(2))
    }))
    setMonthlyData(distributed)
  }

  async function handleSave() {
    try {
      const res = await fetch('/api/budget/monthly', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          budget_plan_id: budget.id,
          monthly_data: monthlyData.map(m => ({
            mese: m.mese,
            importo_mensile: parseFloat(m.importo_mensile)
          }))
        })
      })

      if (res.ok) {
        onSave()
        onClose()
      }
    } catch (error) {
      console.error('Errore salvataggio monthly:', error)
    }
  }

  const total = monthlyData.reduce((sum, m) => sum + parseFloat(m.importo_mensile || 0), 0)
  const difference = total - parseFloat(budget.importo_annuale)

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-xl shadow-2xl max-w-4xl w-full max-h-[90vh] overflow-y-auto">
        {/* Header */}
        <div className="sticky top-0 bg-gradient-to-r from-purple-600 to-indigo-600 text-white p-6 rounded-t-xl">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-2xl font-bold">Ripartizione Mensile</h2>
              <p className="text-purple-100">{budget.categoria} - {budget.anno}</p>
            </div>
            <button
              onClick={onClose}
              className="text-white hover:bg-white/20 w-8 h-8 rounded-lg flex items-center justify-center"
            >
              ✕
            </button>
          </div>
        </div>

        {/* Content */}
        <div className="p-6">
          {loading ? (
            <div className="text-center py-12">
              <div className="text-4xl mb-4">⏳</div>
              <div className="text-lg font-semibold text-gray-600">Caricamento...</div>
            </div>
          ) : (
            <>
              {/* Summary */}
              <div className="bg-gray-50 rounded-xl p-4 mb-6">
                <div className="grid grid-cols-3 gap-4">
                  <div>
                    <div className="text-xs text-gray-500 font-semibold mb-1">Budget Annuale</div>
                    <div className="text-xl font-bold text-gray-800">
                      {formatEuro(budget.importo_annuale)}
                    </div>
                  </div>
                  <div>
                    <div className="text-xs text-gray-500 font-semibold mb-1">Totale Mensili</div>
                    <div className={`text-xl font-bold ${
                      Math.abs(difference) < 0.01 ? 'text-green-600' : 'text-red-600'
                    }`}>
                      {formatEuro(total)}
                    </div>
                  </div>
                  <div>
                    <div className="text-xs text-gray-500 font-semibold mb-1">Differenza</div>
                    <div className={`text-xl font-bold ${
                      Math.abs(difference) < 0.01 ? 'text-green-600' : 'text-red-600'
                    }`}>
                      {difference >= 0 ? '+' : ''}{formatEuro(difference)}
                    </div>
                  </div>
                </div>
              </div>

              {/* Distribute Button */}
              <div className="flex justify-end mb-4">
                <button
                  onClick={handleDistribute}
                  className="bg-blue-100 text-blue-700 px-4 py-2 rounded-lg font-semibold hover:bg-blue-200"
                >
                  ⚖️ Distribuisci Equamente
                </button>
              </div>

              {/* Grid 12 Mesi */}
              <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3">
                {monthlyData.map(month => (
                  <div key={month.mese} className="bg-white border border-gray-200 rounded-lg p-3">
                    <div className="text-sm font-bold text-gray-700 mb-2">
                      {getItalianMonthName(month.mese)}
                    </div>
                    <input
                      type="number"
                      step="0.01"
                      value={editing[month.mese] !== undefined ? editing[month.mese] : month.importo_mensile}
                      onChange={(e) => handleChange(month.mese, e.target.value)}
                      onBlur={() => handleBlur(month.mese)}
                      className="w-full px-2 py-1.5 border border-gray-300 rounded text-sm font-semibold focus:ring-2 focus:ring-purple-500"
                    />
                    <div className="text-xs text-gray-500 mt-1">
                      {formatEuro(month.importo_mensile)}
                    </div>
                  </div>
                ))}
              </div>
            </>
          )}
        </div>

        {/* Footer */}
        <div className="sticky bottom-0 bg-gray-50 border-t border-gray-200 p-4 rounded-b-xl flex justify-end gap-2">
          <button
            onClick={onClose}
            className="px-6 py-2 border border-gray-300 rounded-lg font-semibold text-gray-700 hover:bg-gray-100"
          >
            Annulla
          </button>
          <button
            onClick={handleSave}
            className="bg-gradient-to-r from-purple-600 to-indigo-600 text-white px-6 py-2 rounded-lg font-semibold hover:from-purple-700 hover:to-indigo-700 shadow-lg"
          >
            💾 Salva
          </button>
        </div>
      </div>
    </div>
  )
}
