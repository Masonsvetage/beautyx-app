'use client'
/**
 * GamificationWidget — placeholder motivazionale.
 * In futuro: streak, badge, ranking, sfide attive.
 */
import Link from 'next/link'
import { useState, useEffect } from 'react'
import { useAuth } from '@/contexts/AuthContext'

export default function GamificationWidget() {
  const { currentCentro, profile } = useAuth()
  const centroId = currentCentro?.centro_id || profile?.centro_id
  const [obiettivi, setObiettivi] = useState([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    if (!centroId) { setLoading(false); return }
    fetch(`/api/obiettivi?centro_id=${centroId}&stato=attivo&limit=3`)
      .then(r => r.json())
      .then(d => setObiettivi(d.obiettivi || []))
      .catch(() => {})
      .finally(() => setLoading(false))
  }, [centroId])

  return (
    <div className="h-full bg-slate-800/50 backdrop-blur-xl rounded-2xl border border-slate-600/40 p-4 flex flex-col" style={{
      boxShadow: '0 10px 30px -5px rgba(0,0,0,0.5), 0 0 0 1px rgba(148,163,184,0.1)'
    }}>
      {/* Header */}
      <div className="flex items-center justify-between mb-3">
        <div className="flex items-center gap-2">
          <span className="text-base">🏆</span>
          <h3 className="text-sm font-bold text-slate-100">Sfide & Obiettivi</h3>
        </div>
        <Link href="/obiettivi" className="text-[10px] text-teal-400 hover:text-teal-300 transition-colors">
          Tutti →
        </Link>
      </div>

      {loading ? (
        <div className="flex-1 space-y-2">
          {[...Array(3)].map((_, i) => (
            <div key={i} className="bg-slate-900/40 rounded p-2 animate-pulse h-10" />
          ))}
        </div>
      ) : obiettivi.length === 0 ? (
        /* Stato vuoto motivazionale */
        <div className="flex-1 flex flex-col items-center justify-center text-center gap-3 py-4">
          <div className="w-14 h-14 rounded-2xl bg-gradient-to-br from-amber-500/20 to-orange-500/20 border border-amber-500/20 flex items-center justify-center text-2xl">
            🎯
          </div>
          <div>
            <p className="text-slate-300 text-xs font-medium mb-1">Nessun obiettivo attivo</p>
            <p className="text-slate-500 text-[11px]">Imposta un obiettivo e inizia a tracciare i progressi</p>
          </div>
          <Link href="/obiettivi"
            className="px-3 py-1.5 bg-amber-500/15 hover:bg-amber-500/25 border border-amber-500/25 text-amber-300 text-xs rounded-lg transition-colors font-medium">
            + Crea obiettivo
          </Link>
        </div>
      ) : (
        /* Lista obiettivi attivi */
        <div className="flex-1 space-y-2 overflow-hidden">
          {obiettivi.map(ob => {
            const pct = ob.valore_obiettivo > 0
              ? Math.min(Math.round((ob.valore_riferimento / ob.valore_obiettivo) * 100), 100)
              : 0
            return (
              <div key={ob.id} className="bg-slate-900/40 rounded p-2.5">
                <div className="flex items-start justify-between gap-2 mb-1.5">
                  <p className="text-xs text-slate-200 font-medium leading-tight line-clamp-1">{ob.nome}</p>
                  <span className="text-[10px] text-amber-300 font-bold flex-shrink-0">{pct}%</span>
                </div>
                <div className="w-full h-1.5 bg-slate-700 rounded-full overflow-hidden">
                  <div className="h-full rounded-full bg-gradient-to-r from-amber-400 to-orange-400 transition-all"
                    style={{ width: `${pct}%` }} />
                </div>
              </div>
            )
          })}

          {/* Indicatori gamification in arrivo */}
          <div className="pt-1 border-t border-slate-700/40">
            <div className="flex items-center gap-2 opacity-40">
              <span className="text-base">🔥</span>
              <div className="flex-1 h-1.5 bg-slate-700 rounded-full" />
              <span className="text-[10px] text-slate-500">Streak</span>
            </div>
          </div>
        </div>
      )}

      {/* Footer badge */}
      <div className="mt-3 pt-2 border-t border-slate-700/40 flex items-center gap-2">
        <div className="flex gap-1">
          {['🥇','🥈','🥉'].map((b, i) => (
            <div key={i} className="w-6 h-6 rounded-full bg-slate-700/60 flex items-center justify-center text-xs opacity-30">
              {b}
            </div>
          ))}
        </div>
        <span className="text-[10px] text-slate-600 flex-1">Badge e ranking in arrivo</span>
        <Link href="/strategie" className="text-[10px] text-teal-500 hover:text-teal-400">Strategie</Link>
      </div>
    </div>
  )
}
