'use client'

import { useState, useMemo } from 'react'
import { formatEuro } from '@/lib/formatters'
import { format, parseISO, startOfYear, endOfYear, startOfMonth, endOfMonth, startOfDay, endOfDay } from 'date-fns'
import { it } from 'date-fns/locale'

export default function CategoryDetailView({ movements, categories, onCategoryChange }) {
  const [expandedCategory, setExpandedCategory] = useState(null)
  const [filterType, setFilterType] = useState('all') // 'all', 'year', 'month', 'day'
  const [selectedYear, setSelectedYear] = useState(new Date().getFullYear())
  const [selectedMonth, setSelectedMonth] = useState(new Date().getMonth() + 1)
  const [selectedDay, setSelectedDay] = useState(format(new Date(), 'yyyy-MM-dd'))
  const [selectedAccount, setSelectedAccount] = useState('all')
  const [sortBy, setSortBy] = useState('amount') // 'amount', 'alphabetic', 'count', 'entrate', 'uscite'

  // Estrai tutti i conti correnti unici
  const accounts = useMemo(() => {
    const accountSet = new Set(movements.map(m => m.conto).filter(Boolean))
    return ['all', ...Array.from(accountSet)]
  }, [movements])

  // Estrai tutti gli anni disponibili
  const availableYears = useMemo(() => {
    const years = new Set(
      movements.map(m => new Date(m.data).getFullYear())
    )
    return Array.from(years).sort((a, b) => b - a)
  }, [movements])

  // Filtra movimenti in base ai filtri selezionati
  const filteredMovements = useMemo(() => {
    return movements.filter(m => {
      const movDate = parseISO(m.data)

      // Filtro per conto
      if (selectedAccount !== 'all' && m.conto !== selectedAccount) {
        return false
      }

      // Filtro temporale
      if (filterType === 'year') {
        const yearStart = startOfYear(new Date(selectedYear, 0, 1))
        const yearEnd = endOfYear(new Date(selectedYear, 0, 1))
        return movDate >= yearStart && movDate <= yearEnd
      } else if (filterType === 'month') {
        const monthStart = startOfMonth(new Date(selectedYear, selectedMonth - 1, 1))
        const monthEnd = endOfMonth(new Date(selectedYear, selectedMonth - 1, 1))
        return movDate >= monthStart && movDate <= monthEnd
      } else if (filterType === 'day') {
        const dayStart = startOfDay(parseISO(selectedDay))
        const dayEnd = endOfDay(parseISO(selectedDay))
        return movDate >= dayStart && movDate <= dayEnd
      }

      return true
    })
  }, [movements, filterType, selectedYear, selectedMonth, selectedDay, selectedAccount])

  // Raggruppa movimenti per categoria
  const groupedByCategory = useMemo(() => {
    const grouped = {}

    filteredMovements.forEach(mov => {
      const categoria = mov.categoria || 'Non Categorizzato'
      if (!grouped[categoria]) {
        grouped[categoria] = {
          movements: [],
          count: 0,
          totalEntrate: 0,
          totalUscite: 0,
          totale: 0
        }
      }

      grouped[categoria].movements.push(mov)
      grouped[categoria].count++

      const importo = parseFloat(mov.importo)
      if (mov.tipo === 'entrata') {
        grouped[categoria].totalEntrate += importo
        grouped[categoria].totale += importo
      } else {
        grouped[categoria].totalUscite += importo
        grouped[categoria].totale -= importo
      }
    })

    // Converti in array e ordina in base a sortBy
    const groupsArray = Object.entries(grouped)
      .map(([categoria, data]) => ({ categoria, ...data }))

    switch(sortBy) {
      case 'alphabetic':
        return groupsArray.sort((a, b) => a.categoria.localeCompare(b.categoria))
      case 'count':
        return groupsArray.sort((a, b) => b.count - a.count)
      case 'entrate':
        return groupsArray.sort((a, b) => b.totalEntrate - a.totalEntrate)
      case 'uscite':
        return groupsArray.sort((a, b) => b.totalUscite - a.totalUscite)
      case 'amount':
      default:
        return groupsArray.sort((a, b) => Math.abs(b.totale) - Math.abs(a.totale))
    }
  }, [filteredMovements, sortBy])

  const totalMovimenti = filteredMovements.length
  const totalEntrate = filteredMovements.reduce((sum, m) => {
    const importo = parseFloat(m.importo)
    return sum + (m.tipo === 'entrata' ? importo : 0)
  }, 0)
  const totalUscite = filteredMovements.reduce((sum, m) => {
    const importo = parseFloat(m.importo)
    return sum + (m.tipo === 'uscita' ? importo : 0)
  }, 0)

  return (
    <div className="space-y-4">
      {/* Filtri */}
      <div className="bg-white rounded-xl shadow-lg border border-gray-100 p-4">
        <div className="flex items-center justify-between mb-3">
          <h3 className="font-bold text-gray-800 flex items-center gap-2">
            <span>🔍</span> Filtri
          </h3>
          {/* Sort Selector */}
          <div className="flex items-center gap-2">
            <span className="text-xs text-gray-600 font-medium">Ordina per:</span>
            <select
              value={sortBy}
              onChange={(e) => setSortBy(e.target.value)}
              className="px-3 py-1.5 rounded-lg text-sm font-semibold bg-gradient-to-r from-teal-50 to-cyan-50 text-teal-700 border border-teal-200 hover:border-teal-300 transition-all focus:outline-none focus:ring-2 focus:ring-teal-500 cursor-pointer"
            >
              <option value="amount">💰 Importo Totale</option>
              <option value="alphabetic">🔤 Nome Categoria</option>
              <option value="count">🔢 N° Movimenti</option>
              <option value="entrate">↗️ Entrate</option>
              <option value="uscite">↙️ Uscite</option>
            </select>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          {/* Filtro Conto */}
          <div>
            <label className="block text-sm font-semibold text-gray-700 mb-1">
              Conto Corrente
            </label>
            <select
              value={selectedAccount}
              onChange={(e) => setSelectedAccount(e.target.value)}
              className="w-full px-3 py-2 border-2 border-teal-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-teal-500"
            >
              <option value="all">Tutti i conti</option>
              {accounts.filter(a => a !== 'all').map(account => (
                <option key={account} value={account}>{account}</option>
              ))}
            </select>
          </div>

          {/* Filtro Periodo */}
          <div>
            <label className="block text-sm font-semibold text-gray-700 mb-1">
              Periodo
            </label>
            <select
              value={filterType}
              onChange={(e) => setFilterType(e.target.value)}
              className="w-full px-3 py-2 border-2 border-teal-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-teal-500"
            >
              <option value="all">Tutti i movimenti</option>
              <option value="year">Per Anno</option>
              <option value="month">Per Mese</option>
              <option value="day">Per Giorno</option>
            </select>
          </div>

          {/* Selettore Anno */}
          {(filterType === 'year' || filterType === 'month') && (
            <div>
              <label className="block text-sm font-semibold text-gray-700 mb-1">
                Anno
              </label>
              <select
                value={selectedYear}
                onChange={(e) => setSelectedYear(parseInt(e.target.value))}
                className="w-full px-3 py-2 border-2 border-teal-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-teal-500"
              >
                {availableYears.map(year => (
                  <option key={year} value={year}>{year}</option>
                ))}
              </select>
            </div>
          )}

          {/* Selettore Mese */}
          {filterType === 'month' && (
            <div>
              <label className="block text-sm font-semibold text-gray-700 mb-1">
                Mese
              </label>
              <select
                value={selectedMonth}
                onChange={(e) => setSelectedMonth(parseInt(e.target.value))}
                className="w-full px-3 py-2 border-2 border-teal-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-teal-500"
              >
                {Array.from({ length: 12 }, (_, i) => i + 1).map(month => (
                  <option key={month} value={month}>
                    {format(new Date(2000, month - 1, 1), 'MMMM', { locale: it })}
                  </option>
                ))}
              </select>
            </div>
          )}

          {/* Selettore Giorno */}
          {filterType === 'day' && (
            <div>
              <label className="block text-sm font-semibold text-gray-700 mb-1">
                Giorno
              </label>
              <input
                type="date"
                value={selectedDay}
                onChange={(e) => setSelectedDay(e.target.value)}
                className="w-full px-3 py-2 border-2 border-teal-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-teal-500"
              />
            </div>
          )}
        </div>
      </div>

      {/* Riepilogo Totali */}
      <div className="bg-gradient-to-r from-teal-600 to-cyan-600 rounded-xl shadow-lg p-4 text-white">
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <div>
            <div className="text-sm opacity-90">Movimenti</div>
            <div className="text-2xl font-bold">{totalMovimenti}</div>
          </div>
          <div>
            <div className="text-sm opacity-90">Categorie</div>
            <div className="text-2xl font-bold">{groupedByCategory.length}</div>
          </div>
          <div>
            <div className="text-sm opacity-90">Entrate</div>
            <div className="text-2xl font-bold">{formatEuro(totalEntrate)}</div>
          </div>
          <div>
            <div className="text-sm opacity-90">Uscite</div>
            <div className="text-2xl font-bold">{formatEuro(totalUscite)}</div>
          </div>
        </div>
      </div>

      {/* Lista Categorie */}
      <div className="space-y-3">
        {groupedByCategory.map(({ categoria, movements: catMovements, count, totalEntrate: catEntrate, totalUscite: catUscite, totale }) => {
          const isExpanded = expandedCategory === categoria

          return (
            <div key={categoria} className="bg-white rounded-xl shadow-lg border border-gray-100 overflow-hidden">
              {/* Header Categoria */}
              <button
                onClick={() => setExpandedCategory(isExpanded ? null : categoria)}
                className="w-full p-4 hover:bg-gray-50 transition-all text-left"
              >
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3 flex-1">
                    <div className={`w-3 h-3 rounded-full ${totale >= 0 ? 'bg-green-500' : 'bg-red-500'}`} />
                    <div>
                      <div className="font-bold text-gray-800 text-lg">{categoria}</div>
                      <div className="text-sm text-gray-600">{count} movimenti</div>
                    </div>
                  </div>

                  <div className="flex items-center gap-6">
                    {catEntrate > 0 && (
                      <div className="text-right">
                        <div className="text-xs text-gray-600">Entrate</div>
                        <div className="font-bold text-green-600">{formatEuro(catEntrate)}</div>
                      </div>
                    )}
                    {catUscite > 0 && (
                      <div className="text-right">
                        <div className="text-xs text-gray-600">Uscite</div>
                        <div className="font-bold text-red-600">{formatEuro(catUscite)}</div>
                      </div>
                    )}
                    <div className="text-right min-w-[120px]">
                      <div className="text-xs text-gray-600">Totale</div>
                      <div className={`font-bold text-xl ${totale >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                        {formatEuro(totale)}
                      </div>
                    </div>
                    <div className="text-gray-500 text-xl">
                      {isExpanded ? '▼' : '▶'}
                    </div>
                  </div>
                </div>
              </button>

              {/* Dettaglio Movimenti */}
              {isExpanded && (
                <div className="border-t border-gray-200">
                  <div className="overflow-x-auto">
                    <table className="w-full">
                      <thead className="bg-gray-50">
                        <tr>
                          <th className="px-4 py-2 text-left text-xs font-semibold text-gray-600">Data</th>
                          <th className="px-4 py-2 text-left text-xs font-semibold text-gray-600">Descrizione</th>
                          <th className="px-4 py-2 text-left text-xs font-semibold text-gray-600">Conto</th>
                          <th className="px-4 py-2 text-right text-xs font-semibold text-gray-600">Importo</th>
                          <th className="px-4 py-2 text-left text-xs font-semibold text-gray-600">Categoria</th>
                        </tr>
                      </thead>
                      <tbody>
                        {catMovements
                          .sort((a, b) => new Date(b.data) - new Date(a.data))
                          .map((mov, idx) => {
                            const importo = parseFloat(mov.importo)
                            const displayImporto = mov.tipo === 'uscita' ? -importo : importo
                            return (
                              <tr key={mov.id || idx} className="border-t border-gray-100 hover:bg-gray-50">
                                <td className="px-4 py-3 text-sm text-gray-700">
                                  {format(parseISO(mov.data), 'dd/MM/yyyy')}
                                </td>
                                <td className="px-4 py-3 text-sm text-gray-700">{mov.descrizione}</td>
                                <td className="px-4 py-3 text-xs text-gray-600">{mov.conto || '-'}</td>
                                <td className={`px-4 py-3 text-sm font-bold text-right ${mov.tipo === 'entrata' ? 'text-green-600' : 'text-red-600'}`}>
                                  {formatEuro(displayImporto)}
                                </td>
                                <td className="px-4 py-3">
                                  <select
                                    value={mov.categoria || ''}
                                    onChange={(e) => onCategoryChange(mov.id, e.target.value)}
                                    className="text-xs px-2 py-1 border border-gray-300 rounded focus:outline-none focus:ring-2 focus:ring-purple-500"
                                  >
                                    <option value="">Non categorizzato</option>
                                    {categories.map(cat => (
                                      <option key={cat.id} value={cat.nome}>
                                        {cat.icona} {cat.nome}
                                      </option>
                                    ))}
                                  </select>
                                </td>
                              </tr>
                            )
                          })}
                      </tbody>
                    </table>
                  </div>
                </div>
              )}
            </div>
          )
        })}
      </div>

      {groupedByCategory.length === 0 && (
        <div className="bg-white rounded-xl shadow-lg border border-gray-100 p-12 text-center">
          <div className="text-6xl mb-4">📭</div>
          <div className="text-xl font-semibold text-gray-600 mb-2">
            Nessun movimento trovato
          </div>
          <p className="text-gray-500">
            Prova a modificare i filtri di ricerca
          </p>
        </div>
      )}
    </div>
  )
}
