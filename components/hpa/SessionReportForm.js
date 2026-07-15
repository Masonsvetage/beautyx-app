'use client'

import { useState } from 'react'

const OBIETTIVI_OPTIONS = [
  { value: 'non_definiti', label: 'Non definiti', color: 'text-slate-400' },
  { value: 'definiti_non_focalizzato', label: 'Definiti ma non focalizzato', color: 'text-amber-400' },
  { value: 'focalizzato', label: 'Focalizzato', color: 'text-blue-400' },
  { value: 'raggiunto', label: 'Raggiunto', color: 'text-green-400' },
  { value: 'superato', label: 'Superato', color: 'text-emerald-400' }
]

const VALUTAZIONE_OPTIONS = [
  { value: 'eccellente', label: 'Eccellente', color: 'text-emerald-400' },
  { value: 'buono', label: 'Buono', color: 'text-green-400' },
  { value: 'sufficiente', label: 'Sufficiente', color: 'text-amber-400' },
  { value: 'insufficiente', label: 'Insufficiente', color: 'text-orange-400' },
  { value: 'critico', label: 'Critico', color: 'text-red-400' }
]

export default function SessionReportForm({ centroId, onSaved, onCancel, editReport = null }) {
  const [form, setForm] = useState({
    sintesi: editReport?.sintesi || '',
    punti_forza: editReport?.punti_forza || '',
    punti_debolezza: editReport?.punti_debolezza || '',
    obiettivi_stato: editReport?.obiettivi_stato || 'non_definiti',
    obiettivi_note: editReport?.obiettivi_note || '',
    valutazione_beautyx: editReport?.valutazione_beautyx || 'sufficiente',
    valutazione_beautyx_note: editReport?.valutazione_beautyx_note || '',
    valutazione_punteggio: editReport?.valutazione_punteggio || 3,
    raccomandazioni: editReport?.raccomandazioni || '',
    durata_minuti: editReport?.durata_minuti || ''
  })
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState(null)

  const handleChange = (field, value) => {
    setForm(prev => ({ ...prev, [field]: value }))
  }

  const handleSubmit = async () => {
    if (!form.sintesi.trim()) {
      setError('La sintesi e\' obbligatoria')
      return
    }
    setSaving(true)
    setError(null)

    try {
      const method = editReport ? 'PUT' : 'POST'
      const body = editReport
        ? { id: editReport.id, ...form }
        : { centro_id: centroId, ...form }

      const res = await fetch('/api/hpa/reports', {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body)
      })

      if (!res.ok) {
        const data = await res.json()
        throw new Error(data.error || 'Errore salvataggio')
      }

      const data = await res.json()
      onSaved?.(data.report)
    } catch (err) {
      setError(err.message)
    } finally {
      setSaving(false)
    }
  }

  return (
    <div className="space-y-4">
      <h3 className="text-lg font-bold text-white flex items-center gap-2">
        <svg className="w-5 h-5 text-purple-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
        </svg>
        {editReport ? 'Modifica Report' : 'Nuovo Report Sessione'}
      </h3>

      {error && (
        <div className="bg-red-500/10 border border-red-500/30 rounded-lg px-3 py-2 text-sm text-red-400">
          {error}
        </div>
      )}

      {/* Sintesi */}
      <div>
        <label className="block text-sm font-medium text-slate-300 mb-1">
          Sintesi dell'incontro <span className="text-red-400">*</span>
        </label>
        <textarea
          value={form.sintesi}
          onChange={(e) => handleChange('sintesi', e.target.value)}
          rows={3}
          className="w-full px-3 py-2 bg-slate-900/50 border border-slate-600/50 rounded-lg text-white text-sm placeholder-slate-500 focus:outline-none focus:ring-1 focus:ring-purple-500/50"
          placeholder="Descrivi brevemente la sessione..."
        />
      </div>

      {/* Punti di forza e debolezza */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
        <div>
          <label className="block text-sm font-medium text-green-400 mb-1">Punti di forza</label>
          <textarea
            value={form.punti_forza}
            onChange={(e) => handleChange('punti_forza', e.target.value)}
            rows={2}
            className="w-full px-3 py-2 bg-slate-900/50 border border-green-500/20 rounded-lg text-white text-sm placeholder-slate-500 focus:outline-none focus:ring-1 focus:ring-green-500/50"
            placeholder="Aspetti positivi..."
          />
        </div>
        <div>
          <label className="block text-sm font-medium text-amber-400 mb-1">Aree di miglioramento</label>
          <textarea
            value={form.punti_debolezza}
            onChange={(e) => handleChange('punti_debolezza', e.target.value)}
            rows={2}
            className="w-full px-3 py-2 bg-slate-900/50 border border-amber-500/20 rounded-lg text-white text-sm placeholder-slate-500 focus:outline-none focus:ring-1 focus:ring-amber-500/50"
            placeholder="Aspetti da migliorare..."
          />
        </div>
      </div>

      {/* Obiettivi */}
      <div>
        <label className="block text-sm font-medium text-slate-300 mb-1">Stato Obiettivi</label>
        <select
          value={form.obiettivi_stato}
          onChange={(e) => handleChange('obiettivi_stato', e.target.value)}
          className="w-full px-3 py-2 bg-slate-900/50 border border-slate-600/50 rounded-lg text-white text-sm focus:outline-none focus:ring-1 focus:ring-purple-500/50"
        >
          {OBIETTIVI_OPTIONS.map(o => (
            <option key={o.value} value={o.value}>{o.label}</option>
          ))}
        </select>
        <textarea
          value={form.obiettivi_note}
          onChange={(e) => handleChange('obiettivi_note', e.target.value)}
          rows={2}
          className="w-full mt-2 px-3 py-2 bg-slate-900/50 border border-slate-600/50 rounded-lg text-white text-sm placeholder-slate-500 focus:outline-none focus:ring-1 focus:ring-purple-500/50"
          placeholder="Note sugli obiettivi..."
        />
      </div>

      {/* Valutazione rapporto con BeautyX */}
      <div>
        <label className="block text-sm font-medium text-slate-300 mb-1">Rapporto Utente/BeautyX</label>
        <div className="flex items-center gap-3">
          <select
            value={form.valutazione_beautyx}
            onChange={(e) => handleChange('valutazione_beautyx', e.target.value)}
            className="flex-1 px-3 py-2 bg-slate-900/50 border border-slate-600/50 rounded-lg text-white text-sm focus:outline-none focus:ring-1 focus:ring-purple-500/50"
          >
            {VALUTAZIONE_OPTIONS.map(v => (
              <option key={v.value} value={v.value}>{v.label}</option>
            ))}
          </select>
          {/* Punteggio 1-5 stelle */}
          <div className="flex items-center gap-1">
            {[1, 2, 3, 4, 5].map(n => (
              <button
                key={n}
                type="button"
                onClick={() => handleChange('valutazione_punteggio', n)}
                className={`w-7 h-7 rounded-full text-sm font-bold transition-all ${
                  n <= form.valutazione_punteggio
                    ? 'bg-purple-500 text-white'
                    : 'bg-slate-700 text-slate-500 hover:bg-slate-600'
                }`}
              >
                {n}
              </button>
            ))}
          </div>
        </div>
        <textarea
          value={form.valutazione_beautyx_note}
          onChange={(e) => handleChange('valutazione_beautyx_note', e.target.value)}
          rows={2}
          className="w-full mt-2 px-3 py-2 bg-slate-900/50 border border-slate-600/50 rounded-lg text-white text-sm placeholder-slate-500 focus:outline-none focus:ring-1 focus:ring-purple-500/50"
          placeholder="Note sulla relazione con BeautyX AI..."
        />
      </div>

      {/* Raccomandazioni */}
      <div>
        <label className="block text-sm font-medium text-slate-300 mb-1">Raccomandazioni</label>
        <textarea
          value={form.raccomandazioni}
          onChange={(e) => handleChange('raccomandazioni', e.target.value)}
          rows={2}
          className="w-full px-3 py-2 bg-slate-900/50 border border-slate-600/50 rounded-lg text-white text-sm placeholder-slate-500 focus:outline-none focus:ring-1 focus:ring-purple-500/50"
          placeholder="Prossimi passi consigliati..."
        />
      </div>

      {/* Durata */}
      <div>
        <label className="block text-sm font-medium text-slate-300 mb-1">Durata sessione (minuti)</label>
        <input
          type="number"
          value={form.durata_minuti}
          onChange={(e) => handleChange('durata_minuti', parseInt(e.target.value) || '')}
          min={1}
          max={300}
          className="w-32 px-3 py-2 bg-slate-900/50 border border-slate-600/50 rounded-lg text-white text-sm focus:outline-none focus:ring-1 focus:ring-purple-500/50"
          placeholder="min"
        />
      </div>

      {/* Azioni */}
      <div className="flex gap-3 pt-2">
        <button
          onClick={handleSubmit}
          disabled={saving || !form.sintesi.trim()}
          className="flex-1 py-2.5 bg-purple-500 hover:bg-purple-600 disabled:bg-slate-600 disabled:cursor-not-allowed text-white font-medium text-sm rounded-lg transition-colors"
        >
          {saving ? 'Salvataggio...' : (editReport ? 'Aggiorna Report' : 'Salva Report')}
        </button>
        {onCancel && (
          <button
            onClick={onCancel}
            className="px-6 py-2.5 bg-slate-700 hover:bg-slate-600 text-slate-300 font-medium text-sm rounded-lg transition-colors"
          >
            Annulla
          </button>
        )}
      </div>
    </div>
  )
}
