'use client'
/**
 * GestioneDatiWidget — Dashboard widget per gestire i dati giornalieri.
 *
 * - Mostra gli ultimi 21 giorni con incasso, n_clienti e fonte (koibox/manuale)
 * - Permette la correzione inline di qualsiasi giorno
 * - Upload "Riepilogo Casse" XLS da Koibox per aggiornare più giorni in blocco
 * - Pulsante Sincronizza Koibox (se connesso)
 */
import { useState, useEffect, useRef, useCallback } from 'react'

const fmt = (v) =>
  `€${parseFloat(v || 0).toLocaleString('it-IT', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`

const fmtData = (iso) => {
  if (!iso) return '—'
  const d = new Date(iso + 'T00:00:00')
  return d.toLocaleDateString('it-IT', { weekday: 'short', day: '2-digit', month: 'short' })
}

// ─── Badge fonte ───────────────────────────────────────────────────────────────
function SourceBadge({ source }) {
  if (source === 'koibox')
    return <span className="text-[10px] px-1.5 py-0.5 rounded-full bg-teal-500/15 text-teal-400 border border-teal-500/20 font-medium">Koibox</span>
  if (source === 'manuale')
    return <span className="text-[10px] px-1.5 py-0.5 rounded-full bg-amber-500/15 text-amber-400 border border-amber-500/20 font-medium">Manuale</span>
  return <span className="text-[10px] px-1.5 py-0.5 rounded-full bg-slate-700/60 text-slate-500">—</span>
}

// ─── Riga giorno ──────────────────────────────────────────────────────────────
function RigaGiorno({ giorno, centroId, onAggiornato }) {
  const [editing, setEditing]     = useState(false)
  const [incasso, setIncasso]     = useState('')
  const [clienti, setClienti]     = useState('')
  const [saving, setSaving]       = useState(false)
  const [saveErr, setSaveErr]     = useState(null)

  const startEdit = () => {
    setIncasso(parseFloat(giorno.incasso_effettivo || 0).toFixed(2))
    setClienti(String(giorno.n_clienti || 0))
    setSaveErr(null)
    setEditing(true)
  }

  const handleSave = async () => {
    setSaving(true)
    setSaveErr(null)
    try {
      const res = await fetch('/api/registro/giornata', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          centro_id:         centroId,
          data:              giorno.data,
          incasso_effettivo: parseFloat(incasso) || 0,
          n_clienti:         parseInt(clienti, 10) || 0,
        }),
      })
      const d = await res.json()
      if (!res.ok || d.error) throw new Error(d.error || 'Errore salvataggio')
      setEditing(false)
      onAggiornato?.()
    } catch (e) {
      setSaveErr(e.message)
    }
    setSaving(false)
  }

  return (
    <tr className="border-b border-slate-800/50 group">
      <td className="py-2 pl-1 text-xs text-slate-300 whitespace-nowrap">
        {fmtData(giorno.data)}
      </td>
      <td className="py-2 px-2">
        <SourceBadge source={giorno.source} />
      </td>

      {editing ? (
        <>
          <td className="py-1.5 px-1">
            <input
              type="number"
              value={incasso}
              onChange={e => setIncasso(e.target.value)}
              className="w-24 bg-slate-900 border border-slate-600 rounded px-2 py-1 text-xs text-white font-mono focus:outline-none focus:border-teal-500"
              step="0.01"
              min="0"
            />
          </td>
          <td className="py-1.5 px-1">
            <input
              type="number"
              value={clienti}
              onChange={e => setClienti(e.target.value)}
              className="w-16 bg-slate-900 border border-slate-600 rounded px-2 py-1 text-xs text-white focus:outline-none focus:border-teal-500"
              min="0"
            />
          </td>
          <td className="py-1.5 pr-1">
            <div className="flex items-center gap-1.5">
              <button
                onClick={handleSave}
                disabled={saving}
                className="text-[10px] px-2 py-1 bg-teal-500/20 hover:bg-teal-500/30 text-teal-300 rounded border border-teal-500/30 disabled:opacity-40"
              >
                {saving ? '…' : 'Salva'}
              </button>
              <button
                onClick={() => setEditing(false)}
                className="text-[10px] px-2 py-1 text-slate-500 hover:text-slate-300"
              >
                Annulla
              </button>
            </div>
            {saveErr && <p className="text-[10px] text-red-400 mt-0.5">{saveErr}</p>}
          </td>
        </>
      ) : (
        <>
          <td className="py-2 px-2 text-right font-mono text-xs text-white">
            {fmt(giorno.incasso_effettivo)}
          </td>
          <td className="py-2 px-2 text-right text-xs text-slate-400">
            {giorno.n_clienti ?? '—'}
          </td>
          <td className="py-2 pr-1 text-right">
            <button
              onClick={startEdit}
              className="text-[10px] px-2 py-0.5 rounded bg-slate-700/0 hover:bg-slate-700/60 text-slate-600 hover:text-slate-300 transition-colors opacity-0 group-hover:opacity-100"
            >
              Correggi
            </button>
          </td>
        </>
      )}
    </tr>
  )
}

