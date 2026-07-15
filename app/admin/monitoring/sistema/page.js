'use client'

import { useState, useEffect } from 'react'
import Link from 'next/link'

export default function MonitoringSistemaPage() {
  const [data, setData] = useState(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    loadData()
  }, [])

  const loadData = async () => {
    try {
      const res = await fetch('/api/admin/monitoring/system')
      const json = await res.json()
      setData(json)
    } catch (error) {
      console.error('Errore caricamento salute sistema:', error)
    } finally {
      setLoading(false)
    }
  }

  const health = data?.health || {}
  const centroHealth = data?.centroHealth || []

  // Indicatori di salute con logica semaforo
  const healthIndicators = [
    {
      label: 'Utenti senza centro',
      value: health.users_without_centro || 0,
      getStatus: (v) => v === 0 ? 'green' : 'red',
      icon: 'M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z'
    },
    {
      label: 'Abbonamenti scaduti',
      value: health.expired_subscriptions || 0,
      getStatus: (v) => v === 0 ? 'green' : v < 3 ? 'yellow' : 'red',
      icon: 'M3 10h18M7 15h1m4 0h1m-7 4h12a3 3 0 003-3V8a3 3 0 00-3-3H6a3 3 0 00-3 3v8a3 3 0 003 3z'
    },
    {
      label: 'Richieste pending',
      value: health.pending_contact_requests || 0,
      getStatus: (v) => v === 0 ? 'green' : v < 5 ? 'yellow' : 'red',
      icon: 'M8 10h.01M12 10h.01M16 10h.01M9 16H5a2 2 0 01-2-2V6a2 2 0 012-2h14a2 2 0 012 2v8a2 2 0 01-2 2h-5l-5 5v-5z'
    },
    {
      label: 'Centri senza HPA',
      value: health.unassigned_centri || 0,
      getStatus: (v) => v === 0 ? 'green' : 'red',
      icon: 'M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4'
    },
    {
      label: 'Mai collegati',
      value: health.users_never_logged_in || 0,
      getStatus: (v) => v === 0 ? 'green' : v < 10 ? 'yellow' : 'red',
      icon: 'M18.364 5.636l-3.536 3.536m0 5.656l3.536 3.536M9.172 9.172L5.636 5.636m3.536 9.192l-3.536 3.536M21 12a9 9 0 11-18 0 9 9 0 0118 0zm-5 0a4 4 0 11-8 0 4 4 0 018 0z'
    },
    {
      label: 'Inattivi 30g',
      value: health.users_inactive_30d || 0,
      getStatus: (v) => v === 0 ? 'green' : v < 5 ? 'yellow' : 'red',
      icon: 'M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z'
    }
  ]

  const statusConfig = {
    green: {
      bg: 'bg-emerald-500/10',
      border: 'border-emerald-500/30',
      dot: 'bg-emerald-500',
      text: 'text-emerald-400',
      label: 'OK'
    },
    yellow: {
      bg: 'bg-amber-500/10',
      border: 'border-amber-500/30',
      dot: 'bg-amber-500',
      text: 'text-amber-400',
      label: 'Attenzione'
    },
    red: {
      bg: 'bg-red-500/10',
      border: 'border-red-500/30',
      dot: 'bg-red-500',
      text: 'text-red-400',
      label: 'Critico'
    }
  }

  const getHealthScoreColor = (score) => {
    if (score >= 80) return 'bg-emerald-500'
    if (score >= 60) return 'bg-blue-500'
    if (score >= 40) return 'bg-amber-500'
    if (score >= 20) return 'bg-orange-500'
    return 'bg-red-500'
  }

  const getHealthScoreTextColor = (score) => {
    if (score >= 80) return 'text-emerald-400'
    if (score >= 60) return 'text-blue-400'
    if (score >= 40) return 'text-amber-400'
    if (score >= 20) return 'text-orange-400'
    return 'text-red-400'
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-800 via-slate-900 to-slate-800 flex items-center justify-center">
        <div className="text-center">
          <div className="w-12 h-12 border-4 border-green-500 border-t-transparent rounded-full animate-spin mx-auto"></div>
          <p className="mt-4 text-slate-400">Caricamento salute sistema...</p>
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
            <div className="w-10 h-10 bg-gradient-to-br from-green-600 to-emerald-600 rounded-lg flex items-center justify-center">
              <svg className="w-6 h-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" />
              </svg>
            </div>
            <div>
              <h1 className="text-2xl font-bold text-white">Salute Sistema</h1>
              <p className="text-sm text-slate-400">Panoramica dello stato di salute e dei problemi aperti</p>
            </div>
          </div>
        </div>

        {/* Health Indicator Cards - Traffic Light Style */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {healthIndicators.map((indicator) => {
            const status = indicator.getStatus(indicator.value)
            const config = statusConfig[status]

            return (
              <div
                key={indicator.label}
                className={`${config.bg} border ${config.border} rounded-xl p-4 transition-all`}
              >
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <div className={`w-10 h-10 ${config.bg} rounded-lg flex items-center justify-center`}>
                      <svg className={`w-5 h-5 ${config.text}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d={indicator.icon} />
                      </svg>
                    </div>
                    <div>
                      <p className="text-sm text-slate-300 font-medium">{indicator.label}</p>
                      <p className={`text-2xl font-bold ${config.text}`}>{indicator.value}</p>
                    </div>
                  </div>
                  <div className="flex flex-col items-center gap-1">
                    <div className={`w-4 h-4 rounded-full ${config.dot} animate-pulse`} />
                    <span className={`text-xs ${config.text}`}>{config.label}</span>
                  </div>
                </div>
              </div>
            )
          })}
        </div>

        {/* Centro Health Scores Table */}
        <div className="bg-slate-800/80 border border-slate-700/50 rounded-xl overflow-hidden">
          <div className="p-4 border-b border-slate-700/50">
            <h3 className="text-white font-semibold">Health Score Centri</h3>
            <p className="text-sm text-slate-400 mt-1">Punteggio di salute per ogni centro estetico</p>
          </div>
          {centroHealth.length > 0 ? (
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="border-b border-slate-700/50">
                    <th className="text-left p-4 text-sm font-medium text-slate-400">Centro</th>
                    <th className="text-left p-4 text-sm font-medium text-slate-400">Abbonamento</th>
                    <th className="text-left p-4 text-sm font-medium text-slate-400">HPA</th>
                    <th className="text-left p-4 text-sm font-medium text-slate-400">Health Score</th>
                    <th className="text-center p-4 text-sm font-medium text-slate-400">Obiettivi Attivi</th>
                  </tr>
                </thead>
                <tbody>
                  {centroHealth.map((centro, idx) => {
                    const score = centro.health_score || 0
                    return (
                      <tr key={centro.centro_id || idx} className="border-b border-slate-700/30 hover:bg-slate-700/20">
                        <td className="p-4">
                          <span className="text-white font-medium">{centro.centro_nome || '-'}</span>
                        </td>
                        <td className="p-4">
                          {centro.subscription_status ? (
                            <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${
                              centro.subscription_status === 'active'
                                ? 'bg-emerald-500/20 text-emerald-400'
                                : centro.subscription_status === 'trial'
                                ? 'bg-blue-500/20 text-blue-400'
                                : 'bg-red-500/20 text-red-400'
                            }`}>
                              {centro.subscription_status}
                            </span>
                          ) : (
                            <span className="text-slate-500 text-sm">-</span>
                          )}
                        </td>
                        <td className="p-4">
                          {centro.hpa_nome ? (
                            <span className="text-slate-300 text-sm">{centro.hpa_nome}</span>
                          ) : (
                            <span className="text-red-400 text-sm">Non assegnato</span>
                          )}
                        </td>
                        <td className="p-4">
                          <div className="flex items-center gap-3">
                            <div className="flex-1 max-w-[120px] bg-slate-600/30 rounded-full h-3">
                              <div
                                className={`h-3 rounded-full ${getHealthScoreColor(score)} transition-all duration-500`}
                                style={{ width: `${Math.min(score, 100)}%` }}
                              />
                            </div>
                            <span className={`text-sm font-bold ${getHealthScoreTextColor(score)} w-10 text-right`}>
                              {score}
                            </span>
                          </div>
                        </td>
                        <td className="p-4 text-center">
                          <span className="text-slate-300">{centro.obiettivi_attivi || 0}</span>
                        </td>
                      </tr>
                    )
                  })}
                </tbody>
              </table>
            </div>
          ) : (
            <div className="p-12 text-center">
              <svg className="w-16 h-16 mx-auto text-slate-600 mb-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4" />
              </svg>
              <h3 className="text-lg font-medium text-white mb-2">Nessun dato centri</h3>
              <p className="text-slate-400">Non ci sono centri con health score calcolato</p>
            </div>
          )}
        </div>

      </div>
    </div>
  )
}
