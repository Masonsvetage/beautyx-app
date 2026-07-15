'use client'

import { useState, useEffect } from 'react'

export default function MinuteBalance({ centroId }) {
  const [balance, setBalance] = useState(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    loadBalance()
  }, [centroId])

  const loadBalance = async () => {
    try {
      const res = await fetch('/api/subscriptions/balance')
      const data = await res.json()
      setBalance(data)
    } catch (error) {
      console.error('Errore caricamento saldo:', error)
    } finally {
      setLoading(false)
    }
  }

  if (loading) {
    return (
      <div className="bg-slate-800/50 rounded-xl p-4 border border-slate-700/50 animate-pulse">
        <div className="h-4 w-24 bg-slate-700 rounded mb-3"></div>
        <div className="h-8 w-32 bg-slate-700 rounded"></div>
      </div>
    )
  }

  if (!balance?.hasSubscription) {
    return (
      <div className="bg-slate-800/50 rounded-xl p-4 border border-slate-700/50">
        <h4 className="text-sm font-medium text-slate-400 mb-2">Saldo Minuti</h4>
        <p className="text-slate-500 text-sm">Nessun abbonamento attivo</p>
        <a
          href="/impostazioni/abbonamento"
          className="inline-block mt-3 px-4 py-2 bg-purple-500 hover:bg-purple-600 text-white text-sm rounded-lg transition-colors"
        >
          Acquista pacchetto
        </a>
      </div>
    )
  }

  const percentUsed = balance.minuti_totali > 0
    ? (balance.minuti_usati / balance.minuti_totali) * 100
    : 0

  const getBarColor = () => {
    if (percentUsed >= 90) return 'bg-red-500'
    if (percentUsed >= 70) return 'bg-amber-500'
    return 'bg-emerald-500'
  }

  return (
    <div className="bg-slate-800/50 rounded-xl p-4 border border-slate-700/50">
      <div className="flex items-center justify-between mb-3">
        <h4 className="text-sm font-medium text-slate-400">Saldo Minuti</h4>
        {balance.package_nome && (
          <span className="text-xs text-purple-400">{balance.package_nome}</span>
        )}
      </div>

      <div className="flex items-baseline gap-1 mb-3">
        <span className="text-3xl font-bold text-white">{balance.minuti_rimanenti}</span>
        <span className="text-slate-400 text-sm">/ {balance.minuti_totali} minuti</span>
      </div>

      {/* Progress bar */}
      <div className="h-2 bg-slate-700 rounded-full overflow-hidden mb-3">
        <div
          className={`h-full ${getBarColor()} transition-all`}
          style={{ width: `${100 - percentUsed}%` }}
        ></div>
      </div>

      {/* Info */}
      <div className="flex items-center justify-between text-xs">
        <span className="text-slate-400">
          Usati: {balance.minuti_usati} min
        </span>
        {balance.data_scadenza && (
          <span className="text-slate-500">
            Scade: {new Date(balance.data_scadenza).toLocaleDateString('it-IT')}
          </span>
        )}
      </div>

      {balance.minuti_rimanenti < 30 && (
        <a
          href="/impostazioni/abbonamento"
          className="inline-block mt-3 w-full text-center px-4 py-2 bg-amber-500/20 hover:bg-amber-500/30 text-amber-300 text-sm rounded-lg transition-colors"
        >
          Ricarica minuti
        </a>
      )}
    </div>
  )
}
