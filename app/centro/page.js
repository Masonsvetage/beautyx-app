'use client'

import { useState, useEffect, Suspense } from 'react'
import { createPortal } from 'react-dom'
import { useAuth } from '@/contexts/AuthContext'
import { useSearchParams } from 'next/navigation'
import { calcolaServizio, analizzaCongelato, formatEuro } from '@/lib/listino-calc'
import { useMultiSelect } from '@/lib/useMultiSelect'
import BulkActionBar from '@/components/common/BulkActionBar'
import HelpTooltip from '@/components/common/HelpTooltip'
import * as XLSX from 'xlsx'
import QRCode from 'qrcode'

// ─────────────────────────────────────────────
// Helpers
// ─────────────────────────────────────────────
const GIORNI = ['Lunedì', 'Martedì', 'Mercoledì', 'Giovedì', 'Venerdì', 'Sabato', 'Domenica']
const POSIZIONAMENTO_LABEL = {
  sotto_mercato: { label: 'Sotto mercato', color: 'text-red-400', icon: '📉' },
  in_linea:      { label: 'In linea col mercato', color: 'text-teal-400', icon: '✅' },
  sopra_mercato: { label: 'Sopra mercato', color: 'text-amber-400', icon: '📈' },
}

const ORARIO_DEFAULT = Array.from({ length: 7 }, (_, i) => ({
  giorno_settimana: i,
  aperto: i < 5,
  orario_apertura: '09:00',
  orario_chiusura: '18:00',
}))

// ─────────────────────────────────────────────
// Componente Tabs
// ─────────────────────────────────────────────
function Tab({ active, onClick, icon, label }) {
  return (
    <button
      onClick={onClick}
      className={`flex items-center gap-2 px-4 py-2.5 text-sm font-medium rounded-lg transition-all ${
        active
          ? 'bg-teal-600 text-white shadow-lg shadow-teal-900/30'
          : 'text-slate-400 hover:text-white hover:bg-slate-700/50'
      }`}
    >
      <span>{icon}</span>
      <span>{label}</span>
    </button>
  )
}

// ─────────────────────────────────────────────
// Preview calcolo prezzi (real-time)
// ─────────────────────────────────────────────

// ─────────────────────────────────────────────
// Modal Servizio
// ─────────────────────────────────────────────
const SERVIZIO_EMPTY = {
  nome: '', descrizione: '', categoria: '',
  tipo: 'servizio',
  durata_preparazione_min: 0, durata_esecuzione_min: 0,
  durata_chiusura_min: 0, durata_sanificazione_min: 5,
  nr_operatrici: 1, sovrapponibile: false,
  iva_aliquota_id: null, ricarico_percentuale: 30,
  materiali: [],
  note_interne: '',
  _prezzo_iva_inclusa: false,
}

