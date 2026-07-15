'use client'

import { useState, useEffect } from 'react'
import { formatEuro } from '@/lib/formatters'
import { format, parseISO } from 'date-fns'

export default function AccantonamentoDetailModal({ accantonamento, onClose, onSave }) {
  const [movements, setMovements] = useState([])
  const [loading, setLoading] = useState(true)
  const [showAddMovement, setShowAddMovement] = useState(false)
  const [newMovement, setNewMovement] = useState({
    tipo: 'entrata',
    importo: '',
    descrizione: '',
    data: format(new Date(), 'yyyy-MM-dd')
  })

  useEffect(() => {
    loadMovements()
  }, [])

  async function loadMovements() {
    try {
      const res = await fetch(`/api/accantonamenti/movements?accantonamento_id=${accantonamento.id}`)
      const data = await res.json()
      setMovements(data.movements || [])
    } catch (error) {
      console.error('Errore caricamento movimenti:', error)
    }
    setLoading(false)
  }

  async function handleAddMovement(e) {
    e.preventDefault()
    try {
      const res = await fetch('/api/accantonamenti/movements', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          accantonamento_id: accantonamento.id,
          ...newMovement,
          importo: parseFloat(newMovement.importo)
        })
      })

      if (res.ok) {
        setNewMovement({
          tipo: 'entrata',
          importo: '',
          descrizione: '',
          data: format(new Date(), 'yyyy-MM-dd')
        })
        setShowAddMovement(false)
        loadMovements()
        onSave()
      }
    } catch (error) {
      console.error('Errore creazione movimento:', error)
    }
  }

  async function handleDeleteMovement(movementId) {
    if (!confirm('Eliminare questo movimento?')) return

    try {
      const res = await fetch(`/api/accantonamenti/movements?id=${movementId}`, { method: 'DELETE' })
      if (res.ok) {
        loadMovements()
        onSave()
      }
    } catch (error) {
      console.error('Errore eliminazione movimento:', error)
    }
  }

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-xl shadow-2xl max-w-3xl w-full max-h-[90vh] overflow-y-auto">
        {/* Header */}
        <div
          className="sticky top-0 text-white p-6 rounded-t-xl"
          style={{ background: `linear-gradient(to right, ${accantonamento.colore}, ${accantonamento.colore}dd)` }}
        >
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <span className="text-3xl">{accantonamento.icona}</span>
              <div>
                <h2 className="text-2xl font-bold">{accantonamento.nome}</h2>
                {accantonamento.descrizione && (
                  <p className="text-sm opacity-90">{accantonamento.descrizione}</p>
                )}
              </div>
            </div>
            <button
              onClick={onClose}
              className="text-white hover:bg-white/20 w-8 h-8 rounded-lg flex items-center justify-center"
            >
              ✕
            </button>
          </div>
        </div>

        {/* Content */}
        <div className="p-6">
          {/* Saldi */}
          <div className="grid grid-cols-3 gap-4 mb-6">
            <div className="bg-gray-50 rounded-lg p-4">
              <div className="text-xs text-gray-500 font-semibold mb-1">Saldo Attuale</div>
              <div className="text-2xl font-bold text-gray-800">
                {formatEuro(accantonamento.saldo_attuale)}
              </div>
            </div>
            <div className="bg-gray-50 rounded-lg p-4">
              <div className="text-xs text-gray-500 font-semibold mb-1">Importo Obiettivo</div>
              <div className="text-2xl font-bold text-gray-800">
                {formatEuro(accantonamento.importo_obiettivo)}
              </div>
            </div>
            <div className="bg-gray-50 rounded-lg p-4">
              <div className="text-xs text-gray-500 font-semibold mb-1">Contributo Mensile</div>
              <div className="text-2xl font-bold text-gray-800">
                {formatEuro(accantonamento.contributo_mensile)}
              </div>
            </div>
          </div>

          {/* Actions */}
          <div className="flex gap-2 mb-4">
            <button
              onClick={() => setShowAddMovement(!showAddMovement)}
              className="bg-green-600 text-white px-4 py-2 rounded-lg font-semibold hover:bg-green-700"
            >
              {showAddMovement ? '✕ Annulla' : '+ Aggiungi Movimento'}
            </button>
          </div>

          {/* Form Nuovo Movimento */}
          {showAddMovement && (
            <div className="bg-gray-50 rounded-lg p-4 mb-4">
              <form onSubmit={handleAddMovement} className="space-y-3">
                <div className="grid grid-cols-3 gap-3">
                  <select
                    value={newMovement.tipo}
                    onChange={(e) => setNewMovement({ ...newMovement, tipo: e.target.value })}
                    className="px-3 py-2 border border-gray-300 rounded-lg"
                  >
                    <option value="entrata">➕ Entrata</option>
                    <option value="uscita">➖ Uscita</option>
                  </select>

                  <input
                    type="number"
                    step="0.01"
                    placeholder="Importo (€)"
                    value={newMovement.importo}
                    onChange={(e) => setNewMovement({ ...newMovement, importo: e.target.value })}
                    className="px-3 py-2 border border-gray-300 rounded-lg"
                    required
                  />

                  <input
                    type="date"
                    value={newMovement.data}
                    onChange={(e) => setNewMovement({ ...newMovement, data: e.target.value })}
                    className="px-3 py-2 border border-gray-300 rounded-lg"
                    required
                  />
                </div>

                <input
                  type="text"
                  placeholder="Descrizione"
                  value={newMovement.descrizione}
                  onChange={(e) => setNewMovement({ ...newMovement, descrizione: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg"
                />

                <div className="flex justify-end">
                  <button
                    type="submit"
                    className="bg-green-600 text-white px-6 py-2 rounded-lg font-semibold hover:bg-green-700"
                  >
                    Aggiungi
                  </button>
                </div>
              </form>
            </div>
          )}

          {/* Movimenti */}
          <div>
            <h3 className="font-bold text-gray-800 mb-3">Storico Movimenti</h3>
            {loading ? (
              <div className="text-center py-6 text-gray-500">Caricamento...</div>
            ) : movements.length === 0 ? (
              <div className="text-center py-6 text-gray-500">Nessun movimento registrato</div>
            ) : (
              <div className="space-y-2 max-h-96 overflow-y-auto">
                {movements.map(mov => (
                  <div key={mov.id} className="flex items-center justify-between bg-white border border-gray-200 rounded-lg p-3">
                    <div className="flex items-center gap-3">
                      <span className="text-xl">
                        {mov.tipo === 'entrata' ? '➕' : '➖'}
                      </span>
                      <div>
                        <div className="font-semibold text-gray-800">
                          {mov.descrizione || 'Movimento'}
                        </div>
                        <div className="text-xs text-gray-500">
                          {format(parseISO(mov.data), 'dd/MM/yyyy')}
                        </div>
                      </div>
                    </div>

                    <div className="flex items-center gap-3">
                      <div className={`text-lg font-bold ${
                        mov.tipo === 'entrata' ? 'text-green-600' : 'text-red-600'
                      }`}>
                        {mov.tipo === 'entrata' ? '+' : '-'}{formatEuro(mov.importo)}
                      </div>
                      <button
                        onClick={() => handleDeleteMovement(mov.id)}
                        className="text-red-600 hover:bg-red-100 w-8 h-8 rounded-lg flex items-center justify-center"
                      >
                        🗑️
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* Footer */}
        <div className="sticky bottom-0 bg-gray-50 border-t border-gray-200 p-4 rounded-b-xl flex justify-end">
          <button
            onClick={onClose}
            className="bg-gray-600 text-white px-6 py-2 rounded-lg font-semibold hover:bg-gray-700"
          >
            Chiudi
          </button>
        </div>
      </div>
    </div>
  )
}
