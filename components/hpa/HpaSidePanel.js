'use client'

import { useState, useEffect, useCallback } from 'react'
import SessionReportForm from './SessionReportForm'

// === BEAUTYX HISTORY VIEWER ===
function BeautyxHistoryViewer({ centroId }) {
  const [conversations, setConversations] = useState([])
  const [loading, setLoading] = useState(true)
  const [selectedConv, setSelectedConv] = useState(null)
  const [convMessages, setConvMessages] = useState([])
  const [loadingMessages, setLoadingMessages] = useState(false)

  useEffect(() => {
    if (centroId) loadConversations()
  }, [centroId])

  const loadConversations = async () => {
    setLoading(true)
    try {
      const res = await fetch(`/api/hpa/beautyx-history?centro_id=${centroId}`)
      if (res.ok) {
        const data = await res.json()
        setConversations(data.conversations || [])
      }
    } catch (error) {
      console.error('Errore caricamento storico:', error)
    } finally {
      setLoading(false)
    }
  }

  const loadMessages = async (convId) => {
    if (selectedConv === convId) {
      setSelectedConv(null)
      return
    }
    setSelectedConv(convId)
    setLoadingMessages(true)
    try {
      const res = await fetch(`/api/hpa/beautyx-history?centro_id=${centroId}&conversation_id=${convId}`)
      if (res.ok) {
        const data = await res.json()
        setConvMessages(data.messages || [])
      }
    } catch (error) {
      console.error('Errore caricamento messaggi:', error)
    } finally {
      setLoadingMessages(false)
    }
  }

  const formatDate = (dateStr) => {
    if (!dateStr) return ''
    return new Date(dateStr).toLocaleDateString('it-IT', {
      day: '2-digit', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit'
    })
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center py-8">
        <div className="w-6 h-6 border-2 border-emerald-500 border-t-transparent rounded-full animate-spin" />
      </div>
    )
  }

  if (conversations.length === 0) {
    return (
      <div className="text-center py-8 text-slate-400 text-sm">
        Nessuna conversazione BeautyX trovata per questo centro
      </div>
    )
  }

  return (
    <div className="space-y-2">
      {conversations.map(conv => (
        <div key={conv.id}>
          <button
            onClick={() => loadMessages(conv.id)}
            className={`w-full text-left px-3 py-2 rounded-lg transition-all ${
              selectedConv === conv.id
                ? 'bg-emerald-500/20 border border-emerald-500/40'
                : 'bg-slate-800/50 hover:bg-slate-700/50 border border-slate-600/30'
            }`}
          >
            <div className="flex items-center justify-between">
              <span className="text-sm text-white font-medium truncate">
                {conv.pinned_by_hpa && <span className="mr-1">🔒</span>}
                {conv.titolo || 'Conversazione'}
              </span>
              <span className="text-xs text-slate-400 flex-shrink-0 ml-2">
                {conv.messaggi_count || 0} msg
              </span>
            </div>
            <div className="text-xs text-slate-500 mt-0.5">
              {formatDate(conv.data_ultimo_messaggio || conv.data_inizio)}
              {conv.attiva && <span className="ml-2 text-emerald-400">(attiva)</span>}
            </div>
          </button>

          {/* Messaggi espansi */}
          {selectedConv === conv.id && (
            <div className="mt-1 ml-2 border-l-2 border-emerald-500/30 pl-3 max-h-[300px] overflow-y-auto"
              style={{ scrollbarWidth: 'thin', scrollbarColor: '#0d9488 #1e293b' }}
            >
              {loadingMessages ? (
                <div className="py-3 text-center">
                  <div className="w-4 h-4 border-2 border-emerald-500 border-t-transparent rounded-full animate-spin inline-block" />
                </div>
              ) : convMessages.length === 0 ? (
                <p className="text-xs text-slate-500 py-2">Nessun messaggio</p>
              ) : (
                convMessages.map(msg => (
                  <div key={msg.id} className="py-1.5">
                    <div className="text-[10px] text-slate-500">{formatDate(msg.timestamp)}</div>
                    <div className={`text-xs leading-relaxed ${
                      msg.sender === 'user' ? 'text-white' : 'text-emerald-300'
                    }`}
                      style={{ fontFamily: "'Courier New', monospace" }}
                    >
                      <span className="font-bold">{msg.sender === 'user' ? '>' : '> AI:'}</span>{' '}
                      {msg.contenuto?.substring(0, 300)}
                      {msg.contenuto?.length > 300 && '...'}
                    </div>
                  </div>
                ))
              )}
            </div>
          )}
        </div>
      ))}
    </div>
  )
}

