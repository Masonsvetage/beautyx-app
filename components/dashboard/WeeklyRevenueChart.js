'use client'

import { useState, useEffect, useMemo } from 'react'
import { format, startOfWeek, addDays, isSameDay, isToday, isBefore } from 'date-fns'
import { it } from 'date-fns/locale'
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, Cell, Legend, ReferenceLine } from 'recharts'

/**
 * Widget Incassi Settimanali
 * Mostra grafico a colonne con suddivisione IVA/Tasse/Costi/Liquidità
 * Permette di aggiungere l'incasso del giorno
 */
const PERIODI = [
  { giorni: 30,  label: '30 gg' },
  { giorni: 90,  label: '3 mesi' },
  { giorni: 180, label: '6 mesi' },
  { giorni: 365, label: '12 mesi' },
]

export default function WeeklyRevenueChart({
  centroId,
  taxRate = 25, // Percentuale tasse (da anno precedente)
  onRevenueUpdated,
  refreshKey
}) {
  const [weekRevenues, setWeekRevenues] = useState([])
  const [openingHours, setOpeningHours] = useState([])
  const [dailyCosts, setDailyCosts] = useState(null)
  const [medie, setMedie] = useState([])
  const [loading, setLoading] = useState(true)
  const [isAddingRevenue, setIsAddingRevenue] = useState(false)
  const [saving, setSaving] = useState(false)
  const [payments, setPayments] = useState({
    pos: '',
    contanti: '',
    bonifici: '',
    altro: ''
  })

  // Costo giornaliero CONSOLIDATO (anno solare precedente) per calcolo liquidità
  const dailyCost = dailyCosts?.prevYear?.costoGiornalieroNetto || 0

  const IVA_RATE = 22 // IVA 22%

  // Calcola le date della settimana corrente (Lun-Dom)
  const weekDates = useMemo(() => {
    const today = new Date()
    const monday = startOfWeek(today, { weekStartsOn: 1 })
    return Array.from({ length: 7 }, (_, i) => addDays(monday, i))
  }, [])

  useEffect(() => {
    if (centroId) loadData()
  }, [centroId, refreshKey])

  async function loadData() {
    if (!centroId) return
    setLoading(true)
    try {
      const monday = format(weekDates[0], 'yyyy-MM-dd')
      const sunday = format(weekDates[6], 'yyyy-MM-dd')

      // Carica incassi settimana, orari e costi in parallelo
      const [revenuesRes, hoursRes, costsRes, medieRes] = await Promise.all([
        fetch(`/api/daily-revenues?centro_id=${centroId}&from=${monday}&to=${sunday}`),
        fetch(`/api/opening-hours?centro_id=${centroId}`),
        fetch(`/api/daily-costs?centro_id=${centroId}`),
        fetch('/api/registro/medie'),
      ])

      const revenuesData = await revenuesRes.json()
      setWeekRevenues(revenuesData.revenues || [])

      const hoursData = await hoursRes.json()
      setOpeningHours(hoursData.hours || [])

      const costsData = await costsRes.json()
      setDailyCosts(costsData.costs || null)

      const medieData = await medieRes.json()
      setMedie(medieData.medie || [])
    } catch (error) {
      console.error('Errore caricamento dati:', error)
    }
    setLoading(false)
  }

  // Verifica se un giorno è aperto
  function isDayOpen(date) {
    const dayOfWeek = date.getDay() // 0=Dom, 1=Lun, ... 6=Sab
    const openingDay = openingHours.find(h => h.giorno_settimana === dayOfWeek)
    return openingDay?.aperto !== false
  }

  // Prepara dati per il grafico
  // LOGICA CORRETTA:
  // - Il costo giornaliero (714€) include già IVA pagata sugli acquisti
  // - Quindi calcoliamo: Margine = Incasso - Costi
  // - Dal margine deriviamo: IVA netta, Tasse, Liquidità
  const chartData = useMemo(() => {
    const today = new Date()

    return weekDates
      .filter(date => {
        // Mostra solo giorni aperti fino ad oggi
        return isDayOpen(date) && (isBefore(date, today) || isSameDay(date, today))
      })
      .map(date => {
        const dateStr = format(date, 'yyyy-MM-dd')
        const revenue = weekRevenues.find(r => r.data === dateStr)
        const totale = revenue?.totale || 0

        if (totale === 0) {
          return {
            date: date,
            dateStr: dateStr,
            dayName: format(date, 'EEE', { locale: it }),
            dayNumber: format(date, 'd'),
            totale: 0,
            iva: 0,
            tasse: 0,
            costi: 0,
            liquidita: 0,
            margine: 0,
            isToday: isToday(date),
            hasData: false
          }
        }

        // Calcolo corretto:
        // 1. IVA incassata sui ricavi (22% su lordo = 22/122 del totale)
        const ivaIncassata = totale * (IVA_RATE / (100 + IVA_RATE))

        // 2. IVA a credito sui costi (assumiamo stessa aliquota media)
        const ivaCredito = dailyCost * (IVA_RATE / (100 + IVA_RATE))

        // 3. IVA netta da versare
        const ivaNetta = Math.max(0, ivaIncassata - ivaCredito)

        // 4. Margine lordo (incasso - costi)
        const margine = totale - dailyCost

        // 5. Se margine positivo, calcola tasse e liquidità
        let taxAmount = 0
        let liquidita = 0

        if (margine > 0) {
          // Tasse sul margine (dopo IVA netta)
          const marginePreTax = margine - ivaNetta
          taxAmount = Math.max(0, marginePreTax * (taxRate / 100))
          liquidita = Math.max(0, marginePreTax - taxAmount)
        }

        // Per il grafico a barre impilate, mostriamo:
        // - Costi operativi (la parte più grande)
        // - IVA netta (porzione piccola)
        // - Tasse (porzione piccola)
        // - Liquidità (ciò che resta)
        // Totale deve = totale incasso

        const costiVisualizzati = Math.min(dailyCost, totale - ivaNetta - taxAmount - liquidita)

        return {
          date: date,
          dateStr: dateStr,
          dayName: format(date, 'EEE', { locale: it }),
          dayNumber: format(date, 'd'),
          totale: totale,
          iva: ivaNetta,
          tasse: taxAmount,
          costi: Math.max(0, totale - ivaNetta - taxAmount - liquidita),
          liquidita: liquidita,
          margine: margine,
          isToday: isToday(date),
          hasData: totale > 0
        }
      })
  }, [weekDates, weekRevenues, openingHours, dailyCost, taxRate])

  // Totale settimana
  const weekTotal = useMemo(() => {
    return chartData.reduce((sum, d) => sum + d.totale, 0)
  }, [chartData])

  // Totale liquidità settimana
  const weekLiquidity = useMemo(() => {
    return chartData.reduce((sum, d) => sum + d.liquidita, 0)
  }, [chartData])

  // Incasso di oggi
  const todayRevenue = useMemo(() => {
    const todayData = chartData.find(d => d.isToday)
    return todayData?.totale || 0
  }, [chartData])

  function formatEuro(val) {
    return new Intl.NumberFormat('it-IT', {
      style: 'currency',
      currency: 'EUR',
      minimumFractionDigits: 0,
      maximumFractionDigits: 0
    }).format(val || 0)
  }

  const handlePaymentChange = (type, value) => {
    setPayments(prev => ({ ...prev, [type]: value }))
  }

  const calculateTotal = () => {
    return Object.values(payments).reduce((sum, val) => sum + (parseFloat(val) || 0), 0)
  }

  async function handleSaveRevenue() {
    const total = calculateTotal()
    if (total === 0) return

    setSaving(true)
    try {
      const res = await fetch('/api/daily-revenues', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          centro_id: centroId,
          data: format(new Date(), 'yyyy-MM-dd'),
          pos: parseFloat(payments.pos) || 0,
          contanti: parseFloat(payments.contanti) || 0,
          bonifici: parseFloat(payments.bonifici) || 0,
          altro: parseFloat(payments.altro) || 0
        })
      })

      if (res.ok) {
        setPayments({ pos: '', contanti: '', bonifici: '', altro: '' })
        setIsAddingRevenue(false)
        await loadData()
        if (onRevenueUpdated) onRevenueUpdated()
      }
    } catch (error) {
      console.error('Errore salvataggio:', error)
    }
    setSaving(false)
  }

  // Custom tooltip per il grafico
  const CustomTooltip = ({ active, payload, label }) => {
    if (!active || !payload || !payload.length) return null

    const data = payload[0]?.payload
    if (!data) return null

    return (
      <div className="bg-slate-900/95 backdrop-blur-sm border border-slate-600 rounded-lg p-3 shadow-xl">
        <div className="font-bold text-white mb-2 capitalize">
          {format(data.date, 'EEEE d MMMM', { locale: it })}
        </div>
        <div className="space-y-1 text-sm">
          <div className="flex justify-between gap-4">
            <span className="text-slate-400">Totale incasso:</span>
            <span className="font-bold text-white">{formatEuro(data.totale)}</span>
          </div>
          <div className="flex justify-between gap-4">
            <span className="text-slate-400">Costo giornaliero:</span>
            <span className="text-slate-300">-{formatEuro(dailyCost)}</span>
          </div>
          <div className="flex justify-between gap-4">
            <span className={data.margine >= 0 ? "text-emerald-400" : "text-red-400"}>Margine:</span>
            <span className={data.margine >= 0 ? "text-emerald-400 font-semibold" : "text-red-400 font-semibold"}>
              {formatEuro(data.margine)}
            </span>
          </div>
          <div className="border-t border-slate-700 my-2"></div>
          <div className="flex justify-between gap-4">
            <span className="text-amber-400">Costi operativi:</span>
            <span className="text-amber-400">{formatEuro(data.costi)}</span>
          </div>
          <div className="flex justify-between gap-4">
            <span className="text-red-400">IVA netta:</span>
            <span className="text-red-400">{formatEuro(data.iva)}</span>
          </div>
          <div className="flex justify-between gap-4">
            <span className="text-orange-400">Tasse ({taxRate}%):</span>
            <span className="text-orange-400">{formatEuro(data.tasse)}</span>
          </div>
          <div className="border-t border-slate-700 my-2"></div>
          <div className="flex justify-between gap-4">
            <span className="text-emerald-400 font-semibold">Liquidita netta:</span>
            <span className="text-emerald-400 font-bold">{formatEuro(data.liquidita)}</span>
          </div>
        </div>
      </div>
    )
  }

  if (loading) {
    return (
      <div className="bg-gradient-to-br from-slate-800/50 to-slate-900/50 rounded-xl border border-emerald-500/30 h-[180px] flex items-center justify-center">
        <div className="text-center">
          <div className="text-2xl mb-1 animate-pulse">📊</div>
          <div className="text-slate-400 text-xs">Caricamento...</div>
        </div>
      </div>
    )
  }

  const newTotal = calculateTotal()

  return (
    <div className="bg-gradient-to-br from-slate-800/90 to-slate-900/70 rounded-xl border border-emerald-500/30 shadow-lg shadow-emerald-900/10">
      {/* Titolo widget */}
      <div className="px-3 pt-2 pb-0 flex items-center gap-1.5">
        <span className="text-sm">💰</span>
        <h3 className="text-xs font-bold text-white tracking-wide">Incassi Settimana</h3>
      </div>

      {/* Strip medie storiche: 30 / 90 / 180 / 365 gg */}
      <div className="grid grid-cols-4 border-b border-emerald-500/10 mt-1.5">
        {PERIODI.map((p, i) => {
          const m = medie.find(x => x.giorni === p.giorni)
          const ok = m && m.n_giorni_con_dati >= p.giorni
          return (
            <div key={p.giorni} className={`px-3 py-1.5 flex flex-col gap-0.5 ${i > 0 ? 'border-l border-slate-700/40' : ''}`}>
              <p className="text-[10px] text-slate-500 font-medium leading-none">{p.label}</p>
              <p className={`text-sm font-bold leading-tight ${ok ? 'text-white' : 'text-slate-700'}`}>
                {ok ? formatEuro(m.totale) : '—'}
              </p>
              <p className={`text-[10px] leading-none ${ok ? 'text-slate-400' : 'text-slate-700'}`}>
                {ok ? `Ø ${formatEuro(m.media_gg)}/g` : 'dati insuff.'}
              </p>
            </div>
          )
        })}
      </div>

      {/* Layout orizzontale: chart a sinistra, colonna info a destra */}
      <div className="flex">
        {/* Grafico - occupa tutto lo spazio disponibile */}
        <div className="flex-1 min-w-0 px-2 pt-2">
          {chartData.length === 0 ? (
            <div className="text-center py-4 text-slate-500 text-sm h-[130px] flex items-center justify-center">Nessun dato questa settimana</div>
          ) : (
            <div className="h-[130px]" style={{ minWidth: 0 }}>
              <ResponsiveContainer width="100%" height="100%" minWidth={1} minHeight={1}>
                <BarChart data={chartData} barCategoryGap="12%">
                  <XAxis dataKey="dayName" tick={{ fill: '#94a3b8', fontSize: 11 }} axisLine={false} tickLine={false} />
                  <YAxis tick={{ fill: '#94a3b8', fontSize: 10 }} axisLine={false} tickLine={false} tickFormatter={(v) => `${v}€`} width={40} />
                  <Tooltip content={<CustomTooltip />} wrapperStyle={{ zIndex: 9999, pointerEvents: 'none' }} />
                  <ReferenceLine y={dailyCost} stroke="#f59e0b" strokeWidth={1} strokeDasharray="4 2" />
                  <Bar dataKey="liquidita" stackId="a" fill="#10b981" />
                  <Bar dataKey="costi" stackId="a" fill="#f59e0b" />
                  <Bar dataKey="tasse" stackId="a" fill="#f97316" />
                  <Bar dataKey="iva" stackId="a" fill="#ef4444" radius={[3, 3, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          )}
          {/* Legenda compatta */}
          <div className="flex justify-center gap-3 text-[10px] text-slate-500 py-1.5">
            <span className="flex items-center gap-1"><span className="w-2 h-2 bg-emerald-500 rounded-sm inline-block" />Netto</span>
            <span className="flex items-center gap-1"><span className="w-2 h-2 bg-amber-500 rounded-sm inline-block" />Costi</span>
            <span className="flex items-center gap-1"><span className="w-2 h-2 bg-orange-500 rounded-sm inline-block" />Tasse</span>
            <span className="flex items-center gap-1"><span className="w-2 h-2 bg-red-500 rounded-sm inline-block" />IVA</span>
          </div>
        </div>

        {/* Colonna destra: titolo, totale, periodo, oggi, pulsante */}
        <div className="w-44 flex-shrink-0 border-l border-emerald-500/20 bg-gradient-to-b from-emerald-900/20 to-transparent p-3 flex flex-col justify-between gap-2">
          {/* Periodo + costo */}
          <div>
            <p className="text-[10px] text-slate-500 leading-tight">
              {format(weekDates[0], 'd MMM', { locale: it })} – {format(weekDates[6], 'd MMM', { locale: it })}
            </p>
            {dailyCost > 0 && (
              <p className="text-[10px] text-amber-500/70">costo medio {formatEuro(dailyCost)}/g</p>
            )}
          </div>

          {/* Totale settimana */}
          <div>
            <p className="text-[10px] text-slate-400 uppercase tracking-wider mb-0.5">Totale</p>
            <p className="text-xl font-bold text-white leading-none">{formatEuro(weekTotal)}</p>
            <p className="text-xs text-emerald-400 mt-0.5">Netto {formatEuro(weekLiquidity)}</p>
          </div>

          {/* Incasso oggi + pulsante */}
          <div>
            <p className="text-[10px] text-slate-400 uppercase tracking-wider mb-0.5">Oggi</p>
            <p className="text-lg font-bold text-emerald-400 leading-none">{formatEuro(todayRevenue)}</p>
            {!isAddingRevenue ? (
              <button
                onClick={() => setIsAddingRevenue(true)}
                className="mt-2 w-full py-1.5 bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-500 hover:to-teal-500 text-white rounded-lg text-xs font-medium transition-all"
              >
                + Aggiungi
              </button>
            ) : (
              <button
                onClick={() => setIsAddingRevenue(false)}
                className="mt-2 w-full py-1.5 bg-slate-700 hover:bg-slate-600 text-white rounded-lg text-xs transition-colors"
              >
                ✕ Chiudi
              </button>
            )}
          </div>
        </div>
      </div>

      {/* Form inline aggiunta incasso - appare sotto quando attivo */}
      {isAddingRevenue && (
        <div className="border-t border-emerald-500/20 px-3 py-2.5 bg-slate-900/40">
          <div className="flex gap-2 items-end">
            <div className="flex-1 grid grid-cols-4 gap-2">
              {[
                { key: 'pos', label: 'POS' },
                { key: 'contanti', label: 'Contanti' },
                { key: 'bonifici', label: 'Bonifici' },
                { key: 'altro', label: 'Altro' },
              ].map(({ key, label }) => (
                <div key={key}>
                  <label className="text-[10px] text-slate-400 block mb-1">{label}</label>
                  <input
                    type="number"
                    value={payments[key]}
                    onChange={(e) => handlePaymentChange(key, e.target.value)}
                    placeholder="0"
                    className="w-full px-2 py-1.5 bg-slate-800 border border-slate-600 rounded-lg text-white text-sm text-center focus:border-emerald-500 focus:outline-none"
                  />
                </div>
              ))}
            </div>
            <button
              onClick={handleSaveRevenue}
              disabled={newTotal === 0 || saving}
              className="px-3 py-1.5 bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-500 hover:to-teal-500 disabled:opacity-50 text-white rounded-lg text-xs font-medium whitespace-nowrap"
            >
              {saving ? '…' : `Salva ${formatEuro(newTotal)}`}
            </button>
          </div>
        </div>
      )}
    </div>
  )
}