function ServizioModal({ servizio, aliquote, costoOra, nrOpCentro, onSave, onClose }) {
  const [mounted, setMounted] = useState(false)
  const [form, setForm] = useState({ ...SERVIZIO_EMPTY, ...servizio, materiali: servizio?.materiali || [] })
  const [saving, setSaving] = useState(false)
  const [researching, setResearching] = useState(false)
  const msMat = useMultiSelect()   // selezione multipla materiali

  useEffect(() => { setMounted(true) }, [])
  const [mercato, setMercato] = useState(
    servizio?.mercato_prezzo_medio
      ? { prezzo_min: servizio.mercato_prezzo_min, prezzo_max: servizio.mercato_prezzo_max,
          prezzo_medio: servizio.mercato_prezzo_medio, posizionamento: null, note: servizio.mercato_note }
      : null
  )
  const [mercatoErr, setMercatoErr] = useState(null)
  const [mercatoTab, setMercatoTab] = useState('ai')   // 'ai' | 'manuale'
  const [mercatoManuale, setMercatoManuale] = useState({ min: '', max: '', medio: '', note: '' })
  const [savingMercato, setSavingMercato] = useState(false)
  const [prezzoManuale, setPrezzoManuale] = useState('')
  const [prezzoManualeType, setPrezzoManualeType] = useState('lordo') // 'lordo' | 'netto'
  const [prezzoScelto, setPrezzoScelto] = useState(null) // null | 'calcolato' | 'gestionale' | 'manuale'
  const [sendingHpa, setSendingHpa] = useState(false)
  const [aiSuggest, setAiSuggest] = useState(null)   // { nome_suggerito, protocollo_suggerito }
  const [loadingSuggest, setLoadingSuggest] = useState(false)
  const isEdit = !!servizio?.id

  const handleAiSuggest = async () => {
    if (!form.nome.trim()) return
    setLoadingSuggest(true)
    setAiSuggest(null)
    try {
      const res = await fetch('/api/centro/servizi/suggest', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          nome: form.nome,
          categoria: form.categoria,
          tipo: form.tipo,
          descrizione: form.descrizione,
          note_interne: form.note_interne,
        }),
      })
      const data = await res.json()
      if (res.ok) setAiSuggest(data)
      else alert(data.error || 'Errore nel suggerimento AI')
    } catch {
      alert('Errore di connessione')
    } finally {
      setLoadingSuggest(false)
    }
  }

  const set = (key, val) => setForm(f => ({ ...f, [key]: val }))

  const addMateriale = () => setForm(f => ({
    ...f,
    materiali: [...f.materiali, { id: Date.now(), nome: '', costo_unitario: 0, quantita_uso: 1, unita: 'pz' }]
  }))

  const updateMateriale = (idx, key, val) => setForm(f => {
    const mat = [...f.materiali]
    mat[idx] = { ...mat[idx], [key]: val }
    return { ...f, materiali: mat }
  })

  const removeMateriale = (idx) => {
    setForm(f => ({ ...f, materiali: f.materiali.filter((_, i) => i !== idx) }))
    msMat.clear()
  }

  const removeMateriateSelected = () => {
    setForm(f => ({ ...f, materiali: f.materiali.filter((_, i) => !msMat.isSelected(i)) }))
    msMat.clear()
  }

  // Calcola prezzo da congelare in base alla scelta dell'utente
  const _getPrezzoCongelato = () => {
    const ivaObj = aliquote.find(a => a.id === form.iva_aliquota_id)
    const ivaPerc = ivaObj?.percentuale ?? 0
    const calc = costoOra ? calcolaServizio({
      servizio: form, costoOraEsercizio: costoOra, nrOpCentro, aliquotaIvaPerc: ivaPerc
    }) : null
    let prezzoLordo = null
    if (prezzoScelto === 'calcolato' && calc) {
      prezzoLordo = calc.prezzoLordo
    } else if (prezzoScelto === 'gestionale' && form._prezzo_gestionale != null) {
      prezzoLordo = form._prezzo_iva_inclusa
        ? Number(form._prezzo_gestionale)
        : Number(form._prezzo_gestionale) * (1 + ivaPerc / 100)
    } else if (prezzoScelto === 'manuale' && prezzoManuale !== '') {
      const pmVal = parseFloat(prezzoManuale)
      prezzoLordo = prezzoManualeType === 'lordo' ? pmVal : pmVal * (1 + ivaPerc / 100)
    }
    return { prezzoLordo: prezzoLordo ? +Number(prezzoLordo).toFixed(2) : null, calc }
  }

  const handleSave = async () => {
    if (!form.nome.trim()) return
    setSaving(true)
    try {
      const url = isEdit ? `/api/centro/servizi/${servizio.id}` : '/api/centro/servizi'
      const method = isEdit ? 'PUT' : 'POST'
      // Strip UI-only underscore fields (not DB columns)
      const payload = Object.fromEntries(Object.entries(form).filter(([k]) => !k.startsWith('_')))
      const res = await fetch(url, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error)
      onSave(data.servizio)
    } catch (e) {
      alert(e.message)
    } finally {
      setSaving(false)
    }
  }

  // Salva il servizio E congela il prezzo in un'unica azione
  const handleCongelaESalva = async () => {
    if (!form.nome.trim()) return
    const { prezzoLordo, calc } = _getPrezzoCongelato()
    if (!prezzoLordo) {
      alert('Per congelare il prezzo serve almeno: costi di esercizio configurati + aliquota IVA selezionata.\nIn alternativa inserisci un prezzo manuale nella sezione "Prezzo finale".')
      return
    }
    setSaving(true)
    try {
      // 1. Salva il servizio
      const url = isEdit ? `/api/centro/servizi/${servizio.id}` : '/api/centro/servizi'
      const method = isEdit ? 'PUT' : 'POST'
      const payload = Object.fromEntries(Object.entries(form).filter(([k]) => !k.startsWith('_')))
      const saveRes = await fetch(url, { method, headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(payload) })
      const saveData = await saveRes.json()
      if (!saveRes.ok) throw new Error(saveData.error)
      // 2. Congela il prezzo
      const serviceId = saveData.servizio.id
      const congelaRes = await fetch(`/api/centro/servizi/${serviceId}/congela`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          prezzo_pubblico: prezzoLordo,
          costo_vivo_al_congelamento: calc?.costoVivo ?? null,
          margine_min_utile_perc: form.margine_min_utile_perc ?? 40,
        }),
      })
      const congelaData = await congelaRes.json()
      if (!congelaRes.ok) throw new Error(congelaData.error)
      onSave(congelaData.servizio)
    } catch (e) {
      alert(e.message)
    } finally {
      setSaving(false)
    }
  }

  const handleCongela = async () => {
    if (!servizio?.id) return
    const ivaObj = aliquote.find(a => a.id === form.iva_aliquota_id)
    const ivaPerc = ivaObj?.percentuale ?? 0
    const calc = costoOra ? calcolaServizio({
      servizio: form, costoOraEsercizio: costoOra, nrOpCentro, aliquotaIvaPerc: ivaPerc
    }) : null
    const prezzoLordo = calc?.prezzoLordo
    if (!prezzoLordo) return alert('Completa la configurazione (costo ora + IVA) prima di congelare il prezzo.')
    const conferma = confirm(
      `Congelare il prezzo ufficiale a ${formatEuro(prezzoLordo)} (IVA inclusa)?\n\n` +
      `Questo sarà il prezzo esposto nel listino stampabile. Potrai aggiornarlo in qualsiasi momento.`
    )
    if (!conferma) return
    setSaving(true)
    try {
      const res = await fetch(`/api/centro/servizi/${servizio.id}/congela`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          prezzo_pubblico: prezzoLordo,
          costo_vivo_al_congelamento: calc.costoVivo,
          margine_min_utile_perc: form.margine_min_utile_perc ?? 40,
        }),
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error)
      onSave(data.servizio)
    } catch (e) {
      alert(e.message)
    } finally {
      setSaving(false)
    }
  }

  const handleScongelaPrezzo = async () => {
    if (!servizio?.id) return
    if (!confirm('Rimuovere il prezzo congelato? Il servizio uscirà dal listino ufficiale.')) return
    setSaving(true)
    try {
      const res = await fetch(`/api/centro/servizi/${servizio.id}/congela`, { method: 'DELETE' })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error)
      onSave(data.servizio)
    } catch (e) {
      alert(e.message)
    } finally {
      setSaving(false)
    }
  }

  const handleMarketResearch = async () => {
    if (!servizio?.id) return
    setResearching(true)
    setMercatoErr(null)
    try {
      const res = await fetch(`/api/centro/servizi/${servizio.id}/market-research`, { method: 'POST' })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error)
      setMercato(data)
    } catch (e) {
      setMercatoErr(e.message)
    } finally {
      setResearching(false)
    }
  }

  const posLabel = mercato?.posizionamento ? POSIZIONAMENTO_LABEL[mercato.posizionamento] : null

  if (!mounted) return null

  return createPortal(
    <div className="fixed inset-0 z-[9999] flex items-center justify-center p-4"
      style={{ background: 'rgba(0,0,0,0.75)' }}>
      <div className="w-full max-w-2xl max-h-[90vh] overflow-y-auto rounded-2xl border border-slate-700/50"
        style={{ background: 'linear-gradient(135deg, #0f172a, #1e293b)' }}>

        {/* Header */}
        <div className="flex items-center justify-between p-5 border-b border-slate-700/50 sticky top-0 z-10"
          style={{ background: 'linear-gradient(135deg, #0f172a, #1e293b)' }}>
          <h2 className="text-lg font-bold text-white">{isEdit ? 'Modifica Servizio' : 'Nuovo Servizio'}</h2>
          <button onClick={onClose} className="text-slate-400 hover:text-white text-xl leading-none">✕</button>
        </div>

        <div className="p-5 space-y-6">
          {/* Dati base */}
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <h3 className="text-xs font-semibold text-slate-400 uppercase tracking-wider">Dati base</h3>
              {/* Toggle servizio / prodotto */}
              <div className="flex rounded-lg overflow-hidden border border-slate-600/50 text-xs">
                {['servizio', 'prodotto'].map(t => (
                  <button
                    key={t}
                    type="button"
                    onClick={() => set('tipo', t)}
                    className={`px-3 py-1.5 transition-colors capitalize ${
                      form.tipo === t
                        ? 'bg-teal-700 text-white font-semibold'
                        : 'bg-slate-800 text-slate-400 hover:text-white'
                    }`}
                  >
                    {t === 'servizio' ? '💇 Servizio' : '🧴 Prodotto'}
                  </button>
                ))}
              </div>
            </div>
            <div className="flex gap-2">
              <input
                value={form.nome} onChange={e => { set('nome', e.target.value); setAiSuggest(null) }}
                placeholder={form.tipo === 'prodotto' ? 'Nome prodotto *' : 'Nome servizio *'}
                className="flex-1 bg-slate-800 border border-slate-600/50 rounded-lg px-3 py-2 text-white text-sm placeholder-slate-500 focus:outline-none focus:border-teal-500"
              />
              <button
                type="button"
                onClick={handleAiSuggest}
                disabled={loadingSuggest || !form.nome.trim()}
                title="BeautyX suggerisce un nome più accattivante e un protocollo ottimizzato"
                className="px-3 py-2 bg-violet-700 hover:bg-violet-600 disabled:opacity-40 text-white text-xs font-semibold rounded-lg transition-all whitespace-nowrap flex items-center gap-1.5"
              >
                {loadingSuggest ? (
                  <><span className="animate-spin">⏳</span> Generando...</>
                ) : (
                  <>✨ BeautyX suggerisce</>
                )}
              </button>
            </div>

            {/* Pannello suggerimenti AI */}
            {aiSuggest && (
              <div className="bg-violet-950/60 border border-violet-700/50 rounded-xl p-4 space-y-4">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-semibold text-violet-300 uppercase tracking-wider">✨ Suggerimento BeautyX</span>
                  <button type="button" onClick={() => setAiSuggest(null)} className="text-slate-500 hover:text-slate-300 text-xs">✕ chiudi</button>
                </div>

                {/* Nome suggerito */}
                <div className="space-y-1.5">
                  <p className="text-xs text-slate-400 font-medium">Nome commerciale</p>
                  <div className="flex items-center gap-2 bg-slate-900/50 rounded-lg px-3 py-2">
                    <span className="flex-1 text-sm text-white font-medium italic">"{aiSuggest.nome_suggerito}"</span>
                    <button
                      type="button"
                      onClick={() => { set('nome', aiSuggest.nome_suggerito); setAiSuggest(s => ({ ...s, _nomeApplicato: true })) }}
                      className="shrink-0 px-2 py-1 bg-violet-700 hover:bg-violet-600 text-white text-xs rounded-md transition-all"
                    >
                      {aiSuggest._nomeApplicato ? '✓ Applicato' : 'Usa'}
                    </button>
                  </div>
                </div>

                {/* Protocollo tecnico */}
                <div className="space-y-1.5">
                  <p className="text-xs text-slate-400 font-medium">
                    Protocollo tecnico <span className="text-slate-600 font-normal">— fasi operative del trattamento</span>
                  </p>
                  <div className="bg-slate-900/50 border-l-2 border-blue-500/70 rounded-r-lg px-3 py-2.5 space-y-2">
                    <p className="text-sm text-slate-200 leading-relaxed">{aiSuggest.protocollo_tecnico}</p>
                    <div className="flex gap-2 flex-wrap">
                      <button
                        type="button"
                        onClick={() => { set('note_interne', aiSuggest.protocollo_tecnico); setAiSuggest(s => ({ ...s, _protocolloApplicato: 'tecnico' })) }}
                        className="px-2 py-1 bg-blue-700 hover:bg-blue-600 text-white text-xs rounded-md transition-all"
                      >
                        {aiSuggest._protocolloApplicato === 'tecnico' ? '✓ Applicato' : 'Usa solo questo'}
                      </button>
                      <button
                        type="button"
                        onClick={() => {
                          const combined = `PROTOCOLLO OPERATIVO:\n${aiSuggest.protocollo_tecnico}\n\nBENEFICI PER LA CLIENTE:\n${aiSuggest.benefici}`
                          set('note_interne', combined)
                          setAiSuggest(s => ({ ...s, _protocolloApplicato: 'entrambi' }))
                        }}
                        className="px-2 py-1 bg-violet-700 hover:bg-violet-600 text-white text-xs rounded-md transition-all"
                      >
                        {aiSuggest._protocolloApplicato === 'entrambi' ? '✓ Applicati entrambi' : 'Usa entrambi'}
                      </button>
                    </div>
                  </div>
                </div>

                {/* Benefici */}
                <div className="space-y-1.5">
                  <p className="text-xs text-slate-400 font-medium">
                    Benefici <span className="text-slate-600 font-normal">— risultati e sensazioni per la cliente</span>
                  </p>
                  <div className="bg-slate-900/50 border-l-2 border-teal-500/70 rounded-r-lg px-3 py-2.5 space-y-2">
                    <p className="text-sm text-slate-200 leading-relaxed">{aiSuggest.benefici}</p>
                    <button
                      type="button"
                      onClick={() => { set('note_interne', aiSuggest.benefici); setAiSuggest(s => ({ ...s, _protocolloApplicato: 'benefici' })) }}
                      className="px-2 py-1 bg-teal-700 hover:bg-teal-600 text-white text-xs rounded-md transition-all"
                    >
                      {aiSuggest._protocolloApplicato === 'benefici' ? '✓ Applicato' : 'Usa solo questo'}
                    </button>
                  </div>
                </div>

                <p className="text-xs text-slate-600 italic">Puoi modificare liberamente il testo dopo averlo applicato nel campo protocollo.</p>
              </div>
            )}

            <div className="grid grid-cols-2 gap-3">
              <input
                value={form.categoria || ''} onChange={e => set('categoria', e.target.value)}
                placeholder="Categoria (es. Viso, Corpo...)"
                className="bg-slate-800 border border-slate-600/50 rounded-lg px-3 py-2 text-white text-sm placeholder-slate-500 focus:outline-none focus:border-teal-500"
              />
              <input
                value={form.descrizione || ''} onChange={e => set('descrizione', e.target.value)}
                placeholder="Descrizione breve"
                className="bg-slate-800 border border-slate-600/50 rounded-lg px-3 py-2 text-white text-sm placeholder-slate-500 focus:outline-none focus:border-teal-500"
              />
            </div>
          </div>

          {/* Tempi operativi */}
          <div className="space-y-3">
            <div className="flex items-center gap-1.5">
              <h3 className="text-xs font-semibold text-slate-400 uppercase tracking-wider">⏱ Tempi operativi (minuti)</h3>
              <HelpTooltip
                title="Tempi operativi"
                content="Scomponi il servizio in 4 fasi: Preparazione (setup cabina/strumenti), Esecuzione (tempo con la cliente), Chiusura (riordino), Sanificazione (pulizia obbligatoria). Questi tempi determinano quanti servizi puoi fare al giorno e il costo reale per singolo trattamento."
              />
            </div>
            <div className="bg-slate-800/40 rounded-xl p-3 text-xs text-slate-400 mb-2">
              Scomponi il servizio nei 4 tempi. Es. Pressoterapia 45 min:<br/>
              <span className="text-teal-300">Prep 10</span> + <span className="text-amber-300">Autonomo 20</span> + <span className="text-teal-300">Chiusura 10</span> + <span className="text-slate-300">San. 5</span>
            </div>
            <div className="grid grid-cols-2 gap-3">
              {[
                { key: 'durata_preparazione_min', label: '🟢 Preparazione', sub: 'operatrice presente' },
                { key: 'durata_esecuzione_min',   label: '🟡 Esecuzione', sub: form.sovrapponibile ? 'operatrice libera (×⅔ costo)' : 'costo pieno (abilita sovrapponibile per ×⅔)' },
                { key: 'durata_chiusura_min',     label: '🟢 Chiusura', sub: 'operatrice presente' },
                { key: 'durata_sanificazione_min',label: '🔵 Sanificazione', sub: 'costo pieno' },
              ].map(({ key, label, sub }) => (
                <div key={key}>
                  <label className="block text-xs text-slate-400 mb-1">{label}</label>
                  <p className="text-xs text-slate-600 mb-1">{sub}</p>
                  <input
                    type="number" min="0" value={form[key] || 0}
                    onChange={e => set(key, Number(e.target.value))}
                    className="w-full bg-slate-800 border border-slate-600/50 rounded-lg px-3 py-2 text-white text-sm focus:outline-none focus:border-teal-500"
                  />
                </div>
              ))}
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-xs text-slate-400 mb-1">👩 Nr. operatrici</label>
                <input
                  type="number" min="1" value={form.nr_operatrici || 1}
                  onChange={e => set('nr_operatrici', Number(e.target.value))}
                  className="w-full bg-slate-800 border border-slate-600/50 rounded-lg px-3 py-2 text-white text-sm focus:outline-none focus:border-teal-500"
                />
              </div>
              <div className="flex items-end pb-1">
                <label className="flex items-center gap-2 cursor-pointer">
                  <div
                    onClick={() => set('sovrapponibile', !form.sovrapponibile)}
                    className={`w-10 h-6 rounded-full transition-colors cursor-pointer ${form.sovrapponibile ? 'bg-teal-600' : 'bg-slate-600'}`}
                  >
                    <div className={`w-4 h-4 bg-white rounded-full mt-1 transition-transform ${form.sovrapponibile ? 'translate-x-5' : 'translate-x-1'}`} />
                  </div>
                  <span className="text-xs text-slate-300">Sovrapponibile<br/><span className="text-slate-500">può fare altro durante l'esecuzione</span></span>
                </label>
              </div>
            </div>
          </div>

          {/* Materiali */}
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <div className="flex items-center gap-1.5">
                  <h3 className="text-xs font-semibold text-slate-400 uppercase tracking-wider">🧴 Materiali e consumabili</h3>
                  <HelpTooltip
                    title="Materiali e consumabili"
                    content="Inserisci i prodotti usati per ogni trattamento (es. maschera viso, guanti, telo). BeautyX calcola il costo vivo per singola esecuzione e lo aggiunge al prezzo minimo sostenibile. Più è preciso, più sarà preciso il prezzo consigliato."
                  />
                </div>
                {form.materiali.length > 0 && (
                  <label className="flex items-center gap-1 cursor-pointer ml-1">
                    <input
                      type="checkbox"
                      checked={msMat.allSelected(form.materiali.map((_, i) => i))}
                      onChange={() => msMat.toggleAll(form.materiali.map((_, i) => i))}
                      className="w-3.5 h-3.5 accent-teal-500 cursor-pointer"
                    />
                    <span className="text-xs text-slate-500">tutti</span>
                  </label>
                )}
              </div>
              <div className="flex items-center gap-2">
                {msMat.hasAny && (
                  <button onClick={removeMateriateSelected}
                    className="text-xs px-2 py-1 bg-red-600 hover:bg-red-500 text-white rounded-lg transition-all">
                    🗑 Elimina {msMat.count} selezionat{msMat.count === 1 ? 'o' : 'i'}
                  </button>
                )}
                <button onClick={addMateriale}
                  className="text-xs text-teal-400 hover:text-teal-300">
                  + Aggiungi
                </button>
              </div>
            </div>
            {form.materiali.length === 0 && (
              <p className="text-xs text-slate-600 italic">Nessun materiale aggiunto</p>
            )}
            {form.materiali.map((m, i) => (
              <div key={m.id || i} className={`grid grid-cols-12 gap-2 items-center rounded-lg px-1 py-0.5 transition-colors ${msMat.isSelected(i) ? 'bg-teal-900/20' : ''}`}>
                <div className="col-span-1 flex items-center justify-center">
                  <input
                    type="checkbox"
                    checked={msMat.isSelected(i)}
                    onChange={() => msMat.toggle(i)}
                    className="w-3.5 h-3.5 accent-teal-500 cursor-pointer"
                  />
                </div>
                <input value={m.nome} onChange={e => updateMateriale(i, 'nome', e.target.value)}
                  placeholder="Nome materiale"
                  className="col-span-4 bg-slate-800 border border-slate-600/50 rounded-lg px-2 py-1.5 text-white text-xs focus:outline-none focus:border-teal-500" />
                <input type="number" min="0" step="0.01" value={m.costo_unitario}
                  onChange={e => updateMateriale(i, 'costo_unitario', parseFloat(e.target.value) || 0)}
                  placeholder="€ unit."
                  className="col-span-3 bg-slate-800 border border-slate-600/50 rounded-lg px-2 py-1.5 text-white text-xs focus:outline-none focus:border-teal-500" />
                <input type="number" min="0" step="0.1" value={m.quantita_uso}
                  onChange={e => updateMateriale(i, 'quantita_uso', parseFloat(e.target.value) || 1)}
                  placeholder="Qta"
                  className="col-span-2 bg-slate-800 border border-slate-600/50 rounded-lg px-2 py-1.5 text-white text-xs focus:outline-none focus:border-teal-500" />
                <select value={m.unita} onChange={e => updateMateriale(i, 'unita', e.target.value)}
                  className="col-span-1 bg-slate-800 border border-slate-600/50 rounded-lg px-2 py-1.5 text-white text-xs focus:outline-none focus:border-teal-500">
                  {['pz', 'ml', 'g', 'l', 'kg'].map(u => <option key={u} value={u}>{u}</option>)}
                </select>
                <button onClick={() => removeMateriale(i)} className="col-span-1 text-red-400 hover:text-red-300 text-center text-sm">✕</button>
              </div>
            ))}
          </div>

          {/* Prezzo */}
          <div className="space-y-3">
            <div className="flex items-center gap-1.5">
              <h3 className="text-xs font-semibold text-slate-400 uppercase tracking-wider">💶 Prezzo e IVA</h3>
              <HelpTooltip
                title="Prezzo e IVA"
                content="Seleziona l'aliquota IVA applicabile al servizio (configurabile in Config IVA/Costi). Il prezzo pubblico che inserisci qui è quello di riferimento — ma il prezzo ufficiale si congela nella sezione 'Prezzo finale' scegliendo tra prezzo BeautyX, gestionale o manuale."
              />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-xs text-slate-400 mb-1">Aliquota IVA</label>
                <select
                  value={form.iva_aliquota_id || ''}
                  onChange={e => set('iva_aliquota_id', e.target.value || null)}
                  className="w-full bg-slate-800 border border-slate-600/50 rounded-lg px-3 py-2 text-white text-sm focus:outline-none focus:border-teal-500"
                >
                  <option value="">Seleziona IVA</option>
                  {aliquote.map(a => (
                    <option key={a.id} value={a.id}>{a.nome} ({a.percentuale}%)</option>
                  ))}
                </select>
              </div>
              <div>
                <label className="block text-xs text-slate-400 mb-1">
                  Ricarico: <span className="text-teal-300 font-bold">{form.ricarico_percentuale || 0}%</span>
                </label>
                <input
                  type="range" min="0" max="300" step="5"
                  value={form.ricarico_percentuale || 0}
                  onChange={e => set('ricarico_percentuale', Number(e.target.value))}
                  className="w-full accent-teal-500 mt-1"
                />
              </div>
            </div>
          </div>

          {/* ── Tre card prezzo: Calcolato / Gestionale / Manuale ── */}
          {(() => {
            const ivaObj = aliquote.find(a => a.id === form.iva_aliquota_id)
            const ivaPerc = ivaObj?.percentuale ?? 0
            const margineMin = form.margine_min_utile_perc ?? 40

            // Calcola breakdown dato un prezzo lordo e il costo vivo
            const calcBreakdown = (lordo, costoVivo) => {
              if (!lordo || lordo <= 0) return null
              const netto = lordo / (1 + ivaPerc / 100)
              const ivaAmt = lordo - netto
              const cv = costoVivo ?? 0
              const utile = netto - cv
              const utilePerc = cv > 0 ? +((utile / cv) * 100).toFixed(1) : null
              const utileMin = Math.max(0, utile) * (margineMin / 100)
              const prezzoMinNetto = cv + utileMin
              const prezzoMin = +(prezzoMinNetto * (1 + ivaPerc / 100)).toFixed(2)
              const scontoMax = lordo > prezzoMin ? +((1 - prezzoMin / lordo) * 100).toFixed(1) : 0
              return { netto: +netto.toFixed(2), ivaAmt: +ivaAmt.toFixed(2), utile: +utile.toFixed(2), utilePerc, scontoMax, prezzoMin }
            }

            // Card 1: Calcolato BeautyX
            const calc = costoOra ? calcolaServizio({
              servizio: form, costoOraEsercizio: costoOra, nrOpCentro, aliquotaIvaPerc: ivaPerc
            }) : null
            const bCalc = calc ? calcBreakdown(calc.prezzoLordo, calc.costoVivo) : null

            // Card 2: Gestionale (Koibox, read-only — presente solo se il servizio è aperto da import)
            const gRaw = form._prezzo_gestionale != null ? Number(form._prezzo_gestionale) : null
            const gLordo = gRaw != null
              ? (form._prezzo_iva_inclusa ? gRaw : gRaw * (1 + ivaPerc / 100))
              : null
            const bGest = gLordo != null ? calcBreakdown(gLordo, calc?.costoVivo ?? null) : null

            // Card 3: Manuale
            const pmRaw = prezzoManuale !== '' ? parseFloat(prezzoManuale) : null
            const pmLordo = pmRaw != null
              ? (prezzoManualeType === 'lordo' ? pmRaw : pmRaw * (1 + ivaPerc / 100))
              : null
            const bMan = pmLordo != null ? calcBreakdown(pmLordo, calc?.costoVivo ?? null) : null

            // Prezzo definitivo
            const prezzoDefinitivo =
              prezzoScelto === 'calcolato' ? calc?.prezzoLordo :
              prezzoScelto === 'gestionale' ? gLordo :
              prezzoScelto === 'manuale' ? pmLordo :
              null

            // Componente riusabile per righe breakdown
            const BreakdownRows = ({ lordo, bd, colorUtile, showNoCostoMsg }) => (
              <div className="space-y-1 text-xs mt-2">
                {ivaPerc > 0 && bd && (
                  <>
                    <div className="flex justify-between text-slate-400 ml-2">
                      <span>di cui IVA {ivaPerc}%</span>
                      <span>− {formatEuro(bd.ivaAmt)}</span>
                    </div>
                    <div className="flex justify-between text-slate-300 ml-2">
                      <span>Prezzo netto</span>
                      <span>{formatEuro(bd.netto)}</span>
                    </div>
                  </>
                )}
                {bd && calc ? (
                  <>
                    <div className="flex justify-between text-slate-400 ml-2">
                      <span>Costo vivo (formula)</span>
                      <span>− {formatEuro(calc.costoVivo)}</span>
                    </div>
                    <div className={`flex justify-between font-semibold ml-2 border-t border-slate-700/40 pt-1 mt-1 ${
                      bd.utile < 0 ? 'text-red-400' : bd.utilePerc !== null && bd.utilePerc < 20 ? 'text-amber-400' : colorUtile
                    }`}>
                      <span>Utile{bd.utilePerc !== null ? ` (${bd.utilePerc}%)` : ''}</span>
                      <span>{formatEuro(bd.utile)}</span>
                    </div>
                    <div className="flex justify-between text-slate-500 ml-2">
                      <span>Sconto max ({margineMin}% utile min.)</span>
                      <span className="text-amber-400 font-semibold">{bd.scontoMax}% — min {formatEuro(bd.prezzoMin)}</span>
                    </div>
                  </>
                ) : showNoCostoMsg && (
                  <p className="text-xs text-slate-500 ml-2 italic">Configura i costi di esercizio per vedere utile e sconto max</p>
                )}
              </div>
            )

            return (
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <h3 className="text-xs font-semibold text-slate-400 uppercase tracking-wider">💶 Scegli il prezzo definitivo</h3>
                  {ivaPerc === 0 && <p className="text-xs text-amber-500/80">Seleziona IVA per scomposizione lordo/netto</p>}
                </div>

                {/* Banner prezzo definitivo selezionato */}
                {prezzoDefinitivo && (
                  <div className="bg-teal-900/40 border border-teal-500/50 rounded-xl px-4 py-3 flex items-center justify-between">
                    <div>
                      <p className="text-xs text-teal-400 uppercase tracking-wider font-semibold">Prezzo definitivo da congelare</p>
                      <p className="text-2xl font-bold text-teal-300">{formatEuro(prezzoDefinitivo)}</p>
                    </div>
                    <button type="button" onClick={() => setPrezzoScelto(null)} className="text-xs text-slate-500 hover:text-slate-300 transition-colors">✕ Deseleziona</button>
                  </div>
                )}

                {/* Card 1: Calcolato BeautyX */}
                <div className={`rounded-xl border p-3 space-y-1 transition-all ${prezzoScelto === 'calcolato' ? 'border-teal-500/60 bg-teal-950/20' : 'border-slate-700/40'}`}>
                  <div className="flex items-center justify-between">
                    <p className={`text-xs font-semibold uppercase tracking-wider ${prezzoScelto === 'calcolato' ? 'text-teal-300' : 'text-slate-400'}`}>
                      📊 Calcolato BeautyX
                    </p>
                    <button
                      type="button"
                      onClick={() => calc && setPrezzoScelto(prezzoScelto === 'calcolato' ? null : 'calcolato')}
                      disabled={!calc}
                      className={`text-xs px-3 py-1 rounded-lg border transition-all disabled:opacity-30 ${
                        prezzoScelto === 'calcolato'
                          ? 'border-teal-500/60 text-teal-300 bg-teal-900/30'
                          : 'border-slate-600/50 text-slate-400 hover:text-white'
                      }`}
                    >
                      {prezzoScelto === 'calcolato' ? '✓ Selezionato' : 'Seleziona'}
                    </button>
                  </div>
                  {calc ? (
                    <>
                      <div className="flex justify-between items-center">
                        <span className={`text-sm font-bold ${prezzoScelto === 'calcolato' ? 'text-teal-300' : 'text-white'}`}>Prezzo al pubblico (lordo IVA)</span>
                        <span className={`text-xl font-bold ${prezzoScelto === 'calcolato' ? 'text-teal-300' : 'text-white'}`}>{formatEuro(calc.prezzoLordo)}</span>
                      </div>
                      <BreakdownRows lordo={calc.prezzoLordo} bd={bCalc} colorUtile="text-teal-400" showNoCostoMsg={false} />
                      <p className="text-xs text-slate-600 mt-1">Formula: ricarico {form.ricarico_percentuale || 0}% · {calc.minPieno}′ pieni{calc.minRidotto > 0 ? ` + ${calc.minRidotto}′ ⅔` : ''} · {form.nr_operatrici || 1}op/{nrOpCentro || 1}c</p>
                    </>
                  ) : (
                    <p className="text-xs text-slate-500 italic">Configura il costo di esercizio per calcolare il prezzo</p>
                  )}
                </div>

                {/* Card 2: Gestionale (solo se presente) */}
                {gRaw != null && (
                  <div className={`rounded-xl border p-3 space-y-1 transition-all ${prezzoScelto === 'gestionale' ? 'border-amber-500/60 bg-amber-950/20' : 'border-slate-700/40'}`}>
                    <div className="flex items-center justify-between">
                      <p className={`text-xs font-semibold uppercase tracking-wider ${prezzoScelto === 'gestionale' ? 'text-amber-300' : 'text-slate-400'}`}>
                        📋 Prezzo gestionale (Koibox)
                      </p>
                      <button
                        type="button"
                        onClick={() => gLordo && setPrezzoScelto(prezzoScelto === 'gestionale' ? null : 'gestionale')}
                        className={`text-xs px-3 py-1 rounded-lg border transition-all ${
                          prezzoScelto === 'gestionale'
                            ? 'border-amber-500/60 text-amber-300 bg-amber-900/30'
                            : 'border-slate-600/50 text-slate-400 hover:text-white'
                        }`}
                      >
                        {prezzoScelto === 'gestionale' ? '✓ Selezionato' : 'Seleziona'}
                      </button>
                    </div>
                    <label className="flex items-center gap-2 cursor-pointer">
                      <div
                        onClick={() => set('_prezzo_iva_inclusa', !form._prezzo_iva_inclusa)}
                        className={`w-8 h-4 rounded-full transition-colors cursor-pointer flex-shrink-0 ${form._prezzo_iva_inclusa ? 'bg-amber-600' : 'bg-slate-600'}`}
                      >
                        <div className={`w-3 h-3 bg-white rounded-full mt-0.5 transition-transform ${form._prezzo_iva_inclusa ? 'translate-x-4' : 'translate-x-0.5'}`} />
                      </div>
                      <span className="text-xs text-slate-400">IVA già inclusa nel prezzo gestionale</span>
                    </label>
                    <div className="flex justify-between items-center">
                      <span className={`text-sm font-bold ${prezzoScelto === 'gestionale' ? 'text-amber-300' : 'text-white'}`}>Prezzo al pubblico (lordo IVA)</span>
                      <span className={`text-xl font-bold ${prezzoScelto === 'gestionale' ? 'text-amber-300' : 'text-white'}`}>{formatEuro(gLordo)}</span>
                    </div>
                    <BreakdownRows lordo={gLordo} bd={bGest} colorUtile="text-amber-300" showNoCostoMsg />
                  </div>
                )}

                {/* Card 3: Manuale */}
                <div className={`rounded-xl border p-3 space-y-2 transition-all ${prezzoScelto === 'manuale' ? 'border-violet-500/60 bg-violet-950/20' : 'border-slate-700/40'}`}>
                  <div className="flex items-center justify-between">
                    <p className={`text-xs font-semibold uppercase tracking-wider ${prezzoScelto === 'manuale' ? 'text-violet-300' : 'text-slate-400'}`}>
                      ✏️ Prezzo manuale
                    </p>
                    <button
                      type="button"
                      onClick={() => pmLordo && setPrezzoScelto(prezzoScelto === 'manuale' ? null : 'manuale')}
                      disabled={!pmLordo}
                      className={`text-xs px-3 py-1 rounded-lg border transition-all disabled:opacity-30 ${
                        prezzoScelto === 'manuale'
                          ? 'border-violet-500/60 text-violet-300 bg-violet-900/30'
                          : 'border-slate-600/50 text-slate-400 hover:text-white'
                      }`}
                    >
                      {prezzoScelto === 'manuale' ? '✓ Selezionato' : 'Seleziona'}
                    </button>
                  </div>
                  <p className="text-xs text-slate-500">Inserisci il prezzo desiderato (es. arrotondato). Il sistema calcolerà utile e margini.</p>
                  <div className="flex gap-2 items-center">
                    <span className="text-slate-400 text-sm">€</span>
                    <input
                      type="number" min="0" step="0.10"
                      value={prezzoManuale}
                      onChange={e => {
                        setPrezzoManuale(e.target.value)
                        if (prezzoScelto === 'manuale' && e.target.value === '') setPrezzoScelto(null)
                      }}
                      placeholder="es. 59.00"
                      className="flex-1 bg-slate-700 border border-slate-500/50 rounded-lg px-3 py-2 text-white text-sm focus:outline-none focus:border-violet-500"
                    />
                    <button
                      type="button"
                      onClick={() => setPrezzoManualeType(t => t === 'lordo' ? 'netto' : 'lordo')}
                      className={`text-xs px-3 py-2 rounded-lg border transition-all whitespace-nowrap ${
                        prezzoManualeType === 'lordo'
                          ? 'border-amber-500/50 bg-amber-900/20 text-amber-300'
                          : 'border-slate-600/50 text-slate-400 hover:text-white'
                      }`}
                    >
                      {prezzoManualeType === 'lordo' ? 'IVA inclusa' : 'Senza IVA'}
                    </button>
                  </div>
                  {pmLordo != null && (
                    <>
                      <div className="flex justify-between items-center">
                        <span className={`text-sm font-bold ${prezzoScelto === 'manuale' ? 'text-violet-300' : 'text-white'}`}>Prezzo al pubblico (lordo IVA)</span>
                        <span className={`text-xl font-bold ${prezzoScelto === 'manuale' ? 'text-violet-300' : 'text-white'}`}>{formatEuro(pmLordo)}</span>
                      </div>
                      <BreakdownRows lordo={pmLordo} bd={bMan} colorUtile="text-violet-300" showNoCostoMsg />
                    </>
                  )}
                </div>
              </div>
            )
          })()}

          {/* Indagine di mercato */}
          {isEdit && (() => {
            // Gap: confronto prezzo selezionato vs media mercato
            const ivaObjM = aliquote.find(a => a.id === form.iva_aliquota_id)
            const ivaPercM = ivaObjM?.percentuale ?? 0
            const { prezzoLordo: prezzoAttuale } = _getPrezzoCongelato()
            const gapMercato = mercato?.prezzo_medio && prezzoAttuale
              ? prezzoAttuale - mercato.prezzo_medio
              : null

            return (
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <h3 className="text-xs font-semibold text-slate-400 uppercase tracking-wider">🔍 Indagine di mercato</h3>
                  <div className="flex gap-1">
                    {['ai', 'manuale'].map(t => (
                      <button key={t} type="button"
                        onClick={() => setMercatoTab(t)}
                        className={`text-xs px-3 py-1 rounded-lg transition-all ${mercatoTab === t ? 'bg-indigo-700 text-white' : 'text-slate-400 hover:text-white'}`}>
                        {t === 'ai' ? '🤖 AI' : '✏️ Manuale'}
                      </button>
                    ))}
                  </div>
                </div>

                {/* Tab AI */}
                {mercatoTab === 'ai' && (
                  <div className="space-y-2">
                    <div className="flex justify-end">
                      <button onClick={handleMarketResearch} disabled={researching}
                        className="text-xs px-3 py-1.5 bg-indigo-600 hover:bg-indigo-500 disabled:opacity-50 text-white rounded-lg transition-all">
                        {researching ? 'Ricerca in corso...' : '🔍 Avvia ricerca AI'}
                      </button>
                    </div>
                    {mercatoErr && <p className="text-xs text-red-400">{mercatoErr}</p>}
                    {!mercato && !researching && (
                      <p className="text-xs text-slate-500">Nessuna indagine. Clicca "Avvia ricerca AI" — la ricerca usa la città del tuo centro.</p>
                    )}
                  </div>
                )}

                {/* Tab Manuale */}
                {mercatoTab === 'manuale' && (
                  <div className="space-y-2">
                    <p className="text-xs text-slate-500">Inserisci i prezzi che hai rilevato direttamente sul mercato locale.</p>
                    <div className="grid grid-cols-3 gap-2">
                      {[
                        { key: 'min', label: 'Min €' },
                        { key: 'medio', label: 'Medio €' },
                        { key: 'max', label: 'Max €' },
                      ].map(({ key, label }) => (
                        <div key={key}>
                          <label className="block text-xs text-slate-500 mb-1">{label}</label>
                          <input type="number" min="0" step="0.50"
                            value={mercatoManuale[key]}
                            onChange={e => setMercatoManuale(m => ({ ...m, [key]: e.target.value }))}
                            className="w-full bg-slate-800 border border-slate-600/50 rounded-lg px-2 py-1.5 text-white text-sm focus:outline-none focus:border-indigo-500"
                          />
                        </div>
                      ))}
                    </div>
                    <textarea
                      value={mercatoManuale.note}
                      onChange={e => setMercatoManuale(m => ({ ...m, note: e.target.value }))}
                      placeholder="Note (es. centri di riferimento, fonti...)"
                      rows={2}
                      className="w-full bg-slate-800 border border-slate-600/50 rounded-lg px-2 py-1.5 text-white text-xs focus:outline-none focus:border-indigo-500 resize-none"
                    />
                    <button
                      type="button"
                      disabled={savingMercato || !mercatoManuale.min || !mercatoManuale.medio || !mercatoManuale.max}
                      onClick={async () => {
                        setSavingMercato(true)
                        try {
                          const res = await fetch(`/api/centro/servizi/${servizio.id}/market-research`, {
                            method: 'PUT',
                            headers: { 'Content-Type': 'application/json' },
                            body: JSON.stringify({
                              prezzo_min: Number(mercatoManuale.min),
                              prezzo_max: Number(mercatoManuale.max),
                              prezzo_medio: Number(mercatoManuale.medio),
                              note: mercatoManuale.note,
                            }),
                          })
                          const data = await res.json()
                          if (!res.ok) throw new Error(data.error)
                          setMercato(data)
                        } catch (e) {
                          alert(e.message)
                        } finally {
                          setSavingMercato(false)
                        }
                      }}
                      className="text-xs px-4 py-1.5 bg-indigo-700 hover:bg-indigo-600 disabled:opacity-50 text-white rounded-lg transition-all"
                    >
                      {savingMercato ? 'Salvataggio...' : '💾 Salva indagine manuale'}
                    </button>
                  </div>
                )}

                {/* Dati mercato (comuni a entrambi i tab) */}
                {mercato && (
                  <div className="bg-slate-800/50 border border-slate-700/50 rounded-xl p-4 space-y-2">
                    <div className="flex gap-4 text-sm">
                      <div className="text-center">
                        <p className="text-slate-500 text-xs">Min</p>
                        <p className="text-white font-bold">{formatEuro(mercato.prezzo_min)}</p>
                      </div>
                      <div className="text-center flex-1">
                        <p className="text-slate-500 text-xs">Media zona</p>
                        <p className="text-teal-300 font-bold text-lg">{formatEuro(mercato.prezzo_medio)}</p>
                      </div>
                      <div className="text-center">
                        <p className="text-slate-500 text-xs">Max</p>
                        <p className="text-white font-bold">{formatEuro(mercato.prezzo_max)}</p>
                      </div>
                    </div>
                    {posLabel && (
                      <p className={`text-sm font-semibold ${posLabel.color}`}>
                        {posLabel.icon} {posLabel.label}
                      </p>
                    )}
                    {/* Gap prezzo selezionato vs mercato */}
                    {gapMercato !== null && (
                      <div className={`flex items-center justify-between text-xs px-3 py-2 rounded-lg mt-1 ${
                        Math.abs(gapMercato) < 2 ? 'bg-teal-900/20 text-teal-300'
                        : gapMercato > 0 ? 'bg-blue-900/20 text-blue-300'
                        : 'bg-orange-900/20 text-orange-300'
                      }`}>
                        <span>Prezzo selezionato ({formatEuro(prezzoAttuale)}) vs media mercato</span>
                        <span className="font-bold">
                          {gapMercato > 0 ? '+' : ''}{formatEuro(gapMercato)}
                          {' '}({gapMercato > 0 ? 'sopra' : 'sotto'} del {Math.abs((gapMercato / mercato.prezzo_medio) * 100).toFixed(1)}%)
                        </span>
                      </div>
                    )}
                    {!gapMercato && mercato?.prezzo_medio && (
                      <p className="text-xs text-slate-500 italic">Seleziona un prezzo definitivo qui sopra per vedere il confronto col mercato.</p>
                    )}
                    {mercato.note && (
                      <p className="text-xs text-slate-400 leading-relaxed">{mercato.note}</p>
                    )}
                  </div>
                )}
              </div>
            )
          })()}

          {/* Note interne + barcode */}
          <div className="space-y-2">
            <div className="flex items-center gap-1.5">
              <h3 className="text-xs font-semibold text-slate-400 uppercase tracking-wider">📝 Note / Protocollo operativo</h3>
              <HelpTooltip
                title="Protocollo operativo"
                content="Descrivi come si esegue il servizio e i benefici per la cliente. Questo testo appare nel listino ufficiale stampato. Usa il bottone '✨ BeautyX suggerisce' per generare automaticamente un nome commerciale più accattivante, il protocollo tecnico e i benefici separati."
              />
            </div>
            <textarea
              value={form.note_interne || ''}
              onChange={e => { set('note_interne', e.target.value); setAiSuggest(s => s ? { ...s, _protocolloApplicato: false } : null) }}
              placeholder={form.tipo === 'prodotto'
                ? 'Descrizione prodotto, modalità d\'uso, ingredienti chiave...'
                : 'Protocollo del servizio, strategie per giustificare il prezzo, spunti di miglioramento...'}
              rows={3}
              className="w-full bg-slate-800 border border-slate-600/50 rounded-lg px-3 py-2 text-white text-sm placeholder-slate-500 focus:outline-none focus:border-teal-500 resize-none"
            />
            {/* Codice barcode/QR — generato automaticamente al salvataggio */}
            {form.codice_barcode ? (
              <div className="flex items-center gap-2 bg-slate-900/50 rounded-lg px-3 py-2">
                <span className="text-xs text-slate-500">🔲 Codice:</span>
                <span className="text-sm font-mono font-bold text-teal-300 tracking-widest">{form.codice_barcode}</span>
                <span className="text-xs text-slate-600 ml-auto">generato automaticamente</span>
              </div>
            ) : (
              <p className="text-xs text-slate-600 italic">
                🔲 Il codice barcode/QR verrà generato automaticamente al salvataggio nel formato S-001-000001
              </p>
            )}
            {/* Bottone notifica HPA / BeautyX */}
            {isEdit && (
              <button
                type="button"
                disabled={sendingHpa}
                onClick={async () => {
                  const { prezzoLordo } = _getPrezzoCongelato()
                  const contenuto = `Richiesta consulenza servizio: "${form.nome}"` +
                    (form.categoria ? ` (${form.categoria})` : '') +
                    (prezzoLordo ? ` — prezzo selezionato: ${formatEuro(prezzoLordo)}` : '') +
                    (form.note_interne ? `\n\nNote: ${form.note_interne}` : '') +
                    '\n\nIl titolare chiede suggerimenti per ottimizzare questo servizio.'
                  setSendingHpa(true)
                  try {
                    const res = await fetch('/api/hpa/messages', {
                      method: 'POST',
                      headers: { 'Content-Type': 'application/json' },
                      body: JSON.stringify({ contenuto }),
                    })
                    if (res.ok) alert('Segnalazione inviata a HPA/BeautyX!')
                    else alert('Errore nell\'invio. Riprova.')
                  } catch {
                    alert('Errore di rete.')
                  } finally {
                    setSendingHpa(false)
                  }
                }}
                className="text-xs px-3 py-1.5 bg-indigo-800/60 hover:bg-indigo-700/70 border border-indigo-500/40 text-indigo-300 rounded-lg transition-all disabled:opacity-50"
              >
                {sendingHpa ? 'Invio...' : '📩 Segnala a HPA/BeautyX'}
              </button>
            )}
          </div>
        </div>

        {/* Stato prezzo congelato — solo in modifica */}
        {isEdit && servizio?.prezzo_pubblico && (
          <div className="px-5 pb-3 border-t border-slate-700/30 pt-4">
            <div className="flex items-center justify-between bg-green-950/30 border border-green-600/30 rounded-xl px-4 py-3">
              <div>
                <p className="text-xs font-semibold text-green-300">Prezzo ufficiale congelato</p>
                <p className="text-lg font-bold text-green-200">{formatEuro(servizio.prezzo_pubblico)}</p>
                {servizio.prezzo_congelato_at && (
                  <p className="text-xs text-green-600 mt-0.5">
                    dal {new Date(servizio.prezzo_congelato_at).toLocaleDateString('it-IT')}
                  </p>
                )}
              </div>
              <button onClick={handleScongelaPrezzo} disabled={saving}
                className="text-xs px-3 py-1.5 text-red-400 hover:text-red-300 hover:bg-red-900/20 rounded-lg transition-all disabled:opacity-50">
                Scongela
              </button>
            </div>
          </div>
        )}

        {/* Footer */}
        <div className="flex justify-between items-center gap-3 p-5 border-t border-slate-700/50 sticky bottom-0"
          style={{ background: 'linear-gradient(135deg, #0f172a, #1e293b)' }}>
          <button onClick={onClose}
            className="px-4 py-2 text-sm text-slate-400 hover:text-white transition-colors">
            Annulla
          </button>
          <div className="flex gap-2">
            {/* Salva senza congelare — solo in edit */}
            {isEdit && (
              <button onClick={handleSave} disabled={saving || !form.nome.trim()}
                className="px-4 py-2 bg-slate-700 hover:bg-slate-600 disabled:opacity-50 text-white text-sm rounded-lg transition-all">
                {saving ? '...' : 'Salva senza congelare'}
              </button>
            )}
            {/* Salva e congela — richiede un prezzo selezionato */}
            <button
              onClick={() => {
                if (!prezzoScelto) {
                  alert('Seleziona prima un prezzo definitivo (Calcolato, Gestionale o Manuale) prima di congelare.')
                  return
                }
                handleCongelaESalva()
              }}
              disabled={saving || !form.nome.trim()}
              className={`px-5 py-2 text-white text-sm font-semibold rounded-lg transition-all disabled:opacity-50 ${
                prezzoScelto
                  ? 'bg-teal-600 hover:bg-teal-500'
                  : 'bg-slate-600 hover:bg-slate-500'
              }`}>
              {saving ? 'Salvataggio...' : isEdit
                ? (servizio?.prezzo_pubblico ? '🔒 Aggiorna e ricongela' : '🔒 Salva e congela al listino')
                : '🔒 Crea e aggiungi al listino'}
            </button>
          </div>
        </div>
      </div>
    </div>,
    document.body
  )
}

