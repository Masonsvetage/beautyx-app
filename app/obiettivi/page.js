'use client'

import { useState, useEffect } from 'react'
import { format, differenceInDays } from 'date-fns'
import { it } from 'date-fns/locale'
import { useAuth } from '@/contexts/AuthContext'

const STATI_LABELS = {
  suggerito: { label: 'Suggerito', color: 'bg-violet-500', icon: '💡' },
  bozza: { label: 'Bozza', color: 'bg-slate-500', icon: '📝' },
  attivo: { label: 'Attivo', color: 'bg-emerald-500', icon: '🎯' },
  in_valutazione: { label: 'In Valutazione', color: 'bg-amber-500', icon: '🔍' },
  concluso: { label: 'Concluso', color: 'bg-blue-500', icon: '✅' },
  prorogato: { label: 'Prorogato', color: 'bg-purple-500', icon: '🔄' },
  sospeso: { label: 'Sospeso', color: 'bg-red-500', icon: '⏸️' }
}

const TIPI_OBIETTIVO = [
  { value: 'economico', label: 'Economico', icon: '💰', desc: 'Fatturato, margini, costi' },
  { value: 'clienti', label: 'Clienti', icon: '👥', desc: 'Acquisizione, fidelizzazione' },
  { value: 'servizi', label: 'Servizi', icon: '✂️', desc: 'Qualità, varietà, efficienza' },
  { value: 'prodotti', label: 'Prodotti', icon: '🛍️', desc: 'Vendita, stock, margini' },
  { value: 'efficienza', label: 'Efficienza', icon: '⚡', desc: 'Tempi, processi, risorse' },
  { value: 'qualita', label: 'Qualità', icon: '⭐', desc: 'Soddisfazione, recensioni' },
  { value: 'marketing', label: 'Marketing', icon: '📣', desc: 'Visibilità, promozioni' },
  { value: 'formazione', label: 'Formazione', icon: '📚', desc: 'Competenze, aggiornamenti' },
  { value: 'altro', label: 'Altro', icon: '🎯', desc: 'Obiettivi personalizzati' }
]

