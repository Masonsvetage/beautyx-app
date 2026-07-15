'use client'
/**
 * Impostazioni → Integrazioni → Koibox
 * Solo gestione chiave API: inserimento, test, salvataggio, disconnessione.
 * Sync, import XLS, diagnostica e pulizia sono nella Console Dati in Dashboard.
 */
import { useState, useEffect, useCallback } from 'react'
import Link from 'next/link'

export default function KoiboxIntegrazioniPage() {
  const [apiStatus, setApiStatus] = useState(null)
  const [loading, setLoading]     = useState(true)
  const [apiKey, setApiKey]       = useState('')
  const [showInput, setShowInput] = useState(false)
  const [saving, setSaving]       = useState(false)
  const [testing, setTesting]     = useState(false)
  const [testResult, setTestResult] = useState(null)
  const [saveError, setSaveError] = useState(null)

  const loadStatus = useCallback(async () => {
    setLoading(true)
    try {
      const res  = await fetch('/api/user/integrazioni/koibox')
      const data = await res.json()
      setApiStatus(data)
    } catch { /* silent */ }
    setLoading(false)
  }, [])

  useEffect(() => { loadStatus() }, [loadStatus])

  const handleTest = async () => {
    if (!apiKey.trim()) return
    setTesting(true); setTestResult(null)
    try {
      const res  = await fetch('/api/user/integrazioni/koibox/test', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ api_key: apiKey.trim() }),
      })
      setTestResult(await res.json())
    } catch (err) { setTestResult({ ok: false, error: err.message }) }
    setTesting(false)
  }

  const handleSave = async () => {
    if (!apiKey.trim()) return
    setSaving(true); setSaveError(null)
    try {
      const res  = await fetch('/api/user/integrazioni/koibox', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ api_key: apiKey.trim() }),
      })
      const data = await res.json()
      if (!data.ok) throw new Error(data.error || 'Errore durante il salvataggio')
      setApiKey(''); setShowInput(false); setTestResult(null)
      await loadStatus()
    } catch (err) { setSaveError(err.message) }
    setSaving(false)
  }

  const handleDisconnect = async () => {
    if (!confirm('Rimuovere la chiave API Koibox?')) return
    setSaving(true)
    try { await fetch('/api/user/integrazioni/koibox', { method: 'DELETE' }); await loadStatus() }
    catch { /* silent */ }
    setSaving(false)
  }

  const fmtDate = iso => iso ? new Date(iso).toLocaleDateString('it-IT', { day: '2-digit', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' }) : null

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900 p-4 md:p-6">
      <div className="max-w-xl mx-auto space-y-6">

        {/* Breadcrumb + Header */}
        <div>
          <div className="flex items-center gap-2 text-xs text-slate-500 mb-4">
            <Link href="/impostazioni" className="hover:text-slate-300">Impostazioni</Link>
            <span>/</span>
            <Link href="/impostazioni/integrazioni" className="hover:text-slate-300">Integrazioni</Link>
            <span>/</span>
            <span className="text-slate-300">Koibox</span>
          </div>
          <div className="flex items-center gap-3">
            <div className="w-11 h-11 bg-gradient-to-br from-teal-500 to-cyan-500 rounded-xl flex items-center justify-center text-2xl">🔗</div>
            <div>
              <h1 className="text-2xl font-bold text-white">Koibox — Chiave API</h1>
              <p className="text-sm text-slate-400">Collega il tuo account Koibox per abilitare la sincronizzazione automatica</p>
            </div>
          </div>
        </div>

        {/* Card stato connessione */}
        {loading ? (
          <div className="bg-slate-800/40 rounded-xl border border-slate-700/50 p-5 animate-pulse">
            <div className="h-4 w-40 bg-slate-700 rounded mb-2" />
            <div className="h-3 w-64 bg-slate-700/60 rounded" />
          </div>
        ) : (
          <div className={`rounded-xl border p-5 space-y-4 ${apiStatus?.connected ? 'bg-teal-500/5 border-teal-500/30' : 'bg-slate-800/40 border-slate-700/50'}`}>
            {/* Stato */}
            <div className="flex items-start justify-between gap-4 flex-wrap">
              <div className="flex items-center gap-3">
                <div className={`w-3 h-3 rounded-full flex-shrink-0 ${apiStatus?.connected ? 'bg-teal-400' : 'bg-slate-500'}`} />
                <div>
                  <p className="font-semibold text-white text-sm">
                    {apiStatus?.connected ? 'API connessa' : 'API non configurata'}
                  </p>
                  {apiStatus?.connected && (
                    <p className="text-xs text-slate-400 mt-0.5">
                      Chiave: <span className="font-mono text-slate-300">{apiStatus.masked_key}</span>
                      {apiStatus.last_sync_at && <span className="ml-3">Ultima sync: {fmtDate(apiStatus.last_sync_at)}</span>}
                    </p>
                  )}
                  {!apiStatus?.connected && (
                    <p className="text-xs text-slate-500 mt-0.5">Inserisci la tua API Key per abilitare la sincronizzazione</p>
                  )}
                </div>
              </div>

              {apiStatus?.connected && !showInput && (
                <div className="flex items-center gap-2">
                  <button onClick={() => setShowInput(true)}
                    className="text-xs px-3 py-1.5 rounded-lg bg-slate-700/60 hover:bg-slate-700 text-slate-300 transition-colors">
                    Cambia chiave
                  </button>
                  <button onClick={handleDisconnect} disabled={saving}
                    className="text-xs px-3 py-1.5 rounded-lg bg-red-500/10 hover:bg-red-500/20 text-red-400 border border-red-500/20 transition-colors">
                    Disconnetti
                  </button>
                </div>
              )}
              {!apiStatus?.connected && !showInput && (
                <button onClick={() => setShowInput(true)}
                  className="text-sm px-4 py-2 rounded-lg bg-teal-500 hover:bg-teal-400 text-slate-900 font-medium transition-colors">
                  Connetti Koibox
                </button>
              )}
            </div>

            {/* Form inserimento chiave */}
            {showInput && (
              <div className="space-y-3 pt-2 border-t border-slate-700/40">
                <div>
                  <label className="text-xs text-slate-400 mb-1 block">API Key Koibox</label>
                  <div className="flex gap-2">
                    <input
                      type="password"
                      value={apiKey}
                      onChange={e => { setApiKey(e.target.value); setTestResult(null) }}
                      placeholder="Incolla la tua API Key…"
                      className="flex-1 bg-slate-900/60 border border-slate-600/50 rounded-lg px-3 py-2 text-sm text-white placeholder-slate-600 focus:outline-none focus:border-teal-500/50 font-mono"
                    />
                    <button onClick={handleTest} disabled={testing || !apiKey.trim()}
                      className="px-3 py-2 rounded-lg bg-slate-700/60 hover:bg-slate-700 text-slate-300 text-sm transition-colors disabled:opacity-40">
                      {testing ? '…' : 'Testa'}
                    </button>
                  </div>
                  <p className="text-xs text-slate-600 mt-1">Trova la chiave in Koibox → Configurazione → Integrations API</p>
                </div>

                {testResult && (
                  <div className={`flex items-center gap-2 text-sm px-3 py-2 rounded-lg ${testResult.ok ? 'bg-teal-500/10 text-teal-300 border border-teal-500/20' : 'bg-red-500/10 text-red-300 border border-red-500/20'}`}>
                    <span>{testResult.ok ? '✓' : '✕'}</span>
                    <span>{testResult.ok ? 'Connessione riuscita — puoi salvare' : testResult.error}</span>
                  </div>
                )}
                {saveError && <p className="text-xs text-red-400">{saveError}</p>}

                <div className="flex items-center gap-2">
                  <button onClick={handleSave} disabled={saving || !apiKey.trim()}
                    className="px-4 py-2 rounded-lg bg-teal-500 hover:bg-teal-400 text-slate-900 text-sm font-medium transition-colors disabled:opacity-40">
                    {saving ? 'Salvataggio…' : 'Salva chiave'}
                  </button>
                  <button onClick={() => { setShowInput(false); setApiKey(''); setTestResult(null) }}
                    className="px-4 py-2 rounded-lg text-slate-400 hover:text-white text-sm transition-colors">
                    Annulla
                  </button>
                </div>
              </div>
            )}
          </div>
        )}

        {/* Link alla console */}
        {apiStatus?.connected && (
          <div className="bg-teal-500/10 border border-teal-500/20 rounded-xl p-4 flex items-start gap-3">
            <span className="text-xl">📊</span>
            <div>
              <p className="text-teal-300 font-semibold text-sm mb-1">API connessa correttamente</p>
              <p className="text-slate-400 text-xs mb-2">
                Usa la <strong className="text-white">Console Importazione Dati in Dashboard</strong> per sincronizzare, importare file XLS, verificare i dati e vedere subito i benchmark aggiornati.
              </p>
              <Link href="/dashboard" className="text-xs text-teal-400 hover:text-teal-300 underline">
                Vai alla Dashboard →
              </Link>
            </div>
          </div>
        )}

      </div>
    </div>
  )
}
