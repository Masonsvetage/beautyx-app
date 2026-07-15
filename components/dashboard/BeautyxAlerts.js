'use client'

import { useBeautyx } from '@/contexts/BeautyxContext'

export default function BeautyxAlerts() {
  const ctx = useBeautyx()
  if (!ctx) return null
  const { insights = [], toggleSidebar } = ctx

  // Filtra solo alert e suggerimenti con priorità alta
  const urgentAlerts = insights.filter(i =>
    (i.tipo === 'alert' || i.tipo === 'suggerimento') &&
    i.stato === 'attivo' &&
    i.priorita <= 3
  ).slice(0, 3) // Max 3 alert

  if (urgentAlerts.length === 0) {
    return (
      <div className="bg-gradient-to-br from-teal-600/30 to-cyan-600/30 backdrop-blur-xl rounded-xl p-4 border border-teal-500/40" style={{
        boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.7), 0 10px 25px -5px rgba(20, 184, 166, 0.3), 0 0 0 1px rgba(20, 184, 166, 0.15)'
      }}>
        <div className="flex items-center justify-between">
          <div>
            <h3 className="text-lg font-bold text-white">✨ Beautyx</h3>
            <p className="text-xs text-teal-200">Tutto sotto controllo!</p>
          </div>
          <button
            onClick={toggleSidebar}
            className="px-4 py-2 bg-gradient-to-r from-teal-500 to-cyan-500 hover:from-teal-600 hover:to-cyan-600 text-white rounded-lg text-sm font-semibold transition-all shadow-lg hover:shadow-xl"
          >
            Apri Chat
          </button>
        </div>
      </div>
    )
  }

  return (
    <div className="bg-gradient-to-br from-teal-600/30 to-cyan-600/30 backdrop-blur-xl rounded-xl p-4 border border-teal-500/40" style={{
      boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.7), 0 10px 25px -5px rgba(20, 184, 166, 0.3), 0 0 0 1px rgba(20, 184, 166, 0.15)'
    }}>
      {/* Header */}
      <div className="flex items-center justify-between mb-3">
        <div>
          <h3 className="text-lg font-bold text-white">💡 Consigli Beautyx</h3>
          <p className="text-xs text-teal-200">{urgentAlerts.length} suggerimenti attivi</p>
        </div>
        <button
          onClick={toggleSidebar}
          className="px-3 py-1.5 bg-gradient-to-r from-teal-500 to-cyan-500 hover:from-teal-600 hover:to-cyan-600 text-white rounded-lg text-xs font-semibold transition-all shadow-lg hover:shadow-xl"
        >
          Apri Chat
        </button>
      </div>

      {/* Lista Alert */}
      <div className="space-y-2">
        {urgentAlerts.map((alert) => (
          <div
            key={alert.id}
            className="bg-slate-900/50 rounded-lg p-3 border border-teal-400/30 hover:border-teal-400/50 transition-all cursor-pointer"
            onClick={toggleSidebar}
          >
            <div className="flex items-start gap-2">
              {/* Icona in base al tipo */}
              <span className="text-lg">
                {alert.tipo === 'alert' ? '⚠️' : '💡'}
              </span>

              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 mb-1">
                  <h4 className="text-sm font-semibold text-white truncate">
                    {alert.titolo}
                  </h4>
                  {/* Badge priorità */}
                  {alert.priorita === 1 && (
                    <span className="px-2 py-0.5 bg-red-500/20 text-red-300 text-xs rounded-full border border-red-400/40">
                      Urgente
                    </span>
                  )}
                </div>
                {alert.descrizione && (
                  <p className="text-xs text-teal-200 line-clamp-2">
                    {alert.descrizione}
                  </p>
                )}
              </div>

              {/* Freccia */}
              <span className="text-teal-300 text-sm">→</span>
            </div>
          </div>
        ))}
      </div>

      {/* Footer CTA */}
      <div className="mt-3 text-center">
        <button
          onClick={toggleSidebar}
          className="text-xs text-teal-300 hover:text-teal-200 font-semibold transition-colors"
        >
          Chiedi a Beautyx un'analisi completa →
        </button>
      </div>
    </div>
  )
}
