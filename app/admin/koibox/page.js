'use client'

import { useState, useRef, useEffect } from 'react'
import Link from 'next/link'
import { useAuth } from '@/contexts/AuthContext'

const FILE_TYPES = [
  {
    id: 'clienti',
    label: 'Clienti',
    icon: '👥',
    desc: 'Lista completa clienti con storico acquisti',
    export_path: 'Clienti → Esporta',
    filename: 'Clientes.xlsx',
    color: 'teal',
  },
  {
    id: 'casse',
    label: 'Casse',
    icon: '💰',
    desc: 'Incassi giornalieri per metodo di pagamento',
    export_path: 'Cassa → Esporta',
    filename: 'Casse.xlsx',
    color: 'amber',
  },
  {
    id: 'servizi',
    label: 'Servizi',
    icon: '✂️',
    desc: 'Catalogo trattamenti con prezzi e durate',
    export_path: 'Configurazione → Servizi → Esporta',
    filename: 'Servizi.xlsx',
    color: 'purple',
  },
  {
    id: 'appuntamenti',
    label: 'Appuntamenti',
    icon: '📅',
    desc: 'Storico appuntamenti con cliente e trattamento',
    export_path: 'Agenda → Esporta',
    filename: 'Appuntamenti.xlsx',
    color: 'blue',
  },
]

const COLOR = {
  teal:   { bg: 'bg-teal-500/15',   border: 'border-teal-500/30',   text: 'text-teal-400',   },
  amber:  { bg: 'bg-amber-500/15',  border: 'border-amber-500/30',  text: 'text-amber-400',  },
  purple: { bg: 'bg-purple-500/15', border: 'border-purple-500/30', text: 'text-purple-400', },
  blue:   { bg: 'bg-blue-500/15',   border: 'border-blue-500/30',   text: 'text-blue-400',   },
}

// ─── Selettore centro ────────────────────────────────────────────────────────
function CentroSelector({ onSelect }) {
  const { searchCentri } = useAuth()
  const [query, setQuery] = useState('')
  const [results, setResults] = useState([])
  const [loading, setLoading] = useState(false)
  const debounce = useRef(null)

  useEffect(() => { load('') }, [])

  const load = async (q) => {
    setLoading(true)
    try {
      const data = await searchCentri(q)
      setResults(data || [])
    } catch { setResults([]) }
    finally { setLoading(false) }
  }

  const onChange = (v) => {
    setQuery(v)
    clearTimeout(debounce.current)
    debounce.current = setTimeout(() => load(v), 300)
  }

  return (
    <div className="bg-slate-800/50 rounded-xl border border-slate-700/50 p-5 space-y-4">
      <p className="text-sm font-semibold text-white">Seleziona il centro estetico</p>
      <p className="text-xs text-slate-400">I dati importati saranno associati esclusivamente a quel centro.</p>
      <div className="relative">
        <input
          value={query}
          onChange={e => onChange(e.target.value)}
          placeholder="Cerca per nome centro..."
          className="w-full px-4 py-2.5 bg-slate-900/60 border border-slate-600/50 rounded-xl text-white placeholder-slate-500 text-sm focus:ring-1 focus:ring-teal-500 focus:outline-none"
        />
        {loading && (
          <div className="absolute right-3 top-3 w-4 h-4 border-2 border-teal-400 border-t-transparent rounded-full animate-spin" />
        )}
      </div>
      <div className="space-y-1 max-h-60 overflow-y-auto">
        {results.length === 0 && !loading && (
          <p className="text-xs text-slate-500 py-3 text-center">Nessun centro trovato</p>
        )}
        {results.map(c => (
          <button key={c.id} onClick={() => onSelect(c)}
            className="w-full flex items-center gap-3 px-4 py-3 rounded-xl bg-slate-800/60 hover:bg-slate-700/60 border border-slate-700/50 hover:border-teal-500/40 text-left transition-all group">
            <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-teal-500/20 to-cyan-500/20 border border-teal-500/30 flex items-center justify-center flex-shrink-0">
              <span className="text-xs text-teal-400 font-bold">{(c.nome || '?')[0].toUpperCase()}</span>
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-sm font-medium text-white truncate">{c.nome}</p>
              {c.citta && <p className="text-xs text-slate-500">{c.citta}</p>}
            </div>
            <svg className="w-4 h-4 text-slate-600 group-hover:text-teal-400 transition-colors flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
            </svg>
          </button>
        ))}
      </div>
    </div>
  )
}

