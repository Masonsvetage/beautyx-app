'use client'

import { useState, useEffect, useMemo } from 'react'
import { format, subMonths } from 'date-fns'
import PeriodSelector from '@/components/analytics/PeriodSelector'
import KPICards from '@/components/analytics/KPICards'
import CategoryCharts from '@/components/analytics/CategoryCharts'
import CategoryPercentageTable from '@/components/analytics/CategoryPercentageTable'
import TrendChart from '@/components/analytics/TrendChart'
import AnomaliesPanel from '@/components/analytics/AnomaliesPanel'
import AnomalyHistoryModal from '@/components/analytics/AnomalyHistoryModal'
import YoYComparisonPanel from '@/components/analytics/YoYComparisonPanel'
import SoglieConfig from '@/components/analytics/SoglieConfig'
import {
  filterMovementsByPeriod,
  groupByCategory,
  groupByDay,
  groupByWeek,
  groupByMonth,
  calculateKPIs,
  analyzeProductivity,
  calculateYoYKPIs,
  getYoYTrendData,
  getYoYCategoryComparison,
  groupCategoriesByTime
} from '@/lib/analytics'
import { filterOperationalMovements, getMovementStats } from '@/lib/movement-classifier'
import { generateIntelligentAlerts } from '@/lib/analytics-alerts'
import CommandBar from '@/components/common/CommandBar'
import HelpTooltip from '@/components/common/HelpTooltip'
import { useAuth } from '@/contexts/AuthContext'

