'use client'

import { useState, useEffect, useMemo } from 'react'
import { useAuth } from '@/contexts/AuthContext'

// ── Constants ────────────────────────────────────────────────────────────────

const TIPO_OPTIONS = [
  { value: 'informazione', label: 'Informazione' },
  { value: 'avviso', label: 'Avviso' },
  { value: 'promozione', label: 'Promozione' },
  { value: 'urgente', label: 'Urgente' },
  { value: 'manutenzione', label: 'Manutenzione' },
]

const DISPLAY_MODE_OPTIONS = [
  { value: 'banner', label: 'Banner' },
  { value: 'notification', label: 'Notifica' },
  { value: 'modal', label: 'Modale' },
]

const TARGET_TYPE_OPTIONS = [
  { value: 'broadcast', label: 'Broadcast (tutti)' },
  { value: 'role', label: 'Per ruolo' },
  { value: 'centro', label: 'Per centro' },
  { value: 'user', label: 'Per utente' },
]

const ROLE_OPTIONS = [
  { value: 'admin', label: 'Admin' },
  { value: 'hpa', label: 'HPA' },
  { value: 'titolare', label: 'Titolare' },
  { value: 'direttore', label: 'Direttore' },
  { value: 'amministrativo', label: 'Amministrativo' },
]

const STATO_OPTIONS = [
  { value: 'bozza', label: 'Bozza' },
  { value: 'attivo', label: 'Attivo' },
  { value: 'programmato', label: 'Programmato' },
]

const TABS = [
  { key: 'tutti', label: 'Tutti' },
  { key: 'attivi', label: 'Attivi' },
  { key: 'bozze', label: 'Bozze' },
  { key: 'scaduti', label: 'Scaduti' },
]

const TIPO_COLORS = {
  informazione: { bg: 'bg-blue-500/20', text: 'text-blue-400', border: 'border-blue-500/30' },
  avviso: { bg: 'bg-yellow-500/20', text: 'text-yellow-400', border: 'border-yellow-500/30' },
  promozione: { bg: 'bg-green-500/20', text: 'text-green-400', border: 'border-green-500/30' },
  urgente: { bg: 'bg-red-500/20', text: 'text-red-400', border: 'border-red-500/30' },
  manutenzione: { bg: 'bg-orange-500/20', text: 'text-orange-400', border: 'border-orange-500/30' },
}

const STATO_COLORS = {
  bozza: { bg: 'bg-gray-500/20', text: 'text-gray-400', border: 'border-gray-500/30' },
  programmato: { bg: 'bg-blue-500/20', text: 'text-blue-400', border: 'border-blue-500/30' },
  attivo: { bg: 'bg-green-500/20', text: 'text-green-400', border: 'border-green-500/30' },
  scaduto: { bg: 'bg-red-500/20', text: 'text-red-400', border: 'border-red-500/30' },
  annullato: { bg: 'bg-gray-500/20', text: 'text-gray-400', border: 'border-gray-500/30' },
}

const TARGET_COLORS = {
  broadcast: { bg: 'bg-purple-500/20', text: 'text-purple-400' },
  role: { bg: 'bg-cyan-500/20', text: 'text-cyan-400' },
  centro: { bg: 'bg-amber-500/20', text: 'text-amber-400' },
  user: { bg: 'bg-pink-500/20', text: 'text-pink-400' },
}

const EMPTY_FORM = {
  titolo: '',
  contenuto: '',
  tipo: 'informazione',
  display_mode: 'banner',
  target_type: 'broadcast',
  target_roles: [],
  target_centro_ids: '',
  target_user_ids: '',
  data_inizio: '',
  data_fine: '',
  stato: 'bozza',
}

// ── Helpers ──────────────────────────────────────────────────────────────────

function formatDateTime(iso) {
  if (!iso) return '—'
  const d = new Date(iso)
  return d.toLocaleString('it-IT', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  })
}

function Badge({ label, bg, text, border }) {
  return (
    <span className={`inline-flex items-center px-2 py-0.5 rounded-md text-xs font-medium ${bg} ${text} ${border ? `border ${border}` : ''}`}>
      {label}
    </span>
  )
}

// ── Icons (inline SVG) ──────────────────────────────────────────────────────

function IconPlus() {
  return (
    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
    </svg>
  )
}

