'use client'
/**
 * ConsoleDatiWidget — Console importazione dati nella dashboard.
 * Non collassabile. Contiene:
 * - Selezione periodo + Sincronizza Koibox + Pulisci e risincronizza
 * - Import XLS per tutti i tipi (Clienti, Casse, Servizi, Appuntamenti, Riepilogo Casse)
 * - Diagnostica completa
 * - Feedback immediato (i benchmark e le medie sopra si aggiornano via onDataChanged)
 */
import { useState, useEffect, useRef, useCallback } from 'react'

// ─── Helpers ──────────────────────────────────────────────────────────────────
const fmtEur = v => `€${parseFloat(v || 0).toLocaleString('it-IT', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`
const fmtDate = (iso) => iso ? new Date(iso).toLocaleDateString('it-IT', { day: '2-digit', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' }) : null

// ─── Preset periodo ────────────────────────────────────────────────────────────
const PRESETS = [
  { id: '7d',    label: '7 giorni',   giorni: 7   },
  { id: '30d',   label: '30 giorni',  giorni: 30  },
  { id: '90d',   label: '3 mesi',     giorni: 90  },
  { id: '180d',  label: '6 mesi',     giorni: 180 },
  { id: '365d',  label: '1 anno',     giorni: 365 },
  { id: 'custom',label: 'Personaliz.',giorni: null },
]

function toDateStr(date) { return date.toISOString().split('T')[0] }

// ─── Sezione Sync API ─────────────────────────────────────────────────────────
function SyncSection({ onDataChanged, compact = false }) {
  const oggi = toDateStr(new Date())
  const [preset, setPreset]     = useState('90d')
  const [dataDa, setDataDa]     = useState(toDateStr(new Date(Date.now() - 90 * 86400000)))
  const [dataA, setDataA]       = useState(oggi)
  const [syncing, setSyncing]   = useState(false)
  const [cleaning, setCleaning] = useState(false)
  const [result, setResult]     = useState(null)
  const [koiboxOk, setKoiboxOk] = useState(false)
  const [lastSync, setLastSync] = useState(null)

  useEffect(() => {
    fetch('/api/user/integrazioni/koibox')
      .then(r => r.json())
      .then(d => { setKoiboxOk(d.connected); setLastSync(d.last_sync_at) })
      .catch(() => {})
  }, [])

  const buildOpts = () => {
    if (compact) return { giorni_casse: 60, giorni_agenda: 30 }
    if (preset === 'custom') return { data_da: dataDa, data_a: dataA }
    const p = PRESETS.find(x => x.id === preset)
    return { data_da: toDateStr(new Date(Date.now() - p.giorni * 86400000)), data_a: oggi }
  }

  const handleSync = async () => {
    setSyncing(true); setResult(null)
    try {
      const res  = await fetch('/api/user/koibox/sync', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(buildOpts()) })
      const data = await res.json()
      setResult({ ok: data.ok, msg: data.messaggio, errors: data.errors })
      if (data.ok || res.status === 207) onDataChanged?.()
    } catch (e) { setResult({ ok: false, msg: e.message }) }
    setSyncing(false)
  }

  const handleCleanSync = async () => {
    if (!confirm('Cancella tutti i dati Koibox importati e risincronizza da zero?')) return
    setCleaning(true); setResult(null)
    try {
      const rClean = await fetch('/api/user/koibox/cleanup', { method: 'POST' })
      const dClean = await rClean.json()
      if (!dClean.ok && dClean.errors?.length) {
        setResult({ ok: false, msg: `Pulizia parziale: ${dClean.errors.join('; ')}` })
        setCleaning(false); return
      }
      setSyncing(true)
      const res  = await fetch('/api/user/koibox/sync', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(buildOpts()) })
      const data = await res.json()
      setResult({ ok: data.ok, msg: `Pulizia OK. ${data.messaggio}`, errors: data.errors })
      if (data.ok || res.status === 207) onDataChanged?.()
    } catch (e) { setResult({ ok: false, msg: e.message }) }
    setCleaning(false); setSyncing(false)
  }

  if (!koiboxOk) {
    return (
      <div className="p-3 rounded-xl border border-slate-700/40 bg-slate-800/30 text-xs text-slate-500">
        API Koibox non connessa.{' '}
        <a href="/impostazioni/integrazioni/koibox" className="text-teal-400 hover:underline">Configura chiave API →</a>
      </div>
    )
  }

  // ── Compact mode ──────────────────────────────────────────────────────────
  if (compact) {
    return (
      <div className="space-y-2">
        <div className="flex items-center gap-2 flex-wrap">
          <button onClick={handleSync} disabled={syncing || cleaning}
            className="text-xs px-3 py-1.5 rounded-lg bg-teal-500/15 hover:bg-teal-500/25 text-teal-300 border border-teal-500/30 transition-colors disabled:opacity-40 flex items-center gap-1.5">
            {syncing && !cleaning
              ? <><span className="w-3 h-3 border border-teal-400 border-t-transparent rounded-full animate-spin" /> Sincronizzazione…</>
              : '↻ Sincronizza Koibox (agenda recente)'}
          </button>
          {lastSync && (
            <span className="text-[10px] text-slate-600">Ultima: {fmtDate(lastSync)}</span>
          )}
        </div>
        {result && (
          <div className={`px-3 py-2 rounded-lg text-xs ${result.ok ? 'bg-teal-500/10 border border-teal-500/20 text-teal-300' : 'bg-amber-500/10 border border-amber-500/20 text-amber-300'}`}>
            <p className="line-clamp-2">{result.msg}</p>
          </div>
        )}
      </div>
    )
  }

  // ── Full mode ─────────────────────────────────────────────────────────────
  return (
    <div className="space-y-3">
      <div className="flex items-center gap-2 flex-wrap">
        <p className="text-xs text-slate-400 font-medium">Periodo:</p>
        {PRESETS.map(p => (
          <button key={p.id} onClick={() => {
            setPreset(p.id)
            if (p.giorni) { setDataDa(toDateStr(new Date(Date.now() - p.giorni * 86400000))); setDataA(oggi) }
          }} className={`text-xs px-2.5 py-1 rounded-lg border transition-colors ${preset === p.id ? 'bg-teal-500/20 border-teal-500/40 text-teal-300' : 'bg-slate-700/40 border-slate-600/40 text-slate-400 hover:text-white'}`}>
            {p.label}
          </button>
        ))}
      </div>

      {preset === 'custom' && (
        <div className="flex items-center gap-3 flex-wrap">
          <div className="flex flex-col gap-1">
            <label className="text-[11px] text-slate-500">Dal</label>
            <input type="date" value={dataDa} max={dataA} onChange={e => setDataDa(e.target.value)}
              className="bg-slate-900/60 border border-slate-600/50 rounded-lg px-2.5 py-1.5 text-sm text-white focus:outline-none focus:border-teal-500/50" />
          </div>
          <span className="text-slate-600 mt-4">→</span>
          <div className="flex flex-col gap-1">
            <label className="text-[11px] text-slate-500">Al</label>
            <input type="date" value={dataA} min={dataDa} max={oggi} onChange={e => setDataA(e.target.value)}
              className="bg-slate-900/60 border border-slate-600/50 rounded-lg px-2.5 py-1.5 text-sm text-white focus:outline-none focus:border-teal-500/50" />
          </div>
        </div>
      )}

      <div className="flex items-center gap-2 flex-wrap">
        <button onClick={handleSync} disabled={syncing || cleaning}
          className="text-sm px-4 py-2 rounded-lg bg-teal-500/15 hover:bg-teal-500/25 text-teal-300 border border-teal-500/30 transition-colors disabled:opacity-40 flex items-center gap-2">
          {syncing && !cleaning
            ? <><span className="w-3.5 h-3.5 border border-teal-400 border-t-transparent rounded-full animate-spin" /> Sincronizzazione…</>
            : '↻ Sincronizza Koibox'}
        </button>
        <button onClick={handleCleanSync} disabled={syncing || cleaning}
          className="text-sm px-4 py-2 rounded-lg bg-orange-500/10 hover:bg-orange-500/20 text-orange-300 border border-orange-500/20 transition-colors disabled:opacity-40 flex items-center gap-2">
          {cleaning
            ? <><span className="w-3.5 h-3.5 border border-orange-400 border-t-transparent rounded-full animate-spin" /> {syncing ? 'Sync…' : 'Pulizia…'}</>
            : '🔄 Pulisci e risincronizza'}
        </button>
        {lastSync && (
          <span className="text-[11px] text-slate-600 ml-1">Ultima sync: {fmtDate(lastSync)}</span>
        )}
      </div>

      {result && (
        <div className={`px-4 py-3 rounded-xl text-sm ${result.ok ? 'bg-teal-500/10 border border-teal-500/20 text-teal-300' : 'bg-amber-500/10 border border-amber-500/20 text-amber-300'}`}>
          <p>{result.msg}</p>
          {result.errors?.length > 0 && (
            <ul className="mt-1 list-disc list-inside text-xs opacity-80">
              {result.errors.map((e, i) => <li key={i}>{e}</li>)}
            </ul>
          )}
        </div>
      )}
    </div>
  )
}

