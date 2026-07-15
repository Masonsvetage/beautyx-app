'use client'

import { useState, useEffect, useMemo } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { useAuth } from '@/contexts/AuthContext'
import { supabase } from '@/lib/supabase'

export default function AdminCentriPage() {
  const { isAdmin, enterCentro } = useAuth()
  const router = useRouter()
  const [centri, setCentri] = useState([])
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState('')
  const [editingCentro, setEditingCentro] = useState(null)
  const [showCreateModal, setShowCreateModal] = useState(false)
  const [saving, setSaving] = useState(false)
  const [newCentro, setNewCentro] = useState({
    nome: '',
    email: '',
    telefono: '',
    indirizzo: '',
    citta: '',
    cap: '',
    partita_iva: ''
  })

  useEffect(() => {
    loadCentri()
  }, [])

  const loadCentri = async () => {
    try {
      // Query semplice senza relazioni problematiche
      const { data, error } = await supabase
        .from('beauty_centers')
        .select('*')
        .order('nome')

      if (error) throw error
      setCentri(data || [])
    } catch (error) {
      console.error('Errore caricamento centri:', error)
      setCentri([])
    } finally {
      setLoading(false)
    }
  }

  const handleCreateCentro = async () => {
    setSaving(true)
    try {
      const { data, error } = await supabase
        .from('beauty_centers')
        .insert([newCentro])
        .select()
        .single()

      if (error) throw error

      setCentri(prev => [...prev, data])
      setShowCreateModal(false)
      setNewCentro({
        nome: '',
        email: '',
        telefono: '',
        indirizzo: '',
        citta: '',
        cap: '',
        partita_iva: ''
      })
    } catch (error) {
      console.error('Errore creazione centro:', error)
      alert('Errore: ' + error.message)
    } finally {
      setSaving(false)
    }
  }

  const handleSaveCentro = async () => {
    if (!editingCentro) return
    setSaving(true)

    try {
      const { error } = await supabase
        .from('beauty_centers')
        .update({
          nome: editingCentro.nome,
          email: editingCentro.email,
          telefono: editingCentro.telefono,
          indirizzo: editingCentro.indirizzo,
          citta: editingCentro.citta,
          cap: editingCentro.cap,
          partita_iva: editingCentro.partita_iva
        })
        .eq('id', editingCentro.id)

      if (error) throw error

      setCentri(prev => prev.map(c =>
        c.id === editingCentro.id ? { ...c, ...editingCentro } : c
      ))
      setEditingCentro(null)
    } catch (error) {
      console.error('Errore salvataggio:', error)
      alert('Errore: ' + error.message)
    } finally {
      setSaving(false)
    }
  }

  // Filtro ricerca
  const filteredCentri = useMemo(() => {
    if (!search.trim()) return centri
    const q = search.toLowerCase()
    return centri.filter(c =>
      (c.nome || '').toLowerCase().includes(q) ||
      (c.email || '').toLowerCase().includes(q) ||
      (c.citta || '').toLowerCase().includes(q) ||
      (c.partita_iva || '').toLowerCase().includes(q) ||
      (c.indirizzo || '').toLowerCase().includes(q) ||
      (c.telefono || '').toLowerCase().includes(q)
    )
  }, [centri, search])

  // Entra nel centro (imposta contesto admin e vai alla home del centro)
  const handleEntraCentro = (centro) => {
    enterCentro(centro.id, centro.nome)
    router.push('/')
  }

  const handleDeleteCentro = async (centroId) => {
    if (!confirm('Sei sicuro di voler eliminare questo centro? Questa azione non può essere annullata.')) {
      return
    }

    try {
      const { error } = await supabase
        .from('beauty_centers')
        .delete()
        .eq('id', centroId)

      if (error) throw error

      setCentri(prev => prev.filter(c => c.id !== centroId))
    } catch (error) {
      console.error('Errore eliminazione:', error)
      alert('Errore: ' + error.message)
    }
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900 p-6 flex items-center justify-center">
        <div className="text-center">
          <div className="w-12 h-12 border-4 border-teal-500 border-t-transparent rounded-full animate-spin mx-auto"></div>
          <p className="mt-4 text-slate-400">Caricamento centri...</p>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900 p-6">
      {/* Header */}
      <div className="max-w-6xl mx-auto mb-6">
        <div className="bg-slate-950/60 backdrop-blur-md rounded-xl border border-slate-700/50 p-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <Link href="/admin" className="text-slate-400 hover:text-white transition-colors">
                <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
                </svg>
              </Link>
              <div>
                <h1 className="text-2xl font-bold text-white">Gestione Centri Estetici</h1>
                <p className="text-sm text-slate-400">{centri.length} centri registrati</p>
              </div>
            </div>
            <button
              onClick={() => setShowCreateModal(true)}
              className="flex items-center gap-2 px-4 py-2 bg-teal-500 text-white rounded-lg hover:bg-teal-600 transition-colors"
            >
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6v6m0 0v6m0-6h6m-6 0H6" />
              </svg>
              Nuovo Centro
            </button>
          </div>
        </div>
      </div>

      {/* Barra Ricerca */}
      <div className="max-w-6xl mx-auto mb-4">
        <div className="relative">
          <svg className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
          </svg>
          <input
            type="text"
            placeholder="Cerca per nome, email, citta, P.IVA, indirizzo..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full pl-12 pr-4 py-3 bg-slate-800/60 border border-slate-700/50 rounded-xl text-white placeholder:text-slate-500 focus:ring-2 focus:ring-teal-500 focus:border-transparent text-sm"
          />
          {search && (
            <button
              onClick={() => setSearch('')}
              className="absolute right-4 top-1/2 -translate-y-1/2 text-slate-500 hover:text-white"
            >
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          )}
        </div>
        {search && (
          <p className="text-xs text-slate-500 mt-2 ml-1">{filteredCentri.length} risultati per &quot;{search}&quot;</p>
        )}
      </div>

      {/* Lista Centri */}
      <div className="max-w-6xl mx-auto">
        <div className="grid gap-4">
          {filteredCentri.map(centro => (
            <div
              key={centro.id}
              className="bg-slate-800/30 backdrop-blur-sm rounded-xl border border-slate-700/50 p-5 hover:border-teal-500/30 transition-all"
            >
              <div className="flex items-start justify-between">
                <div className="flex-1">
                  <div className="flex items-center gap-3 mb-2">
                    <div className="w-10 h-10 bg-gradient-to-br from-pink-500 to-purple-600 rounded-lg flex items-center justify-center">
                      <span className="text-white text-lg font-bold">{centro.nome?.[0]?.toUpperCase() || '?'}</span>
                    </div>
                    <div>
                      <Link href={`/admin/centri/${centro.id}`} className="text-lg font-semibold text-white hover:text-teal-400 transition-colors">
                        {centro.nome}
                      </Link>
                      <p className="text-sm text-slate-400">{centro.email || 'Nessuna email'}</p>
                    </div>
                  </div>

                  <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mt-4 text-sm">
                    <div>
                      <span className="text-slate-500">Telefono</span>
                      <p className="text-slate-300">{centro.telefono || '-'}</p>
                    </div>
                    <div>
                      <span className="text-slate-500">Città</span>
                      <p className="text-slate-300">{centro.citta || '-'}</p>
                    </div>
                    <div>
                      <span className="text-slate-500">Indirizzo</span>
                      <p className="text-slate-300">{centro.indirizzo || '-'}</p>
                    </div>
                    <div>
                      <span className="text-slate-500">P.IVA</span>
                      <p className="text-slate-300">{centro.partita_iva || '-'}</p>
                    </div>
                  </div>

                </div>

                <div className="flex gap-2">
                  <button
                    onClick={() => handleEntraCentro(centro)}
                    className="px-3 py-1.5 bg-teal-600 hover:bg-teal-500 text-white text-xs font-medium rounded-lg transition-colors flex items-center gap-1.5"
                    title="Entra nel centro"
                  >
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 16l-4-4m0 0l4-4m-4 4h14m-5 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h7a3 3 0 013 3v1" />
                    </svg>
                    Entra
                  </button>
                  <Link
                    href={`/admin/centri/${centro.id}`}
                    className="p-2 text-blue-400 hover:text-blue-300 hover:bg-slate-700/50 rounded-lg transition-colors"
                    title="Vedi dettagli"
                  >
                    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
                    </svg>
                  </Link>
                  <button
                    onClick={() => setEditingCentro({ ...centro })}
                    className="p-2 text-teal-400 hover:text-teal-300 hover:bg-slate-700/50 rounded-lg transition-colors"
                    title="Modifica rapida"
                  >
                    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                    </svg>
                  </button>
                  <button
                    onClick={() => handleDeleteCentro(centro.id)}
                    className="p-2 text-red-400 hover:text-red-300 hover:bg-slate-700/50 rounded-lg transition-colors"
                    title="Elimina"
                  >
                    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                    </svg>
                  </button>
                </div>
              </div>
            </div>
          ))}

          {filteredCentri.length === 0 && (
            <div className="text-center py-12 text-slate-400">
              {search ? (
                <>
                  <p>Nessun centro trovato per &quot;{search}&quot;</p>
                  <button onClick={() => setSearch('')} className="mt-4 text-teal-400 hover:text-teal-300">Resetta ricerca</button>
                </>
              ) : (
                <>
                  <p>Nessun centro registrato</p>
                  <button onClick={() => setShowCreateModal(true)} className="mt-4 text-teal-400 hover:text-teal-300">Crea il primo centro</button>
                </>
              )}
            </div>
          )}
        </div>
      </div>

      {/* Modal Modifica Centro */}
      {editingCentro && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className="bg-slate-800 rounded-xl border border-slate-700 w-full max-w-lg max-h-[90vh] overflow-y-auto">
            <div className="p-6 border-b border-slate-700">
              <h3 className="text-lg font-bold text-white">Modifica Centro</h3>
            </div>

            <div className="p-6 space-y-4">
              <div>
                <label className="block text-sm font-medium text-slate-300 mb-1">Nome Centro *</label>
                <input
                  type="text"
                  value={editingCentro.nome || ''}
                  onChange={(e) => setEditingCentro(prev => ({ ...prev, nome: e.target.value }))}
                  className="w-full px-3 py-2 bg-slate-900 border border-slate-600 rounded-lg text-white focus:ring-2 focus:ring-teal-500"
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-slate-300 mb-1">Email</label>
                  <input
                    type="email"
                    value={editingCentro.email || ''}
                    onChange={(e) => setEditingCentro(prev => ({ ...prev, email: e.target.value }))}
                    className="w-full px-3 py-2 bg-slate-900 border border-slate-600 rounded-lg text-white focus:ring-2 focus:ring-teal-500"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-slate-300 mb-1">Telefono</label>
                  <input
                    type="text"
                    value={editingCentro.telefono || ''}
                    onChange={(e) => setEditingCentro(prev => ({ ...prev, telefono: e.target.value }))}
                    className="w-full px-3 py-2 bg-slate-900 border border-slate-600 rounded-lg text-white focus:ring-2 focus:ring-teal-500"
                  />
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-slate-300 mb-1">Indirizzo</label>
                <input
                  type="text"
                  value={editingCentro.indirizzo || ''}
                  onChange={(e) => setEditingCentro(prev => ({ ...prev, indirizzo: e.target.value }))}
                  className="w-full px-3 py-2 bg-slate-900 border border-slate-600 rounded-lg text-white focus:ring-2 focus:ring-teal-500"
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-slate-300 mb-1">Città</label>
                  <input
                    type="text"
                    value={editingCentro.citta || ''}
                    onChange={(e) => setEditingCentro(prev => ({ ...prev, citta: e.target.value }))}
                    className="w-full px-3 py-2 bg-slate-900 border border-slate-600 rounded-lg text-white focus:ring-2 focus:ring-teal-500"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-slate-300 mb-1">CAP</label>
                  <input
                    type="text"
                    value={editingCentro.cap || ''}
                    onChange={(e) => setEditingCentro(prev => ({ ...prev, cap: e.target.value }))}
                    className="w-full px-3 py-2 bg-slate-900 border border-slate-600 rounded-lg text-white focus:ring-2 focus:ring-teal-500"
                  />
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-slate-300 mb-1">Partita IVA</label>
                <input
                  type="text"
                  value={editingCentro.partita_iva || ''}
                  onChange={(e) => setEditingCentro(prev => ({ ...prev, partita_iva: e.target.value }))}
                  className="w-full px-3 py-2 bg-slate-900 border border-slate-600 rounded-lg text-white focus:ring-2 focus:ring-teal-500"
                />
              </div>
            </div>

            <div className="p-6 border-t border-slate-700 flex gap-3 justify-end">
              <button
                onClick={() => setEditingCentro(null)}
                className="px-4 py-2 text-sm font-medium text-slate-400 hover:text-white"
              >
                Annulla
              </button>
              <button
                onClick={handleSaveCentro}
                disabled={saving}
                className="px-4 py-2 text-sm font-medium bg-teal-500 text-white rounded-lg hover:bg-teal-600 disabled:opacity-50"
              >
                {saving ? 'Salvataggio...' : 'Salva'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Modal Nuovo Centro */}
      {showCreateModal && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className="bg-slate-800 rounded-xl border border-slate-700 w-full max-w-lg max-h-[90vh] overflow-y-auto">
            <div className="p-6 border-b border-slate-700">
              <h3 className="text-lg font-bold text-white">Nuovo Centro Estetico</h3>
            </div>

            <div className="p-6 space-y-4">
              <div>
                <label className="block text-sm font-medium text-slate-300 mb-1">Nome Centro *</label>
                <input
                  type="text"
                  value={newCentro.nome}
                  onChange={(e) => setNewCentro(prev => ({ ...prev, nome: e.target.value }))}
                  className="w-full px-3 py-2 bg-slate-900 border border-slate-600 rounded-lg text-white focus:ring-2 focus:ring-teal-500"
                  placeholder="Beauty Center Milano"
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-slate-300 mb-1">Email</label>
                  <input
                    type="email"
                    value={newCentro.email}
                    onChange={(e) => setNewCentro(prev => ({ ...prev, email: e.target.value }))}
                    className="w-full px-3 py-2 bg-slate-900 border border-slate-600 rounded-lg text-white focus:ring-2 focus:ring-teal-500"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-slate-300 mb-1">Telefono</label>
                  <input
                    type="text"
                    value={newCentro.telefono}
                    onChange={(e) => setNewCentro(prev => ({ ...prev, telefono: e.target.value }))}
                    className="w-full px-3 py-2 bg-slate-900 border border-slate-600 rounded-lg text-white focus:ring-2 focus:ring-teal-500"
                  />
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-slate-300 mb-1">Indirizzo</label>
                <input
                  type="text"
                  value={newCentro.indirizzo}
                  onChange={(e) => setNewCentro(prev => ({ ...prev, indirizzo: e.target.value }))}
                  className="w-full px-3 py-2 bg-slate-900 border border-slate-600 rounded-lg text-white focus:ring-2 focus:ring-teal-500"
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-slate-300 mb-1">Città</label>
                  <input
                    type="text"
                    value={newCentro.citta}
                    onChange={(e) => setNewCentro(prev => ({ ...prev, citta: e.target.value }))}
                    className="w-full px-3 py-2 bg-slate-900 border border-slate-600 rounded-lg text-white focus:ring-2 focus:ring-teal-500"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-slate-300 mb-1">CAP</label>
                  <input
                    type="text"
                    value={newCentro.cap}
                    onChange={(e) => setNewCentro(prev => ({ ...prev, cap: e.target.value }))}
                    className="w-full px-3 py-2 bg-slate-900 border border-slate-600 rounded-lg text-white focus:ring-2 focus:ring-teal-500"
                  />
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-slate-300 mb-1">Partita IVA</label>
                <input
                  type="text"
                  value={newCentro.partita_iva}
                  onChange={(e) => setNewCentro(prev => ({ ...prev, partita_iva: e.target.value }))}
                  className="w-full px-3 py-2 bg-slate-900 border border-slate-600 rounded-lg text-white focus:ring-2 focus:ring-teal-500"
                />
              </div>
            </div>

            <div className="p-6 border-t border-slate-700 flex gap-3 justify-end">
              <button
                onClick={() => setShowCreateModal(false)}
                className="px-4 py-2 text-sm font-medium text-slate-400 hover:text-white"
              >
                Annulla
              </button>
              <button
                onClick={handleCreateCentro}
                disabled={saving || !newCentro.nome}
                className="px-4 py-2 text-sm font-medium bg-teal-500 text-white rounded-lg hover:bg-teal-600 disabled:opacity-50"
              >
                {saving ? 'Creazione...' : 'Crea Centro'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
