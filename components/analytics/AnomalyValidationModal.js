'use client'

import { useState, useEffect } from 'react'
import { formatEuro } from '@/lib/formatters'

// Helper per ottenere label leggibili per i tipi di anomalia
function getTipoLabel(tipo) {
  const labels = {
    'incidenza_alta': 'Incidenza troppo alta sui costi',
    'impatto_fatturato': 'Impatto eccessivo sul fatturato',
    'margine_basso': 'Margine netto insufficiente',
    'trend_negativo': 'Costi in crescita anomala',
    'concentrazione_anomala': 'Concentrazione anomala movimenti',
    'outlier': 'Importo anomalo',
    'crescita_anomala': 'Crescita anomala categoria'
  }
  return labels[tipo] || tipo
}

export default function AnomalyValidationModal({ anomaly, centroId, onValidate, onClose }) {
  const [note, setNote] = useState('')
  const [validating, setValidating] = useState(false)
  const [editingMovement, setEditingMovement] = useState(null)
  const [categories, setCategories] = useState([])
  const [hasModifications, setHasModifications] = useState(false)
  const [updatedCategories, setUpdatedCategories] = useState({})

  // Carica categorie
  useEffect(() => {
    if (centroId) {
      loadCategories()
    }
  }, [centroId])

  async function loadCategories() {
    try {
      const res = await fetch(`/api/categories?centro_id=${centroId}`)
      const data = await res.json()
      setCategories(data.categories || [])
    } catch (error) {
      console.error('Errore caricamento categorie:', error)
    }
  }

  if (!anomaly) return null

  // Helper per ottenere la categoria corrente (aggiornata o originale)
  const getMovementCategory = (movement) => {
    return updatedCategories[movement.id] || movement.categoria
  }

  async function handleEditMovement(movement, newCategoria) {
    try {
      console.log('Updating movement:', { id: movement.id, categoria: newCategoria })

      const res = await fetch('/api/bank/movements', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          id: movement.id,
          categoria: newCategoria
        })
      })

      const data = await res.json()
      console.log('Server response:', data)

      if (res.ok) {
        // Salva la categoria aggiornata nello state locale
        setUpdatedCategories(prev => ({
          ...prev,
          [movement.id]: newCategoria
        }))

        // Marca che ci sono state modifiche
        setHasModifications(true)

        // Chiudi l'editor
        setEditingMovement(null)

        // Mostra feedback visivo
        console.log(`✅ Categoria aggiornata: ${newCategoria}`)
      } else {
        alert(`Errore: ${data.error || 'Errore durante la modifica del movimento'}`)
      }
    } catch (error) {
      console.error('Errore modifica movimento:', error)
      alert(`Errore: ${error.message}`)
    }
  }

  function handleClose() {
    // Se ci sono state modifiche, aggiorna i dati del parent
    if (hasModifications && onValidate) {
      onValidate(null, null)
    }
    onClose()
  }

  // Debug log per verificare i dati
  console.log('Anomaly data:', {
    tipo: anomaly.tipo,
    categoria: anomaly.categoria,
    hasMovimenti: !!anomaly.movimenti,
    movimentiLength: anomaly.movimenti?.length || 0,
    movimenti: anomaly.movimenti
  })

  async function handleValidate(stato) {
    setValidating(true)
    try {
      // Determina l'importo in base al tipo di anomalia
      let importoAnomalia = anomaly.importo
      if (anomaly.movimento) {
        importoAnomalia = parseFloat(anomaly.movimento.importo)
      } else if (anomaly.valoreAttuale !== undefined) {
        importoAnomalia = anomaly.valoreAttuale
      }

      const payload = {
        centro_id: centroId,
        movimento_id: anomaly.movimento?.id || (anomaly.movimenti?.[0]?.id) || null,
        tipo_anomalia: anomaly.tipo,
        categoria: anomaly.categoria || anomaly.movimento?.categoria,
        importo: importoAnomalia,
        data_rilevamento: new Date().toISOString().split('T')[0],
        stato,
        note_utente: note || null
      }

      const res = await fetch('/api/anomalies', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      })

      if (res.ok) {
        // Chiudi il modal e aggiorna i dati
        if (onValidate) {
          onValidate(anomaly, stato)
        }
        onClose()
      } else {
        alert('Errore durante il salvataggio')
      }
    } catch (error) {
      console.error('Errore validazione:', error)
      alert('Errore durante il salvataggio')
    }
    setValidating(false)
  }

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-xl shadow-2xl max-w-2xl w-full max-h-[90vh] flex flex-col">
        {/* Header */}
        <div className={`text-white p-6 ${
          anomaly.gravita === 'alta' ? 'bg-gradient-to-r from-red-600 to-rose-600' :
          anomaly.gravita === 'media' ? 'bg-gradient-to-r from-amber-500 to-orange-500' :
          'bg-gradient-to-r from-blue-500 to-cyan-500'
        }`}>
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="w-12 h-12 bg-white/20 backdrop-blur-sm rounded-xl flex items-center justify-center shadow-lg">
                <span className="text-2xl">{anomaly.titolo?.split(' ')[0] || '🚨'}</span>
              </div>
              <div>
                <h2 className="text-xl font-bold">{anomaly.titolo || 'Dettaglio Anomalia'}</h2>
                <p className="text-sm opacity-90 mt-1">
                  {getTipoLabel(anomaly.tipo)}
                </p>
              </div>
            </div>
            <button
              onClick={handleClose}
              className="w-10 h-10 bg-white/20 hover:bg-white/30 rounded-lg flex items-center justify-center transition-all"
            >
              <span className="text-2xl">✕</span>
            </button>
          </div>
        </div>

        {/* Content */}
        <div className="p-6 overflow-y-auto flex-1">
          {/* Dettagli Anomalia */}
          <div className={`mb-6 p-4 rounded-lg border-2 ${
            anomaly.gravita === 'alta' ? 'bg-red-50 border-red-200' :
            anomaly.gravita === 'media' ? 'bg-amber-50 border-amber-200' :
            'bg-blue-50 border-blue-200'
          }`}>
            <div className="space-y-3">
              {/* Descrizione principale */}
              <div>
                <div className="text-sm font-semibold text-gray-600">Descrizione:</div>
                <div className="text-gray-800 mt-1">{anomaly.motivo || anomaly.descrizione}</div>
              </div>

              {/* Suggerimento */}
              {anomaly.suggerimento && (
                <div className="p-3 bg-white rounded border border-gray-200">
                  <div className="flex items-start gap-2">
                    <span className="text-lg">💡</span>
                    <div>
                      <div className="text-xs font-semibold text-gray-600 mb-1">Suggerimento:</div>
                      <div className="text-sm text-gray-700">{anomaly.suggerimento}</div>
                    </div>
                  </div>
                </div>
              )}

              {/* Statistiche per alert con soglie */}
              {(anomaly.percentuale !== undefined && anomaly.soglia !== undefined) && (
                <div className="grid grid-cols-2 gap-3 border-t border-gray-200 pt-3">
                  <div className="p-3 bg-white rounded border border-gray-200">
                    <div className="text-xs text-gray-600">Valore attuale</div>
                    <div className={`text-lg font-bold ${anomaly.gravita === 'alta' ? 'text-red-600' : 'text-amber-600'}`}>
                      {anomaly.percentuale.toFixed(1)}%
                    </div>
                    {anomaly.importo > 0 && (
                      <div className="text-xs text-gray-500 mt-1">
                        {formatEuro(anomaly.importo)}
                      </div>
                    )}
                  </div>
                  <div className="p-3 bg-white rounded border border-gray-200">
                    <div className="text-xs text-gray-600">Soglia consigliata</div>
                    <div className="text-lg font-bold text-gray-800">
                      {anomaly.soglia}%
                    </div>
                    {anomaly.eccedenza > 0 && (
                      <div className="text-xs text-red-600 mt-1">
                        +{anomaly.eccedenza.toFixed(1)} punti oltre
                      </div>
                    )}
                  </div>
                </div>
              )}

              {/* Per trend_negativo: mostra confronto periodi */}
              {anomaly.tipo === 'trend_negativo' && anomaly.valoreAttuale !== undefined && (
                <div className="grid grid-cols-2 gap-3 border-t border-gray-200 pt-3">
                  <div className="p-3 bg-white rounded border border-gray-200">
                    <div className="text-xs text-gray-600">{anomaly.periodoConfronto || 'Mese precedente'}</div>
                    <div className="text-lg font-bold text-gray-800">
                      {formatEuro(anomaly.valoreAtteso || anomaly.importoTotaleMesePrecedente)}
                    </div>
                  </div>
                  <div className={`p-3 rounded border ${anomaly.gravita === 'alta' ? 'bg-red-50 border-red-200' : 'bg-amber-50 border-amber-200'}`}>
                    <div className="text-xs text-gray-600">{anomaly.periodoAttuale || 'Mese attuale'}</div>
                    <div className={`text-lg font-bold ${anomaly.gravita === 'alta' ? 'text-red-600' : 'text-amber-600'}`}>
                      {formatEuro(anomaly.valoreAttuale || anomaly.importoTotaleMeseAttuale)}
                    </div>
                    <div className="text-xs text-red-600 mt-1">
                      +{anomaly.percentuale?.toFixed(1)}%
                    </div>
                  </div>
                </div>
              )}

              {/* Per margine_basso: mostra entrate/uscite */}
              {anomaly.tipo === 'margine_basso' && (
                <div className="grid grid-cols-3 gap-3 border-t border-gray-200 pt-3">
                  <div className="p-3 bg-green-50 rounded border border-green-200">
                    <div className="text-xs text-gray-600">Entrate</div>
                    <div className="text-lg font-bold text-green-600">
                      {formatEuro(anomaly.totaleEntrate)}
                    </div>
                  </div>
                  <div className="p-3 bg-red-50 rounded border border-red-200">
                    <div className="text-xs text-gray-600">Costi</div>
                    <div className="text-lg font-bold text-red-600">
                      {formatEuro(anomaly.totaleCosti)}
                    </div>
                  </div>
                  <div className={`p-3 rounded border ${anomaly.importo >= 0 ? 'bg-green-50 border-green-200' : 'bg-red-50 border-red-200'}`}>
                    <div className="text-xs text-gray-600">Margine</div>
                    <div className={`text-lg font-bold ${anomaly.importo >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                      {formatEuro(anomaly.importo)}
                    </div>
                  </div>
                </div>
              )}

              {/* Per concentrazione_anomala: mostra statistiche */}
              {anomaly.tipo === 'concentrazione_anomala' && (
                <div className="grid grid-cols-2 gap-3 border-t border-gray-200 pt-3">
                  <div className="p-3 bg-white rounded border border-gray-200">
                    <div className="text-xs text-gray-600">Media categoria</div>
                    <div className="text-lg font-bold text-gray-800">
                      {formatEuro(anomaly.mediaCategoria)}
                    </div>
                    <div className="text-xs text-gray-500 mt-1">
                      su {anomaly.numeroMovimentiCategoria} movimenti
                    </div>
                  </div>
                  <div className="p-3 bg-amber-50 rounded border border-amber-200">
                    <div className="text-xs text-gray-600">Movimenti anomali</div>
                    <div className="text-lg font-bold text-amber-600">
                      {anomaly.numeroMovimenti}
                    </div>
                    <div className="text-xs text-amber-600 mt-1">
                      {anomaly.percentuale?.toFixed(0)}% del totale
                    </div>
                  </div>
                </div>
              )}

              {/* Lista movimenti - mostrata per tutti i tipi che hanno movimenti */}
              {anomaly.movimenti && anomaly.movimenti.length > 0 && (
                <div className="border-t border-gray-200 pt-3 mt-3">
                  <div className="text-sm font-semibold text-gray-600 mb-2">
                    Movimenti coinvolti ({anomaly.movimenti.length}) - Clicca per modificare categoria:
                  </div>
                  <div className="max-h-64 overflow-y-auto space-y-1">
                    {anomaly.movimenti.slice(0, 15).map((mov, idx) => (
                      <div key={mov.id || idx}>
                        {editingMovement?.id === mov.id ? (
                          <div className="p-2 bg-blue-50 rounded border-2 border-blue-300">
                            <select
                              value={getMovementCategory(mov)}
                              onChange={(e) => handleEditMovement(mov, e.target.value)}
                              className="w-full px-2 py-1 text-xs border border-blue-300 rounded focus:outline-none focus:ring-2 focus:ring-blue-500"
                              size="5"
                            >
                              {categories.map(cat => (
                                <option key={cat.id} value={cat.nome}>{cat.nome}</option>
                              ))}
                            </select>
                            <button
                              onClick={() => setEditingMovement(null)}
                              className="mt-1 px-2 py-1 text-xs bg-gray-200 hover:bg-gray-300 rounded"
                            >
                              ✕ Annulla
                            </button>
                          </div>
                        ) : (
                          <button
                            onClick={() => setEditingMovement(mov)}
                            className="w-full flex justify-between items-center p-2 bg-white rounded border border-gray-200 text-xs hover:border-blue-300 hover:bg-blue-50 transition-colors text-left"
                          >
                            <div className="flex-1 min-w-0">
                              <div className="font-medium text-gray-800 truncate">{mov.descrizione}</div>
                              <div className="text-gray-500">
                                {new Date(mov.data).toLocaleDateString('it-IT')} • {getMovementCategory(mov)}
                              </div>
                            </div>
                            <div className={`font-bold ml-2 whitespace-nowrap ${mov.tipo === 'uscita' ? 'text-red-600' : 'text-green-600'}`}>
                              {mov.tipo === 'uscita' ? '-' : '+'}{formatEuro(Math.abs(parseFloat(mov.importo)))}
                            </div>
                          </button>
                        )}
                      </div>
                    ))}
                  </div>
                  {anomaly.movimenti.length > 15 && (
                    <div className="mt-2 text-center text-xs text-gray-500">
                      + altri {anomaly.movimenti.length - 15} movimenti
                    </div>
                  )}
                </div>
              )}

              {/* Per confronto: altri movimenti della categoria */}
              {anomaly.altriMovimenti && anomaly.altriMovimenti.length > 0 && (
                <div className="border-t border-gray-200 pt-3 mt-3">
                  <div className="text-sm font-semibold text-gray-600 mb-2">
                    Altri movimenti della categoria per confronto:
                  </div>
                  <div className="max-h-40 overflow-y-auto space-y-1">
                    {anomaly.altriMovimenti.slice(0, 5).map((mov, idx) => (
                      <div key={mov.id || idx}>
                        {editingMovement?.id === mov.id ? (
                          <div className="p-2 bg-blue-50 rounded border-2 border-blue-300">
                            <select
                              value={getMovementCategory(mov)}
                              onChange={(e) => handleEditMovement(mov, e.target.value)}
                              className="w-full px-2 py-1 text-xs border border-blue-300 rounded focus:outline-none focus:ring-2 focus:ring-blue-500"
                              size="5"
                            >
                              {categories.map(cat => (
                                <option key={cat.id} value={cat.nome}>{cat.nome}</option>
                              ))}
                            </select>
                            <button
                              onClick={() => setEditingMovement(null)}
                              className="mt-1 px-2 py-1 text-xs bg-gray-200 hover:bg-gray-300 rounded"
                            >
                              ✕ Annulla
                            </button>
                          </div>
                        ) : (
                          <button
                            onClick={() => setEditingMovement(mov)}
                            className="w-full flex justify-between items-center p-2 bg-gray-50 rounded border border-gray-200 text-xs hover:border-blue-300 hover:bg-blue-50 transition-colors text-left"
                          >
                            <div className="flex-1 min-w-0">
                              <div className="font-medium text-gray-700 truncate">{mov.descrizione}</div>
                              <div className="text-gray-500">{new Date(mov.data).toLocaleDateString('it-IT')}</div>
                            </div>
                            <div className="text-gray-700 font-semibold ml-2">
                              {formatEuro(Math.abs(parseFloat(mov.importo)))}
                            </div>
                          </button>
                        )}
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Top costi per margine basso */}
              {anomaly.tipo === 'margine_basso' && anomaly.topCostiCategorie && anomaly.topCostiCategorie.length > 0 && (
                <div className="border-t border-gray-200 pt-3 mt-3">
                  <div className="text-sm font-semibold text-gray-600 mb-2">
                    Principali voci di costo:
                  </div>
                  <div className="space-y-1">
                    {anomaly.topCostiCategorie.map((cat, idx) => (
                      <div key={idx} className="flex justify-between items-center p-2 bg-white rounded border border-gray-200 text-xs">
                        <span className="font-medium text-gray-700">{cat.categoria}</span>
                        <span className="text-red-600 font-bold">{formatEuro(cat.totale)}</span>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          </div>

          {/* Note */}
          <div className="mb-6">
            <label className="block text-sm font-semibold text-gray-700 mb-2">
              Note personali (opzionale):
            </label>
            <textarea
              value={note}
              onChange={(e) => setNote(e.target.value)}
              placeholder="Es: Spesa eccezionale per evento speciale, Anticipo fornitore concordato, ecc..."
              rows={3}
              className="w-full px-4 py-3 border-2 border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-red-500 focus:border-transparent"
            />
            <div className="mt-2 text-xs text-gray-600 flex items-start gap-2">
              <span>📝</span>
              <span>Le note vengono salvate come promemoria personale. Puoi consultarle cliccando su "📋 Storico Anomalie" nel menu Impostazioni.</span>
            </div>
          </div>

          {/* Info Box */}
          <div className="p-4 bg-blue-50 rounded-lg border border-blue-200">
            <div className="flex items-start gap-2">
              <span className="text-lg">💡</span>
              <div className="text-sm text-gray-700">
                <strong className="text-blue-700">Come funziona:</strong>
                <ul className="mt-2 space-y-1 list-disc list-inside">
                  <li><strong>Confermato:</strong> L'anomalia è reale, verrà monitorata nei periodi successivi</li>
                  <li><strong>Legittimo:</strong> Il movimento è giustificato, non verrà più segnalato</li>
                </ul>
              </div>
            </div>
          </div>
        </div>

        {/* Actions - Fixed at bottom */}
        <div className="p-6 border-t border-gray-200 bg-gray-50">
          <div className="grid grid-cols-2 gap-4">
            <button
              onClick={() => handleValidate('validato_legittimo')}
              disabled={validating}
              className="bg-gradient-to-r from-green-600 to-emerald-600 text-white px-6 py-3 rounded-xl font-semibold hover:from-green-700 hover:to-emerald-700 transition-all shadow-lg disabled:opacity-50"
            >
              ✅ È Legittimo
            </button>
            <button
              onClick={() => handleValidate('confermato')}
              disabled={validating}
              className="bg-gradient-to-r from-red-600 to-rose-600 text-white px-6 py-3 rounded-xl font-semibold hover:from-red-700 hover:to-rose-700 transition-all shadow-lg disabled:opacity-50"
            >
              🚨 Conferma Anomalia
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}