// ─── Import XLS ───────────────────────────────────────────────────────────────
const XLS_TYPES = [
  { id: 'clienti',      label: 'Clienti',        icon: '👥', endpoint: '/api/user/koibox/import',           hint: 'Clienti → Esporta',           filename: 'Clientes.xlsx' },
  { id: 'riepilogo',   label: 'Casse',           icon: '🧾', endpoint: '/api/user/koibox/import-casse-xls', hint: 'Cassa → Riepilogo → Esporta', filename: 'Casse.xlsx' },
  { id: 'servizi',     label: 'Servizi',         icon: '✂️',  endpoint: '/api/user/koibox/import',           hint: 'Configurazione → Servizi',    filename: 'Servizi.xlsx' },
  { id: 'appuntamenti',label: 'Appuntamenti',    icon: '📅', endpoint: '/api/user/koibox/import',           hint: 'Agenda → Esporta',            filename: 'Appuntamenti.xlsx' },
]

function XlsDropzone({ tipo, onSuccess }) {
  const [stato, setStato] = useState('idle')
  const [msg, setMsg]     = useState(null)
  const inputRef          = useRef(null)

  const handleFile = async (file) => {
    if (!file) return
    if (!file.name.match(/\.(xlsx|xls)$/i)) { setMsg('Formato non valido'); setStato('error'); return }
    setStato('loading'); setMsg(null)
    try {
      const fd = new FormData()
      fd.append('file', file)
      if (tipo.id !== 'riepilogo') fd.append('tipo', tipo.id)
      const res  = await fetch(tipo.endpoint, { method: 'POST', body: fd })
      const data = await res.json()
      if (!res.ok || data.error) throw new Error(data.error || 'Errore')
      setMsg(tipo.id === 'riepilogo' ? data.messaggio : `${data.importati} record importati`)
      setStato('done')
      onSuccess?.()
    } catch (e) { setMsg(e.message); setStato('error') }
  }

  return (
    <div className="bg-slate-800/40 rounded-xl border border-slate-700/40 p-3 flex flex-col gap-2">
      <div className="flex items-center gap-2">
        <span className="text-base">{tipo.icon}</span>
        <div className="flex-1 min-w-0">
          <p className="text-xs font-medium text-slate-300">{tipo.label}</p>
          <p className="text-[10px] text-slate-600 truncate">Koibox: {tipo.hint}</p>
        </div>
      </div>

      <div
        onClick={() => stato !== 'loading' && inputRef.current?.click()}
        onDragOver={e => e.preventDefault()}
        onDrop={e => { e.preventDefault(); handleFile(e.dataTransfer.files?.[0]) }}
        className={`rounded-lg border-2 border-dashed p-3 text-center cursor-pointer transition-colors text-xs ${
          stato === 'done'  ? 'border-teal-500/40 bg-teal-500/5 text-teal-400' :
          stato === 'error' ? 'border-red-500/40 bg-red-500/5 text-red-400' :
          stato === 'loading' ? 'border-slate-600 text-slate-500' :
          'border-slate-600/50 hover:border-slate-500 text-slate-500 hover:text-slate-300'
        }`}
      >
        <input ref={inputRef} type="file" accept=".xlsx,.xls" className="hidden" onChange={e => handleFile(e.target.files?.[0])} />
        {stato === 'loading' && <span className="w-4 h-4 border border-slate-400 border-t-transparent rounded-full animate-spin inline-block" />}
        {stato === 'done'    && <>{msg || 'Importato'} <button onClick={e => { e.stopPropagation(); setStato('idle'); setMsg(null) }} className="underline ml-1 text-slate-400">Ricarica</button></>}
        {stato === 'error'   && <>{msg} <button onClick={e => { e.stopPropagation(); setStato('idle'); setMsg(null) }} className="underline ml-1">Riprova</button></>}
        {stato === 'idle'    && <span>{tipo.filename}</span>}
      </div>
    </div>
  )
}