// ─────────────────────────────────────────────
// Tab Orari
// ─────────────────────────────────────────────
function TabOrari() {
  const [orari, setOrari] = useState(ORARIO_DEFAULT)
  const [chiusure, setChiusure] = useState([])
  const [saving, setSaving] = useState(false)
  const [loading, setLoading] = useState(true)
  const [saved, setSaved] = useState(false)

  useEffect(() => {
    fetch('/api/centro/orari').then(r => r.json()).then(d => {
      if (d.orari?.length) setOrari(d.orari)
      if (d.chiusure) setChiusure(d.chiusure)
    }).finally(() => setLoading(false))
  }, [])

  const updateGiorno = (idx, key, val) => {
    setOrari(prev => prev.map((g, i) => i === idx ? { ...g, [key]: val } : g))
  }

  const addChiusura = () => setChiusure(prev => [
    ...prev,
    { id: Date.now(), data_inizio: '', data_fine: '', motivo: '' }
  ])

  const handleSave = async () => {
    setSaving(true)
    try {
      await fetch('/api/centro/orari', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ orari, chiusure: chiusure.filter(c => c.data_inizio && c.data_fine) }),
      })
      setSaved(true)
      setTimeout(() => setSaved(false), 2000)
    } finally {
      setSaving(false)
    }
  }

  if (loading) return <div className="text-slate-400 text-sm">Caricamento...</div>

  return (
    <div className="space-y-6">
      <div className="space-y-3">
        <h3 className="text-sm font-semibold text-white">Orari settimanali</h3>
        {orari.map((g, i) => (
          <div key={g.giorno_settimana} className="flex items-center gap-4 bg-slate-800/40 rounded-xl px-4 py-3">
            <div className="w-24 text-sm text-slate-300">{GIORNI[g.giorno_settimana]}</div>
            <label className="flex items-center gap-2 cursor-pointer">
              <div
                onClick={() => updateGiorno(i, 'aperto', !g.aperto)}
                className={`w-9 h-5 rounded-full transition-colors cursor-pointer ${g.aperto ? 'bg-teal-600' : 'bg-slate-600'}`}
              >
                <div className={`w-3.5 h-3.5 bg-white rounded-full mt-0.5 transition-transform ${g.aperto ? 'translate-x-4' : 'translate-x-0.5'}`} />
              </div>
              <span className={`text-xs ${g.aperto ? 'text-teal-300' : 'text-slate-500'}`}>
                {g.aperto ? 'Aperto' : 'Chiuso'}
              </span>
            </label>
            {g.aperto && (
              <div className="flex items-center gap-2 text-sm">
                <input type="time" value={g.orario_apertura || '09:00'}
                  onChange={e => updateGiorno(i, 'orario_apertura', e.target.value)}
                  className="bg-slate-800 border border-slate-600/50 rounded-lg px-2 py-1 text-white text-sm focus:outline-none focus:border-teal-500" />
                <span className="text-slate-500">–</span>
                <input type="time" value={g.orario_chiusura || '18:00'}
                  onChange={e => updateGiorno(i, 'orario_chiusura', e.target.value)}
                  className="bg-slate-800 border border-slate-600/50 rounded-lg px-2 py-1 text-white text-sm focus:outline-none focus:border-teal-500" />
              </div>
            )}
          </div>
        ))}
      </div>

      {/* Chiusure eccezionali */}
      <div className="space-y-3">
        <div className="flex items-center justify-between">
          <h3 className="text-sm font-semibold text-white">Chiusure eccezionali (ferie, festività)</h3>
          <button onClick={addChiusura}
            className="text-xs text-teal-400 hover:text-teal-300">+ Aggiungi</button>
        </div>
        {chiusure.length === 0 && (
          <p className="text-xs text-slate-500 italic">Nessuna chiusura programmata</p>
        )}
        {chiusure.map((c, i) => (
          <div key={c.id || i} className="grid grid-cols-12 gap-2 items-center bg-slate-800/40 rounded-xl px-4 py-3">
            <input type="date" value={c.data_inizio}
              onChange={e => setChiusure(prev => prev.map((x, j) => j === i ? { ...x, data_inizio: e.target.value } : x))}
              className="col-span-3 bg-slate-800 border border-slate-600/50 rounded-lg px-2 py-1.5 text-white text-sm" />
            <span className="col-span-1 text-slate-500 text-center">–</span>
            <input type="date" value={c.data_fine}
              onChange={e => setChiusure(prev => prev.map((x, j) => j === i ? { ...x, data_fine: e.target.value } : x))}
              className="col-span-3 bg-slate-800 border border-slate-600/50 rounded-lg px-2 py-1.5 text-white text-sm" />
            <input value={c.motivo || ''} placeholder="Motivo (es. Ferie agosto)"
              onChange={e => setChiusure(prev => prev.map((x, j) => j === i ? { ...x, motivo: e.target.value } : x))}
              className="col-span-4 bg-slate-800 border border-slate-600/50 rounded-lg px-2 py-1.5 text-white text-sm" />
            <button onClick={() => setChiusure(prev => prev.filter((_, j) => j !== i))}
              className="col-span-1 text-red-400 hover:text-red-300 text-sm text-center">✕</button>
          </div>
        ))}
      </div>

      <button onClick={handleSave} disabled={saving}
        className="px-6 py-2 bg-teal-600 hover:bg-teal-500 disabled:opacity-50 text-white text-sm font-semibold rounded-lg transition-all">
        {saved ? '✓ Salvato' : saving ? 'Salvataggio...' : 'Salva orari'}
      </button>
    </div>
  )
}

