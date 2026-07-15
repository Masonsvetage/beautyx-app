'use client'

import { useState } from 'react'
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from 'recharts'
import { formatEuro } from '@/lib/formatters'
import ChartModal from './ChartModal'

export default function TrendChart({ data, title = 'Andamento Temporale', yoyData, showYoY }) {
  const [isExpanded, setIsExpanded] = useState(false)

  // Stato per metriche selezionate
  const [selectedMetrics, setSelectedMetrics] = useState(['entrate', 'uscite', 'profitti'])

  // Usa dati YoY se disponibili, altrimenti dati standard
  const chartData = showYoY && yoyData ? yoyData : data

  const toggleMetric = (metric) => {
    setSelectedMetrics(prev =>
      prev.includes(metric)
        ? prev.filter(m => m !== metric)
        : [...prev, metric]
    )
  }

  const selectAll = () => {
    const allMetrics = ['entrate', 'uscite', 'profitti']
    if (showYoY) {
      allMetrics.push('entrate_y1', 'uscite_y1', 'profitti_y1')
    }
    setSelectedMetrics(allMetrics)
  }

  const deselectAll = () => {
    setSelectedMetrics([])
  }

  const metrics = [
    { key: 'entrate', label: 'Entrate', color: '#10b981' },
    { key: 'uscite', label: 'Uscite', color: '#ef4444' },
    { key: 'profitti', label: 'Profitti', color: '#14b8a6' }
  ]

  const metricsYoY = [
    { key: 'entrate_y1', label: 'Entrate (anno scorso)', color: '#86efac' },
    { key: 'uscite_y1', label: 'Uscite (anno scorso)', color: '#fca5a5' },
    { key: 'profitti_y1', label: 'Profitti (anno scorso)', color: '#5eead4' }
  ]

  const CustomTooltip = ({ active, payload, label }) => {
    if (active && payload && payload.length) {
      return (
        <div className="bg-white p-4 rounded-lg shadow-xl border border-gray-200">
          <p className="font-semibold text-gray-800 mb-2">{label}</p>
          {payload.map((entry, index) => (
            <p key={index} className="text-sm" style={{ color: entry.color }}>
              <span className="font-medium">{entry.name}:</span>{' '}
              <span className="font-bold">{formatEuro(entry.value)}</span>
            </p>
          ))}
        </div>
      )
    }
    return null
  }

  const renderChart = (height = 200, fontSize = 11) => (
    <ResponsiveContainer width="100%" height={height}>
      <BarChart data={chartData} margin={{ left: 5, right: 5, top: 5, bottom: 5 }}>
        <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
        <XAxis
          dataKey="data"
          tick={{ fontSize }}
          tickLine={false}
        />
        <YAxis
          tick={{ fontSize }}
          tickLine={false}
          tickFormatter={(value) => `${(value / 1000).toFixed(0)}k`}
        />
        <Tooltip content={<CustomTooltip />} />
        <Legend
          wrapperStyle={{ paddingTop: '10px' }}
          iconType="rect"
          fontSize={fontSize}
        />

        {/* Anno corrente - mostra solo metriche selezionate */}
        {selectedMetrics.includes('entrate') && (
          <Bar
            dataKey="entrate"
            fill="#10b981"
            name="Entrate"
            radius={[4, 4, 0, 0]}
          />
        )}
        {selectedMetrics.includes('uscite') && (
          <Bar
            dataKey="uscite"
            fill="#ef4444"
            name="Uscite"
            radius={[4, 4, 0, 0]}
          />
        )}
        {selectedMetrics.includes('profitti') && (
          <Bar
            dataKey="saldo"
            fill="#8b5cf6"
            name="Profitti"
            radius={[4, 4, 0, 0]}
          />
        )}

        {/* Anno scorso (se YoY attivo) */}
        {showYoY && selectedMetrics.includes('entrate_y1') && (
          <Bar
            dataKey="entrate_y1"
            fill="#86efac"
            name="Entrate (anno scorso)"
            radius={[4, 4, 0, 0]}
            opacity={0.6}
          />
        )}
        {showYoY && selectedMetrics.includes('uscite_y1') && (
          <Bar
            dataKey="uscite_y1"
            fill="#fca5a5"
            name="Uscite (anno scorso)"
            radius={[4, 4, 0, 0]}
            opacity={0.6}
          />
        )}
        {showYoY && selectedMetrics.includes('profitti_y1') && (
          <Bar
            dataKey="saldo_y1"
            fill="#c4b5fd"
            name="Profitti (anno scorso)"
            radius={[4, 4, 0, 0]}
            opacity={0.6}
          />
        )}
      </BarChart>
    </ResponsiveContainer>
  )

  return (
    <>
      <div className="bg-white rounded border border-gray-100 p-1.5">
        <div className="flex items-center gap-1.5 mb-1.5">
          <div className="w-6 h-6 bg-gradient-to-br from-purple-500 to-indigo-500 rounded flex items-center justify-center">
            <span className="text-sm">📊</span>
          </div>
          <h3 className="font-bold text-gray-800 text-xs flex-1">{title}</h3>
          <button
            onClick={() => setIsExpanded(true)}
            className="text-xs text-purple-600 hover:text-purple-700 font-semibold"
          >
            🔍 Espandi
          </button>
        </div>

        {/* Selettore metriche */}
        <div className="mb-2 p-2 bg-gray-50 rounded border border-gray-200">
          <div className="flex items-center justify-between mb-1">
            <span className="text-xs font-semibold text-gray-700">Metriche da visualizzare:</span>
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
          <div className="grid grid-cols-3 gap-1">
            {metrics.map((metric) => (
              <label
                key={metric.key}
                className="flex items-center gap-1 cursor-pointer hover:bg-gray-100 p-0.5 rounded text-xs"
              >
                <input
                  type="checkbox"
                  checked={selectedMetrics.includes(metric.key)}
                  onChange={() => toggleMetric(metric.key)}
                  className="w-3 h-3"
                />
                <div
                  className="w-3 h-3 rounded-sm shrink-0"
                  style={{ backgroundColor: metric.color }}
                />
                <span className="text-gray-700">{metric.label}</span>
              </label>
            ))}
          </div>
          {showYoY && (
            <div className="grid grid-cols-3 gap-1 mt-1 pt-1 border-t border-gray-300">
              {metricsYoY.map((metric) => (
                <label
                  key={metric.key}
                  className="flex items-center gap-1 cursor-pointer hover:bg-gray-100 p-0.5 rounded text-xs"
                >
                  <input
                    type="checkbox"
                    checked={selectedMetrics.includes(metric.key)}
                    onChange={() => toggleMetric(metric.key)}
                    className="w-3 h-3"
                  />
                  <div
                    className="w-3 h-3 rounded-sm shrink-0"
                    style={{ backgroundColor: metric.color }}
                  />
                  <span className="text-gray-700 truncate">{metric.label}</span>
                </label>
              ))}
            </div>
          )}
        </div>

        {renderChart(220, 11)}
      </div>

      <ChartModal
        isOpen={isExpanded}
        onClose={() => setIsExpanded(false)}
        title={title}
      >
        {/* Selettore metriche nel modal */}
        <div className="mb-4 p-3 bg-gray-50 rounded border border-gray-200">
          <div className="flex items-center justify-between mb-2">
            <span className="text-sm font-semibold text-gray-700">Metriche da visualizzare:</span>
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
          <div className="grid grid-cols-3 gap-2">
            {metrics.map((metric) => (
              <label
                key={metric.key}
                className="flex items-center gap-2 cursor-pointer hover:bg-gray-100 p-1 rounded text-sm"
              >
                <input
                  type="checkbox"
                  checked={selectedMetrics.includes(metric.key)}
                  onChange={() => toggleMetric(metric.key)}
                  className="w-4 h-4"
                />
                <div
                  className="w-4 h-4 rounded shrink-0"
                  style={{ backgroundColor: metric.color }}
                />
                <span className="text-gray-700">{metric.label}</span>
              </label>
            ))}
          </div>
          {showYoY && (
            <div className="grid grid-cols-3 gap-2 mt-2 pt-2 border-t border-gray-300">
              {metricsYoY.map((metric) => (
                <label
                  key={metric.key}
                  className="flex items-center gap-2 cursor-pointer hover:bg-gray-100 p-1 rounded text-sm"
                >
                  <input
                    type="checkbox"
                    checked={selectedMetrics.includes(metric.key)}
                    onChange={() => toggleMetric(metric.key)}
                    className="w-4 h-4"
                  />
                  <div
                    className="w-4 h-4 rounded shrink-0"
                    style={{ backgroundColor: metric.color }}
                  />
                  <span className="text-gray-700">{metric.label}</span>
                </label>
              ))}
            </div>
          )}
        </div>
        {renderChart(500, 14)}
      </ChartModal>
    </>
  )
}
