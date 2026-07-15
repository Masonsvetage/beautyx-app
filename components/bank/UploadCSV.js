'use client'

import { useState } from 'react'

export default function UploadCSV({ centroId, onUploadComplete }) {
  const [uploading, setUploading] = useState(false)
  const [dragActive, setDragActive] = useState(false)

  async function handleFile(file) {
    if (!file) return

    // Verifica che sia un CSV
    if (!file.name.endsWith('.csv')) {
      alert('⚠️ Per favore carica un file CSV')
      return
    }

    setUploading(true)

    try {
      const formData = new FormData()
      formData.append('file', file)
      formData.append('centro_id', centroId)

      const response = await fetch('/api/bank/upload', {
        method: 'POST',
        body: formData
      })

      const data = await response.json()

      if (data.success) {
        alert(
          `✅ File caricato con successo!\n\n` +
          `📊 Movimenti trovati: ${data.stats.total_movements}\n` +
          `✓ Categorizzati: ${data.stats.categorized}\n` +
          `? Da categorizzare: ${data.stats.uncategorized}\n\n` +
          `${data.stats.uncategorized > 0 ? 'Procedi con la categorizzazione manuale.' : ''}`
        )
        onUploadComplete(data)
      } else {
        alert('❌ Errore: ' + (data.error || 'Caricamento fallito'))
      }
    } catch (error) {
      console.error('Errore upload:', error)
      alert('❌ Errore durante il caricamento del file')
    } finally {
      setUploading(false)
    }
  }

  function handleFileInput(e) {
    const file = e.target.files?.[0]
    handleFile(file)
  }

  function handleDrag(e) {
    e.preventDefault()
    e.stopPropagation()
    if (e.type === 'dragenter' || e.type === 'dragover') {
      setDragActive(true)
    } else if (e.type === 'dragleave') {
      setDragActive(false)
    }
  }

  function handleDrop(e) {
    e.preventDefault()
    e.stopPropagation()
    setDragActive(false)

    const file = e.dataTransfer.files?.[0]
    handleFile(file)
  }

  return (
    <div className="bg-white backdrop-blur-xl rounded-xl border border-gray-100 p-5 overflow-hidden" style={{
      boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.5), 0 10px 25px -5px rgba(0, 0, 0, 0.3), 0 0 0 1px rgba(209, 213, 219, 0.3)'
    }}>
      <div className="flex items-center gap-4">
        {/* Drop Area Compatta */}
        <div
          onDragEnter={handleDrag}
          onDragLeave={handleDrag}
          onDragOver={handleDrag}
          onDrop={handleDrop}
          className={`
            flex-1 border-2 border-dashed rounded-xl p-4 transition-all duration-200
            ${dragActive ? 'border-teal-500 bg-teal-50 shadow-lg' : 'border-gray-300'}
            ${uploading ? 'opacity-50 cursor-not-allowed' : 'cursor-pointer hover:border-teal-400 hover:bg-teal-50/30'}
          `}
        >
          {uploading ? (
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 bg-teal-100 rounded-lg flex items-center justify-center animate-pulse">
                <div className="text-2xl">⏳</div>
              </div>
              <div>
                <div className="font-semibold text-gray-800">Analisi in corso...</div>
                <div className="text-xs text-gray-500 mt-0.5">Lettura e categorizzazione automatica</div>
              </div>
            </div>
          ) : (
            <div className="flex items-center gap-3">
              <div className="w-12 h-12 bg-gradient-to-br from-teal-100 to-cyan-100 rounded-xl flex items-center justify-center shrink-0">
                <div className="text-3xl">📄</div>
              </div>
              <div className="flex-1">
                <div className="font-semibold text-gray-800 mb-1">Importa Estratto Conto CSV</div>
                <div className="text-xs text-gray-500">Trascina qui o clicca per selezionare</div>
              </div>
              <label className="shrink-0">
                <input
                  type="file"
                  accept=".csv"
                  onChange={handleFileInput}
                  disabled={uploading}
                  className="hidden"
                />
                <span className="bg-gradient-to-r from-teal-600 to-cyan-600 text-white px-6 py-2.5 rounded-xl text-sm font-semibold hover:from-teal-700 hover:to-cyan-700 transition-all shadow-lg hover:shadow-xl cursor-pointer inline-block">
                  Sfoglia
                </span>
              </label>
            </div>
          )}
        </div>

        {/* Info Compatta */}
        <div className="shrink-0 p-4 bg-gradient-to-br from-teal-50 to-cyan-50 rounded-xl border border-teal-200 max-w-xs shadow-md">
          <div className="flex items-start gap-3">
            <div className="w-8 h-8 bg-white rounded-lg flex items-center justify-center shrink-0 shadow-sm">
              <div className="text-lg">💡</div>
            </div>
            <div className="text-xs text-gray-700 leading-relaxed">
              <strong className="text-purple-700">Carica CSV della banca.</strong> Beautyx categorizza automaticamente i movimenti già conosciuti.
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
