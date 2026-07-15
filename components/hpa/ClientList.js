'use client'

import { useState, useEffect } from 'react'

export default function ClientList({ onSelectClient }) {
  const [clients, setClients] = useState([])
  const [loading, setLoading] = useState(true)
  const [orderBy, setOrderBy] = useState('last_activity')
  const [orderDir, setOrderDir] = useState('desc')
  const [searchTerm, setSearchTerm] = useState('')

  useEffect(() => {
    loadClients()
  }, [orderBy, orderDir])

  const loadClients = async () => {
    setLoading(true)
    try {
      const res = await fetch(`/api/hpa/dashboard/clients?order_by=${orderBy}&order_dir=${orderDir}`)
      const data = await res.json()
      if (data.clients) {
        setClients(data.clients)
      }
    } catch (error) {
      console.error('Errore caricamento clienti:', error)
    } finally {
      setLoading(false)
    }
  }

  const filteredClients = clients.filter(c =>
    c.nome?.toLowerCase().includes(searchTerm.toLowerCase()) ||
    c.citta?.toLowerCase().includes(searchTerm.toLowerCase())
  )

  const formatDate = (dateStr) => {
    if (!dateStr) return 'Mai'
    const date = new Date(dateStr)
    const now = new Date()
    const diffDays = Math.floor((now - date) / (1000 * 60 * 60 * 24))

    if (diffDays === 0) return 'Oggi'
    if (diffDays === 1) return 'Ieri'
    if (diffDays < 7) return `${diffDays} giorni fa`
    return date.toLocaleDateString('it-IT', { day: '2-digit', month: 'short' })
  }

  const getLevelColor = (level) => {
    if (level >= 8) return 'text-emerald-400 bg-emerald-500/20'
    if (level >= 5) return 'text-blue-400 bg-blue-500/20'
    if (level >= 3) return 'text-amber-400 bg-amber-500/20'
    return 'text-slate-400 bg-slate-500/20'
  }

  const sortOptions = [
    { value: 'last_activity', label: 'Ultima attività' },
    { value: 'last_contact', label: 'Ultimo contatto' },
    { value: 'score', label: 'Punteggio' },
    { value: 'name', label: 'Nome' }
  ]

  return (
    <div className="bg-slate-800/50 rounded-xl border border-slate-700/50 overflow-hidden">
      {/* Header */}
      <div className="p-4 border-b border-slate-700/50">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <h3 className="text-lg font-semibold text-white">Clienti ({clients.length})</h3>
          <div className="flex items-center gap-2">
            <input
              type="text"
              placeholder="Cerca..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="px-3 py-1.5 bg-slate-700/50 border border-slate-600 rounded-lg text-sm text-white placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-purple-500/50"
            />
            <select
              value={orderBy}
              onChange={(e) => setOrderBy(e.target.value)}
              className="px-3 py-1.5 bg-slate-700/50 border border-slate-600 rounded-lg text-sm text-white focus:outline-none focus:ring-2 focus:ring-purple-500/50"
            >
              {sortOptions.map(opt => (
                <option key={opt.value} value={opt.value}>{opt.label}</option>
              ))}
            </select>
            <button
              onClick={() => setOrderDir(d => d === 'asc' ? 'desc' : 'asc')}
              className="p-1.5 bg-slate-700/50 border border-slate-600 rounded-lg text-slate-400 hover:text-white"
            >
              {orderDir === 'desc' ? (
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                </svg>
              ) : (
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 15l7-7 7 7" />
                </svg>
              )}
            </button>
          </div>
        </div>
      </div>

      {/* Lista */}
      {loading ? (
        <div className="p-4 space-y-3">
          {[...Array(5)].map((_, i) => (
            <div key={i} className="animate-pulse flex items-center gap-4 p-3 bg-slate-700/30 rounded-lg">
              <div className="w-10 h-10 bg-slate-600 rounded-full"></div>
              <div className="flex-1">
                <div className="h-4 w-32 bg-slate-600 rounded mb-2"></div>
                <div className="h-3 w-24 bg-slate-600 rounded"></div>
              </div>
            </div>
          ))}
        </div>
      ) : filteredClients.length === 0 ? (
        <div className="p-8 text-center text-slate-400">
          {searchTerm ? 'Nessun cliente trovato' : 'Nessun cliente'}
        </div>
      ) : (
        <div className="divide-y divide-slate-700/30 max-h-[500px] overflow-y-auto">
          {filteredClients.map(client => (
            <div
              key={client.id}
              onClick={() => onSelectClient?.(client)}
              className="p-4 hover:bg-slate-700/30 transition-colors cursor-pointer"
            >
              <div className="flex items-center gap-4">
                {/* Avatar/Iniziali */}
                <div className="w-10 h-10 bg-gradient-to-br from-purple-500 to-pink-500 rounded-full flex items-center justify-center text-white font-semibold text-sm">
                  {client.nome?.slice(0, 2).toUpperCase() || '??'}
                </div>

                {/* Info principale */}
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <p className="font-medium text-white truncate">{client.nome}</p>
                    {client.messaggi_non_letti > 0 && (
                      <span className="px-1.5 py-0.5 bg-red-500 text-white text-xs rounded-full">
                        {client.messaggi_non_letti}
                      </span>
                    )}
                  </div>
                  <p className="text-sm text-slate-400 truncate">{client.citta || 'N/D'}</p>
                </div>

                {/* Metriche */}
                <div className="hidden md:flex items-center gap-4 text-sm">
                  <div className="text-center">
                    <p className="text-slate-400 text-xs">Obiettivi</p>
                    <p className="text-white font-medium">{client.obiettivi_attivi}</p>
                  </div>
                  <div className="text-center">
                    <p className="text-slate-400 text-xs">Ultimo contatto</p>
                    <p className="text-white font-medium">{formatDate(client.ultimo_contatto)}</p>
                  </div>
                  {client.score && (
                    <div className={`px-2 py-1 rounded-lg text-xs font-medium ${getLevelColor(client.score.livello)}`}>
                      Lv.{client.score.livello}
                    </div>
                  )}
                </div>

                {/* Indicatore attività */}
                <div className="flex-shrink-0">
                  {(() => {
                    const lastActivity = client.ultima_attivita_utente
                    if (!lastActivity) return <span className="w-2 h-2 bg-slate-500 rounded-full"></span>
                    const days = Math.floor((Date.now() - new Date(lastActivity)) / (1000 * 60 * 60 * 24))
                    if (days <= 1) return <span className="w-2 h-2 bg-emerald-500 rounded-full animate-pulse"></span>
                    if (days <= 7) return <span className="w-2 h-2 bg-amber-500 rounded-full"></span>
                    return <span className="w-2 h-2 bg-red-500 rounded-full"></span>
                  })()}
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
