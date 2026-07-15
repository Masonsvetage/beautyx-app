'use client'

import { useState, useEffect } from 'react'

export default function CategoriesConfig({ centroId }) {
  const [categories, setCategories] = useState([])
  const [orphanCategories, setOrphanCategories] = useState([])
  const [loading, setLoading] = useState(true)
  const [showAddCategory, setShowAddCategory] = useState(false)
  const [editingId, setEditingId] = useState(null)
  const [mergingCategory, setMergingCategory] = useState(null) // { name: string, isOrphan: boolean }

  useEffect(() => {
    loadCategories()
    loadOrphanCategories()
  }, [centroId])

  async function loadCategories() {
    try {
      const res = await fetch(`/api/categories?centro_id=${centroId}`)
      const data = await res.json()
      setCategories(data.categories || [])
    } catch (error) {
      console.error('Errore caricamento categorie:', error)
    }
    setLoading(false)
  }

  async function loadOrphanCategories() {
    try {
      // Carica tutti i movimenti
      const movRes = await fetch(`/api/bank/movements?centro_id=${centroId}`)
      const movData = await movRes.json()
      const movements = movData.movements || []

      // Estrai tutte le categorie uniche dai movimenti
      const categoriesFromMovements = [...new Set(
        movements
          .map(m => m.categoria)
          .filter(c => c && c !== 'Non Categorizzato')
      )]

      // Carica le categorie personalizzate
      const catRes = await fetch(`/api/categories?centro_id=${centroId}`)
      const catData = await catRes.json()
      const customCategories = catData.categories || []
      const customCategoryNames = customCategories.map(c => c.nome)

      // Trova le categorie orfane (esistono nei movimenti ma non in custom_categories)
      const orphans = categoriesFromMovements.filter(
        catName => !customCategoryNames.includes(catName)
      )

      setOrphanCategories(orphans)
    } catch (error) {
      console.error('Errore caricamento categorie orfane:', error)
    }
  }

  async function handleAddCategory(e) {
    e.preventDefault()
    const formData = new FormData(e.target)

    try {
      const res = await fetch('/api/categories', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          centro_id: centroId,
          nome: formData.get('nome'),
          tipo: formData.get('tipo'),
          colore: formData.get('colore')
        })
      })

      if (res.ok) {
        alert('✅ Categoria aggiunta!')
        loadCategories()
        loadOrphanCategories()
        setShowAddCategory(false)
        e.target.reset()
      }
    } catch (error) {
      console.error('Errore aggiunta categoria:', error)
      alert('❌ Errore durante l\'aggiunta')
    }
  }

  async function handleCreateFromOrphan(orphanName) {
    try {
      const res = await fetch('/api/categories', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          centro_id: centroId,
          nome: orphanName,
          tipo: 'entrambi',
          colore: '#8b5cf6'
        })
      })

      if (res.ok) {
        alert(`✅ Categoria "${orphanName}" aggiunta!`)
        loadCategories()
        loadOrphanCategories()
      }
    } catch (error) {
      console.error('Errore creazione categoria:', error)
      alert('❌ Errore durante la creazione')
    }
  }

  async function handleMergeCategories(sourceCategory, targetCategoryName) {
    try {
      // Prima verifica quanti movimenti ci sono
      const checkRes = await fetch(`/api/bank/movements?centro_id=${centroId}`)
      const checkData = await checkRes.json()
      const movementsWithSource = checkData.movements.filter(m => m.categoria === sourceCategory)

      const confirmMessage = movementsWithSource.length > 0
        ? `Trovati ${movementsWithSource.length} movimenti con categoria "${sourceCategory}".\n\nUnire in "${targetCategoryName}" ed eliminare la categoria "${sourceCategory}"?`
        : `Nessun movimento trovato con categoria "${sourceCategory}".\n\nVuoi comunque eliminare la categoria "${sourceCategory}"?`

      if (!confirm(confirmMessage)) return

      // 1. Aggiorna tutti i movimenti (se ce ne sono)
      if (movementsWithSource.length > 0) {
        const res = await fetch('/api/bank/movements/merge-categories', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            centro_id: centroId,
            source_category: sourceCategory,
            target_category: targetCategoryName
          })
        })

        if (!res.ok) {
          const data = await res.json()
          throw new Error(data.error || 'Errore durante l\'unione')
        }
      }

      // 2. Elimina la categoria sorgente (se esiste in custom_categories e non è default)
      const categoryToDelete = categories.find(c => c.nome === sourceCategory)
      if (categoryToDelete && !categoryToDelete.is_default) {
        const delRes = await fetch(`/api/categories?id=${categoryToDelete.id}`, { method: 'DELETE' })
        if (!delRes.ok) {
          throw new Error('Errore durante l\'eliminazione della categoria')
        }
      }

      const message = movementsWithSource.length > 0
        ? `✅ ${movementsWithSource.length} movimenti aggiornati e categoria "${sourceCategory}" eliminata!`
        : `✅ Categoria "${sourceCategory}" eliminata!`

      alert(message)
      setMergingCategory(null)
      loadCategories()
      loadOrphanCategories()
    } catch (error) {
      console.error('Errore unione categorie:', error)
      alert(`❌ ${error.message}`)
    }
  }

  async function handleUpdateCategory(id) {
    const cat = categories.find(c => c.id === id)
    if (!cat) return

    try {
      const res = await fetch('/api/categories', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          id,
          nome: cat.nome,
          tipo: cat.tipo,
          colore: cat.colore
        })
      })

      if (res.ok) {
        alert('✅ Categoria aggiornata!')
        setEditingId(null)
        loadCategories()
      }
    } catch (error) {
      console.error('Errore aggiornamento:', error)
      alert('❌ Errore durante l\'aggiornamento')
    }
  }

  async function handleDeleteCategory(id) {
    if (!confirm('Eliminare questa categoria? I movimenti già categorizzati manterranno la categoria attuale.')) return

    try {
      const res = await fetch(`/api/categories?id=${id}`, { method: 'DELETE' })
      if (res.ok) {
        loadCategories()
      } else {
        const data = await res.json()
        alert(`❌ ${data.error}`)
      }
    } catch (error) {
      console.error('Errore eliminazione:', error)
      alert('❌ Errore durante l\'eliminazione')
    }
  }

  function updateCategory(id, field, value) {
    setCategories(categories.map(c =>
      c.id === id ? { ...c, [field]: value } : c
    ))
  }

  if (loading) return <div className="text-center py-8">Caricamento...</div>

  return (
    <div className="bg-white rounded-xl shadow-lg border border-gray-100 p-6">
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-3">
          <div className="w-12 h-12 bg-gradient-to-br from-blue-500 to-cyan-500 rounded-xl flex items-center justify-center shadow-lg">
            <span className="text-2xl">📂</span>
          </div>
          <div>
            <h3 className="font-bold text-gray-800 text-lg">Gestione Categorie</h3>
            <p className="text-sm text-gray-600">Personalizza le categorie per organizzare i tuoi movimenti</p>
          </div>
        </div>
        <button
          onClick={() => setShowAddCategory(!showAddCategory)}
          className="bg-gradient-to-r from-blue-600 to-cyan-600 text-white px-4 py-2 rounded-xl font-semibold hover:from-blue-700 hover:to-cyan-700 transition-all shadow-lg"
        >
          + Aggiungi Categoria
        </button>
      </div>

      {showAddCategory && (
        <div className="mb-4 p-4 bg-blue-50 rounded-lg border border-blue-200">
          <form onSubmit={handleAddCategory} className="space-y-3">
            <div className="grid grid-cols-3 gap-3">
              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-1">Nome Categoria</label>
                <input
                  type="text"
                  name="nome"
                  required
                  placeholder="es: Consulenze, Software"
                  className="w-full px-3 py-2 border-2 border-blue-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>
              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-1">Tipo</label>
                <select
                  name="tipo"
                  required
                  className="w-full px-3 py-2 border-2 border-blue-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                >
                  <option value="uscita">Solo Uscite</option>
                  <option value="entrata">Solo Entrate</option>
                  <option value="entrambi">Entrate e Uscite</option>
                </select>
              </div>
              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-1">Colore</label>
                <input
                  type="color"
                  name="colore"
                  defaultValue="#10B981"
                  className="w-full h-10 px-1 py-1 border-2 border-blue-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>
            </div>
            <button
              type="submit"
              className="w-full bg-gradient-to-r from-blue-600 to-cyan-600 text-white px-4 py-2 rounded-lg font-semibold hover:from-blue-700 hover:to-cyan-700 transition-all"
            >
              Salva Categoria
            </button>
          </form>
        </div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        {/* Colonna sinistra: Categorie Personalizzate */}
        <div>
          <h4 className="font-semibold text-sm text-gray-700 mb-2 flex items-center gap-2">
            <span>📁</span> Categorie Gestite ({categories.length})
          </h4>
          <div className="space-y-2 max-h-[600px] overflow-y-auto pr-2">
            {categories.length === 0 ? (
              <p className="text-center text-gray-500 py-4">Nessuna categoria configurata</p>
            ) : (
              categories.map((cat) => (
                <div key={cat.id} className="p-4 bg-blue-50 rounded-lg border border-blue-200">
                  {editingId === cat.id ? (
                <div className="space-y-3">
                  <div className="grid grid-cols-3 gap-3">
                    <div>
                      <label className="block text-xs font-semibold text-gray-600 mb-1">Nome</label>
                      <input
                        type="text"
                        value={cat.nome}
                        onChange={(e) => updateCategory(cat.id, 'nome', e.target.value)}
                        disabled={cat.is_default}
                        className="w-full px-3 py-2 border-2 border-blue-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 disabled:bg-gray-100"
                      />
                    </div>
                    <div>
                      <label className="block text-xs font-semibold text-gray-600 mb-1">Tipo</label>
                      <select
                        value={cat.tipo}
                        onChange={(e) => updateCategory(cat.id, 'tipo', e.target.value)}
                        className="w-full px-3 py-2 border-2 border-blue-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                      >
                        <option value="uscita">Solo Uscite</option>
                        <option value="entrata">Solo Entrate</option>
                        <option value="entrambi">Entrate e Uscite</option>
                      </select>
                    </div>
                    <div>
                      <label className="block text-xs font-semibold text-gray-600 mb-1">Colore</label>
                      <input
                        type="color"
                        value={cat.colore}
                        onChange={(e) => updateCategory(cat.id, 'colore', e.target.value)}
                        className="w-full h-10 px-1 py-1 border-2 border-blue-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                      />
                    </div>
                  </div>
                  <div className="flex gap-2">
                    <button
                      onClick={() => handleUpdateCategory(cat.id)}
                      className="flex-1 bg-gradient-to-r from-blue-600 to-cyan-600 text-white px-4 py-2 rounded-lg font-semibold hover:from-blue-700 hover:to-cyan-700 transition-all"
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
                  <div className="flex items-center gap-3 flex-1">
                    <div
                      className="w-8 h-8 rounded-lg shadow-md"
                      style={{ backgroundColor: cat.colore }}
                    />
                    <div>
                      <div className="flex items-center gap-2">
                        <span className="font-bold text-gray-800">{cat.nome}</span>
                        {cat.is_default && (
                          <span className="px-2 py-0.5 bg-gray-200 text-gray-600 text-xs font-bold rounded-full">
                            SISTEMA
                          </span>
                        )}
                      </div>
                      <div className="text-sm text-gray-600 mt-0.5">
                        Tipo: {cat.tipo === 'entrata' ? 'Solo Entrate' : cat.tipo === 'uscita' ? 'Solo Uscite' : 'Entrate e Uscite'}
                      </div>
                    </div>
                  </div>
                  <div className="flex gap-2">
                    <button
                      onClick={() => setEditingId(cat.id)}
                      className="px-3 py-1 bg-blue-100 text-blue-700 rounded-lg text-sm font-semibold hover:bg-blue-200 transition-all"
                    >
                      ✏️ Modifica
                    </button>
                    {!cat.is_default && (
                      <>
                        <button
                          onClick={() => setMergingCategory({ name: cat.nome, isOrphan: false })}
                          className="px-3 py-1 bg-purple-100 text-purple-700 rounded-lg text-sm font-semibold hover:bg-purple-200 transition-all"
                        >
                          🔀 Unisci
                        </button>
                        <button
                          onClick={() => handleDeleteCategory(cat.id)}
                          className="px-3 py-1 bg-red-100 text-red-700 rounded-lg text-sm font-semibold hover:bg-red-200 transition-all"
                        >
                          🗑️
                        </button>
                      </>
                    )}
                  </div>
                </div>
              )}
            </div>
          ))
        )}
          </div>
        </div>

        {/* Colonna destra: Categorie Orfane */}
        <div>
          <h4 className="font-semibold text-sm text-gray-700 mb-2 flex items-center gap-2">
            <span>⚠️</span> Categorie in uso ma non gestite ({orphanCategories.length})
          </h4>
          {orphanCategories.length === 0 ? (
            <div className="p-4 bg-green-50 rounded-lg border border-green-200 text-center">
              <span className="text-2xl">✅</span>
              <p className="text-sm text-gray-600 mt-2">Tutte le categorie sono gestite correttamente!</p>
            </div>
          ) : (
            <div className="space-y-2 max-h-[600px] overflow-y-auto pr-2">
              <div className="bg-orange-50 rounded-lg border border-orange-200 p-3 mb-2">
                <p className="text-xs text-gray-600">
                  Queste categorie sono presenti nei tuoi movimenti ma non sono ancora state create come categorie personalizzate
                </p>
              </div>
              {orphanCategories.map((orphanName, idx) => (
                <div key={idx} className="p-3 bg-white rounded-lg border border-orange-300">
                  <div className="flex items-center gap-3 mb-2">
                    <div className="w-8 h-8 rounded-lg bg-gray-300 flex items-center justify-center shrink-0">
                      <span className="text-xs">❓</span>
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="font-bold text-gray-800 truncate" title={orphanName}>{orphanName}</div>
                      <div className="text-xs text-gray-600">Categoria importata</div>
                    </div>
                  </div>
                  <div className="flex gap-2">
                    <button
                      onClick={() => handleCreateFromOrphan(orphanName)}
                      className="flex-1 px-3 py-2 bg-gradient-to-r from-orange-600 to-amber-600 text-white rounded-lg text-xs font-semibold hover:from-orange-700 hover:to-amber-700 transition-all"
                    >
                      ➕ Crea
                    </button>
                    <button
                      onClick={() => setMergingCategory({ name: orphanName, isOrphan: true })}
                      className="flex-1 px-3 py-2 bg-blue-600 text-white rounded-lg text-xs font-semibold hover:bg-blue-700 transition-all"
                    >
                      🔀 Unisci
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Modal Unione Categorie */}
      {mergingCategory && (
        <div className="fixed inset-0 bg-black bg-opacity-50 z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-xl shadow-2xl w-full max-w-2xl max-h-[80vh] overflow-auto">
            <div className="flex items-center justify-between p-4 border-b border-gray-200 sticky top-0 bg-white">
              <h3 className="text-lg font-bold text-gray-800">
                🔀 Unisci "{mergingCategory.name}" a...
              </h3>
              <button
                onClick={() => setMergingCategory(null)}
                className="text-gray-500 hover:text-gray-700 text-2xl font-bold leading-none"
              >
                ×
              </button>
            </div>

            <div className="p-4">
              <p className="text-sm text-gray-600 mb-4">
                Seleziona la categoria di destinazione. Tutti i movimenti categorizzati come "{mergingCategory.name}" verranno aggiornati con la categoria selezionata.
              </p>

              <div className="space-y-2">
                {/* Categorie esistenti */}
                {categories
                  .filter(cat => cat.nome !== mergingCategory.name)
                  .map((cat) => (
                    <button
                      key={cat.id}
                      onClick={() => handleMergeCategories(mergingCategory.name, cat.nome)}
                      className="w-full p-3 bg-blue-50 rounded-lg border-2 border-blue-200 hover:border-blue-500 hover:bg-blue-100 transition-all text-left"
                    >
                      <div className="flex items-center gap-3">
                        <div
                          className="w-8 h-8 rounded-lg shadow-md"
                          style={{ backgroundColor: cat.colore }}
                        />
                        <div>
                          <div className="flex items-center gap-2">
                            <span className="font-bold text-gray-800">{cat.nome}</span>
                            {cat.is_default && (
                              <span className="px-2 py-0.5 bg-gray-200 text-gray-600 text-xs font-bold rounded-full">
                                SISTEMA
                              </span>
                            )}
                          </div>
                          <div className="text-xs text-gray-600">
                            {cat.tipo === 'entrata' ? 'Solo Entrate' : cat.tipo === 'uscita' ? 'Solo Uscite' : 'Entrate e Uscite'}
                          </div>
                        </div>
                      </div>
                    </button>
                  ))}

                {/* Categorie orfane (esclusa quella corrente se è orfana) */}
                {orphanCategories
                  .filter(orphan => orphan !== mergingCategory.name)
                  .map((orphan, idx) => (
                    <button
                      key={`orphan-${idx}`}
                      onClick={() => handleMergeCategories(mergingCategory.name, orphan)}
                      className="w-full p-3 bg-orange-50 rounded-lg border-2 border-orange-200 hover:border-orange-500 hover:bg-orange-100 transition-all text-left"
                    >
                      <div className="flex items-center gap-3">
                        <div className="w-8 h-8 rounded-lg bg-gray-300 flex items-center justify-center">
                          <span className="text-xs">❓</span>
                        </div>
                        <div>
                          <div className="font-bold text-gray-800">{orphan}</div>
                          <div className="text-xs text-gray-600">Categoria non gestita</div>
                        </div>
                      </div>
                    </button>
                  ))}
              </div>
            </div>
          </div>
        </div>
      )}

      <div className="mt-4 p-4 bg-blue-50 rounded-lg border border-blue-200">
        <div className="flex items-start gap-2">
          <span className="text-lg">💡</span>
          <div className="text-sm text-gray-700">
            <strong className="text-blue-700">Note:</strong>
            <ul className="list-disc list-inside mt-1 space-y-1">
              <li>Le categorie di <strong>SISTEMA</strong> non possono essere eliminate ma puoi modificarne il tipo e il colore</li>
              <li>Le categorie <strong>in uso ma non gestite</strong> provengono dai movimenti importati - clicca "Crea Categoria" per gestirle</li>
              <li>Usa <strong>🔀 Unisci</strong> per far confluire una categoria in un'altra (es: unire "TRIBUTI CORRENTI" in "TASSE")</li>
              <li>Aggiungi categorie personalizzate per adattare il sistema alle tue esigenze</li>
              <li>Il colore viene usato nei grafici per distinguere visivamente le categorie</li>
            </ul>
          </div>
        </div>
      </div>
    </div>
  )
}
