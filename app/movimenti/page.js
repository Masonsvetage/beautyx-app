'use client'

import { useState, useEffect, useMemo } from 'react'
import UploadCSV from '@/components/bank/UploadCSV'
import MovementsTable from '@/components/bank/MovementsTable'
import GroupedView from '@/components/bank/GroupedView'
import CategoryDetailView from '@/components/bank/CategoryDetailView'
import CategorizeModal from '@/components/bank/CategorizeModal'
import CategoryCharts from '@/components/analytics/CategoryCharts'
import CategoriesConfig from '@/components/settings/CategoriesConfig'
import VendorsConfig from '@/components/settings/VendorsConfig'
import { groupByCategory } from '@/lib/analytics'
import { useAuth } from '@/contexts/AuthContext'
import HelpTooltip from '@/components/common/HelpTooltip'

export default function MovimentiPage() {
  const { currentCentro, profile } = useAuth()
  const [movements, setMovements] = useState([])
  const [categories, setCategories] = useState([])
  const [loading, setLoading] = useState(true)
  const [showCategorizeModal, setShowCategorizeModal] = useState(false)
  const [uncategorizedVendors, setUncategorizedVendors] = useState([])
  const [viewMode, setViewMode] = useState('grouped') // 'grouped', 'detailed', or 'category'
  const [showCharts, setShowCharts] = useState(true)
  const [showCategoriesModal, setShowCategoriesModal] = useState(false)
  const [showVendorsModal, setShowVendorsModal] = useState(false)

  const centroId = currentCentro?.centro_id || profile?.centro_id

  useEffect(() => {
    if (centroId) loadData()
  }, [centroId])

  async function loadData() {
    setLoading(true)
    try {
      // Carica movimenti
      const movRes = await fetch(`/api/bank/movements?centro_id=${centroId}`)
      const movData = await movRes.json()
      setMovements(movData.movements || [])

      // Carica categorie
      const catRes = await fetch(`/api/bank/categories?centro_id=${centroId}`)
      const catData = await catRes.json()
      setCategories(catData.categories || [])
    } catch (error) {
      console.error('Errore caricamento dati:', error)
    }
    setLoading(false)
  }

  async function handleFileUpload(result) {
    // Salva AUTOMATICAMENTE i movimenti nel database
    try {
      const response = await fetch('/api/bank/movements', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ movements: result.movements })
      })

      const data = await response.json()

      if (data.success) {
        const message = data.message || `✅ ${data.inserted} movimenti importati e salvati con successo!`
        alert(message)
        // Ricarica i dati dal database
        loadData()
      } else {
        throw new Error(data.error || 'Errore salvataggio')
      }
    } catch (error) {
      console.error('Errore salvataggio movimenti:', error)
      alert(`❌ Errore durante il salvataggio: ${error.message}`)
      // In caso di errore, mostra comunque i movimenti per review manuale
      setMovements(result.movements)
    }

    // Se ci sono fornitori non categorizzati, mostra il modal
    if (result.uncategorized_vendors && result.uncategorized_vendors.length > 0) {
      setUncategorizedVendors(result.uncategorized_vendors)
      setShowCategorizeModal(true)
    }
  }

  async function handleSaveMovements() {
    try {
      const response = await fetch('/api/bank/movements', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ movements })
      })

      const data = await response.json()

      if (data.success) {
        alert(`✅ ${data.inserted} movimenti salvati con successo!`)
        loadData() // Ricarica i dati
      }
    } catch (error) {
      console.error('Errore salvataggio movimenti:', error)
      alert('❌ Errore durante il salvataggio')
    }
  }

  async function handleCategorizeComplete() {
    setShowCategorizeModal(false)
    loadData() // Ricarica per applicare le nuove categorie
  }

  async function handleCategoryChange(movementId, newCategory) {
    try {
      const response = await fetch('/api/bank/movements', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id: movementId, categoria: newCategory })
      })

      if (response.ok) {
        // Aggiorna localmente
        setMovements(prev =>
          prev.map(m => m.id === movementId ? { ...m, categoria: newCategory } : m)
        )
      }
    } catch (error) {
      console.error('Errore aggiornamento categoria:', error)
    }
  }

  // Calcola dati per grafici
  const chartData = useMemo(() => {
    if (movements.length === 0) return null
    return groupByCategory(movements)
  }, [movements])

  if (!centroId) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-800 via-slate-900 to-slate-800 flex items-center justify-center">
        <div className="text-center max-w-md mx-auto p-8">
          <div className="text-5xl mb-4">💰</div>
          <h2 className="text-xl font-bold text-white mb-2">Nessun centro selezionato</h2>
          <p className="text-slate-400">Seleziona un centro dalla navbar per visualizzare i movimenti.</p>
        </div>
      </div>
    )
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-center">
          <div className="text-2xl mb-2">⏳</div>
          <div>Caricamento...</div>
        </div>
      </div>
    )
  }

  return (
    <div className="relative min-h-screen bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900">
      {/* Filigrana AI Background - Design Unico Sfumato */}
      <div className="fixed inset-0 pointer-events-none opacity-30 z-0">
        <svg width="100%" height="100%" xmlns="http://www.w3.org/2000/svg" className="absolute inset-0" preserveAspectRatio="none">
          <defs>
            <filter id="blur-mov">
              <feGaussianBlur in="SourceGraphic" stdDeviation="4" />
            </filter>
            <linearGradient id="grad-mov1" x1="0%" y1="0%" x2="100%" y2="100%">
              <stop offset="0%" style={{stopColor:'#14b8a6', stopOpacity:0.3}} />
              <stop offset="100%" style={{stopColor:'#06b6d4', stopOpacity:0.1}} />
            </linearGradient>
            <linearGradient id="grad-mov2" x1="100%" y1="0%" x2="0%" y2="100%">
              <stop offset="0%" style={{stopColor:'#06b6d4', stopOpacity:0.3}} />
              <stop offset="100%" style={{stopColor:'#14b8a6', stopOpacity:0.1}} />
            </linearGradient>
          </defs>

          {/* Onde fluide */}
          <path d="M 0,300 Q 500,150 1000,300 T 2000,300 L 2000,500 L 0,500 Z"
                fill="url(#grad-mov1)" filter="url(#blur-mov)" opacity="0.4"/>

          <path d="M 0,700 Q 600,550 1200,700 T 2400,700 L 2400,900 L 0,900 Z"
                fill="url(#grad-mov2)" filter="url(#blur-mov)" opacity="0.3"/>

          {/* Curve sfumate */}
          <path d="M 0,400 Q 450,250 900,400 T 1800,400"
                stroke="#14b8a6" strokeWidth="2" fill="none"
                filter="url(#blur-mov)" opacity="0.5"/>

          <path d="M 300,50 Q 700,200 1100,50 T 1900,50"
                stroke="#06b6d4" strokeWidth="2" fill="none"
                filter="url(#blur-mov)" opacity="0.4"/>

          {/* Cerchi */}
          <circle cx="20%" cy="30%" r="220" fill="url(#grad-mov1)" filter="url(#blur-mov)" opacity="0.2"/>
          <circle cx="80%" cy="65%" r="280" fill="url(#grad-mov2)" filter="url(#blur-mov)" opacity="0.2"/>
        </svg>
      </div>

      <div className="relative z-10 container mx-auto px-3 sm:px-4 py-4 sm:py-8 max-w-7xl">
        <div className="mb-4 sm:mb-8">
          <div className="flex items-center gap-3 mb-1 sm:mb-2">
            <h1 className="text-2xl sm:text-4xl font-bold bg-gradient-to-r from-teal-400 to-cyan-400 bg-clip-text text-transparent">
              💰 Movimenti Bancari
            </h1>
            <HelpTooltip
              title="Movimenti Bancari"
              content="Carica qui l'estratto conto del tuo centro in formato CSV (esportabile dalla tua banca o da Koibox). BeautyX legge entrate e uscite, le categorizza automaticamente e costruisce la base dati per le analisi di redditività. Non è necessario collegare il conto in tempo reale: basta esportare il CSV dalla tua banca e caricarlo."
            />
          </div>
          <p className="text-slate-400 text-sm sm:text-base">Gestisci e categorizza le transazioni del tuo centro</p>
        </div>

        {/* Upload CSV */}
        <div className="mb-6 shadow-2xl shadow-black/50 rounded-xl">
          <UploadCSV
            centroId={centroId}
            onUploadComplete={handleFileUpload}
          />
        </div>

        {/* Barra Azioni */}
        {movements.length > 0 && (
          <div className="mb-4 sm:mb-6 bg-slate-800/50 backdrop-blur-xl rounded-xl border border-slate-600/40 p-3 sm:p-4" style={{
            boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.7), 0 10px 25px -5px rgba(0, 0, 0, 0.5), 0 0 0 1px rgba(148, 163, 184, 0.1)'
          }}>
            <div className="flex flex-col sm:flex-row sm:items-center gap-3 sm:gap-4 justify-between">
              {/* Toggle Vista */}
              <div className="flex gap-1 sm:gap-2 bg-slate-700/50 p-1 rounded-lg overflow-x-auto">
                <button
                  onClick={() => setViewMode('grouped')}
                  className={`px-2 sm:px-5 py-1.5 sm:py-2.5 rounded-lg font-semibold transition-all duration-200 text-xs sm:text-base whitespace-nowrap ${
                    viewMode === 'grouped'
                      ? 'bg-gradient-to-r from-teal-600 to-cyan-600 text-white shadow-lg'
                      : 'text-slate-300 hover:bg-slate-700'
                  }`}
                >
                  <span className="flex items-center gap-1 sm:gap-2">
                    <span>👥</span>
                    <span className="hidden sm:inline">Raggruppata</span>
                  </span>
                </button>
                <button
                  onClick={() => setViewMode('category')}
                  className={`px-2 sm:px-5 py-1.5 sm:py-2.5 rounded-lg font-semibold transition-all duration-200 text-xs sm:text-base whitespace-nowrap ${
                    viewMode === 'category'
                      ? 'bg-gradient-to-r from-teal-600 to-cyan-600 text-white shadow-lg'
                      : 'text-slate-300 hover:bg-slate-700'
                  }`}
                >
                  <span className="flex items-center gap-1 sm:gap-2">
                    <span>📂</span>
                    <span className="hidden sm:inline">Per Categoria</span>
                  </span>
                </button>
                <button
                  onClick={() => setViewMode('detailed')}
                  className={`px-2 sm:px-5 py-1.5 sm:py-2.5 rounded-lg font-semibold transition-all duration-200 text-xs sm:text-base whitespace-nowrap ${
                    viewMode === 'detailed'
                      ? 'bg-gradient-to-r from-teal-600 to-cyan-600 text-white shadow-lg'
                      : 'text-slate-300 hover:bg-slate-700'
                  }`}
                >
                  <span className="flex items-center gap-1 sm:gap-2">
                    <span>📋</span>
                    <span className="hidden sm:inline">Dettagliata</span>
                  </span>
                </button>
              </div>

              <div className="flex items-center gap-2 justify-end">
                {/* Pulsanti Gestione con Tooltip */}
                <div className="relative group">
                  <button
                    onClick={() => setShowCategoriesModal(true)}
                    className="bg-gradient-to-r from-cyan-600 to-blue-600 text-white w-8 h-8 sm:w-10 sm:h-10 rounded-lg sm:rounded-xl font-bold hover:from-cyan-700 hover:to-blue-700 transition-all shadow-lg hover:shadow-xl flex items-center justify-center text-base sm:text-xl"
                  >
                    📁
                  </button>
                  <div className="absolute bottom-full left-1/2 transform -translate-x-1/2 mb-2 px-3 py-2 bg-slate-900 text-white text-xs rounded-lg whitespace-nowrap opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none z-50 hidden sm:block">
                    Gestione categorie
                    <div className="absolute top-full left-1/2 transform -translate-x-1/2 -mt-1 border-4 border-transparent border-t-slate-900"></div>
                  </div>
                </div>

                <div className="relative group">
                  <button
                    onClick={() => setShowVendorsModal(true)}
                    className="bg-gradient-to-r from-teal-600 to-cyan-600 text-white w-8 h-8 sm:w-10 sm:h-10 rounded-lg sm:rounded-xl font-bold hover:from-teal-700 hover:to-cyan-700 transition-all shadow-lg hover:shadow-xl flex items-center justify-center text-base sm:text-xl"
                  >
                    🔄
                  </button>
                  <div className="absolute bottom-full left-1/2 transform -translate-x-1/2 mb-2 px-3 py-2 bg-slate-900 text-white text-xs rounded-lg whitespace-nowrap opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none z-50 hidden sm:block">
                    Impostazione criteri di raggruppamento
                    <div className="absolute top-full left-1/2 transform -translate-x-1/2 -mt-1 border-4 border-transparent border-t-slate-900"></div>
                  </div>
                </div>

                {/* Pulsante Salva (visibile solo se ci sono movimenti non salvati) */}
                {movements.some(m => !m.id) && (
                  <button
                    onClick={handleSaveMovements}
                    className="bg-gradient-to-r from-green-600 to-emerald-600 text-white px-3 sm:px-6 py-1.5 sm:py-2.5 rounded-lg sm:rounded-xl font-bold hover:from-green-700 hover:to-emerald-700 transition-all shadow-lg hover:shadow-xl flex items-center gap-1 sm:gap-2 text-xs sm:text-base"
                  >
                    <span>💾</span>
                    <span className="hidden sm:inline">Salva {movements.filter(m => !m.id).length} Movimenti</span>
                    <span className="sm:hidden">{movements.filter(m => !m.id).length}</span>
                  </button>
                )}
              </div>
            </div>
          </div>
        )}

        {/* Vista Movimenti */}
        {viewMode === 'grouped' ? (
          <GroupedView
            movements={movements}
            categories={categories}
            onCategoryChange={handleCategoryChange}
          />
        ) : viewMode === 'category' ? (
          <CategoryDetailView
            movements={movements}
            categories={categories}
            onCategoryChange={handleCategoryChange}
          />
        ) : (
          <MovementsTable
            movements={movements}
            categories={categories}
            onCategoryChange={handleCategoryChange}
          />
        )}

        {/* Grafici per Categoria */}
        {movements.length > 0 && chartData && (
          <div className="mt-4 sm:mt-6">
            <div className="mb-3 sm:mb-4 flex flex-col sm:flex-row sm:items-center justify-between gap-2">
              <h2 className="text-xl sm:text-2xl font-bold text-slate-100">📊 Analisi per Categoria</h2>
              <button
                onClick={() => setShowCharts(!showCharts)}
                className="px-3 sm:px-4 py-1.5 sm:py-2 bg-slate-700/50 border border-slate-600/40 text-slate-200 rounded-lg hover:bg-slate-700 transition-all text-xs sm:text-sm font-semibold"
              >
                {showCharts ? '🔼 Nascondi' : '🔽 Mostra'}
              </button>
            </div>

            {showCharts && <CategoryCharts data={chartData} tipo="both" />}
          </div>
        )}

        {/* Modal Categorizzazione */}
        {showCategorizeModal && (
          <CategorizeModal
            vendors={uncategorizedVendors}
            categories={categories}
            centroId={centroId}
            onComplete={handleCategorizeComplete}
            onClose={() => setShowCategorizeModal(false)}
          />
        )}

        {/* Modal Gestione Categorie */}
        {showCategoriesModal && (
          <div className="fixed inset-0 bg-black bg-opacity-70 z-50 flex items-center justify-center p-4">
            <div className="bg-slate-800 backdrop-blur-xl rounded-xl shadow-2xl shadow-black/50 w-full max-w-4xl max-h-[90vh] overflow-auto border border-slate-600/40">
              <div className="sticky top-0 bg-slate-900 border-b border-slate-600/40 p-4 flex items-center justify-between">
                <h2 className="text-2xl font-bold text-slate-100">📁 Gestione Categorie</h2>
                <button
                  onClick={() => {
                    setShowCategoriesModal(false)
                    loadData() // Ricarica dati dopo chiusura
                  }}
                  className="text-slate-400 hover:text-slate-200 text-2xl"
                >
                  ✕
                </button>
              </div>
              <div className="p-6">
                <CategoriesConfig centroId={centroId} />
              </div>
            </div>
          </div>
        )}

        {/* Modal Auto-Categorizzazione */}
        {showVendorsModal && (
          <div className="fixed inset-0 bg-black bg-opacity-70 z-50 flex items-center justify-center p-4">
            <div className="bg-slate-800 backdrop-blur-xl rounded-xl shadow-2xl shadow-black/50 w-full max-w-6xl max-h-[90vh] overflow-auto border border-slate-600/40">
              <div className="sticky top-0 bg-slate-900 border-b border-slate-600/40 p-4 flex items-center justify-between">
                <h2 className="text-2xl font-bold text-slate-100">🔄 Auto-Categorizzazione</h2>
                <button
                  onClick={() => {
                    setShowVendorsModal(false)
                    loadData() // Ricarica dati dopo chiusura
                  }}
                  className="text-slate-400 hover:text-slate-200 text-2xl"
                >
                  ✕
                </button>
              </div>
              <div className="p-6">
                <VendorsConfig centroId={centroId} onSave={loadData} />
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
