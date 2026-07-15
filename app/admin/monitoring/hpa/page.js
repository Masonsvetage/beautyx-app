'use client'

import { useState, useEffect } from 'react'
import Link from 'next/link'

export default function MonitoringHpaPage() {
  const [data, setData] = useState(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    loadData()
  }, [])

  const loadData = async () => {
    try {
      const res = await fetch('/api/admin/monitoring/hpa')
      const json = await res.json()
      setData(json)
    } catch (error) {
      console.error('Errore caricamento dati HPA:', error)
    } finally {
      setLoading(false)
    }
  }

  const hpas = data?.hpaPerformance || []

  // Calcolo statistiche riassuntive
  const totalHpas = hpas.length
  const totalAppuntamenti = hpas.reduce((sum, h) => sum + (h.appuntamenti_mese || 0), 0)
  const totalCompletati = hpas.reduce((sum, h) => sum + (h.appuntamenti_completati_mese || 0), 0)
  const avgCompletion = totalAppuntamenti > 0
    ? Math.round((totalCompletati / totalAppuntamenti) * 100)
    : 0

  const getCompletionColor = (completati, totale) => {
    if (totale === 0) return 'text-slate-400'
    const ratio = completati / totale
    if (ratio > 0.7) return 'text-emerald-400'
    if (ratio > 0.4) return 'text-amber-400'
    return 'text-red-400'
  }

  const getCompletionBg = (completati, totale) => {
    if (totale === 0) return 'bg-slate-500/20'
    const ratio = completati / totale
    if (ratio > 0.7) return 'bg-emerald-500/20'
    if (ratio > 0.4) return 'bg-amber-500/20'
    return 'bg-red-500/20'
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-800 via-slate-900 to-slate-800 flex items-center justify-center">
        <div className="text-center">
          <div className="w-12 h-12 border-4 border-teal-500 border-t-transparent rounded-full animate-spin mx-auto"></div>
          <p className="mt-4 text-slate-400">Caricamento performance HPA...</p>
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
            <div className="w-10 h-10 bg-gradient-to-br from-teal-600 to-cyan-600 rounded-lg flex items-center justify-center">
              <svg className="w-6 h-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
              </svg>
            </div>
            <div>
              <h1 className="text-2xl font-bold text-white">Performance HPA</h1>
              <p className="text-sm text-slate-400">Analisi dettagliata delle performance dei consulenti</p>
            </div>
          </div>
        </div>

        {/* Summary Cards */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div className="bg-slate-800/80 border border-slate-700/50 rounded-xl p-4">
            <p className="text-slate-400 text-sm">HPA Totali</p>
            <p className="text-3xl font-bold text-teal-400">{totalHpas}</p>
            <p className="text-xs text-slate-500 mt-1">Consulenti attivi nel sistema</p>
          </div>
          <div className="bg-slate-800/80 border border-slate-700/50 rounded-xl p-4">
            <p className="text-slate-400 text-sm">Appuntamenti Mese</p>
            <p className="text-3xl font-bold text-blue-400">{totalAppuntamenti}</p>
            <p className="text-xs text-slate-500 mt-1">Completati: {totalCompletati}</p>
          </div>
          <div className="bg-slate-800/80 border border-slate-700/50 rounded-xl p-4">
            <p className="text-slate-400 text-sm">Tasso Completamento Medio</p>
            <p className={`text-3xl font-bold ${avgCompletion >= 70 ? 'text-emerald-400' : avgCompletion >= 40 ? 'text-amber-400' : 'text-red-400'}`}>
              {avgCompletion}%
            </p>
            <p className="text-xs text-slate-500 mt-1">Media su tutti gli HPA</p>
          </div>
        </div>

        {/* HPA Table */}
        <div className="bg-slate-800/80 border border-slate-700/50 rounded-xl overflow-hidden">
          <div className="p-4 border-b border-slate-700/50">
            <h3 className="text-white font-semibold">Dettaglio Performance HPA</h3>
          </div>
          {hpas.length > 0 ? (
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="border-b border-slate-700/50">
                    <th className="text-left p-4 text-sm font-medium text-slate-400">HPA Nome</th>
                    <th className="text-left p-4 text-sm font-medium text-slate-400">Email</th>
                    <th className="text-center p-4 text-sm font-medium text-slate-400">Centri Gestiti</th>
                    <th className="text-center p-4 text-sm font-medium text-slate-400">Appuntamenti Mese</th>
                    <th className="text-center p-4 text-sm font-medium text-slate-400">Completati</th>
                    <th className="text-center p-4 text-sm font-medium text-slate-400">Messaggi Mese</th>
                    <th className="text-center p-4 text-sm font-medium text-slate-400">Richieste Pending</th>
                    <th className="text-left p-4 text-sm font-medium text-slate-400">Ultimo Accesso</th>
                  </tr>
                </thead>
                <tbody>
                  {hpas.map((hpa) => {
                    const completionRate = hpa.appuntamenti_mese > 0
                      ? (hpa.appuntamenti_completati_mese / hpa.appuntamenti_mese)
                      : 0
                    const completionPct = Math.round(completionRate * 100)

                    return (
                      <tr key={hpa.hpa_id} className="border-b border-slate-700/30 hover:bg-slate-700/20">
                        <td className="p-4">
                          <div className="flex items-center gap-3">
                            <div className="w-8 h-8 bg-teal-500/20 rounded-full flex items-center justify-center flex-shrink-0">
                              <span className="text-teal-400 text-sm font-medium">
                                {(hpa.hpa_nome || hpa.hpa_email)?.[0]?.toUpperCase()}
                              </span>
                            </div>
                            <span className="text-white font-medium">{hpa.hpa_nome || '-'}</span>
                          </div>
                        </td>
                        <td className="p-4 text-slate-300 text-sm">{hpa.hpa_email}</td>
                        <td className="p-4 text-center">
                          <span className="text-cyan-400 font-medium">{hpa.centri_gestiti || 0}</span>
                        </td>
                        <td className="p-4 text-center text-slate-300">{hpa.appuntamenti_mese || 0}</td>
                        <td className="p-4 text-center">
                          <span className={`inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-sm font-medium ${getCompletionBg(hpa.appuntamenti_completati_mese, hpa.appuntamenti_mese)} ${getCompletionColor(hpa.appuntamenti_completati_mese, hpa.appuntamenti_mese)}`}>
                            {hpa.appuntamenti_completati_mese || 0}
                            <span className="text-xs opacity-70">({completionPct}%)</span>
                          </span>
                        </td>
                        <td className="p-4 text-center text-slate-300">{hpa.messaggi_mese || 0}</td>
                        <td className="p-4 text-center">
                          {(hpa.richieste_pending || 0) > 0 ? (
                            <span className="px-2 py-0.5 bg-amber-500/20 text-amber-400 rounded-full text-sm font-medium">
                              {hpa.richieste_pending}
                            </span>
                          ) : (
                            <span className="text-slate-500 text-sm">0</span>
                          )}
                        </td>
                        <td className="p-4 text-slate-400 text-sm">
                          {hpa.ultimo_accesso
                            ? new Date(hpa.ultimo_accesso).toLocaleDateString('it-IT', {
                                day: '2-digit',
                                month: '2-digit',
                                year: 'numeric',
                                hour: '2-digit',
                                minute: '2-digit'
                              })
                            : 'Mai'
                          }
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
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
              </svg>
              <h3 className="text-lg font-medium text-white mb-2">Nessun dato HPA</h3>
              <p className="text-slate-400">Non ci sono consulenti HPA configurati nel sistema</p>
            </div>
          )}
        </div>

      </div>
    </div>
  )
}