// ─── Upload XLS Casse ─────────────────────────────────────────────────────────
function UploadCasseXls({ onSuccess }) {
  const [stato, setStato]   = useState('idle') // idle | loading | done | error
  const [msg, setMsg]       = useState(null)
  const inputRef            = useRef(null)

  const handleFile = async (file) => {
    if (!file) return
    if (!file.name.match(/\.(xlsx|xls)$/i)) {
      setMsg('Formato non valido: carica un file .xlsx o .xls')
      setStato('error')
      return
    }
    setStato('loading')
    setMsg(null)
    try {
      const fd = new FormData()
      fd.append('file', file)
      const res = await fetch('/api/user/koibox/import-casse-xls', { method: 'POST', body: fd })
      const d   = await res.json()
      if (!res.ok || d.error) throw new Error(d.error || 'Errore sconosciuto')
      setMsg(d.messaggio)
      setStato('done')
      onSuccess?.()
    } catch (e) {
      setMsg(e.message)
      setStato('error')
    }
  }

  return (
    <div className="border border-dashed border-slate-600/50 rounded-xl p-4">
      <div className="flex items-center justify-between gap-3 flex-wrap">
        <div>
          <p className="text-sm font-medium text-slate-300">Importa Riepilogo Casse (XLS)</p>
          <p className="text-xs text-slate-500 mt-0.5">
            Scarica il file da Koibox → <span className="text-slate-400">Cassa → Esporta</span> e caricalo qui.
            Corregge i dati mancanti o errati per tutti i giorni del file.
          </p>
        </div>
        <button
          onClick={() => inputRef.current?.click()}
          disabled={stato === 'loading'}
          className="flex-shrink-0 text-xs px-3 py-1.5 rounded-lg bg-amber-500/15 hover:bg-amber-500/25 text-amber-300 border border-amber-500/30 transition-colors disabled:opacity-40"
        >
          {stato === 'loading' ? (
            <span className="flex items-center gap-1.5">
              <span className="w-3 h-3 border border-amber-400 border-t-transparent rounded-full animate-spin inline-block" />
              Importazione…
            </span>
          ) : 'Carica XLS Casse'}
        </button>
        <input
          ref={inputRef}
          type="file"
          accept=".xlsx,.xls"
          className="hidden"
          onChange={e => handleFile(e.target.files?.[0])}
        />
      </div>
      {msg && (
        <p className={`mt-2 text-xs ${stato === 'done' ? 'text-teal-400' : 'text-red-400'}`}>{msg}</p>
      )}
    </div>
  )
}

