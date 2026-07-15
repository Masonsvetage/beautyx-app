'use client'

import { useState, useEffect } from 'react'

// Categorie principali per cui configurare soglie
const CATEGORIE_PRINCIPALI = [
  'Tasse',
  'Dipendenti',
  'Fornitori',
  'Affitto',
  'Utenze',
  'Marketing',
  'Manutenzione',
  'Assicurazioni',
  'Formazione'
]

export default function SoglieConfig({ centroId, onClose, onSave }) {
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [soglieDefault, setSoglieDefault] = useState(null)
  const [sogliePersonalizzate, setSogliePersonalizzate] = useState({})
  const [activeTab, setActiveTab] = useState('costi') // 'costi', 'fatturato', 'generale'

  useEffect(() => {
    if (centroId) loadSoglie()
  }, [centroId])

  async function loadSoglie() {
    if (!centroId) return
    setLoading(true)
    try {
      const res = await fetch(`/api/soglie-alert?centro_id=${centroId}`)
      const data = await res.json()

      setSoglieDefault(data.soglieDefault)

      // Converti array personalizzate in oggetto per facile accesso
      const personalizzateMap = {}
      data.personalizzate?.forEach(s => {
        const key = `${s.tipo_soglia}_${s.categoria || 'default'}`
        personalizzateMap[key] = {
          id: s.id,
          valore: parseFloat(s.valore),
          usa_default: s.usa_default
        }
      })
      setSogliePersonalizzate(personalizzateMap)

    } catch (error) {
      console.error('Errore caricamento soglie:', error)
    }
    setLoading(false)
  }

  function getValoreSoglia(tipo, categoria) {
    const key = `${tipo}_${categoria || 'default'}`
    const personalizzata = sogliePersonalizzate[key]

    if (personalizzata && !personalizzata.usa_default) {
      return personalizzata.valore
    }

    // Ritorna default
    if (tipo === 'costi') {
      return soglieDefault?.maxSuCosti?.[categoria] || soglieDefault?.maxSuCosti?.default || 20
    } else if (tipo === 'fatturato') {
      return soglieDefault?.maxSuFatturato?.[categoria] || soglieDefault?.maxSuFatturato?.default || 25
    } else if (tipo === 'margine') {
      return soglieDefault?.minMargine || 20
    } else if (tipo === 'crescita') {
      return soglieDefault?.maxCrescitaMensile || 20
    }
    return 20
  }

  function isPersonalizzata(tipo, categoria) {
    const key = `${tipo}_${categoria || 'default'}`
    const p = sogliePersonalizzate[key]
    return p && !p.usa_default
  }

  async function handleSaveSoglia(tipo, categoria, valore) {
    setSaving(true)
    try {
      const res = await fetch('/api/soglie-alert', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          centro_id: centroId,
          tipo_soglia: tipo,
          categoria: categoria || null,
          valore: parseFloat(valore),
          usa_default: false
        })
      })

      if (res.ok) {
        // Aggiorna stato locale
        const key = `${tipo}_${categoria || 'default'}`
        setSogliePersonalizzate(prev => ({
          ...prev,
          [key]: { valore: parseFloat(valore), usa_default: false }
        }))
      }
    } catch (error) {
      console.error('Errore salvataggio soglia:', error)
    }
    setSaving(false)
  }

  async function handleResetToDefault(tipo, categoria) {
    setSaving(true)
    try {
      const params = new URLSearchParams({
        centro_id: centroId,
        tipo_soglia: tipo
      })
      if (categoria) params.append('categoria', categoria)

      await fetch(`/api/soglie-alert?${params}`, { method: 'DELETE' })

      // Rimuovi da stato locale
      const key = `${tipo}_${categoria || 'default'}`
      setSogliePersonalizzate(prev => {
        const newState = { ...prev }
        delete newState[key]
        return newState
      })
    } catch (error) {
      console.error('Errore reset soglia:', error)
    }
    setSaving(false)
  }

  if (loading) {
    return (
      <div className="bg-white rounded-xl shadow-lg p-6">
        <div className="text-center py-8">
          <div className="text-2xl mb-2">Loading...</div>
          <div className="text-gray-500">Caricamento soglie...</div>
        </div>
      </div>
    )
  }

  return (
    <div className="bg-white rounded-xl shadow-lg overflow-hidden">
      {/* Header */}
      <div className="bg-gradient-to-r from-indigo-600 to-purple-600 text-white p-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-white/20 rounded-lg flex items-center justify-center">
              <span className="text-xl">%</span>
            </div>
            <div>
              <h2 className="text-lg font-bold">Configura Soglie Alert</h2>
              <p className="text-sm text-indigo-100">Personalizza quando ricevere segnalazioni</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="w-8 h-8 bg-white/20 hover:bg-white/30 rounded-lg flex items-center justify-center"
          >
            <span className="text-xl">x</span>
          </button>
        </div>
      </div>

      {/* Tabs */}
      <div className="border-b border-gray-200">
        <div className="flex">
          <button
            onClick={() => setActiveTab('costi')}
            className={`flex-1 px-4 py-3 text-sm font-semibold transition-colors ${
              activeTab === 'costi'
                ? 'text-indigo-600 border-b-2 border-indigo-600 bg-indigo-50'
                : 'text-gray-600 hover:bg-gray-50'
            }`}
          >
            % su Costi Totali
          </button>
          <button
            onClick={() => setActiveTab('fatturato')}
            className={`flex-1 px-4 py-3 text-sm font-semibold transition-colors ${
              activeTab === 'fatturato'
                ? 'text-indigo-600 border-b-2 border-indigo-600 bg-indigo-50'
                : 'text-gray-600 hover:bg-gray-50'
            }`}
          >
            % su Fatturato
          </button>
          <button
            onClick={() => setActiveTab('generale')}
            className={`flex-1 px-4 py-3 text-sm font-semibold transition-colors ${
              activeTab === 'generale'
                ? 'text-indigo-600 border-b-2 border-indigo-600 bg-indigo-50'
                : 'text-gray-600 hover:bg-gray-50'
            }`}
          >
            Generali
          </button>
        </div>
      </div>

      {/* Content */}
      <div className="p-4 max-h-96 overflow-y-auto">
        {/* Info box */}
        <div className="mb-4 p-3 bg-blue-50 rounded-lg border border-blue-200 text-sm">
          <div className="flex items-start gap-2">
            <span>i</span>
            <div className="text-gray-700">
              {activeTab === 'costi' && (
                <>Soglia massima che una categoria puo rappresentare sui <strong>costi totali</strong>. Se supera questa % viene segnalata.</>
              )}
              {activeTab === 'fatturato' && (
                <>Soglia massima che una categoria puo assorbire del <strong>fatturato</strong>. Se supera questa % viene segnalata.</>
              )}
              {activeTab === 'generale' && (
                <>Soglie generali per margine minimo e crescita mensile massima dei costi.</>
              )}
            </div>
          </div>
        </div>

        {/* Soglie per categoria */}
        {(activeTab === 'costi' || activeTab === 'fatturato') && (
          <div className="space-y-2">
            {CATEGORIE_PRINCIPALI.map(cat => (
              <SogliaRow
                key={cat}
                categoria={cat}
                tipo={activeTab}
                valore={getValoreSoglia(activeTab, cat)}
                valorDefault={
                  activeTab === 'costi'
                    ? (soglieDefault?.maxSuCosti?.[cat] || soglieDefault?.maxSuCosti?.default)
                    : (soglieDefault?.maxSuFatturato?.[cat] || soglieDefault?.maxSuFatturato?.default)
                }
                isPersonalizzata={isPersonalizzata(activeTab, cat)}
                onSave={(val) => handleSaveSoglia(activeTab, cat, val)}
                onReset={() => handleResetToDefault(activeTab, cat)}
                saving={saving}
              />
            ))}

            {/* Soglia default per altre categorie */}
            <div className="mt-4 pt-4 border-t border-gray-200">
              <div className="text-xs text-gray-500 mb-2">Soglia per tutte le altre categorie:</div>
              <SogliaRow
                categoria="Altre categorie"
                tipo={activeTab}
                valore={getValoreSoglia(activeTab, null)}
                valorDefault={
                  activeTab === 'costi'
                    ? soglieDefault?.maxSuCosti?.default
                    : soglieDefault?.maxSuFatturato?.default
                }
                isPersonalizzata={isPersonalizzata(activeTab, null)}
                onSave={(val) => handleSaveSoglia(activeTab, null, val)}
                onReset={() => handleResetToDefault(activeTab, null)}
                saving={saving}
              />
            </div>
          </div>
        )}

        {/* Soglie generali */}
        {activeTab === 'generale' && (
          <div className="space-y-4">
            <div className="p-4 bg-gray-50 rounded-lg">
              <div className="flex items-center justify-between mb-2">
                <div>
                  <div className="font-semibold text-gray-800">Margine Netto Minimo</div>
                  <div className="text-xs text-gray-500">
                    Alert se il margine scende sotto questa soglia
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <input
                    type="number"
                    min="0"
                    max="100"
                    value={getValoreSoglia('margine', null)}
                    onChange={(e) => handleSaveSoglia('margine', null, e.target.value)}
                    className="w-20 px-2 py-1 border rounded text-center font-bold"
                    disabled={saving}
                  />
                  <span className="text-gray-600">%</span>
                  {isPersonalizzata('margine', null) && (
                    <button
                      onClick={() => handleResetToDefault('margine', null)}
                      className="text-xs text-blue-600 hover:underline"
                      disabled={saving}
                    >
                      Reset
                    </button>
                  )}
                </div>
              </div>
              <div className="text-xs text-gray-400">
                Default BeautyX: {soglieDefault?.minMargine}%
              </div>
            </div>

            <div className="p-4 bg-gray-50 rounded-lg">
              <div className="flex items-center justify-between mb-2">
                <div>
                  <div className="font-semibold text-gray-800">Crescita Mensile Massima</div>
                  <div className="text-xs text-gray-500">
                    Alert se i costi di una categoria crescono oltre questa % mese su mese
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <input
                    type="number"
                    min="0"
                    max="500"
                    value={getValoreSoglia('crescita', null)}
                    onChange={(e) => handleSaveSoglia('crescita', null, e.target.value)}
                    className="w-20 px-2 py-1 border rounded text-center font-bold"
                    disabled={saving}
                  />
                  <span className="text-gray-600">%</span>
                  {isPersonalizzata('crescita', null) && (
                    <button
                      onClick={() => handleResetToDefault('crescita', null)}
                      className="text-xs text-blue-600 hover:underline"
                      disabled={saving}
                    >
                      Reset
                    </button>
                  )}
                </div>
              </div>
              <div className="text-xs text-gray-400">
                Default BeautyX: {soglieDefault?.maxCrescitaMensile}%
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Footer */}
      <div className="p-4 border-t bg-gray-50">
        <div className="flex items-center justify-between">
          <div className="text-xs text-gray-500">
            Le modifiche vengono salvate automaticamente
          </div>
          <button
            onClick={() => {
              if (onSave) onSave()
              onClose()
            }}
            className="px-4 py-2 bg-indigo-600 text-white rounded-lg font-semibold hover:bg-indigo-700 transition-colors"
          >
            Chiudi
          </button>
        </div>
      </div>
    </div>
  )
}

