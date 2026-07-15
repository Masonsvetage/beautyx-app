'use client'

import { useState, useEffect } from 'react'
import { formatEuro } from '@/lib/formatters'
import { getItalianMonthAbbr } from '@/lib/pianificazione-utils'
import MonthlyBreakdownModal from './MonthlyBreakdownModal'
import BudgetComparisonChart from './BudgetComparisonChart'

export default function BudgetPlanner({ centroId }) {
  const [budgets, setBudgets] = useState([])
  const [categories, setCategories] = useState([])
  const [comparisons, setComparisons] = useState([])
  const [loading, setLoading] = useState(true)
  const [selectedYear, setSelectedYear] = useState(new Date().getFullYear())
  const [showMonthlyModal, setShowMonthlyModal] = useState(null)
  const [newBudget, setNewBudget] = useState({ categoria: '', importo_annuale: '' })
  const [showAddForm, setShowAddForm] = useState(false)

  useEffect(() => {
    if (centroId) loadData()
  }, [centroId, selectedYear])

  async function loadData() {
    if (!centroId) return
    setLoading(true)
    try {
      // Carica categorie
      const catRes = await fetch(`/api/categories?centro_id=${centroId}`)
      const catData = await catRes.json()
      setCategories(catData.categories || [])

      // Carica budget per anno
      const budgetRes = await fetch(`/api/budget?centro_id=${centroId}&anno=${selectedYear}`)
      const budgetData = await budgetRes.json()
      setBudgets(budgetData.budgets || [])

      // Carica comparisons
      const compRes = await fetch(`/api/budget/comparison?centro_id=${centroId}&anno=${selectedYear}`)
      const compData = await compRes.json()
      setComparisons(compData.comparisons || [])
    } catch (error) {
      console.error('Errore caricamento budget:', error)
    }
    setLoading(false)
  }

  async function handleCreateBudget(e) {
    e.preventDefault()
    try {
      const res = await fetch('/api/budget', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          centro_id: centroId,
          categoria: newBudget.categoria,
          anno: selectedYear,
          importo_annuale: parseFloat(newBudget.importo_annuale)
        })
      })

      if (res.ok) {
        setNewBudget({ categoria: '', importo_annuale: '' })
        setShowAddForm(false)
        loadData()
      }
    } catch (error) {
      console.error('Errore creazione budget:', error)
    }
  }

  async function handleDeleteBudget(budgetId) {
    if (!confirm('Sei sicuro di voler eliminare questo budget?')) return

    try {
      const res = await fetch(`/api/budget?id=${budgetId}`, { method: 'DELETE' })
      if (res.ok) loadData()
    } catch (error) {
      console.error('Errore eliminazione budget:', error)
    }
  }

  function getBudgetStatus(categoria, mese) {
    const comp = comparisons.find(c => c.categoria === categoria && c.mese === mese)
    if (!comp) return { status: 'green', percentage: 0 }
    return { status: comp.status, percentage: comp.percentage }
  }

  function getYearlyComparison(categoria) {
    const catComps = comparisons.filter(c => c.categoria === categoria)
    const totalBudget = catComps.reduce((sum, c) => sum + c.budgeted, 0)
    const totalActual = catComps.reduce((sum, c) => sum + c.actual, 0)
    const percentage = totalBudget > 0 ? (totalActual / totalBudget) * 100 : 0

    let status = 'green'
    if (percentage >= 100) status = 'red'
    else if (percentage >= 80) status = 'yellow'

    return { totalBudget, totalActual, percentage, status }
  }

  const availableCategories = categories.filter(
    cat => !budgets.some(b => b.categoria === cat.nome)
  )

  if (loading) {
    return (
      <div className="text-center py-12">
        <div className="text-4xl mb-4">⏳</div>
        <div className="text-lg font-semibold text-slate-300">Caricamento budget...</div>
      </div>
    )
  }

  return (
    <div className="space-y-4">
      {/* Header con Year Selector */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-xl font-bold text-slate-100">Budget Planning {selectedYear}</h2>
          <p className="text-sm text-slate-400">Pianifica e confronta budget vs spese effettive</p>
        </div>

        <div className="flex gap-2">
          <select
            value={selectedYear}
            onChange={(e) => setSelectedYear(parseInt(e.target.value))}
            className="px-4 py-2 bg-slate-700/50 border border-slate-600/40 text-slate-200 rounded-lg font-semibold focus:ring-2 focus:ring-teal-500"
          >
            {[2024, 2025, 2026].map(year => (
              <option key={year} value={year}>{year}</option>
            ))}
          </select>

          <button
            onClick={() => setShowAddForm(!showAddForm)}
            className="bg-gradient-to-r from-teal-600 to-cyan-600 text-white px-4 py-2 rounded-lg font-semibold hover:from-teal-700 hover:to-cyan-700 shadow-lg"
          >
            {showAddForm ? '✕ Annulla' : '+ Nuovo Budget'}
          </button>
        </div>
      </div>

      {/* Form Nuovo Budget */}
      {showAddForm && (
        <div className="bg-slate-800/50 backdrop-blur-sm border border-teal-500/40 rounded-xl p-4">
          <form onSubmit={handleCreateBudget} className="flex gap-3">
            <select
              value={newBudget.categoria}
              onChange={(e) => setNewBudget({ ...newBudget, categoria: e.target.value })}
              className="flex-1 px-3 py-2 bg-slate-700/50 border border-slate-600/40 text-slate-200 rounded-lg"
              required
            >
              <option value="">Seleziona categoria...</option>
              {availableCategories.map(cat => (
                <option key={cat.id} value={cat.nome}>{cat.icona} {cat.nome}</option>
              ))}
            </select>

            <input
              type="number"
              step="0.01"
              placeholder="Budget annuale (€)"
              value={newBudget.importo_annuale}
              onChange={(e) => setNewBudget({ ...newBudget, importo_annuale: e.target.value })}
              className="w-48 px-3 py-2 bg-slate-700/50 border border-slate-600/40 text-slate-200 rounded-lg placeholder-slate-400"
              required
            />

            <button
              type="submit"
              className="bg-emerald-600 text-white px-6 py-2 rounded-lg font-semibold hover:bg-emerald-700"
            >
              Crea
            </button>
          </form>
        </div>
      )}

      {/* Lista Budget */}
      {budgets.length === 0 ? (
        <div className="bg-slate-800/50 backdrop-blur-sm rounded-xl border border-slate-600/40 p-12 text-center">
          <div className="text-6xl mb-4">💰</div>
          <h3 className="text-xl font-bold text-slate-200 mb-2">Nessun budget pianificato</h3>
          <p className="text-slate-400">Aggiungi il primo budget per iniziare la pianificazione</p>
        </div>
      ) : (
        <div className="space-y-3">
          {budgets.map(budget => {
            const yearly = getYearlyComparison(budget.categoria)
            const category = categories.find(c => c.nome === budget.categoria)

            return (
              <div key={budget.id} className="bg-slate-800/50 backdrop-blur-sm border border-slate-600/40 rounded-xl p-4">
                {/* Header Categoria */}
                <div className="flex items-center justify-between mb-3">
                  <div className="flex items-center gap-3">
                    <span className="text-2xl">{category?.icona || '📁'}</span>
                    <div>
                      <h3 className="text-lg font-bold text-slate-100">{budget.categoria}</h3>
                      <p className="text-sm text-slate-400">
                        Budget annuale: {formatEuro(budget.importo_annuale)}
                      </p>
                    </div>
                  </div>

                  <div className="flex items-center gap-2">
                    <button
                      onClick={() => setShowMonthlyModal(budget)}
                      className="text-sm bg-cyan-600/30 text-cyan-200 px-3 py-1.5 rounded-lg font-semibold hover:bg-cyan-600/40 border border-cyan-500/40"
                    >
                      📅 Dettaglio Mensile
                    </button>
                    <button
                      onClick={() => handleDeleteBudget(budget.id)}
                      className="text-sm bg-red-600/30 text-red-200 px-3 py-1.5 rounded-lg font-semibold hover:bg-red-600/40 border border-red-500/40"
                    >
                      🗑️
                    </button>
                  </div>
                </div>

                {/* Progress Bar Annuale */}
                <div className="mb-3">
                  <div className="flex items-center justify-between mb-1">
                    <span className="text-xs font-semibold text-slate-300">
                      Speso: {formatEuro(yearly.totalActual)} / {formatEuro(yearly.totalBudget)}
                    </span>
                    <span className={`text-xs font-bold ${
                      yearly.status === 'green' ? 'text-emerald-400' :
                      yearly.status === 'yellow' ? 'text-amber-400' : 'text-red-400'
                    }`}>
                      {yearly.percentage.toFixed(1)}%
                    </span>
                  </div>
                  <div className="w-full bg-slate-700/50 rounded-full h-3">
                    <div
                      className={`h-3 rounded-full transition-all ${
                        yearly.status === 'green' ? 'bg-gradient-to-r from-emerald-500 to-teal-500' :
                        yearly.status === 'yellow' ? 'bg-gradient-to-r from-amber-500 to-yellow-500' :
                        'bg-gradient-to-r from-red-500 to-rose-500'
                      }`}
                      style={{ width: `${Math.min(yearly.percentage, 100)}%` }}
                    />
                  </div>
                </div>

                {/* Mini Calendar 12 Mesi */}
                <div className="grid grid-cols-12 gap-1">
                  {Array.from({ length: 12 }, (_, i) => i + 1).map(mese => {
                    const { status } = getBudgetStatus(budget.categoria, mese)
                    return (
                      <div
                        key={mese}
                        className={`h-8 rounded flex items-center justify-center text-xs font-semibold ${
                          status === 'green' ? 'bg-green-100 text-green-700' :
                          status === 'yellow' ? 'bg-yellow-100 text-yellow-700' :
                          'bg-red-100 text-red-700'
                        }`}
                        title={getItalianMonthAbbr(mese)}
                      >
                        {getItalianMonthAbbr(mese)}
                      </div>
                    )
                  })}
                </div>
              </div>
            )
          })}
        </div>
      )}

      {/* Chart Comparisons */}
      {budgets.length > 0 && comparisons.length > 0 && (
        <BudgetComparisonChart comparisons={comparisons} />
      )}

      {/* Monthly Breakdown Modal */}
      {showMonthlyModal && (
        <MonthlyBreakdownModal
          budget={showMonthlyModal}
          onClose={() => setShowMonthlyModal(null)}
          onSave={loadData}
        />
      )}
    </div>
  )
}
