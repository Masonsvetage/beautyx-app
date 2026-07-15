'use client'

import { useState, useEffect } from 'react'
import Link from 'next/link'
import { useAuth } from '@/contexts/AuthContext'

const TABS = [
  { id: 'condizioni_contrattuali', label: 'Condizioni Contrattuali' },
  { id: 'informativa_privacy', label: 'Informativa Privacy' },
  { id: 'accettazioni', label: 'Stato Accettazioni' },
  { id: 'impostazioni', label: 'Impostazioni' }
]

export default function AdminLegalPage() {
  const { isAdmin } = useAuth()
  const [activeTab, setActiveTab] = useState('condizioni_contrattuali')
  const [documents, setDocuments] = useState({})
  const [settings, setSettings] = useState({})
  const [loading, setLoading] = useState(true)

  // Form nuova versione
  const [editingDoc, setEditingDoc] = useState(null)
  const [docForm, setDocForm] = useState({ titolo: '', contenuto: '', note_modifica: '' })
  const [saving, setSaving] = useState(false)
  const [publishing, setPublishing] = useState(false)

  // Clausole
  const [clauseForm, setClauseForm] = useState({ titolo: '', contenuto: '', richiede_accettazione_singola: false })
  const [editingClause, setEditingClause] = useState(null)

  // Impostazioni
  const [settingsForm, setSettingsForm] = useState({ gdpr_retention_years: '5', legal_acceptance_days: '15' })
  const [savingSettings, setSavingSettings] = useState(false)

  // Storico versioni
  const [showHistory, setShowHistory] = useState(null)

  // Conferma pubblicazione
  const [confirmPublish, setConfirmPublish] = useState(null)

  // Stato accettazioni
  const [acceptanceData, setAcceptanceData] = useState(null)
  const [acceptanceLoading, setAcceptanceLoading] = useState(false)
  const [acceptanceFilter, setAcceptanceFilter] = useState('all') // all | compliant | pending | suspended

  useEffect(() => { loadData() }, [])

  // Carica dati accettazioni quando si apre il tab
  useEffect(() => {
    if (activeTab === 'accettazioni' && !acceptanceData && !acceptanceLoading) {
      setAcceptanceLoading(true)
      fetch('/api/admin/legal-documents/acceptances')
        .then(res => res.ok ? res.json() : null)
        .then(json => setAcceptanceData(json?.data || { documents: [], users: [] }))
        .catch(() => setAcceptanceData({ documents: [], users: [] }))
        .finally(() => setAcceptanceLoading(false))
    }
  }, [activeTab, acceptanceData, acceptanceLoading])

  const loadData = async () => {
    try {
      const [docsRes, settingsRes] = await Promise.all([
        fetch('/api/admin/legal-documents'),
        fetch('/api/admin/settings')
      ])
      const docsJson = await docsRes.json()
      const settingsJson = await settingsRes.json()

      setDocuments(docsJson.data || {})

      const settingsMap = {}
      for (const s of settingsJson.data || []) {
        settingsMap[s.chiave] = s.valore
      }
      setSettings(settingsMap)
      setSettingsForm({
        gdpr_retention_years: settingsMap.gdpr_retention_years || '5',
        legal_acceptance_days: settingsMap.legal_acceptance_days || '15'
      })
    } catch (err) {
      console.error('Errore caricamento:', err)
    } finally {
      setLoading(false)
    }
  }

  const getCurrentDoc = (tipo) => {
    const docs = documents[tipo] || []
    return docs.find(d => d.pubblicato_il) || null
  }

  const getDraftDoc = (tipo) => {
    const docs = documents[tipo] || []
    return docs.find(d => !d.pubblicato_il) || null
  }

  const handleCreateDraft = async (tipo) => {
    const current = getCurrentDoc(tipo)
    setDocForm({
      titolo: current?.titolo || (tipo === 'condizioni_contrattuali' ? 'Condizioni Contrattuali' : 'Informativa Privacy'),
      contenuto: current?.contenuto || '',
      note_modifica: ''
    })
    setEditingDoc({ tipo, isNew: true })
  }

  const handleSaveDraft = async () => {
    setSaving(true)
    try {
      if (editingDoc.isNew) {
        const res = await fetch('/api/admin/legal-documents', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            tipo: editingDoc.tipo,
            titolo: docForm.titolo,
            contenuto: docForm.contenuto,
            note_modifica: docForm.note_modifica
          })
        })
        if (!res.ok) throw new Error('Errore creazione')
      } else {
        const res = await fetch('/api/admin/legal-documents', {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            id: editingDoc.id,
            titolo: docForm.titolo,
            contenuto: docForm.contenuto,
            note_modifica: docForm.note_modifica
          })
        })
        if (!res.ok) throw new Error('Errore aggiornamento')
      }
      setEditingDoc(null)
      await loadData()
    } catch (err) {
      alert(err.message)
    } finally {
      setSaving(false)
    }
  }

  const handlePublish = async (docId) => {
    setPublishing(true)
    try {
      const res = await fetch('/api/admin/legal-documents', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id: docId, pubblica: true })
      })
      if (!res.ok) throw new Error('Errore pubblicazione')
      setConfirmPublish(null)
      await loadData()
    } catch (err) {
      alert(err.message)
    } finally {
      setPublishing(false)
    }
  }

  const handleAddClause = async (documentId) => {
    try {
      const res = await fetch('/api/admin/legal-documents/clauses', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ document_id: documentId, ...clauseForm })
      })
      if (!res.ok) throw new Error('Errore')
      setClauseForm({ titolo: '', contenuto: '', richiede_accettazione_singola: false })
      await loadData()
    } catch (err) {
      alert(err.message)
    }
  }

  const handleUpdateClause = async (clauseId, updates) => {
    try {
      const res = await fetch('/api/admin/legal-documents/clauses', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id: clauseId, ...updates })
      })
      if (!res.ok) throw new Error('Errore')
      setEditingClause(null)
      await loadData()
    } catch (err) {
      alert(err.message)
    }
  }

  const handleDeleteClause = async (clauseId) => {
    if (!confirm('Eliminare questa clausola?')) return
    try {
      const res = await fetch(`/api/admin/legal-documents/clauses?id=${clauseId}`, { method: 'DELETE' })
      if (!res.ok) throw new Error('Errore')
      await loadData()
    } catch (err) {
      alert(err.message)
    }
  }

  const handleSaveSettings = async () => {
    setSavingSettings(true)
    try {
      for (const [chiave, valore] of Object.entries(settingsForm)) {
        await fetch('/api/admin/settings', {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ chiave, valore })
        })
      }
      await loadData()
    } catch (err) {
      alert(err.message)
    } finally {
      setSavingSettings(false)
    }
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900 p-6 flex items-center justify-center">
        <div className="w-12 h-12 border-4 border-teal-500 border-t-transparent rounded-full animate-spin" />
      </div>
    )
  }

  const renderDocumentTab = (tipo) => {
    const current = getCurrentDoc(tipo)
    const draft = getDraftDoc(tipo)
    const allDocs = documents[tipo] || []
    const tipoLabel = tipo === 'condizioni_contrattuali' ? 'Condizioni Contrattuali' : 'Informativa Privacy'

    return (
      <div className="space-y-6">
        {/* Versione corrente */}
        {current ? (
          <div className="bg-slate-800/50 rounded-xl border border-slate-700/50 p-6">
            <div className="flex items-center justify-between mb-4">
              <div>
                <h3 className="text-lg font-semibold text-white">{current.titolo}</h3>
                <p className="text-sm text-slate-400">
                  Versione {current.versione} - Pubblicato il {new Date(current.pubblicato_il).toLocaleDateString('it-IT')}
                  {current.scadenza_accettazione && (
                    <span className="ml-2 text-amber-400">
                      Scadenza accettazione: {new Date(current.scadenza_accettazione).toLocaleDateString('it-IT')}
                    </span>
                  )}
                </p>
              </div>
              <span className="px-3 py-1 rounded-full text-xs font-medium bg-green-500/20 text-green-400 border border-green-500/40">
                Pubblicato
              </span>
            </div>
            <div className="bg-slate-900/50 rounded-lg p-4 max-h-60 overflow-y-auto text-slate-300 text-sm whitespace-pre-wrap">
              {current.contenuto}
            </div>
            {current.note_modifica && (
              <p className="mt-2 text-xs text-slate-500">Note: {current.note_modifica}</p>
            )}

            {/* Clausole del documento corrente */}
            {current.clausole && current.clausole.length > 0 && (
              <div className="mt-4 border-t border-slate-700 pt-4">
                <h4 className="text-sm font-semibold text-slate-300 mb-2">Clausole ({current.clausole.length})</h4>
                <div className="space-y-2">
                  {current.clausole.map(c => (
                    <div key={c.id} className="bg-slate-900/30 rounded-lg p-3 flex items-start gap-3">
                      <div className="flex-1">
                        <p className="text-sm text-white font-medium">{c.titolo}</p>
                        <p className="text-xs text-slate-400 mt-1">{c.contenuto}</p>
                      </div>
                      {c.richiede_accettazione_singola && (
                        <span className="px-2 py-0.5 rounded text-xs bg-red-500/20 text-red-400 border border-red-500/30 whitespace-nowrap">
                          Vessatoria
                        </span>
                      )}
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        ) : (
          <div className="bg-slate-800/50 rounded-xl border border-slate-700/50 p-6 text-center">
            <p className="text-slate-400">Nessun documento pubblicato per {tipoLabel}</p>
          </div>
        )}

        {/* Bozza esistente o editor nuova versione */}
        {editingDoc?.tipo === tipo ? (
          <div className="bg-slate-800/50 rounded-xl border border-indigo-500/30 p-6">
            <h3 className="text-lg font-semibold text-white mb-4">
              {editingDoc.isNew ? 'Nuova Versione' : 'Modifica Bozza'}
            </h3>
            <div className="space-y-4">
              <div>
                <label className="block text-sm text-slate-400 mb-1">Titolo</label>
                <input
                  type="text"
                  value={docForm.titolo}
                  onChange={e => setDocForm(f => ({ ...f, titolo: e.target.value }))}
                  className="w-full bg-slate-900/50 border border-slate-600 rounded-lg px-4 py-2 text-white focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
                />
              </div>
              <div>
                <label className="block text-sm text-slate-400 mb-1">Contenuto</label>
                <textarea
                  value={docForm.contenuto}
                  onChange={e => setDocForm(f => ({ ...f, contenuto: e.target.value }))}
                  rows={15}
                  className="w-full bg-slate-900/50 border border-slate-600 rounded-lg px-4 py-2 text-white focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 font-mono text-sm"
                />
              </div>
              <div>
                <label className="block text-sm text-slate-400 mb-1">Note modifica (cosa e' cambiato)</label>
                <input
                  type="text"
                  value={docForm.note_modifica}
                  onChange={e => setDocForm(f => ({ ...f, note_modifica: e.target.value }))}
                  className="w-full bg-slate-900/50 border border-slate-600 rounded-lg px-4 py-2 text-white focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
                  placeholder="Es: Aggiornato articolo 5 sulla gestione dati..."
                />
              </div>
              <div className="flex gap-3">
                <button
                  onClick={handleSaveDraft}
                  disabled={saving}
                  className="px-4 py-2 bg-indigo-500 text-white rounded-lg hover:bg-indigo-600 disabled:opacity-50 transition-colors"
                >
                  {saving ? 'Salvataggio...' : 'Salva Bozza'}
                </button>
                <button
                  onClick={() => setEditingDoc(null)}
                  className="px-4 py-2 bg-slate-600 text-white rounded-lg hover:bg-slate-500 transition-colors"
                >
                  Annulla
                </button>
              </div>
            </div>
          </div>
        ) : draft ? (
          <div className="bg-slate-800/50 rounded-xl border border-amber-500/30 p-6">
            <div className="flex items-center justify-between mb-4">
              <div>
                <h3 className="text-lg font-semibold text-white">{draft.titolo}</h3>
                <p className="text-sm text-slate-400">Versione {draft.versione} - Bozza</p>
              </div>
              <span className="px-3 py-1 rounded-full text-xs font-medium bg-amber-500/20 text-amber-400 border border-amber-500/40">
                Bozza
              </span>
            </div>
            <div className="bg-slate-900/50 rounded-lg p-4 max-h-40 overflow-y-auto text-slate-300 text-sm whitespace-pre-wrap">
              {draft.contenuto}
            </div>

            {/* Clausole bozza */}
            {draft.clausole && draft.clausole.length > 0 && (
              <div className="mt-4 space-y-2">
                <h4 className="text-sm font-semibold text-slate-300">Clausole</h4>
                {draft.clausole.map(c => (
                  <div key={c.id} className="bg-slate-900/30 rounded-lg p-3 flex items-center gap-3">
                    <div className="flex-1">
                      <p className="text-sm text-white">{c.titolo}</p>
                      <p className="text-xs text-slate-400">{c.contenuto}</p>
                    </div>
                    {c.richiede_accettazione_singola && (
                      <span className="px-2 py-0.5 rounded text-xs bg-red-500/20 text-red-400 border border-red-500/30">Vessatoria</span>
                    )}
                    <button
                      onClick={() => handleUpdateClause(c.id, { richiede_accettazione_singola: !c.richiede_accettazione_singola })}
                      className="text-xs text-slate-400 hover:text-white"
                    >
                      {c.richiede_accettazione_singola ? 'Rimuovi vessatoria' : 'Segna vessatoria'}
                    </button>
                    <button onClick={() => handleDeleteClause(c.id)} className="text-red-400 hover:text-red-300 text-xs">
                      Elimina
                    </button>
                  </div>
                ))}
              </div>
            )}

            {/* Aggiungi clausola */}
            <div className="mt-4 bg-slate-900/30 rounded-lg p-4">
              <h4 className="text-sm font-semibold text-slate-300 mb-2">Aggiungi Clausola</h4>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3 mb-3">
                <input
                  type="text"
                  placeholder="Titolo clausola"
                  value={clauseForm.titolo}
                  onChange={e => setClauseForm(f => ({ ...f, titolo: e.target.value }))}
                  className="bg-slate-800 border border-slate-600 rounded-lg px-3 py-2 text-white text-sm"
                />
                <div className="flex items-center gap-2">
                  <input
                    type="checkbox"
                    checked={clauseForm.richiede_accettazione_singola}
                    onChange={e => setClauseForm(f => ({ ...f, richiede_accettazione_singola: e.target.checked }))}
                    className="rounded border-slate-600"
                  />
                  <label className="text-sm text-slate-400">Clausola vessatoria (accettazione singola)</label>
                </div>
              </div>
              <textarea
                placeholder="Contenuto clausola..."
                value={clauseForm.contenuto}
                onChange={e => setClauseForm(f => ({ ...f, contenuto: e.target.value }))}
                rows={3}
                className="w-full bg-slate-800 border border-slate-600 rounded-lg px-3 py-2 text-white text-sm mb-3"
              />
              <button
                onClick={() => handleAddClause(draft.id)}
                disabled={!clauseForm.titolo || !clauseForm.contenuto}
                className="px-3 py-1.5 bg-indigo-500 text-white rounded-lg text-sm hover:bg-indigo-600 disabled:opacity-50"
              >
                Aggiungi Clausola
              </button>
            </div>

            <div className="mt-4 flex gap-3">
              <button
                onClick={() => {
                  setDocForm({ titolo: draft.titolo, contenuto: draft.contenuto, note_modifica: draft.note_modifica || '' })
                  setEditingDoc({ tipo, id: draft.id, isNew: false })
                }}
                className="px-4 py-2 bg-slate-600 text-white rounded-lg hover:bg-slate-500 transition-colors"
              >
                Modifica Bozza
              </button>
              <button
                onClick={() => setConfirmPublish(draft.id)}
                className="px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors"
              >
                Pubblica
              </button>
            </div>
          </div>
        ) : (
          <button
            onClick={() => handleCreateDraft(tipo)}
            className="w-full py-3 border-2 border-dashed border-slate-600 rounded-xl text-slate-400 hover:border-indigo-500 hover:text-indigo-400 transition-colors"
          >
            + Crea Nuova Versione
          </button>
        )}

        {/* Storico versioni */}
        {allDocs.length > 1 && (
          <div>
            <button
              onClick={() => setShowHistory(showHistory === tipo ? null : tipo)}
              className="text-sm text-slate-400 hover:text-white transition-colors"
            >
              {showHistory === tipo ? 'Nascondi storico' : `Mostra storico (${allDocs.length} versioni)`}
            </button>
            {showHistory === tipo && (
              <div className="mt-2 space-y-2">
                {allDocs.filter(d => d.pubblicato_il).map(d => (
                  <div key={d.id} className="bg-slate-900/30 rounded-lg p-3">
                    <div className="flex items-center justify-between">
                      <span className="text-sm text-white">v{d.versione} - {d.titolo}</span>
                      <span className="text-xs text-slate-500">
                        {new Date(d.pubblicato_il).toLocaleDateString('it-IT')}
                      </span>
                    </div>
                    {d.note_modifica && <p className="text-xs text-slate-500 mt-1">{d.note_modifica}</p>}
                  </div>
                ))}
              </div>
            )}
          </div>
        )}
      </div>
    )
  }

  const renderAcceptancesTab = () => {
    if (acceptanceLoading) {
      return (
        <div className="text-center py-12">
          <div className="w-10 h-10 border-4 border-teal-500 border-t-transparent rounded-full animate-spin mx-auto" />
          <p className="mt-3 text-slate-400">Caricamento stato accettazioni...</p>
        </div>
      )
    }

    const users = acceptanceData?.users || []
    const docs = acceptanceData?.documents || []

    if (docs.length === 0) {
      return (
        <div className="bg-slate-800/50 rounded-xl border border-slate-700/50 p-8 text-center">
          <p className="text-slate-400">Nessun documento legale pubblicato. Pubblica almeno un documento per visualizzare lo stato delle accettazioni.</p>
        </div>
      )
    }

    // Categorizza utenti (escludi admin)
    const nonAdminUsers = users.filter(u => u.ruolo_livello !== 'admin')
    const compliant = nonAdminUsers.filter(u => u.legal_status === 'compliant')
    const pending = nonAdminUsers.filter(u => u.legal_status === 'pending' && !u.profilo_bloccato)
    const suspended = nonAdminUsers.filter(u => u.profilo_bloccato)

    // Filtra utenti in base al filtro selezionato
    let filteredUsers = nonAdminUsers
    if (acceptanceFilter === 'compliant') filteredUsers = compliant
    else if (acceptanceFilter === 'pending') filteredUsers = pending
    else if (acceptanceFilter === 'suspended') filteredUsers = suspended

    return (
      <div className="space-y-6">
        {/* Contatori */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <button
            onClick={() => setAcceptanceFilter('all')}
            className={`bg-slate-800/50 rounded-xl border p-4 text-left transition-all ${
              acceptanceFilter === 'all' ? 'border-teal-500/60 bg-teal-500/5' : 'border-slate-700/50 hover:border-slate-600'
            }`}
          >
            <p className="text-3xl font-bold text-white">{nonAdminUsers.length}</p>
            <p className="text-sm text-slate-400 mt-1">Totale utenti</p>
          </button>
          <button
            onClick={() => setAcceptanceFilter('compliant')}
            className={`bg-slate-800/50 rounded-xl border p-4 text-left transition-all ${
              acceptanceFilter === 'compliant' ? 'border-emerald-500/60 bg-emerald-500/5' : 'border-slate-700/50 hover:border-slate-600'
            }`}
          >
            <p className="text-3xl font-bold text-emerald-400">{compliant.length}</p>
            <p className="text-sm text-slate-400 mt-1">In regola</p>
          </button>
          <button
            onClick={() => setAcceptanceFilter('pending')}
            className={`bg-slate-800/50 rounded-xl border p-4 text-left transition-all ${
              acceptanceFilter === 'pending' ? 'border-amber-500/60 bg-amber-500/5' : 'border-slate-700/50 hover:border-slate-600'
            }`}
          >
            <p className="text-3xl font-bold text-amber-400">{pending.length}</p>
            <p className="text-sm text-slate-400 mt-1">In attesa</p>
          </button>
          <button
            onClick={() => setAcceptanceFilter('suspended')}
            className={`bg-slate-800/50 rounded-xl border p-4 text-left transition-all ${
              acceptanceFilter === 'suspended' ? 'border-red-500/60 bg-red-500/5' : 'border-slate-700/50 hover:border-slate-600'
            }`}
          >
            <p className="text-3xl font-bold text-red-400">{suspended.length}</p>
            <p className="text-sm text-slate-400 mt-1">Sospesi</p>
          </button>
        </div>

        {/* Documenti correnti */}
        <div className="bg-slate-800/30 rounded-xl border border-slate-700/50 p-4">
          <h4 className="text-sm font-semibold text-slate-300 mb-2">Documenti correnti richiesti:</h4>
          <div className="flex flex-wrap gap-2">
            {docs.map(d => (
              <span key={d.id} className="px-3 py-1 rounded-full text-xs bg-indigo-500/20 text-indigo-300 border border-indigo-500/30">
                {d.tipo === 'condizioni_contrattuali' ? 'Condizioni Contrattuali' : 'Informativa Privacy'} v{d.versione}
              </span>
            ))}
          </div>
        </div>

        {/* Lista utenti filtrata */}
        <div className="bg-slate-800/50 rounded-xl border border-slate-700/50 overflow-hidden">
          <div className="p-4 border-b border-slate-700">
            <h3 className="text-white font-semibold">
              {acceptanceFilter === 'all' && 'Tutti gli utenti'}
              {acceptanceFilter === 'compliant' && 'Utenti in regola'}
              {acceptanceFilter === 'pending' && 'Utenti in attesa di accettazione'}
              {acceptanceFilter === 'suspended' && 'Utenti sospesi per mancata accettazione'}
              <span className="text-slate-400 font-normal ml-2">({filteredUsers.length})</span>
            </h3>
          </div>

          {filteredUsers.length === 0 ? (
            <div className="p-8 text-center text-slate-400">
              Nessun utente in questa categoria
            </div>
          ) : (
            <div className="divide-y divide-slate-700/50">
              {filteredUsers.map(u => {
                const isSuspended = !!u.profilo_bloccato
                const isCompliant = u.legal_status === 'compliant'

                return (
                  <div key={u.id} className="flex items-center justify-between p-4 hover:bg-slate-700/20 transition-colors">
                    <div className="flex items-center gap-3">
                      {/* Indicatore stato */}
                      {isSuspended ? (
                        <div className="w-3 h-3 rounded-full bg-red-500" title="Sospeso" />
                      ) : isCompliant ? (
                        <div className="w-3 h-3 rounded-full bg-emerald-500" title="In regola" />
                      ) : (
                        <div className="w-3 h-3 rounded-full bg-amber-500 animate-pulse" title="In attesa" />
                      )}

                      <div>
                        <p className="text-white text-sm font-medium">
                          {u.nome && u.cognome ? `${u.nome} ${u.cognome}` : u.email}
                        </p>
                        <p className="text-xs text-slate-400">{u.email}</p>
                      </div>
                    </div>

                    <div className="flex items-center gap-4">
                      {/* Stato badge */}
                      {isSuspended && (
                        <span className="px-2 py-0.5 rounded text-xs bg-red-500/20 text-red-400 border border-red-500/30">
                          Sospeso
                        </span>
                      )}
                      {!isSuspended && !isCompliant && (
                        <span className="px-2 py-0.5 rounded text-xs bg-amber-500/20 text-amber-400 border border-amber-500/30">
                          {u.pending_documents} doc. da accettare
                        </span>
                      )}
                      {isCompliant && u.last_acceptance_date && (
                        <span className="text-xs text-slate-500">
                          Accettato il {new Date(u.last_acceptance_date).toLocaleDateString('it-IT')}
                        </span>
                      )}

                      {/* Link dettaglio */}
                      <Link
                        href={`/admin/users/${u.id}`}
                        className="text-teal-400 hover:text-teal-300 text-sm"
                      >
                        Dettaglio
                      </Link>
                    </div>
                  </div>
                )
              })}
            </div>
          )}
        </div>

        {/* Bottone refresh */}
        <div className="text-center">
          <button
            onClick={() => {
              setAcceptanceData(null)
              setAcceptanceLoading(false)
            }}
            className="text-sm text-slate-400 hover:text-white transition-colors"
          >
            Aggiorna dati
          </button>
        </div>
      </div>
    )
  }

  const renderSettingsTab = () => (
    <div className="space-y-6">
      <div className="bg-slate-800/50 rounded-xl border border-slate-700/50 p-6">
        <h3 className="text-lg font-semibold text-white mb-4">Impostazioni Generali</h3>
        <div className="space-y-4">
          <div>
            <label className="block text-sm text-slate-400 mb-1">Conservazione profili inattivi (anni GDPR)</label>
            <div className="flex items-center gap-3">
              <input
                type="number"
                min="1"
                max="10"
                value={settingsForm.gdpr_retention_years}
                onChange={e => setSettingsForm(f => ({ ...f, gdpr_retention_years: e.target.value }))}
                className="w-24 bg-slate-900/50 border border-slate-600 rounded-lg px-4 py-2 text-white"
              />
              <span className="text-sm text-slate-400">anni di inattivita prima della cancellazione automatica</span>
            </div>
            <p className="text-xs text-slate-500 mt-1">I profili inattivi oltre questo periodo verranno marcati per la cancellazione con 30 giorni di preavviso</p>
          </div>
          <div>
            <label className="block text-sm text-slate-400 mb-1">Giorni per accettazione documenti legali</label>
            <div className="flex items-center gap-3">
              <input
                type="number"
                min="1"
                max="90"
                value={settingsForm.legal_acceptance_days}
                onChange={e => setSettingsForm(f => ({ ...f, legal_acceptance_days: e.target.value }))}
                className="w-24 bg-slate-900/50 border border-slate-600 rounded-lg px-4 py-2 text-white"
              />
              <span className="text-sm text-slate-400">giorni dalla pubblicazione per accettare le modifiche</span>
            </div>
            <p className="text-xs text-slate-500 mt-1">Superata la scadenza, i profili non conformi verranno sospesi automaticamente</p>
          </div>
          <button
            onClick={handleSaveSettings}
            disabled={savingSettings}
            className="px-6 py-2 bg-teal-500 text-white rounded-lg hover:bg-teal-600 disabled:opacity-50 transition-colors"
          >
            {savingSettings ? 'Salvataggio...' : 'Salva Impostazioni'}
          </button>
        </div>
      </div>
    </div>
  )

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900 p-6">
      {/* Header */}
      <div className="max-w-5xl mx-auto mb-6">
        <div className="bg-slate-950/60 backdrop-blur-md rounded-xl border border-slate-700/50 p-4">
          <div className="flex items-center gap-3">
            <Link href="/admin" className="text-slate-400 hover:text-white transition-colors">
              <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
              </svg>
            </Link>
            <div>
              <h1 className="text-2xl font-bold text-white">Documenti Legali</h1>
              <p className="text-sm text-slate-400">Gestione condizioni contrattuali, privacy e policy</p>
            </div>
          </div>
        </div>
      </div>

      {/* Tabs */}
      <div className="max-w-5xl mx-auto mb-6">
        <div className="flex gap-2 bg-slate-950/40 rounded-xl p-1">
          {TABS.map(tab => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={`flex-1 py-2.5 px-4 rounded-lg text-sm font-medium transition-all ${
                activeTab === tab.id
                  ? 'bg-indigo-500 text-white shadow-lg'
                  : 'text-slate-400 hover:text-white hover:bg-slate-700/50'
              }`}
            >
              {tab.label}
            </button>
          ))}
        </div>
      </div>

      {/* Content */}
      <div className="max-w-5xl mx-auto">
        {activeTab === 'impostazioni' && renderSettingsTab()}
        {activeTab === 'accettazioni' && renderAcceptancesTab()}
        {(activeTab === 'condizioni_contrattuali' || activeTab === 'informativa_privacy') && renderDocumentTab(activeTab)}
      </div>

      {/* Modale conferma pubblicazione */}
      {confirmPublish && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-slate-800 rounded-xl border border-slate-600 p-6 max-w-md w-full">
            <h3 className="text-lg font-bold text-white mb-2">Conferma Pubblicazione</h3>
            <p className="text-sm text-slate-300 mb-4">
              Pubblicando questo documento, <strong>tutti gli utenti</strong> riceveranno una notifica e avranno{' '}
              <strong>{settings.legal_acceptance_days || 15} giorni</strong> per accettare le modifiche.
            </p>
            <p className="text-sm text-amber-400 mb-4">
              I profili che non accettano entro la scadenza verranno sospesi automaticamente.
            </p>
            <div className="flex gap-3 justify-end">
              <button
                onClick={() => setConfirmPublish(null)}
                className="px-4 py-2 bg-slate-600 text-white rounded-lg hover:bg-slate-500"
              >
                Annulla
              </button>
              <button
                onClick={() => handlePublish(confirmPublish)}
                disabled={publishing}
                className="px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 disabled:opacity-50"
              >
                {publishing ? 'Pubblicazione...' : 'Pubblica'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
