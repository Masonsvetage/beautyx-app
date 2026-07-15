'use client'

import { useState, useEffect, useMemo } from 'react'
import Link from 'next/link'
import { useAuth } from '@/contexts/AuthContext'

export default function AdminHpaPage() {
  const { isAdmin } = useAuth()
  const [hpaList, setHpaList] = useState([])
  const [centri, setCentri] = useState([])
  const [assignments, setAssignments] = useState([])
  const [loading, setLoading] = useState(true)
  const [showModal, setShowModal] = useState(false)
  const [selectedHpa, setSelectedHpa] = useState(null) // HPA aperto in accordion
  const [search, setSearch] = useState('')
  const [centroSearch, setCentroSearch] = useState('')
  const [saving, setSaving] = useState(false)
  const [deleting, setDeleting] = useState(null)

  // Stato nuova assegnazione
  const [newAssignment, setNewAssignment] = useState({
    hpa_id: '',
    centro_ids: [],
    permissions: {
      puo_creare_obiettivi: true,
      puo_pinnare_conversazioni: true,
      puo_vedere_movimenti: true,
      puo_modificare_budget: false
    }
  })

  useEffect(() => { loadData() }, [])

  const loadData = async () => {
    setLoading(true)
    const controller = new AbortController()
    const timeoutId = setTimeout(() => controller.abort(), 20000)
    try {
      const res = await fetch('/api/admin/hpa', { signal: controller.signal })
      const data = await res.json()
      clearTimeout(timeoutId)
      if (data.error) throw new Error(data.error)
      setHpaList(data.hpaList || [])
      setCentri(data.centri || [])
      setAssignments(data.assignments || [])
    } catch (error) {
      clearTimeout(timeoutId)
      console.error('Errore caricamento:', error)
    } finally {
      setLoading(false)
    }
  }

  // Centri già assegnati all'HPA selezionato nel modal
  const assignedCentroIds = useMemo(() => {
    if (!newAssignment.hpa_id) return new Set()
    return new Set(
      assignments
        .filter(a => a.hpa_id === newAssignment.hpa_id)
        .map(a => a.centro_id)
    )
  }, [newAssignment.hpa_id, assignments])

  // Centri disponibili per l'HPA (non già assegnati) + filtro ricerca
  const availableCentri = useMemo(() => {
    return centri.filter(c => {
      const notAssigned = !assignedCentroIds.has(c.id)
      if (!centroSearch.trim()) return notAssigned
      const q = centroSearch.toLowerCase()
      return notAssigned && (
        c.nome.toLowerCase().includes(q) ||
        (c.citta || '').toLowerCase().includes(q)
      )
    })
  }, [centri, assignedCentroIds, centroSearch])

  // Assegnazioni raggruppate per HPA
  const assignmentsByHpa = useMemo(() => {
    const map = {}
    hpaList.forEach(hpa => { map[hpa.id] = { hpa, centri: [] } })
    assignments.forEach(a => {
      if (map[a.hpa_id]) map[a.hpa_id].centri.push(a)
    })
    return Object.values(map).sort((a, b) => {
      const na = `${a.hpa.cognome} ${a.hpa.nome}`.toLowerCase()
      const nb = `${b.hpa.cognome} ${b.hpa.nome}`.toLowerCase()
      return na.localeCompare(nb)
    })
  }, [hpaList, assignments])

  // Filtro ricerca sulla lista HPA
  const filteredHpa = useMemo(() => {
    if (!search.trim()) return assignmentsByHpa
    const q = search.toLowerCase()
    return assignmentsByHpa.filter(({ hpa, centri: cs }) =>
      (hpa.nome || '').toLowerCase().includes(q) ||
      (hpa.cognome || '').toLowerCase().includes(q) ||
      (hpa.email || '').toLowerCase().includes(q) ||
      cs.some(a => (a.centro?.nome || '').toLowerCase().includes(q))
    )
  }, [assignmentsByHpa, search])

  const toggleCentro = (centroId) => {
    setNewAssignment(prev => ({
      ...prev,
      centro_ids: prev.centro_ids.includes(centroId)
        ? prev.centro_ids.filter(id => id !== centroId)
        : [...prev.centro_ids, centroId]
    }))
  }

  const handleCreateAssignment = async () => {
    if (!newAssignment.hpa_id || newAssignment.centro_ids.length === 0) {
      alert('Seleziona HPA e almeno un centro')
      return
    }
    setSaving(true)
    try {
      const res = await fetch('/api/admin/hpa', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(newAssignment)
      })
      const data = await res.json()
      if (data.error) throw new Error(data.error)
      await loadData()
      setShowModal(false)
      resetModal()
    } catch (error) {
      alert('Errore: ' + error.message)
    } finally {
      setSaving(false)
    }
  }

  const handleDeleteAssignment = async (assignmentId) => {
    if (!confirm('Rimuovere questa assegnazione?')) return
    setDeleting(assignmentId)
    try {
      const res = await fetch(`/api/admin/hpa?id=${assignmentId}`, { method: 'DELETE' })
      const data = await res.json()
      if (data.error) throw new Error(data.error)
      setAssignments(prev => prev.filter(a => a.id !== assignmentId))
    } catch (error) {
      alert('Errore: ' + error.message)
    } finally {
      setDeleting(null)
    }
  }

  const resetModal = () => {
    setNewAssignment({
      hpa_id: '',
      centro_ids: [],
      permissions: {
        puo_creare_obiettivi: true,
        puo_pinnare_conversazioni: true,
        puo_vedere_movimenti: true,
        puo_modificare_budget: false
      }
    })
    setCentroSearch('')
  }

  const getHpaName = (hpa) =>
    (hpa.nome && hpa.cognome) ? `${hpa.nome} ${hpa.cognome}` : hpa.email

  const getInitials = (hpa) => {
    if (hpa.nome && hpa.cognome) return `${hpa.nome[0]}${hpa.cognome[0]}`.toUpperCase()
    return hpa.email[0].toUpperCase()
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900 p-6 flex items-center justify-center">
        <div className="text-center">
          <div className="w-12 h-12 border-4 border-purple-500 border-t-transparent rounded-full animate-spin mx-auto" />
          <p className="mt-4 text-slate-400">Caricamento assegnazioni...</p>
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
                <h1 className="text-2xl font-bold text-white">Assegnazioni HPA</h1>
                <p className="text-sm text-slate-400">Gestisci quali centri segue ogni consulente</p>
              </div>
            </div>
            <button
              onClick={() => { resetModal(); setShowModal(true) }}
              className="px-4 py-2 bg-purple-500 text-white rounded-lg hover:bg-purple-600 transition-colors flex items-center gap-2"
            >
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
              </svg>
              Assegna Centri
            </button>
          </div>
        </div>
      </div>

      {/* Stats */}
      <div className="max-w-6xl mx-auto mb-6 grid grid-cols-3 gap-4">
        <div className="bg-slate-800/50 rounded-xl p-4 border border-slate-700/50">
          <p className="text-slate-400 text-sm">HPA Attivi</p>
          <p className="text-2xl font-bold text-purple-400">{hpaList.length}</p>
        </div>
        <div className="bg-slate-800/50 rounded-xl p-4 border border-slate-700/50">
          <p className="text-slate-400 text-sm">Centri Totali</p>
          <p className="text-2xl font-bold text-teal-400">{centri.length}</p>
        </div>
        <div className="bg-slate-800/50 rounded-xl p-4 border border-slate-700/50">
          <p className="text-slate-400 text-sm">Assegnazioni Attive</p>
          <p className="text-2xl font-bold text-white">{assignments.length}</p>
        </div>
      </div>

      {/* Ricerca */}
      <div className="max-w-6xl mx-auto mb-4">
        <div className="relative">
          <svg className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
          </svg>
          <input
            type="text"
            placeholder="Cerca HPA o centro..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full pl-12 pr-4 py-3 bg-slate-800/60 border border-slate-700/50 rounded-xl text-white placeholder:text-slate-500 focus:ring-2 focus:ring-purple-500 focus:border-transparent text-sm"
          />
          {search && (
            <button onClick={() => setSearch('')} className="absolute right-4 top-1/2 -translate-y-1/2 text-slate-500 hover:text-white">
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          )}
        </div>
      </div>

      {/* Lista HPA con accordion */}
      <div className="max-w-6xl mx-auto space-y-3">
        {filteredHpa.length === 0 ? (
          <div className="bg-slate-800/30 rounded-xl border border-slate-700/50 p-12 text-center">
            <svg className="w-16 h-16 mx-auto text-slate-600 mb-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" />
            </svg>
            <h3 className="text-lg font-medium text-white mb-2">
              {hpaList.length === 0 ? 'Nessun HPA registrato' : 'Nessun risultato'}
            </h3>
            <p className="text-slate-400 mb-4">
              {hpaList.length === 0
                ? 'Crea prima un utente con ruolo HPA dalla sezione Utenti'
                : 'Nessun HPA corrisponde alla ricerca'}
            </p>
          </div>
        ) : (
          filteredHpa.map(({ hpa, centri: hpaCentri }) => (
            <div key={hpa.id} className="bg-slate-800/30 rounded-xl border border-slate-700/50 overflow-hidden">
              {/* Header HPA - cliccabile per expand */}
              <button
                onClick={() => setSelectedHpa(selectedHpa === hpa.id ? null : hpa.id)}
                className="w-full flex items-center justify-between p-4 hover:bg-slate-700/20 transition-colors"
              >
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 bg-purple-500/30 rounded-full flex items-center justify-center flex-shrink-0">
                    <span className="text-purple-400 font-medium text-sm">{getInitials(hpa)}</span>
                  </div>
                  <div className="text-left">
                    <p className="text-white font-medium">{getHpaName(hpa)}</p>
                    <p className="text-sm text-slate-400">{hpa.email}</p>
                  </div>
                  <div className="ml-2 flex items-center gap-2">
                    <span className="px-2 py-0.5 bg-teal-500/20 text-teal-400 rounded-full text-xs font-medium">
                      {hpaCentri.length} {hpaCentri.length === 1 ? 'centro' : 'centri'}
                    </span>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <button
                    onClick={(e) => {
                      e.stopPropagation()
                      resetModal()
                      setNewAssignment(prev => ({ ...prev, hpa_id: hpa.id }))
                      setShowModal(true)
                    }}
                    className="px-3 py-1.5 bg-purple-500/20 text-purple-400 hover:bg-purple-500/30 rounded-lg text-xs font-medium transition-colors"
                  >
                    + Aggiungi centri
                  </button>
                  <svg
                    className={`w-5 h-5 text-slate-400 transition-transform ${selectedHpa === hpa.id ? 'rotate-180' : ''}`}
                    fill="none" stroke="currentColor" viewBox="0 0 24 24"
                  >
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                  </svg>
                </div>
              </button>

              {/* Centri assegnati (accordion) */}
              {selectedHpa === hpa.id && (
                <div className="border-t border-slate-700/50">
                  {hpaCentri.length === 0 ? (
                    <div className="p-6 text-center">
                      <p className="text-slate-500 text-sm">Nessun centro assegnato</p>
                      <button
                        onClick={() => {
                          resetModal()
                          setNewAssignment(prev => ({ ...prev, hpa_id: hpa.id }))
                          setShowModal(true)
                        }}
                        className="mt-2 text-xs text-purple-400 hover:text-purple-300 underline"
                      >
                        Assegna il primo centro
                      </button>
                    </div>
                  ) : (
                    <div className="divide-y divide-slate-700/30">
                      {hpaCentri.map(assignment => (
                        <div key={assignment.id} className="flex items-center justify-between px-6 py-3 hover:bg-slate-700/10">
                          <div className="flex items-center gap-3">
                            <div className="w-2 h-2 rounded-full bg-teal-400 flex-shrink-0" />
                            <div>
                              <span className="text-white text-sm font-medium">{assignment.centro?.nome}</span>
                              {assignment.centro?.citta && (
                                <span className="text-slate-500 text-xs ml-2">{assignment.centro.citta}</span>
                              )}
                            </div>
                            <div className="flex flex-wrap gap-1 ml-2">
                              {assignment.puo_creare_obiettivi && (
                                <span className="px-1.5 py-0.5 bg-blue-500/20 text-blue-400 rounded text-xs">Obiettivi</span>
                              )}
                              {assignment.puo_pinnare_conversazioni && (
                                <span className="px-1.5 py-0.5 bg-pink-500/20 text-pink-400 rounded text-xs">Pin Chat</span>
                              )}
                              {assignment.puo_vedere_movimenti && (
                                <span className="px-1.5 py-0.5 bg-green-500/20 text-green-400 rounded text-xs">Movimenti</span>
                              )}
                              {assignment.puo_modificare_budget && (
                                <span className="px-1.5 py-0.5 bg-amber-500/20 text-amber-400 rounded text-xs">Budget</span>
                              )}
                            </div>
                          </div>
                          <div className="flex items-center gap-3">
                            <span className="text-slate-500 text-xs">
                              dal {new Date(assignment.data_inizio).toLocaleDateString('it-IT')}
                            </span>
                            <button
                              onClick={() => handleDeleteAssignment(assignment.id)}
                              disabled={deleting === assignment.id}
                              className="text-red-400 hover:text-red-300 transition-colors disabled:opacity-40"
                              title="Rimuovi assegnazione"
                            >
                              {deleting === assignment.id ? (
                                <div className="w-4 h-4 border-2 border-red-400 border-t-transparent rounded-full animate-spin" />
                              ) : (
                                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                                </svg>
                              )}
                            </button>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              )}
            </div>
          ))
        )}
      </div>

      {/* Modal nuova assegnazione */}
      {showModal && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className="bg-slate-800 rounded-xl border border-slate-700 w-full max-w-lg flex flex-col max-h-[90vh]">

            <div className="p-6 border-b border-slate-700 flex-shrink-0">
              <h3 className="text-lg font-bold text-white">Assegna Centri a HPA</h3>
              <p className="text-sm text-slate-400">Seleziona il consulente e i centri da assegnargli</p>
            </div>

            <div className="p-6 space-y-5 overflow-y-auto flex-1">

              {/* Selezione HPA */}
              <div>
                <label className="block text-sm font-medium text-slate-300 mb-1.5">Consulente HPA *</label>
                <select
                  value={newAssignment.hpa_id}
                  onChange={(e) => setNewAssignment(prev => ({ ...prev, hpa_id: e.target.value, centro_ids: [] }))}
                  className="w-full px-3 py-2 bg-slate-900 border border-slate-600 rounded-lg text-white focus:ring-2 focus:ring-purple-500 focus:border-transparent"
                >
                  <option value="">Seleziona HPA...</option>
                  {hpaList.map(hpa => (
                    <option key={hpa.id} value={hpa.id}>{getHpaName(hpa)}</option>
                  ))}
                </select>
                {hpaList.length === 0 && (
                  <p className="mt-1 text-xs text-amber-400">Nessun HPA disponibile. Crea prima un utente con ruolo HPA.</p>
                )}
              </div>

              {/* Selezione centri (multi-checkbox) */}
              {newAssignment.hpa_id && (
                <div>
                  <div className="flex items-center justify-between mb-1.5">
                    <label className="text-sm font-medium text-slate-300">
                      Centri da assegnare *
                      {newAssignment.centro_ids.length > 0 && (
                        <span className="ml-2 px-2 py-0.5 bg-purple-500/20 text-purple-400 rounded-full text-xs">
                          {newAssignment.centro_ids.length} selezionati
                        </span>
                      )}
                    </label>
                    {newAssignment.centro_ids.length > 0 && (
                      <button
                        onClick={() => setNewAssignment(prev => ({ ...prev, centro_ids: [] }))}
                        className="text-xs text-slate-400 hover:text-white"
                      >
                        Deseleziona tutti
                      </button>
                    )}
                  </div>

                  {/* Ricerca centri */}
                  <div className="relative mb-2">
                    <svg className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                    </svg>
                    <input
                      type="text"
                      placeholder="Filtra centri..."
                      value={centroSearch}
                      onChange={(e) => setCentroSearch(e.target.value)}
                      className="w-full pl-9 pr-3 py-2 bg-slate-900/60 border border-slate-600 rounded-lg text-white placeholder:text-slate-500 focus:ring-1 focus:ring-purple-500 text-sm"
                    />
                  </div>

                  <div className="max-h-48 overflow-y-auto border border-slate-700 rounded-lg divide-y divide-slate-700/50">
                    {availableCentri.length === 0 ? (
                      <p className="text-center text-slate-500 text-sm py-4">
                        {assignedCentroIds.size === centri.length
                          ? 'Tutti i centri sono già assegnati a questo HPA'
                          : 'Nessun centro trovato'}
                      </p>
                    ) : (
                      availableCentri.map(centro => (
                        <label
                          key={centro.id}
                          className="flex items-center gap-3 px-3 py-2.5 hover:bg-slate-700/30 cursor-pointer"
                        >
                          <input
                            type="checkbox"
                            checked={newAssignment.centro_ids.includes(centro.id)}
                            onChange={() => toggleCentro(centro.id)}
                            className="rounded border-slate-600 bg-slate-900 text-purple-500 focus:ring-purple-500"
                          />
                          <div>
                            <span className="text-sm text-white">{centro.nome}</span>
                            {centro.citta && <span className="text-xs text-slate-500 ml-2">{centro.citta}</span>}
                          </div>
                        </label>
                      ))
                    )}
                  </div>
                  {assignedCentroIds.size > 0 && (
                    <p className="text-xs text-slate-500 mt-1">
                      {assignedCentroIds.size} {assignedCentroIds.size === 1 ? 'centro già assegnato' : 'centri già assegnati'} (nascosti)
                    </p>
                  )}
                </div>
              )}

              {/* Permessi */}
              <div className="border-t border-slate-700 pt-4">
                <p className="text-sm font-medium text-slate-300 mb-3">Permessi per tutti i centri selezionati</p>
                <div className="space-y-2">
                  {[
                    { key: 'puo_creare_obiettivi', label: 'Può creare obiettivi' },
                    { key: 'puo_pinnare_conversazioni', label: 'Può pinnare conversazioni Beautyx' },
                    { key: 'puo_vedere_movimenti', label: 'Può vedere movimenti bancari' },
                    { key: 'puo_modificare_budget', label: 'Può modificare il budget' },
                  ].map(({ key, label }) => (
                    <label key={key} className="flex items-center gap-2 cursor-pointer">
                      <input
                        type="checkbox"
                        checked={newAssignment.permissions[key]}
                        onChange={(e) => setNewAssignment(prev => ({
                          ...prev,
                          permissions: { ...prev.permissions, [key]: e.target.checked }
                        }))}
                        className="rounded border-slate-600 bg-slate-900 text-purple-500 focus:ring-purple-500"
                      />
                      <span className="text-sm text-slate-300">{label}</span>
                    </label>
                  ))}
                </div>
              </div>
            </div>

            <div className="p-6 border-t border-slate-700 flex gap-3 justify-end flex-shrink-0">
              <button
                onClick={() => { setShowModal(false); resetModal() }}
                className="px-4 py-2 text-sm font-medium text-slate-400 hover:text-white transition-colors"
              >
                Annulla
              </button>
              <button
                onClick={handleCreateAssignment}
                disabled={saving || !newAssignment.hpa_id || newAssignment.centro_ids.length === 0}
                className="px-4 py-2 text-sm font-medium bg-purple-500 text-white rounded-lg hover:bg-purple-600 transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
              >
                {saving && <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />}
                {saving
                  ? 'Salvataggio...'
                  : `Assegna ${newAssignment.centro_ids.length > 0 ? newAssignment.centro_ids.length + ' ' : ''}centro${newAssignment.centro_ids.length !== 1 ? 'i' : ''}`
                }
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
