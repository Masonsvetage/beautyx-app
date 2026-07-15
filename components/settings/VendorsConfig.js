'use client'

import { useState, useEffect } from 'react'

export default function VendorsConfig({ centroId, onSave }) {
  const [vendors, setVendors] = useState([])
  const [categories, setCategories] = useState([])
  const [loading, setLoading] = useState(true)
  const [showAddVendor, setShowAddVendor] = useState(false)
  const [editingId, setEditingId] = useState(null)
  const [applying, setApplying] = useState(false)

  useEffect(() => {
    loadVendors()
    loadCategories()
  }, [centroId])

  async function loadVendors() {
    try {
      const res = await fetch(`/api/vendors?centro_id=${centroId}`)
      const data = await res.json()
      setVendors(data.vendors || [])
    } catch (error) {
      console.error('Errore caricamento fornitori:', error)
    }
    setLoading(false)
  }

  async function loadCategories() {
    try {
      const res = await fetch(`/api/categories?centro_id=${centroId}`)
      const data = await res.json()
      setCategories(data.categories || [])
    } catch (error) {
      console.error('Errore caricamento categorie:', error)
    }
  }

  async function handleAddVendor(e) {
    e.preventDefault()
    const formData = new FormData(e.target)

    try {
      const res = await fetch('/api/vendors', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          centro_id: centroId,
          nome: formData.get('nome'),
          pattern_match: formData.get('pattern_match'),
          categoria: formData.get('categoria'),
          note: formData.get('note') || null
        })
      })

      if (res.ok) {
        alert('✅ Regola aggiunta!')
        loadVendors()
        setShowAddVendor(false)
        e.target.reset()
      }
    } catch (error) {
      console.error('Errore aggiunta regola:', error)
      alert('❌ Errore durante l\'aggiunta')
    }
  }

  async function handleUpdateVendor(id) {
    const vendor = vendors.find(v => v.id === id)
    if (!vendor) return

    try {
      const res = await fetch('/api/vendors', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          id,
          nome: vendor.nome,
          pattern_match: vendor.pattern_match,
          categoria: vendor.categoria,
          note: vendor.note
        })
      })

      if (res.ok) {
        alert('✅ Regola aggiornata!')
        setEditingId(null)
        loadVendors()
      }
    } catch (error) {
      console.error('Errore aggiornamento:', error)
      alert('❌ Errore durante l\'aggiornamento')
    }
  }

  async function handleDeleteVendor(id) {
    if (!confirm('Eliminare questa regola?')) return

    try {
      await fetch(`/api/vendors?id=${id}`, { method: 'DELETE' })
      loadVendors()
    } catch (error) {
      console.error('Errore eliminazione:', error)
    }
  }

  function updateVendor(id, field, value) {
    setVendors(vendors.map(v =>
      v.id === id ? { ...v, [field]: value } : v
    ))
  }

  async function handleApplyVendors() {
    if (!confirm('Applicare le regole di categorizzazione a tutti i movimenti? Questa operazione ricategorizzerà automaticamente i movimenti che corrispondono ai pattern configurati.')) {
      return
    }

    setApplying(true)
    try {
      const res = await fetch('/api/vendors/apply', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ centro_id: centroId })
      })

      const data = await res.json()

      if (res.ok) {
        alert(`✅ ${data.message}`)
        if (onSave) onSave()
      } else {
        alert(`❌ Errore: ${data.error}`)
      }
    } catch (error) {
      console.error('Errore applicazione fornitori:', error)
      alert('❌ Errore durante l\'applicazione')
    }
    setApplying(false)
  }

  if (loading) return <div className="text-center py-8">Caricamento...</div>

  return (
    <div className="bg-white rounded-xl shadow-lg border border-gray-100 p-6">
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-3">
          <div className="w-12 h-12 bg-gradient-to-br from-green-500 to-teal-500 rounded-xl flex items-center justify-center shadow-lg">
            <span className="text-2xl">🏷️</span>
          </div>
          <div>
            <h3 className="font-bold text-gray-800 text-lg">Regole di Categorizzazione</h3>
            <p className="text-sm text-gray-600">Configura pattern per categorizzare automaticamente i movimenti bancari</p>
          </div>
        </div>
        <div className="flex gap-2">
          {vendors.length > 0 && (
            <button
              onClick={handleApplyVendors}
              disabled={applying}
              className="bg-gradient-to-r from-purple-600 to-indigo-600 text-white px-4 py-2 rounded-xl font-semibold hover:from-purple-700 hover:to-indigo-700 transition-all shadow-lg disabled:opacity-50"
            >
              🔄 {applying ? 'Applicando...' : 'Applica Regole'}
            </button>
          )}
          <button
            onClick={() => setShowAddVendor(!showAddVendor)}
            className="bg-gradient-to-r from-green-600 to-teal-600 text-white px-4 py-2 rounded-xl font-semibold hover:from-green-700 hover:to-teal-700 transition-all shadow-lg"
          >
            + Aggiungi Regola
          </button>
        </div>
      </div>

      {showAddVendor && (
        <div className="mb-4 p-4 bg-green-50 rounded-lg border border-green-200">
          <form onSubmit={handleAddVendor} className="space-y-3">
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-1">Nome</label>
                <input
                  type="text"
                  name="nome"
                  required
                  placeholder="es: Amazon, Enel, Rossi Mario"
                  className="w-full px-3 py-2 border-2 border-green-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-green-500"
                />
              </div>
              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-1">Pattern di Riconoscimento</label>
                <input
                  type="text"
                  name="pattern_match"
                  required
                  placeholder="es: AMAZON, ENEL, ROSSI"
                  className="w-full px-3 py-2 border-2 border-green-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-green-500"
                />
              </div>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-1">Categoria</label>
                <select
                  name="categoria"
                  required
                  className="w-full px-3 py-2 border-2 border-green-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-green-500"
                >
                  {categories.map(cat => (
                    <option key={cat.id} value={cat.nome}>{cat.nome}</option>
                  ))}
                </select>
              </div>
              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-1">Note (opzionale)</label>
                <input
                  type="text"
                  name="note"
                  placeholder="Note aggiuntive..."
                  className="w-full px-3 py-2 border-2 border-green-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-green-500"
                />
              </div>
            </div>
            <button
              type="submit"
              className="w-full bg-gradient-to-r from-green-600 to-teal-600 text-white px-4 py-2 rounded-lg font-semibold hover:from-green-700 hover:to-teal-700 transition-all"
            >
              Salva Regola
            </button>
          </form>
        </div>
      )}

      <div className="space-y-2">
        {vendors.length === 0 ? (
          <p className="text-center text-gray-500 py-4">Nessuna regola configurata</p>
        ) : (
          vendors.map((vendor) => (
            <div key={vendor.id} className="p-4 bg-green-50 rounded-lg border border-green-200">
              {editingId === vendor.id ? (
                <div className="space-y-3">
                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className="block text-xs font-semibold text-gray-600 mb-1">Nome</label>
                      <input
                        type="text"
                        value={vendor.nome}
                        onChange={(e) => updateVendor(vendor.id, 'nome', e.target.value)}
                        className="w-full px-3 py-2 border-2 border-green-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-green-500"
                      />
                    </div>
                    <div>
                      <label className="block text-xs font-semibold text-gray-600 mb-1">Pattern</label>
                      <input
                        type="text"
                        value={vendor.pattern_match}
                        onChange={(e) => updateVendor(vendor.id, 'pattern_match', e.target.value)}
                        className="w-full px-3 py-2 border-2 border-green-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-green-500"
                      />
                    </div>
                  </div>
                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className="block text-xs font-semibold text-gray-600 mb-1">Categoria</label>
                      <select
                        value={vendor.categoria}
                        onChange={(e) => updateVendor(vendor.id, 'categoria', e.target.value)}
                        className="w-full px-3 py-2 border-2 border-green-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-green-500"
                      >
                        {categories.map(cat => (
                          <option key={cat.id} value={cat.nome}>{cat.nome}</option>
                        ))}
                      </select>
                    </div>
                    <div>
                      <label className="block text-xs font-semibold text-gray-600 mb-1">Note</label>
                      <input
                        type="text"
                        value={vendor.note || ''}
                        onChange={(e) => updateVendor(vendor.id, 'note', e.target.value)}
                        className="w-full px-3 py-2 border-2 border-green-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-green-500"
                      />
                    </div>
                  </div>
                  <div className="flex gap-2">
                    <button
                      onClick={() => handleUpdateVendor(vendor.id)}
                      className="flex-1 bg-gradient-to-r from-green-600 to-teal-600 text-white px-4 py-2 rounded-lg font-semibold hover:from-green-700 hover:to-teal-700 transition-all"
                    >
                      ✓ Salva
                    </button>
                    <button
                      onClick={() => setEditingId(null)}
                      className="px-4 py-2 bg-gray-300 text-gray-700 rounded-lg font-semibold hover:bg-gray-400 transition-all"
                    >
                      ✕ Annulla
                    </button>
                  </div>
                </div>
              ) : (
                <div className="flex items-center justify-between">
                  <div className="flex-1">
                    <div className="flex items-center gap-2">
                      <span className="font-bold text-gray-800">{vendor.nome}</span>
                      <span className="px-2 py-1 bg-green-200 text-green-800 text-xs font-bold rounded-full">
                        {vendor.categoria}
                      </span>
                    </div>
                    <div className="text-sm text-gray-600 mt-1">
                      Pattern: <code className="bg-gray-100 px-2 py-0.5 rounded">{vendor.pattern_match}</code>
                      {vendor.note && <span className="ml-2">• {vendor.note}</span>}
                    </div>
                  </div>
                  <div className="flex gap-2">
                    <button
                      onClick={() => setEditingId(vendor.id)}
                      className="px-3 py-1 bg-blue-100 text-blue-700 rounded-lg text-sm font-semibold hover:bg-blue-200 transition-all"
                    >
                      ✏️ Modifica
                    </button>
                    <button
                      onClick={() => handleDeleteVendor(vendor.id)}
                      className="px-3 py-1 bg-red-100 text-red-700 rounded-lg text-sm font-semibold hover:bg-red-200 transition-all"
                    >
                      🗑️
                    </button>
                  </div>
                </div>
              )}
            </div>
          ))
        )}
      </div>

      <div className="mt-4 p-4 bg-blue-50 rounded-lg border border-blue-200">
        <div className="flex items-start gap-2">
          <span className="text-lg">💡</span>
          <div className="text-sm text-gray-700">
            <strong className="text-blue-700">Come funziona:</strong> Il pattern viene cercato nella descrizione del movimento (case-insensitive).
            Se trovato, il movimento viene automaticamente categorizzato con la categoria scelta.
            <div className="mt-2">
              <strong>Esempi:</strong>
              <ul className="list-disc list-inside mt-1 space-y-1">
                <li>Pattern "AMAZON" → riconoscerà "AMAZON IT", "Amazon.it", "Pagamento Amazon"</li>
                <li>Pattern "ENEL" → riconoscerà "ENEL ENERGIA", "Bolletta Enel"</li>
                <li>Pattern "ROSSI" → riconoscerà "ROSSI MARIO", "Stipendio Rossi"</li>
              </ul>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
