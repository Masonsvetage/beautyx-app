'use client'

import { useState, useMemo } from 'react'
import { formatEuro } from '@/lib/formatters'

export default function MovementsTable({ movements, categories, onCategoryChange }) {
  const [filter, setFilter] = useState('all') // all, entrata, uscita
  const [categoryFilter, setCategoryFilter] = useState('all')
  const [searchTerm, setSearchTerm] = useState('')
  const [editingId, setEditingId] = useState(null)
  const [sortBy, setSortBy] = useState('date_desc') // 'date_desc', 'date_asc', 'amount_desc', 'amount_asc', 'category'

  // Filtra e ordina movimenti
  const filteredMovements = useMemo(() => {
    const filtered = movements.filter(m => {
      if (filter !== 'all' && m.tipo !== filter) return false
      if (categoryFilter !== 'all' && m.categoria !== categoryFilter) return false
      if (searchTerm && !m.descrizione?.toLowerCase().includes(searchTerm.toLowerCase())) return false
      return true
    })

    // Ordina
    switch(sortBy) {
      case 'date_asc':
        return filtered.sort((a, b) => a.data.localeCompare(b.data))
      case 'date_desc':
        return filtered.sort((a, b) => b.data.localeCompare(a.data))
      case 'amount_asc':
        return filtered.sort((a, b) => Math.abs(parseFloat(a.importo)) - Math.abs(parseFloat(b.importo)))
      case 'amount_desc':
        return filtered.sort((a, b) => Math.abs(parseFloat(b.importo)) - Math.abs(parseFloat(a.importo)))
      case 'category':
        return filtered.sort((a, b) => {
          const catA = a.categoria || 'zzz'
          const catB = b.categoria || 'zzz'
          return catA.localeCompare(catB)
        })
      default:
        return filtered
    }
  }, [movements, filter, categoryFilter, searchTerm, sortBy])

  // Calcola totali
  const stats = useMemo(() => {
    const entrate = filteredMovements
      .filter(m => m.tipo === 'entrata')
      .reduce((sum, m) => sum + parseFloat(m.importo), 0)

    const uscite = filteredMovements
      .filter(m => m.tipo === 'uscita')
      .reduce((sum, m) => sum + parseFloat(m.importo), 0)

    return { entrate, uscite, saldo: entrate - uscite }
  }, [filteredMovements])

  // Categorie uniche
  const uniqueCategories = useMemo(() => {
    const cats = new Set(movements.map(m => m.categoria))
    return Array.from(cats).sort()
  }, [movements])

  function handleCategoryEdit(movement, newCategory) {
    if (movement.id) {
      // Movimento già salvato, aggiorna via API
      onCategoryChange(movement.id, newCategory)
    }
    setEditingId(null)
  }

  if (movements.length === 0) {
    return (
      <div className="bg-white rounded-lg shadow-md p-12 text-center">
        <div className="text-6xl mb-4">📊</div>
        <div className="text-xl font-medium text-gray-600">
          Nessun movimento bancario
        </div>
        <div className="text-sm text-gray-500 mt-2">
          Carica un file CSV per iniziare
        </div>
      </div>
    )
  }

  return (
    <div className="bg-white rounded-xl shadow-lg border border-gray-100 overflow-hidden">
      {/* Header con filtri e statistiche */}
      <div className="p-6 bg-gradient-to-r from-teal-600 to-cyan-600">
        <div className="flex flex-wrap gap-4 items-center justify-between mb-4">
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 bg-white/20 backdrop-blur-sm rounded-lg flex items-center justify-center">
              <span className="text-2xl">📋</span>
            </div>
            <div>
              <h2 className="text-lg font-bold text-white">
                Vista Dettagliata
              </h2>
              <p className="text-sm text-teal-100">
                {filteredMovements.length} movimenti trovati
              </p>
            </div>
          </div>

          {/* Statistiche */}
          <div className="flex gap-3 text-sm">
            <div className="px-4 py-3 bg-white/95 backdrop-blur-sm rounded-xl shadow-lg border border-white/20">
              <div className="text-green-700 font-bold text-base">
                +{formatEuro(stats.entrate)}
              </div>
              <div className="text-green-600 text-xs font-medium mt-0.5">Entrate</div>
            </div>
            <div className="px-4 py-3 bg-white/95 backdrop-blur-sm rounded-xl shadow-lg border border-white/20">
              <div className="text-red-700 font-bold text-base">
                -{formatEuro(stats.uscite)}
              </div>
              <div className="text-red-600 text-xs font-medium mt-0.5">Uscite</div>
            </div>
            <div className="px-4 py-3 bg-white/95 backdrop-blur-sm rounded-xl shadow-lg border border-white/20">
              <div className={`font-bold text-base ${stats.saldo >= 0 ? 'text-blue-700' : 'text-red-700'}`}>
                {stats.saldo >= 0 ? '+' : ''}{formatEuro(stats.saldo)}
              </div>
              <div className="text-blue-600 text-xs font-medium mt-0.5">Saldo</div>
            </div>
          </div>
        </div>

        {/* Filtri */}
        <div className="flex flex-wrap gap-3">
          {/* Filtro tipo */}
          <select
            value={filter}
            onChange={(e) => setFilter(e.target.value)}
            className="px-4 py-2 bg-white/95 backdrop-blur-sm border-2 border-white/30 rounded-xl text-sm font-medium text-gray-700 focus:outline-none focus:ring-2 focus:ring-white/50 shadow-lg"
          >
            <option value="all">Tutti i movimenti</option>
            <option value="entrata">💰 Solo Entrate</option>
            <option value="uscita">📤 Solo Uscite</option>
          </select>

          {/* Filtro categoria */}
          <select
            value={categoryFilter}
            onChange={(e) => setCategoryFilter(e.target.value)}
            className="px-4 py-2 bg-white/95 backdrop-blur-sm border-2 border-white/30 rounded-xl text-sm font-medium text-gray-700 focus:outline-none focus:ring-2 focus:ring-white/50 shadow-lg"
          >
            <option value="all">Tutte le categorie</option>
            {uniqueCategories.map(cat => (
              <option key={cat} value={cat}>{cat}</option>
            ))}
          </select>

          {/* Ricerca */}
          <input
            type="text"
            placeholder="🔍 Cerca nella descrizione..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="px-4 py-2 bg-white/95 backdrop-blur-sm border-2 border-white/30 rounded-xl text-sm font-medium text-gray-700 placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-white/50 shadow-lg flex-1 min-w-[200px]"
          />

          {/* Ordinamento */}
          <select
            value={sortBy}
            onChange={(e) => setSortBy(e.target.value)}
            className="px-4 py-2 bg-white/95 backdrop-blur-sm border-2 border-white/30 rounded-xl text-sm font-medium text-gray-700 focus:outline-none focus:ring-2 focus:ring-white/50 shadow-lg"
          >
            <option value="date_desc">📅 Data ↓ (recente)</option>
            <option value="date_asc">📅 Data ↑ (vecchia)</option>
            <option value="amount_desc">💰 Importo ↓ (alto)</option>
            <option value="amount_asc">💰 Importo ↑ (basso)</option>
            <option value="category">📂 Categoria</option>
          </select>
        </div>
      </div>

      {/* Tabella */}
      <div className="overflow-x-auto">
        <table className="w-full">
          <thead className="bg-gradient-to-r from-gray-50 to-gray-100 border-b-2 border-gray-200">
            <tr>
              <th className="px-6 py-4 text-left text-xs font-bold text-gray-700 uppercase tracking-wider">Data</th>
              <th className="px-6 py-4 text-left text-xs font-bold text-gray-700 uppercase tracking-wider">Descrizione</th>
              <th className="px-6 py-4 text-left text-xs font-bold text-gray-700 uppercase tracking-wider">Categoria</th>
              <th className="px-6 py-4 text-right text-xs font-bold text-gray-700 uppercase tracking-wider">Importo</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-100">
            {filteredMovements.map((mov, index) => (
              <tr key={mov.id || index} className="hover:bg-gradient-to-r hover:from-teal-50/30 hover:to-transparent transition-all duration-150">
                <td className="px-6 py-4 text-sm whitespace-nowrap font-medium text-gray-600">
                  {new Date(mov.data).toLocaleDateString('it-IT')}
                </td>
                <td className="px-6 py-4 text-sm">
                  <div className="max-w-md truncate text-gray-800 font-medium" title={mov.descrizione}>
                    {mov.descrizione}
                  </div>
                </td>
                <td className="px-6 py-4 text-sm">
                  {editingId === (mov.id || index) ? (
                    <select
                      autoFocus
                      defaultValue={mov.categoria}
                      onBlur={(e) => handleCategoryEdit(mov, e.target.value)}
                      onChange={(e) => handleCategoryEdit(mov, e.target.value)}
                      className="border-2 border-teal-300 rounded-lg px-3 py-1.5 text-sm w-full font-medium focus:outline-none focus:ring-2 focus:ring-teal-500 focus:border-transparent shadow-sm"
                    >
                      {categories.map(cat => (
                        <option key={cat.id} value={cat.nome}>
                          {cat.icona} {cat.nome}
                        </option>
                      ))}
                    </select>
                  ) : (
                    <button
                      onClick={() => setEditingId(mov.id || index)}
                      className="px-3 py-1.5 rounded-lg bg-gradient-to-r from-gray-50 to-gray-100 hover:from-teal-50 hover:to-teal-100 border border-gray-200 hover:border-teal-300 transition-all text-left w-full font-medium group"
                    >
                      <span className="inline-flex items-center gap-2 justify-between w-full">
                        <span className="text-gray-700 group-hover:text-teal-700">{mov.categoria}</span>
                        <span className="text-gray-400 group-hover:text-teal-500 text-xs">✏️</span>
                      </span>
                    </button>
                  )}
                </td>
                <td className="px-6 py-4 text-sm text-right whitespace-nowrap">
                  <span className={`inline-flex items-center gap-1 px-3 py-1.5 rounded-lg font-bold ${
                    mov.tipo === 'entrata'
                      ? 'bg-green-50 text-green-700 border border-green-200'
                      : 'bg-red-50 text-red-700 border border-red-200'
                  }`}>
                    <span className="text-xs">{mov.tipo === 'entrata' ? '↗' : '↙'}</span>
                    {mov.tipo === 'entrata' ? '+' : '-'}{formatEuro(parseFloat(mov.importo))}
                  </span>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  )
}
