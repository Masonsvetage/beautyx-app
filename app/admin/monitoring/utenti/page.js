'use client'

import { useState, useEffect } from 'react'
import Link from 'next/link'
import { PieChart, Pie, Cell, ResponsiveContainer, Tooltip } from 'recharts'

const activityColors = {
  molto_attivo: '#10b981',
  attivo: '#3b82f6',
  basso: '#f59e0b',
  inattivo: '#f97316',
  mai_collegato: '#6b7280'
}

const activityLabels = {
  molto_attivo: 'Molto attivo',
  attivo: 'Attivo',
  basso: 'Basso',
  inattivo: 'Inattivo',
  mai_collegato: 'Mai collegato'
}

export default function MonitoringUtentiPage() {
  const [data, setData] = useState(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    loadData()
  }, [])

  const loadData = async () => {
    try {
      const res = await fetch('/api/admin/monitoring/users')
      const json = await res.json()
      setData(json)
    } catch (error) {
      console.error('Errore caricamento dati utenti:', error)
    } finally {
      setLoading(false)
    }
  }

  const activityLevels = data?.activityLevels || []
  const stats = data?.stats || {}

  // Calcolo utenti attivi nelle ultime 24h (molto_attivo)
  const active24h = activityLevels.find(l => l.activity_level === 'molto_attivo')?.user_count || 0
  const totalFromLevels = activityLevels.reduce((sum, l) => sum + (l.user_count || 0), 0)

  // Dati per il grafico a ciambella
  const chartData = activityLevels.map(level => ({
    name: activityLabels[level.activity_level] || level.activity_level,
    value: level.user_count || 0,
    key: level.activity_level
  }))

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-800 via-slate-900 to-slate-800 flex items-center justify-center">
        <div className="text-center">
          <div className="w-12 h-12 border-4 border-blue-500 border-t-transparent rounded-full animate-spin mx-auto"></div>
          <p className="mt-4 text-slate-400">Caricamento attivita utenti...</p>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-800 via-slate-900 to-slate-800 p-4 md:p-6">
      <div className="max-w-7xl mx-auto space-y-6">

        {/* Header */}
        <div className="bg-slate-950/60 backdrop-blur-md rounded-xl border border-slate-700/50 p-4">
          <div className="flex items-center gap-3">
            <Link href="/admin/monitoring" className="text-slate-400 hover:text-white transition-colors">
              <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
              </svg>
            </Link>
            <div className="w-10 h-10 bg-gradient-to-br from-blue-600 to-indigo-600 rounded-lg flex items-center justify-center">
              <svg className="w-6 h-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197M13 7a4 4 0 11-8 0 4 4 0 018 0z" />
              </svg>
            </div>
            <div>
              <h1 className="text-2xl font-bold text-white">Attivita Utenti</h1>
              <p className="text-sm text-slate-400">Analisi livelli di attivita e engagement degli utenti</p>
            </div>
          </div>
        </div>

        {/* Summary Cards */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div className="bg-slate-800/80 border border-slate-700/50 rounded-xl p-4">
            <p className="text-slate-400 text-sm">Utenti Totali</p>
            <p className="text-3xl font-bold text-white">{stats.totalUsers || totalFromLevels}</p>
            <p className="text-xs text-slate-500 mt-1">Registrati nella piattaforma</p>
          </div>
          <div className="bg-slate-800/80 border border-slate-700/50 rounded-xl p-4">
            <p className="text-slate-400 text-sm">Nuovi Questa Settimana</p>
            <p className="text-3xl font-bold text-blue-400">{stats.newThisWeek || 0}</p>
            <p className="text-xs text-slate-500 mt-1">Ultimi 7 giorni</p>
          </div>
          <div className="bg-slate-800/80 border border-slate-700/50 rounded-xl p-4">
            <p className="text-slate-400 text-sm">Attivi 24h</p>
            <p className="text-3xl font-bold text-emerald-400">{active24h}</p>
            <p className="text-xs text-slate-500 mt-1">Utenti molto attivi</p>
          </div>
        </div>

        {/* Chart + Legend */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Donut Chart */}
          <div className="bg-slate-800/80 border border-slate-700/50 rounded-xl p-6">
            <h3 className="text-white font-semibold mb-4">Distribuzione Livelli Attivita</h3>
            {chartData.length > 0 ? (
              <div className="flex items-center justify-center">
                <div className="w-64 h-64">
                  <ResponsiveContainer width="100%" height="100%">
                    <PieChart>
                      <Pie
                        data={chartData}
                        dataKey="value"
                        nameKey="name"
                        cx="50%"
                        cy="50%"
                        innerRadius={60}
                        outerRadius={100}
                        paddingAngle={3}
                        strokeWidth={0}
                      >
                        {chartData.map((entry) => (
                          <Cell
                            key={entry.key}
                            fill={activityColors[entry.key] || '#6b7280'}
                          />
                        ))}
                      </Pie>
                      <Tooltip
                        contentStyle={{
                          background: '#1e293b',
                          border: '1px solid #475569',
                          borderRadius: 8
                        }}
                        labelStyle={{ color: '#94a3b8' }}
                        formatter={(value, name) => [value, name]}
                      />
                    </PieChart>
                  </ResponsiveContainer>
                </div>
              </div>
            ) : (
              <p className="text-slate-500 text-sm text-center py-12">Nessun dato disponibile</p>
            )}
          </div>

          {/* Legend + Breakdown */}
          <div className="bg-slate-800/80 border border-slate-700/50 rounded-xl p-6">
            <h3 className="text-white font-semibold mb-4">Dettaglio per Livello</h3>
            <div className="space-y-3">
              {activityLevels.map((level) => {
                const pct = totalFromLevels > 0
                  ? Math.round((level.user_count / totalFromLevels) * 100)
                  : 0
                const color = activityColors[level.activity_level] || '#6b7280'

                return (
                  <div key={level.activity_level} className="bg-slate-700/30 rounded-lg p-3">
                    <div className="flex items-center justify-between mb-2">
                      <div className="flex items-center gap-2">
                        <div className="w-3 h-3 rounded-full flex-shrink-0" style={{ backgroundColor: color }} />
                        <span className="text-sm font-medium text-white">
                          {activityLabels[level.activity_level] || level.activity_level}
                        </span>
                      </div>
                      <div className="flex items-center gap-3">
                        <span className="text-sm text-slate-300">{level.user_count} utenti</span>
                        <span className="text-xs text-slate-500 w-10 text-right">{pct}%</span>
                      </div>
                    </div>
                    <div className="w-full bg-slate-600/30 rounded-full h-2">
                      <div
                        className="h-2 rounded-full transition-all duration-500"
                        style={{ width: `${pct}%`, backgroundColor: color }}
                      />
                    </div>
                  </div>
                )
              })}
            </div>

            {activityLevels.length === 0 && (
              <p className="text-slate-500 text-sm text-center py-8">Nessun dato disponibile</p>
            )}
          </div>
        </div>

        {/* Activity Levels Table */}
        <div className="bg-slate-800/80 border border-slate-700/50 rounded-xl overflow-hidden">
          <div className="p-4 border-b border-slate-700/50">
            <h3 className="text-white font-semibold">Riepilogo Livelli Attivita</h3>
          </div>
          {activityLevels.length > 0 ? (
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="border-b border-slate-700/50">
                    <th className="text-left p-4 text-sm font-medium text-slate-400">Livello</th>
                    <th className="text-center p-4 text-sm font-medium text-slate-400">Utenti</th>
                    <th className="text-center p-4 text-sm font-medium text-slate-400">Percentuale</th>
                    <th className="text-left p-4 text-sm font-medium text-slate-400">Barra</th>
                  </tr>
                </thead>
                <tbody>
                  {activityLevels.map((level) => {
                    const pct = totalFromLevels > 0
                      ? Math.round((level.user_count / totalFromLevels) * 100)
                      : 0
                    const color = activityColors[level.activity_level] || '#6b7280'

                    return (
                      <tr key={level.activity_level} className="border-b border-slate-700/30 hover:bg-slate-700/20">
                        <td className="p-4">
                          <div className="flex items-center gap-2">
                            <div className="w-3 h-3 rounded-full flex-shrink-0" style={{ backgroundColor: color }} />
                            <span className="text-white font-medium">
                              {activityLabels[level.activity_level] || level.activity_level}
                            </span>
                          </div>
                        </td>
                        <td className="p-4 text-center text-slate-300 font-medium">{level.user_count}</td>
                        <td className="p-4 text-center text-slate-300">{pct}%</td>
                        <td className="p-4">
                          <div className="w-full max-w-xs bg-slate-600/30 rounded-full h-2">
                            <div
                              className="h-2 rounded-full"
                              style={{ width: `${pct}%`, backgroundColor: color }}
                            />
                          </div>
                        </td>
                      </tr>
                    )
                  })}
                </tbody>
              </table>
            </div>
          ) : (
            <div className="p-12 text-center">
              <p className="text-slate-500">Nessun dato di attivita disponibile</p>
            </div>
          )}
        </div>

      </div>
    </div>
  )
}
