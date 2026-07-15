'use client'

import { useState, useEffect } from 'react'

export default function AlertPanel({ onViewDetails }) {
  const [alerts, setAlerts] = useState([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    loadAlerts()
  }, [])

  const loadAlerts = async () => {
    try {
      const res = await fetch('/api/hpa/dashboard/alerts')
      const data = await res.json()
      if (data.alerts) {
        setAlerts(data.alerts)
      }
    } catch (error) {
      console.error('Errore caricamento alert:', error)
    } finally {
      setLoading(false)
    }
  }

  const priorityColors = {
    alta: 'border-red-500/50 bg-red-500/10',
    media: 'border-amber-500/50 bg-amber-500/10',
    bassa: 'border-blue-500/50 bg-blue-500/10'
  }

  const priorityIcons = {
    utenti_inattivi: (
      <svg className="w-5 h-5 text-amber-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197m13.5-9a2.5 2.5 0 11-5 0 2.5 2.5 0 015 0z" />
      </svg>
    ),
    richieste_urgenti: (
      <svg className="w-5 h-5 text-red-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
      </svg>
    ),
    obiettivi_scadenza: (
      <svg className="w-5 h-5 text-orange-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
      </svg>
    ),
    appuntamenti_imminenti: (
      <svg className="w-5 h-5 text-teal-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 10l4.553-2.276A1 1 0 0121 8.618v6.764a1 1 0 01-1.447.894L15 14M5 18h8a2 2 0 002-2V8a2 2 0 00-2-2H5a2 2 0 00-2 2v8a2 2 0 002 2z" />
      </svg>
    )
  }

  if (loading) {
    return (
      <div className="bg-slate-800/50 rounded-xl p-4 border border-slate-700/50">
        <div className="animate-pulse">
          <div className="h-5 w-24 bg-slate-700 rounded mb-3"></div>
          <div className="space-y-2">
            <div className="h-16 bg-slate-700 rounded"></div>
            <div className="h-16 bg-slate-700 rounded"></div>
          </div>
        </div>
      </div>
    )
  }

  if (alerts.length === 0) {
    return (
      <div className="bg-slate-800/50 rounded-xl p-4 border border-slate-700/50">
        <h3 className="text-sm font-semibold text-slate-400 mb-3">Alert</h3>
        <div className="text-center py-4">
          <svg className="w-8 h-8 text-emerald-400 mx-auto mb-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
          </svg>
          <p className="text-sm text-slate-400">Nessun alert attivo</p>
        </div>
      </div>
    )
  }

  return (
    <div className="bg-slate-800/50 rounded-xl p-4 border border-slate-700/50">
      <div className="flex items-center justify-between mb-3">
        <h3 className="text-sm font-semibold text-slate-400">Alert ({alerts.length})</h3>
        <button
          onClick={() => loadAlerts()}
          className="text-xs text-slate-500 hover:text-slate-300"
        >
          Aggiorna
        </button>
      </div>

      <div className="space-y-2 max-h-64 overflow-y-auto">
        {alerts.map((alert, index) => (
          <div
            key={index}
            className={`rounded-lg p-3 border cursor-pointer hover:opacity-80 transition-opacity ${priorityColors[alert.priorita]}`}
            onClick={() => onViewDetails?.(alert)}
          >
            <div className="flex items-start gap-3">
              <div className="flex-shrink-0 mt-0.5">
                {priorityIcons[alert.tipo]}
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium text-white truncate">{alert.titolo}</p>
                <p className="text-xs text-slate-400 truncate">{alert.descrizione}</p>
              </div>
              <span className={`flex-shrink-0 text-xs px-2 py-0.5 rounded-full ${
                alert.priorita === 'alta' ? 'bg-red-500/30 text-red-300' :
                alert.priorita === 'media' ? 'bg-amber-500/30 text-amber-300' :
                'bg-blue-500/30 text-blue-300'
              }`}>
                {alert.count}
              </span>
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}
