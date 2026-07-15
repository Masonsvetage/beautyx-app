'use client'

import { formatEuro } from '@/lib/formatters'
import { calculateAccantonamentoProgress, getTipoVersamentoIcon } from '@/lib/pianificazione-utils'

export default function AccantonamentoCard({ accantonamento, onClick }) {
  const progress = calculateAccantonamentoProgress(
    accantonamento.saldo_attuale,
    accantonamento.importo_obiettivo
  )

  const isOverTarget = accantonamento.saldo_attuale > accantonamento.importo_obiettivo

  return (
    <div
      onClick={onClick}
      className="bg-white border border-gray-200 rounded-xl p-4 cursor-pointer hover:shadow-lg transition-all"
    >
      {/* Header */}
      <div className="flex items-start justify-between mb-3">
        <div className="flex items-center gap-2">
          <div
            className="w-10 h-10 rounded-lg flex items-center justify-center text-xl"
            style={{ backgroundColor: `${accantonamento.colore}20` }}
          >
            <span>{accantonamento.icona}</span>
          </div>
          <div>
            <h3 className="font-bold text-gray-800">{accantonamento.nome}</h3>
            {accantonamento.descrizione && (
              <p className="text-xs text-gray-500 line-clamp-1">{accantonamento.descrizione}</p>
            )}
            {/* Badge Tipo Versamento */}
            {accantonamento.tipo_versamento && (
              <div className="flex items-center gap-1 mt-1">
                {accantonamento.tipo_versamento === 'percentuale_incasso' && (
                  <span className="bg-blue-100 text-blue-700 px-2 py-0.5 rounded-full text-xs font-semibold">
                    📊 {accantonamento.percentuale_incasso}% su incasso
                  </span>
                )}
                {accantonamento.tipo_versamento === 'fisso_mensile' && (
                  <span className="bg-green-100 text-green-700 px-2 py-0.5 rounded-full text-xs font-semibold">
                    📅 {formatEuro(accantonamento.contributo_mensile)}€/mese
                  </span>
                )}
                {accantonamento.tipo_versamento === 'manuale' && (
                  <span className="bg-gray-100 text-gray-700 px-2 py-0.5 rounded-full text-xs font-semibold">
                    ✍️ Manuale
                  </span>
                )}
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Saldi */}
      <div className="space-y-2 mb-3">
        <div className="flex items-center justify-between">
          <span className="text-sm text-gray-600">Saldo attuale:</span>
          <span className="text-lg font-bold text-gray-800">
            {formatEuro(accantonamento.saldo_attuale)}
          </span>
        </div>

        {accantonamento.importo_obiettivo > 0 && (
          <div className="flex items-center justify-between">
            <span className="text-sm text-gray-600">Obiettivo:</span>
            <span className="text-sm font-semibold text-gray-600">
              {formatEuro(accantonamento.importo_obiettivo)}
            </span>
          </div>
        )}

        {accantonamento.contributo_mensile > 0 && (
          <div className="flex items-center justify-between">
            <span className="text-xs text-gray-500">Contributo mensile:</span>
            <span className="text-xs font-semibold text-gray-500">
              {formatEuro(accantonamento.contributo_mensile)}/mese
            </span>
          </div>
        )}
      </div>

      {/* Progress Bar */}
      {accantonamento.importo_obiettivo > 0 && (
        <div>
          <div className="flex items-center justify-between mb-1">
            <span className="text-xs font-semibold text-gray-500">Progresso</span>
            <span
              className="text-xs font-bold"
              style={{ color: isOverTarget ? '#10b981' : accantonamento.colore }}
            >
              {progress.toFixed(1)}%
            </span>
          </div>
          <div className="w-full bg-gray-200 rounded-full h-2">
            <div
              className="h-2 rounded-full transition-all"
              style={{
                width: `${Math.min(progress, 100)}%`,
                backgroundColor: isOverTarget ? '#10b981' : accantonamento.colore
              }}
            />
          </div>
          {isOverTarget && (
            <div className="text-xs text-green-600 font-semibold mt-1">
              ✓ Obiettivo raggiunto!
            </div>
          )}
        </div>
      )}
    </div>
  )
}
