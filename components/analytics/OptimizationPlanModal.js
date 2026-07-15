'use client'

import { useState } from 'react'
import { format } from 'date-fns'

/**
 * Modal per creare un nuovo piano di ottimizzazione
 * Può essere pre-compilato con dati da anomalia o costo ottimizzabile
 */
export default function OptimizationPlanModal({
  centroId,
  anomaly = null,  // Dati anomalia (opzionale)
  cost = null,     // Dati costo ottimizzabile (opzionale)
  onClose,
  onPlanCreated
}) {
  const [saving, setSaving] = useState(false)

  // Pre-compila i campi se abbiamo dati da anomalia o costo
  const initialData = anomaly || cost || {}

  const [formData, setFormData] = useState({
    titolo: initialData.categoria
      ? `Ottimizzare: ${initialData.categoria}`
      : '',
    descrizione: initialData.suggerimento || initialData.motivo || '',
    categoria: initialData.categoria || '',
    importo_rilevato: initialData.importo || initialData.uscite || 0,
    percentuale_rilevata: initialData.percentuale || initialData.percentualeSuFatturato || null,
    tipo_rilevazione: initialData.tipo || 'manuale',
    obiettivo_risparmio: '',
    obiettivo_tipo: 'valuta', // 'valuta' o 'percentuale'
    obiettivo_periodo: 'mensile', // 'mensile' o 'annuale'
    priorita: initialData.gravita === 'alta' ? 1 : initialData.gravita === 'media' ? 2 : 2,
    data_scadenza: format(new Date(Date.now() + 30 * 24 * 60 * 60 * 1000), 'yyyy-MM-dd'),
    prima_azione: '' // Prima azione/proposito da fare
  })

  async function handleSubmit(e) {
    e.preventDefault()

    if (!formData.titolo.trim()) {
      alert('Inserisci un titolo per il piano')
      return
    }

    setSaving(true)
    try {
      // Prepara azioni iniziali se c'è un proposito
      const azioni = formData.prima_azione.trim()
        ? [{ descrizione: formData.prima_azione, tipo_azione: 'task' }]
        : []

      // Calcola obiettivo risparmio in euro
      let obiettivoEuro = null
      if (formData.obiettivo_risparmio) {
        if (formData.obiettivo_tipo === 'percentuale') {
          // Converti % in euro basato sull'importo rilevato
          obiettivoEuro = (parseFloat(formData.importo_rilevato) * parseFloat(formData.obiettivo_risparmio)) / 100
        } else {
          obiettivoEuro = parseFloat(formData.obiettivo_risparmio)
        }
        // Se annuale, dividi per 12 per avere il mensile
        if (formData.obiettivo_periodo === 'annuale') {
          obiettivoEuro = obiettivoEuro / 12
        }
      }

      // Aggiungi info obiettivo alla descrizione
      let descrizioneCompleta = formData.descrizione || ''
      if (formData.obiettivo_risparmio) {
        const obiettivoInfo = `\n\nObiettivo: ${formData.obiettivo_risparmio}${formData.obiettivo_tipo === 'percentuale' ? '%' : '€'} ${formData.obiettivo_periodo}`
        descrizioneCompleta += obiettivoInfo
      }

      const res = await fetch('/api/optimization-plans', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          centro_id: centroId,
          categoria: formData.categoria,
          importo_rilevato: parseFloat(formData.importo_rilevato) || 0,
          percentuale_rilevata: formData.percentuale_rilevata,
          tipo_rilevazione: formData.tipo_rilevazione,
          periodo_riferimento: format(new Date(), 'yyyy-MM'),
          titolo: formData.titolo,
          descrizione: descrizioneCompleta,
          obiettivo_risparmio: obiettivoEuro,
          priorita: formData.priorita,
          data_scadenza: formData.data_scadenza || null,
          azioni
        })
      })

      if (!res.ok) {
        const err = await res.json()
        throw new Error(err.error || 'Errore creazione piano')
      }

      const data = await res.json()

      if (onPlanCreated) {
        onPlanCreated(data.plan)
      }
      onClose()

    } catch (error) {
      console.error('Errore:', error)
      alert(error.message)
    }
    setSaving(false)
  }

  function formatEuro(val) {
    return new Intl.NumberFormat('it-IT', { style: 'currency', currency: 'EUR' }).format(val || 0)
  }

  return (
    <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
      <div className="bg-white rounded-xl shadow-2xl max-w-lg w-full max-h-[90vh] flex flex-col">
        {/* Header */}
        <div className="bg-gradient-to-r from-green-600 to-emerald-600 text-white p-6 rounded-t-xl">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="w-12 h-12 bg-white/20 backdrop-blur-sm rounded-xl flex items-center justify-center shadow-lg">
                <span className="text-2xl">📋</span>
              </div>
              <div>
                <h2 className="text-xl font-bold">Nuovo Piano di Ottimizzazione</h2>
                <p className="text-sm text-green-100 mt-1">
                  Traccia le azioni per ridurre i costi
                </p>
              </div>
            </div>
            <button
              onClick={onClose}
              className="w-10 h-10 bg-white/20 hover:bg-white/30 rounded-lg flex items-center justify-center transition-colors"
            >
              <span className="text-xl">x</span>
            </button>
          </div>
        </div>

        {/* Form */}
        <form onSubmit={handleSubmit} className="flex-1 overflow-y-auto p-6">
          {/* Info box se abbiamo dati pre-compilati */}
          {(anomaly || cost) && (
            <div className="mb-4 p-3 bg-amber-50 rounded-lg border border-amber-200">
              <div className="flex items-start gap-2">
                <span className="text-lg">💡</span>
                <div className="text-sm text-gray-700">
                  <strong className="text-amber-700">Rilevato:</strong>{' '}
                  {formData.categoria} - {formatEuro(formData.importo_rilevato)}
                  {formData.percentuale_rilevata && (
                    <span> ({formData.percentuale_rilevata.toFixed(1)}% del fatturato)</span>
                  )}
                </div>
              </div>
            </div>
          )}

          {/* Titolo */}
          <div className="mb-4">
            <label className="block text-sm font-semibold text-gray-700 mb-1">
              Titolo del Piano *
            </label>
            <input
              type="text"
              value={formData.titolo}
              onChange={(e) => setFormData({ ...formData, titolo: e.target.value })}
              placeholder="Es: Ridurre costi energia elettrica"
              className="w-full px-4 py-3 border-2 border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-green-500 focus:border-transparent"
              required
            />
          </div>

          {/* Categoria (se non pre-compilata) */}
          {!initialData.categoria && (
            <div className="mb-4">
              <label className="block text-sm font-semibold text-gray-700 mb-1">
                Categoria
              </label>
              <input
                type="text"
                value={formData.categoria}
                onChange={(e) => setFormData({ ...formData, categoria: e.target.value })}
                placeholder="Es: Utenze, Fornitori, Marketing..."
                className="w-full px-4 py-3 border-2 border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-green-500 focus:border-transparent"
              />
            </div>
          )}

          {/* Descrizione/Motivo */}
          <div className="mb-4">
            <label className="block text-sm font-semibold text-gray-700 mb-1">
              Descrizione del problema
            </label>
            <textarea
              value={formData.descrizione}
              onChange={(e) => setFormData({ ...formData, descrizione: e.target.value })}
              placeholder="Descrivi il problema rilevato e perché vuoi ottimizzare..."
              rows={3}
              className="w-full px-4 py-3 border-2 border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-green-500 focus:border-transparent"
            />
          </div>

          {/* Prima azione / Proposito */}
          <div className="mb-4">
            <label className="block text-sm font-semibold text-gray-700 mb-1">
              Proposito / Prima azione da fare
            </label>
            <input
              type="text"
              value={formData.prima_azione}
              onChange={(e) => setFormData({ ...formData, prima_azione: e.target.value })}
              placeholder="Es: Contattare altri gestori energia per preventivi"
              className="w-full px-4 py-3 border-2 border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-green-500 focus:border-transparent"
            />
          </div>

          {/* Obiettivo risparmio */}
          <div className="mb-4">
            <label className="block text-sm font-semibold text-gray-700 mb-1">
              Obiettivo risparmio
            </label>
            <div className="flex gap-2">
              {/* Tipo: valuta o percentuale */}
              <div className="flex rounded-lg border-2 border-gray-300 overflow-hidden">
                <button
                  type="button"
                  onClick={() => setFormData({ ...formData, obiettivo_tipo: 'valuta' })}
                  className={`px-3 py-2 text-sm font-semibold transition-colors ${
                    formData.obiettivo_tipo === 'valuta'
                      ? 'bg-green-600 text-white'
                      : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                  }`}
                >
                  €
                </button>
                <button
                  type="button"
                  onClick={() => setFormData({ ...formData, obiettivo_tipo: 'percentuale' })}
                  className={`px-3 py-2 text-sm font-semibold transition-colors ${
                    formData.obiettivo_tipo === 'percentuale'
                      ? 'bg-green-600 text-white'
                      : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                  }`}
                >
                  %
                </button>
              </div>
              {/* Input valore */}
              <div className="relative flex-1">
                <span className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-500">
                  {formData.obiettivo_tipo === 'valuta' ? '€' : '%'}
                </span>
                <input
                  type="number"
                  step={formData.obiettivo_tipo === 'valuta' ? '0.01' : '1'}
                  min="0"
                  max={formData.obiettivo_tipo === 'percentuale' ? '100' : undefined}
                  value={formData.obiettivo_risparmio}
                  onChange={(e) => setFormData({ ...formData, obiettivo_risparmio: e.target.value })}
                  placeholder={formData.obiettivo_tipo === 'valuta' ? '0.00' : '10'}
                  className="w-full pl-8 pr-4 py-2 border-2 border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-green-500 focus:border-transparent"
                />
              </div>
              {/* Periodo: mensile o annuale */}
              <select
                value={formData.obiettivo_periodo}
                onChange={(e) => setFormData({ ...formData, obiettivo_periodo: e.target.value })}
                className="px-3 py-2 border-2 border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-green-500 focus:border-transparent text-sm"
              >
                <option value="mensile">Mensile</option>
                <option value="annuale">Annuale</option>
              </select>
            </div>
            {formData.obiettivo_tipo === 'percentuale' && formData.importo_rilevato > 0 && formData.obiettivo_risparmio && (
              <div className="mt-1 text-xs text-gray-500">
                = {formatEuro(formData.importo_rilevato * parseFloat(formData.obiettivo_risparmio) / 100)} di risparmio
              </div>
            )}
          </div>

          {/* Priorità */}
          <div className="mb-4">
            <label className="block text-sm font-semibold text-gray-700 mb-1">
              Priorità
            </label>
            <select
              value={formData.priorita}
              onChange={(e) => setFormData({ ...formData, priorita: parseInt(e.target.value) })}
              className="w-full px-4 py-3 border-2 border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-green-500 focus:border-transparent"
            >
              <option value={1}>🔴 Alta</option>
              <option value={2}>🟡 Media</option>
              <option value={3}>🟢 Bassa</option>
            </select>
          </div>

          {/* Scadenza */}
          <div className="mb-4">
            <label className="block text-sm font-semibold text-gray-700 mb-1">
              Scadenza obiettivo
            </label>
            <input
              type="date"
              value={formData.data_scadenza}
              onChange={(e) => setFormData({ ...formData, data_scadenza: e.target.value })}
              className="w-full px-4 py-3 border-2 border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-green-500 focus:border-transparent"
            />
          </div>
        </form>

        {/* Footer */}
        <div className="p-4 border-t border-gray-200 bg-gray-50 rounded-b-xl">
          <div className="flex gap-3">
            <button
              type="button"
              onClick={onClose}
              className="flex-1 px-4 py-3 border-2 border-gray-300 text-gray-700 rounded-xl font-semibold hover:bg-gray-100 transition-colors"
            >
              Annulla
            </button>
            <button
              onClick={handleSubmit}
              disabled={saving || !formData.titolo.trim()}
              className="flex-1 px-4 py-3 bg-gradient-to-r from-green-600 to-emerald-600 text-white rounded-xl font-semibold hover:from-green-700 hover:to-emerald-700 transition-all disabled:opacity-50 disabled:cursor-not-allowed shadow-lg"
            >
              {saving ? '⏳ Creazione...' : '✅ Crea Piano'}
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}
