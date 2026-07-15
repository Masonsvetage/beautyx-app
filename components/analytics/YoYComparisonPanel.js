'use client'

import { useState } from 'react'
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from 'recharts'
import { formatEuro } from '@/lib/formatters'

export default function YoYComparisonPanel({ yoyData, onClose }) {
  const [expanded, setExpanded] = useState(false)

  if (!yoyData) return null

  const { kpis, categories, trends } = yoyData

  // Prepara dati per grafico comparativo metriche principali
  const metricsComparisonData = [
    {
      metrica: 'Entrate',
      corrente: kpis.current.entrate,
      annoScorso: kpis.lastYear.entrate
    },
    {
      metrica: 'Uscite',
      corrente: kpis.current.uscite,
      annoScorso: kpis.lastYear.uscite
    },
    {
      metrica: 'Profitti',
      corrente: kpis.current.saldo,
      annoScorso: kpis.lastYear.saldo
    }
  ]

  const getChangeIndicator = (change) => {
    if (change > 5) return { icon: '↑', color: 'text-green-600', bg: 'bg-green-50' }
    if (change < -5) return { icon: '↓', color: 'text-red-600', bg: 'bg-red-50' }
    return { icon: '→', color: 'text-gray-600', bg: 'bg-gray-50' }
  }

  const CustomTooltip = ({ active, payload, label }) => {
    if (active && payload && payload.length) {
      return (
        <div className="bg-white p-2 rounded-lg shadow-xl border border-gray-200">
          <p className="font-semibold text-gray-800 mb-1 text-xs">{label}</p>
          {payload.map((entry, index) => (
            <p key={index} className="text-xs" style={{ color: entry.color }}>
              <span className="font-medium">{entry.name}:</span>{' '}
              <span className="font-bold">{formatEuro(entry.value)}</span>
            </p>
          ))}
        </div>
      )
    }
    return null
  }

  const kpiRows = [
    { key: 'entrate', label: 'Entrate Totali', format: formatEuro },
    { key: 'uscite', label: 'Uscite Totali', format: formatEuro },
    { key: 'saldo', label: 'Saldo Netto', format: formatEuro },
    { key: 'margineOperativo', label: 'Margine Operativo', format: (v) => `${v.toFixed(1)}%` },
    { key: 'entrataMediaGiornaliera', label: 'Entrata Media/Giorno', format: formatEuro },
    { key: 'entrataMediaOraria', label: 'Entrata Media/Ora', format: formatEuro },
    { key: 'costoGiornalieroEsercizio', label: 'Costo/Giorno', format: formatEuro },
    { key: 'costoOrarioEsercizio', label: 'Costo/Ora', format: formatEuro }
  ]

  const entrateIndicator = getChangeIndicator(kpis.changes.entrate)
  const usciteIndicator = getChangeIndicator(kpis.changes.uscite)
  const saldoIndicator = getChangeIndicator(kpis.changes.saldo)

  return (
    <div className="bg-white rounded border border-indigo-200 p-2">
      {/* Header compatto cliccabile */}
      <button
        onClick={() => setExpanded(!expanded)}
        className="w-full flex items-center gap-2 cursor-pointer hover:bg-indigo-50 rounded p-1 transition-colors"
      >
        <div className="w-6 h-6 bg-indigo-500 rounded flex items-center justify-center shrink-0">
          <span className="text-sm">📅</span>
        </div>
        <h3 className="font-bold text-gray-800 text-xs flex-1 text-left">Confronto Anno su Anno</h3>
        <div className="flex items-center gap-2">
          <div className="flex items-center gap-1 text-xs">
            <span className="text-gray-600">Entrate:</span>
            <span className={`font-bold ${entrateIndicator.color}`}>
              {entrateIndicator.icon}{Math.abs(kpis.changes.entrate).toFixed(0)}%
            </span>
          </div>
          <div className="flex items-center gap-1 text-xs">
            <span className="text-gray-600">Saldo:</span>
            <span className={`font-bold ${saldoIndicator.color}`}>
              {saldoIndicator.icon}{Math.abs(kpis.changes.saldo).toFixed(0)}%
            </span>
          </div>
          <span className="text-gray-500 text-xs">{expanded ? '▼' : '▶'}</span>
        </div>
        <button
          onClick={(e) => {
            e.stopPropagation()
            onClose()
          }}
          className="text-gray-500 hover:text-gray-700 text-xs font-bold ml-2"
        >
          ✕
        </button>
      </button>

      {expanded && (
        <div className="mt-2">
          <div className="h-px bg-indigo-200 mb-2"></div>

      {/* Sezione 1: KPI Principali con 3 anni */}
      <div className="mb-2">
        <h4 className="font-semibold text-xs text-gray-700 mb-1 flex items-center gap-1">
          <span>📊</span> KPI Principali (ultimi 3 anni)
        </h4>
        <div className="overflow-x-auto">
          <table className="w-full text-xs">
            <thead>
              <tr className="border-b border-gray-200 bg-gray-50">
                <th className="text-left p-1 font-semibold text-gray-700">Metrica</th>
                <th className="text-right p-1 font-semibold text-indigo-700">Corrente</th>
                <th className="text-right p-1 font-semibold text-gray-600">-1 anno</th>
                <th className="text-right p-1 font-semibold text-gray-500">-2 anni</th>
                <th className="text-right p-1 font-semibold text-gray-400">-3 anni</th>
                <th className="text-right p-1 font-semibold text-green-700">Δ%</th>
              </tr>
            </thead>
            <tbody>
              {kpiRows.map((row, idx) => {
                const current = kpis.current[row.key]
                const y1 = kpis.lastYear[row.key]
                const y2 = kpis.twoYears[row.key]
                const y3 = kpis.threeYears[row.key]
                const change = kpis.changes[row.key]
                const indicator = getChangeIndicator(change)

                return (
                  <tr key={idx} className="border-b border-gray-100 hover:bg-gray-50">
                    <td className="p-1 text-gray-700 font-medium">{row.label}</td>
                    <td className="p-1 text-right font-bold text-indigo-700">{row.format(current)}</td>
                    <td className="p-1 text-right text-gray-700">{row.format(y1)}</td>
                    <td className="p-1 text-right text-gray-600">{row.format(y2)}</td>
                    <td className="p-1 text-right text-gray-500">{row.format(y3)}</td>
                    <td className={`p-1 text-right font-bold ${indicator.color}`}>
                      {indicator.icon} {Math.abs(change).toFixed(1)}%
                    </td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        </div>
      </div>

      {/* Sezione 2: Grafico Comparativo Metriche Principali */}
      <div className="mb-2">
        <h4 className="font-semibold text-xs text-gray-700 mb-1 flex items-center gap-1">
          <span>📊</span> Confronto Visivo: Anno Corrente vs Anno Scorso
        </h4>
        <div className="bg-gray-50 rounded border border-gray-200 p-2">
          <ResponsiveContainer width="100%" height={200}>
            <BarChart data={metricsComparisonData} margin={{ left: 10, right: 10, top: 10, bottom: 5 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
              <XAxis dataKey="metrica" tick={{ fontSize: 11 }} />
              <YAxis
                tick={{ fontSize: 11 }}
                tickFormatter={(value) => `${(value / 1000).toFixed(0)}k`}
              />
              <Tooltip content={<CustomTooltip />} />
              <Legend wrapperStyle={{ fontSize: '11px' }} />
              <Bar
                dataKey="corrente"
                fill="#4f46e5"
                name="Anno Corrente"
                radius={[4, 4, 0, 0]}
              />
              <Bar
                dataKey="annoScorso"
                fill="#a5b4fc"
                name="Anno Scorso"
                radius={[4, 4, 0, 0]}
                opacity={0.7}
              />
            </BarChart>
          </ResponsiveContainer>
        </div>
      </div>

      {/* Sezione 3: Top Categorie Dettagliate */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-2">
        {/* Entrate per Categoria */}
        <div>
          <h4 className="font-semibold text-xs text-gray-700 mb-1 flex items-center gap-1">
            <span>💰</span> Entrate per Categoria ({categories.filter(cat => cat.current.entrate > 0).length})
          </h4>
          <div className="overflow-x-auto max-h-64 overflow-y-auto">
            <table className="w-full text-xs">
              <thead className="sticky top-0 bg-green-50">
                <tr className="border-b border-gray-200">
                  <th className="text-left p-1 font-semibold text-gray-700">Categoria</th>
                  <th className="text-right p-1 font-semibold text-green-700">Corrente</th>
                  <th className="text-right p-1 font-semibold text-gray-600">-1a</th>
                  <th className="text-right p-1 font-semibold text-green-700">Δ%</th>
                </tr>
              </thead>
              <tbody>
                {categories
                  .filter(cat => cat.current.entrate > 0)
                  .sort((a, b) => b.current.entrate - a.current.entrate)
                  .map((cat, idx) => {
                    const change = cat.changes.entrate
                    const indicator = getChangeIndicator(change)
                    return (
                      <tr key={idx} className="border-b border-gray-100">
                        <td className="p-1 text-gray-700 truncate max-w-[100px]" title={cat.categoria}>{cat.categoria}</td>
                        <td className="p-1 text-right font-semibold text-green-700">
                          {formatEuro(cat.current.entrate)}
                        </td>
                        <td className="p-1 text-right text-gray-600">
                          {formatEuro(cat.lastYear.entrate)}
                        </td>
                        <td className={`p-1 text-right font-bold ${indicator.color}`}>
                          {indicator.icon}{Math.abs(change).toFixed(0)}%
                        </td>
                      </tr>
                    )
                  })}
              </tbody>
            </table>
          </div>
        </div>

        {/* Uscite per Categoria */}
        <div>
          <h4 className="font-semibold text-xs text-gray-700 mb-1 flex items-center gap-1">
            <span>📤</span> Uscite per Categoria ({categories.filter(cat => cat.current.uscite > 0).length})
          </h4>
          <div className="overflow-x-auto max-h-64 overflow-y-auto">
            <table className="w-full text-xs">
              <thead className="sticky top-0 bg-red-50">
                <tr className="border-b border-gray-200">
                  <th className="text-left p-1 font-semibold text-gray-700">Categoria</th>
                  <th className="text-right p-1 font-semibold text-red-700">Corrente</th>
                  <th className="text-right p-1 font-semibold text-gray-600">-1a</th>
                  <th className="text-right p-1 font-semibold text-red-700">Δ%</th>
                </tr>
              </thead>
              <tbody>
                {categories
                  .filter(cat => cat.current.uscite > 0)
                  .sort((a, b) => b.current.uscite - a.current.uscite)
                  .map((cat, idx) => {
                    const change = cat.changes.uscite
                    const indicator = getChangeIndicator(change)
                    return (
                      <tr key={idx} className="border-b border-gray-100">
                        <td className="p-1 text-gray-700 truncate max-w-[100px]" title={cat.categoria}>{cat.categoria}</td>
                        <td className="p-1 text-right font-semibold text-red-700">
                          {formatEuro(cat.current.uscite)}
                        </td>
                        <td className="p-1 text-right text-gray-600">
                          {formatEuro(cat.lastYear.uscite)}
                        </td>
                        <td className={`p-1 text-right font-bold ${indicator.color}`}>
                          {indicator.icon}{Math.abs(change).toFixed(0)}%
                        </td>
                      </tr>
                    )
                  })}
              </tbody>
            </table>
          </div>
        </div>
      </div>

      {/* Sezione 4: Maggiori Variazioni */}
      <div className="mt-2">
        <h4 className="font-semibold text-xs text-gray-700 mb-1 flex items-center gap-1">
          <span>⚡</span> Tutte le Variazioni per Categoria ({categories.length})
        </h4>
        <div className="grid grid-cols-2 lg:grid-cols-3 gap-1 max-h-64 overflow-y-auto">
          {categories
            .map(cat => ({
              ...cat,
              totalChange: Math.abs(cat.changes.entrate) + Math.abs(cat.changes.uscite)
            }))
            .sort((a, b) => b.totalChange - a.totalChange)
            .map((cat, idx) => {
              const entrateIndicator = getChangeIndicator(cat.changes.entrate)
              const usciteIndicator = getChangeIndicator(cat.changes.uscite)
              return (
                <div key={idx} className="p-1 rounded border border-gray-200 bg-gray-50">
                  <div className="font-semibold text-xs text-gray-800 truncate mb-0.5" title={cat.categoria}>
                    {cat.categoria}
                  </div>
                  <div className="flex items-center justify-between text-xs">
                    <span className="text-gray-600">Entrate:</span>
                    <span className={`font-bold ${entrateIndicator.color}`}>
                      {entrateIndicator.icon} {Math.abs(cat.changes.entrate).toFixed(0)}%
                    </span>
                  </div>
                  <div className="flex items-center justify-between text-xs">
                    <span className="text-gray-600">Uscite:</span>
                    <span className={`font-bold ${usciteIndicator.color}`}>
                      {usciteIndicator.icon} {Math.abs(cat.changes.uscite).toFixed(0)}%
                    </span>
                  </div>
                </div>
              )
            })}
        </div>
      </div>
        </div>
      )}
    </div>
  )
}
