'use client'

import { useState, useEffect } from 'react'
import Link from 'next/link'

function fmt(v) {
  return `€${parseFloat(v || 0).toLocaleString('it-IT', { minimumFractionDigits: 0, maximumFractionDigits: 0 })}`
}

function QuickContributeModal({ acc, onClose, onSaved }) {
  const [importo, setImporto] = useState('')
  const [saving, setSaving] = useState(false)

  const handleSubmit = async (e) => {
    e.preventDefault()
    if (!importo || parseFloat(importo) <= 0) return
    setSaving(true)
    try {
      const res = await fetch('/api/accantonamenti/movements', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          accantonamento_id: acc.id,
          tipo: 'versamento',
          importo: parseFloat(importo),
          descrizione: 'Versamento rapido',
          data: new Date().toISOString().split('T')[0],
        }),
      })
      const data = await res.json()
      if (data.error) throw new Error(data.error)
      onSaved()
    } catch (e) {
      console.error(e)
    } finally {
      setSaving(false)
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={onClose} />
      <div className="relative bg-slate-800 border border-slate-700 rounded-2xl shadow-2xl w-full max-w-xs p-5">
        <div className="flex items-center gap-2 mb-4">
          <span className="text-xl">{acc.icona || '💰'}</span>
          <div>
            <p className="text-white font-semibold text-sm">{acc.nome}</p>
            <p className="text-slate-400 text-xs">Saldo: {fmt(acc.saldo_attuale)}</p>
          </div>
        </div>

        <form onSubmit={handleSubmit} className="space-y-3">
          <div>
            <label className="text-xs text-slate-400 mb-1 block">Importo da versare (€)</label>
            <input
              type="number" step="0.01" min="0.01"
              value={importo}
              onChange={e => setImporto(e.target.value)}
              placeholder="0.00"
              autoFocus
              className="w-full px-3 py-2 bg-slate-900/60 border border-slate-600/50 rounded-lg text-white text-lg font-bold text-center focus:outline-none focus:border-teal-500/50"
            />
          </div>
          <div className="flex gap-1.5">
            {[10, 25, 50, 100].map(v => (
              <button key={v} type="button" onClick={() => setImporto(String(v))}
                className="flex-1 py-1.5 text-xs rounded-lg bg-slate-700/60 hover:bg-slate-700 text-slate-300 transition-colors">
                +{v}€
              </button>
            ))}
          </div>
          <div className="flex gap-2 pt-1">
            <button type="button" onClick={onClose}
              className="flex-1 py-2 rounded-lg text-slate-400 hover:text-white text-sm transition-colors">
              Annulla
            </button>
            <button type="submit" disabled={!importo || parseFloat(importo) <= 0 || saving}
              className="flex-1 py-2 rounded-lg bg-teal-500 hover:bg-teal-400 text-white text-sm font-medium transition-colors disabled:opacity-40">
              {saving ? 'Salvo…' : 'Versa'}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}

export default function AccantonamentiQuickView({ centroId }) {
  const [lista, setLista] = useState([])
  const [loading, setLoading] = useState(true)
  const [modal, setModal] = useState(null)

  const load = () => {
    if (!centroId) return
    fetch(`/api/accantonamenti?centro_id=${centroId}&attivo=true`)
      .then(r => r.json())
      .then(d => setLista(d.accantonamenti || []))
      .catch(() => {})
      .finally(() => setLoading(false))
  }

  useEffect(() => { load() }, [centroId])

  if (loading) return (
    <div className="bg-slate-800/50 backdrop-blur-xl rounded border border-slate-600/40 p-4 animate-pulse h-32" />
  )

  return (
    <div className="bg-slate-800/50 backdrop-blur-xl rounded border border-slate-600/40 p-4" style={{
      boxShadow: '0 10px 30px -5px rgba(0,0,0,0.5), 0 0 0 1px rgba(148,163,184,0.1)'
    }}>
      <div className="flex items-center justify-between mb-3">
        <div className="flex items-center gap-2">
          <span className="text-base">🏦</span>
          <h3 className="text-sm font-bold text-slate-100">Accantonamenti</h3>
        </div>
        <Link href="/pianificazione" className="text-[10px] text-teal-400 hover:text-teal-300 transition-colors">
          Gestisci →
        </Link>
      </div>

      {lista.length === 0 ? (
        <div className="text-center py-3">
          <p className="text-slate-400 text-xs mb-2">Nessun accantonamento attivo.</p>
          <Link href="/pianificazione" className="text-xs text-teal-400 hover:text-teal-300 underline">
            Crea il primo →
          </Link>
        </div>
      ) : (
        <div className="space-y-2">
          {lista.slice(0, 3).map(acc => {
            const saldo = parseFloat(acc.saldo_attuale || 0)
            const obiettivo = parseFloat(acc.importo_obiettivo || 0)
            const pct = obiettivo > 0 ? Math.min((saldo / obiettivo) * 100, 100) : 0

            return (
              <div key={acc.id} className="bg-slate-900/40 rounded p-2">
                <div className="flex items-center justify-between mb-1">
                  <div className="flex items-center gap-1.5">
                    <span className="text-sm">{acc.icona || '💰'}</span>
                    <span className="text-xs text-slate-300 font-medium truncate max-w-[90px]">{acc.nome}</span>
                  </div>
                  <div className="flex items-center gap-1.5">
                    <span className="text-xs font-bold text-white">{fmt(saldo)}</span>
                    <button onClick={() => setModal(acc)}
                      className="px-1.5 py-0.5 text-[10px] rounded bg-purple-500/20 hover:bg-purple-500/30 text-purple-300 transition-colors">
                      + Versa
                    </button>
                  </div>
                </div>
                {obiettivo > 0 && (
                  <div className="w-full h-1 bg-slate-700 rounded-full overflow-hidden">
                    <div className="h-full rounded-full transition-all"
                      style={{ width: `${pct}%`, backgroundColor: pct >= 100 ? '#10b981' : (acc.colore || '#8b5cf6') }} />
                  </div>
                )}
              </div>
            )
          })}
          {lista.length > 3 && (
            <p className="text-[10px] text-slate-500 text-center">+{lista.length - 3} altri</p>
          )}
        </div>
      )}

      {modal && (
        <QuickContributeModal
          acc={modal}
          onClose={() => setModal(null)}
          onSaved={() => { setModal(null); load() }}
        />
      )}
    </div>
  )
}
