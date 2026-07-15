'use client'

import { useMemo } from 'react'
import { formatEuro } from '@/lib/formatters'

export default function CategoryPercentageTable({ data }) {
  // Calcola totali
  const totals = useMemo(() => {
    const totalEntrate = data.reduce((sum, cat) => sum + cat.entrate, 0)
    const totalUscite = data.reduce((sum, cat) => sum + cat.uscite, 0)
    return { totalEntrate, totalUscite }
  }, [data])

  // Prepara dati con percentuali (entrambe relative al totale entrate)
  const enrichedData = useMemo(() => {
    return data
      .map(cat => ({
        ...cat,
        percentEntrate: totals.totalEntrate > 0 ? (cat.entrate / totals.totalEntrate) * 100 : 0,
        percentUscite: totals.totalEntrate > 0 ? (cat.uscite / totals.totalEntrate) * 100 : 0,
        percentUsciteInterne: cat.entrate > 0 ? (cat.uscite / cat.entrate) * 100 : 0
      }))
      .sort((a, b) => b.percentEntrate - a.percentEntrate) // Ordina per % entrate
  }, [data, totals])

  return (
    <div className="bg-white rounded border border-gray-100 p-1.5">
      <div className="flex items-center gap-1.5 mb-1.5">
        <div className="w-6 h-6 bg-gradient-to-br from-blue-500 to-cyan-500 rounded flex items-center justify-center">
          <span className="text-sm">📈</span>
        </div>
        <h3 className="font-bold text-gray-800 text-xs flex-1">Incidenza per Categoria</h3>
        <span className="text-xs text-gray-600">{enrichedData.length} categorie</span>
      </div>

      <div className="overflow-x-auto max-h-96 overflow-y-auto">
        <table className="w-full text-xs">
          <thead>
            {/* Totali in cima con carattere più grande */}
            <tr className="bg-gradient-to-r from-indigo-100 to-purple-100 border-b-2 border-indigo-300">
              <td className="p-2 text-gray-900 font-bold text-sm">TOTALE</td>
              <td className="p-2 text-right text-green-700 font-bold text-sm">{formatEuro(totals.totalEntrate)}</td>
              <td className="p-2 text-right text-green-700 font-bold text-sm">100.0%</td>
              <td className="p-2 text-right text-red-700 font-bold text-sm">{formatEuro(totals.totalUscite)}</td>
              <td className="p-2 text-right text-red-700 font-bold text-sm">
                {totals.totalEntrate > 0 ? ((totals.totalUscite / totals.totalEntrate) * 100).toFixed(1) : '0.0'}%
              </td>
              <td className="p-2 text-right text-orange-700 font-bold text-sm">
                {totals.totalEntrate > 0 ? ((totals.totalUscite / totals.totalEntrate) * 100).toFixed(1) : '0.0'}%
              </td>
            </tr>
            {/* Header colonne */}
            <tr className="bg-gray-50 border-b border-gray-200">
              <th className="text-left p-1 font-semibold text-gray-700">Categoria</th>
              <th className="text-right p-1 font-semibold text-green-700">Entrate</th>
              <th className="text-right p-1 font-semibold text-green-700">% su Entrate</th>
              <th className="text-right p-1 font-semibold text-red-700">Uscite</th>
              <th className="text-right p-1 font-semibold text-red-700">% su Entrate</th>
              <th className="text-right p-1 font-semibold text-orange-700">% Uscite/Entrate Cat.</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-100">
            {enrichedData.map((cat, idx) => (
              <tr key={idx} className="hover:bg-gray-50">
                <td className="p-1 text-gray-800 font-medium truncate max-w-[120px]" title={cat.categoria}>
                  {cat.categoria}
                </td>
                <td className="p-1 text-right text-green-700 font-semibold">
                  {formatEuro(cat.entrate)}
                </td>
                <td className="p-1 text-right">
                  <div className="flex items-center justify-end gap-1">
                    {/* Barra percentuale */}
                    <div className="w-12 h-2 bg-gray-100 rounded-full overflow-hidden">
                      <div
                        className="h-full bg-green-500"
                        style={{ width: `${Math.min(cat.percentEntrate, 100)}%` }}
                      />
                    </div>
                    <span className="font-bold text-green-700 w-10 text-right">
                      {cat.percentEntrate.toFixed(1)}%
                    </span>
                  </div>
                </td>
                <td className="p-1 text-right text-red-700 font-semibold">
                  {formatEuro(cat.uscite)}
                </td>
                <td className="p-1 text-right">
                  <div className="flex items-center justify-end gap-1">
                    {/* Barra percentuale */}
                    <div className="w-12 h-2 bg-gray-100 rounded-full overflow-hidden">
                      <div
                        className="h-full bg-red-500"
                        style={{ width: `${Math.min(cat.percentUscite, 100)}%` }}
                      />
                    </div>
                    <span className="font-bold text-red-700 w-10 text-right">
                      {cat.percentUscite.toFixed(1)}%
                    </span>
                  </div>
                </td>
                <td className="p-1 text-right">
                  {cat.entrate > 0 ? (
                    <div className="flex items-center justify-end gap-1">
                      {/* Barra percentuale */}
                      <div className="w-12 h-2 bg-gray-100 rounded-full overflow-hidden">
                        <div
                          className="h-full bg-orange-500"
                          style={{ width: `${Math.min(cat.percentUsciteInterne, 100)}%` }}
                        />
                      </div>
                      <span className="font-bold text-orange-700 w-10 text-right">
                        {cat.percentUsciteInterne.toFixed(1)}%
                      </span>
                    </div>
                  ) : (
                    <span className="text-gray-400 text-xs">-</span>
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Legenda */}
      <div className="mt-1.5 p-1.5 bg-blue-50 rounded border border-blue-200">
        <div className="flex items-start gap-1 text-xs text-gray-700">
          <span className="text-base shrink-0">💡</span>
          <div>
            <strong className="text-blue-700">% su Entrate (colonne verdi/rosse):</strong> Quanto ogni categoria incide sul totale delle entrate.
            <br />
            <strong className="text-orange-700">% Uscite/Entrate Cat. (colonna arancione):</strong> Quanto le uscite della categoria incidono sulle sue entrate (margine della categoria).
            <br />
            <em className="text-gray-600">Esempio: POS con 10.000€ entrate e 500€ uscite → 5% (le uscite POS erodono il 5% delle entrate POS)</em>
          </div>
        </div>
      </div>
    </div>
  )
}
