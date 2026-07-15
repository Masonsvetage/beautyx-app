'use client'
import { useState, useEffect, useCallback } from 'react'

const AGENTS_META = {
  beautyx:      { label: 'BeautyX Coordinator', icon: '🤖', color: 'teal',   model: 'claude-sonnet-4',  desc: 'Coordinatore principale. Si interfaccia con l\'utente e applica la metodologia SvetAge.' },
  receptionist: { label: 'Receptionist',         icon: '📓', color: 'blue',   model: 'claude-haiku-4-5', desc: 'Gestione operativa giornaliera: incassi, spese, crediti, appuntamenti, configurazione centro.' },
  analista:     { label: 'Analista',             icon: '📊', color: 'amber',  model: 'claude-sonnet-4',  desc: 'Analisi finanziaria, movimenti bancari, KPI, trend, coerenza dati.' },
  marketing:    { label: 'Marketing',            icon: '📣', color: 'purple', model: 'claude-sonnet-4',  desc: 'Contenuti, campagne email, post social, trend, listino, sondaggi.' },
}

const COLOR = {
  teal:   { ring: 'ring-teal-500/50',   bg: 'bg-teal-500/20',   text: 'text-teal-300',   btn: 'bg-teal-600 hover:bg-teal-500',   badge: 'bg-teal-900/40 border-teal-500/30 text-teal-300' },
  blue:   { ring: 'ring-blue-500/50',   bg: 'bg-blue-500/20',   text: 'text-blue-300',   btn: 'bg-blue-600 hover:bg-blue-500',   badge: 'bg-blue-900/40 border-blue-500/30 text-blue-300' },
  amber:  { ring: 'ring-amber-500/50',  bg: 'bg-amber-500/20',  text: 'text-amber-300',  btn: 'bg-amber-600 hover:bg-amber-500', badge: 'bg-amber-900/40 border-amber-500/30 text-amber-300' },
  purple: { ring: 'ring-purple-500/50', bg: 'bg-purple-500/20', text: 'text-purple-300', btn: 'bg-purple-600 hover:bg-purple-500', badge: 'bg-purple-900/40 border-purple-500/30 text-purple-300' },
}