// === REPORTS LIST ===
function ReportsList({ centroId }) {
  const [reports, setReports] = useState([])
  const [loading, setLoading] = useState(true)
  const [showForm, setShowForm] = useState(false)
  const [editReport, setEditReport] = useState(null)
  const [expandedId, setExpandedId] = useState(null)

  const loadReports = useCallback(async () => {
    if (!centroId) return
    setLoading(true)
    try {
      const res = await fetch(`/api/hpa/reports?centro_id=${centroId}`)
      if (res.ok) {
        const data = await res.json()
        setReports(data.reports || [])
      }
    } catch (error) {
      console.error('Errore caricamento report:', error)
    } finally {
      setLoading(false)
    }
  }, [centroId])

  useEffect(() => {
    loadReports()
  }, [loadReports])

  const handleSaved = (report) => {
    setShowForm(false)
    setEditReport(null)
    loadReports()
  }

  const formatDate = (dateStr) => {
    return new Date(dateStr).toLocaleDateString('it-IT', {
      day: '2-digit', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit'
    })
  }

  const obiLabel = {
    non_definiti: 'Non definiti',
    definiti_non_focalizzato: 'Non focalizzato',
    focalizzato: 'Focalizzato',
    raggiunto: 'Raggiunto',
    superato: 'Superato'
  }

  const valLabel = {
    eccellente: 'Eccellente',
    buono: 'Buono',
    sufficiente: 'Sufficiente',
    insufficiente: 'Insufficiente',
    critico: 'Critico'
  }

  const valColor = {
    eccellente: 'text-emerald-400',
    buono: 'text-green-400',
    sufficiente: 'text-amber-400',
    insufficiente: 'text-orange-400',
    critico: 'text-red-400'
  }

  if (showForm || editReport) {
    return (
      <SessionReportForm
        centroId={centroId}
        editReport={editReport}
        onSaved={handleSaved}
        onCancel={() => { setShowForm(false); setEditReport(null) }}
      />
    )
  }

  return (
    <div>
      <div className="flex items-center justify-between mb-3">
        <h3 className="text-sm font-semibold text-slate-300 uppercase tracking-wider">Report Sessioni</h3>
        <button
          onClick={() => setShowForm(true)}
          className="px-3 py-1.5 bg-purple-500 hover:bg-purple-600 text-white text-xs font-medium rounded-lg transition-colors"
        >
          + Nuovo Report
        </button>
      </div>

      {loading ? (
        <div className="flex items-center justify-center py-6">
          <div className="w-5 h-5 border-2 border-purple-500 border-t-transparent rounded-full animate-spin" />
        </div>
      ) : reports.length === 0 ? (
        <div className="text-center py-6 text-slate-400 text-sm">
          Nessun report. Crea il primo dopo una sessione chat.
        </div>
      ) : (
        <div className="space-y-2">
          {reports.map(r => (
            <div key={r.id} className="bg-slate-800/50 border border-slate-700/50 rounded-lg overflow-hidden">
              <button
                onClick={() => setExpandedId(expandedId === r.id ? null : r.id)}
                className="w-full text-left px-3 py-2 hover:bg-slate-700/30 transition-colors"
              >
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <span className={`text-xs font-medium ${valColor[r.valutazione_beautyx] || 'text-slate-400'}`}>
                      {r.valutazione_punteggio}/5
                    </span>
                    <span className="text-sm text-white truncate">{r.sintesi?.substring(0, 60)}...</span>
                  </div>
                  <span className="text-xs text-slate-500 flex-shrink-0 ml-2">
                    {formatDate(r.created_at)}
                  </span>
                </div>
                {r.user_profiles && (
                  <p className="text-xs text-slate-500 mt-0.5">
                    HPA: {r.user_profiles.nome} {r.user_profiles.cognome}
                    {r.durata_minuti && <span className="ml-2">({r.durata_minuti} min)</span>}
                  </p>
                )}
              </button>

              {expandedId === r.id && (
                <div className="px-3 pb-3 space-y-2 border-t border-slate-700/50 pt-2">
                  <div>
                    <p className="text-xs text-slate-400 font-medium mb-0.5">Sintesi</p>
                    <p className="text-sm text-white whitespace-pre-wrap">{r.sintesi}</p>
                  </div>
                  {r.punti_forza && (
                    <div>
                      <p className="text-xs text-green-400 font-medium mb-0.5">Punti di forza</p>
                      <p className="text-sm text-slate-300 whitespace-pre-wrap">{r.punti_forza}</p>
                    </div>
                  )}
                  {r.punti_debolezza && (
                    <div>
                      <p className="text-xs text-amber-400 font-medium mb-0.5">Aree di miglioramento</p>
                      <p className="text-sm text-slate-300 whitespace-pre-wrap">{r.punti_debolezza}</p>
                    </div>
                  )}
                  <div className="flex gap-4">
                    <div>
                      <p className="text-xs text-slate-400 font-medium mb-0.5">Obiettivi</p>
                      <p className="text-sm text-slate-300">{obiLabel[r.obiettivi_stato] || r.obiettivi_stato}</p>
                    </div>
                    <div>
                      <p className="text-xs text-slate-400 font-medium mb-0.5">Rapporto BeautyX</p>
                      <p className={`text-sm font-medium ${valColor[r.valutazione_beautyx] || 'text-slate-300'}`}>
                        {valLabel[r.valutazione_beautyx] || r.valutazione_beautyx}
                      </p>
                    </div>
                  </div>
                  {r.obiettivi_note && (
                    <div>
                      <p className="text-xs text-slate-400 font-medium mb-0.5">Note obiettivi</p>
                      <p className="text-sm text-slate-300 whitespace-pre-wrap">{r.obiettivi_note}</p>
                    </div>
                  )}
                  {r.valutazione_beautyx_note && (
                    <div>
                      <p className="text-xs text-slate-400 font-medium mb-0.5">Note BeautyX</p>
                      <p className="text-sm text-slate-300 whitespace-pre-wrap">{r.valutazione_beautyx_note}</p>
                    </div>
                  )}
                  {r.raccomandazioni && (
                    <div>
                      <p className="text-xs text-purple-400 font-medium mb-0.5">Raccomandazioni</p>
                      <p className="text-sm text-slate-300 whitespace-pre-wrap">{r.raccomandazioni}</p>
                    </div>
                  )}
                  {/* Bottone modifica se e' recente (entro 24h) */}
                  {new Date() - new Date(r.created_at) < 24 * 60 * 60 * 1000 && (
                    <button
                      onClick={() => setEditReport(r)}
                      className="text-xs text-purple-400 hover:text-purple-300 underline mt-1"
                    >
                      Modifica report
                    </button>
                  )}
                </div>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  )
}

// === MAIN SIDE PANEL ===
export default function HpaSidePanel({ centroId }) {
  const [activeTab, setActiveTab] = useState('history')

  const tabs = [
    { id: 'history', label: 'Storico AI', icon: '🤖' },
    { id: 'reports', label: 'Report', icon: '📋' }
  ]

  return (
    <div
      className="h-full flex flex-col"
      style={{
        background: 'linear-gradient(135deg, rgba(15, 23, 42, 0.98), rgba(30, 20, 50, 0.95))',
        border: '2px solid rgba(168, 85, 247, 0.3)',
        borderRadius: '1rem'
      }}
    >
      {/* Tab Header */}
      <div className="flex border-b border-purple-500/30 flex-shrink-0">
        {tabs.map(tab => (
          <button
            key={tab.id}
            onClick={() => setActiveTab(tab.id)}
            className={`flex-1 px-4 py-3 text-sm font-medium transition-all ${
              activeTab === tab.id
                ? 'text-purple-300 border-b-2 border-purple-400 bg-purple-500/10'
                : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800/50'
            }`}
          >
            <span className="mr-1.5">{tab.icon}</span>
            {tab.label}
          </button>
        ))}
      </div>

      {/* Tab Content */}
      <div className="flex-1 overflow-y-auto p-4" style={{ scrollbarWidth: 'thin', scrollbarColor: '#a855f7 #1e293b' }}>
        {activeTab === 'history' && <BeautyxHistoryViewer centroId={centroId} />}
        {activeTab === 'reports' && <ReportsList centroId={centroId} />}
      </div>
    </div>
  )
}
