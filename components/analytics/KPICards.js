'use client'

import { formatEuro } from '@/lib/formatters'

export default function KPICards({ kpis, yoyChanges, ricaviOperativi }) {
  const cards = [
    {
      key: 'entrate',
      title: 'Entrate Totali',
      value: formatEuro(kpis.entrate),
      icon: '💰',
      color: 'from-green-500 to-emerald-500',
      bgColor: 'from-green-50 to-emerald-50',
      borderColor: 'border-green-200'
    },
    {
      key: 'uscite',
      title: 'Uscite Totali',
      value: formatEuro(kpis.uscite),
      icon: '📤',
      color: 'from-red-500 to-rose-500',
      bgColor: 'from-red-50 to-rose-50',
      borderColor: 'border-red-200'
    },
    {
      key: 'saldo',
      title: 'Saldo Netto',
      value: formatEuro(kpis.saldo),
      icon: kpis.saldo >= 0 ? '✅' : '⚠️',
      color: kpis.saldo >= 0 ? 'from-blue-500 to-cyan-500' : 'from-orange-500 to-amber-500',
      bgColor: kpis.saldo >= 0 ? 'from-blue-50 to-cyan-50' : 'from-orange-50 to-amber-50',
      borderColor: kpis.saldo >= 0 ? 'border-blue-200' : 'border-orange-200'
    },
    {
      key: 'costoGiornalieroNetto',
      title: 'Costo Giornaliero Netto',
      value: formatEuro(kpis.costoGiornalieroNetto),
      subtitle: `su ${kpis.giorniLavorativiEffettivi} gg (lordo: ${formatEuro(kpis.costoGiornalieroEsercizio)})`,
      icon: '📊',
      color: 'from-slate-500 to-teal-500',
      bgColor: 'from-slate-50 to-teal-50',
      borderColor: 'border-slate-200'
    },
    {
      key: 'costoOrarioEsercizio',
      title: 'Costo Orario',
      value: formatEuro(kpis.costoOrarioEsercizio),
      subtitle: `su ${kpis.oreLavorativeTotali.toFixed(0)}h totali (${kpis.oreSettimanali.toFixed(1)}h/sett)`,
      icon: '⏰',
      color: 'from-cyan-500 to-blue-500',
      bgColor: 'from-cyan-50 to-blue-50',
      borderColor: 'border-cyan-200'
    },
    {
      key: 'entrataMediaGiornaliera',
      title: 'Entrata Media Giornaliera',
      value: formatEuro(kpis.entrataMediaGiornaliera),
      subtitle: `su ${kpis.giorniLavorativiEffettivi} gg lavorativi`,
      icon: '📈',
      color: 'from-teal-500 to-cyan-500',
      bgColor: 'from-teal-50 to-cyan-50',
      borderColor: 'border-teal-200'
    },
    {
      key: 'entrataMediaOraria',
      title: 'Entrata Media Oraria',
      value: formatEuro(kpis.entrataMediaOraria),
      subtitle: `su ${kpis.oreLavorativeTotali.toFixed(0)}h totali`,
      icon: '💵',
      color: 'from-lime-500 to-green-500',
      bgColor: 'from-lime-50 to-green-50',
      borderColor: 'border-lime-200'
    },
    {
      key: 'margineOperativo',
      title: 'Margine Operativo',
      value: `${kpis.margineOperativo.toFixed(1)}%`,
      subtitle: kpis.margineOperativo >= 20 ? '✅ Ottimo' : kpis.margineOperativo >= 10 ? '⚠️ Sufficiente' : '❌ Critico',
      icon: '💡',
      color: 'from-blue-500 to-indigo-500',
      bgColor: 'from-blue-50 to-indigo-50',
      borderColor: 'border-blue-200'
    }
  ]

  return (
    <div className="space-y-2">
      {/* Incasso Cassa Operativo (Registro / Koibox) — fonte separata dai movimenti bancari */}
      {ricaviOperativi?.n_giorni > 0 && (
        <div className="grid grid-cols-2 md:grid-cols-4 gap-2 p-2 bg-teal-50 border border-teal-200 rounded-lg">
          <div className="col-span-2 md:col-span-4 flex items-center gap-2 mb-0.5">
            <span className="text-xs font-semibold text-teal-700">💳 Incasso Cassa Operativo</span>
            <span className="text-xs text-teal-500">(Registro / Koibox — {ricaviOperativi.n_giorni} giorni)</span>
          </div>
          <div className="bg-white rounded border border-teal-200 p-1.5">
            <p className="text-xs text-gray-500 mb-0.5">Totale periodo</p>
            <p className="text-lg font-bold text-teal-700">{formatEuro(ricaviOperativi.totale_incasso)}</p>
          </div>
          <div className="bg-white rounded border border-teal-200 p-1.5">
            <p className="text-xs text-gray-500 mb-0.5">Media giornaliera</p>
            <p className="text-lg font-bold text-teal-600">{formatEuro(ricaviOperativi.media_giornaliera)}</p>
          </div>
          {ricaviOperativi.totale_spese > 0 && (
            <div className="bg-white rounded border border-teal-200 p-1.5">
              <p className="text-xs text-gray-500 mb-0.5">Spese registrate</p>
              <p className="text-lg font-bold text-amber-600">{formatEuro(ricaviOperativi.totale_spese)}</p>
            </div>
          )}
          {ricaviOperativi.n_clienti > 0 && (
            <div className="bg-white rounded border border-teal-200 p-1.5">
              <p className="text-xs text-gray-500 mb-0.5">Clienti serviti</p>
              <p className="text-lg font-bold text-slate-700">{ricaviOperativi.n_clienti.toLocaleString('it-IT')}</p>
            </div>
          )}
        </div>
      )}

      {/* KPI Movimenti Bancari */}
    <div className="grid grid-cols-2 md:grid-cols-4 gap-2">
      {cards.map((card, idx) => (
        <div
          key={idx}
          className={`bg-white rounded border ${card.borderColor} p-1.5`}
        >
          <div className="flex items-center gap-1.5 mb-1">
            <div className={`w-6 h-6 bg-gradient-to-br ${card.color} rounded flex items-center justify-center`}>
              <span className="text-sm">{card.icon}</span>
            </div>
            <h4 className="text-xs font-semibold text-gray-600 flex-1 leading-tight">{card.title}</h4>
          </div>

          <div className="text-lg font-bold text-gray-800 leading-tight">{card.value}</div>

          {yoyChanges && yoyChanges[card.key] !== undefined && (
            <div className={`text-xs font-semibold leading-tight ${
              yoyChanges[card.key] > 0 ? 'text-green-600' : yoyChanges[card.key] < 0 ? 'text-red-600' : 'text-gray-500'
            }`}>
              {yoyChanges[card.key] > 0 ? '↑' : yoyChanges[card.key] < 0 ? '↓' : '→'} {Math.abs(yoyChanges[card.key]).toFixed(1)}% vs anno scorso
            </div>
          )}

          {card.subtitle && !yoyChanges && (
            <p className="text-xs text-gray-500 leading-tight">{card.subtitle}</p>
          )}
        </div>
      ))}
    </div>
    </div>
  )
}