function IconMegaphone() {
  return (
    <svg className="w-6 h-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5.882V19.24a1.76 1.76 0 01-3.417.592l-2.147-6.15M18 13a3 3 0 100-6M5.436 13.683A4.001 4.001 0 017 6h1.832c4.1 0 7.625-1.234 9.168-3v14c-1.543-1.766-5.067-3-9.168-3H7a3.988 3.988 0 01-1.564-.317z" />
    </svg>
  )
}

function IconX() {
  return (
    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
    </svg>
  )
}

function IconTrash() {
  return (
    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
    </svg>
  )
}

function IconEdit() {
  return (
    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
    </svg>
  )
}

function IconEye() {
  return (
    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
    </svg>
  )
}

function IconCalendar() {
  return (
    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
    </svg>
  )
}

function IconRefresh() {
  return (
    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
    </svg>
  )
}

// ── Main Page Component ─────────────────────────────────────────────────────

export default function AdminMessaggiPage() {
  const { profile } = useAuth()

  // State
  const [announcements, setAnnouncements] = useState([])
  const [loading, setLoading] = useState(true)
  const [activeTab, setActiveTab] = useState('tutti')
  const [showModal, setShowModal] = useState(false)
  const [editingId, setEditingId] = useState(null)
  const [form, setForm] = useState({ ...EMPTY_FORM })
  const [saving, setSaving] = useState(false)
  const [deleting, setDeleting] = useState(null)
  const [error, setError] = useState('')
  const [successMsg, setSuccessMsg] = useState('')

  // ── Data Fetching ───────────────────────────────────────────────────────

  useEffect(() => {
    loadAnnouncements()
  }, [])

  useEffect(() => {
    if (successMsg) {
      const t = setTimeout(() => setSuccessMsg(''), 3000)
      return () => clearTimeout(t)
    }
  }, [successMsg])

  const loadAnnouncements = async () => {
    setLoading(true)
    try {
      const res = await fetch('/api/admin/announcements')
      if (!res.ok) throw new Error('Errore nel caricamento')
      const data = await res.json()
      setAnnouncements(Array.isArray(data) ? data : data.data || [])
    } catch (err) {
      console.error('Errore caricamento annunci:', err)
      setError('Impossibile caricare gli annunci.')
    } finally {
      setLoading(false)
    }
  }

  // ── Filtered list by tab ────────────────────────────────────────────────

  const filtered = useMemo(() => {
    switch (activeTab) {
      case 'attivi':
        return announcements.filter(a => a.stato === 'attivo')
      case 'bozze':
        return announcements.filter(a => a.stato === 'bozza')
      case 'scaduti':
        return announcements.filter(a => a.stato === 'scaduto')
      default:
        return announcements
    }
  }, [announcements, activeTab])

  // ── Tab counts ──────────────────────────────────────────────────────────

  const tabCounts = useMemo(() => ({
    tutti: announcements.length,
    attivi: announcements.filter(a => a.stato === 'attivo').length,
    bozze: announcements.filter(a => a.stato === 'bozza').length,
    scaduti: announcements.filter(a => a.stato === 'scaduto').length,
  }), [announcements])

  // ── Form Helpers ────────────────────────────────────────────────────────

  const openCreate = () => {
    setEditingId(null)
    setForm({ ...EMPTY_FORM })
    setError('')
    setShowModal(true)
  }

  const openEdit = (ann) => {
    setEditingId(ann.id)
    setForm({
      titolo: ann.titolo || '',
      contenuto: ann.contenuto || '',
      tipo: ann.tipo || 'informazione',
      display_mode: ann.display_mode || 'banner',
      target_type: ann.target_type || 'broadcast',
      target_roles: ann.target_roles || [],
      target_centro_ids: Array.isArray(ann.target_centro_ids) ? ann.target_centro_ids.join(', ') : (ann.target_centro_ids || ''),
      target_user_ids: Array.isArray(ann.target_user_ids) ? ann.target_user_ids.join(', ') : (ann.target_user_ids || ''),
      data_inizio: ann.data_inizio ? ann.data_inizio.slice(0, 16) : '',
      data_fine: ann.data_fine ? ann.data_fine.slice(0, 16) : '',
      stato: ann.stato || 'bozza',
    })
    setError('')
    setShowModal(true)
  }

  const closeModal = () => {
    setShowModal(false)
    setEditingId(null)
    setForm({ ...EMPTY_FORM })
    setError('')
  }

  const updateField = (field, value) => {
    setForm(prev => ({ ...prev, [field]: value }))
  }

  const toggleRole = (role) => {
    setForm(prev => {
      const roles = prev.target_roles.includes(role)
        ? prev.target_roles.filter(r => r !== role)
        : [...prev.target_roles, role]
      return { ...prev, target_roles: roles }
    })
  }

  // ── Build payload ───────────────────────────────────────────────────────

  const buildPayload = (statoOverride) => {
    const payload = {
      titolo: form.titolo.trim(),
      contenuto: form.contenuto.trim(),
      tipo: form.tipo,
      display_mode: form.display_mode,
      target_type: form.target_type,
      data_inizio: form.data_inizio ? new Date(form.data_inizio).toISOString() : null,
      data_fine: form.data_fine ? new Date(form.data_fine).toISOString() : null,
      stato: statoOverride || form.stato,
    }

    // Target-specific fields
    if (form.target_type === 'role') {
      payload.target_roles = form.target_roles
    } else if (form.target_type === 'centro') {
      payload.target_centro_ids = form.target_centro_ids
        .split(',')
        .map(s => s.trim())
        .filter(Boolean)
    } else if (form.target_type === 'user') {
      payload.target_user_ids = form.target_user_ids
        .split(',')
        .map(s => s.trim())
        .filter(Boolean)
    }

    if (editingId) {
      payload.id = editingId
    }

    return payload
  }

  // ── Save / Publish ──────────────────────────────────────────────────────

  const handleSave = async (statoOverride) => {
    if (!form.titolo.trim()) {
      setError('Il titolo e obbligatorio.')
      return
    }
    if (!form.contenuto.trim()) {
      setError('Il contenuto e obbligatorio.')
      return
    }
    if (form.target_type === 'role' && form.target_roles.length === 0) {
      setError('Seleziona almeno un ruolo.')
      return
    }

    setSaving(true)
    setError('')

    try {
      const payload = buildPayload(statoOverride)
      const method = editingId ? 'PUT' : 'POST'
      const res = await fetch('/api/admin/announcements', {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      })

      if (!res.ok) {
        const errData = await res.json().catch(() => ({}))
        throw new Error(errData.error || 'Errore durante il salvataggio')
      }

      setSuccessMsg(editingId ? 'Annuncio aggiornato con successo!' : 'Annuncio creato con successo!')
      closeModal()
      await loadAnnouncements()
    } catch (err) {
      console.error('Errore salvataggio:', err)
      setError(err.message || 'Errore durante il salvataggio.')
    } finally {
      setSaving(false)
    }
  }

  // ── Delete ──────────────────────────────────────────────────────────────

  const handleDelete = async (id) => {
    if (!confirm('Sei sicuro di voler eliminare questo annuncio?')) return

    setDeleting(id)
    try {
      const res = await fetch(`/api/admin/announcements?id=${id}`, { method: 'DELETE' })
      if (!res.ok) throw new Error('Errore eliminazione')
      setAnnouncements(prev => prev.filter(a => a.id !== id))
      setSuccessMsg('Annuncio eliminato.')
    } catch (err) {
      console.error('Errore eliminazione:', err)
      setError('Impossibile eliminare l\'annuncio.')
    } finally {
      setDeleting(null)
    }
  }

  // ── Loading state ───────────────────────────────────────────────────────

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-800 via-slate-900 to-slate-800 flex items-center justify-center">
        <div className="text-center">
          <div className="w-12 h-12 border-4 border-teal-500 border-t-transparent rounded-full animate-spin mx-auto" />
          <p className="mt-4 text-slate-400">Caricamento messaggi...</p>
        </div>
      </div>
    )
  }

  // ── Render ──────────────────────────────────────────────────────────────

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-800 via-slate-900 to-slate-800 p-4 md:p-6">
      <div className="max-w-6xl mx-auto space-y-6">

        {/* ── Success Toast ─────────────────────────────────────────────── */}
        {successMsg && (
          <div className="fixed top-4 right-4 z-[60] bg-green-600/90 backdrop-blur-sm text-white px-5 py-3 rounded-lg shadow-lg border border-green-500/50 flex items-center gap-2 animate-fade-in">
            <svg className="w-5 h-5 text-green-200" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
            </svg>
            {successMsg}
          </div>
        )}

        {/* ── Header ────────────────────────────────────────────────────── */}
        <div className="bg-slate-800/80 backdrop-blur-md rounded-xl border border-slate-700/50 p-5">
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 bg-gradient-to-br from-teal-600 to-cyan-600 rounded-lg flex items-center justify-center shadow-lg shadow-teal-900/30">
                <IconMegaphone />
              </div>
              <div>
                <h1 className="text-xl font-bold text-white">Console Messaggi</h1>
                <p className="text-sm text-slate-400">Gestisci annunci e comunicazioni</p>
              </div>
            </div>
            <div className="flex items-center gap-2">
              <button
                onClick={loadAnnouncements}
                className="p-2.5 bg-slate-700/50 hover:bg-slate-600/50 text-slate-300 hover:text-white rounded-lg transition-colors border border-slate-600/50"
                title="Ricarica"
              >
                <IconRefresh />
              </button>
              <button
                onClick={openCreate}
                className="flex items-center gap-2 px-4 py-2.5 bg-teal-600 hover:bg-teal-500 text-white font-medium rounded-lg transition-colors shadow-lg shadow-teal-900/30"
              >
                <IconPlus />
                <span>Nuovo Messaggio</span>
              </button>
            </div>
          </div>
        </div>

        {/* ── Tab Bar ───────────────────────────────────────────────────── */}
        <div className="bg-slate-800/80 backdrop-blur-md rounded-xl border border-slate-700/50 p-1.5 flex gap-1">
          {TABS.map(tab => {
            const isActive = activeTab === tab.key
            const count = tabCounts[tab.key]
            return (
              <button
                key={tab.key}
                onClick={() => setActiveTab(tab.key)}
                className={`flex-1 flex items-center justify-center gap-2 px-4 py-2.5 rounded-lg text-sm font-medium transition-all ${
                  isActive
                    ? 'bg-teal-600/20 text-teal-400 border border-teal-500/30 shadow-sm'
                    : 'text-slate-400 hover:text-slate-200 hover:bg-slate-700/50'
                }`}
              >
                {tab.label}
                {count > 0 && (
                  <span className={`px-1.5 py-0.5 rounded-full text-xs ${
                    isActive ? 'bg-teal-500/30 text-teal-300' : 'bg-slate-600/50 text-slate-500'
                  }`}>
                    {count}
                  </span>
                )}
              </button>
            )
          })}
        </div>

        {/* ── Global Error ──────────────────────────────────────────────── */}
        {error && !showModal && (
          <div className="bg-red-500/10 border border-red-500/30 rounded-xl p-4 flex items-center gap-3">
            <svg className="w-5 h-5 text-red-400 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
            <p className="text-red-400 text-sm">{error}</p>
            <button onClick={() => setError('')} className="ml-auto text-red-400 hover:text-red-300">
              <IconX />
            </button>
          </div>
        )}

        {/* ── Announcement Cards ────────────────────────────────────────── */}
        {filtered.length === 0 ? (
          <div className="bg-slate-800/80 backdrop-blur-md rounded-xl border border-slate-700/50 p-12 text-center">
            <div className="w-16 h-16 bg-slate-700/50 rounded-full flex items-center justify-center mx-auto mb-4">
              <IconMegaphone />
            </div>
            <p className="text-slate-400 text-lg">
              {activeTab === 'tutti'
                ? 'Nessun annuncio trovato.'
                : `Nessun annuncio con stato "${activeTab}".`}
            </p>
            <button
              onClick={openCreate}
              className="mt-4 inline-flex items-center gap-2 px-4 py-2 bg-teal-600 hover:bg-teal-500 text-white rounded-lg transition-colors text-sm"
            >
              <IconPlus />
              Crea il primo annuncio
            </button>
          </div>
        ) : (
          <div className="space-y-3">
            {filtered.map(ann => {
              const tipoC = TIPO_COLORS[ann.tipo] || TIPO_COLORS.informazione
              const statoC = STATO_COLORS[ann.stato] || STATO_COLORS.bozza
              const targetC = TARGET_COLORS[ann.target_type] || TARGET_COLORS.broadcast

              return (
                <div
                  key={ann.id}
                  className="bg-slate-800/80 backdrop-blur-md border border-slate-700/50 rounded-xl p-5 hover:border-slate-600/70 transition-all group"
                >
                  <div className="flex flex-col md:flex-row md:items-start md:justify-between gap-4">
                    {/* Left side */}
                    <div className="flex-1 min-w-0 space-y-3">
                      {/* Title row */}
                      <div className="flex items-start gap-3">
                        <h3 className="text-white font-semibold text-base truncate">{ann.titolo}</h3>
                      </div>

                      {/* Badges */}
                      <div className="flex flex-wrap gap-2">
                        <Badge label={ann.tipo} bg={tipoC.bg} text={tipoC.text} border={tipoC.border} />
                        <Badge label={ann.target_type} bg={targetC.bg} text={targetC.text} />
                        <Badge label={ann.stato} bg={statoC.bg} text={statoC.text} border={statoC.border} />
                        {ann.display_mode && (
                          <Badge label={ann.display_mode} bg="bg-slate-600/30" text="text-slate-400" />
                        )}
                      </div>

                      {/* Metadata row */}
                      <div className="flex flex-wrap items-center gap-4 text-xs text-slate-500">
                        <span className="flex items-center gap-1">
                          <IconCalendar />
                          Inizio: {formatDateTime(ann.data_inizio)}
                        </span>
                        {ann.data_fine && (
                          <span className="flex items-center gap-1">
                            <IconCalendar />
                            Fine: {formatDateTime(ann.data_fine)}
                          </span>
                        )}
                        <span className="flex items-center gap-1">
                          <IconEye />
                          {ann.visualizzazioni ?? 0} visualizzazioni
                        </span>
                      </div>

                      {/* Content preview */}
                      {ann.contenuto && (
                        <p className="text-slate-400 text-sm line-clamp-2 leading-relaxed">
                          {ann.contenuto}
                        </p>
                      )}

                      {/* Target details */}
                      {ann.target_type === 'role' && ann.target_roles?.length > 0 && (
                        <div className="flex flex-wrap gap-1">
                          <span className="text-xs text-slate-500 mr-1">Ruoli:</span>
                          {ann.target_roles.map(r => (
                            <span key={r} className="text-xs bg-cyan-500/10 text-cyan-400 px-1.5 py-0.5 rounded">
                              {r}
                            </span>
                          ))}
                        </div>
                      )}
                    </div>

                    {/* Right side: actions */}
                    <div className="flex items-center gap-2 md:flex-col md:items-end shrink-0">
                      <button
                        onClick={() => openEdit(ann)}
                        className="flex items-center gap-1.5 px-3 py-2 bg-slate-700/50 hover:bg-slate-600/60 text-slate-300 hover:text-white rounded-lg transition-colors text-sm border border-slate-600/40"
                      >
                        <IconEdit />
                        <span className="hidden sm:inline">Modifica</span>
                      </button>
                      <button
                        onClick={() => handleDelete(ann.id)}
                        disabled={deleting === ann.id}
                        className="flex items-center gap-1.5 px-3 py-2 bg-red-500/10 hover:bg-red-500/20 text-red-400 hover:text-red-300 rounded-lg transition-colors text-sm border border-red-500/20 disabled:opacity-50"
                      >
                        {deleting === ann.id ? (
                          <div className="w-4 h-4 border-2 border-red-400 border-t-transparent rounded-full animate-spin" />
                        ) : (
                          <IconTrash />
                        )}
                        <span className="hidden sm:inline">Elimina</span>
                      </button>
                    </div>
                  </div>
                </div>
              )
            })}
          </div>
        )}
      </div>

      {/* ── Create / Edit Modal ──────────────────────────────────────────── */}
      {showModal && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-start justify-center pt-8 pb-8 px-4 overflow-y-auto">
          <div className="w-full max-w-2xl bg-slate-800 rounded-2xl border border-slate-700/50 shadow-2xl shadow-black/40">

            {/* Modal Header */}
            <div className="flex items-center justify-between p-5 border-b border-slate-700/50">
              <h2 className="text-lg font-bold text-white">
                {editingId ? 'Modifica Annuncio' : 'Nuovo Annuncio'}
              </h2>
              <button
                onClick={closeModal}
                className="p-2 hover:bg-slate-700/50 rounded-lg text-slate-400 hover:text-white transition-colors"
              >
                <IconX />
              </button>
            </div>

            {/* Modal Body */}
            <div className="p-5 space-y-5 max-h-[calc(100vh-220px)] overflow-y-auto">

              {/* Error inside modal */}
              {error && (
                <div className="bg-red-500/10 border border-red-500/30 rounded-lg p-3 flex items-center gap-2">
                  <svg className="w-4 h-4 text-red-400 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                  </svg>
                  <p className="text-red-400 text-sm">{error}</p>
                </div>
              )}

              {/* Titolo */}
              <div>
                <label className="block text-sm font-medium text-slate-300 mb-1.5">Titolo *</label>
                <input
                  type="text"
                  value={form.titolo}
                  onChange={e => updateField('titolo', e.target.value)}
                  placeholder="Inserisci il titolo dell'annuncio"
                  className="w-full px-4 py-2.5 bg-slate-700/50 border border-slate-600/50 rounded-lg text-white placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-teal-500/50 focus:border-teal-500/50 transition-colors"
                />
              </div>

              {/* Contenuto */}
              <div>
                <label className="block text-sm font-medium text-slate-300 mb-1.5">Contenuto *</label>
                <textarea
                  value={form.contenuto}
                  onChange={e => updateField('contenuto', e.target.value)}
                  placeholder="Scrivi il contenuto del messaggio..."
                  rows={6}
                  className="w-full px-4 py-2.5 bg-slate-700/50 border border-slate-600/50 rounded-lg text-white placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-teal-500/50 focus:border-teal-500/50 transition-colors resize-y"
                />
              </div>

              {/* Tipo + Display Mode (side by side) */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-slate-300 mb-1.5">Tipo</label>
                  <select
                    value={form.tipo}
                    onChange={e => updateField('tipo', e.target.value)}
                    className="w-full px-4 py-2.5 bg-slate-700/50 border border-slate-600/50 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-teal-500/50 focus:border-teal-500/50 transition-colors appearance-none"
                  >
                    {TIPO_OPTIONS.map(o => (
                      <option key={o.value} value={o.value} className="bg-slate-800">{o.label}</option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium text-slate-300 mb-1.5">Display Mode</label>
                  <select
                    value={form.display_mode}
                    onChange={e => updateField('display_mode', e.target.value)}
                    className="w-full px-4 py-2.5 bg-slate-700/50 border border-slate-600/50 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-teal-500/50 focus:border-teal-500/50 transition-colors appearance-none"
                  >
                    {DISPLAY_MODE_OPTIONS.map(o => (
                      <option key={o.value} value={o.value} className="bg-slate-800">{o.label}</option>
                    ))}
                  </select>
                </div>
              </div>

              {/* Target Type */}
              <div>
                <label className="block text-sm font-medium text-slate-300 mb-1.5">Destinatari</label>
                <select
                  value={form.target_type}
                  onChange={e => updateField('target_type', e.target.value)}
                  className="w-full px-4 py-2.5 bg-slate-700/50 border border-slate-600/50 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-teal-500/50 focus:border-teal-500/50 transition-colors appearance-none"
                >
                  {TARGET_TYPE_OPTIONS.map(o => (
                    <option key={o.value} value={o.value} className="bg-slate-800">{o.label}</option>
                  ))}
                </select>
              </div>

              {/* Target: Role checkboxes */}
              {form.target_type === 'role' && (
                <div className="bg-slate-700/30 border border-slate-600/40 rounded-lg p-4">
                  <label className="block text-sm font-medium text-slate-300 mb-3">Seleziona ruoli *</label>
                  <div className="flex flex-wrap gap-3">
                    {ROLE_OPTIONS.map(role => {
                      const checked = form.target_roles.includes(role.value)
                      return (
                        <label
                          key={role.value}
                          className={`flex items-center gap-2 px-3 py-2 rounded-lg cursor-pointer transition-colors border ${
                            checked
                              ? 'bg-teal-600/20 border-teal-500/40 text-teal-300'
                              : 'bg-slate-700/30 border-slate-600/40 text-slate-400 hover:bg-slate-600/40'
                          }`}
                        >
                          <input
                            type="checkbox"
                            checked={checked}
                            onChange={() => toggleRole(role.value)}
                            className="sr-only"
                          />
                          <div className={`w-4 h-4 rounded border-2 flex items-center justify-center transition-colors ${
                            checked ? 'bg-teal-500 border-teal-500' : 'border-slate-500'
                          }`}>
                            {checked && (
                              <svg className="w-3 h-3 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" />
                              </svg>
                            )}
                          </div>
                          <span className="text-sm font-medium">{role.label}</span>
                        </label>
                      )
                    })}
                  </div>
                </div>
              )}

              {/* Target: Centro IDs */}
              {form.target_type === 'centro' && (
                <div className="bg-slate-700/30 border border-slate-600/40 rounded-lg p-4">
                  <label className="block text-sm font-medium text-slate-300 mb-1.5">ID Centro (separati da virgola)</label>
                  <input
                    type="text"
                    value={form.target_centro_ids}
                    onChange={e => updateField('target_centro_ids', e.target.value)}
                    placeholder="es. abc123, def456, ghi789"
                    className="w-full px-4 py-2.5 bg-slate-700/50 border border-slate-600/50 rounded-lg text-white placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-teal-500/50 focus:border-teal-500/50 transition-colors"
                  />
                  <p className="text-xs text-slate-500 mt-1.5">Inserisci gli ID dei centri separati da virgola.</p>
                </div>
              )}

              {/* Target: User IDs */}
              {form.target_type === 'user' && (
                <div className="bg-slate-700/30 border border-slate-600/40 rounded-lg p-4">
                  <label className="block text-sm font-medium text-slate-300 mb-1.5">ID Utente (separati da virgola)</label>
                  <input
                    type="text"
                    value={form.target_user_ids}
                    onChange={e => updateField('target_user_ids', e.target.value)}
                    placeholder="es. user-uuid-1, user-uuid-2"
                    className="w-full px-4 py-2.5 bg-slate-700/50 border border-slate-600/50 rounded-lg text-white placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-teal-500/50 focus:border-teal-500/50 transition-colors"
                  />
                  <p className="text-xs text-slate-500 mt-1.5">Inserisci gli UUID degli utenti separati da virgola.</p>
                </div>
              )}

              {/* Date range */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-slate-300 mb-1.5">Data Inizio</label>
                  <input
                    type="datetime-local"
                    value={form.data_inizio}
                    onChange={e => updateField('data_inizio', e.target.value)}
                    className="w-full px-4 py-2.5 bg-slate-700/50 border border-slate-600/50 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-teal-500/50 focus:border-teal-500/50 transition-colors [color-scheme:dark]"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-slate-300 mb-1.5">Data Fine (opzionale)</label>
                  <input
                    type="datetime-local"
                    value={form.data_fine}
                    onChange={e => updateField('data_fine', e.target.value)}
                    className="w-full px-4 py-2.5 bg-slate-700/50 border border-slate-600/50 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-teal-500/50 focus:border-teal-500/50 transition-colors [color-scheme:dark]"
                  />
                </div>
              </div>

              {/* Stato */}
              <div>
                <label className="block text-sm font-medium text-slate-300 mb-1.5">Stato</label>
                <select
                  value={form.stato}
                  onChange={e => updateField('stato', e.target.value)}
                  className="w-full px-4 py-2.5 bg-slate-700/50 border border-slate-600/50 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-teal-500/50 focus:border-teal-500/50 transition-colors appearance-none"
                >
                  {STATO_OPTIONS.map(o => (
                    <option key={o.value} value={o.value} className="bg-slate-800">{o.label}</option>
                  ))}
                </select>
              </div>
            </div>

            {/* Modal Footer */}
            <div className="flex items-center justify-end gap-3 p-5 border-t border-slate-700/50">
              <button
                onClick={closeModal}
                disabled={saving}
                className="px-4 py-2.5 bg-slate-700/50 hover:bg-slate-600/50 text-slate-300 hover:text-white rounded-lg transition-colors text-sm font-medium border border-slate-600/50 disabled:opacity-50"
              >
                Annulla
              </button>
              <button
                onClick={() => handleSave('bozza')}
                disabled={saving}
                className="px-4 py-2.5 bg-slate-600/60 hover:bg-slate-500/60 text-white rounded-lg transition-colors text-sm font-medium border border-slate-500/40 disabled:opacity-50 flex items-center gap-2"
              >
                {saving && (
                  <div className="w-4 h-4 border-2 border-white/40 border-t-white rounded-full animate-spin" />
                )}
                Salva Bozza
              </button>
              <button
                onClick={() => handleSave('attivo')}
                disabled={saving}
                className="px-4 py-2.5 bg-teal-600 hover:bg-teal-500 text-white rounded-lg transition-colors text-sm font-medium shadow-lg shadow-teal-900/30 disabled:opacity-50 flex items-center gap-2"
              >
                {saving && (
                  <div className="w-4 h-4 border-2 border-white/40 border-t-white rounded-full animate-spin" />
                )}
                Pubblica
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
