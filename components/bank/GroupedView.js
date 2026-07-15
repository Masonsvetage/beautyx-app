'use client'

import { useState, useMemo } from 'react'
import { formatEuro } from '@/lib/formatters'
import { extractVendorKey, getVendorDisplayName } from '@/lib/vendor-utils'

export default function GroupedView({ movements, categories, onCategoryChange }) {
  const [expandedGroup, setExpandedGroup] = useState(null)
  const [editingVendor, setEditingVendor] = useState(null)
  const [editingMovementId, setEditingMovementId] = useState(null) // Per modificare singoli movimenti
  const [sortBy, setSortBy] = useState('amount') // 'amount', 'category', 'count', 'date'

  // Raggruppa per fornitore/descrizione
  const groupedData = useMemo(() => {
    const groups = new Map()

    movements.forEach(mov => {
      // Estrai chiave del fornitore usando algoritmo intelligente
      const vendorKey = extractVendorKey(mov.descrizione)

      if (!groups.has(vendorKey)) {
        groups.set(vendorKey, {
          vendorKey,
          descrizione: mov.descrizione,
          categoria: mov.categoria || 'Non categorizzato',
          movements: [],
          totalAmount: 0,
          tipo: mov.tipo,
          latestDate: mov.data,
          categorieCounts: {} // Traccia categorie nel gruppo
        })
      }

      const group = groups.get(vendorKey)
      group.movements.push(mov)
      group.totalAmount += parseFloat(mov.importo)

      // Conta categorie per determinare la più comune
      const cat = mov.categoria || 'Non categorizzato'
      group.categorieCounts[cat] = (group.categorieCounts[cat] || 0) + 1

      // Aggiorna data più recente
      if (mov.data > group.latestDate) {
        group.latestDate = mov.data
      }
    })

    // Determina categoria più comune per ogni gruppo
    groups.forEach(group => {
      const categoriesList = Object.entries(group.categorieCounts)
        .sort((a, b) => b[1] - a[1]) // Ordina per frequenza

      if (categoriesList.length > 0) {
        group.categoria = categoriesList[0][0] // Categoria più comune
        group.hasMixedCategories = categoriesList.length > 1 // Flag se categorie miste
      }
    })

    // Converti in array e ordina in base a sortBy
    const groupsArray = Array.from(groups.values())

    switch(sortBy) {
      case 'category':
        return groupsArray.sort((a, b) => {
          const catCompare = a.categoria.localeCompare(b.categoria)
          if (catCompare !== 0) return catCompare
          // Secondario: per importo
          return Math.abs(b.totalAmount) - Math.abs(a.totalAmount)
        })
      case 'count':
        return groupsArray.sort((a, b) => b.movements.length - a.movements.length)
      case 'date':
        return groupsArray.sort((a, b) => b.latestDate.localeCompare(a.latestDate))
      case 'amount':
      default:
        return groupsArray.sort((a, b) => Math.abs(b.totalAmount) - Math.abs(a.totalAmount))
    }
  }, [movements, sortBy])

  function handleGroupCategoryChange(vendorKey, newCategory) {
    const group = groupedData.find(g => g.vendorKey === vendorKey)
    if (group) {
      // Aggiorna tutti i movimenti del gruppo
      group.movements.forEach(mov => {
        if (mov.id) {
          onCategoryChange(mov.id, newCategory)
        }
      })
    }
    setEditingVendor(null)
  }

  function handleSingleMovementCategoryChange(movementId, newCategory) {
    if (movementId) {
      onCategoryChange(movementId, newCategory)
    }
    setEditingMovementId(null)
  }

  function toggleGroup(vendorKey) {
    setExpandedGroup(expandedGroup === vendorKey ? null : vendorKey)
  }

  return (
    <div className="bg-white rounded-xl shadow-lg border border-gray-100 overflow-hidden">
      {/* Header */}
      <div className="p-6 bg-gradient-to-r from-teal-600 to-cyan-600">
        <div className="flex items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 bg-white/20 backdrop-blur-sm rounded-lg flex items-center justify-center">
              <span className="text-2xl">👥</span>
            </div>
            <div>
              <h3 className="font-bold text-white text-lg">Vista Raggruppata</h3>
              <p className="text-sm text-teal-100 mt-0.5">
                {groupedData.length} fornitori • Clicca per espandere i dettagli
              </p>
            </div>
          </div>

          {/* Sort Selector */}
          <div className="flex items-center gap-2">
            <span className="text-xs text-teal-100 font-medium">Ordina per:</span>
            <select
              value={sortBy}
              onChange={(e) => setSortBy(e.target.value)}
              className="px-3 py-1.5 rounded-lg text-sm font-semibold bg-white/20 text-white border border-white/30 hover:bg-white/30 transition-all focus:outline-none focus:ring-2 focus:ring-white/50 cursor-pointer"
            >
              <option value="amount" className="text-gray-900">💰 Importo</option>
              <option value="category" className="text-gray-900">📂 Categoria</option>
              <option value="count" className="text-gray-900">🔢 N° Movimenti</option>
              <option value="date" className="text-gray-900">📅 Data Recente</option>
            </select>
          </div>
        </div>
      </div>

      {/* Lista Raggruppata */}
      <div className="divide-y divide-gray-100 max-h-[700px] overflow-y-auto">
        {groupedData.map((group) => {
          const isExpanded = expandedGroup === group.vendorKey
          const isEditing = editingVendor === group.vendorKey

          return (
            <div key={group.vendorKey} className="hover:bg-gradient-to-r hover:from-gray-50 hover:to-transparent transition-all duration-200">
              {/* Riga Principale */}
              <div className="p-4 flex items-center gap-4">
                {/* Expand Button */}
                <button
                  onClick={() => toggleGroup(group.vendorKey)}
                  className={`w-8 h-8 flex items-center justify-center rounded-lg transition-all duration-200 shrink-0 ${
                    isExpanded
                      ? 'bg-teal-100 text-teal-600 shadow-sm'
                      : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                  }`}
                >
                  <span className="text-sm font-medium">{isExpanded ? '▼' : '▶'}</span>
                </button>

                {/* Descrizione */}
                <div className="flex-1 min-w-0">
                  <div className="font-semibold text-base text-gray-800 truncate" title={group.vendorKey}>
                    {getVendorDisplayName(group.vendorKey)}
                  </div>
                  <div className="flex items-center gap-2 mt-1">
                    <span className="text-xs text-gray-500 bg-gray-100 px-2 py-0.5 rounded-full">
                      {group.movements.length} {group.movements.length === 1 ? 'movimento' : 'movimenti'}
                    </span>
                    {group.hasMixedCategories && (
                      <span className="text-xs text-amber-700 bg-amber-100 px-2 py-0.5 rounded-full font-semibold" title="Questo gruppo contiene movimenti di categorie diverse">
                        ⚠️ Categorie miste
                      </span>
                    )}
                  </div>
                </div>

                {/* Categoria */}
                <div className="w-56 shrink-0">
                  {isEditing ? (
                    <select
                      autoFocus
                      defaultValue={group.categoria}
                      onBlur={(e) => handleGroupCategoryChange(group.vendorKey, e.target.value)}
                      onChange={(e) => handleGroupCategoryChange(group.vendorKey, e.target.value)}
                      className="w-full border-2 border-teal-300 rounded-lg px-3 py-2 text-sm font-medium focus:outline-none focus:ring-2 focus:ring-teal-500 focus:border-transparent shadow-sm"
                    >
                      {categories.map(cat => (
                        <option key={cat.id} value={cat.nome}>
                          {cat.icona} {cat.nome}
                        </option>
                      ))}
                    </select>
                  ) : (
                    <button
                      onClick={() => setEditingVendor(group.vendorKey)}
                      className="w-full px-3 py-2 rounded-lg bg-gradient-to-r from-gray-50 to-gray-100 hover:from-teal-50 hover:to-teal-100 border border-gray-200 hover:border-teal-300 transition-all text-left text-sm font-medium group"
                    >
                      <span className="inline-flex items-center gap-2 justify-between w-full">
                        <span className="text-gray-700 group-hover:text-teal-700">{group.categoria}</span>
                        <span className="text-gray-400 group-hover:text-teal-500 text-xs">✏️</span>
                      </span>
                    </button>
                  )}
                </div>

                {/* Importo Totale */}
                <div className={`w-40 text-right shrink-0`}>
                  <div className={`inline-flex items-center gap-1 px-4 py-2 rounded-lg font-bold text-base ${
                    group.tipo === 'entrata'
                      ? 'bg-green-50 text-green-700 border border-green-200'
                      : 'bg-red-50 text-red-700 border border-red-200'
                  }`}>
                    <span className="text-xs">{group.tipo === 'entrata' ? '↗' : '↙'}</span>
                    <span>{group.tipo === 'entrata' ? '+' : '-'}{formatEuro(Math.abs(group.totalAmount))}</span>
                  </div>
                </div>
              </div>

              {/* Dettagli Espansi */}
              {isExpanded && (
                <div className="px-4 pb-4 ml-12 bg-gradient-to-b from-purple-50/50 to-transparent border-t border-purple-100">
                  {/* Breakdown Categorie se miste */}
                  {group.hasMixedCategories && (
                    <div className="mt-3 mb-3 p-3 bg-amber-50 border border-amber-200 rounded-lg">
                      <div className="text-xs font-bold text-amber-800 mb-2 flex items-center gap-2">
                        ⚠️ CATEGORIE MISTE IN QUESTO GRUPPO
                      </div>
                      <div className="grid grid-cols-2 gap-2">
                        {Object.entries(group.categorieCounts)
                          .sort((a, b) => b[1] - a[1])
                          .map(([cat, count]) => (
                            <div key={cat} className="text-xs text-amber-900 bg-white px-2 py-1 rounded">
                              <span className="font-semibold">{cat}:</span> {count} mov
                            </div>
                          ))}
                      </div>
                    </div>
                  )}

                  <div className="mt-3 space-y-2">
                    <div className="text-xs font-semibold text-purple-700 uppercase tracking-wide mb-2 flex items-center gap-2">
                      Dettaglio Movimenti
                      <span className="text-xs font-normal text-purple-600">(clicca sulla categoria per modificare)</span>
                    </div>
                    {group.movements.map((mov, idx) => {
                      const isEditingThisMovement = editingMovementId === mov.id

                      return (
                        <div key={mov.id || idx} className="flex items-center gap-3 text-sm py-2.5 px-3 bg-white rounded-lg shadow-sm hover:shadow-md transition-shadow border border-gray-100">
                          <div className="text-gray-600 font-medium w-24 shrink-0">
                            {new Date(mov.data).toLocaleDateString('it-IT')}
                          </div>
                          <div className="flex-1 truncate text-gray-700">
                            {mov.descrizione}
                          </div>

                          {/* Categoria del singolo movimento */}
                          <div className="w-48 shrink-0">
                            {isEditingThisMovement ? (
                              <select
                                autoFocus
                                defaultValue={mov.categoria}
                                onBlur={(e) => handleSingleMovementCategoryChange(mov.id, e.target.value)}
                                onChange={(e) => handleSingleMovementCategoryChange(mov.id, e.target.value)}
                                className="w-full border-2 border-teal-300 rounded-lg px-2 py-1 text-xs font-medium focus:outline-none focus:ring-2 focus:ring-teal-500 focus:border-transparent shadow-sm"
                              >
                                {categories.map(cat => (
                                  <option key={cat.id} value={cat.nome}>
                                    {cat.icona} {cat.nome}
                                  </option>
                                ))}
                              </select>
                            ) : (
                              <button
                                onClick={() => setEditingMovementId(mov.id)}
                                className="w-full px-2 py-1 rounded-lg bg-gradient-to-r from-gray-50 to-gray-100 hover:from-purple-50 hover:to-purple-100 border border-gray-200 hover:border-purple-300 transition-all text-left text-xs font-medium group"
                                title="Clicca per modificare la categoria di questo movimento"
                              >
                                <span className="inline-flex items-center gap-2 justify-between w-full">
                                  <span className="text-gray-700 group-hover:text-purple-700 truncate">{mov.categoria}</span>
                                  <span className="text-gray-400 group-hover:text-purple-500 text-xs">✏️</span>
                                </span>
                              </button>
                            )}
                          </div>

                          <div className={`w-32 text-right font-semibold shrink-0 ${
                            mov.tipo === 'entrata' ? 'text-green-600' : 'text-red-600'
                          }`}>
                            {mov.tipo === 'entrata' ? '+' : '-'}{formatEuro(parseFloat(mov.importo))}
                          </div>
                        </div>
                      )
                    })}
                  </div>
                </div>
              )}
            </div>
          )
        })}
      </div>
    </div>
  )
}
