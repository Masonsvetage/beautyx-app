'use client'
/**
 * KpiMedieWidget — Incasso medio mobile su 4 periodi.
 * Si aggiorna quando cambia refreshKey.
 */
import { useState, useEffect } from 'react'

const fmt = v =>
  `€${parseFloat(v || 0).toLocaleString('it-IT', { minimumFractionDigits: 0, maximumFractionDigits: 0 })}`

const LABELS = {
  '30gg':  '30 giorni',
  '90gg':  '3 mesi',
  '180gg': '6 mesi',
  '365gg': '12 mesi',
}

export default function KpiMedieWidget({ refreshKey, vertical = false }) {
  const [medie, setMedie]   = useState([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    setLoading(true)
    fetch('/api/registro/medie')
      .then(r => r.json())
      .then(d => { if (d.medie) setMedie(d.medie) })
      .catch(() => {})
      .finally(() => setLoading(false))
  }, [refreshKey])

  const gridClass = vertical ? 'grid grid-cols-1 gap-2' : 'grid grid-cols-2 md:grid-cols-4 gap-3'

  if (loading) {
    return (
      <div className={gridClass}>
        {[...Array(4)].map((_, i) => (
          <div key={i} className="bg-slate-800/40 rounded-xl border border-slate-700/50 p-4 animate-pulse">
            <div className="h-3 w-16 bg-slate-700 rounded mb-2" />
            <div className="h-6 w-24 bg-slate-700 rounded" />
          </div>
        ))}
      </div>
    )
  }

  if (!medie.length) return null

  return (
    <div className={gridClass}>
      {medie.map((m) => (
        <div
          key={m.periodo}
          className="bg-slate-800/40 rounded-xl border border-slate-700/50 p-4 flex flex-col gap-1"
        >
          <p className="text-xs text-slate-500">Ø {LABELS[m.periodo] || m.periodo}</p>
          <p className="text-xl font-bold text-white">{fmt(m.media_gg)}<span className="text-sm text-slate-500 font-normal">/gg</span></p>
          <p className="text-[11px] text-slate-600">
            {m.n_giorni_con_dati} giorni · {fmt(m.totale)} tot
          </p>
        </div>
      ))}
    </div>
  )
}