export default function AnalyticsPage() {
  const { currentCentro, profile, loading: authLoading } = useAuth()
  const [movements, setMovements] = useState([])
  const [openingHours, setOpeningHours] = useState([])
  const [closures, setClosures] = useState([])
  const [loading, setLoading] = useState(true)
  const [showHistory, setShowHistory] = useState(false)
  const [showYoY, setShowYoY] = useState(false)
  const [showSoglie, setShowSoglie] = useState(false)
  const [soglieUtente, setSoglieUtente] = useState(null)
  const [period, setPeriod] = useState({
    startDate: format(subMonths(new Date(), 1), 'yyyy-MM-dd'),
    endDate: format(new Date(), 'yyyy-MM-dd'),
    label: 'Ultimo Mese'
  })
  const [viewMode, setViewMode] = useState('month') // day, week, month
  const [showOnlyOperational, setShowOnlyOperational] = useState(true) // Mostra solo movimenti operativi
  const [ricaviOperativi, setRicaviOperativi] = useState(null) // da registro_giornate (Koibox/Registro)

  const centroId = currentCentro?.centro_id || profile?.centro_id

  useEffect(() => {
    if (centroId) loadData()
  }, [centroId])

  // Ricarica ricavi operativi quando cambia il periodo
  useEffect(() => {
    if (!centroId) return
    fetch(`/api/registro/stats?centro_id=${centroId}&from=${period.startDate}&to=${period.endDate}`)
      .then(r => r.json())
      .then(d => setRicaviOperativi(d))
      .catch(() => {})
  }, [centroId, period])

  async function loadData() {
    setLoading(true)
    try {
      // Carica movimenti
      const movRes = await fetch(`/api/bank/movements?centro_id=${centroId}`)
      const movData = await movRes.json()
      setMovements(movData.movements || [])

      // Carica orari
      const hoursRes = await fetch(`/api/opening-hours?centro_id=${centroId}`)
      const hoursData = await hoursRes.json()
      setOpeningHours(hoursData.hours || [])

      // Carica chiusure
      const closuresRes = await fetch(`/api/closures?centro_id=${centroId}`)
      const closuresData = await closuresRes.json()
      setClosures(closuresData.closures || [])

      // Carica soglie personalizzate
      const soglieRes = await fetch(`/api/soglie-alert?centro_id=${centroId}`)
      const soglieData = await soglieRes.json()
      setSoglieUtente(soglieData.soglie || null)
    } catch (error) {
      console.error('Errore caricamento dati:', error)
    }
    setLoading(false)
  }

  // Calcoli analytics
  const analytics = useMemo(() => {
    if (movements.length === 0) return null

    // Filtra movimenti operativi se richiesto
    const workingMovements = showOnlyOperational
      ? filterOperationalMovements(movements)
      : movements

    // Per KPI: usa solo operativi (se filtro attivo)
    const filteredForKPIs = filterMovementsByPeriod(workingMovements, period.startDate, period.endDate)
    const kpis = calculateKPIs(workingMovements, period.startDate, period.endDate, openingHours, closures)

    // NUOVO SISTEMA ALERT INTELLIGENTI (con soglie personalizzate)
    const alerts = generateIntelligentAlerts(movements, period, soglieUtente)

    const productivity = analyzeProductivity(filteredForKPIs, period.startDate, period.endDate, soglieUtente)

    // Per GRAFICI/CATEGORIE: usa TUTTI i movimenti (anche Finanziamenti/Giroconti) per trasparenza
    const allMovementsFiltered = filterMovementsByPeriod(movements, period.startDate, period.endDate)
    const byCategory = groupByCategory(allMovementsFiltered)

    // Dati trend temporale: usa tutti i movimenti per mostrare tutte le categorie
    let trendData
    let categoriesByTime
    if (viewMode === 'day') {
      trendData = groupByDay(filteredForKPIs, period.startDate, period.endDate) // KPI usa operativi
      categoriesByTime = groupCategoriesByTime(allMovementsFiltered, period.startDate, period.endDate, 'day') // Grafici usano tutti
    } else if (viewMode === 'week') {
      trendData = groupByWeek(filteredForKPIs, period.startDate, period.endDate)
      categoriesByTime = groupCategoriesByTime(allMovementsFiltered, period.startDate, period.endDate, 'week')
    } else {
      trendData = groupByMonth(filteredForKPIs, period.startDate, period.endDate)
      categoriesByTime = groupCategoriesByTime(allMovementsFiltered, period.startDate, period.endDate, 'month')
    }

    // Calcola YoY se attivo
    let yoyData = null
    if (showYoY) {
      yoyData = {
        kpis: calculateYoYKPIs(workingMovements, period, openingHours, closures),
        trends: getYoYTrendData(workingMovements, period, viewMode),
        categories: getYoYCategoryComparison(workingMovements, period)
      }
    }

    // Statistiche movimenti tecnici vs operativi
    const movementStats = getMovementStats(movements)

    return {
      byCategory,
      kpis,
      alerts, // Nuovo sistema intelligente
      productivity,
      trendData,
      categoriesByTime,
      yoy: yoyData,
      movementStats
    }
  }, [movements, period, openingHours, closures, viewMode, showYoY, showOnlyOperational, soglieUtente])

  if (!centroId) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-800 via-slate-900 to-slate-800 flex items-center justify-center">
        <div className="text-center max-w-md mx-auto p-8">
          <div className="text-5xl mb-4">📊</div>
          <h2 className="text-xl font-bold text-white mb-2">Nessun centro selezionato</h2>
          <p className="text-slate-400">Seleziona un centro dalla navbar per visualizzare le analytics.</p>
        </div>
      </div>
    )
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900 flex items-center justify-center">
        <div className="text-center">
          <div className="text-4xl mb-4">📊</div>
          <div className="text-xl font-semibold text-slate-200">Caricamento Analytics...</div>
        </div>
      </div>
    )
  }

  return (
    <div className="relative min-h-screen bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900">
      {/* Filigrana AI Background - Design Unico Sfumato */}
      <div className="fixed inset-0 pointer-events-none opacity-30 z-0">
        <svg width="100%" height="100%" xmlns="http://www.w3.org/2000/svg" className="absolute inset-0" preserveAspectRatio="none">
          <defs>
            <filter id="blur-ana">
              <feGaussianBlur in="SourceGraphic" stdDeviation="4" />
            </filter>
            <linearGradient id="grad-ana1" x1="0%" y1="100%" x2="100%" y2="0%">
              <stop offset="0%" style={{stopColor:'#06b6d4', stopOpacity:0.3}} />
              <stop offset="100%" style={{stopColor:'#14b8a6', stopOpacity:0.1}} />
            </linearGradient>
            <linearGradient id="grad-ana2" x1="100%" y1="100%" x2="0%" y2="0%">
              <stop offset="0%" style={{stopColor:'#14b8a6', stopOpacity:0.3}} />
              <stop offset="100%" style={{stopColor:'#06b6d4', stopOpacity:0.1}} />
            </linearGradient>
          </defs>

          {/* Onde fluide */}
          <path d="M 0,250 Q 550,120 1100,250 T 2200,250 L 2200,450 L 0,450 Z"
                fill="url(#grad-ana1)" filter="url(#blur-ana)" opacity="0.35"/>

          <path d="M 0,650 Q 450,500 900,650 T 1800,650 L 1800,850 L 0,850 Z"
                fill="url(#grad-ana2)" filter="url(#blur-ana)" opacity="0.35"/>

          {/* Curve */}
          <path d="M 150,150 Q 550,350 950,150 T 1750,150"
                stroke="#06b6d4" strokeWidth="2" fill="none"
                filter="url(#blur-ana)" opacity="0.5"/>

          <path d="M 100,850 Q 500,700 900,850 T 1700,850"
                stroke="#14b8a6" strokeWidth="2" fill="none"
                filter="url(#blur-ana)" opacity="0.4"/>

          {/* Cerchi */}
          <circle cx="25%" cy="35%" r="240" fill="url(#grad-ana1)" filter="url(#blur-ana)" opacity="0.2"/>
          <circle cx="75%" cy="60%" r="260" fill="url(#grad-ana2)" filter="url(#blur-ana)" opacity="0.2"/>
        </svg>
      </div>

      <div className="relative z-10 container mx-auto px-2 py-2 max-w-7xl">
        {/* Period Selector & Settings */}
        <div className="flex gap-2 mb-2 items-center">
          <div className="flex-1">
            <PeriodSelector onPeriodChange={setPeriod} />
          </div>
          <HelpTooltip
            title="Analytics"
            content="Analisi automatica di entrate, uscite, margini e trend basata sui movimenti bancari caricati. Seleziona il periodo in alto per cambiare l'arco temporale. I dati operativi escludono le voci non rilevanti (es. stipendi, IVA). Usa il confronto YoY per vedere la crescita anno su anno."
          />
        </div>

        {/* Command Bar - Barra comandi principale */}
        <div className="mb-3">
          <CommandBar
            commands={[
              {
                id: 'operativi',
                label: showOnlyOperational ? 'Solo Operativi' : 'Tutti i Movimenti',
                icon: showOnlyOperational ? '✓' : '📊',
                description: showOnlyOperational
                  ? `${analytics?.movementStats?.operativi?.count || 0} movimenti`
                  : `${movements.length} totali`,
                active: showOnlyOperational,
                onClick: () => setShowOnlyOperational(!showOnlyOperational),
                color: 'teal'
              },
              {
                id: 'storico',
                label: 'Storico Anomalie',
                icon: '📋',
                description: 'Vedi storico',
                active: false,
                onClick: () => setShowHistory(true),
                color: 'amber'
              },
              {
                id: 'yoy',
                label: 'Confronto YoY',
                icon: '📅',
                activeIcon: '✓',
                description: 'Anno su anno',
                active: showYoY,
                onClick: () => setShowYoY(!showYoY),
                color: 'blue'
              },
              {
                id: 'soglie',
                label: 'Soglie Alert',
                icon: '%',
                activeIcon: '✓',
                description: 'Configura soglie',
                active: showSoglie,
                onClick: () => setShowSoglie(!showSoglie),
                color: 'indigo'
              }
            ]}
          />
        </div>

        {/* Soglie Alert Configuration */}
        {showSoglie && (
          <div className="mb-2">
            <SoglieConfig
              centroId={centroId}
              onClose={() => setShowSoglie(false)}
              onSave={() => {
                loadData() // Ricarica dati per aggiornare alert con nuove soglie
              }}
            />
          </div>
        )}

        {analytics && (
          <>
            {/* KPI Cards */}
            <div className="mb-2">
              <KPICards
                kpis={analytics.kpis}
                yoyChanges={analytics.yoy?.kpis?.changes}
                ricaviOperativi={ricaviOperativi}
              />
            </div>

            {/* Charts Grid */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-2 mb-2">
              {/* Trend Chart */}
              <div>
                <div className="bg-white backdrop-blur-xl rounded border border-gray-200 p-1.5 mb-2" style={{
                  boxShadow: '0 20px 25px -5px rgba(0, 0, 0, 0.4), 0 10px 10px -5px rgba(0, 0, 0, 0.2), 0 0 0 1px rgba(209, 213, 219, 0.3)'
                }}>
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-semibold text-gray-700">Visualizza:</span>
                    <div className="flex gap-0.5 bg-gray-100 p-0.5 rounded">
                      <button
                        onClick={() => setViewMode('day')}
                        className={`px-2 py-0.5 rounded text-xs font-semibold ${
                          viewMode === 'day'
                            ? 'bg-teal-600 text-white'
                            : 'text-gray-700 hover:bg-white'
                        }`}
                      >
                        Gg
                      </button>
                      <button
                        onClick={() => setViewMode('week')}
                        className={`px-2 py-0.5 rounded text-xs font-semibold ${
                          viewMode === 'week'
                            ? 'bg-teal-600 text-white'
                            : 'text-gray-700 hover:bg-white'
                        }`}
                      >
                        Sett
                      </button>
                      <button
                        onClick={() => setViewMode('month')}
                        className={`px-2 py-0.5 rounded text-xs font-semibold ${
                          viewMode === 'month'
                            ? 'bg-teal-600 text-white'
                            : 'text-gray-700 hover:bg-white'
                        }`}
                      >
                        Mese
                      </button>
                    </div>
                  </div>
                </div>

                <TrendChart
                  data={analytics.trendData}
                  title={`${viewMode === 'day' ? 'Giornaliero' : viewMode === 'week' ? 'Settimanale' : 'Mensile'}`}
                  yoyData={analytics.yoy?.trends}
                  showYoY={showYoY}
                />
              </div>

              {/* Category Charts */}
              <div>
                <CategoryCharts
                  data={analytics.byCategory}
                  tipo="both"
                  yoyData={analytics.yoy?.categories}
                  showYoY={showYoY}
                  timeData={analytics.categoriesByTime}
                />
              </div>
            </div>

            {/* Category Percentage Table */}
            <div className="mb-2">
              <CategoryPercentageTable data={analytics.byCategory} />
            </div>

            {/* Anomalies and Optimizations */}
            <AnomaliesPanel
              anomalies={analytics.alerts}
              productivity={analytics.productivity}
              centroId={centroId}
              onAnomalyValidated={loadData}
            />

            {/* YoY Comparison Panel */}
            {showYoY && analytics.yoy && (
              <div className="mt-2">
                <YoYComparisonPanel
                  yoyData={analytics.yoy}
                  onClose={() => setShowYoY(false)}
                />
              </div>
            )}
          </>
        )}

        {!analytics && (
          <div className="bg-white rounded-xl shadow-lg border border-gray-100 p-12 text-center">
            <div className="text-6xl mb-4">📊</div>
            <div className="text-xl font-semibold text-gray-600 mb-2">
              Nessun dato disponibile
            </div>
            <p className="text-gray-500">
              Carica i movimenti bancari per visualizzare le analytics
            </p>
          </div>
        )}

        {/* History Modal */}
        {showHistory && (
          <AnomalyHistoryModal
            centroId={centroId}
            onClose={() => setShowHistory(false)}
          />
        )}
      </div>
    </div>
  )
}