export default function ObiettiviPage() {
  const { currentCentro, profile } = useAuth()
  const CENTRO_ID = currentCentro?.centro_id || profile?.centro_id
  const [obiettivi, setObiettivi] = useState([])
  const [obiettiviSuggeriti, setObiettiviSuggeriti] = useState([])
  const [loading, setLoading] = useState(true)
  const [filtroStato, setFiltroStato] = useState('tutti')
  const [showCreazione, setShowCreazione] = useState(false)
  const [selectedObiettivo, setSelectedObiettivo] = useState(null)
  const [showValutazione, setShowValutazione] = useState(false)
  const [activatingId, setActivatingId] = useState(null)

  useEffect(() => {
    if (CENTRO_ID) loadObiettivi()
  }, [CENTRO_ID, filtroStato])

  useEffect(() => {
    if (CENTRO_ID) loadObiettiviSuggeriti()
  }, [CENTRO_ID])

  async function loadObiettivi() {
    setLoading(true)
    try {
      let url = `/api/obiettivi?centro_id=${CENTRO_ID}`
      if (filtroStato && filtroStato !== 'tutti') {
        url += `&stato=${filtroStato}`
      }
      const res = await fetch(url)
      const data = await res.json()
      setObiettivi(data.obiettivi || [])
    } catch (error) {
      console.error('Errore:', error)
    }
    setLoading(false)
  }

  async function loadObiettiviSuggeriti() {
    try {
      const res = await fetch(`/api/obiettivi?centro_id=${CENTRO_ID}&stato=suggerito`)
      const data = await res.json()
      setObiettiviSuggeriti(data.obiettivi || [])
    } catch (error) {
      console.error('Errore caricamento suggeriti:', error)
    }
  }

  async function attivaObiettivo(ob) {
    setActivatingId(ob.id)
    try {
      await fetch('/api/obiettivi', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          id: ob.id,
          stato: 'attivo',
          attivo: true,
          data_inizio: new Date().toISOString().split('T')[0],
          attivato_il: new Date().toISOString()
        })
      })
      loadObiettivi()
      loadObiettiviSuggeriti()
    } catch (error) {
      console.error('Errore attivazione:', error)
    }
    setActivatingId(null)
  }

  async function attivaTuttiObiettivi() {
    if (!obiettiviSuggeriti.length) return
    setLoading(true)
    try {
      for (const ob of obiettiviSuggeriti) {
        await fetch('/api/obiettivi', {
          method: 'PATCH',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            id: ob.id,
            stato: 'attivo',
            attivo: true,
            data_inizio: new Date().toISOString().split('T')[0],
            attivato_il: new Date().toISOString()
          })
        })
      }
      loadObiettivi()
      loadObiettiviSuggeriti()
    } catch (error) {
      console.error('Errore attivazione multipla:', error)
    }
    setLoading(false)
  }

  async function rifiutaObiettivo(id) {
    try {
      await fetch('/api/obiettivi', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          id,
          stato: 'sospeso',
          note: 'Obiettivo suggerito non attivato dall\'utente'
        })
      })
      loadObiettiviSuggeriti()
    } catch (error) {
      console.error('Errore rifiuto:', error)
    }
  }

  async function generaObiettividDati() {
    setLoading(true)
    try {
      const res = await fetch('/api/obiettivi/suggeriti', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          centro_id: CENTRO_ID,
          periodo: '2025'
        })
      })
      const data = await res.json()
      if (data.success) {
        loadObiettiviSuggeriti()
        alert(`Generati ${data.obiettivi_creati} nuovi obiettivi suggeriti basati sui tuoi dati!`)
      }
    } catch (error) {
      console.error('Errore generazione:', error)
    }
    setLoading(false)
  }

  function getCountdownColor(giorni) {
    if (giorni < 0) return 'text-red-400'
    if (giorni <= 7) return 'text-amber-400'
    if (giorni <= 30) return 'text-yellow-400'
    return 'text-emerald-400'
  }

  function formatCountdown(giorni) {
    if (giorni === null || giorni === undefined) return '-'
    if (giorni < 0) return `Scaduto da ${Math.abs(giorni)} giorni`
    if (giorni === 0) return 'Scade oggi!'
    if (giorni === 1) return '1 giorno'
    return `${giorni} giorni`
  }

  if (!CENTRO_ID) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-800 via-slate-900 to-slate-800 flex items-center justify-center">
        <div className="text-center max-w-md mx-auto p-8">
          <div className="text-5xl mb-4">🎯</div>
          <h2 className="text-xl font-bold text-white mb-2">Nessun centro selezionato</h2>
          <p className="text-slate-400">Seleziona un centro dalla navbar per gestire gli obiettivi.</p>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900">
      {/* Header */}
      <div className="bg-slate-950/70 backdrop-blur-xl border-b border-slate-700/50 sticky top-0 z-40">
        <div className="max-w-7xl mx-auto px-4 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <button
                onClick={() => window.location.href = '/'}
                className="p-2 hover:bg-slate-800 rounded-lg transition-colors"
              >
                ←
              </button>
              <div>
                <h1 className="text-xl font-bold text-white">🎯 Gestione Obiettivi</h1>
                <p className="text-sm text-slate-400">Definisci, monitora e valuta i tuoi obiettivi</p>
              </div>
            </div>
            <div className="flex gap-2">
              <button
                onClick={generaObiettividDati}
                className="px-4 py-2 bg-gradient-to-r from-amber-500 to-orange-500 hover:from-amber-600 hover:to-orange-600 text-white rounded-lg font-semibold transition-all shadow-lg"
                title="Genera obiettivi suggeriti basati sui tuoi dati"
              >
                💡 Analizza Dati
              </button>
              <button
                onClick={() => setShowCreazione(true)}
                className="px-4 py-2 bg-gradient-to-r from-violet-500 to-purple-500 hover:from-violet-600 hover:to-purple-600 text-white rounded-lg font-semibold transition-all shadow-lg"
              >
                + Nuovo Obiettivo
              </button>
            </div>
          </div>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-4 py-6">
        {/* Filtri stato */}
        <div className="flex gap-2 mb-6 overflow-x-auto pb-2">
          <button
            onClick={() => setFiltroStato('tutti')}
            className={`px-4 py-2 rounded-lg text-sm font-medium transition-all whitespace-nowrap ${
              filtroStato === 'tutti'
                ? 'bg-slate-600 text-white'
                : 'bg-slate-800/50 text-slate-400 hover:bg-slate-700/50'
            }`}
          >
            Tutti
          </button>
          {Object.entries(STATI_LABELS).map(([stato, { label, icon }]) => (
            <button
              key={stato}
              onClick={() => setFiltroStato(stato)}
              className={`px-4 py-2 rounded-lg text-sm font-medium transition-all whitespace-nowrap ${
                filtroStato === stato
                  ? 'bg-violet-600 text-white'
                  : 'bg-slate-800/50 text-slate-400 hover:bg-slate-700/50'
              }`}
            >
              {icon} {label}
            </button>
          ))}
        </div>

        {/* Obiettivi Suggeriti (da attivare dopo consulenza) */}
        {obiettiviSuggeriti.length > 0 && (
          <div className="mb-6 bg-gradient-to-br from-amber-900/20 via-orange-900/20 to-amber-900/20 rounded-xl border border-amber-500/40 overflow-hidden shadow-lg">
            <div className="px-5 py-4 bg-gradient-to-r from-amber-600/20 to-orange-600/20 border-b border-amber-500/30">
              <div className="flex items-center gap-3">
                <div className="w-12 h-12 rounded-full bg-amber-500/30 flex items-center justify-center">
                  <span className="text-2xl">💡</span>
                </div>
                <div className="flex-1">
                  <h3 className="font-bold text-white text-lg">
                    {obiettiviSuggeriti.length} Obiettivi Disponibili per l'Attivazione
                  </h3>
                  <p className="text-sm text-amber-200/80">
                    Questi obiettivi sono pronti per essere attivati. Puoi attivarli singolarmente o tutti insieme.
                  </p>
                </div>
                <button
                  onClick={attivaTuttiObiettivi}
                  disabled={loading}
                  className="px-5 py-2.5 bg-gradient-to-r from-emerald-500 to-teal-500 hover:from-emerald-600 hover:to-teal-600 text-white rounded-lg font-semibold text-sm transition-all disabled:opacity-50 shadow-lg whitespace-nowrap"
                >
                  {loading ? '⏳ Attivazione...' : `✓ Attiva Tutti (${obiettiviSuggeriti.length})`}
                </button>
              </div>
            </div>
            <div className="p-4 space-y-3">
              {obiettiviSuggeriti.map(ob => (
                <div
                  key={ob.id}
                  className="bg-slate-800/50 rounded-lg border border-slate-700/50 p-4 hover:border-violet-500/40 transition-all"
                >
                  <div className="flex items-start justify-between gap-4">
                    <div className="flex-1">
                      <div className="flex items-center gap-2 mb-1">
                        <span className="text-xl">{ob.icona || '🎯'}</span>
                        <span className="font-semibold text-white">{ob.nome}</span>
                        <span className="px-2 py-0.5 bg-violet-500/30 text-violet-300 text-xs rounded-full">
                          {TIPI_OBIETTIVO.find(t => t.value === ob.tipo)?.label || ob.tipo}
                        </span>
                      </div>
                      {ob.descrizione && (
                        <p className="text-sm text-slate-400 mb-2">{ob.descrizione}</p>
                      )}
                      {ob.analisi_situazione && (
                        <p className="text-xs text-slate-500 bg-slate-900/50 rounded p-2 mb-2">
                          💬 {ob.analisi_situazione}
                        </p>
                      )}
                      <div className="flex gap-4 text-sm">
                        {ob.valore_riferimento && (
                          <span className="text-slate-400">
                            Attuale: <span className="text-white font-medium">{ob.valore_riferimento}{ob.unita_misura === 'euro' ? '€' : ''}</span>
                          </span>
                        )}
                        {ob.valore_obiettivo && (
                          <span className="text-slate-400">
                            Target: <span className="text-violet-400 font-medium">{ob.valore_obiettivo}{ob.unita_misura === 'euro' ? '€' : ''}</span>
                          </span>
                        )}
                      </div>
                    </div>
                    <div className="flex flex-col gap-2">
                      <button
                        onClick={(e) => { e.stopPropagation(); attivaObiettivo(ob); }}
                        disabled={activatingId === ob.id}
                        className="px-4 py-2 bg-gradient-to-r from-emerald-500 to-teal-500 hover:from-emerald-600 hover:to-teal-600 text-white rounded-lg font-medium text-sm transition-all disabled:opacity-50 shadow-lg"
                      >
                        {activatingId === ob.id ? '⏳' : '✓ Attiva'}
                      </button>
                      <button
                        onClick={(e) => { e.stopPropagation(); rifiutaObiettivo(ob.id); }}
                        className="px-4 py-2 bg-slate-700 hover:bg-slate-600 text-slate-300 rounded-lg text-sm transition-all"
                      >
                        Non ora
                      </button>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Lista obiettivi */}
        {loading ? (
          <div className="text-center py-12">
            <div className="text-4xl mb-3 animate-pulse">🎯</div>
            <div className="text-slate-400">Caricamento obiettivi...</div>
          </div>
        ) : obiettivi.length === 0 ? (
          <div className="text-center py-12 bg-slate-800/30 rounded-xl border border-slate-700/50">
            <div className="text-5xl mb-4">📋</div>
            <h3 className="text-xl font-semibold text-white mb-2">Nessun obiettivo {filtroStato !== 'tutti' && STATI_LABELS[filtroStato]?.label.toLowerCase()}</h3>
            <p className="text-slate-400 mb-6">
              Gli obiettivi vengono definiti insieme durante le consulenze con Beautyx
            </p>
            <button
              onClick={() => setShowCreazione(true)}
              className="px-6 py-3 bg-gradient-to-r from-violet-500 to-purple-500 text-white rounded-lg font-semibold"
            >
              Crea il primo obiettivo
            </button>
          </div>
        ) : (
          <div className="grid gap-4">
            {obiettivi.map(ob => (
              <div
                key={ob.id}
                onClick={() => setSelectedObiettivo(ob)}
                className="bg-slate-800/50 backdrop-blur rounded-xl border border-slate-700/50 p-5 cursor-pointer hover:border-violet-500/50 transition-all"
              >
                <div className="flex items-start justify-between gap-4">
                  {/* Info principale */}
                  <div className="flex-1">
                    <div className="flex items-center gap-3 mb-2">
                      <span className="text-2xl">{ob.icona || TIPI_OBIETTIVO.find(t => t.value === ob.tipo)?.icon || '🎯'}</span>
                      <div>
                        <h3 className="text-lg font-bold text-white">{ob.nome}</h3>
                        {ob.descrizione && (
                          <p className="text-sm text-slate-400">{ob.descrizione}</p>
                        )}
                      </div>
                    </div>

                    {/* Analisi (se presente) */}
                    {ob.analisi_situazione && (
                      <div className="mt-3 p-3 bg-slate-900/50 rounded-lg">
                        <div className="text-xs text-slate-500 mb-1">Analisi situazione</div>
                        <p className="text-sm text-slate-300 line-clamp-2">{ob.analisi_situazione}</p>
                      </div>
                    )}

                    {/* Parametri */}
                    <div className="flex gap-4 mt-3 text-sm">
                      {ob.valore_riferimento && (
                        <div>
                          <span className="text-slate-500">Riferimento:</span>
                          <span className="text-white ml-1 font-medium">
                            {ob.valore_riferimento} {ob.unita_misura}
                          </span>
                        </div>
                      )}
                      {ob.valore_obiettivo && (
                        <div>
                          <span className="text-slate-500">Target:</span>
                          <span className="text-violet-400 ml-1 font-medium">
                            {ob.valore_obiettivo} {ob.unita_misura}
                          </span>
                        </div>
                      )}
                    </div>
                  </div>

                  {/* Stato e countdown */}
                  <div className="text-right">
                    <span className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-sm font-medium ${STATI_LABELS[ob.stato]?.color || 'bg-slate-600'} text-white`}>
                      {STATI_LABELS[ob.stato]?.icon} {STATI_LABELS[ob.stato]?.label || ob.stato}
                    </span>

                    {ob.data_target && (
                      <div className="mt-3">
                        <div className="text-xs text-slate-500">Scadenza</div>
                        <div className="text-sm text-white">
                          {format(new Date(ob.data_target), 'd MMM yyyy', { locale: it })}
                        </div>
                        <div className={`text-lg font-bold ${getCountdownColor(ob.giorni_rimanenti)}`}>
                          {formatCountdown(ob.giorni_rimanenti)}
                        </div>
                      </div>
                    )}
                  </div>
                </div>

                {/* Progress bar se attivo */}
                {ob.stato === 'attivo' && ob.data_target && ob.data_inizio && (
                  <div className="mt-4">
                    <div className="flex justify-between text-xs text-slate-500 mb-1">
                      <span>Progresso temporale</span>
                      <span>
                        {Math.max(0, Math.min(100, Math.round(
                          (differenceInDays(new Date(), new Date(ob.data_inizio)) /
                          differenceInDays(new Date(ob.data_target), new Date(ob.data_inizio))) * 100
                        )))}%
                      </span>
                    </div>
                    <div className="w-full bg-slate-700/50 rounded-full h-2">
                      <div
                        className="h-2 rounded-full bg-gradient-to-r from-violet-500 to-purple-500 transition-all"
                        style={{
                          width: `${Math.max(0, Math.min(100,
                            (differenceInDays(new Date(), new Date(ob.data_inizio)) /
                            differenceInDays(new Date(ob.data_target), new Date(ob.data_inizio))) * 100
                          ))}%`
                        }}
                      />
                    </div>
                  </div>
                )}
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Modal Creazione Obiettivo */}
      {showCreazione && (
        <CreazioneObiettivoModal
          onClose={() => setShowCreazione(false)}
          onCreated={() => {
            setShowCreazione(false)
            loadObiettivi()
          }}
        />
      )}

      {/* Modal Dettaglio Obiettivo */}
      {selectedObiettivo && (
        <DettaglioObiettivoModal
          obiettivo={selectedObiettivo}
          onClose={() => setSelectedObiettivo(null)}
          onUpdated={() => {
            setSelectedObiettivo(null)
            loadObiettivi()
          }}
          onValuta={() => {
            setShowValutazione(true)
          }}
        />
      )}

      {/* Modal Valutazione */}
      {showValutazione && selectedObiettivo && (
        <ValutazioneModal
          obiettivo={selectedObiettivo}
          onClose={() => setShowValutazione(false)}
          onSaved={() => {
            setShowValutazione(false)
            setSelectedObiettivo(null)
            loadObiettivi()
          }}
        />
      )}
    </div>
  )
}

// ============================================
// MODAL CREAZIONE OBIETTIVO (Wizard)
// ============================================
function CreazioneObiettivoModal({ onClose, onCreated }) {
  const [step, setStep] = useState(1)
  const [saving, setSaving] = useState(false)
  const [formData, setFormData] = useState({
    // Step 1: Analisi
    analisi_situazione: '',
    esigenze_identificate: '',
    motivazione: '',

    // Step 2: Definizione
    nome: '',
    descrizione: '',
    tipo: '',
    icona: '',

    // Step 3: Parametri
    valore_riferimento: '',
    valore_obiettivo: '',
    unita_misura: 'numero',
    direzione: 'maggiore',

    // Step 4: Timeline
    data_inizio: new Date().toISOString().split('T')[0],
    data_target: '',
    frequenza: 'giornaliero',

    // Step 5: Step intermedi
    steps: []
  })

  const updateField = (field, value) => {
    setFormData(prev => ({ ...prev, [field]: value }))
  }

  const addStep = () => {
    setFormData(prev => ({
      ...prev,
      steps: [...prev.steps, { titolo: '', descrizione: '', data_scadenza: '' }]
    }))
  }

  const updateStep = (index, field, value) => {
    setFormData(prev => ({
      ...prev,
      steps: prev.steps.map((s, i) => i === index ? { ...s, [field]: value } : s)
    }))
  }

  const removeStep = (index) => {
    setFormData(prev => ({
      ...prev,
      steps: prev.steps.filter((_, i) => i !== index)
    }))
  }

  async function handleSave() {
    setSaving(true)
    try {
      // Crea obiettivo
      const res = await fetch('/api/obiettivi', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          centro_id: CENTRO_ID,
          ...formData,
          stato: 'attivo',
          creato_da: 'beautyx'
        })
      })

      if (!res.ok) throw new Error('Errore creazione obiettivo')

      const { obiettivo } = await res.json()

      // Crea step se presenti
      if (formData.steps.length > 0) {
        for (let i = 0; i < formData.steps.length; i++) {
          const stepData = formData.steps[i]
          if (stepData.titolo && stepData.data_scadenza) {
            await fetch('/api/obiettivi/step', {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({
                obiettivo_id: obiettivo.id,
                ordine: i + 1,
                ...stepData
              })
            })
          }
        }
      }

      onCreated()
    } catch (error) {
      console.error('Errore:', error)
      alert('Errore durante il salvataggio')
    }
    setSaving(false)
  }

  return (
    <div className="fixed inset-0 bg-black/70 backdrop-blur-sm z-50 flex items-center justify-center p-4">
      <div className="bg-slate-900 rounded-2xl border border-slate-700 w-full max-w-2xl max-h-[90vh] overflow-hidden">
        {/* Header */}
        <div className="bg-gradient-to-r from-violet-600/20 to-purple-600/20 p-4 border-b border-slate-700">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-xl font-bold text-white">Nuovo Obiettivo</h2>
              <p className="text-sm text-slate-400">Step {step} di 5</p>
            </div>
            <button onClick={onClose} className="p-2 hover:bg-slate-800 rounded-lg">
              ✕
            </button>
          </div>
          {/* Progress */}
          <div className="flex gap-1 mt-3">
            {[1, 2, 3, 4, 5].map(s => (
              <div
                key={s}
                className={`flex-1 h-1 rounded-full transition-all ${
                  s <= step ? 'bg-violet-500' : 'bg-slate-700'
                }`}
              />
            ))}
          </div>
        </div>

        {/* Content */}
        <div className="p-6 overflow-y-auto max-h-[60vh]">
          {/* Step 1: Analisi */}
          {step === 1 && (
            <div className="space-y-4">
              <div className="text-center mb-6">
                <div className="text-4xl mb-2">🔍</div>
                <h3 className="text-lg font-bold text-white">Analisi della Situazione</h3>
                <p className="text-sm text-slate-400">Descrivi il contesto e le esigenze emerse</p>
              </div>

              <div>
                <label className="block text-sm font-medium text-slate-300 mb-2">
                  Situazione attuale *
                </label>
                <textarea
                  value={formData.analisi_situazione}
                  onChange={(e) => updateField('analisi_situazione', e.target.value)}
                  placeholder="Descrivi la situazione attuale del centro, i punti di forza e le criticità..."
                  className="w-full px-4 py-3 bg-slate-800 border border-slate-600 rounded-lg text-white placeholder-slate-500 focus:outline-none focus:border-violet-500 h-28"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-slate-300 mb-2">
                  Esigenze identificate *
                </label>
                <textarea
                  value={formData.esigenze_identificate}
                  onChange={(e) => updateField('esigenze_identificate', e.target.value)}
                  placeholder="Quali sono le esigenze emerse dall'analisi?"
                  className="w-full px-4 py-3 bg-slate-800 border border-slate-600 rounded-lg text-white placeholder-slate-500 focus:outline-none focus:border-violet-500 h-24"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-slate-300 mb-2">
                  Motivazione
                </label>
                <textarea
                  value={formData.motivazione}
                  onChange={(e) => updateField('motivazione', e.target.value)}
                  placeholder="Perché questo obiettivo è importante per il centro?"
                  className="w-full px-4 py-3 bg-slate-800 border border-slate-600 rounded-lg text-white placeholder-slate-500 focus:outline-none focus:border-violet-500 h-20"
                />
              </div>
            </div>
          )}

          {/* Step 2: Definizione */}
          {step === 2 && (
            <div className="space-y-4">
              <div className="text-center mb-6">
                <div className="text-4xl mb-2">🎯</div>
                <h3 className="text-lg font-bold text-white">Definizione Obiettivo</h3>
                <p className="text-sm text-slate-400">Dai un nome e una categoria all'obiettivo</p>
              </div>

              <div>
                <label className="block text-sm font-medium text-slate-300 mb-2">
                  Nome obiettivo *
                </label>
                <input
                  type="text"
                  value={formData.nome}
                  onChange={(e) => updateField('nome', e.target.value)}
                  placeholder="Es: Aumentare il numero di clienti settimanali"
                  className="w-full px-4 py-3 bg-slate-800 border border-slate-600 rounded-lg text-white placeholder-slate-500 focus:outline-none focus:border-violet-500"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-slate-300 mb-2">
                  Categoria *
                </label>
                <div className="grid grid-cols-3 gap-2">
                  {TIPI_OBIETTIVO.map(tipo => (
                    <button
                      key={tipo.value}
                      onClick={() => {
                        updateField('tipo', tipo.value)
                        updateField('icona', tipo.icon)
                      }}
                      className={`p-3 rounded-lg border text-left transition-all ${
                        formData.tipo === tipo.value
                          ? 'border-violet-500 bg-violet-500/20'
                          : 'border-slate-600 bg-slate-800 hover:border-slate-500'
                      }`}
                    >
                      <div className="text-xl mb-1">{tipo.icon}</div>
                      <div className="text-sm font-medium text-white">{tipo.label}</div>
                      <div className="text-xs text-slate-400">{tipo.desc}</div>
                    </button>
                  ))}
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-slate-300 mb-2">
                  Descrizione
                </label>
                <textarea
                  value={formData.descrizione}
                  onChange={(e) => updateField('descrizione', e.target.value)}
                  placeholder="Descrizione dettagliata dell'obiettivo..."
                  className="w-full px-4 py-3 bg-slate-800 border border-slate-600 rounded-lg text-white placeholder-slate-500 focus:outline-none focus:border-violet-500 h-20"
                />
              </div>
            </div>
          )}

          {/* Step 3: Parametri */}
          {step === 3 && (
            <div className="space-y-4">
              <div className="text-center mb-6">
                <div className="text-4xl mb-2">📊</div>
                <h3 className="text-lg font-bold text-white">Parametri Misurabili</h3>
                <p className="text-sm text-slate-400">Definisci come misurare il successo</p>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-slate-300 mb-2">
                    Valore di riferimento *
                  </label>
                  <input
                    type="number"
                    step="0.01"
                    value={formData.valore_riferimento}
                    onChange={(e) => updateField('valore_riferimento', e.target.value)}
                    placeholder="Es: 6"
                    className="w-full px-4 py-3 bg-slate-800 border border-slate-600 rounded-lg text-white placeholder-slate-500 focus:outline-none focus:border-violet-500"
                  />
                  <p className="text-xs text-slate-500 mt-1">Valore attuale o media storica</p>
                </div>

                <div>
                  <label className="block text-sm font-medium text-slate-300 mb-2">
                    Valore obiettivo *
                  </label>
                  <input
                    type="number"
                    step="0.01"
                    value={formData.valore_obiettivo}
                    onChange={(e) => updateField('valore_obiettivo', e.target.value)}
                    placeholder="Es: 10"
                    className="w-full px-4 py-3 bg-slate-800 border border-slate-600 rounded-lg text-white placeholder-slate-500 focus:outline-none focus:border-violet-500"
                  />
                  <p className="text-xs text-slate-500 mt-1">Target da raggiungere</p>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-slate-300 mb-2">
                    Unità di misura
                  </label>
                  <select
                    value={formData.unita_misura}
                    onChange={(e) => updateField('unita_misura', e.target.value)}
                    className="w-full px-4 py-3 bg-slate-800 border border-slate-600 rounded-lg text-white focus:outline-none focus:border-violet-500"
                  >
                    <option value="numero">Numero</option>
                    <option value="euro">Euro (€)</option>
                    <option value="percentuale">Percentuale (%)</option>
                    <option value="minuti">Minuti</option>
                    <option value="ore">Ore</option>
                  </select>
                </div>

                <div>
                  <label className="block text-sm font-medium text-slate-300 mb-2">
                    Direzione
                  </label>
                  <select
                    value={formData.direzione}
                    onChange={(e) => updateField('direzione', e.target.value)}
                    className="w-full px-4 py-3 bg-slate-800 border border-slate-600 rounded-lg text-white focus:outline-none focus:border-violet-500"
                  >
                    <option value="maggiore">Aumentare (≥ target)</option>
                    <option value="minore">Ridurre (≤ target)</option>
                    <option value="uguale">Raggiungere (= target)</option>
                  </select>
                </div>
              </div>
            </div>
          )}

          {/* Step 4: Timeline */}
          {step === 4 && (
            <div className="space-y-4">
              <div className="text-center mb-6">
                <div className="text-4xl mb-2">📅</div>
                <h3 className="text-lg font-bold text-white">Timeline</h3>
                <p className="text-sm text-slate-400">Definisci le tempistiche</p>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-slate-300 mb-2">
                    Data inizio
                  </label>
                  <input
                    type="date"
                    value={formData.data_inizio}
                    onChange={(e) => updateField('data_inizio', e.target.value)}
                    className="w-full px-4 py-3 bg-slate-800 border border-slate-600 rounded-lg text-white focus:outline-none focus:border-violet-500"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-slate-300 mb-2">
                    Data target *
                  </label>
                  <input
                    type="date"
                    value={formData.data_target}
                    onChange={(e) => updateField('data_target', e.target.value)}
                    className="w-full px-4 py-3 bg-slate-800 border border-slate-600 rounded-lg text-white focus:outline-none focus:border-violet-500"
                  />
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-slate-300 mb-2">
                  Frequenza monitoraggio
                </label>
                <select
                  value={formData.frequenza}
                  onChange={(e) => updateField('frequenza', e.target.value)}
                  className="w-full px-4 py-3 bg-slate-800 border border-slate-600 rounded-lg text-white focus:outline-none focus:border-violet-500"
                >
                  <option value="giornaliero">Giornaliero</option>
                  <option value="settimanale">Settimanale</option>
                  <option value="mensile">Mensile</option>
                </select>
              </div>

              {formData.data_target && (
                <div className="bg-violet-500/20 border border-violet-500/40 rounded-lg p-4 text-center">
                  <div className="text-sm text-violet-300">Tempo per raggiungere l'obiettivo</div>
                  <div className="text-3xl font-bold text-white">
                    {differenceInDays(new Date(formData.data_target), new Date())} giorni
                  </div>
                </div>
              )}
            </div>
          )}

          {/* Step 5: Step intermedi */}
          {step === 5 && (
            <div className="space-y-4">
              <div className="text-center mb-6">
                <div className="text-4xl mb-2">📋</div>
                <h3 className="text-lg font-bold text-white">Step Intermedi</h3>
                <p className="text-sm text-slate-400">Definisci le tappe per raggiungere l'obiettivo (opzionale)</p>
              </div>

              {formData.steps.map((s, i) => (
                <div key={i} className="bg-slate-800/50 rounded-lg p-4 border border-slate-700">
                  <div className="flex items-center justify-between mb-3">
                    <span className="text-sm font-medium text-violet-400">Step {i + 1}</span>
                    <button
                      onClick={() => removeStep(i)}
                      className="text-red-400 hover:text-red-300 text-sm"
                    >
                      Rimuovi
                    </button>
                  </div>
                  <div className="grid gap-3">
                    <input
                      type="text"
                      value={s.titolo}
                      onChange={(e) => updateStep(i, 'titolo', e.target.value)}
                      placeholder="Titolo step"
                      className="w-full px-3 py-2 bg-slate-900 border border-slate-600 rounded-lg text-white text-sm"
                    />
                    <div className="grid grid-cols-2 gap-3">
                      <textarea
                        value={s.descrizione}
                        onChange={(e) => updateStep(i, 'descrizione', e.target.value)}
                        placeholder="Descrizione..."
                        className="w-full px-3 py-2 bg-slate-900 border border-slate-600 rounded-lg text-white text-sm h-16"
                      />
                      <input
                        type="date"
                        value={s.data_scadenza}
                        onChange={(e) => updateStep(i, 'data_scadenza', e.target.value)}
                        className="w-full px-3 py-2 bg-slate-900 border border-slate-600 rounded-lg text-white text-sm"
                      />
                    </div>
                  </div>
                </div>
              ))}

              <button
                onClick={addStep}
                className="w-full py-3 border-2 border-dashed border-slate-600 rounded-lg text-slate-400 hover:border-violet-500 hover:text-violet-400 transition-colors"
              >
                + Aggiungi step intermedio
              </button>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="p-4 border-t border-slate-700 flex justify-between">
          <button
            onClick={() => step > 1 ? setStep(step - 1) : onClose()}
            className="px-4 py-2 bg-slate-700 hover:bg-slate-600 text-white rounded-lg"
          >
            {step === 1 ? 'Annulla' : '← Indietro'}
          </button>

          {step < 5 ? (
            <button
              onClick={() => setStep(step + 1)}
              disabled={
                (step === 1 && !formData.analisi_situazione) ||
                (step === 2 && (!formData.nome || !formData.tipo)) ||
                (step === 3 && (!formData.valore_riferimento || !formData.valore_obiettivo)) ||
                (step === 4 && !formData.data_target)
              }
              className="px-6 py-2 bg-violet-600 hover:bg-violet-500 text-white rounded-lg disabled:opacity-50 disabled:cursor-not-allowed"
            >
              Continua →
            </button>
          ) : (
            <button
              onClick={handleSave}
              disabled={saving}
              className="px-6 py-2 bg-gradient-to-r from-emerald-500 to-teal-500 hover:from-emerald-600 hover:to-teal-600 text-white rounded-lg font-semibold disabled:opacity-50"
            >
              {saving ? 'Salvataggio...' : '✓ Crea Obiettivo'}
            </button>
          )}
        </div>
      </div>
    </div>
  )
}

// ============================================
// MODAL DETTAGLIO OBIETTIVO
// ============================================
function DettaglioObiettivoModal({ obiettivo, onClose, onUpdated, onValuta }) {
  const [steps, setSteps] = useState([])
  const [storico, setStorico] = useState([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    loadDetails()
  }, [obiettivo.id])

  async function loadDetails() {
    setLoading(true)
    try {
      // Carica step
      const stepsRes = await fetch(`/api/obiettivi/step?obiettivo_id=${obiettivo.id}`)
      const stepsData = await stepsRes.json()
      setSteps(stepsData.steps || [])

      // Carica storico
      const storicoRes = await fetch(`/api/obiettivi/storico?obiettivo_id=${obiettivo.id}`)
      const storicoData = await storicoRes.json()
      setStorico(storicoData.storico || [])
    } catch (error) {
      console.error('Errore:', error)
    }
    setLoading(false)
  }

  async function toggleStep(stepId, completato) {
    try {
      await fetch('/api/obiettivi/step', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          id: stepId,
          stato: completato ? 'completed' : 'pending',
          completato_il: completato ? new Date().toISOString() : null
        })
      })
      loadDetails()
    } catch (error) {
      console.error('Errore:', error)
    }
  }

  return (
    <div className="fixed inset-0 bg-black/70 backdrop-blur-sm z-50 flex items-center justify-center p-4">
      <div className="bg-slate-900 rounded-2xl border border-slate-700 w-full max-w-3xl max-h-[90vh] overflow-hidden">
        {/* Header */}
        <div className="bg-gradient-to-r from-violet-600/20 to-purple-600/20 p-4 border-b border-slate-700">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <span className="text-3xl">{obiettivo.icona || '🎯'}</span>
              <div>
                <h2 className="text-xl font-bold text-white">{obiettivo.nome}</h2>
                <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs ${STATI_LABELS[obiettivo.stato]?.color} text-white`}>
                  {STATI_LABELS[obiettivo.stato]?.icon} {STATI_LABELS[obiettivo.stato]?.label}
                </span>
              </div>
            </div>
            <button onClick={onClose} className="p-2 hover:bg-slate-800 rounded-lg text-slate-400">
              ✕
            </button>
          </div>
        </div>

        {/* Content */}
        <div className="p-6 overflow-y-auto max-h-[60vh] space-y-6">
          {/* Countdown prominente */}
          {obiettivo.data_target && obiettivo.stato === 'attivo' && (
            <div className={`text-center p-6 rounded-xl ${
              obiettivo.giorni_rimanenti < 0 ? 'bg-red-500/20 border border-red-500/40' :
              obiettivo.giorni_rimanenti <= 7 ? 'bg-amber-500/20 border border-amber-500/40' :
              'bg-violet-500/20 border border-violet-500/40'
            }`}>
              <div className="text-sm text-slate-400 mb-1">Tempo rimanente</div>
              <div className="text-5xl font-bold text-white mb-2">
                {obiettivo.giorni_rimanenti < 0
                  ? `+${Math.abs(obiettivo.giorni_rimanenti)}`
                  : obiettivo.giorni_rimanenti}
              </div>
              <div className="text-slate-300">
                {obiettivo.giorni_rimanenti < 0 ? 'giorni in ritardo' : 'giorni alla scadenza'}
              </div>
              <div className="text-sm text-slate-400 mt-2">
                Target: {format(new Date(obiettivo.data_target), 'd MMMM yyyy', { locale: it })}
              </div>
            </div>
          )}

          {/* Analisi */}
          {obiettivo.analisi_situazione && (
            <div className="bg-slate-800/50 rounded-lg p-4">
              <h3 className="text-sm font-semibold text-violet-400 mb-2">🔍 Analisi Situazione</h3>
              <p className="text-slate-300 text-sm">{obiettivo.analisi_situazione}</p>
              {obiettivo.esigenze_identificate && (
                <>
                  <h4 className="text-sm font-semibold text-violet-400 mt-3 mb-1">Esigenze</h4>
                  <p className="text-slate-300 text-sm">{obiettivo.esigenze_identificate}</p>
                </>
              )}
            </div>
          )}

          {/* Parametri */}
          <div className="grid grid-cols-3 gap-4">
            <div className="bg-slate-800/50 rounded-lg p-4 text-center">
              <div className="text-sm text-slate-500">Riferimento</div>
              <div className="text-2xl font-bold text-white">
                {obiettivo.valore_riferimento} {obiettivo.unita_misura === 'euro' && '€'}
              </div>
            </div>
            <div className="bg-violet-500/20 rounded-lg p-4 text-center border border-violet-500/40">
              <div className="text-sm text-violet-300">Obiettivo</div>
              <div className="text-2xl font-bold text-white">
                {obiettivo.valore_obiettivo} {obiettivo.unita_misura === 'euro' && '€'}
              </div>
            </div>
            <div className="bg-slate-800/50 rounded-lg p-4 text-center">
              <div className="text-sm text-slate-500">Direzione</div>
              <div className="text-2xl">
                {obiettivo.direzione === 'maggiore' ? '📈' : obiettivo.direzione === 'minore' ? '📉' : '🎯'}
              </div>
            </div>
          </div>

          {/* Step */}
          {steps.length > 0 && (
            <div>
              <h3 className="text-sm font-semibold text-violet-400 mb-3">📋 Step da completare</h3>
              <div className="space-y-2">
                {steps.map((step, i) => (
                  <div
                    key={step.id}
                    className={`flex items-center gap-3 p-3 rounded-lg border transition-all ${
                      step.stato === 'completed'
                        ? 'bg-emerald-500/10 border-emerald-500/40'
                        : 'bg-slate-800/50 border-slate-700'
                    }`}
                  >
                    <button
                      onClick={() => toggleStep(step.id, step.stato !== 'completed')}
                      className={`w-6 h-6 rounded-full border-2 flex items-center justify-center transition-all ${
                        step.stato === 'completed'
                          ? 'bg-emerald-500 border-emerald-500 text-white'
                          : 'border-slate-500 hover:border-violet-500'
                      }`}
                    >
                      {step.stato === 'completed' && '✓'}
                    </button>
                    <div className="flex-1">
                      <div className={`font-medium ${step.stato === 'completed' ? 'text-slate-400 line-through' : 'text-white'}`}>
                        {step.titolo}
                      </div>
                      {step.descrizione && (
                        <div className="text-sm text-slate-500">{step.descrizione}</div>
                      )}
                    </div>
                    <div className="text-right text-sm">
                      <div className="text-slate-400">
                        {format(new Date(step.data_scadenza), 'd MMM', { locale: it })}
                      </div>
                      {step.giorni_rimanenti !== null && step.stato !== 'completed' && (
                        <div className={step.giorni_rimanenti < 0 ? 'text-red-400' : 'text-slate-500'}>
                          {step.giorni_rimanenti < 0 ? 'Scaduto' : `${step.giorni_rimanenti}g`}
                        </div>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="p-4 border-t border-slate-700 flex justify-between">
          <button
            onClick={onClose}
            className="px-4 py-2 bg-slate-700 hover:bg-slate-600 text-white rounded-lg"
          >
            Chiudi
          </button>

          {obiettivo.stato === 'attivo' && (
            <button
              onClick={onValuta}
              className="px-6 py-2 bg-gradient-to-r from-amber-500 to-orange-500 hover:from-amber-600 hover:to-orange-600 text-white rounded-lg font-semibold"
            >
              🔍 Valuta Obiettivo
            </button>
          )}
        </div>
      </div>
    </div>
  )
}

// ============================================
// MODAL VALUTAZIONE
// ============================================
function ValutazioneModal({ obiettivo, onClose, onSaved }) {
  const [saving, setSaving] = useState(false)
  const [formData, setFormData] = useState({
    risultato_ottenuto: '',
    valore_finale: '',
    obiettivo_raggiunto: null,
    impressioni_utente: '',
    difficolta_incontrate: '',
    punti_di_forza: '',
    suggerimenti_miglioramento: '',
    decisione: '',
    nuova_data_target: '',
    nuovo_valore_obiettivo: '',
    motivazione_proroga: ''
  })

  const updateField = (field, value) => {
    setFormData(prev => ({ ...prev, [field]: value }))
  }

  async function handleSave() {
    if (!formData.risultato_ottenuto || !formData.decisione) {
      alert('Compila tutti i campi obbligatori')
      return
    }

    setSaving(true)
    try {
      // Salva valutazione
      await fetch('/api/obiettivi/valutazione', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          obiettivo_id: obiettivo.id,
          ...formData,
          percentuale_raggiungimento: formData.valore_finale
            ? (parseFloat(formData.valore_finale) / obiettivo.valore_obiettivo) * 100
            : null
        })
      })

      // Aggiorna stato obiettivo
      let nuovoStato = obiettivo.stato
      if (formData.decisione === 'concludere') {
        nuovoStato = 'concluso'
      } else if (formData.decisione === 'prorogare') {
        nuovoStato = 'prorogato'
      } else if (formData.decisione === 'abbandonare') {
        nuovoStato = 'concluso'
      }

      await fetch('/api/obiettivi', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          id: obiettivo.id,
          stato: nuovoStato,
          ...(formData.decisione === 'prorogare' && {
            data_target: formData.nuova_data_target,
            valore_obiettivo: formData.nuovo_valore_obiettivo || obiettivo.valore_obiettivo,
            numero_proroghe: (obiettivo.numero_proroghe || 0) + 1
          })
        })
      })

      onSaved()
    } catch (error) {
      console.error('Errore:', error)
      alert('Errore durante il salvataggio')
    }
    setSaving(false)
  }

  return (
    <div className="fixed inset-0 bg-black/70 backdrop-blur-sm z-50 flex items-center justify-center p-4">
      <div className="bg-slate-900 rounded-2xl border border-slate-700 w-full max-w-2xl max-h-[90vh] overflow-hidden">
        {/* Header */}
        <div className="bg-gradient-to-r from-amber-600/20 to-orange-600/20 p-4 border-b border-slate-700">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-xl font-bold text-white">🔍 Valutazione Obiettivo</h2>
              <p className="text-sm text-slate-400">{obiettivo.nome}</p>
            </div>
            <button onClick={onClose} className="p-2 hover:bg-slate-800 rounded-lg text-slate-400">
              ✕
            </button>
          </div>
        </div>

        {/* Content */}
        <div className="p-6 overflow-y-auto max-h-[60vh] space-y-4">
          {/* Risultato */}
          <div>
            <label className="block text-sm font-medium text-slate-300 mb-2">
              Risultato ottenuto *
            </label>
            <textarea
              value={formData.risultato_ottenuto}
              onChange={(e) => updateField('risultato_ottenuto', e.target.value)}
              placeholder="Descrivi il risultato raggiunto..."
              className="w-full px-4 py-3 bg-slate-800 border border-slate-600 rounded-lg text-white h-24"
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-slate-300 mb-2">
                Valore finale raggiunto
              </label>
              <input
                type="number"
                step="0.01"
                value={formData.valore_finale}
                onChange={(e) => updateField('valore_finale', e.target.value)}
                placeholder={`Target era: ${obiettivo.valore_obiettivo}`}
                className="w-full px-4 py-3 bg-slate-800 border border-slate-600 rounded-lg text-white"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-slate-300 mb-2">
                Obiettivo raggiunto?
              </label>
              <div className="flex gap-2">
                <button
                  onClick={() => updateField('obiettivo_raggiunto', true)}
                  className={`flex-1 py-3 rounded-lg border transition-all ${
                    formData.obiettivo_raggiunto === true
                      ? 'bg-emerald-500/20 border-emerald-500 text-emerald-400'
                      : 'bg-slate-800 border-slate-600 text-slate-400'
                  }`}
                >
                  ✓ Sì
                </button>
                <button
                  onClick={() => updateField('obiettivo_raggiunto', false)}
                  className={`flex-1 py-3 rounded-lg border transition-all ${
                    formData.obiettivo_raggiunto === false
                      ? 'bg-red-500/20 border-red-500 text-red-400'
                      : 'bg-slate-800 border-slate-600 text-slate-400'
                  }`}
                >
                  ✕ No
                </button>
              </div>
            </div>
          </div>

          {/* Feedback */}
          <div className="border-t border-slate-700 pt-4">
            <h3 className="text-sm font-semibold text-amber-400 mb-3">💭 Le tue impressioni</h3>

            <div className="space-y-3">
              <textarea
                value={formData.impressioni_utente}
                onChange={(e) => updateField('impressioni_utente', e.target.value)}
                placeholder="Come ti sei sentito durante questo percorso?"
                className="w-full px-4 py-3 bg-slate-800 border border-slate-600 rounded-lg text-white h-20"
              />
              <textarea
                value={formData.difficolta_incontrate}
                onChange={(e) => updateField('difficolta_incontrate', e.target.value)}
                placeholder="Quali difficoltà hai incontrato?"
                className="w-full px-4 py-3 bg-slate-800 border border-slate-600 rounded-lg text-white h-20"
              />
              <textarea
                value={formData.punti_di_forza}
                onChange={(e) => updateField('punti_di_forza', e.target.value)}
                placeholder="Cosa ha funzionato bene?"
                className="w-full px-4 py-3 bg-slate-800 border border-slate-600 rounded-lg text-white h-20"
              />
            </div>
          </div>

          {/* Decisione */}
          <div className="border-t border-slate-700 pt-4">
            <h3 className="text-sm font-semibold text-amber-400 mb-3">⚖️ Decisione *</h3>
            <div className="grid grid-cols-2 gap-3">
              <button
                onClick={() => updateField('decisione', 'concludere')}
                className={`p-4 rounded-lg border text-left transition-all ${
                  formData.decisione === 'concludere'
                    ? 'bg-emerald-500/20 border-emerald-500'
                    : 'bg-slate-800 border-slate-600 hover:border-slate-500'
                }`}
              >
                <div className="text-xl mb-1">✅</div>
                <div className="font-medium text-white">Concludere</div>
                <div className="text-xs text-slate-400">Archivia come completato</div>
              </button>
              <button
                onClick={() => updateField('decisione', 'prorogare')}
                className={`p-4 rounded-lg border text-left transition-all ${
                  formData.decisione === 'prorogare'
                    ? 'bg-purple-500/20 border-purple-500'
                    : 'bg-slate-800 border-slate-600 hover:border-slate-500'
                }`}
              >
                <div className="text-xl mb-1">🔄</div>
                <div className="font-medium text-white">Prorogare</div>
                <div className="text-xs text-slate-400">Estendi con modifiche</div>
              </button>
            </div>
          </div>

          {/* Campi proroga */}
          {formData.decisione === 'prorogare' && (
            <div className="bg-purple-500/10 border border-purple-500/40 rounded-lg p-4 space-y-3">
              <h4 className="font-medium text-purple-300">Parametri proroga</h4>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs text-slate-400 mb-1">Nuova data target *</label>
                  <input
                    type="date"
                    value={formData.nuova_data_target}
                    onChange={(e) => updateField('nuova_data_target', e.target.value)}
                    className="w-full px-3 py-2 bg-slate-800 border border-slate-600 rounded-lg text-white"
                  />
                </div>
                <div>
                  <label className="block text-xs text-slate-400 mb-1">Nuovo valore obiettivo</label>
                  <input
                    type="number"
                    value={formData.nuovo_valore_obiettivo}
                    onChange={(e) => updateField('nuovo_valore_obiettivo', e.target.value)}
                    placeholder={obiettivo.valore_obiettivo}
                    className="w-full px-3 py-2 bg-slate-800 border border-slate-600 rounded-lg text-white"
                  />
                </div>
              </div>
              <textarea
                value={formData.motivazione_proroga}
                onChange={(e) => updateField('motivazione_proroga', e.target.value)}
                placeholder="Motivazione della proroga..."
                className="w-full px-3 py-2 bg-slate-800 border border-slate-600 rounded-lg text-white h-16"
              />
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="p-4 border-t border-slate-700 flex justify-between">
          <button
            onClick={onClose}
            className="px-4 py-2 bg-slate-700 hover:bg-slate-600 text-white rounded-lg"
          >
            Annulla
          </button>
          <button
            onClick={handleSave}
            disabled={saving || !formData.risultato_ottenuto || !formData.decisione}
            className="px-6 py-2 bg-gradient-to-r from-amber-500 to-orange-500 text-white rounded-lg font-semibold disabled:opacity-50"
          >
            {saving ? 'Salvataggio...' : '✓ Salva Valutazione'}
          </button>
        </div>
      </div>
    </div>
  )
}
