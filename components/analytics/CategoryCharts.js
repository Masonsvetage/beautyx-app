'use client'

import { useState, useEffect, useMemo } from 'react'
import { PieChart, Pie, Cell, ResponsiveContainer, Legend, Tooltip, BarChart, Bar, XAxis, YAxis, CartesianGrid, LineChart, Line } from 'recharts'
import { formatEuro } from '@/lib/formatters'
import ChartModal from './ChartModal'

const COLORS = [
  '#14b8a6', '#06b6d4', '#f59e0b', '#10b981', '#3b82f6',
  '#64748b', '#0891b2', '#f97316', '#84cc16', '#2dd4bf'
]

export default function CategoryCharts({ data, tipo = 'both', yoyData, showYoY, timeData }) {
  const [isExpanded, setIsExpanded] = useState(false)

  // Se abbiamo timeData, estraiamo i nomi delle categorie (memoizzato per evitare ricalcoli)
  const categoryNames = useMemo(() => {
    if (timeData && timeData.length > 0) {
      return Object.keys(timeData[0]).filter(key => key !== 'data' && key !== 'dataCompleta')
    }
    return []
  }, [timeData])

  // Stato per le categorie selezionate
  const [selectedCategories, setSelectedCategories] = useState([])

  // Inizializza le categorie selezionate quando categoryNames cambia (solo la prima volta)
  useEffect(() => {
    if (categoryNames.length > 0 && selectedCategories.length === 0) {
      // Inizialmente seleziona le prime 6 categorie
      setSelectedCategories(categoryNames.slice(0, 6))
    }
  }, [categoryNames]) // Dipende da categoryNames memoizzato

  // Prepara dati per grafico a barre
  const barData = showYoY && yoyData
    ? yoyData.slice(0, 12).map(cat => ({
        categoria: cat.categoria,
        entrate: cat.current.entrate,
        uscite: cat.current.uscite,
        entrate_y1: cat.lastYear.entrate,
        uscite_y1: cat.lastYear.uscite
      }))
    : data.slice(0, 12)

  const toggleCategory = (catName) => {
    setSelectedCategories(prev =>
      prev.includes(catName)
        ? prev.filter(c => c !== catName)
        : [...prev, catName]
    )
  }

  const selectAll = () => {
    setSelectedCategories(categoryNames)
  }

  const deselectAll = () => {
    setSelectedCategories([])
  }

  const CustomTooltip = ({ active, payload, label }) => {
    if (active && payload && payload.length) {
      return (
        <div className="bg-white p-3 rounded-lg shadow-lg border border-gray-200">
          <p className="font-semibold text-gray-800 mb-2">{label}</p>
          {payload.map((entry, idx) => (
            <p key={idx} className="text-sm font-bold" style={{ color: entry.color }}>
              {entry.name}: {formatEuro(entry.value)}
            </p>
          ))}
        </div>
      )
    }
    return null
  }

  const renderChart = (chartHeight = 200, fontSize = 11) => {
    if (timeData) {
      // Visualizzazione temporale: unico grafico con barre per categorie selezionate
      return (
        <ResponsiveContainer width="100%" height={chartHeight}>
          <BarChart data={timeData} margin={{ left: 10, right: 10, top: 10, bottom: 5 }}>
            <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
            <XAxis
              dataKey="data"
              tick={{ fontSize }}
              angle={-45}
              textAnchor="end"
              height={60}
            />
            <YAxis
              tick={{ fontSize }}
              tickFormatter={(value) => `${(value / 1000).toFixed(0)}k`}
            />
            <Tooltip
              content={({ active, payload }) => {
                if (active && payload && payload.length) {
                  return (
                    <div className="bg-white p-2 rounded border border-gray-200 shadow-lg">
                      <p className="text-xs font-bold mb-1">{payload[0].payload.data}</p>
                      {payload.map((entry, idx) => (
                        <p key={idx} className="text-xs" style={{ color: entry.color }}>
                          <span className="font-semibold">{entry.name}:</span> {formatEuro(entry.value)}
                        </p>
                      ))}
                    </div>
                  )
                }
                return null
              }}
            />
            <Legend wrapperStyle={{ fontSize: `${fontSize}px` }} />
            {selectedCategories.map((catName, idx) => (
              <Bar
                key={catName}
                dataKey={catName}
                fill={COLORS[categoryNames.indexOf(catName) % COLORS.length]}
                name={catName}
                radius={[4, 4, 0, 0]}
              />
            ))}
          </BarChart>
        </ResponsiveContainer>
      )
    } else {
      // Visualizzazione standard con BarChart
      return (
        <ResponsiveContainer width="100%" height={chartHeight}>
          <BarChart data={barData} layout="vertical" margin={{ left: 5, right: 5, top: 5, bottom: 5 }}>
            <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
            <XAxis type="number" tickFormatter={(value) => `${(value / 1000).toFixed(0)}k`} style={{ fontSize: `${fontSize}px` }} />
            <YAxis type="category" dataKey="categoria" width={100} style={{ fontSize: `${fontSize}px` }} />
            <Tooltip content={<CustomTooltip />} />

            {tipo === 'entrate' && !showYoY && <Bar dataKey="entrate" fill="#10b981" radius={[0, 4, 4, 0]} name="Entrate" />}
            {tipo === 'uscite' && !showYoY && <Bar dataKey="uscite" fill="#ef4444" radius={[0, 4, 4, 0]} name="Uscite" />}
            {tipo === 'both' && !showYoY && (
              <>
                <Bar dataKey="entrate" fill="#10b981" radius={[0, 4, 4, 0]} name="Entrate" />
                <Bar dataKey="uscite" fill="#ef4444" radius={[0, 4, 4, 0]} name="Uscite" />
              </>
            )}

            {tipo === 'both' && showYoY && (
              <>
                <Bar dataKey="entrate" fill="#10b981" radius={[0, 4, 4, 0]} name="Entrate" />
                <Bar dataKey="uscite" fill="#ef4444" radius={[0, 4, 4, 0]} name="Uscite" />
                <Bar dataKey="entrate_y1" fill="#86efac" radius={[0, 4, 4, 0]} name="Entrate (anno scorso)" opacity={0.5} />
                <Bar dataKey="uscite_y1" fill="#fca5a5" radius={[0, 4, 4, 0]} name="Uscite (anno scorso)" opacity={0.5} />
              </>
            )}

            <Legend wrapperStyle={{ fontSize: `${fontSize}px` }} />
          </BarChart>
        </ResponsiveContainer>
      )
    }
  }

  return (
    <>
      <div className="bg-white rounded border border-gray-100 p-1.5">
        <div className="flex items-center gap-1.5 mb-1.5">
          <div className="w-6 h-6 bg-gradient-to-br from-purple-500 to-pink-500 rounded flex items-center justify-center">
            <span className="text-sm">📊</span>
          </div>
          <h3 className="font-bold text-gray-800 text-xs flex-1">
            {timeData ? 'Andamento Categorie nel Tempo' : 'Top 12 Categorie'}
          </h3>
          {timeData && (
            <button
              onClick={() => setIsExpanded(true)}
              className="text-xs text-purple-600 hover:text-purple-700 font-semibold"
            >
              🔍 Espandi
            </button>
          )}
        </div>

        {/* Selettore categorie (solo per timeData) */}
        {timeData && (
          <div className="mb-1.5 p-1.5 bg-gray-50 rounded border border-gray-200">
            <div className="flex items-center justify-between mb-1">
              <span className="text-xs font-semibold text-gray-700">Categorie da visualizzare:</span>
              <div className="flex gap-1">
                <button
                  onClick={selectAll}
                  className="text-xs px-2 py-0.5 bg-purple-100 text-purple-700 rounded hover:bg-purple-200"
                >
                  Tutte
                </button>
                <button
                  onClick={deselectAll}
                  className="text-xs px-2 py-0.5 bg-gray-100 text-gray-700 rounded hover:bg-gray-200"
                >
                  Nessuna
                </button>
              </div>
            </div>
            <div className="grid grid-cols-2 gap-1 max-h-24 overflow-y-auto">
              {categoryNames.map((catName, idx) => (
                <label
                  key={catName}
                  className="flex items-center gap-1 cursor-pointer hover:bg-gray-100 p-0.5 rounded text-xs"
                >
                  <input
                    type="checkbox"
                    checked={selectedCategories.includes(catName)}
                    onChange={() => toggleCategory(catName)}
                    className="w-3 h-3"
                  />
                  <div
                    className="w-3 h-3 rounded-sm shrink-0"
                    style={{ backgroundColor: COLORS[idx % COLORS.length] }}
                  />
                  <span className="truncate text-gray-700" title={catName}>{catName}</span>
                </label>
              ))}
            </div>
          </div>
        )}

        <div className={timeData ? '' : 'cursor-pointer hover:shadow-lg transition-shadow'} onClick={timeData ? undefined : () => setIsExpanded(true)}>
          {renderChart(220, 11)}
        </div>
      </div>

      <ChartModal
        isOpen={isExpanded}
        onClose={() => setIsExpanded(false)}
        title={timeData ? 'Andamento Categorie nel Tempo' : 'Top 12 Categorie'}
      >
        {timeData && (
          <div className="mb-4 p-3 bg-gray-50 rounded border border-gray-200">
            <div className="flex items-center justify-between mb-2">
              <span className="text-sm font-semibold text-gray-700">Categorie da visualizzare:</span>
              <div className="flex gap-2">
                <button
                  onClick={selectAll}
                  className="text-sm px-3 py-1 bg-purple-100 text-purple-700 rounded hover:bg-purple-200"
                >
                  Seleziona Tutte
                </button>
                <button
                  onClick={deselectAll}
                  className="text-sm px-3 py-1 bg-gray-100 text-gray-700 rounded hover:bg-gray-200"
                >
                  Deseleziona Tutte
                </button>
              </div>
            </div>
            <div className="grid grid-cols-3 gap-2 max-h-40 overflow-y-auto">
              {categoryNames.map((catName, idx) => (
                <label
                  key={catName}
                  className="flex items-center gap-2 cursor-pointer hover:bg-gray-100 p-1 rounded text-sm"
                >
                  <input
                    type="checkbox"
                    checked={selectedCategories.includes(catName)}
                    onChange={() => toggleCategory(catName)}
                    className="w-4 h-4"
                  />
                  <div
                    className="w-4 h-4 rounded shrink-0"
                    style={{ backgroundColor: COLORS[idx % COLORS.length] }}
                  />
                  <span className="truncate text-gray-700" title={catName}>{catName}</span>
                </label>
              ))}
            </div>
          </div>
        )}
        {renderChart(500, 14)}
      </ChartModal>
    </>
  )
}
