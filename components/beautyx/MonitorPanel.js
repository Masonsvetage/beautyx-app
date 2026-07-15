'use client'

import { Component } from 'react'

// ─── Error Boundary — impedisce che un crash in una card butti giù tutto il panel
class CardErrorBoundary extends Component {
  constructor(props) { super(props); this.state = { error: null } }
  static getDerivedStateFromError(error) { return { error } }
  render() {
    if (this.state.error) {
      return (
        <div className="rounded-lg p-3 text-xs text-red-400 border border-red-500/20 bg-red-500/5">
          Errore rendering card: {this.state.error.message}
        </div>
      )
    }
    return this.props.children
  }
}

export default function MonitorPanel({ monitorData, isVisible }) {
  if (!isVisible) return null

  const renderCard = (card, index) => {
    let CardComponent = null
    switch (card?.type) {
      case 'breakdown': CardComponent = <BreakdownCard data={card} />; break
      case 'metrics':   CardComponent = <MetricsCard   data={card} />; break
      case 'chart':     CardComponent = <ChartCard     data={card} />; break
      case 'draft':     CardComponent = <DraftCard     data={card} />; break
      default:          return null
    }
    return (
      <CardErrorBoundary key={index}>
        {CardComponent}
      </CardErrorBoundary>
    )
  }

  return (
    <div
      className="w-full h-full flex flex-col"
      style={{
        background: 'linear-gradient(135deg, rgba(15, 23, 42, 0.95), rgba(30, 41, 59, 0.95))',
        borderLeft: '2px solid rgba(20, 184, 166, 0.3)',
        boxShadow: 'inset 0 0 40px rgba(20, 184, 166, 0.1)'
      }}
    >
      {/* Header Monitor */}
      <div className="px-4 py-4 border-b border-teal-500/20">
        <div className="flex items-center gap-2">
          <div className="w-2.5 h-2.5 bg-teal-400 rounded-full animate-pulse"></div>
          <h4
            className="text-base font-bold text-teal-300 tracking-wide"
            style={{ textShadow: '0 0 4px rgba(20, 184, 166, 0.4)' }}
          >
            📊 MONITOR DATI
          </h4>
        </div>
        <p className="text-sm text-slate-400 mt-1">
          {monitorData?.title || 'Visualizzazione contestuale'}
        </p>
      </div>

      {/* Content Area */}
      <div
        className="flex-1 overflow-y-auto px-4 py-3 space-y-3"
        style={{ scrollbarWidth: 'thin', scrollbarColor: '#0d9488 #1e293b' }}
      >
        {monitorData?.cards?.length > 0 ? (
          monitorData.cards.map((card, idx) => renderCard(card, idx))
        ) : (
          <div className="h-full flex items-center justify-center">
            <div className="text-center space-y-4 px-6">
              <div
                className="text-teal-400/30 font-mono text-base tracking-wider animate-pulse"
                style={{ textShadow: '0 0 8px rgba(20, 184, 166, 0.3)', fontFamily: "'Courier New', monospace" }}
              >
                <div className="mb-6">┌{'─'.repeat(30)}┐</div>
                <div className="mb-2">│{'\u00A0'.repeat(30)}│</div>
                <div className="mb-2">│{'\u00A0'.repeat(7)}MONITOR READY{'\u00A0'.repeat(10)}│</div>
                <div className="mb-2">│{'\u00A0'.repeat(30)}│</div>
                <div className="mb-2">│{'\u00A0'.repeat(3)}Awaiting data stream...{'\u00A0'.repeat(4)}│</div>
                <div className="mb-2">│{'\u00A0'.repeat(30)}│</div>
                <div className="mb-6">└{'─'.repeat(30)}┘</div>
                <div className="text-sm opacity-50 mt-8">
                  <div>&gt; System: Idle</div>
                  <div>&gt; Status: Listening...</div>
                </div>
              </div>
              <div className="flex justify-center mt-4">
                <span className="inline-block w-2 h-4 bg-teal-400/50 animate-pulse" style={{ animationDuration: '1s' }}></span>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}

// ─── Breakdown Card ────────────────────────────────────────────────────────────
function BreakdownCard({ data }) {
  const { title, total, items = [] } = data
  const fmt = (item) =>
    item.unit === '€'
      ? `€ ${typeof item.value === 'number' ? item.value.toLocaleString('it-IT') : item.value}`
      : `${item.value ?? ''}${item.unit ?? ''}`

  return (
    <div className="rounded-lg p-4" style={{ background: 'rgba(15, 23, 42, 0.6)', border: '1px solid rgba(20, 184, 166, 0.2)' }}>
      <h5 className="text-base font-bold text-emerald-300 mb-3">{title}</h5>
      {total && (
        <div className="mb-3 pb-3 border-b border-teal-500/20">
          <div className="text-sm text-slate-400">{total.label}</div>
          <div className="text-2xl font-bold text-white" style={{ textShadow: '0 0 8px rgba(255,255,255,0.3)' }}>
            {fmt(total)}
          </div>
        </div>
      )}
      <div className="space-y-2.5">
        {items.map((item, idx) => (
          <div key={idx} className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              {item.icon && <span className="text-lg">{item.icon}</span>}
              <span className="text-base text-slate-300">{item.label}</span>
              {item.percentage != null && (
                <span className="text-sm text-teal-400 font-mono">{item.percentage}%</span>
              )}
            </div>
            <span className="text-base font-semibold text-emerald-300">{fmt(item)}</span>
          </div>
        ))}
      </div>
    </div>
  )
}

// ─── Metrics Card ──────────────────────────────────────────────────────────────
function MetricsCard({ data }) {
  const { title, metrics = [] } = data
  return (
    <div className="rounded-lg p-4" style={{ background: 'rgba(15, 23, 42, 0.6)', border: '1px solid rgba(20, 184, 166, 0.2)' }}>
      <h5 className="text-base font-bold text-emerald-300 mb-3">{title}</h5>
      <div className="grid grid-cols-2 gap-4">
        {metrics.map((metric, idx) => (
          <div key={idx} className="text-center">
            <div className="text-sm text-slate-400 mb-1">{metric.label}</div>
            <div className={`text-xl font-bold ${
              metric.trend === 'up' ? 'text-green-400' : metric.trend === 'down' ? 'text-red-400' : 'text-white'
            }`}>
              {metric.value}
            </div>
            {metric.subtitle && <div className="text-sm text-slate-500 mt-1">{metric.subtitle}</div>}
          </div>
        ))}
      </div>
    </div>
  )
}

// ─── Chart Card ───────────────────────────────────────────────────────────────
function ChartCard({ data }) {
  const { title, dataPoints = [] } = data
  const maxValue = dataPoints.length > 0 ? Math.max(...dataPoints.map(p => p.value ?? 0)) : 1

  return (
    <div className="rounded-lg p-4" style={{ background: 'rgba(15, 23, 42, 0.6)', border: '1px solid rgba(20, 184, 166, 0.2)' }}>
      <h5 className="text-base font-bold text-emerald-300 mb-3">{title}</h5>
      <div className="space-y-3">
        {dataPoints.map((point, idx) => {
          const pct = maxValue > 0 ? ((point.value ?? 0) / maxValue) * 100 : 0
          return (
            <div key={idx}>
              <div className="flex items-center justify-between text-sm mb-1">
                <span className="text-slate-400">{point.label}</span>
                <span className="text-emerald-300 font-mono">{point.value}</span>
              </div>
              <div className="h-3 bg-slate-700 rounded-full overflow-hidden">
                <div
                  className="h-full bg-gradient-to-r from-teal-500 to-cyan-500 transition-all duration-500"
                  style={{ width: `${pct}%` }}
                />
              </div>
            </div>
          )
        })}
      </div>
    </div>
  )
}

// ─── Draft Card ───────────────────────────────────────────────────────────────
function DraftCard({ data }) {
  const { title, content, status } = data
  const statusColors = {
    draft:  { bg: 'bg-yellow-500/10', text: 'text-yellow-400', label: 'Bozza' },
    review: { bg: 'bg-blue-500/10',   text: 'text-blue-400',   label: 'In Revisione' },
    ready:  { bg: 'bg-green-500/10',  text: 'text-green-400',  label: 'Pronto' }
  }
  const s = statusColors[status] || statusColors.draft

  return (
    <div className="rounded-lg p-4" style={{ background: 'rgba(15, 23, 42, 0.6)', border: '1px solid rgba(20, 184, 166, 0.2)' }}>
      <div className="flex items-start justify-between mb-3">
        <h5 className="text-base font-bold text-emerald-300">{title}</h5>
        <span className={`text-sm px-2.5 py-1 rounded-full ${s.bg} ${s.text} font-semibold`}>{s.label}</span>
      </div>
      <div className="text-base text-slate-300 leading-relaxed whitespace-pre-wrap">{content}</div>
    </div>
  )
}
