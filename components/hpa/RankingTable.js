'use client'

import { useState, useEffect } from 'react'

export default function RankingTable({ onSelectCentro }) {
  const [ranking, setRanking] = useState([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    loadRanking()
  }, [])

  const loadRanking = async () => {
    try {
      const res = await fetch('/api/scores/ranking?limit=10')
      const data = await res.json()
      if (data.ranking) {
        setRanking(data.ranking)
      }
    } catch (error) {
      console.error('Errore caricamento ranking:', error)
    } finally {
      setLoading(false)
    }
  }

  const getLevelBadge = (level) => {
    const colors = {
      1: 'bg-slate-500/20 text-slate-400 border-slate-500/30',
      2: 'bg-slate-500/20 text-slate-400 border-slate-500/30',
      3: 'bg-amber-500/20 text-amber-400 border-amber-500/30',
      4: 'bg-amber-500/20 text-amber-400 border-amber-500/30',
      5: 'bg-blue-500/20 text-blue-400 border-blue-500/30',
      6: 'bg-blue-500/20 text-blue-400 border-blue-500/30',
      7: 'bg-purple-500/20 text-purple-400 border-purple-500/30',
      8: 'bg-purple-500/20 text-purple-400 border-purple-500/30',
      9: 'bg-emerald-500/20 text-emerald-400 border-emerald-500/30',
      10: 'bg-gradient-to-r from-amber-500/30 to-yellow-500/30 text-yellow-300 border-yellow-500/30'
    }
    return colors[level] || colors[1]
  }

  const getMedalIcon = (position) => {
    if (position === 1) return '🥇'
    if (position === 2) return '🥈'
    if (position === 3) return '🥉'
    return null
  }

  if (loading) {
    return (
      <div className="bg-slate-800/50 rounded-xl p-4 border border-slate-700/50">
        <div className="animate-pulse space-y-3">
          <div className="h-5 w-24 bg-slate-700 rounded"></div>
          {[...Array(5)].map((_, i) => (
            <div key={i} className="flex items-center gap-3">
              <div className="w-8 h-8 bg-slate-700 rounded-full"></div>
              <div className="flex-1 h-4 bg-slate-700 rounded"></div>
              <div className="w-12 h-4 bg-slate-700 rounded"></div>
            </div>
          ))}
        </div>
      </div>
    )
  }

  return (
    <div className="bg-slate-800/50 rounded-xl border border-slate-700/50 overflow-hidden">
      {/* Header */}
      <div className="p-4 border-b border-slate-700/50 flex items-center justify-between">
        <h3 className="font-semibold text-white">Classifica Clienti</h3>
        <button
          onClick={loadRanking}
          className="text-xs text-slate-500 hover:text-slate-300"
        >
          Aggiorna
        </button>
      </div>

      {/* Lista */}
      {ranking.length === 0 ? (
        <div className="p-8 text-center text-slate-400">
          Nessun dato disponibile
        </div>
      ) : (
        <div className="divide-y divide-slate-700/30">
          {ranking.map((item, index) => (
            <div
              key={item.centro_id}
              onClick={() => onSelectCentro?.(item)}
              className="p-3 hover:bg-slate-700/20 transition-colors cursor-pointer flex items-center gap-3"
            >
              {/* Posizione */}
              <div className="w-8 text-center">
                {getMedalIcon(index + 1) || (
                  <span className="text-slate-500 text-sm">{index + 1}</span>
                )}
              </div>

              {/* Avatar */}
              <div className={`w-10 h-10 rounded-full flex items-center justify-center text-white font-semibold text-sm ${
                index === 0 ? 'bg-gradient-to-br from-amber-400 to-yellow-500' :
                index === 1 ? 'bg-gradient-to-br from-slate-300 to-slate-400' :
                index === 2 ? 'bg-gradient-to-br from-amber-600 to-orange-700' :
                'bg-gradient-to-br from-purple-500 to-pink-500'
              }`}>
                {item.centro_nome?.slice(0, 2).toUpperCase() || '??'}
              </div>

              {/* Info */}
              <div className="flex-1 min-w-0">
                <p className="font-medium text-white truncate">{item.centro_nome}</p>
                <div className="flex items-center gap-2 text-xs text-slate-400">
                  <span>{item.obiettivi_completati || 0} obiettivi</span>
                  <span>•</span>
                  <span className={item.obiettivi_in_anticipo > item.obiettivi_in_ritardo ? 'text-emerald-400' : 'text-amber-400'}>
                    {item.obiettivi_in_anticipo || 0} anticipi / {item.obiettivi_in_ritardo || 0} ritardi
                  </span>
                </div>
              </div>

              {/* Punteggio e Livello */}
              <div className="text-right">
                <p className="font-bold text-white">{item.punteggio_totale?.toLocaleString() || 0}</p>
                <span className={`inline-block px-2 py-0.5 text-xs rounded-full border ${getLevelBadge(item.livello)}`}>
                  Lv.{item.livello || 1}
                </span>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