export default function AgentiConsolePage() {
  const [selectedAgent, setSelectedAgent] = useState('beautyx')
  const [agentData, setAgentData] = useState(null)
  const [editPrompt, setEditPrompt] = useState('')
  const [notes, setNotes] = useState('')
  const [loading, setLoading] = useState(false)
  const [saving, setSaving] = useState(false)
  const [testing, setTesting] = useState(false)
  const [testMessage, setTestMessage] = useState('')
  const [testResponse, setTestResponse] = useState(null)
  const [toast, setToast] = useState(null)
  const [agentsList, setAgentsList] = useState([])
  const [confirmRestore, setConfirmRestore] = useState(null)

  const showToast = (msg, type = 'ok') => {
    setToast({ msg, type })
    setTimeout(() => setToast(null), 3500)
  }

  // Carica lista agenti
  useEffect(() => {
    fetch('/api/admin/agenti')
      .then(r => r.json())
      .then(d => setAgentsList(d.agents || []))
      .catch(() => {})
  }, [])

  // Carica dati agente selezionato
  const loadAgent = useCallback(async (name) => {
    setLoading(true)
    setTestResponse(null)
    try {
      const res = await fetch(`/api/admin/agenti/${name}`)
      const d = await res.json()
      setAgentData(d)
      setEditPrompt(d.active_prompt || '')
      setNotes('')
    } catch {
      showToast('Errore caricamento agente', 'err')
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => { loadAgent(selectedAgent) }, [selectedAgent, loadAgent])

  const handleSave = async () => {
    if (!editPrompt.trim()) return
    setSaving(true)
    try {
      const res = await fetch(`/api/admin/agenti/${selectedAgent}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ prompt: editPrompt, notes, activate: true })
      })
      const d = await res.json()
      if (d.ok) {
        showToast(`✅ Versione ${d.version.version} salvata e attivata`)
        await loadAgent(selectedAgent)
        // Aggiorna lista laterale
        const listRes = await fetch('/api/admin/agenti')
        const listData = await listRes.json()
        setAgentsList(listData.agents || [])
      } else {
        showToast(d.error || 'Errore salvataggio', 'err')
      }
    } catch {
      showToast('Errore di rete', 'err')
    } finally {
      setSaving(false)
    }
  }

  const handleRestore = async (versionId) => {
    try {
      const res = await fetch(`/api/admin/agenti/${selectedAgent}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ version_id: versionId })
      })
      const d = await res.json()
      if (d.ok) {
        showToast('✅ Versione ripristinata')
        setConfirmRestore(null)
        await loadAgent(selectedAgent)
      } else {
        showToast(d.error || 'Errore ripristino', 'err')
      }
    } catch {
      showToast('Errore di rete', 'err')
    }
  }

  const handleTest = async () => {
    if (!testMessage.trim() || !editPrompt.trim()) return
    setTesting(true)
    setTestResponse(null)
    try {
      const res = await fetch('/api/admin/agenti/test', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ agent_name: selectedAgent, prompt: editPrompt, test_message: testMessage })
      })
      const d = await res.json()
      setTestResponse(d)
    } catch {
      setTestResponse({ error: 'Errore di rete' })
    } finally {
      setTesting(false)
    }
  }

  const meta = AGENTS_META[selectedAgent]
  const c = COLOR[meta.color]
  const hasChanges = agentData && editPrompt !== (agentData.active_prompt || '')
  const tokenCount = editPrompt.split(/\s+/).filter(Boolean).length * 1.3 | 0

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 to-slate-800 text-slate-100">

      {/* Toast */}
      {toast && (
        <div className={`fixed top-4 right-4 z-50 px-4 py-3 rounded-lg shadow-lg text-sm font-medium transition-all ${
          toast.type === 'err' ? 'bg-red-800 text-red-100 border border-red-600' : 'bg-teal-800 text-teal-100 border border-teal-600'
        }`}>
          {toast.msg}
        </div>
      )}

      <div className="flex h-screen overflow-hidden">

        {/* ── SIDEBAR ── */}
        <aside className="w-64 flex-shrink-0 bg-slate-900/80 border-r border-slate-700/50 flex flex-col">
          <div className="p-4 border-b border-slate-700/50">
            <h1 className="text-base font-bold text-slate-100">Console Agenti</h1>
            <p className="text-xs text-slate-500 mt-0.5">Gestione System Prompt</p>
          </div>

          <nav className="flex-1 p-3 space-y-1 overflow-y-auto">
            {Object.entries(AGENTS_META).map(([name, info]) => {
              const status = agentsList.find(a => a.name === name)
              const col = COLOR[info.color]
              return (
                <button
                  key={name}
                  onClick={() => setSelectedAgent(name)}
                  className={`w-full text-left p-3 rounded-lg transition-all ${
                    selectedAgent === name
                      ? `${col.bg} ${col.ring} ring-1`
                      : 'hover:bg-slate-800/60'
                  }`}
                >
                  <div className="flex items-center gap-2">
                    <span className="text-base">{info.icon}</span>
                    <div className="flex-1 min-w-0">
                      <div className={`text-sm font-medium truncate ${selectedAgent === name ? col.text : 'text-slate-300'}`}>
                        {info.label}
                      </div>
                      <div className="text-[10px] text-slate-500 truncate">{info.model}</div>
                    </div>
                    {status?.active_version && (
                      <span className={`text-[9px] px-1.5 py-0.5 rounded border ${col.badge} flex-shrink-0`}>
                        v{status.active_version}
                      </span>
                    )}
                  </div>
                  {status && (
                    <div className="mt-1 text-[10px] text-slate-600">
                      {status.total_versions} versioni
                    </div>
                  )}
                </button>
              )
            })}
          </nav>

          {/* Schema agenti */}
          <div className="p-3 border-t border-slate-700/50">
            <div className="text-[10px] text-slate-600 font-mono leading-relaxed">
              <div className="text-slate-500 mb-1">Schema multi-agente:</div>
              <div>Utente → 🤖 BeautyX</div>
              <div className="pl-3">├ 📓 Receptionist</div>
              <div className="pl-3">├ 📊 Analista</div>
              <div className="pl-3">└ 📣 Marketing</div>
            </div>
          </div>
        </aside>

        {/* ── MAIN AREA ── */}
        <div className="flex-1 flex flex-col min-w-0 overflow-hidden">

          {/* Header agente */}
          <div className={`px-6 py-4 border-b border-slate-700/50 flex items-start justify-between flex-shrink-0`}>
            <div>
              <div className="flex items-center gap-3">
                <span className="text-2xl">{meta.icon}</span>
                <div>
                  <h2 className={`text-lg font-bold ${c.text}`}>{meta.label}</h2>
                  <p className="text-xs text-slate-400 mt-0.5">{meta.desc}</p>
                </div>
              </div>
              <div className="flex items-center gap-3 mt-2">
                <span className="text-xs text-slate-500">Modello: <span className="text-slate-300">{meta.model}</span></span>
                {agentData?.active_version && (
                  <span className={`text-xs px-2 py-0.5 rounded border ${c.badge}`}>
                    Versione attiva: {agentData.active_version}
                  </span>
                )}
                <span className="text-xs text-slate-600">~{tokenCount} token</span>
                {hasChanges && <span className="text-xs text-amber-400 animate-pulse">● Modifiche non salvate</span>}
              </div>
            </div>
            <div className="flex items-center gap-2 flex-shrink-0">
              <button
                onClick={() => loadAgent(selectedAgent)}
                disabled={loading}
                className="px-3 py-1.5 bg-slate-700 hover:bg-slate-600 text-slate-300 text-xs rounded transition-all disabled:opacity-50"
                title="Ricarica da DB"
              >
                ↺ Ricarica
              </button>
              <button
                onClick={handleSave}
                disabled={saving || !hasChanges}
                className={`px-4 py-1.5 ${c.btn} text-white text-xs font-bold rounded transition-all disabled:opacity-40 disabled:cursor-not-allowed`}
              >
                {saving ? 'Salvataggio...' : '💾 Salva nuova versione'}
              </button>
            </div>
          </div>

          {/* Body — split: editor + storico */}
          <div className="flex-1 flex min-h-0 overflow-hidden">

            {/* ── EDITOR COLONNA ── */}
            <div className="flex-1 flex flex-col min-w-0 border-r border-slate-700/50">

              {/* Note versione */}
              <div className="px-4 pt-3 pb-2 border-b border-slate-700/30 flex-shrink-0">
                <input
                  type="text"
                  value={notes}
                  onChange={e => setNotes(e.target.value)}
                  placeholder="Note per questa versione (opzionale — es. 'Aggiunta metodologia SvetAge fase 1')"
                  className="w-full bg-slate-800/50 border border-slate-600/40 rounded px-3 py-1.5 text-xs text-slate-300 placeholder-slate-600 outline-none focus:border-slate-500"
                />
              </div>

              {/* Textarea prompt */}
              {loading ? (
                <div className="flex-1 flex items-center justify-center">
                  <div className="text-slate-500 text-sm animate-pulse">Caricamento prompt...</div>
                </div>
              ) : (
                <textarea
                  value={editPrompt}
                  onChange={e => setEditPrompt(e.target.value)}
                  className="flex-1 bg-slate-900/30 text-slate-200 text-sm font-mono p-4 resize-none outline-none focus:bg-slate-900/50 transition-colors"
                  style={{ lineHeight: '1.6', scrollbarWidth: 'thin', scrollbarColor: '#334155 #1e293b' }}
                  placeholder="Inserisci il system prompt dell'agente..."
                  spellCheck={false}
                />
              )}

              {/* ── PANNELLO TEST ── */}
              <div className="border-t border-slate-700/50 flex-shrink-0 bg-slate-900/20">
                <div className="px-4 py-2 border-b border-slate-700/30 flex items-center justify-between">
                  <span className="text-xs font-semibold text-slate-400">🧪 Test risposta</span>
                  <span className="text-[10px] text-slate-600">Usa il prompt nell'editor (non serve salvare)</span>
                </div>
                <div className="p-3 flex gap-2">
                  <input
                    type="text"
                    value={testMessage}
                    onChange={e => setTestMessage(e.target.value)}
                    onKeyDown={e => e.key === 'Enter' && handleTest()}
                    placeholder="Scrivi un messaggio di test..."
                    className="flex-1 bg-slate-800/60 border border-slate-600/40 rounded px-3 py-1.5 text-xs text-slate-300 placeholder-slate-600 outline-none focus:border-slate-500"
                  />
                  <button
                    onClick={handleTest}
                    disabled={testing || !testMessage.trim() || !editPrompt.trim()}
                    className={`px-4 py-1.5 ${c.btn} text-white text-xs font-bold rounded transition-all disabled:opacity-40`}
                  >
                    {testing ? '...' : 'Invia ▶'}
                  </button>
                </div>
                {testResponse && (
                  <div className="px-3 pb-3">
                    {testResponse.error ? (
                      <div className="bg-red-900/30 border border-red-700/50 rounded p-3 text-xs text-red-300">
                        ❌ {testResponse.error}
                      </div>
                    ) : (
                      <div className="bg-slate-800/60 border border-slate-700/40 rounded p-3">
                        <div className="flex items-center justify-between mb-2">
                          <span className={`text-[10px] font-bold ${c.text}`}>{meta.icon} {meta.label}</span>
                          <span className="text-[10px] text-slate-500">
                            {testResponse.tokens_input}↓ {testResponse.tokens_output}↑ token — {testResponse.model}
                          </span>
                        </div>
                        <p className="text-xs text-slate-300 whitespace-pre-wrap leading-relaxed">{testResponse.response}</p>
                      </div>
                    )}
                  </div>
                )}
              </div>
            </div>

            {/* ── STORICO VERSIONI ── */}
            <div className="w-72 flex-shrink-0 flex flex-col overflow-hidden bg-slate-900/20">
              <div className="px-4 py-3 border-b border-slate-700/30 flex-shrink-0">
                <h3 className="text-xs font-semibold text-slate-400">
                  Storico versioni ({agentData?.versions?.length || 0})
                </h3>
              </div>
              <div className="flex-1 overflow-y-auto p-3 space-y-2" style={{ scrollbarWidth: 'thin' }}>
                {(agentData?.versions || []).length === 0 ? (
                  <p className="text-xs text-slate-600 text-center py-4">Nessuna versione salvata</p>
                ) : (
                  agentData.versions.map(v => (
                    <div
                      key={v.id}
                      className={`p-3 rounded-lg border transition-all ${
                        v.is_active
                          ? `${c.bg} ${c.ring} ring-1 border-transparent`
                          : 'bg-slate-800/40 border-slate-700/40 hover:bg-slate-800/60'
                      }`}
                    >
                      <div className="flex items-center justify-between mb-1">
                        <span className={`text-xs font-bold ${v.is_active ? c.text : 'text-slate-400'}`}>
                          v{v.version}
                        </span>
                        {v.is_active && (
                          <span className={`text-[9px] px-1.5 py-0.5 rounded border ${c.badge}`}>ATTIVA</span>
                        )}
                      </div>
                      <div className="text-[10px] text-slate-500 mb-1">
                        {new Date(v.updated_at || v.created_at).toLocaleDateString('it-IT', {
                          day: '2-digit', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit'
                        })}
                      </div>
                      {v.notes && (
                        <p className="text-[10px] text-slate-400 italic mb-2 line-clamp-2">{v.notes}</p>
                      )}
                      {!v.is_active && (
                        confirmRestore === v.id ? (
                          <div className="flex gap-1 mt-1">
                            <button
                              onClick={() => handleRestore(v.id)}
                              className="flex-1 px-2 py-1 bg-red-700 hover:bg-red-600 text-white text-[10px] rounded"
                            >
                              Conferma
                            </button>
                            <button
                              onClick={() => setConfirmRestore(null)}
                              className="flex-1 px-2 py-1 bg-slate-600 hover:bg-slate-500 text-slate-300 text-[10px] rounded"
                            >
                              Annulla
                            </button>
                          </div>
                        ) : (
                          <button
                            onClick={() => setConfirmRestore(v.id)}
                            className="mt-1 w-full px-2 py-1 bg-slate-700 hover:bg-slate-600 text-slate-400 hover:text-slate-200 text-[10px] rounded transition-all"
                          >
                            ↩ Ripristina
                          </button>
                        )
                      )}
                    </div>
                  ))
                )}
              </div>

              {/* Info dinamiche */}
              <div className="p-3 border-t border-slate-700/30 flex-shrink-0">
                <div className="bg-slate-800/40 rounded p-2 text-[10px] text-slate-500 space-y-1">
                  <div className="font-semibold text-slate-400 mb-1">Sezioni dinamiche</div>
                  <div>Le seguenti sezioni sono sempre aggiunte dal codice a runtime e <strong>non</strong> vanno scritte nel prompt:</div>
                  <div className="mt-1 space-y-0.5 text-[9px] font-mono">
                    <div># CONTESTO ATTUALE</div>
                    <div># COMPLETEZZA DATI</div>
                    <div># MEMORIA PERSISTENTE</div>
                    <div># CREDITI IN SCADENZA</div>
                    <div># INSIGHTS ATTIVI</div>
                    <div># DATI CONTESTO PAGINA</div>
                  </div>
                </div>
              </div>
            </div>

          </div>
        </div>
      </div>
    </div>
  )
}
