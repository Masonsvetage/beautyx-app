'use client'

import { formatEuro } from '@/lib/formatters'

export default function LiquidityPanel({ liquidity }) {
  const { totalBank, totalReserved, available, isNegative } = liquidity

  return (
    <div className="bg-gradient-to-r from-purple-50 to-indigo-50 border border-purple-200 rounded-xl p-4">
      <h3 className="text-sm font-bold text-gray-700 mb-3">💵 Liquidità Disponibile</h3>

      <div className="grid grid-cols-3 gap-4">
        {/* Saldo Banca Totale */}
        <div className="bg-white rounded-lg p-3 border border-gray-200">
          <div className="flex items-center gap-2 mb-1">
            <span className="text-xl">🏦</span>
            <span className="text-xs font-semibold text-gray-600">Saldo Banca</span>
          </div>
          <div className="text-xl font-bold text-gray-800">{formatEuro(totalBank)}</div>
        </div>

        {/* Fondi Accantonati */}
        <div className="bg-white rounded-lg p-3 border border-gray-200">
          <div className="flex items-center gap-2 mb-1">
            <span className="text-xl">🔒</span>
            <span className="text-xs font-semibold text-gray-600">Fondi Accantonati</span>
          </div>
          <div className="text-xl font-bold text-purple-600">{formatEuro(totalReserved)}</div>
        </div>

        {/* Liquidità Disponibile */}
        <div className={`rounded-lg p-3 border-2 ${
          isNegative
            ? 'bg-red-50 border-red-300'
            : 'bg-green-50 border-green-300'
        }`}>
          <div className="flex items-center gap-2 mb-1">
            <span className="text-xl">{isNegative ? '⚠️' : '✅'}</span>
            <span className="text-xs font-semibold text-gray-600">Disponibile</span>
          </div>
          <div className={`text-xl font-bold ${
            isNegative ? 'text-red-700' : 'text-green-700'
          }`}>
            {formatEuro(available)}
          </div>
        </div>
      </div>

      {isNegative && (
        <div className="mt-3 bg-red-100 border border-red-300 rounded-lg p-3">
          <div className="flex items-center gap-2">
            <span className="text-xl">⚠️</span>
            <div>
              <div className="text-sm font-bold text-red-800">Attenzione: Liquidità Negativa</div>
              <div className="text-xs text-red-700">
                Gli accantonamenti superano il saldo disponibile. Considera di ridurre le riserve o aumentare la liquidità.
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
