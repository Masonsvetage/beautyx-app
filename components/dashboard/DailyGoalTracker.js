'use client'

export default function DailyGoalTracker({
  currentRevenue = 0,
  dailyGoal = 500,
  dailyCost = 714
}) {
  const progress = Math.min((currentRevenue / dailyGoal) * 100, 100)
  const remaining = Math.max(dailyGoal - currentRevenue, 0)
  const profit = currentRevenue - dailyCost
  const isProfit = profit >= 0

  return (
    <div className="bg-gradient-to-br from-blue-600/30 to-indigo-600/30 backdrop-blur-xl rounded-xl p-4 border border-blue-500/40" style={{
      boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.7), 0 10px 25px -5px rgba(59, 130, 246, 0.3), 0 0 0 1px rgba(59, 130, 246, 0.15)'
    }}>
      {/* Header */}
      <div className="flex items-center justify-between mb-3">
        <div>
          <h3 className="text-lg font-bold text-white">🎯 Obiettivo Giornata</h3>
          <p className="text-xs text-blue-200">Target: {dailyGoal}€</p>
        </div>
        <div className="text-right">
          <div className={`text-2xl font-bold ${progress >= 100 ? 'text-emerald-400' : 'text-white'}`}>
            {progress.toFixed(0)}%
          </div>
          <div className="text-xs text-blue-200">completato</div>
        </div>
      </div>

      {/* Progress Bar */}
      <div className="mb-3">
        <div className="h-8 bg-slate-900/50 rounded-lg overflow-hidden border border-blue-500/30">
          <div
            className={`h-full transition-all duration-500 ${
              progress >= 100
                ? 'bg-gradient-to-r from-emerald-500 to-teal-500'
                : 'bg-gradient-to-r from-blue-500 to-indigo-500'
            }`}
            style={{ width: `${progress}%` }}
          >
            <div className="h-full flex items-center justify-center">
              {progress > 20 && (
                <span className="text-xs font-bold text-white">
                  {currentRevenue.toFixed(0)}€ / {dailyGoal}€
                </span>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Info Cards */}
      <div className="grid grid-cols-2 gap-2">
        {/* Da raggiungere */}
        <div className="bg-slate-900/50 rounded-lg p-2 border border-blue-400/30">
          <div className="text-xs text-blue-200 mb-1">Da raggiungere</div>
          <div className="text-xl font-bold text-white">{remaining.toFixed(0)}€</div>
        </div>

        {/* Margine vs Costi */}
        <div className={`bg-slate-900/50 rounded-lg p-2 border ${
          isProfit ? 'border-emerald-400/30' : 'border-orange-400/30'
        }`}>
          <div className="text-xs text-blue-200 mb-1">
            {isProfit ? '💚 Margine' : '⚠️ Deficit'}
          </div>
          <div className={`text-xl font-bold ${
            isProfit ? 'text-emerald-400' : 'text-orange-400'
          }`}>
            {isProfit ? '+' : ''}{profit.toFixed(0)}€
          </div>
        </div>
      </div>

      {/* Status Message */}
      {progress >= 100 ? (
        <div className="mt-3 bg-emerald-500/20 border border-emerald-400/40 rounded-lg p-2 text-center">
          <span className="text-sm font-semibold text-emerald-300">
            🎉 Obiettivo raggiunto! Ottimo lavoro!
          </span>
        </div>
      ) : !isProfit && currentRevenue > 0 ? (
        <div className="mt-3 bg-orange-500/20 border border-orange-400/40 rounded-lg p-2 text-center">
          <span className="text-sm font-semibold text-orange-300">
            ⚠️ Incasso sotto il costo giornaliero ({dailyCost}€)
          </span>
        </div>
      ) : null}
    </div>
  )
}
