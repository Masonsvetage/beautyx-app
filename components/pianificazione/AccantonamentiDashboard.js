'use client'

import { useState, useEffect } from 'react'
import AccantonamentoCard from './AccantonamentoCard'
import AccantonamentoDetailModal from './AccantonamentoDetailModal'
import LiquidityPanel from './LiquidityPanel'

export default function AccantonamentiDashboard({ centroId }) {
  const [accantonamenti, setAccantonamenti] = useState([])
  const [liquidity, setLiquidity] = useState(null)
  const [loading, setLoading] = useState(true)
  const [showDetailModal, setShowDetailModal] = useState(null)
  const [showAddForm, setShowAddForm] = useState(false)
  const [newAccantonamento, setNewAccantonamento] = useState({
    nome: '',
    descrizione: '',
    importo_obiettivo: '',
    contributo_mensile: '',
    tipo_versamento: 'manuale',
    percentuale_incasso: '',
    icona: '💰',
    colore: '#8b5cf6'
  })

  useEffect(() => {
    if (centroId) loadData()
  }, [centroId])

  async function loadData() {
    if (!centroId) return
    setLoading(true)
    try {
      // Carica accantonamenti
      const accRes = await fetch(`/api/accantonamenti?centro_id=${centroId}&attivo=true`)
      const accData = await accRes.json()
      setAccantonamenti(accData.accantonamenti || [])

      // Carica liquidità
      const liqRes = await fetch(`/api/accantonamenti/liquidity?centro_id=${centroId}`)
      const liqData = await liqRes.json()
      setLiquidity(liqData)
    } catch (error) {
      console.error('Errore caricamento accantonamenti:', error)
    }
    setLoading(false)
  }

  async function handleCreate(e) {
    e.preventDefault()
    try {
      const res = await fetch('/api/accantonamenti', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          centro_id: centroId,
          ...newAccantonamento,
          importo_obiettivo: parseFloat(newAccantonamento.importo_obiettivo || 0),
          contributo_mensile: parseFloat(newAccantonamento.contributo_mensile || 0),
          tipo_versamento: newAccantonamento.tipo_versamento,
          percentuale_incasso: parseFloat(newAccantonamento.percentuale_incasso || 0)
        })
      })

      if (res.ok) {
        setNewAccantonamento({
          nome: '',
          descrizione: '',
          importo_obiettivo: '',
          contributo_mensile: '',
          tipo_versamento: 'manuale',
          percentuale_incasso: '',
          icona: '💰',
          colore: '#8b5cf6'
        })
        setShowAddForm(false)
        loadData()
      }
    } catch (error) {
      console.error('Errore creazione accantonamento:', error)
    }
  }

  const iconOptions = ['💰', '🏦', '🏛️', '💼', '📊', '🎯', '💵', '🔒', '⚖️', '📈']
  const colorOptions = [
    '#8b5cf6', '#3b82f6', '#10b981', '#f59e0b', '#ef4444',
    '#ec4899', '#14b8a6', '#6366f1', '#f97316', '#a855f7'
  ]

  if (loading) {
    return (
      <div className="text-center py-12">
        <div className="text-4xl mb-4">⏳</div>
        <div className="text-lg font-semibold text-gray-600">Caricamento accantonamenti...</div>
      </div>
    )
  }

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-xl font-bold text-gray-800">Accantonamenti e Riserve</h2>
          <p className="text-sm text-gray-500">Gestisci portafogli virtuali per progetti e riserve</p>
        </div>

        <button
          onClick={() => setShowAddForm(!showAddForm)}
          className="bg-gradient-to-r from-purple-600 to-indigo-600 text-white px-4 py-2 rounded-lg font-semibold hover:from-purple-700 hover:to-indigo-700 shadow-lg"
        >
          {showAddForm ? '✕ Annulla' : '+ Nuovo Accantonamento'}
        </button>
      </div>

      {/* Liquidity Panel */}
      {liquidity && <LiquidityPanel liquidity={liquidity} />}

      {/* Form Nuovo Accantonamento */}
      {showAddForm && (
        <div className="bg-white border border-purple-200 rounded-xl p-4">
          <form onSubmit={handleCreate} className="space-y-3">
            <div className="grid grid-cols-2 gap-3">
              <input
                type="text"
                placeholder="Nome accantonamento"
                value={newAccantonamento.nome}
                onChange={(e) => setNewAccantonamento({ ...newAccantonamento, nome: e.target.value })}
                className="px-3 py-2 border border-gray-300 rounded-lg"
                required
              />

              <input
                type="number"
                step="0.01"
                placeholder="Importo obiettivo (€)"
                value={newAccantonamento.importo_obiettivo}
                onChange={(e) => setNewAccantonamento({ ...newAccantonamento, importo_obiettivo: e.target.value })}
                className="px-3 py-2 border border-gray-300 rounded-lg"
              />
            </div>

            <textarea
              placeholder="Descrizione (opzionale)"
              value={newAccantonamento.descrizione}
              onChange={(e) => setNewAccantonamento({ ...newAccantonamento, descrizione: e.target.value })}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg"
              rows="2"
            />

            {/* Tipo Versamento */}
            <div>
              <label className="text-sm font-semibold text-gray-700 mb-2 block">
                Tipo di Versamento
              </label>
              <select
                value={newAccantonamento.tipo_versamento}
                onChange={(e) => setNewAccantonamento({
                  ...newAccantonamento,
                  tipo_versamento: e.target.value
                })}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg"
              >
                <option value="manuale">✍️ Manuale - Versi quando vuoi</option>
                <option value="percentuale_incasso">📊 Percentuale su incasso - Automatico</option>
                <option value="fisso_mensile">📅 Contributo fisso mensile</option>
              </select>
            </div>

            {/* Campi condizionali in base al tipo */}
            <div className="grid grid-cols-2 gap-3">
              {newAccantonamento.tipo_versamento === 'percentuale_incasso' && (
                <div className="col-span-2">
                  <label className="text-sm font-semibold text-gray-700 mb-2 block">
                    Percentuale (es: 22 per IVA 22%)
                  </label>
                  <input
                    type="number"
                    step="0.01"
                    min="0"
                    max="100"
                    placeholder="22"
                    value={newAccantonamento.percentuale_incasso}
                    onChange={(e) => setNewAccantonamento({
                      ...newAccantonamento,
                      percentuale_incasso: e.target.value
                    })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg"
                    required
                  />
                  <p className="text-xs text-gray-500 mt-1">
                    💡 Il sistema calcolerà automaticamente l'allocazione dagli incassi
                  </p>
                </div>
              )}

              {newAccantonamento.tipo_versamento === 'fisso_mensile' && (
                <div className="col-span-2">
                  <label className="text-sm font-semibold text-gray-700 mb-2 block">
                    Importo Mensile (€)
                  </label>
                  <input
                    type="number"
                    step="0.01"
                    min="0"
                    placeholder="100"
                    value={newAccantonamento.contributo_mensile}
                    onChange={(e) => setNewAccantonamento({
                      ...newAccantonamento,
                      contributo_mensile: e.target.value
                    })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg"
                    required
                  />
                  <p className="text-xs text-gray-500 mt-1">
                    💡 Importo fisso da versare ogni mese
                  </p>
                </div>
              )}
            </div>

            {/* Opzioni Avanzate (icona e colore collassabili) */}
            <details className="mt-3">
              <summary className="cursor-pointer text-sm text-gray-600 hover:text-gray-800 font-semibold">
                ⚙️ Opzioni Avanzate (Icona e Colore)
              </summary>
              <div className="grid grid-cols-2 gap-3 mt-3">
                <div>
                  <label className="text-xs text-gray-500 font-semibold mb-1 block">Icona</label>
                  <select
                    value={newAccantonamento.icona}
                    onChange={(e) => setNewAccantonamento({ ...newAccantonamento, icona: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg"
                  >
                    {iconOptions.map(icon => (
                      <option key={icon} value={icon}>{icon}</option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="text-xs text-gray-500 font-semibold mb-1 block">Colore</label>
                  <select
                    value={newAccantonamento.colore}
                    onChange={(e) => setNewAccantonamento({ ...newAccantonamento, colore: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg"
                  >
                    {colorOptions.map(color => (
                      <option key={color} value={color} style={{ backgroundColor: color, color: '#fff' }}>
                        {color}
                      </option>
                    ))}
                  </select>
                </div>
              </div>
            </details>

            <div className="flex justify-end">
              <button
                type="submit"
                className="bg-green-600 text-white px-6 py-2 rounded-lg font-semibold hover:bg-green-700"
              >
                Crea Accantonamento
              </button>
            </div>
          </form>
        </div>
      )}

      {/* Grid Accantonamenti */}
      {accantonamenti.length === 0 ? (
        <div className="bg-white rounded-xl border border-gray-200 p-12 text-center">
          <div className="text-6xl mb-4">🏦</div>
          <h3 className="text-xl font-bold text-gray-700 mb-2">Nessun accantonamento attivo</h3>
          <p className="text-gray-500">Crea il primo portafoglio virtuale per gestire le riserve</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {accantonamenti.map(acc => (
            <AccantonamentoCard
              key={acc.id}
              accantonamento={acc}
              onClick={() => setShowDetailModal(acc)}
            />
          ))}
        </div>
      )}

      {/* Detail Modal */}
      {showDetailModal && (
        <AccantonamentoDetailModal
          accantonamento={showDetailModal}
          onClose={() => setShowDetailModal(null)}
          onSave={loadData}
        />
      )}
    </div>
  )
}
