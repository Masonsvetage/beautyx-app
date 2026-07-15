'use client'

import { useState, useEffect, useMemo } from 'react'
import { format, differenceInDays } from 'date-fns'
import { it } from 'date-fns/locale'

/**
 * Widget Obiettivi Gamification (Dashboard)
 * Stile gamification per stimolare costanza e competizione con sé stessi
 */
export default function ObjectivesTracker({ centroId }) {
  const [obiettivi, setObiettivi] = useState([])
  const [suggeriti, setSuggeriti] = useState([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    if (centroId) {
      loadObiettivi()
      loadSuggeriti()
    }
  }, [centroId])

  async function loadObiettivi() {
    setLoading(true)
    try {
      const res = await fetch(`/api/obiettivi?centro_id=${centroId}&stato=attivo`)
      const data = await res.json()
      setObiettivi(data.obiettivi || [])
    } catch (error) {
      console.error('Errore caricamento obiettivi:', error)
    }
    setLoading(false)
  }

  async function loadSuggeriti() {
    try {
      const res = await fetch(`/api/obiettivi?centro_id=${centroId}&stato=suggerito`)
      const data = await res.json()
      setSuggeriti(data.obiettivi || [])
    } catch (error) {
      console.error('Errore caricamento suggeriti:', error)
    }
  }

  // Calcola statistiche gamification
  const gameStats = useMemo(() => {
    if (obiettivi.length === 0) return null

    const completati = obiettivi.filter(o => o.percentuale_completamento >= 100).length
    const inCorso = obiettivi.filter(o => o.percentuale_completamento > 0 && o.percentuale_completamento < 100).length
    const totaleProgresso = obiettivi.reduce((sum, o) => sum + (o.percentuale_completamento || 0), 0)
    const progressoMedio = obiettivi.length > 0 ? totaleProgresso / obiettivi.length : 0

    // Calcola "streak" basato su obiettivi consecutivi completati
    const streak = completati

    // Calcola livello basato su obiettivi completati
    const xp = completati * 100 + inCorso * 25
    const level = Math.floor(xp / 200) + 1

    return {
      completati,
      inCorso,
      totale: obiettivi.length,
      progressoMedio,
      streak,
      xp,
      level
    }
  }, [obiettivi])

  function getProgressColor(perc) {
    if (perc >= 100) return 'from-emerald-500 to-green-400'
    if (perc >= 75) return 'from-teal-500 to-cyan-400'
    if (perc >= 50) return 'from-amber-500 to-yellow-400'
    if (perc >= 25) return 'from-orange-500 to-amber-400'
    return 'from-red-500 to-rose-400'
  }

  function getMotivationalMessage() {
    if (!gameStats) return "Inizia la tua sfida!"
    if (gameStats.progressoMedio >= 80) return "🔥 Sei on fire! Continua così!"
    if (gameStats.progressoMedio >= 50) return "💪 Ottimo lavoro, non mollare!"
    if (gameStats.progressoMedio >= 25) return "🚀 Stai crescendo, vai avanti!"
    return "🎯 Ogni giorno conta, inizia ora!"
  }

  if (loading) {
    return (
      <div className="bg-gradient-to-br from-slate-800/50 to-slate-900/50 backdrop-blur-xl rounded-xl p-6 border border-slate-600/40 shadow-2xl">
        <div className="text-center py-8">
          <div className="text-3xl mb-2 animate-pulse">🎮</div>
          <div className="text-slate-400">Caricamento sfide...</div>
        </div>
      </div>
    )
  }

  return (
    <div className="bg-gradient-to-br from-slate-800/90 to-slate-900/70 rounded-xl border border-violet-500/30 overflow-hidden shadow-lg shadow-violet-900/10 h-full flex flex-col">
      {/* Header Gamification - più luminoso */}
      <div className="px-4 py-3 bg-gradient-to-r from-violet-900/50 via-purple-900/40 to-fuchsia-900/30 border-b border-violet-500/30">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <span className="text-2xl">🎯</span>
            <div>
              <h3 className="text-base font-bold text-white">Le Tue Sfide</h3>
              <p className="text-sm text-violet-300">{getMotivationalMessage()}</p>
            </div>
          </div>
          {gameStats && (
            <div className="flex items-center gap-2">
              {/* Level Badge */}
              <div className="flex items-center gap-1.5 px-3 py-1.5 bg-gradient-to-r from-amber-500/30 to-yellow-500/20 rounded-full border border-amber-500/40 shadow-sm">
                <span className="text-amber-400 text-sm font-bold">LV.{gameStats.level}</span>
                <span className="text-yellow-400 text-base">⭐</span>
              </div>
              {/* Streak */}
              {gameStats.streak > 0 && (
                <div className="flex items-center gap-1 px-2.5 py-1.5 bg-gradient-to-r from-orange-500/30 to-red-500/20 rounded-full border border-orange-500/40 shadow-sm">
                  <span className="text-orange-400 text-base">🔥</span>
                  <span className="text-orange-300 text-sm font-bold">{gameStats.streak}</span>
                </div>
              )}
            </div>
          )}
        </div>

        {/* XP Progress Bar */}
        {gameStats && (
          <div className="mt-3">
            <div className="flex justify-between text-xs text-slate-300 mb-1.5">
              <span className="font-medium">XP: {gameStats.xp}</span>
              <span>Prossimo livello: {(gameStats.level) * 200} XP</span>
            </div>
            <div className="h-2 bg-slate-700/60 rounded-full overflow-hidden">
              <div
                className="h-full bg-gradient-to-r from-amber-500 via-yellow-400 to-amber-500 transition-all duration-500"
                style={{ width: `${(gameStats.xp % 200) / 2}%` }}
              />
            </div>
          </div>
        )}
      </div>

      {/* Banner Obiettivi Suggeriti - Da attivare dopo consulenza */}
      {suggeriti.length > 0 && (
        <div
          onClick={() => window.location.href = '/obiettivi'}
          className="mx-3 mt-3 p-3 bg-gradient-to-r from-amber-500/20 via-orange-500/20 to-amber-500/20 border border-amber-500/40 rounded-xl cursor-pointer hover:from-amber-500/30 hover:via-orange-500/30 hover:to-amber-500/30 transition-all shadow-sm"
        >
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-full bg-amber-500/30 flex items-center justify-center">
              <span className="text-xl animate-pulse">💡</span>
            </div>
            <div className="flex-1">
              <div className="text-amber-200 text-sm font-semibold">
                {suggeriti.length} {suggeriti.length === 1 ? 'obiettivo' : 'obiettivi'} in attesa di attivazione
              </div>
              <div className="text-amber-400/70 text-xs">
                Da concordare durante la consulenza con Beautyx
              </div>
            </div>
            <div className="text-amber-400 text-sm font-medium">Vedi →</div>
          </div>
        </div>
      )}

      {/* Lista Obiettivi Gamificati */}
      <div className="p-3 flex-1 overflow-auto">
        {obiettivi.length === 0 ? (
          <div className="text-center py-8 bg-slate-900/30 rounded-xl border border-dashed border-violet-500/30">
            <div className="text-5xl mb-3">🎮</div>
            <div className="text-slate-300 text-base mb-2">Nessuna sfida attiva</div>
            <p className="text-sm text-slate-400 mb-4 max-w-xs mx-auto">
              {suggeriti.length > 0
                ? `Hai ${suggeriti.length} obiettivi suggeriti pronti per essere attivati!`
                : 'Gli obiettivi vengono definiti insieme durante le consulenze con Beautyx'}
            </p>
            <button
              onClick={() => window.location.href = '/obiettivi'}
              className="px-5 py-2.5 bg-gradient-to-r from-violet-600 to-purple-600 hover:from-violet-500 hover:to-purple-500 text-white rounded-lg text-sm font-medium transition-all shadow-lg shadow-violet-900/30"
            >
              {suggeriti.length > 0 ? '💡 Vedi Suggeriti' : '🚀 Vai agli Obiettivi'}
            </button>
          </div>
        ) : (
          <div className="space-y-2">
            {obiettivi.slice(0, 4).map(ob => {
              const progresso = ob.percentuale_completamento || 0
              const isCompleted = progresso >= 100

              return (
                <div
                  key={ob.id}
                  onClick={() => window.location.href = '/obiettivi'}
                  className={`relative p-3 rounded-lg border cursor-pointer transition-all hover:scale-[1.01] ${
                    isCompleted
                      ? 'bg-emerald-500/10 border-emerald-500/40'
                      : 'bg-slate-900/50 border-slate-700/50 hover:border-violet-500/40'
                  }`}
                >
                  {/* Completed Badge */}
                  {isCompleted && (
                    <div className="absolute -top-1 -right-1 w-6 h-6 bg-gradient-to-br from-emerald-500 to-green-400 rounded-full flex items-center justify-center shadow-lg">
                      <span className="text-white text-xs">✓</span>
                    </div>
                  )}

                  <div className="flex items-center gap-3">
                    {/* Icon */}
                    <div className={`w-10 h-10 rounded-lg flex items-center justify-center ${
                      isCompleted
                        ? 'bg-gradient-to-br from-emerald-500/20 to-green-500/20'
                        : 'bg-gradient-to-br from-violet-500/20 to-purple-500/20'
                    }`}>
                      <span className="text-xl">{ob.icona || '🎯'}</span>
                    </div>

                    {/* Content */}
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2">
                        <span className="text-sm font-semibold text-white truncate">{ob.nome}</span>
                        {isCompleted && <span className="text-emerald-400 text-xs">+100 XP</span>}
                      </div>

                      {/* Progress Bar */}
                      <div className="mt-1.5">
                        <div className="flex justify-between text-xs mb-1">
                          <span className="text-slate-400">
                            {ob.valore_attuale || ob.valore_riferimento} / {ob.valore_obiettivo}{ob.unita_misura === 'euro' && '€'}
                          </span>
                          <span className={`font-bold ${isCompleted ? 'text-emerald-400' : 'text-violet-400'}`}>
                            {progresso.toFixed(0)}%
                          </span>
                        </div>
                        <div className="h-2 bg-slate-700 rounded-full overflow-hidden">
                          <div
                            className={`h-full bg-gradient-to-r ${getProgressColor(progresso)} transition-all duration-500`}
                            style={{ width: `${Math.min(progresso, 100)}%` }}
                          />
                        </div>
                      </div>
                    </div>

                    {/* Countdown/Status */}
                    {ob.data_target && !isCompleted && (
                      <div className={`text-center px-2 py-1 rounded-lg ${
                        ob.giorni_rimanenti < 0 ? 'bg-red-500/20' :
                        ob.giorni_rimanenti <= 7 ? 'bg-amber-500/20' : 'bg-slate-700/50'
                      }`}>
                        <div className={`text-lg font-bold ${
                          ob.giorni_rimanenti < 0 ? 'text-red-400' :
                          ob.giorni_rimanenti <= 7 ? 'text-amber-400' : 'text-slate-300'
                        }`}>
                          {ob.giorni_rimanenti < 0 ? `+${Math.abs(ob.giorni_rimanenti)}` : ob.giorni_rimanenti}
                        </div>
                        <div className="text-[10px] text-slate-400">
                          {ob.giorni_rimanenti < 0 ? 'ritardo' : 'giorni'}
                        </div>
                      </div>
                    )}
                  </div>
                </div>
              )
            })}

            {obiettivi.length > 4 && (
              <button
                onClick={() => window.location.href = '/obiettivi'}
                className="w-full py-2 bg-violet-500/10 hover:bg-violet-500/20 border border-violet-500/30 rounded-lg text-violet-400 text-sm font-medium transition-all"
              >
                Vedi tutte le {obiettivi.length} sfide →
              </button>
            )}
          </div>
        )}
      </div>

      {/* Footer Stats */}
      {gameStats && obiettivi.length > 0 && (
        <div className="border-t border-violet-500/20 px-4 py-3 bg-gradient-to-r from-violet-900/20 to-transparent mt-auto">
          <div className="flex justify-between text-sm">
            <div className="flex gap-4">
              <span className="text-slate-300">
                <span className="text-emerald-400 font-bold">{gameStats.completati}</span> completate
              </span>
              <span className="text-slate-300">
                <span className="text-violet-400 font-bold">{gameStats.inCorso}</span> in corso
              </span>
            </div>
            <span className="text-slate-300">
              Progresso: <span className="text-white font-bold">{gameStats.progressoMedio.toFixed(0)}%</span>
            </span>
          </div>
        </div>
      )}
    </div>
  )
}