// ─── Widget principale ────────────────────────────────────────────────────────
export default function GestioneDatiWidget({ centroId }) {
  const [giorni, setGiorni]         = useState([])
  const [loading, setLoading]       = useState(true)
  const [koiboxOk, setKoiboxOk]     = useState(false)
  const [syncing, setSyncing]       = useState(false)
  const [syncMsg, setSyncMsg]       = useState(null)
  const [open, setOpen]             = useState(false)

  const loadGiorni = useCallback(async () => {
    setLoading(true)
    try {
      const res = await fetch('/api/registro/giornate?giorni=21')
      const d   = await res.json()
      if (d.giorni) setGiorni(d.giorni)
    } catch { /* silent */ }
    setLoading(false)
  }, [])

  useEffect(() => {
    // Controlla se Koibox è connesso
    fetch('/api/user/integrazioni/koibox')
      .then(r => r.json())
      .then(d => setKoiboxOk(d.connected))
      .catch(() => {})
    loadGiorni()
  }, [loadGiorni])

  const handleSync = async () => {
    setSyncing(true)
    setSyncMsg(null)
    try {
      const res  = await fetch('/api/user/koibox/sync', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ giorni_casse: 30, giorni_agenda: 14 }),
      })
      const d = await res.json()
      setSyncMsg(d.messaggio || (d.ok ? 'Sync completata' : 'Sync parziale'))
      loadGiorni()
    } catch (e) {
      setSyncMsg('Errore: ' + e.message)
    }
    setSyncing(false)
  }

  if (!centroId) return null

  return (
    <div className="bg-slate-800/40 rounded-2xl border border-slate-700/50 overflow-hidden">
      {/* Header collassabile */}
      <button
        onClick={() => setOpen(v => !v)}
        className="w-full flex items-center justify-between px-5 py-4 text-left"
      >
        <div className="flex items-center gap-3">
          <span className="text-lg">📋</span>
          <div>
            <p className="font-semibold text-white text-sm">Dati Registro</p>
            <p className="text-xs text-slate-500">Verifica e correggi i dati importati da Koibox o inseriti manualmente</p>
          </div>
        </div>
        <svg className={`w-4 h-4 text-slate-500 transition-transform ${open ? 'rotate-180' : ''}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
        </svg>
      </button>

      {open && (
        <div className="border-t border-slate-700/40 p-4 space-y-4">
          {/* Azioni */}
          <div className="flex items-center gap-2 flex-wrap">
            {koiboxOk && (
              <button
                onClick={handleSync}
                disabled={syncing}
                className="text-xs px-3 py-1.5 rounded-lg bg-teal-500/15 hover:bg-teal-500/25 text-teal-300 border border-teal-500/30 transition-colors disabled:opacity-40 flex items-center gap-1.5"
              >
                {syncing
                  ? <><span className="w-3 h-3 border border-teal-400 border-t-transparent rounded-full animate-spin inline-block" /> Sync…</>
                  : '↻ Sincronizza Koibox'}
              </button>
            )}
            <button
              onClick={loadGiorni}
              className="text-xs px-3 py-1.5 rounded-lg bg-slate-700/40 hover:bg-slate-700/70 text-slate-400 hover:text-white transition-colors"
            >
              Aggiorna
            </button>
          </div>

          {syncMsg && (
            <p className="text-xs px-3 py-2 bg-slate-700/50 rounded-lg text-slate-300">{syncMsg}</p>
          )}

          {/* Tabella giorni */}
          {loading ? (
            <div className="space-y-1.5">
              {[...Array(5)].map((_, i) => (
                <div key={i} className="h-7 bg-slate-700/30 rounded animate-pulse" />
              ))}
            </div>
          ) : giorni.length === 0 ? (
            <p className="text-sm text-slate-500 text-center py-4">
              Nessun dato negli ultimi 21 giorni. Sincronizza Koibox o importa un XLS.
            </p>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-left">
                <thead>
                  <tr className="text-[11px] text-slate-500 border-b border-slate-700/40">
                    <th className="pb-1.5 pl-1">Giorno</th>
                    <th className="pb-1.5 px-2">Fonte</th>
                    <th className="pb-1.5 px-2 text-right">Incasso</th>
                    <th className="pb-1.5 px-2 text-right">Clienti</th>
                    <th className="pb-1.5 pr-1" />
                  </tr>
                </thead>
                <tbody>
                  {giorni.map(g => (
                    <RigaGiorno
                      key={g.data}
                      giorno={g}
                      centroId={centroId}
                      onAggiornato={loadGiorni}
                    />
                  ))}
                </tbody>
              </table>
            </div>
          )}

          {/* Upload XLS Casse */}
          <UploadCasseXls onSuccess={loadGiorni} />

          <p className="text-[10px] text-slate-600 text-center">
            "Correggi" aggiorna solo incasso e clienti del giorno — spese e crediti inseriti manualmente restano invariati.
          </p>
        </div>
      )}
    </div>
  )
}