/**
 * Componente riga singola soglia
 */
function SogliaRow({ categoria, tipo, valore, valorDefault, isPersonalizzata, onSave, onReset, saving }) {
  const [localValue, setLocalValue] = useState(valore)
  const [editing, setEditing] = useState(false)

  useEffect(() => {
    setLocalValue(valore)
  }, [valore])

  function handleBlur() {
    if (parseFloat(localValue) !== valore) {
      onSave(localValue)
    }
    setEditing(false)
  }

  return (
    <div className={`flex items-center justify-between p-3 rounded-lg transition-colors ${
      isPersonalizzata ? 'bg-indigo-50 border border-indigo-200' : 'bg-gray-50'
    }`}>
      <div className="flex items-center gap-2">
        <span className="font-medium text-gray-800">{categoria}</span>
        {isPersonalizzata && (
          <span className="text-xs px-1.5 py-0.5 bg-indigo-200 text-indigo-700 rounded">
            Personalizzata
          </span>
        )}
      </div>
      <div className="flex items-center gap-2">
        <input
          type="number"
          min="0"
          max="100"
          value={localValue}
          onChange={(e) => setLocalValue(e.target.value)}
          onFocus={() => setEditing(true)}
          onBlur={handleBlur}
          className={`w-16 px-2 py-1 border rounded text-center font-bold text-sm ${
            editing ? 'border-indigo-400 ring-2 ring-indigo-200' : 'border-gray-300'
          }`}
          disabled={saving}
        />
        <span className="text-gray-600 text-sm">%</span>
        {isPersonalizzata && (
          <button
            onClick={onReset}
            className="text-xs text-gray-500 hover:text-blue-600"
            disabled={saving}
            title={`Reset a ${valorDefault}%`}
          >
            Reset
          </button>
        )}
        {!isPersonalizzata && (
          <span className="text-xs text-gray-400 w-12">default</span>
        )}
      </div>
    </div>
  )
}
