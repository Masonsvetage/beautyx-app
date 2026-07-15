'use client'

import { useState, useEffect, useRef } from 'react'
import { useAuth } from '@/contexts/AuthContext'

export default function CentroSearchDropdown({ onSelect, onClose }) {
  const { searchCentri } = useAuth()
  const [query, setQuery] = useState('')
  const [results, setResults] = useState([])
  const [loading, setLoading] = useState(false)
  const inputRef = useRef(null)
  const debounceRef = useRef(null)

  useEffect(() => {
    inputRef.current?.focus()
    // Carica lista iniziale
    loadCentri('')
  }, [])

  const loadCentri = async (q) => {
    setLoading(true)
    try {
      const data = await searchCentri(q)
      setResults(data)
    } catch (err) {
      console.error('Errore ricerca centri:', err)
    } finally {
      setLoading(false)
    }
  }

  const handleSearch = (value) => {
    setQuery(value)
    if (debounceRef.current) clearTimeout(debounceRef.current)
    debounceRef.current = setTimeout(() => loadCentri(value), 300)
  }

  return (
    <div className="absolute top-full mt-2 right-0 w-80 bg-slate-800 border border-slate-600/50 rounded-xl shadow-2xl z-50 overflow-hidden">
      <div className="p-3 border-b border-slate-700/50">
        <input
          ref={inputRef}
          type="text"
          value={query}
          onChange={(e) => handleSearch(e.target.value)}
          placeholder="Cerca centro..."
          className="w-full px-3 py-2 bg-slate-700/50 border border-slate-600/50 rounded-lg text-sm text-white placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-teal-500/50"
        />
      </div>
      <div className="max-h-64 overflow-y-auto">
        {loading ? (
          <div className="p-4 text-center text-slate-400 text-sm">Ricerca...</div>
        ) : results.length === 0 ? (
          <div className="p-4 text-center text-slate-400 text-sm">Nessun centro trovato</div>
        ) : (
          results.map((centro) => (
            <button
              key={centro.centro_id}
              onClick={() => {
                onSelect(centro)
                onClose()
              }}
              className="w-full text-left px-4 py-3 hover:bg-slate-700/50 transition-colors flex items-center gap-3 border-b border-slate-700/30 last:border-0"
            >
              <div className="w-8 h-8 rounded-full bg-gradient-to-br from-pink-500 to-purple-600 flex items-center justify-center flex-shrink-0">
                <span className="text-xs font-bold text-white">{centro.centro_nome?.charAt(0)?.toUpperCase()}</span>
              </div>
              <span className="text-sm text-white truncate">{centro.centro_nome}</span>
            </button>
          ))
        )}
      </div>
    </div>
  )
}
