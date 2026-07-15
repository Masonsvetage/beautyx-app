'use client'

import { useState, useEffect } from 'react'
import Link from 'next/link'
import StarRating, { StarBadge } from '@/components/common/StarRating'

export default function ValutazioniPage() {
  const [beautyx, setBeautyx] = useState(null)
  const [hpa, setHpa] = useState(null)
  const [loading, setLoading] = useState(true)
  const [tab, setTab] = useState('beautyx')

  useEffect(() => {
    loadData()
  }, [])

  const loadData = async () => {
    setLoading(true)
    try {
      const [bRes, hRes] = await Promise.all([
        fetch('/api/admin/ratings?type=beautyx'),
        fetch('/api/admin/ratings?type=hpa')
      ])
      const [bData, hData] = await Promise.all([bRes.json(), hRes.json()])
      setBeautyx(bData)
      setHpa(hData)
    } catch (e) {
      console.error(e)
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900 p-4 md:p-6">
      <div className="max-w-5xl mx-auto space-y-6">

        {/* Header */}
        <div className="bg-slate-950/60 backdrop-blur-md rounded-xl border border-slate-700/50 p-4">
          <div className="flex items-center gap-3">
            <Link href="/admin/monitoring" className="text-slate-400 hover:text-white transition-colors">
              <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
              </svg>
            </Link>
            <div className="w-10 h-10 bg-gradient-to-br from-amber-500 to-orange-500 rounded-lg flex items-center justify-center">
              <svg className="w-6 h-6 text-white" fill="currentColor" viewBox="0 0 24 24">
                <path d="M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z" />
              </svg>
            </div>
            <div>
              <h1 className="text-2xl font-bold text-white">Valutazioni & Feedback</h1>
              <p className="text-sm text-slate-400">Rating degli utenti su Beautyx AI e consulenti HPA</p>
            </div>
          </div>
        </div>

        {loading ? (
          <div className="flex items-center justify-center py-20">
            <div className="w-10 h-10 border-4 border-amber-500 border-t-transparent rounded-full animate-spin" />
          </div>
        ) : (
          <>
            {/* Summary Cards */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <button
                onClick={() => setTab('beautyx')}
                className={`text-left rounded-xl p-5 border transition-all ${
                  tab === 'beautyx'
                    ? 'bg-gradient-to-br from-teal-600/20 to-emerald-600/10 border-teal-500/50'
                    : 'bg-slate-800/50 border-slate-700/50 hover:border-slate-600'
                }`}
              >
                <div className="flex items-center gap-3 mb-3">
                  <div className="w-10 h-10 bg-gradient-to-br from-teal-500/20 to-emerald-500/20 rounded-full flex items-center justify-center border border-teal-500/30">
                    <img src="/beautyx-avatar.svg" alt="Beautyx" className="w-7 h-7 object-cover rounded-full" />
                  </div>
                  <div>
                    <p className="text-white font-semibold">Beautyx AI</p>
                    <p className="text-xs text-slate-400">{beautyx?.total || 0} valutazioni totali</p>
                  </div>
                </div>
                <StarBadge avg={beautyx?.avg} count={beautyx?.total} size="md" />
                {beautyx?.avg_30d && (
                  <p className="text-xs text-slate-400 mt-2">Ultimi 30gg: <span className="text-amber-400">{beautyx.avg_30d}/5</span></p>
                )}
              </button>

              <button
                onClick={() => setTab('hpa')}
                className={`text-left rounded-xl p-5 border transition-all ${
                  tab === 'hpa'
                    ? 'bg-gradient-to-br from-purple-600/20 to-indigo-600/10 border-purple-500/50'
                    : 'bg-slate-800/50 border-slate-700/50 hover:border-slate-600'
                }`}
              >
                <div className="flex items-center gap-3 mb-3">
                  <div className="w-10 h-10 bg-gradient-to-br from-purple-500 to-indigo-600 rounded-full flex items-center justify-center">
                    <svg className="w-5 h-5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0z" />
                    </svg>
                  </div>
                  <div>
                    <p className="text-white font-semibold">Consulenti HPA</p>
                    <p className="text-xs text-slate-400">{hpa?.total || 0} valutazioni totali · {hpa?.hpa_stats?.length || 0} HPA</p>
                  </div>
                </div>
                {hpa?.hpa_stats?.length > 0 ? (
                  <StarBadge
                    avg={hpa.hpa_stats.reduce((s, h) => s + h.avg, 0) / hpa.hpa_stats.length}
                    count={hpa.total}
                    size="md"
                  />
                ) : (
                  <span className="text-slate-500 text-xs">Nessuna valutazione</span>
                )}
              </button>
            </div>

            {/* Detail: Beautyx */}
            {tab === 'beautyx' && beautyx && (
              <div className="space-y-4">
                {/* Distribuzione */}
                <div className="bg-slate-800/50 rounded-xl p-5 border border-slate-700/50">
                  <h3 className="text-white font-semibold mb-4">Distribuzione Voti</h3>
                  {beautyx.total === 0 ? (
                    <p className="text-slate-400 text-sm">Nessuna valutazione ancora</p>
                  ) : (
                    <div className="space-y-2.5">
                      {beautyx.distribution.map(({ star, count, pct }) => (
                        <div key={star} className="flex items-center gap-3">
                          <div className="flex items-center gap-1 w-24 flex-shrink-0">
                            <StarRating value={star} size="sm" readonly />
                          </div>
                          <div className="flex-1 h-2.5 bg-slate-700 rounded-full overflow-hidden">
                            <div
                              className="h-full bg-gradient-to-r from-amber-500 to-amber-400 rounded-full transition-all"
                              style={{ width: `${pct}%` }}
                            />
                          </div>
                          <span className="text-slate-400 text-sm w-12 text-right">{count}</span>
                          <span className="text-slate-500 text-xs w-8">{pct}%</span>
                        </div>
                      ))}
                    </div>
                  )}
                </div>

                {/* Ultime Recensioni */}
                <div className="bg-slate-800/50 rounded-xl p-5 border border-slate-700/50">
                  <h3 className="text-white font-semibold mb-4">Ultime Recensioni</h3>
                  {beautyx.recent_reviews.length === 0 ? (
                    <p className="text-slate-400 text-sm">Nessuna recensione con testo ancora</p>
                  ) : (
                    <div className="space-y-3">
                      {beautyx.recent_reviews.map((r, i) => (
                        <div key={i} className="bg-slate-700/30 rounded-lg p-4">
                          <div className="flex items-center justify-between mb-2">
                            <StarRating value={r.rating} size="sm" readonly />
                            <span className="text-slate-500 text-xs">
                              {new Date(r.created_at).toLocaleDateString('it-IT')}
                            </span>
                          </div>
                          <p className="text-slate-300 text-sm italic">&ldquo;{r.review}&rdquo;</p>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              </div>
            )}

            {/* Detail: HPA */}
            {tab === 'hpa' && hpa && (
              <div className="space-y-4">
                {/* Classifica HPA */}
                <div className="bg-slate-800/50 rounded-xl p-5 border border-slate-700/50">
                  <h3 className="text-white font-semibold mb-4">Classifica Consulenti</h3>
                  {hpa.hpa_stats.length === 0 ? (
                    <p className="text-slate-400 text-sm">Nessuna valutazione ancora</p>
                  ) : (
                    <div className="space-y-3">
                      {hpa.hpa_stats.map((h, i) => (
                        <div key={h.target_id || i} className="flex items-center gap-4 bg-slate-700/30 rounded-lg p-3">
                          <span className={`text-lg font-bold w-6 text-center ${
                            i === 0 ? 'text-amber-400' : i === 1 ? 'text-slate-400' : i === 2 ? 'text-orange-700' : 'text-slate-600'
                          }`}>{i + 1}</span>
                          <div className="w-9 h-9 bg-gradient-to-br from-purple-500 to-indigo-600 rounded-full flex items-center justify-center flex-shrink-0">
                            <span className="text-white text-sm font-bold">
                              {(h.target_name || '?')[0]?.toUpperCase()}
                            </span>
                          </div>
                          <div className="flex-1 min-w-0">
                            <p className="text-white text-sm font-medium truncate">{h.target_name || 'Consulente'}</p>
                            <div className="flex items-center gap-2 mt-0.5">
                              <StarRating value={Math.round(h.avg)} size="sm" readonly />
                              <span className="text-amber-400 text-sm font-semibold">{h.avg.toFixed(1)}</span>
                              <span className="text-slate-500 text-xs">({h.total} rec.)</span>
                            </div>
                          </div>
                          {h.last_review && (
                            <p className="text-slate-400 text-xs max-w-[200px] truncate hidden md:block italic">
                              &ldquo;{h.last_review.review}&rdquo;
                            </p>
                          )}
                        </div>
                      ))}
                    </div>
                  )}
                </div>

                {/* Ultime Recensioni HPA */}
                <div className="bg-slate-800/50 rounded-xl p-5 border border-slate-700/50">
                  <h3 className="text-white font-semibold mb-4">Ultime Recensioni</h3>
                  {hpa.recent_reviews.length === 0 ? (
                    <p className="text-slate-400 text-sm">Nessuna recensione con testo ancora</p>
                  ) : (
                    <div className="space-y-3">
                      {hpa.recent_reviews.map((r, i) => (
                        <div key={i} className="bg-slate-700/30 rounded-lg p-4">
                          <div className="flex items-center justify-between mb-1">
                            <div className="flex items-center gap-2">
                              <span className="text-xs text-purple-400 font-medium">{r.target_name || 'HPA'}</span>
                              <StarRating value={r.rating} size="sm" readonly />
                            </div>
                            <span className="text-slate-500 text-xs">
                              {new Date(r.created_at).toLocaleDateString('it-IT')}
                            </span>
                          </div>
                          <p className="text-slate-300 text-sm italic">&ldquo;{r.review}&rdquo;</p>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              </div>
            )}
          </>
        )}
      </div>
    </div>
  )
}