// ─────────────────────────────────────────────
// Tab Dipendenti
// ─────────────────────────────────────────────
function TabDipendenti() {
  const [dipendenti, setDipendenti] = useState([])
  const [loading, setLoading] = useState(true)
  const [showForm, setShowForm] = useState(false)
  const [form, setForm] = useState({ nome: '', cognome: '', ruolo: '', email: '', telefono: '', ore_contrattuali_settimanali: 40 })
  const [saving, setSaving] = useState(false)
  const [bulkLoading, setBulkLoading] = useState(false)
  const ms = useMultiSelect()

  useEffect(() => {
    fetch('/api/employees').then(r => r.json()).then(d => {
      setDipendenti(Array.isArray(d.employees) ? d.employees : Array.isArray(d) ? d : [])
    }).catch(() => {}).finally(() => setLoading(false))
  }, [])

  const handleSave = async () => {
    setSaving(true)
    try {
      const res = await fetch('/api/employees', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(form),
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error)
      setDipendenti(prev => [...prev, data.employee || data])
      setShowForm(false)
      setForm({ nome: '', cognome: '', ruolo: '', email: '', telefono: '', ore_contrattuali_settimanali: 40 })
    } catch (e) {
      alert(e.message)
    } finally {
      setSaving(false)
    }
  }

  const toggleAttivo = async (dip) => {
    await fetch(`/api/employees/${dip.id}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ attivo: !dip.attivo }),
    })
    setDipendenti(prev => prev.map(d => d.id === dip.id ? { ...d, attivo: !d.attivo } : d))
  }

  const bulkSetAttivo = async (valore) => {
    setBulkLoading(true)
    try {
      await Promise.all(ms.ids.map(id =>
        fetch(`/api/employees/${id}`, {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ attivo: valore }),
        })
      ))
      setDipendenti(prev => prev.map(d => ms.isSelected(d.id) ? { ...d, attivo: valore } : d))
      ms.clear()
    } finally {
      setBulkLoading(false)
    }
  }

  if (loading) return <div className="text-slate-400 text-sm">Caricamento...</div>

  const dipIds = dipendenti.map(d => d.id)

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <p className="text-sm text-slate-400">{dipendenti.length} dipendente{dipendenti.length !== 1 ? 'i' : ''}</p>
        <button onClick={() => setShowForm(!showForm)}
          className="px-4 py-2 bg-teal-600 hover:bg-teal-500 text-white text-sm font-semibold rounded-lg transition-all">
          + Nuovo dipendente
        </button>
      </div>

      {showForm && (
        <div className="bg-slate-800/50 border border-slate-700/50 rounded-xl p-4 space-y-3">
          <h3 className="text-sm font-semibold text-white">Nuovo dipendente</h3>
          <div className="grid grid-cols-2 gap-3">
            {[['nome', 'Nome *'], ['cognome', 'Cognome *'], ['ruolo', 'Ruolo'], ['email', 'Email']].map(([k, l]) => (
              <input key={k} value={form[k] || ''} onChange={e => setForm(f => ({ ...f, [k]: e.target.value }))}
                placeholder={l}
                className="bg-slate-800 border border-slate-600/50 rounded-lg px-3 py-2 text-white text-sm placeholder-slate-500 focus:outline-none focus:border-teal-500" />
            ))}
            <input type="number" value={form.ore_contrattuali_settimanali}
              onChange={e => setForm(f => ({ ...f, ore_contrattuali_settimanali: Number(e.target.value) }))}
              placeholder="Ore/settimana"
              className="bg-slate-800 border border-slate-600/50 rounded-lg px-3 py-2 text-white text-sm focus:outline-none focus:border-teal-500" />
          </div>
          <div className="flex gap-3">
            <button onClick={handleSave} disabled={saving || !form.nome}
              className="px-4 py-2 bg-teal-600 hover:bg-teal-500 disabled:opacity-50 text-white text-sm font-semibold rounded-lg">
              {saving ? 'Salvataggio...' : 'Salva'}
            </button>
            <button onClick={() => setShowForm(false)} className="px-4 py-2 text-sm text-slate-400 hover:text-white">Annulla</button>
          </div>
        </div>
      )}

      <BulkActionBar
        count={ms.count} totalCount={dipendenti.length}
        onClear={ms.clear} onSelectAll={() => ms.toggleAll(dipIds)}
        actions={[
          { label: 'Attiva', icon: '✓', color: 'teal', loading: bulkLoading, onClick: () => bulkSetAttivo(true) },
          { label: 'Disattiva', icon: '✕', color: 'slate', loading: bulkLoading, onClick: () => bulkSetAttivo(false) },
        ]}
      />

      <div className="space-y-2">
        {dipendenti.length === 0 && (
          <p className="text-slate-500 text-sm italic text-center py-8">Nessun dipendente registrato</p>
        )}
        {dipendenti.map(d => (
          <div key={d.id} className={`flex items-center gap-3 bg-slate-800/40 rounded-xl px-4 py-3 transition-colors ${!d.attivo ? 'opacity-50' : ''} ${ms.isSelected(d.id) ? 'ring-1 ring-teal-500/40' : ''}`}>
            <input type="checkbox" checked={ms.isSelected(d.id)} onChange={() => ms.toggle(d.id)}
              className="w-4 h-4 accent-teal-500 cursor-pointer flex-shrink-0" />
            <div className="flex-1 min-w-0">
              <p className="text-white text-sm font-medium">{d.nome} {d.cognome}</p>
              <p className="text-slate-400 text-xs">{d.ruolo || '—'} · {d.ore_contrattuali_settimanali || 40}h/sett</p>
              {d.email && <p className="text-slate-500 text-xs">{d.email}</p>}
            </div>
            <button onClick={() => toggleAttivo(d)}
              className={`text-xs px-3 py-1 rounded-full border transition-colors flex-shrink-0 ${
                d.attivo
                  ? 'border-teal-500/40 text-teal-400 hover:bg-teal-900/30'
                  : 'border-slate-600/40 text-slate-500 hover:bg-slate-700/30'
              }`}>
              {d.attivo ? 'Attivo' : 'Inattivo'}
            </button>
          </div>
        ))}
      </div>
    </div>
  )
}

// ─────────────────────────────────────────────
// Tab Listino
// ─────────────────────────────────────────────
function TabListino() {
  const { currentCentro } = useAuth()
  const [subTab, setSubTab] = useState('config')
  const [aliquote, setAliquote] = useState([])
  const [costiConfig, setCostiConfig] = useState({ usa_calcolo_automatico: true, costo_ora_manuale: null, nr_operatrici_operative: null })
  const [costoOraAuto, setCostoOraAuto] = useState(null)
  const [costoOraEffettivo, setCostoOraEffettivo] = useState(null)
  const [nrOpCentro, setNrOpCentro] = useState(1)
  const [nrOpDipendenti, setNrOpDipendenti] = useState(0)
  const [servizi, setServizi] = useState([])
  const [importati, setImportati] = useState([])
  const [pacchetti, setPacchetti] = useState([])
  const [loading, setLoading] = useState(true)
  const [modalServizio, setModalServizio] = useState(null)
  const [bulkLoading, setBulkLoading] = useState(false)
  const msServizi   = useMultiSelect()
  const msImportati = useMultiSelect()
  const msPacchetti = useMultiSelect()

  useEffect(() => {
    Promise.all([
      fetch('/api/centro/iva-aliquote').then(r => r.json()),
      fetch('/api/centro/costi-esercizio').then(r => r.json()),
      fetch('/api/centro/servizi').then(r => r.json()),
      fetch('/api/centro/pacchetti').then(r => r.json()),
    ]).then(([ivaData, costiData, serviziData, pacchettiData]) => {
      setAliquote(ivaData.aliquote || [])
      if (costiData.config) setCostiConfig(costiData.config)
      if (costiData.costo_ora_auto !== null) setCostoOraAuto(costiData.costo_ora_auto)
      if (costiData.costo_ora_effettivo) setCostoOraEffettivo(costiData.costo_ora_effettivo)
      setNrOpCentro(costiData.nr_op_centro || 1)
      setNrOpDipendenti(costiData.nr_op_dipendenti_attivi || 0)
      setServizi(serviziData.servizi || [])
      setImportati((serviziData.importati || []).filter(k => !k._nel_listino))
      setPacchetti(pacchettiData.pacchetti || [])
    }).finally(() => setLoading(false))
  }, [])

  const saveCosti = async () => {
    const res = await fetch('/api/centro/costi-esercizio', {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(costiConfig),
    })
    const data = await res.json()
    if (data.config) {
      setCostiConfig(data.config)
      const eff = costiConfig.usa_calcolo_automatico !== false
        ? (costoOraAuto ?? costiConfig.costo_ora_manuale ?? 40)
        : (costiConfig.costo_ora_manuale ?? costoOraAuto ?? 40)
      setCostoOraEffettivo(eff)
      // Aggiorna nrOpCentro dopo salvataggio
      if (data.config.nr_operatrici_operative) setNrOpCentro(data.config.nr_operatrici_operative)
    }
  }

  const saveAliquota = async (aliquota) => {
    const isEdit = !!aliquota.id && !aliquota._new
    const url = isEdit ? `/api/centro/iva-aliquote/${aliquota.id}` : '/api/centro/iva-aliquote'
    const method = isEdit ? 'PUT' : 'POST'
    const res = await fetch(url, {
      method,
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(aliquota),
    })
    const data = await res.json()
    if (data.aliquota) {
      setAliquote(prev => isEdit
        ? prev.map(a => a.id === data.aliquota.id ? data.aliquota : a)
        : [...prev, data.aliquota]
      )
    }
  }

  const deleteAliquota = async (id) => {
    await fetch(`/api/centro/iva-aliquote/${id}`, { method: 'DELETE' })
    setAliquote(prev => prev.filter(a => a.id !== id))
  }

  const onServizioSaved = (servizio) => {
    setServizi(prev => {
      const idx = prev.findIndex(s => s.id === servizio.id)
      if (idx >= 0) return prev.map(s => s.id === servizio.id ? servizio : s)
      return [...prev, servizio]
    })
    setModalServizio(null)
  }

  const deleteServizio = async (id) => {
    if (!confirm('Eliminare il servizio?')) return
    await fetch(`/api/centro/servizi/${id}`, { method: 'DELETE' })
    setServizi(prev => prev.filter(s => s.id !== id))
  }

  const deleteImportato = async (k) => {
    if (!confirm(`Rimuovere "${k.nome}" dall'elenco importati?`)) return
    const params = new URLSearchParams()
    if (k.referenza) params.set('referenza', k.referenza)
    else params.set('nome', k.nome)
    const res = await fetch(`/api/centro/servizi/importati?${params}`, { method: 'DELETE' })
    if (res.ok) {
      setImportati(prev => prev.filter(x =>
        k.referenza ? x.referenza !== k.referenza : x.nome !== k.nome
      ))
    }
  }

  // ── Bulk actions ──────────────────────────────────────────
  const bulkDeleteServizi = async () => {
    if (!confirm(`Eliminare ${msServizi.count} servizi selezionati?`)) return
    setBulkLoading(true)
    try {
      await Promise.all(msServizi.ids.map(id =>
        fetch(`/api/centro/servizi/${id}`, { method: 'DELETE' })
      ))
      setServizi(prev => prev.filter(s => !msServizi.isSelected(s.id)))
      msServizi.clear()
    } finally { setBulkLoading(false) }
  }

  const bulkDeleteImportati = async () => {
    if (!confirm(`Rimuovere ${msImportati.count} servizi importati?`)) return
    setBulkLoading(true)
    try {
      const selezionati = importati.filter(k => msImportati.isSelected(k.referenza || k.nome))
      await Promise.all(selezionati.map(k => {
        const params = new URLSearchParams()
        if (k.referenza) params.set('referenza', k.referenza)
        else params.set('nome', k.nome)
        return fetch(`/api/centro/servizi/importati?${params}`, { method: 'DELETE' })
      }))
      setImportati(prev => prev.filter(k => !msImportati.isSelected(k.referenza || k.nome)))
      msImportati.clear()
    } finally { setBulkLoading(false) }
  }

  const bulkDeletePacchetti = async () => {
    if (!confirm(`Eliminare ${msPacchetti.count} pacchetti selezionati?`)) return
    setBulkLoading(true)
    try {
      await Promise.all(msPacchetti.ids.map(id =>
        fetch(`/api/centro/pacchetti/${id}`, { method: 'DELETE' })
      ))
      setPacchetti(prev => prev.filter(p => !msPacchetti.isSelected(p.id)))
      msPacchetti.clear()
    } finally { setBulkLoading(false) }
  }

  if (loading) return <div className="text-slate-400 text-sm">Caricamento...</div>

  return (
    <>
      {/* Sub-tabs */}
      <div className="flex gap-2 mb-6 border-b border-slate-700/50 pb-3">
        {[
          { id: 'config', label: '⚙️ Configurazione' },
          { id: 'servizi', label: `💇 Servizi & Prodotti (${servizi.length})` },
          { id: 'pacchetti', label: `📦 Pacchetti (${pacchetti.length})` },
          { id: 'listino', label: `📋 Listino Ufficiale (${servizi.filter(s => s.prezzo_pubblico).length})` },
        ].map(st => (
          <button key={st.id} onClick={() => setSubTab(st.id)}
            className={`text-sm px-4 py-1.5 rounded-lg transition-all ${
              subTab === st.id ? 'bg-slate-700 text-white' : 'text-slate-400 hover:text-white'
            }`}>
            {st.label}
          </button>
        ))}
      </div>

      {/* Sub-tab Configurazione */}
      {subTab === 'config' && (
        <div className="space-y-6">
          {/* IVA */}
          <div className="space-y-3">
            <div className="flex items-center gap-2">
              <h3 className="text-sm font-semibold text-white">Aliquote IVA ({aliquote.length}/3)</h3>
              <HelpTooltip
                title="Aliquote IVA"
                content="Configura fino a 3 aliquote IVA (es. 22% standard, 10% ridotta, 0% esente). Ogni servizio del listino sceglierà la sua aliquota da qui. Le aliquote servono anche al calcolo del prezzo lordo (IVA inclusa) da mostrare al pubblico."
              />
            </div>
            <p className="text-xs text-slate-400">Definisci fino a 3 regimi fiscali da associare ai tuoi servizi.</p>
            {aliquote.map((a, i) => (
              <div key={a.id} className="flex items-center gap-3 bg-slate-800/40 rounded-xl px-4 py-3">
                <input value={a.nome} onChange={e => {
                  const updated = { ...a, nome: e.target.value }
                  setAliquote(prev => prev.map((x, j) => j === i ? updated : x))
                }}
                  className="flex-1 bg-slate-800 border border-slate-600/50 rounded-lg px-3 py-1.5 text-white text-sm focus:outline-none focus:border-teal-500"
                  placeholder="Nome (es. Ordinaria)" />
                <input type="number" min="0" max="100" step="0.5" value={a.percentuale}
                  onChange={e => setAliquote(prev => prev.map((x, j) => j === i ? { ...x, percentuale: parseFloat(e.target.value) } : x))}
                  className="w-20 bg-slate-800 border border-slate-600/50 rounded-lg px-3 py-1.5 text-white text-sm text-center focus:outline-none focus:border-teal-500" />
                <span className="text-slate-400 text-sm">%</span>
                <button onClick={() => saveAliquota(a)}
                  className="text-xs px-3 py-1.5 bg-teal-600 hover:bg-teal-500 text-white rounded-lg">Salva</button>
                <button onClick={() => deleteAliquota(a.id)}
                  className="text-xs text-red-400 hover:text-red-300">✕</button>
              </div>
            ))}
            {aliquote.length < 3 && (
              <button onClick={() => setAliquote(prev => [...prev, { id: null, _new: true, nome: '', percentuale: 22, predefinita: false }])}
                className="text-xs text-teal-400 hover:text-teal-300">+ Aggiungi aliquota</button>
            )}
          </div>

          {/* Costo di esercizio */}
          <div className="space-y-3">
            <div className="flex items-center gap-2">
              <h3 className="text-sm font-semibold text-white">Costo di esercizio</h3>
              <HelpTooltip
                title="Costo di esercizio"
                content="È il costo orario reale del tuo centro: spese annuali totali (affitto, utenze, stipendi, ammortamenti) divise per le ore di apertura effettive nell'anno. BeautyX lo usa per calcolare quanto ti costa davvero ogni minuto di servizio erogato, e quindi il prezzo minimo sotto cui non dovresti mai scendere."
              />
            </div>
            <div className="bg-slate-700/30 border border-slate-600/30 rounded-lg px-3 py-2 text-xs text-slate-400 space-y-0.5">
              <p>Formula: <span className="text-slate-300 font-mono">costo_servizio = minuti × (€/ora ÷ 60) × op_servizio ÷ (op_centro × 0.5)</span></p>
              <p className="text-slate-500">€/ora = spese annuali ÷ ore apertura annuali (365gg mobili). Il fattore op_centro×0.5 stima quante clienti vengono servite in parallelo.</p>
            </div>
            <div className="bg-slate-800/40 rounded-xl p-4 space-y-4">
              {/* Toggle calcolo auto */}
              <label className="flex items-center gap-3 cursor-pointer">
                <div onClick={() => setCostiConfig(c => ({ ...c, usa_calcolo_automatico: !c.usa_calcolo_automatico }))}
                  className={`w-10 h-6 rounded-full transition-colors cursor-pointer ${costiConfig.usa_calcolo_automatico ? 'bg-teal-600' : 'bg-slate-600'}`}>
                  <div className={`w-4 h-4 bg-white rounded-full mt-1 transition-transform ${costiConfig.usa_calcolo_automatico ? 'translate-x-5' : 'translate-x-1'}`} />
                </div>
                <div>
                  <span className="text-sm text-white">Calcolo automatico dai movimenti</span>
                  {costoOraAuto && (
                    <p className="text-xs text-teal-300">
                      Stimato: <strong>{formatEuro(costoOraAuto)}/ora</strong> (spese ultimi 365gg ÷ ore apertura annuali)
                    </p>
                  )}
                  {!costoOraAuto && (
                    <p className="text-xs text-slate-500">Non disponibile (movimenti insufficienti)</p>
                  )}
                </div>
              </label>

              {/* Costo manuale */}
              <div className={costiConfig.usa_calcolo_automatico ? 'opacity-50 pointer-events-none' : ''}>
                <label className="block text-xs text-slate-400 mb-1">Costo manuale (€/ora)</label>
                <input
                  type="number" min="0" step="1"
                  value={costiConfig.costo_ora_manuale || ''}
                  onChange={e => setCostiConfig(c => ({ ...c, costo_ora_manuale: parseFloat(e.target.value) || null }))}
                  placeholder="es. 45"
                  className="w-32 bg-slate-800 border border-slate-600/50 rounded-lg px-3 py-2 text-white text-sm focus:outline-none focus:border-teal-500"
                />
              </div>

              {/* Nr operatrici operative */}
              <div>
                <label className="block text-xs text-slate-400 mb-1">
                  Operatrici operative del centro
                  {nrOpDipendenti > 0 && (
                    <span className="text-slate-500 ml-1">(dipendenti attivi: {nrOpDipendenti})</span>
                  )}
                </label>
                <p className="text-xs text-slate-500 mb-2">
                  Conta solo estetiste/operatrici. Escludi reception, amministrazione, direzione.
                </p>
                <input
                  type="number" min="1" step="1"
                  value={costiConfig.nr_operatrici_operative ?? nrOpDipendenti ?? 1}
                  onChange={e => setCostiConfig(c => ({ ...c, nr_operatrici_operative: parseInt(e.target.value) || null }))}
                  className="w-24 bg-slate-800 border border-slate-600/50 rounded-lg px-3 py-2 text-white text-sm focus:outline-none focus:border-teal-500"
                />
              </div>

              {costoOraEffettivo && (
                <div className="border-t border-slate-700/50 pt-2 space-y-1">
                  <p className="text-xs text-slate-400">
                    Costo grezzo: <span className="text-teal-300 font-bold">{formatEuro(costoOraEffettivo)}/ora</span>
                    {' '}= <span className="text-slate-300">{formatEuro(costoOraEffettivo / 60)}/min</span>
                  </p>
                  <p className="text-xs text-slate-500">
                    Costo per slot-operatrice: <span className="text-amber-300">{formatEuro(costoOraEffettivo / (nrOpCentro * 0.5))}/ora</span>
                    {' '}({nrOpCentro} op × 50% = {(nrOpCentro * 0.5).toFixed(1)} slot medi attivi)
                  </p>
                </div>
              )}

              <button onClick={saveCosti}
                className="px-4 py-2 bg-teal-600 hover:bg-teal-500 text-white text-sm font-semibold rounded-lg transition-all">
                Salva configurazione
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Sub-tab Servizi & Prodotti */}
      {subTab === 'servizi' && (
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <p className="text-sm text-slate-400">
              {servizi.filter(s => s.tipo !== 'prodotto').length} servizi · {servizi.filter(s => s.tipo === 'prodotto').length} prodotti
            </p>
            <div className="flex gap-2">
              <button onClick={() => setModalServizio({ ...SERVIZIO_EMPTY, tipo: 'servizio' })}
                className="px-3 py-2 bg-teal-600 hover:bg-teal-500 text-white text-sm font-semibold rounded-lg transition-all">
                + Servizio
              </button>
              <button onClick={() => setModalServizio({ ...SERVIZIO_EMPTY, tipo: 'prodotto' })}
                className="px-3 py-2 bg-violet-700 hover:bg-violet-600 text-white text-sm font-semibold rounded-lg transition-all">
                + Prodotto
              </button>
            </div>
          </div>

          {/* Servizi importati da integrazioni non ancora nel listino */}
          {importati.length > 0 && (
            <div className="bg-indigo-950/40 border border-indigo-500/30 rounded-xl p-4 space-y-3">
              <div className="flex items-center gap-2">
                <input
                  type="checkbox"
                  checked={msImportati.allSelected(importati.map(k => k.referenza || k.nome))}
                  onChange={() => msImportati.toggleAll(importati.map(k => k.referenza || k.nome))}
                  className="w-3.5 h-3.5 accent-indigo-500 cursor-pointer"
                />
                <span className="text-indigo-300 text-sm font-semibold">📥 Trovati nel gestionale ({importati.length})</span>
                <span className="text-xs text-indigo-400/70">— non ancora nel listino prezzi</span>
              </div>

              <BulkActionBar
                count={msImportati.count} totalCount={importati.length}
                onClear={msImportati.clear} onSelectAll={() => msImportati.toggleAll(importati.map(k => k.referenza || k.nome))}
                actions={[
                  { label: 'Elimina selezionati', danger: true, icon: '🗑', loading: bulkLoading, onClick: bulkDeleteImportati },
                ]}
              />

              <div className="space-y-2">
                {importati.map((k, i) => {
                  const kId = k.referenza || k.nome
                  return (
                    <div key={k.referenza || i}
                      className={`flex items-center justify-between gap-3 rounded-lg px-3 py-2 transition-colors ${msImportati.isSelected(kId) ? 'bg-indigo-800/30 ring-1 ring-indigo-500/30' : 'bg-indigo-900/20'}`}>
                      <div className="flex items-center gap-3 min-w-0">
                        <input
                          type="checkbox"
                          checked={msImportati.isSelected(kId)}
                          onChange={() => msImportati.toggle(kId)}
                          className="w-3.5 h-3.5 accent-indigo-500 cursor-pointer flex-shrink-0"
                        />
                        {k.referenza && (
                          <span className="text-xs font-mono text-indigo-400/70 flex-shrink-0">{k.referenza}</span>
                        )}
                        <div className="min-w-0">
                          <p className="text-sm text-white font-medium truncate">{k.nome}</p>
                          <p className="text-xs text-slate-400">
                            {k.categoria && <span className="mr-2">{k.categoria}</span>}
                            {k.durata_minuti && <span className="mr-2">⏱ {k.durata_minuti}min</span>}
                            {k.prezzo && <span className="text-teal-300 font-semibold">Prezzo attuale: {formatEuro(k.prezzo)}</span>}
                          </p>
                        </div>
                      </div>
                      <div className="flex gap-2 flex-shrink-0">
                        <button
                          onClick={() => setModalServizio({
                            nome: k.nome,
                            categoria: k.categoria || '',
                            durata_esecuzione_min: k.durata_minuti || 0,
                            materiali: [],
                            ricarico_percentuale: 30,
                            nr_operatrici: 1,
                            sovrapponibile: false,
                            _prezzo_gestionale: k.prezzo,
                          })}
                          className="text-xs px-3 py-1.5 bg-indigo-600 hover:bg-indigo-500 text-white rounded-lg transition-all whitespace-nowrap">
                          + Aggiungi al listino
                        </button>
                        <button
                          onClick={() => deleteImportato(k)}
                          className="text-xs px-2 py-1.5 text-red-400 hover:text-red-300 hover:bg-red-900/20 rounded-lg transition-all"
                          title="Rimuovi dall'elenco">
                          🗑
                        </button>
                      </div>
                    </div>
                  )
                })}
              </div>
            </div>
          )}

          {servizi.length === 0 && importati.length === 0 && (
            <div className="text-center py-12">
              <p className="text-4xl mb-3">💇</p>
              <p className="text-slate-400 text-sm">Nessun servizio o prodotto nel catalogo.</p>
              <p className="text-slate-500 text-xs mt-1">Aggiungi il primo elemento per iniziare a costruire il tuo listino prezzi.</p>
            </div>
          )}

          {/* Bulk bar servizi */}
          <BulkActionBar
            count={msServizi.count} totalCount={servizi.length}
            onClear={msServizi.clear} onSelectAll={() => msServizi.toggleAll(servizi.map(s => s.id))}
            actions={[
              { label: 'Elimina selezionati', danger: true, icon: '🗑', loading: bulkLoading, onClick: bulkDeleteServizi },
            ]}
          />

          {/* Griglia separata: prima Servizi, poi Prodotti */}
          {[
            { tipoKey: 'servizio', label: '💇 Servizi', color: 'text-teal-400' },
            { tipoKey: 'prodotto', label: '🧴 Prodotti', color: 'text-violet-400' },
          ].map(({ tipoKey, label, color }) => {
            const gruppo = servizi.filter(s => (s.tipo || 'servizio') === tipoKey)
            if (gruppo.length === 0) return null
            return (
              <div key={tipoKey} className="space-y-3">
                <h4 className={`text-xs font-semibold uppercase tracking-wider ${color}`}>{label} ({gruppo.length})</h4>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {gruppo.map(s => {
                    const iva = s.iva || aliquote.find(a => a.id === s.iva_aliquota_id)
                    const calc = costoOraEffettivo && tipoKey === 'servizio' ? calcolaServizio({
                      servizio: s, costoOraEsercizio: costoOraEffettivo, nrOpCentro, aliquotaIvaPerc: iva?.percentuale ?? 22,
                    }) : null
                    const durata = (s.durata_preparazione_min||0)+(s.durata_esecuzione_min||0)+(s.durata_chiusura_min||0)+(s.durata_sanificazione_min||0)
                    return (
                      <div key={s.id}
                        onClick={() => msServizi.count > 0 && msServizi.toggle(s.id)}
                        className={[
                          'bg-slate-800/40 border rounded-xl p-4 space-y-2 transition-all',
                          !s.attivo ? 'opacity-50' : '',
                          msServizi.isSelected(s.id)
                            ? 'border-teal-500/50 ring-1 ring-teal-500/30 cursor-pointer'
                            : 'border-slate-700/50 hover:border-slate-600/50',
                        ].join(' ')}>
                        <div className="flex items-start justify-between">
                          <div className="flex items-start gap-2 min-w-0">
                            <input
                              type="checkbox"
                              checked={msServizi.isSelected(s.id)}
                              onChange={() => msServizi.toggle(s.id)}
                              onClick={e => e.stopPropagation()}
                              className="w-4 h-4 accent-teal-500 cursor-pointer mt-0.5 flex-shrink-0"
                            />
                            <div className="min-w-0">
                              <p className="text-white font-semibold">{s.nome}</p>
                              {s.categoria && <p className="text-xs text-slate-500">{s.categoria}</p>}
                              {s.note_interne && (
                                <p className="text-xs text-slate-500 italic mt-0.5 line-clamp-2">{s.note_interne}</p>
                              )}
                              {s.codice_barcode && (
                                <p className="text-xs font-mono text-slate-400 mt-0.5">🔲 {s.codice_barcode}</p>
                              )}
                            </div>
                          </div>
                          <div className="flex gap-2 flex-shrink-0">
                            <button onClick={e => { e.stopPropagation(); setModalServizio(s) }}
                              className="text-xs text-slate-400 hover:text-white px-2 py-1 rounded">✏️</button>
                            <button onClick={e => { e.stopPropagation(); deleteServizio(s.id) }}
                              className="text-xs text-red-400 hover:text-red-300 px-2 py-1 rounded">🗑</button>
                          </div>
                        </div>

                        {tipoKey === 'servizio' && (
                          <div className="flex gap-4 text-xs text-slate-400">
                            {durata > 0 && <span>⏱ {durata} min</span>}
                            {s.nr_operatrici > 1 && <span>👩×{s.nr_operatrici}</span>}
                            {s.sovrapponibile && <span className="text-amber-400">↗ sovrap.</span>}
                          </div>
                        )}

                        {calc && (
                          <div className="flex justify-between items-center border-t border-slate-700/30 pt-2">
                            <div className="text-xs text-slate-500">
                              Costo vivo {formatEuro(calc.costoVivo)} · max -{calc.scontoMax}%
                            </div>
                            <div className="text-teal-300 font-bold">{formatEuro(calc.prezzoLordo)}</div>
                          </div>
                        )}

                        {s.mercato_prezzo_medio && (
                          <div className="text-xs text-slate-500">
                            Mercato: {formatEuro(s.mercato_prezzo_min)}–{formatEuro(s.mercato_prezzo_max)} (media {formatEuro(s.mercato_prezzo_medio)})
                          </div>
                        )}
                      </div>
                    )
                  })}
                </div>
              </div>
            )
          })}
        </div>
      )}

      {/* Sub-tab Pacchetti */}
      {subTab === 'pacchetti' && (
        <div className="space-y-4">
          <PacchettiTab
            servizi={servizi} pacchetti={pacchetti} setPacchetti={setPacchetti}
            costoOraEffettivo={costoOraEffettivo} nrOpCentro={nrOpCentro} aliquote={aliquote}
            ms={msPacchetti} bulkLoading={bulkLoading} onBulkDelete={bulkDeletePacchetti}
          />
        </div>
      )}

      {/* Sub-tab Listino Ufficiale */}
      {subTab === 'listino' && (
        <ListinoUfficiale
          servizi={servizi}
          aliquote={aliquote}
          costoOra={costoOraEffettivo}
          nrOpCentro={nrOpCentro}
          onEdit={s => setModalServizio(s)}
          centroNome={currentCentro?.nome || 'Centro'}
        />
      )}

      {/* Modal servizio */}
      {modalServizio && (
        <ServizioModal
          servizio={modalServizio === 'new' ? null : modalServizio}
          aliquote={aliquote}
          costoOra={costoOraEffettivo}
          nrOpCentro={nrOpCentro}
          onSave={onServizioSaved}
          onClose={() => setModalServizio(null)}
        />
      )}
    </>
  )
}

// ─────────────────────────────────────────────
// Listino Ufficiale
// ─────────────────────────────────────────────
const STATO_CONFIG = {
  perdita:    { icon: '🔴', label: 'In perdita',         color: 'text-red-400',    bg: 'bg-red-950/40 border-red-500/30',    msg: 'Il prezzo non copre i costi. Aggiorna subito.' },
  critico:    { icon: '🟠', label: 'Margine critico',    color: 'text-orange-400', bg: 'bg-orange-950/40 border-orange-500/30', msg: 'Margine sotto il 20% del costo. Rivedi il prezzo.' },
  attenzione: { icon: '🟡', label: 'Costi aumentati',    color: 'text-amber-400',  bg: 'bg-amber-950/40 border-amber-500/30',  msg: 'I costi sono saliti. Valuta di aggiornare il prezzo.' },
  ok:         { icon: '🟢', label: 'Prezzo sano',        color: 'text-teal-400',   bg: 'bg-slate-800/40 border-slate-700/50',  msg: null },
  migliorato: { icon: '💙', label: 'Margine migliorato', color: 'text-blue-400',   bg: 'bg-blue-950/30 border-blue-500/30',    msg: 'I costi sono calati. Puoi offrire più sconto o abbassare il prezzo.' },
}

function ListinoUfficiale({ servizi, aliquote, costoOra, nrOpCentro, onEdit, centroNome = 'Centro' }) {
  const congelati = servizi.filter(s => s.prezzo_pubblico != null)

  // Calcola dati completi per ogni voce congelata
  const getRighe = () => congelati.map(s => {
    const ivaObj = s.iva || aliquote.find(a => a.id === s.iva_aliquota_id)
    const ivaPerc = ivaObj?.percentuale ?? 0
    const isProdotto = s.tipo === 'prodotto'
    const calcAttuale = costoOra && !isProdotto ? calcolaServizio({
      servizio: s, costoOraEsercizio: costoOra, nrOpCentro, aliquotaIvaPerc: ivaPerc,
    }) : null
    const analisi = calcAttuale ? analizzaCongelato({
      prezzoPubblico: s.prezzo_pubblico,
      costoVivoAttuale: calcAttuale.costoVivo,
      costoVivoAlCongelamento: s.costo_vivo_al_congelamento,
      aliquotaIvaPerc: ivaPerc,
      margineMinUtilePerc: s.margine_min_utile_perc ?? 40,
    }) : null
    const durata = (s.durata_preparazione_min||0)+(s.durata_esecuzione_min||0)+(s.durata_chiusura_min||0)+(s.durata_sanificazione_min||0)
    return { s, ivaPerc, calcAttuale, analisi, durata, isProdotto }
  })

  const handlePrint = async () => {
    const righe = getRighe()
    // Pre-genera QR code (data URL) per i prodotti con codice barcode
    const qrMap = {}
    await Promise.all(
      righe.filter(r => r.s.codice_barcode).map(async r => {
        try {
          qrMap[r.s.id] = await QRCode.toDataURL(r.s.codice_barcode, { width: 80, margin: 1 })
        } catch { /* ignora errori QR */ }
      })
    )

    // Raggruppa per tipo poi per categoria
    const sezioni = [
      { tipoKey: 'servizio', titoloSezione: 'SERVIZI' },
      { tipoKey: 'prodotto', titoloSezione: 'PRODOTTI' },
    ]

    const dataOggi = new Date().toLocaleDateString('it-IT')
    const htmlSezioni = sezioni.map(({ tipoKey, titoloSezione }) => {
      const righeGruppo = righe.filter(r => (r.s.tipo || 'servizio') === tipoKey)
      if (righeGruppo.length === 0) return ''
      const byCategoria = {}
      righeGruppo.forEach(r => {
        const cat = r.s.categoria || 'Senza categoria'
        if (!byCategoria[cat]) byCategoria[cat] = []
        byCategoria[cat].push(r)
      })
      return `
<div class="sezione-tipo"><h2 class="tipo-header">${titoloSezione}</h2>
${Object.entries(byCategoria).map(([cat, voci]) => `
<h3 class="cat-header">${cat}</h3>
<table><thead><tr>
  <th>${tipoKey === 'servizio' ? 'Servizio' : 'Prodotto'}</th>
  ${tipoKey === 'servizio' ? '<th class="r">Durata</th>' : '<th class="r">Codice</th>'}
  <th class="r">IVA</th>
  <th class="r">Prezzo</th>
</tr></thead><tbody>
${voci.map(({ s, ivaPerc }) => `<tr>
  <td>
    <div class="nome">${s.nome}</div>
    ${s.descrizione ? `<div class="desc">${s.descrizione}</div>` : ''}
    ${s.note_interne ? `<div class="protocollo">${s.note_interne}</div>` : ''}
  </td>
  <td class="r" style="color:#666;white-space:nowrap;vertical-align:top">
    ${tipoKey === 'servizio'
      ? `${(s.durata_preparazione_min||0)+(s.durata_esecuzione_min||0)+(s.durata_chiusura_min||0)+(s.durata_sanificazione_min||0)} min`
      : (qrMap[s.id] ? `<img src="${qrMap[s.id]}" width="70" height="70" alt="${s.codice_barcode}"><br><span style="font-size:9px;font-family:monospace">${s.codice_barcode}</span>` : (s.codice_barcode || ''))
    }
  </td>
  <td class="iva" style="vertical-align:top">${ivaPerc > 0 ? ivaPerc + '%' : 'Esente'}</td>
  <td class="prezzo" style="vertical-align:top">&euro; ${Number(s.prezzo_pubblico).toLocaleString('it-IT',{minimumFractionDigits:2,maximumFractionDigits:2})}</td>
</tr>`).join('')}
</tbody></table>`).join('')}
</div>`
    }).join('')

    const html = `<!DOCTYPE html><html lang="it"><head>
<meta charset="utf-8">
<title>Listino — ${centroNome}</title>
<style>
  *{margin:0;padding:0;box-sizing:border-box}
  body{font-family:Arial,sans-serif;font-size:12px;color:#111;padding:18mm}
  h1{font-size:22px;font-weight:700;margin-bottom:2px}
  .sub{color:#666;font-size:11px;margin-bottom:20px}
  .tipo-header{font-size:15px;font-weight:700;margin:24px 0 8px;border-bottom:2px solid #222;padding-bottom:4px}
  .cat-header{font-size:11px;text-transform:uppercase;letter-spacing:.08em;color:#555;margin:16px 0 5px;border-bottom:1px solid #ccc;padding-bottom:3px}
  table{width:100%;border-collapse:collapse;margin-bottom:4px}
  th{background:#f5f5f5;text-align:left;padding:5px 8px;font-size:10px;text-transform:uppercase;letter-spacing:.06em;color:#555;border-bottom:2px solid #ddd}
  td{padding:6px 8px;border-bottom:1px solid #eee}
  .nome{font-weight:600;font-size:13px}
  .desc{color:#777;font-size:10px;margin-top:2px}
  .protocollo{color:#555;font-size:10px;font-style:italic;margin-top:3px;max-width:320px}
  .r{text-align:right}
  .prezzo{font-size:15px;font-weight:700;text-align:right;white-space:nowrap}
  .iva{color:#666;font-size:10px;text-align:right}
  .footer{margin-top:24px;text-align:center;color:#aaa;font-size:10px;border-top:1px solid #eee;padding-top:10px}
  @media print{@page{margin:14mm}button{display:none}}
</style></head><body>
<h1>${centroNome}</h1>
<p class="sub">Listino prezzi ufficiale &mdash; aggiornato al ${dataOggi}</p>
${htmlSezioni}
<div class="footer">Prezzi IVA inclusa &bull; ${centroNome} &bull; ${dataOggi}</div>
</body></html>`

    const w = window.open('', '_blank', 'width=860,height=700')
    if (!w) { alert('Abilita i popup per questo sito per la stampa.'); return }
    w.document.write(html)
    w.document.close()
    w.focus()
    setTimeout(() => w.print(), 400)
  }

  const handleExportCSV = () => {
    const righe = getRighe()
    const headers = ['Tipo','Categoria','Nome','Descrizione','Protocollo/Note','Codice Barcode','Durata (min)','Prezzo Lordo €','IVA %','Prezzo Netto €','Costo Vivo €','Utile €','Utile %','Sconto Max %','Prezzo Minimo €','Congelato il']
    const rows = righe.map(({ s, ivaPerc, calcAttuale, analisi, durata }) => [
      s.tipo || 'servizio',
      s.categoria || 'Senza categoria',
      s.nome,
      s.descrizione || '',
      s.note_interne || '',
      s.codice_barcode || '',
      durata,
      s.prezzo_pubblico,
      ivaPerc,
      ivaPerc > 0 ? +(s.prezzo_pubblico / (1 + ivaPerc / 100)).toFixed(2) : s.prezzo_pubblico,
      calcAttuale?.costoVivo ?? '',
      analisi?.utile ?? '',
      analisi?.utilePerc ?? '',
      analisi?.scontoMax ?? '',
      analisi?.prezzoMin ?? '',
      s.prezzo_congelato_at ? new Date(s.prezzo_congelato_at).toLocaleDateString('it-IT') : '',
    ])
    const csv = [headers, ...rows]
      .map(r => r.map(v => `"${String(v ?? '').replace(/"/g, '""')}"`).join(','))
      .join('\n')
    const blob = new Blob(['\ufeff' + csv], { type: 'text/csv;charset=utf-8;' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `listino_${centroNome.replace(/\s+/g,'_')}_${new Date().toISOString().slice(0,10)}.csv`
    a.click()
    URL.revokeObjectURL(url)
  }

  const handleExportXLS = () => {
    const righe = getRighe()
    const headers = ['Tipo','Categoria','Nome','Descrizione','Protocollo/Note','Codice Barcode','Durata (min)','Prezzo Lordo €','IVA %','Prezzo Netto €','Costo Vivo €','Utile €','Utile %','Sconto Max %','Prezzo Minimo €','Congelato il']
    const rows = righe.map(({ s, ivaPerc, calcAttuale, analisi, durata }) => [
      s.tipo || 'servizio',
      s.categoria || 'Senza categoria',
      s.nome,
      s.descrizione || '',
      s.note_interne || '',
      s.codice_barcode || '',
      durata,
      s.prezzo_pubblico,
      ivaPerc,
      ivaPerc > 0 ? +(s.prezzo_pubblico / (1 + ivaPerc / 100)).toFixed(2) : s.prezzo_pubblico,
      calcAttuale?.costoVivo ?? null,
      analisi?.utile ?? null,
      analisi?.utilePerc ?? null,
      analisi?.scontoMax ?? null,
      analisi?.prezzoMin ?? null,
      s.prezzo_congelato_at ? new Date(s.prezzo_congelato_at).toLocaleDateString('it-IT') : '',
    ])
    const ws = XLSX.utils.aoa_to_sheet([headers, ...rows])
    ws['!cols'] = [10,18,28,28,40,18,12,14,8,14,12,10,10,12,14,14].map(w => ({ wch: w }))
    const wb = XLSX.utils.book_new()
    XLSX.utils.book_append_sheet(wb, ws, 'Listino Ufficiale')
    XLSX.writeFile(wb, `listino_${centroNome.replace(/\s+/g,'_')}_${new Date().toISOString().slice(0,10)}.xlsx`)
  }

  if (congelati.length === 0) {
    return (
      <div className="text-center py-16 space-y-3">
        <p className="text-4xl">📋</p>
        <p className="text-white font-semibold">Nessun prezzo ufficiale ancora</p>
        <p className="text-slate-400 text-sm max-w-md mx-auto">
          Apri un servizio dalla tab <strong>Servizi</strong>, configura i tempi e il ricarico, poi clicca
          <strong> 🔒 Congela prezzo</strong> per aggiungerlo al listino ufficiale.
        </p>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      {/* Header toolbar */}
      <div className="flex flex-wrap items-center justify-between gap-3">
        <p className="text-sm text-slate-400">
          {congelati.length} voc{congelati.length === 1 ? 'e' : 'i'} nel listino ufficiale
        </p>
        <div className="flex flex-wrap gap-2">
          <button
            onClick={handlePrint}
            className="flex items-center gap-1.5 text-sm px-3 py-2 bg-teal-700 hover:bg-teal-600 text-white rounded-lg transition-all"
          >
            🖨️ Stampa / PDF
          </button>
          <button
            onClick={handleExportCSV}
            className="flex items-center gap-1.5 text-sm px-3 py-2 bg-slate-700 hover:bg-slate-600 text-white rounded-lg transition-all"
          >
            📄 CSV
          </button>
          <button
            onClick={handleExportXLS}
            className="flex items-center gap-1.5 text-sm px-3 py-2 bg-emerald-800 hover:bg-emerald-700 text-white rounded-lg transition-all"
          >
            📊 Excel
          </button>
        </div>
      </div>

      {/* Legenda stati */}
      <div className="flex flex-wrap gap-3 text-xs text-slate-400">
        {Object.entries(STATO_CONFIG).map(([k, v]) => (
          <span key={k}>{v.icon} {v.label}</span>
        ))}
      </div>

      {/* Voci per tipo, poi per categoria */}
      {[
        { tipoKey: 'servizio', titoloSezione: '💇 Servizi' },
        { tipoKey: 'prodotto', titoloSezione: '🧴 Prodotti' },
      ].map(({ tipoKey, titoloSezione }) => {
        const righeGruppo = getRighe().filter(r => (r.s.tipo || 'servizio') === tipoKey)
        if (righeGruppo.length === 0) return null
        const byCat = righeGruppo.reduce((acc, r) => {
          const cat = r.s.categoria || 'Senza categoria'
          if (!acc[cat]) acc[cat] = []
          acc[cat].push(r)
          return acc
        }, {})
        return (
          <div key={tipoKey} className="space-y-4">
            <h3 className="text-sm font-bold text-white border-b border-slate-700/50 pb-2">{titoloSezione}</h3>
            {Object.entries(byCat).map(([cat, voci]) => (
              <div key={cat} className="space-y-2">
                <p className="text-xs font-semibold text-slate-400 uppercase tracking-wider">{cat}</p>
                {voci.map(({ s, ivaPerc, calcAttuale, analisi }) => {
                  const cfg = analisi ? STATO_CONFIG[analisi.stato] : STATO_CONFIG.ok
                  return (
                    <div key={s.id} className={`border rounded-xl p-4 transition-all ${cfg.bg}`}>
                      <div className="flex items-start justify-between gap-3">
                        {/* Info */}
                        <div className="min-w-0 flex-1">
                          <div className="flex items-center gap-2 mb-0.5">
                            <span title={cfg.label}>{cfg.icon}</span>
                            <p className="text-white font-semibold truncate">{s.nome}</p>
                          </div>
                          {s.note_interne && (
                            <p className="text-xs text-slate-400 italic mt-1 leading-relaxed">{s.note_interne}</p>
                          )}
                          {s.codice_barcode && (
                            <p className="text-xs font-mono text-slate-500 mt-1">🔲 {s.codice_barcode}</p>
                          )}
                          {s.prezzo_congelato_at && (
                            <p className="text-xs text-slate-500 mt-1">
                              Congelato il {new Date(s.prezzo_congelato_at).toLocaleDateString('it-IT')}
                            </p>
                          )}
                          {cfg.msg && <p className={`text-xs mt-1 ${cfg.color}`}>{cfg.msg}</p>}
                        </div>
                        {/* Prezzi */}
                        <div className="text-right flex-shrink-0 space-y-1">
                          <p className="text-xl font-bold text-white">{formatEuro(s.prezzo_pubblico)}</p>
                          {ivaPerc > 0 && (
                            <p className="text-xs text-slate-500">
                              Netto: {formatEuro(s.prezzo_pubblico / (1 + ivaPerc / 100))} · IVA {ivaPerc}%
                            </p>
                          )}
                          {analisi && (
                            <p className={`text-xs font-semibold ${cfg.color}`}>
                              Utile: {formatEuro(analisi.utile)}{analisi.utilePerc !== null && ` (${analisi.utilePerc}%)`}
                            </p>
                          )}
                          {analisi && (
                            <p className="text-xs text-slate-400">
                              Sconto max: <span className="font-semibold text-amber-400">{analisi.scontoMax}%</span>
                              {' '}→ min {formatEuro(analisi.prezzoMin)}
                            </p>
                          )}
                          {analisi?.deltaCosto !== null && analisi?.deltaCosto !== 0 && (
                            <p className={`text-xs ${analisi.deltaCosto > 0 ? 'text-red-400' : 'text-blue-400'}`}>
                              Costo {analisi.deltaCosto > 0 ? '▲' : '▼'} {Math.abs(analisi.deltaCostoPerc)}%
                              {' '}({analisi.deltaCosto > 0 ? '+' : ''}{formatEuro(analisi.deltaCosto)})
                            </p>
                          )}
                        </div>
                      </div>
                      <div className="flex justify-end mt-3">
                        <button onClick={() => onEdit(s)}
                          className="text-xs px-3 py-1.5 bg-slate-700/50 hover:bg-slate-600/60 text-slate-300 rounded-lg transition-all">
                          ✏️ Modifica / Ricongela
                        </button>
                      </div>
                    </div>
                  )
                })}
              </div>
            ))}
          </div>
        )
      })}

    </div>
  )
}

// ─────────────────────────────────────────────
// Sub-tab Pacchetti
// ─────────────────────────────────────────────
function PacchettiTab({ servizi, pacchetti, setPacchetti, costoOraEffettivo, nrOpCentro, aliquote, ms, bulkLoading, onBulkDelete }) {
  const [showForm, setShowForm] = useState(false)
  const [form, setForm] = useState({ nome: '', descrizione: '', sconto_percentuale: 0, items: [] })
  const [saving, setSaving] = useState(false)

  const toggleServizio = (sId) => {
    setForm(f => {
      const exists = f.items.find(i => i.servizio_id === sId)
      if (exists) return { ...f, items: f.items.filter(i => i.servizio_id !== sId) }
      return { ...f, items: [...f.items, { servizio_id: sId, quantita: 1 }] }
    })
  }

  const handleSave = async () => {
    setSaving(true)
    try {
      const res = await fetch('/api/centro/pacchetti', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(form),
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error)
      setPacchetti(prev => [...prev, data.pacchetto])
      setShowForm(false)
      setForm({ nome: '', descrizione: '', sconto_percentuale: 0, items: [] })
    } catch (e) { alert(e.message) }
    finally { setSaving(false) }
  }

  const deletePacchetto = async (id) => {
    if (!confirm('Eliminare il pacchetto?')) return
    await fetch(`/api/centro/pacchetti/${id}`, { method: 'DELETE' })
    setPacchetti(prev => prev.filter(p => p.id !== id))
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <p className="text-sm text-slate-400">{pacchetti.length} pacchetto{pacchetti.length !== 1 ? 'i' : ''}</p>
        <button onClick={() => setShowForm(!showForm)}
          className="px-4 py-2 bg-teal-600 hover:bg-teal-500 text-white text-sm font-semibold rounded-lg">
          + Nuovo pacchetto
        </button>
      </div>

      {showForm && (
        <div className="bg-slate-800/50 border border-slate-700/50 rounded-xl p-4 space-y-3">
          <h3 className="text-sm font-semibold text-white">Nuovo pacchetto</h3>
          <div className="grid grid-cols-2 gap-3">
            <input value={form.nome} onChange={e => setForm(f => ({ ...f, nome: e.target.value }))}
              placeholder="Nome pacchetto *"
              className="bg-slate-800 border border-slate-600/50 rounded-lg px-3 py-2 text-white text-sm placeholder-slate-500 focus:outline-none focus:border-teal-500" />
            <div className="flex items-center gap-2">
              <input type="number" min="0" max="100" value={form.sconto_percentuale}
                onChange={e => setForm(f => ({ ...f, sconto_percentuale: Number(e.target.value) }))}
                className="w-20 bg-slate-800 border border-slate-600/50 rounded-lg px-3 py-2 text-white text-sm focus:outline-none focus:border-teal-500" />
              <span className="text-slate-400 text-sm">% sconto</span>
            </div>
          </div>
          <p className="text-xs text-slate-400 font-semibold">Seleziona i servizi da includere:</p>
          <div className="grid grid-cols-2 gap-2">
            {servizi.map(s => (
              <label key={s.id} className="flex items-center gap-2 cursor-pointer">
                <input type="checkbox"
                  checked={!!form.items.find(i => i.servizio_id === s.id)}
                  onChange={() => toggleServizio(s.id)}
                  className="accent-teal-500" />
                <span className="text-sm text-slate-300">{s.nome}</span>
              </label>
            ))}
          </div>
          <div className="flex gap-3">
            <button onClick={handleSave} disabled={saving || !form.nome}
              className="px-4 py-2 bg-teal-600 hover:bg-teal-500 disabled:opacity-50 text-white text-sm font-semibold rounded-lg">
              {saving ? 'Salvataggio...' : 'Crea pacchetto'}
            </button>
            <button onClick={() => setShowForm(false)} className="text-sm text-slate-400 hover:text-white">Annulla</button>
          </div>
        </div>
      )}

      {pacchetti.length === 0 && !showForm && (
        <div className="text-center py-12">
          <p className="text-4xl mb-3">📦</p>
          <p className="text-slate-400 text-sm">Nessun pacchetto creato.</p>
          <p className="text-slate-500 text-xs mt-1">I pacchetti ti permettono di raggruppare servizi con uno sconto dedicato.</p>
        </div>
      )}

      <BulkActionBar
        count={ms.count}
        totalCount={pacchetti.length}
        onClear={ms.clear}
        onSelectAll={() => ms.toggleAll(pacchetti.map(p => p.id))}
        actions={[{ label: 'Elimina selezionati', danger: true, onClick: onBulkDelete, loading: bulkLoading }]}
      />

      <div className="space-y-3">
        {pacchetti.map(p => (
          <div key={p.id} className={`bg-slate-800/40 border rounded-xl p-4 transition-all ${ms.isSelected(p.id) ? 'border-teal-500/40 ring-1 ring-teal-500/20' : 'border-slate-700/50'}`}>
            <div className="flex items-start justify-between">
              <div className="flex items-start gap-3">
                <input
                  type="checkbox"
                  checked={ms.isSelected(p.id)}
                  onChange={() => ms.toggle(p.id)}
                  className="mt-1 w-4 h-4 accent-teal-500 cursor-pointer flex-shrink-0"
                />
                <div>
                  <p className="text-white font-semibold">{p.nome}</p>
                  {p.descrizione && <p className="text-slate-400 text-xs mt-0.5">{p.descrizione}</p>}
                </div>
              </div>
              <div className="flex items-center gap-3">
                {p.sconto_percentuale > 0 && (
                  <span className="text-xs px-2 py-1 bg-amber-500/20 text-amber-300 border border-amber-500/30 rounded-full">
                    -{p.sconto_percentuale}%
                  </span>
                )}
                <button onClick={() => deletePacchetto(p.id)} className="text-xs text-red-400 hover:text-red-300">🗑</button>
              </div>
            </div>
            {p.items?.length > 0 && (
              <div className="mt-2 flex flex-wrap gap-1 ml-7">
                {p.items.map(item => (
                  <span key={item.servizio?.id || item.servizio_id}
                    className="text-xs px-2 py-0.5 bg-slate-700/50 text-slate-300 rounded-full">
                    {item.servizio?.nome || item.servizio_id}{item.quantita > 1 ? ` ×${item.quantita}` : ''}
                  </span>
                ))}
              </div>
            )}
          </div>
        ))}
      </div>
    </div>
  )
}

// ─────────────────────────────────────────────
// Tab Integrazioni
// ─────────────────────────────────────────────
const INTEGRAZIONI = [
  {
    id: 'koibox',
    nome: 'Koibox',
    icon: '🔗',
    tipo: 'Gestionale',
    desc: 'Importa clienti, appuntamenti, casse e servizi dal tuo gestionale Koibox.',
    href: '/impostazioni/integrazioni/koibox',
    attiva: true,
    color: 'teal',
  },
  {
    id: 'mindbody',
    nome: 'Mindbody',
    icon: '📅',
    tipo: 'Gestionale',
    desc: 'Connetti Mindbody per sincronizzare dati di prenotazione e clienti.',
    href: null,
    attiva: false,
    color: 'slate',
  },
  {
    id: 'fresha',
    nome: 'Fresha',
    icon: '🌿',
    tipo: 'Gestionale',
    desc: 'Integrazione con la piattaforma Fresha per appuntamenti e pagamenti.',
    href: null,
    attiva: false,
    color: 'slate',
  },
  {
    id: 'email',
    nome: 'Email Marketing',
    icon: '✉️',
    tipo: 'Comunicazione',
    desc: 'Collega il tuo account email per campagne e notifiche automatiche.',
    href: null,
    attiva: false,
    color: 'slate',
  },
  {
    id: 'banca',
    nome: 'Conto Bancario',
    icon: '🏦',
    tipo: 'Finanza',
    desc: 'Importa movimenti bancari automaticamente per analytics e pianificazione.',
    href: null,
    attiva: false,
    color: 'slate',
  },
]

function TabIntegrazioni() {
  const [importStatus, setImportStatus] = useState({})
  const [loadingStatus, setLoadingStatus] = useState(true)

  useEffect(() => {
    // Carica stato import Koibox
    fetch('/api/user/koibox/status')
      .then(r => r.json())
      .then(d => {
        if (d.status) setImportStatus(d.status)
      })
      .catch(() => {})
      .finally(() => setLoadingStatus(false))
  }, [])

  const tipi = [...new Set(INTEGRAZIONI.map(i => i.tipo))]

  return (
    <div className="space-y-6">
      <div>
        <p className="text-sm text-slate-400">
          Le integrazioni sono specifiche per questo centro. Centri diversi possono avere gestionali o configurazioni differenti.
        </p>
      </div>

      {tipi.map(tipo => (
        <div key={tipo} className="space-y-3">
          <h3 className="text-xs font-semibold text-slate-400 uppercase tracking-wider">{tipo}</h3>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            {INTEGRAZIONI.filter(i => i.tipo === tipo).map(integ => {
              const kStatus = integ.id === 'koibox' ? importStatus : null
              const hasData = kStatus && Object.values(kStatus).some(v => v.total > 0)

              return (
                <div key={integ.id}
                  className={`rounded-xl border p-4 space-y-3 ${
                    integ.attiva
                      ? 'bg-slate-800/50 border-slate-600/50'
                      : 'bg-slate-900/30 border-slate-700/30 opacity-60'
                  }`}>
                  <div className="flex items-start justify-between">
                    <div className="flex items-center gap-3">
                      <span className="text-2xl">{integ.icon}</span>
                      <div>
                        <p className="text-white font-semibold text-sm">{integ.nome}</p>
                        <p className="text-xs text-slate-500">{integ.tipo}</p>
                      </div>
                    </div>
                    {integ.attiva
                      ? <span className="text-xs px-2 py-0.5 bg-teal-500/20 text-teal-300 border border-teal-500/30 rounded-full">Disponibile</span>
                      : <span className="text-xs px-2 py-0.5 bg-slate-700/50 text-slate-500 rounded-full">Presto</span>
                    }
                  </div>

                  <p className="text-xs text-slate-400">{integ.desc}</p>

                  {/* Stato import Koibox */}
                  {integ.id === 'koibox' && !loadingStatus && kStatus && (
                    <div className="bg-slate-900/50 rounded-lg p-2 grid grid-cols-2 gap-1">
                      {Object.entries(kStatus).map(([tabella, info]) => (
                        <div key={tabella} className="flex justify-between text-xs">
                          <span className="text-slate-500 capitalize">{tabella}</span>
                          <span className={info.total > 0 ? 'text-teal-400' : 'text-slate-600'}>
                            {info.total > 0 ? `${info.total} rec.` : '—'}
                          </span>
                        </div>
                      ))}
                    </div>
                  )}

                  {integ.href && (
                    <a href={integ.href}
                      className="inline-flex items-center gap-1.5 text-xs px-4 py-2 bg-teal-600 hover:bg-teal-500 text-white rounded-lg transition-all font-semibold">
                      {hasData ? '🔄 Aggiorna import' : '📥 Avvia import'}
                    </a>
                  )}
                </div>
              )
            })}
          </div>
        </div>
      ))}
    </div>
  )
}

// ─────────────────────────────────────────────
// Pagina principale
// ─────────────────────────────────────────────
function CentroPageInner() {
  const { currentCentro, profile } = useAuth()
  const searchParams = useSearchParams()
  const [activeTab, setActiveTab] = useState(searchParams.get('tab') || 'orari')

  if (!currentCentro && !profile?.centro_id) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900 flex items-center justify-center p-6">
        <div className="text-center">
          <p className="text-4xl mb-4">🏢</p>
          <p className="text-white text-lg font-semibold mb-2">Nessun centro selezionato</p>
          <p className="text-slate-400 text-sm">Seleziona un centro dal menu in alto per gestirne la configurazione.</p>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900 p-4 md:p-6">
      <div className="max-w-7xl mx-auto space-y-6">

        {/* Header */}
        <div className="flex items-center gap-4">
          <div>
            <h1 className="text-2xl font-bold text-white">🏢 Pannello Centro</h1>
            <p className="text-slate-400 text-sm mt-0.5">
              {currentCentro?.nome || 'Il tuo centro'} · Orari, dipendenti e listino prezzi
            </p>
          </div>
        </div>

        {/* Tabs */}
        <div className="flex flex-wrap gap-2 bg-slate-900/50 rounded-xl p-1.5 border border-slate-700/30">
          <Tab active={activeTab === 'orari'}         onClick={() => setActiveTab('orari')}         icon="⏰" label="Orari" />
          <Tab active={activeTab === 'dipendenti'}    onClick={() => setActiveTab('dipendenti')}    icon="👥" label="Dipendenti" />
          <Tab active={activeTab === 'listino'}       onClick={() => setActiveTab('listino')}       icon="💰" label="Listino Prezzi" />
          <Tab active={activeTab === 'integrazioni'}  onClick={() => setActiveTab('integrazioni')}  icon="🔌" label="Integrazioni" />
        </div>

        {/* Contenuto */}
        <div className="bg-slate-950/40 backdrop-blur-sm rounded-2xl border border-slate-700/40 p-6">
          {activeTab === 'orari'        && <TabOrari />}
          {activeTab === 'dipendenti'  && <TabDipendenti />}
          {activeTab === 'listino'     && <TabListino />}
          {activeTab === 'integrazioni'&& <TabIntegrazioni />}
        </div>

      </div>
    </div>
  )
}

export default function CentroPage() {
  return (
    <Suspense fallback={null}>
      <CentroPageInner />
    </Suspense>
  )
}
