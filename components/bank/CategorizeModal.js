'use client'

import { useState } from 'react'

export default function CategorizeModal({ vendors, categories, centroId, onComplete, onClose }) {
  const [currentIndex, setCurrentIndex] = useState(0)
  const [selectedCategory, setSelectedCategory] = useState('')
  const [saving, setSaving] = useState(false)

  const currentVendor = vendors[currentIndex]

  // Raggruppa categorie per tipo
  const entrateCategories = categories.filter(c => c.tipo === 'entrata')
  const usciteCategories = categories.filter(c => c.tipo === 'uscita')
  const altreCategories = categories.filter(c => c.tipo === 'entrambi')

  async function handleSave() {
    if (!selectedCategory) {
      alert('⚠️ Seleziona una categoria')
      return
    }

    setSaving(true)

    try {
      const category = categories.find(c => c.nome === selectedCategory)

      if (!category) {
        alert('⚠️ Categoria non trovata')
        return
      }

      // Determina se è categoria predefinita o custom
      const isPredefined = !category.is_custom
      const payload = {
        centro_id: centroId,
        vendor_key: currentVendor.vendor_key,
        vendor_display: currentVendor.vendor_display,
        category_id: isPredefined ? category.id : null,
        categoria_custom: isPredefined ? null : category.nome
      }

      console.log('[CATEGORIZE] Saving vendor mapping:', {
        selected_category: selectedCategory,
        is_predefined: isPredefined,
        payload
      })

      const response = await fetch('/api/bank/vendors', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      })

      if (response.ok) {
        // Passa al prossimo vendor
        if (currentIndex < vendors.length - 1) {
          setCurrentIndex(currentIndex + 1)
          setSelectedCategory('')
        } else {
          // Finito!
          alert('✅ Categorizzazione completata!')
          onComplete()
        }
      } else {
        const errorData = await response.json()
        console.error('Errore API:', errorData)
        alert(`❌ Errore durante il salvataggio: ${errorData.details || errorData.error || 'Unknown error'}`)
      }
    } catch (error) {
      console.error('Errore salvataggio:', error)
      alert(`❌ Errore durante il salvataggio: ${error.message}`)
    } finally {
      setSaving(false)
    }
  }

  function handleSkip() {
    if (currentIndex < vendors.length - 1) {
      setCurrentIndex(currentIndex + 1)
      setSelectedCategory('')
    } else {
      onComplete()
    }
  }

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-lg shadow-xl max-w-2xl w-full max-h-[90vh] overflow-y-auto">
        {/* Header */}
        <div className="p-6 border-b sticky top-0 bg-white">
          <div className="flex items-center justify-between mb-2">
            <h2 className="text-2xl font-bold">🏷️ Categorizza Fornitori</h2>
            <button
              onClick={onClose}
              className="text-gray-400 hover:text-gray-600 text-2xl leading-none"
            >
              ×
            </button>
          </div>
          <div className="text-sm text-gray-600">
            Fornitore {currentIndex + 1} di {vendors.length}
          </div>
          <div className="mt-2 w-full bg-gray-200 rounded-full h-2">
            <div
              className="bg-blue-600 h-2 rounded-full transition-all"
              style={{ width: `${((currentIndex + 1) / vendors.length) * 100}%` }}
            />
          </div>
        </div>

        {/* Contenuto */}
        <div className="p-6">
          {/* Info Vendor */}
          <div className="bg-gray-50 rounded-lg p-4 mb-6">
            <div className="text-sm text-gray-600 mb-1">Fornitore/Descrizione:</div>
            <div className="text-lg font-semibold mb-3">{currentVendor.vendor_display}</div>

            <div className="text-sm text-gray-600 mb-1">
              Trovato in {currentVendor.count} {currentVendor.count === 1 ? 'movimento' : 'movimenti'}
            </div>

            {currentVendor.examples && currentVendor.examples.length > 0 && (
              <div className="mt-3">
                <div className="text-xs text-gray-500 mb-1">Esempi di descrizioni:</div>
                <div className="space-y-1">
                  {currentVendor.examples.map((ex, i) => (
                    <div key={i} className="text-xs text-gray-700 bg-white p-2 rounded">
                      {ex}
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>

          {/* Selezione Categoria */}
          <div className="mb-6">
            <label className="block text-sm font-medium text-gray-700 mb-3">
              Seleziona la categoria più appropriata:
            </label>

            <div className="space-y-4">
              {/* Entrate */}
              {entrateCategories.length > 0 && (
                <div>
                  <div className="text-xs font-semibold text-green-700 mb-2">💰 ENTRATE</div>
                  <div className="grid grid-cols-2 gap-2">
                    {entrateCategories.map(cat => (
                      <button
                        key={cat.id}
                        onClick={() => setSelectedCategory(cat.nome)}
                        className={`
                          p-3 rounded-lg border-2 text-left transition
                          ${selectedCategory === cat.nome
                            ? 'border-green-500 bg-green-50'
                            : 'border-gray-200 hover:border-green-300'
                          }
                        `}
                      >
                        <div className="flex items-center gap-2">
                          <span className="text-2xl">{cat.icona}</span>
                          <div>
                            <div className="font-medium text-sm">{cat.nome}</div>
                            <div className="text-xs text-gray-500">{cat.descrizione}</div>
                          </div>
                        </div>
                      </button>
                    ))}
                  </div>
                </div>
              )}

              {/* Uscite */}
              {usciteCategories.length > 0 && (
                <div>
                  <div className="text-xs font-semibold text-red-700 mb-2">📤 USCITE</div>
                  <div className="grid grid-cols-2 gap-2">
                    {usciteCategories.map(cat => (
                      <button
                        key={cat.id}
                        onClick={() => setSelectedCategory(cat.nome)}
                        className={`
                          p-3 rounded-lg border-2 text-left transition
                          ${selectedCategory === cat.nome
                            ? 'border-red-500 bg-red-50'
                            : 'border-gray-200 hover:border-red-300'
                          }
                        `}
                      >
                        <div className="flex items-center gap-2">
                          <span className="text-2xl">{cat.icona}</span>
                          <div>
                            <div className="font-medium text-sm">{cat.nome}</div>
                            <div className="text-xs text-gray-500">{cat.descrizione}</div>
                          </div>
                        </div>
                      </button>
                    ))}
                  </div>
                </div>
              )}

              {/* Altre */}
              {altreCategories.length > 0 && (
                <div>
                  <div className="text-xs font-semibold text-gray-700 mb-2">🔄 ALTRO</div>
                  <div className="grid grid-cols-2 gap-2">
                    {altreCategories.map(cat => (
                      <button
                        key={cat.id}
                        onClick={() => setSelectedCategory(cat.nome)}
                        className={`
                          p-3 rounded-lg border-2 text-left transition
                          ${selectedCategory === cat.nome
                            ? 'border-gray-500 bg-gray-50'
                            : 'border-gray-200 hover:border-gray-300'
                          }
                        `}
                      >
                        <div className="flex items-center gap-2">
                          <span className="text-2xl">{cat.icona}</span>
                          <div>
                            <div className="font-medium text-sm">{cat.nome}</div>
                            <div className="text-xs text-gray-500">{cat.descrizione}</div>
                          </div>
                        </div>
                      </button>
                    ))}
                  </div>
                </div>
              )}
            </div>
          </div>

          {/* Azioni */}
          <div className="flex gap-3">
            <button
              onClick={handleSkip}
              className="flex-1 px-4 py-3 border-2 border-gray-300 rounded-lg font-medium hover:bg-gray-50 transition"
            >
              ⏭️ Salta
            </button>
            <button
              onClick={handleSave}
              disabled={!selectedCategory || saving}
              className={`
                flex-1 px-4 py-3 rounded-lg font-medium transition
                ${selectedCategory && !saving
                  ? 'bg-blue-600 text-white hover:bg-blue-700'
                  : 'bg-gray-300 text-gray-500 cursor-not-allowed'
                }
              `}
            >
              {saving ? '⏳ Salvataggio...' : '✅ Salva e Continua'}
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}