// ─── Card singolo file ───────────────────────────────────────────────────────
function UploadCard({ type, centroId, onImport }) {
  const [state, setState] = useState('idle')
  const [result, setResult] = useState(null)
  const [dragging, setDragging] = useState(false)
  const inputRef = useRef(null)
  const c = COLOR[type.color]

  const handleFile = async (file) => {
    if (!file) return
    if (!file.name.match(/\.(xlsx|xls)$/i)) {
      setResult({ error: 'Carica un file Excel (.xlsx o .xls)' })
      setState('error')
      return
    }
    setState('loading')
    setResult(null)
    try {
      const fd = new FormData()
      fd.append('file', file)
      fd.append('centro_id', centroId)
      const res = await fetch('/api/admin/koibox/import', { method: 'POST', body: fd })
      const data = await res.json()
      if (!res.ok || data.error) throw new Error(data.error || 'Errore sconosciuto')
      setResult(data)
      setState('done')
      onImport?.(type.id, data)
    } catch (e) {
      setResult({ error: e.message })
      setState('error')
    }
  }

  const onDrop = (e) => {
    e.preventDefault()
    setDragging(false)
    handleFile(e.dataTransfer.files?.[0])
  }

  return (
    <div className={`rounded-2xl border p-5 flex flex-col gap-4 ${c.bg} ${c.border}`}>
      <div className="flex items-center gap-3">
        <div className={`w-10 h-10 rounded-xl flex items-center justify-center text-xl ${c.bg} border ${c.border}`}>
          {type.icon}
        </div>
        <div>
          <p className={`font-semibold ${c.text}`}>{type.label}</p>
          <p className="text-xs text-slate-500">{type.desc}</p>
        </div>
      </div>
      <div className="flex items-center gap-1.5 text-xs text-slate-500">
        <svg className="w-3.5 h-3.5 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
        </svg>
        <span>In Koibox: <span className="text-slate-400 font-medium">{type.export_path}</span></span>
      </div>

      <div
        onDragOver={(e) => { e.preventDefault(); setDragging(true) }}
        onDragLeave={() => setDragging(false)}
        onDrop={onDrop}
        onClick={() => state !== 'loading' && inputRef.current?.click()}
        className={`rounded-xl border-2 border-dashed p-5 text-center cursor-pointer transition-all ${
          dragging ? `${c.border} bg-white/5`
          : state === 'done'  ? 'border-teal-500/50 bg-teal-500/5'
          : state === 'error' ? 'border-red-500/50 bg-red-500/5'
          : 'border-slate-600/50 hover:border-slate-500/70 hover:bg-white/5'
        }`}
      >
        <input ref={inputRef} type="file" accept=".xlsx,.xls" className="hidden"
          onChange={e => handleFile(e.target.files?.[0])} />

        {state === 'loading' && (
          <div className="flex flex-col items-center gap-2">
            <div className="w-7 h-7 border-2 border-teal-400 border-t-transparent rounded-full animate-spin" />
            <p className="text-sm text-slate-400">Importazione in corso…</p>
          </div>
        )}
        {state === 'done' && result && (
          <div className="flex flex-col items-center gap-1">
            <div className="w-9 h-9 rounded-full bg-teal-500/20 flex items-center justify-center text-teal-400 text-xl mb-1">✓</div>
            <p className="text-sm font-semibold text-teal-400">{result.importati.toLocaleString('it-IT')} record importati</p>
            {result.errors?.length > 0 && (
              <p className="text-xs text-amber-400">{result.errors.length} batch con errori</p>
            )}
            <button onClick={e => { e.stopPropagation(); setState('idle') }}
              className="mt-2 text-xs text-slate-500 hover:text-white underline">
              Sostituisci
            </button>
          </div>
        )}
        {state === 'error' && (
          <div className="flex flex-col items-center gap-1">
            <div className="w-9 h-9 rounded-full bg-red-500/20 flex items-center justify-center text-red-400 text-xl mb-1">✕</div>
            <p className="text-sm text-red-400">{result?.error}</p>
            <button onClick={e => { e.stopPropagation(); setState('idle') }}
              className="mt-2 text-xs text-slate-500 hover:text-white underline">Riprova</button>
          </div>
        )}
        {state === 'idle' && (
          <>
            <svg className="w-7 h-7 mx-auto mb-2 text-slate-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12" />
            </svg>
            <p className="text-sm text-slate-400">Trascina <span className="text-white font-medium">{type.filename}</span></p>
            <p className="text-xs text-slate-600 mt-1">o clicca per scegliere</p>
          </>
        )}
      </div>
    </div>
  )
}

