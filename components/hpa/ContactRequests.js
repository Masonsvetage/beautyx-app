'use client'

import { useState, useEffect } from 'react'

export default function ContactRequests({ onOpenChat }) {
  const [requests, setRequests] = useState([])
  const [loading, setLoading] = useState(true)
  const [filter, setFilter] = useState('pending')

  useEffect(() => {
    loadRequests()
  }, [filter])

  const loadRequests = async () => {
    setLoading(true)
    try {
      const res = await fetch(`/api/contact-requests?stato=${filter}`)
      const data = await res.json()
      if (data.requests) {
        setRequests(data.requests)
      }
    } catch (error) {
      console.error('Errore caricamento richieste:', error)
    } finally {
      setLoading(false)
    }
  }

  const updateRequest = async (requestId, stato, risposta = null) => {
    try {
      const res = await fetch('/api/contact-requests', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          request_id: requestId,
          stato,
          risposta
        })
      })

      if (res.ok) {
        loadRequests()
      }
    } catch (error) {
      console.error('Errore aggiornamento richiesta:', error)
    }
  }

  const urgencyColors = {
    urgente: 'bg-red-500/20 text-red-300 border-red-500/30',
    alta: 'bg-orange-500/20 text-orange-300 border-orange-500/30',
    normale: 'bg-blue-500/20 text-blue-300 border-blue-500/30',
    bassa: 'bg-slate-500/20 text-slate-300 border-slate-500/30'
  }

  const urgencyLabels = {
    urgente: 'Urgente',
    alta: 'Alta',
    normale: 'Normale',
    bassa: 'Bassa'
  }

  const formatDate = (dateStr) => {
    const date = new Date(dateStr)
    const now = new Date()
    const diffMs = now - date
    const diffMins = Math.floor(diffMs / 60000)
    const diffHours = Math.floor(diffMs / 3600000)
    const diffDays = Math.floor(diffMs / 86400000)

    if (diffMins < 60) return `${diffMins} min fa`
    if (diffHours < 24) return `${diffHours} ore fa`
    if (diffDays < 7) return `${diffDays} giorni fa`
    return date.toLocaleDateString('it-IT', { day: '2-digit', month: 'short' })
  }

  return (
    <div className="bg-slate-800/50 rounded-xl border border-slate-700/50 overflow-hidden">
      {/* Header */}
      <div className="p-4 border-b border-slate-700/50 flex items-center justify-between">
        <h3 className="font-semibold text-white">Richieste Contatto</h3>
        <select
          value={filter}
          onChange={(e) => setFilter(e.target.value)}
          className="px-3 py-1.5 bg-slate-700/50 border border-slate-600 rounded-lg text-sm text-white focus:outline-none"
        >
          <option value="pending">In attesa</option>
          <option value="in_lavorazione">In lavorazione</option>
          <option value="completato">Completate</option>
          <option value="">Tutte</option>
        </select>
      </div>

      {/* Lista */}
      {loading ? (
        <div className="p-4 space-y-3">
          {[...Array(3)].map((_, i) => (
            <div key={i} className="animate-pulse p-3 bg-slate-700/30 rounded-lg">
              <div className="h-4 w-32 bg-slate-600 rounded mb-2"></div>
              <div className="h-3 w-full bg-slate-600 rounded"></div>
            </div>
          ))}
        </div>
      ) : requests.length === 0 ? (
        <div className="p-8 text-center text-slate-400">
          {filter === 'pending' ? 'Nessuna richiesta in attesa' : 'Nessuna richiesta'}
        </div>
      ) : (
        <div className="divide-y divide-slate-700/30 max-h-[400px] overflow-y-auto">
          {requests.map(req => (
            <div key={req.id} className="p-4">
              <div className="flex items-start gap-3">
                {/* Avatar */}
                <div className="w-10 h-10 bg-gradient-to-br from-purple-500 to-pink-500 rounded-full flex items-center justify-center text-white font-semibold text-sm flex-shrink-0">
                  {req.centro?.nome?.slice(0, 2).toUpperCase() || '??'}
                </div>

                {/* Contenuto */}
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 mb-1">
                    <span className="font-medium text-white">{req.centro?.nome || 'Centro'}</span>
                    <span className={`px-2 py-0.5 text-xs rounded-full border ${urgencyColors[req.urgenza]}`}>
                      {urgencyLabels[req.urgenza]}
                    </span>
                  </div>
                  <p className="text-sm text-slate-300 mb-2">{req.motivo}</p>
                  <p className="text-xs text-slate-500">{formatDate(req.created_at)}</p>

                  {/* Risposta (se presente) */}
                  {req.risposta && (
                    <div className="mt-2 p-2 bg-slate-700/30 rounded-lg">
                      <p className="text-xs text-slate-400 mb-1">Risposta:</p>
                      <p className="text-sm text-slate-300">{req.risposta}</p>
                    </div>
                  )}

                  {/* Azioni */}
                  {req.stato === 'pending' && (
                    <div className="mt-3 flex gap-2">
                      <button
                        onClick={() => updateRequest(req.id, 'in_lavorazione')}
                        className="px-3 py-1.5 bg-amber-500/20 hover:bg-amber-500/30 text-amber-300 text-xs rounded-lg transition-colors"
                      >
                        Prendi in carico
                      </button>
                      <button
                        onClick={() => onOpenChat?.(req.centro)}
                        className="px-3 py-1.5 bg-purple-500/20 hover:bg-purple-500/30 text-purple-300 text-xs rounded-lg transition-colors"
                      >
                        Apri Chat
                      </button>
                    </div>
                  )}

                  {req.stato === 'in_lavorazione' && (
                    <div className="mt-3 flex gap-2">
                      <button
                        onClick={() => {
                          const risposta = prompt('Inserisci la risposta:')
                          if (risposta) {
                            updateRequest(req.id, 'completato', risposta)
                          }
                        }}
                        className="px-3 py-1.5 bg-emerald-500/20 hover:bg-emerald-500/30 text-emerald-300 text-xs rounded-lg transition-colors"
                      >
                        Completa con risposta
                      </button>
                      <button
                        onClick={() => onOpenChat?.(req.centro)}
                        className="px-3 py-1.5 bg-purple-500/20 hover:bg-purple-500/30 text-purple-300 text-xs rounded-lg transition-colors"
                      >
                        Apri Chat
                      </button>
                    </div>
                  )}
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