// ─── Diagnostica ──────────────────────────────────────────────────────────────
function DiagnosticaSection({ refreshKey }) {
  const [open, setOpen]     = useState(false)
  const [loading, setLoading] = useState(false)
  const [data, setData]     = useState(null)
  const [err, setErr]       = useState(null)

  const load = useCallback(async () => {
    setLoading(true); setErr(null)
    try {
      const res = await fetch('/api/user/koibox/diagnostic')
      const d   = await res.json()
      if (!res.ok) throw new Error(d.error || 'Errore')
      setData(d)
    } catch (e) { setErr(e.message) }
    setLoading(false)
  }, [])

  // Auto-ricarica quando cambiano i dati
  useEffect(() => { if (open) load() }, [refreshKey, open, load])

  return (
    <div className="rounded-xl border border-slate-700/40 overflow-hidden">
      <button onClick={() => { setOpen(v => !v); if (!open && !data) load() }}
        className="w-full flex items-center justify-between px-4 py-3 bg-slate-800/30 hover:bg-slate-800/50 transition-colors text-sm">
        <span className="flex items-center gap-2 text-slate-300">
          <span>🔍</span> <span className="font-medium">Diagnostica</span>
          <span className="text-xs text-slate-600">confronta API Koibox ↔ DB locale</span>
        </span>
        <svg className={`w-4 h-4 text-slate-500 transition-transform ${open ? 'rotate-180' : ''}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
        </svg>
      </button>

      {open && (
        <div className="border-t border-slate-700/30 p-4 space-y-4 text-xs">
          <div className="flex justify-end">
            <button onClick={load} className="text-slate-500 hover:text-slate-200 underline text-[11px]">Aggiorna diagnostica</button>
          </div>
          {loading && <p className="text-slate-500 animate-pulse">Caricamento…</p>}
          {err     && <p className="text-red-400">{err}</p>}
          {data    && (
            <div className="space-y-4">
              <p className="text-slate-500">Periodo: <span className="text-slate-300">{data.periodo?.da} → {data.periodo?.a}</span></p>

              {/* API Ventas */}
              <div>
                <p className="font-semibold text-slate-300 mb-1">API <span className="font-mono text-teal-400">/ventas/</span></p>
                {data.api_ventas?.error ? <p className="text-red-400">{data.api_ventas.error}</p> : (
                  <>
                    <p className="text-slate-500">Totale record: <span className="text-white font-medium">{data.api_ventas?.count_totale}</span> — Has next: <span className={data.api_ventas?.has_next ? 'text-teal-300' : 'text-slate-400'}>{String(data.api_ventas?.has_next)}</span></p>
                    <p className="text-slate-500 mt-0.5">Giorni nel campione: <span className="text-slate-300">{(data.api_ventas?.giorni_nel_campione || []).join(', ') || '—'}</span></p>
                    {data.api_ventas?.sample?.[0] && (
                      <details className="mt-1"><summary className="cursor-pointer text-slate-500 hover:text-slate-300">Raw primo record</summary>
                        <pre className="mt-1 p-2 bg-slate-900/60 rounded text-[10px] text-slate-400 overflow-x-auto">{JSON.stringify(data.api_ventas.sample[0], null, 2)}</pre>
                      </details>
                    )}
                  </>
                )}
              </div>

              {/* API Movimientos Caja */}
              <div>
                <p className="font-semibold text-slate-300 mb-1">API <span className="font-mono text-amber-400">/movimientos-caja/</span></p>
                {data.api_movimientos_caja?.error ? <p className="text-red-400">{data.api_movimientos_caja.error}</p> : (
                  <>
                    <p className="text-slate-500">Totale record: <span className="text-white font-medium">{data.api_movimientos_caja?.count_totale}</span></p>
                    <p className="text-slate-500 mt-0.5">Giorni nel campione: <span className="text-slate-300">{(data.api_movimientos_caja?.giorni_nel_campione || []).join(', ') || '—'}</span></p>
                  </>
                )}
              </div>

              {/* koibox_casse breakdown */}
              <div>
                <p className="font-semibold text-slate-300 mb-1">koibox_casse — {data.koibox_casse?.giorni} giorni</p>
                <div className="grid grid-cols-2 md:grid-cols-3 gap-1.5">
                  {[['Contanti', data.koibox_casse?.totale_contanti], ['Carta/POS', data.koibox_casse?.totale_carta], ['Online', data.koibox_casse?.totale_online], ['Bonifico', data.koibox_casse?.totale_bonifico], ['Bizum', data.koibox_casse?.totale_bizum], ['PayPal', data.koibox_casse?.totale_paypal]].map(([l, v]) => (
                    <div key={l} className={`px-2 py-1.5 rounded-lg flex justify-between ${v > 0 ? 'bg-teal-500/10 text-teal-300' : 'bg-slate-800/40 text-slate-600'}`}>
                      <span>{l}</span><span className="font-mono">{fmtEur(v ?? 0)}</span>
                    </div>
                  ))}
                </div>
              </div>

              {/* registro_giornate */}
              <div>
                <p className="font-semibold text-slate-300 mb-1">registro_giornate — {data.registro_giornate?.giorni} giorni</p>
                <table className="w-full text-[10px]">
                  <thead><tr className="text-slate-500 border-b border-slate-700/40">
                    <th className="text-left py-1">Data</th>
                    <th className="text-right py-1">Incasso</th>
                    <th className="text-right py-1">Clienti</th>
                    <th className="text-left py-1 pl-2">Fonte</th>
                  </tr></thead>
                  <tbody>
                    {(data.registro_giornate?.righe || []).map(r => (
                      <tr key={r.data} className="border-b border-slate-800/50 text-slate-400">
                        <td className="py-0.5">{r.data}</td>
                        <td className="text-right font-mono">{fmtEur(parseFloat(r.incasso_effettivo) || 0)}</td>
                        <td className="text-right">{r.n_clienti ?? '—'}</td>
                        <td className="pl-2">
                          <span className={`px-1 rounded text-[9px] ${r.source === 'koibox' ? 'bg-teal-500/15 text-teal-400' : 'bg-amber-500/15 text-amber-400'}`}>
                            {r.source || 'manuale'}
                          </span>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  )
}

// ─── XLS Dropzone mini (pill orizzontale) ─────────────────────────────────────
function XlsDropzoneMini({ tipo, onSuccess }) {
  const [stato, setStato]     = useState('idle')
  const [msg, setMsg]         = useState(null)
  const [dragOver, setDragOver] = useState(false)
  const inputRef              = useRef(null)

  const handleFile = async (file) => {
    if (!file) return
    if (!file.name.match(/\.(xlsx|xls)$/i)) { setMsg('Formato non valido'); setStato('error'); return }
    setStato('loading'); setMsg(null)
    try {
      const fd = new FormData()
      fd.append('file', file)
      if (tipo.id !== 'riepilogo') fd.append('tipo', tipo.id)
      const res  = await fetch(tipo.endpoint, { method: 'POST', body: fd })
      const data = await res.json()
      if (!res.ok || data.error) throw new Error(data.error || 'Errore')
      setMsg(tipo.id === 'riepilogo' ? data.messaggio : `${data.importati} record`)
      setStato('done')
      onSuccess?.()
    } catch (e) { setMsg(e.message); setStato('error') }
  }

  const colorClass =
    dragOver         ? 'border-teal-400 bg-teal-500/15 text-teal-300' :
    stato === 'done' ? 'border-teal-500/40 bg-teal-500/10 text-teal-400' :
    stato === 'error'? 'border-red-500/40 bg-red-500/10 text-red-400' :
    stato === 'loading'? 'border-slate-600 bg-slate-800/60 text-slate-500' :
    'border-slate-600/50 bg-slate-800/40 hover:border-slate-500 hover:bg-slate-700/40 text-slate-400 hover:text-slate-200'

  return (
    <div
      onClick={() => stato !== 'loading' && inputRef.current?.click()}
      onDragOver={e => { e.preventDefault(); setDragOver(true) }}
      onDragLeave={() => setDragOver(false)}
      onDrop={e => { e.preventDefault(); setDragOver(false); handleFile(e.dataTransfer.files?.[0]) }}
      title={stato === 'done' ? (msg || 'Importato') : stato === 'error' ? msg : `Trascina ${tipo.filename} qui o clicca`}
      className={`flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg border cursor-pointer transition-all text-xs select-none ${colorClass}`}
    >
      <input ref={inputRef} type="file" accept=".xlsx,.xls" className="hidden"
        onChange={e => handleFile(e.target.files?.[0])} />
      {stato === 'loading' ? (
        <span className="w-3 h-3 border border-current border-t-transparent rounded-full animate-spin flex-shrink-0" />
      ) : stato === 'done' ? <span>✓</span>
        : stato === 'error' ? <span>✕</span>
        : <span className="flex-shrink-0">{tipo.icon}</span>}
      <span className="font-medium whitespace-nowrap">{tipo.label}</span>
      {stato === 'done' && (
        <button onClick={e => { e.stopPropagation(); setStato('idle'); setMsg(null) }}
          className="ml-0.5 text-slate-500 hover:text-slate-300 text-[10px]">↺</button>
      )}
    </div>
  )
}

// ─── Console principale ───────────────────────────────────────────────────────
export default function ConsoleDatiWidget({ onDataChanged, compact = false }) {
  const [refreshKey, setRefreshKey] = useState(0)
  const [expanded, setExpanded]     = useState(false)

  const handleDataChanged = useCallback(() => {
    setRefreshKey(k => k + 1)
    onDataChanged?.()
  }, [onDataChanged])

  // ── Compact mode: collassato di default, espandibile ─────────────────────
  if (compact) {
    return (
      <div className="space-y-2">
        {/* Riga principale: sync + toggle espandi */}
        <div className="flex items-center gap-2 flex-wrap">
          <SyncSection onDataChanged={handleDataChanged} compact />
          <button
            onClick={() => setExpanded(v => !v)}
            className="flex items-center gap-1 text-[11px] text-slate-500 hover:text-slate-300 transition-colors ml-auto flex-shrink-0"
          >
            {expanded ? 'Comprimi ▲' : 'XLS & altro ▼'}
          </button>
        </div>

        {/* Espanso: pill XLS su una riga + diagnostica */}
        {expanded && (
          <div className="space-y-2 pt-1 border-t border-slate-700/30">
            <div className="flex flex-wrap gap-1.5">
              {XLS_TYPES.map(tipo => (
                <XlsDropzoneMini key={tipo.id} tipo={tipo} onSuccess={handleDataChanged} />
              ))}
            </div>
            <DiagnosticaSection refreshKey={refreshKey} />
          </div>
        )}
      </div>
    )
  }

  // ── Full mode (standalone card con header) ────────────────────────────────
  return (
    <div className="bg-slate-800/30 rounded-2xl border border-slate-700/50 overflow-hidden">
      {/* Header */}
      <div className="px-5 py-4 border-b border-slate-700/40 flex items-center gap-3">
        <span className="text-xl">⚡</span>
        <div>
          <p className="font-bold text-white text-base">Console Importazione Dati</p>
          <p className="text-xs text-slate-500">Sincronizza Koibox via API o importa file XLS — i benchmark si aggiornano in tempo reale</p>
        </div>
      </div>

      <div className="p-5 space-y-6">

        {/* 1. Sync API */}
        <section>
          <p className="text-sm font-semibold text-slate-300 mb-3 flex items-center gap-2">
            <span className="w-5 h-5 rounded-full bg-teal-500/15 text-teal-400 flex items-center justify-center text-xs font-bold">1</span>
            Sincronizzazione via API Koibox
          </p>
          <SyncSection onDataChanged={handleDataChanged} />
        </section>

        {/* 2. Import XLS */}
        <section>
          <p className="text-sm font-semibold text-slate-300 mb-1 flex items-center gap-2">
            <span className="w-5 h-5 rounded-full bg-amber-500/15 text-amber-400 flex items-center justify-center text-xs font-bold">2</span>
            Import manuale file XLS
          </p>
          <p className="text-xs text-slate-500 mb-3 ml-7">
            Scarica il file da Koibox e trascinalo nella card corrispondente. Per le casse usa <strong className="text-amber-300">Cassa → Riepilogo → Esporta</strong> — include debiti e tutti i metodi di pagamento.
          </p>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
            {XLS_TYPES.map(tipo => (
              <XlsDropzone key={tipo.id} tipo={tipo} onSuccess={handleDataChanged} />
            ))}
          </div>
        </section>

        {/* 3. Diagnostica */}
        <section>
          <p className="text-sm font-semibold text-slate-300 mb-3 flex items-center gap-2">
            <span className="w-5 h-5 rounded-full bg-slate-600/60 text-slate-400 flex items-center justify-center text-xs font-bold">3</span>
            Diagnostica e verifica dati
          </p>
          <DiagnosticaSection refreshKey={refreshKey} />
        </section>

      </div>
    </div>
  )
}