// ─── Pagina principale ───────────────────────────────────────────────────────
export default function KoiboxPage() {
  const [centro, setCentro] = useState(null)
  const [imported, setImported] = useState({})

  const handleImport = (typeId, data) => {
    setImported(prev => ({ ...prev, [typeId]: data }))
  }

  const totalImported = Object.values(imported).reduce((sum, d) => sum + (d.importati || 0), 0)

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900 p-4 md:p-6">
      <div className="max-w-5xl mx-auto space-y-6">

        {/* Header */}
        <div className="bg-slate-950/60 rounded-xl border border-slate-700/50 p-4">
          <div className="flex items-center justify-between gap-4 flex-wrap">
            <div className="flex items-center gap-3">
              <Link href="/admin" className="text-slate-400 hover:text-white transition-colors">
                <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
                </svg>
              </Link>
              <div className="w-10 h-10 bg-gradient-to-br from-teal-500 to-cyan-500 rounded-lg flex items-center justify-center text-xl">
                🔗
              </div>
              <div>
                <h1 className="text-2xl font-bold text-white">Import Koibox</h1>
                <p className="text-sm text-slate-400">
                  {centro
                    ? <span>Centro: <span className="text-teal-400 font-medium">{centro.nome}</span></span>
                    : 'Importa i dati dal gestionale per le analisi AI'}
                </p>
              </div>
            </div>
            <div className="flex items-center gap-3">
              {centro && totalImported > 0 && (
                <div className="flex items-center gap-2 px-4 py-2 bg-teal-500/15 border border-teal-500/30 rounded-xl">
                  <span className="text-teal-400 font-semibold">{totalImported.toLocaleString('it-IT')}</span>
                  <span className="text-slate-400 text-sm">record importati</span>
                </div>
              )}
              {centro && (
                <button onClick={() => { setCentro(null); setImported({}) }}
                  className="text-xs px-3 py-1.5 bg-slate-700/60 hover:bg-slate-600 text-slate-400 hover:text-white rounded-lg border border-slate-600/50 transition-colors">
                  Cambia centro
                </button>
              )}
            </div>
          </div>
        </div>

        {/* Step 1: scegli centro */}
        {!centro && (
          <CentroSelector onSelect={setCentro} />
        )}

        {/* Step 2: import file */}
        {centro && (
          <>
            {/* Banner centro selezionato */}
            <div className="flex items-center gap-3 px-4 py-3 bg-teal-500/10 border border-teal-500/25 rounded-xl">
              <span className="text-teal-400">✓</span>
              <p className="text-sm text-teal-300">
                I file importati saranno associati a <strong>{centro.nome}</strong>.
              </p>
            </div>

            {/* Istruzioni */}
            <div className="bg-slate-800/40 rounded-xl border border-slate-700/50 p-5">
              <p className="text-sm font-semibold text-white mb-3">Come funziona</p>
              <ol className="space-y-2 text-sm text-slate-400">
                <li className="flex gap-2">
                  <span className="w-5 h-5 rounded-full bg-slate-700 text-white text-xs flex items-center justify-center flex-shrink-0 mt-0.5">1</span>
                  In Koibox, vai nella sezione indicata e clicca <span className="text-white font-medium">Esporta</span>
                </li>
                <li className="flex gap-2">
                  <span className="w-5 h-5 rounded-full bg-slate-700 text-white text-xs flex items-center justify-center flex-shrink-0 mt-0.5">2</span>
                  Trascina il file Excel scaricato sulla card corrispondente
                </li>
                <li className="flex gap-2">
                  <span className="w-5 h-5 rounded-full bg-slate-700 text-white text-xs flex items-center justify-center flex-shrink-0 mt-0.5">3</span>
                  BeautyX riconosce il tipo di file e importa automaticamente
                </li>
              </ol>
              <div className="mt-4 p-3 bg-amber-500/10 border border-amber-500/20 rounded-lg flex gap-2 text-xs text-amber-300">
                <span className="flex-shrink-0">⚠️</span>
                <span>Ogni import <strong>sostituisce</strong> i dati precedenti per quella categoria e per questo centro. I dati in Koibox non vengono modificati.</span>
              </div>
            </div>

            {/* Card upload */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {FILE_TYPES.map(type => (
                <UploadCard key={type.id} type={type} centroId={centro.id} onImport={handleImport} />
              ))}
            </div>

            {/* Messaggio successo */}
            {Object.keys(imported).length > 0 && (
              <div className="bg-teal-500/10 border border-teal-500/30 rounded-xl p-5 flex items-start gap-3">
                <span className="text-2xl">✅</span>
                <div>
                  <p className="text-teal-300 font-semibold mb-1">Dati pronti per le analisi</p>
                  <p className="text-slate-400 text-sm">
                    Ora puoi aprire la chat con Beautyx e chiedere analisi sui dati reali di <strong className="text-white">{centro.nome}</strong>: fatturato mensile, clienti dormienti, servizi più redditizi e molto altro.
                  </p>
                  <p className="text-xs text-slate-500 mt-2">Ripeti l&apos;import quando vuoi per aggiornare i dati.</p>
                </div>
              </div>
            )}
          </>
        )}

      </div>
    </div>
  )
}
