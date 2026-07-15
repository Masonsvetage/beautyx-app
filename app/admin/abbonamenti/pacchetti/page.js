'use client'

import { useState, useEffect, useCallback } from 'react'
import { useAuth } from '@/contexts/AuthContext'
import { useRouter } from 'next/navigation'
import Link from 'next/link'

const TIPO_OPTIONS = [
  { value: 'token_ai', label: 'Token AI', color: 'teal' },
  { value: 'ore_hpa', label: 'Ore HPA', color: 'purple' },
  { value: 'upgrade_temporaneo', label: 'Upgrade Temporaneo', color: 'amber' }
]

const EMPTY_FORM = {
  codice: '',
  nome: '',
  descrizione: '',
  tipo: 'token_ai',
  token_ai_bonus: 0,
  ore_hpa_bonus: 0,
  piano_upgrade_codice: '',
  durata_giorni: 30,
  prezzo: '',
  prezzo_originale: '',
  ordine: 0
}

function getTipoBadge(tipo) {
  switch (tipo) {
    case 'token_ai':
      return { label: 'Token AI', classes: 'bg-teal-500/20 text-teal-300 border border-teal-500/30' }
    case 'ore_hpa':
      return { label: 'Ore HPA', classes: 'bg-purple-500/20 text-purple-300 border border-purple-500/30' }
    case 'upgrade_temporaneo':
      return { label: 'Upgrade Temporaneo', classes: 'bg-amber-500/20 text-amber-300 border border-amber-500/30' }
    default:
      return { label: tipo, classes: 'bg-slate-500/20 text-slate-300 border border-slate-500/30' }
  }
}

export default function AdminAddonPackagesPage() {
  const { profile, loading: authLoading } = useAuth()
  const router = useRouter()

  const [packages, setPackages] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)

  // Modal state
  const [showModal, setShowModal] = useState(false)
  const [editingPackage, setEditingPackage] = useState(null)
  const [form, setForm] = useState({ ...EMPTY_FORM })
  const [saving, setSaving] = useState(false)
  const [formError, setFormError] = useState(null)

  // Confirmation dialog state
  const [confirmDialog, setConfirmDialog] = useState(null)

  // Auth guard
  useEffect(() => {
    if (!authLoading && (!profile || profile.ruolo_livello !== 'admin')) {
      router.push('/login')
    }
  }, [authLoading, profile, router])

  const loadPackages = useCallback(async () => {
    try {
      setError(null)
      const res = await fetch('/api/admin/addon-packages')
      if (!res.ok) {
        throw new Error(`Errore ${res.status}: ${res.statusText}`)
      }
      const json = await res.json()
      setPackages(json.data || [])
    } catch (err) {
      console.error('Errore caricamento pacchetti:', err)
      setError('Impossibile caricare i pacchetti addon. Riprova.')
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    if (profile?.ruolo_livello === 'admin') {
      loadPackages()
    }
  }, [profile, loadPackages])

  // Open create modal
  const handleCreate = () => {
    setEditingPackage(null)
    setForm({ ...EMPTY_FORM })
    setFormError(null)
    setShowModal(true)
  }

  // Open edit modal
  const handleEdit = (pkg) => {
    setEditingPackage(pkg)
    setForm({
      codice: pkg.codice || '',
      nome: pkg.nome || '',
      descrizione: pkg.descrizione || '',
      tipo: pkg.tipo || 'token_ai',
      token_ai_bonus: pkg.token_ai_bonus || 0,
      ore_hpa_bonus: pkg.ore_hpa_bonus || 0,
      piano_upgrade_codice: pkg.piano_upgrade_codice || '',
      durata_giorni: pkg.durata_giorni || 30,
      prezzo: pkg.prezzo || '',
      prezzo_originale: pkg.prezzo_originale || '',
      ordine: pkg.ordine || 0
    })
    setFormError(null)
    setShowModal(true)
  }

  // Close modal
  const handleCloseModal = () => {
    setShowModal(false)
    setEditingPackage(null)
    setForm({ ...EMPTY_FORM })
    setFormError(null)
  }

  // Save (create or update)
  const handleSave = async () => {
    // Validation
    if (!form.codice.trim()) {
      setFormError('Il codice e obbligatorio')
      return
    }
    if (!form.nome.trim()) {
      setFormError('Il nome e obbligatorio')
      return
    }
    if (!form.prezzo || parseFloat(form.prezzo) < 0) {
      setFormError('Il prezzo e obbligatorio e deve essere >= 0')
      return
    }

    setSaving(true)
    setFormError(null)

    try {
      const payload = {
        codice: form.codice.trim(),
        nome: form.nome.trim(),
        descrizione: form.descrizione.trim() || null,
        tipo: form.tipo,
        token_ai_bonus: form.tipo === 'token_ai' ? parseInt(form.token_ai_bonus) || 0 : 0,
        ore_hpa_bonus: form.tipo === 'ore_hpa' ? parseFloat(form.ore_hpa_bonus) || 0 : 0,
        piano_upgrade_codice: form.tipo === 'upgrade_temporaneo' ? (form.piano_upgrade_codice.trim() || null) : null,
        durata_giorni: form.tipo === 'upgrade_temporaneo' ? parseInt(form.durata_giorni) || 30 : 30,
        prezzo: parseFloat(form.prezzo),
        prezzo_originale: form.prezzo_originale ? parseFloat(form.prezzo_originale) : null,
        ordine: parseInt(form.ordine) || 0
      }

      let res
      if (editingPackage) {
        // Update
        payload.id = editingPackage.id
        res = await fetch('/api/admin/addon-packages', {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(payload)
        })
      } else {
        // Create
        res = await fetch('/api/admin/addon-packages', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(payload)
        })
      }

      if (!res.ok) {
        const errData = await res.json().catch(() => ({}))
        throw new Error(errData.error || `Errore ${res.status}`)
      }

      handleCloseModal()
      await loadPackages()
    } catch (err) {
      console.error('Errore salvataggio:', err)
      setFormError(err.message || 'Errore nel salvataggio')
    } finally {
      setSaving(false)
    }
  }

  // Deactivate with confirmation
  const handleDeactivate = (pkg) => {
    setConfirmDialog({
      title: 'Disattiva Pacchetto',
      message: `Sei sicuro di voler disattivare il pacchetto "${pkg.nome}"? Il pacchetto non sara piu disponibile per l'acquisto.`,
      onConfirm: async () => {
        try {
          const res = await fetch(`/api/admin/addon-packages?id=${pkg.id}`, {
            method: 'DELETE'
          })
          if (!res.ok) {
            const errData = await res.json().catch(() => ({}))
            throw new Error(errData.error || `Errore ${res.status}`)
          }
          setConfirmDialog(null)
          await loadPackages()
        } catch (err) {
          console.error('Errore disattivazione:', err)
          setError('Errore nella disattivazione del pacchetto')
          setConfirmDialog(null)
        }
      }
    })
  }

  // Reactivate
  const handleReactivate = async (pkg) => {
    try {
      const res = await fetch('/api/admin/addon-packages', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id: pkg.id, attivo: true })
      })
      if (!res.ok) {
        const errData = await res.json().catch(() => ({}))
        throw new Error(errData.error || `Errore ${res.status}`)
      }
      await loadPackages()
    } catch (err) {
      console.error('Errore riattivazione:', err)
      setError('Errore nella riattivazione del pacchetto')
    }
  }

  // Form field update helper
  const updateForm = (field, value) => {
    setForm(prev => ({ ...prev, [field]: value }))
    if (formError) setFormError(null)
  }

  // Loading / Auth check
  if (authLoading || loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900 flex items-center justify-center">
        <div className="text-center">
          <div className="w-12 h-12 border-4 border-teal-500 border-t-transparent rounded-full animate-spin mx-auto"></div>
          <p className="mt-4 text-slate-400">Caricamento pacchetti addon...</p>
        </div>
      </div>
    )
  }

  if (!profile || profile.ruolo_livello !== 'admin') {
    return null
  }

  const activePackages = packages.filter(p => p.attivo !== false)
  const inactivePackages = packages.filter(p => p.attivo === false)

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900 p-4 md:p-6">
      <div className="max-w-6xl mx-auto space-y-6">

        {/* Header */}
        <div className="bg-slate-950/60 backdrop-blur-md rounded-xl border border-slate-700/50 p-4">
          <div className="flex items-center justify-between flex-wrap gap-4">
            <div className="flex items-center gap-3">
              <Link
                href="/admin/abbonamenti"
                className="text-slate-400 hover:text-white transition-colors"
              >
                <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
                </svg>
              </Link>
              <div>
                <h1 className="text-2xl font-bold text-white">Gestione Pacchetti Addon</h1>
                <p className="text-sm text-slate-400">
                  Crea e gestisci i pacchetti aggiuntivi (Token AI, Ore HPA, Upgrade)
                </p>
              </div>
            </div>
            <button
              onClick={handleCreate}
              className="flex items-center gap-2 px-4 py-2.5 bg-teal-600 hover:bg-teal-500 text-white font-medium rounded-lg transition-colors"
            >
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
              </svg>
              Nuovo Pacchetto
            </button>
          </div>
        </div>

        {/* Error Alert */}
        {error && (
          <div className="bg-red-500/10 border border-red-500/30 rounded-xl p-4 flex items-center justify-between">
            <p className="text-red-300 text-sm">{error}</p>
            <button onClick={() => setError(null)} className="text-red-400 hover:text-red-300">
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>
        )}

        {/* Active Packages */}
        {activePackages.length === 0 && inactivePackages.length === 0 ? (
          <div className="bg-slate-800/60 border border-slate-700/50 rounded-xl p-12 text-center">
            <svg className="w-16 h-16 text-slate-600 mx-auto mb-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M20 7l-8-4-8 4m16 0l-8 4m8-4v10l-8 4m0-10L4 7m8 4v10M4 7v10l8 4" />
            </svg>
            <p className="text-slate-400 mb-2">Nessun pacchetto addon configurato</p>
            <p className="text-sm text-slate-500 mb-6">Crea il primo pacchetto addon per iniziare</p>
            <button
              onClick={handleCreate}
              className="px-6 py-2.5 bg-teal-600 hover:bg-teal-500 text-white font-medium rounded-lg transition-colors"
            >
              Crea Primo Pacchetto
            </button>
          </div>
        ) : (
          <>
            {/* Active Packages Grid */}
            {activePackages.length > 0 && (
              <div>
                <h2 className="text-lg font-semibold text-white mb-4">
                  Pacchetti Attivi ({activePackages.length})
                </h2>
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                  {activePackages.map(pkg => (
                    <PackageCard
                      key={pkg.id}
                      pkg={pkg}
                      onEdit={handleEdit}
                      onDeactivate={handleDeactivate}
                    />
                  ))}
                </div>
              </div>
            )}

            {/* Inactive Packages */}
            {inactivePackages.length > 0 && (
              <div>
                <h2 className="text-lg font-semibold text-slate-400 mb-4">
                  Pacchetti Disattivati ({inactivePackages.length})
                </h2>
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                  {inactivePackages.map(pkg => (
                    <PackageCard
                      key={pkg.id}
                      pkg={pkg}
                      onEdit={handleEdit}
                      onReactivate={handleReactivate}
                      inactive
                    />
                  ))}
                </div>
              </div>
            )}
          </>
        )}
      </div>

      {/* Create/Edit Modal */}
      {showModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={handleCloseModal} />
          <div className="relative bg-slate-800 border border-slate-700 rounded-xl w-full max-w-lg max-h-[90vh] overflow-y-auto">
            {/* Modal Header */}
            <div className="sticky top-0 bg-slate-800 border-b border-slate-700 px-6 py-4 rounded-t-xl z-10">
              <div className="flex items-center justify-between">
                <h2 className="text-xl font-bold text-white">
                  {editingPackage ? 'Modifica Pacchetto' : 'Nuovo Pacchetto'}
                </h2>
                <button onClick={handleCloseModal} className="text-slate-400 hover:text-white transition-colors">
                  <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                  </svg>
                </button>
              </div>
            </div>

            {/* Modal Body */}
            <div className="px-6 py-4 space-y-4">
              {formError && (
                <div className="bg-red-500/10 border border-red-500/30 rounded-lg p-3 text-red-300 text-sm">
                  {formError}
                </div>
              )}

              {/* Codice */}
              <div>
                <label className="block text-sm font-medium text-slate-300 mb-1">
                  Codice <span className="text-red-400">*</span>
                </label>
                <input
                  type="text"
                  value={form.codice}
                  onChange={(e) => updateForm('codice', e.target.value)}
                  placeholder="es. addon_token_500"
                  className="w-full px-3 py-2.5 bg-slate-900/50 border border-slate-600 text-white rounded-lg focus:ring-2 focus:ring-teal-500 focus:border-teal-500 outline-none placeholder-slate-500 transition-colors"
                />
              </div>

              {/* Nome */}
              <div>
                <label className="block text-sm font-medium text-slate-300 mb-1">
                  Nome <span className="text-red-400">*</span>
                </label>
                <input
                  type="text"
                  value={form.nome}
                  onChange={(e) => updateForm('nome', e.target.value)}
                  placeholder="es. Pacchetto 500 Token AI"
                  className="w-full px-3 py-2.5 bg-slate-900/50 border border-slate-600 text-white rounded-lg focus:ring-2 focus:ring-teal-500 focus:border-teal-500 outline-none placeholder-slate-500 transition-colors"
                />
              </div>

              {/* Descrizione */}
              <div>
                <label className="block text-sm font-medium text-slate-300 mb-1">Descrizione</label>
                <textarea
                  value={form.descrizione}
                  onChange={(e) => updateForm('descrizione', e.target.value)}
                  placeholder="Descrizione opzionale del pacchetto..."
                  rows={3}
                  className="w-full px-3 py-2.5 bg-slate-900/50 border border-slate-600 text-white rounded-lg focus:ring-2 focus:ring-teal-500 focus:border-teal-500 outline-none placeholder-slate-500 transition-colors resize-none"
                />
              </div>

              {/* Tipo */}
              <div>
                <label className="block text-sm font-medium text-slate-300 mb-1">Tipo</label>
                <select
                  value={form.tipo}
                  onChange={(e) => updateForm('tipo', e.target.value)}
                  className="w-full px-3 py-2.5 bg-slate-900/50 border border-slate-600 text-white rounded-lg focus:ring-2 focus:ring-teal-500 focus:border-teal-500 outline-none transition-colors"
                >
                  {TIPO_OPTIONS.map(opt => (
                    <option key={opt.value} value={opt.value}>{opt.label}</option>
                  ))}
                </select>
              </div>

              {/* Conditional Fields based on tipo */}
              {form.tipo === 'token_ai' && (
                <div>
                  <label className="block text-sm font-medium text-slate-300 mb-1">
                    Token AI Bonus
                  </label>
                  <input
                    type="number"
                    value={form.token_ai_bonus}
                    onChange={(e) => updateForm('token_ai_bonus', e.target.value)}
                    min="0"
                    placeholder="es. 500"
                    className="w-full px-3 py-2.5 bg-slate-900/50 border border-slate-600 text-white rounded-lg focus:ring-2 focus:ring-teal-500 focus:border-teal-500 outline-none placeholder-slate-500 transition-colors"
                  />
                  <p className="mt-1 text-xs text-slate-500">Numero di token AI inclusi nel pacchetto</p>
                </div>
              )}

              {form.tipo === 'ore_hpa' && (
                <div>
                  <label className="block text-sm font-medium text-slate-300 mb-1">
                    Ore HPA Bonus
                  </label>
                  <input
                    type="number"
                    value={form.ore_hpa_bonus}
                    onChange={(e) => updateForm('ore_hpa_bonus', e.target.value)}
                    min="0"
                    step="0.5"
                    placeholder="es. 5"
                    className="w-full px-3 py-2.5 bg-slate-900/50 border border-slate-600 text-white rounded-lg focus:ring-2 focus:ring-teal-500 focus:border-teal-500 outline-none placeholder-slate-500 transition-colors"
                  />
                  <p className="mt-1 text-xs text-slate-500">Ore di consulenza HPA incluse nel pacchetto</p>
                </div>
              )}

              {form.tipo === 'upgrade_temporaneo' && (
                <>
                  <div>
                    <label className="block text-sm font-medium text-slate-300 mb-1">
                      Piano Upgrade (codice)
                    </label>
                    <input
                      type="text"
                      value={form.piano_upgrade_codice}
                      onChange={(e) => updateForm('piano_upgrade_codice', e.target.value)}
                      placeholder="es. professional"
                      className="w-full px-3 py-2.5 bg-slate-900/50 border border-slate-600 text-white rounded-lg focus:ring-2 focus:ring-teal-500 focus:border-teal-500 outline-none placeholder-slate-500 transition-colors"
                    />
                    <p className="mt-1 text-xs text-slate-500">Codice del piano a cui effettuare l'upgrade temporaneo</p>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-slate-300 mb-1">
                      Durata (giorni)
                    </label>
                    <input
                      type="number"
                      value={form.durata_giorni}
                      onChange={(e) => updateForm('durata_giorni', e.target.value)}
                      min="1"
                      placeholder="es. 30"
                      className="w-full px-3 py-2.5 bg-slate-900/50 border border-slate-600 text-white rounded-lg focus:ring-2 focus:ring-teal-500 focus:border-teal-500 outline-none placeholder-slate-500 transition-colors"
                    />
                    <p className="mt-1 text-xs text-slate-500">Durata in giorni dell'upgrade temporaneo</p>
                  </div>
                </>
              )}

              {/* Prezzo */}
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-slate-300 mb-1">
                    Prezzo <span className="text-red-400">*</span>
                  </label>
                  <div className="relative">
                    <span className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 text-sm">EUR</span>
                    <input
                      type="number"
                      value={form.prezzo}
                      onChange={(e) => updateForm('prezzo', e.target.value)}
                      min="0"
                      step="0.01"
                      placeholder="0.00"
                      className="w-full pl-12 pr-3 py-2.5 bg-slate-900/50 border border-slate-600 text-white rounded-lg focus:ring-2 focus:ring-teal-500 focus:border-teal-500 outline-none placeholder-slate-500 transition-colors"
                    />
                  </div>
                </div>
                <div>
                  <label className="block text-sm font-medium text-slate-300 mb-1">
                    Prezzo Originale
                  </label>
                  <div className="relative">
                    <span className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 text-sm">EUR</span>
                    <input
                      type="number"
                      value={form.prezzo_originale}
                      onChange={(e) => updateForm('prezzo_originale', e.target.value)}
                      min="0"
                      step="0.01"
                      placeholder="0.00"
                      className="w-full pl-12 pr-3 py-2.5 bg-slate-900/50 border border-slate-600 text-white rounded-lg focus:ring-2 focus:ring-teal-500 focus:border-teal-500 outline-none placeholder-slate-500 transition-colors"
                    />
                  </div>
                  <p className="mt-1 text-xs text-slate-500">Prezzo barrato (opzionale)</p>
                </div>
              </div>

              {/* Ordine */}
              <div>
                <label className="block text-sm font-medium text-slate-300 mb-1">Ordine</label>
                <input
                  type="number"
                  value={form.ordine}
                  onChange={(e) => updateForm('ordine', e.target.value)}
                  min="0"
                  placeholder="0"
                  className="w-full px-3 py-2.5 bg-slate-900/50 border border-slate-600 text-white rounded-lg focus:ring-2 focus:ring-teal-500 focus:border-teal-500 outline-none placeholder-slate-500 transition-colors"
                />
                <p className="mt-1 text-xs text-slate-500">Ordine di visualizzazione (0 = primo)</p>
              </div>
            </div>

            {/* Modal Footer */}
            <div className="sticky bottom-0 bg-slate-800 border-t border-slate-700 px-6 py-4 rounded-b-xl flex items-center justify-end gap-3">
              <button
                onClick={handleCloseModal}
                disabled={saving}
                className="px-4 py-2.5 text-slate-300 hover:text-white border border-slate-600 hover:border-slate-500 rounded-lg transition-colors disabled:opacity-50"
              >
                Annulla
              </button>
              <button
                onClick={handleSave}
                disabled={saving}
                className="flex items-center gap-2 px-6 py-2.5 bg-teal-600 hover:bg-teal-500 text-white font-medium rounded-lg transition-colors disabled:opacity-50"
              >
                {saving ? (
                  <>
                    <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                    Salvataggio...
                  </>
                ) : (
                  editingPackage ? 'Aggiorna' : 'Crea Pacchetto'
                )}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Confirmation Dialog */}
      {confirmDialog && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={() => setConfirmDialog(null)} />
          <div className="relative bg-slate-800 border border-slate-700 rounded-xl w-full max-w-md p-6">
            <div className="flex items-start gap-4">
              <div className="w-10 h-10 bg-red-500/20 rounded-full flex items-center justify-center flex-shrink-0">
                <svg className="w-5 h-5 text-red-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
                </svg>
              </div>
              <div className="flex-1">
                <h3 className="text-lg font-semibold text-white mb-2">{confirmDialog.title}</h3>
                <p className="text-sm text-slate-400">{confirmDialog.message}</p>
              </div>
            </div>
            <div className="mt-6 flex items-center justify-end gap-3">
              <button
                onClick={() => setConfirmDialog(null)}
                className="px-4 py-2 text-slate-300 hover:text-white border border-slate-600 hover:border-slate-500 rounded-lg transition-colors"
              >
                Annulla
              </button>
              <button
                onClick={confirmDialog.onConfirm}
                className="px-4 py-2 bg-red-600 hover:bg-red-500 text-white font-medium rounded-lg transition-colors"
              >
                Disattiva
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

// Package Card Component
function PackageCard({ pkg, onEdit, onDeactivate, onReactivate, inactive }) {
  const badge = getTipoBadge(pkg.tipo)

  return (
    <div className={`bg-slate-800/60 border rounded-xl p-4 transition-all ${
      inactive
        ? 'border-slate-700/30 opacity-60'
        : 'border-slate-700/50 hover:border-slate-600/50'
    }`}>
      {/* Top Row: Name + Badge */}
      <div className="flex items-start justify-between gap-2 mb-3">
        <div className="flex-1 min-w-0">
          <h3 className="text-white font-semibold truncate">{pkg.nome}</h3>
          <p className="text-xs text-slate-500 font-mono mt-0.5">{pkg.codice}</p>
        </div>
        <div className="flex items-center gap-2 flex-shrink-0">
          <span className={`inline-flex px-2 py-0.5 rounded-full text-xs font-medium ${badge.classes}`}>
            {badge.label}
          </span>
          <span className={`inline-flex px-2 py-0.5 rounded-full text-xs font-medium ${
            pkg.attivo !== false
              ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/30'
              : 'bg-slate-600/20 text-slate-400 border border-slate-600/30'
          }`}>
            {pkg.attivo !== false ? 'Attivo' : 'Disattivato'}
          </span>
        </div>
      </div>

      {/* Description */}
      {pkg.descrizione && (
        <p className="text-sm text-slate-400 mb-3 line-clamp-2">{pkg.descrizione}</p>
      )}

      {/* Type-specific info */}
      <div className="bg-slate-900/40 rounded-lg p-3 mb-3 space-y-1.5">
        {pkg.tipo === 'token_ai' && (
          <div className="flex items-center justify-between">
            <span className="text-xs text-slate-400">Token AI Bonus</span>
            <span className="text-sm font-semibold text-teal-300">{pkg.token_ai_bonus?.toLocaleString('it-IT') || 0}</span>
          </div>
        )}
        {pkg.tipo === 'ore_hpa' && (
          <div className="flex items-center justify-between">
            <span className="text-xs text-slate-400">Ore HPA Bonus</span>
            <span className="text-sm font-semibold text-purple-300">{pkg.ore_hpa_bonus || 0}h</span>
          </div>
        )}
        {pkg.tipo === 'upgrade_temporaneo' && (
          <>
            <div className="flex items-center justify-between">
              <span className="text-xs text-slate-400">Piano Upgrade</span>
              <span className="text-sm font-semibold text-amber-300">{pkg.piano_upgrade_codice || '-'}</span>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-xs text-slate-400">Durata</span>
              <span className="text-sm font-semibold text-amber-300">{pkg.durata_giorni || 30} giorni</span>
            </div>
          </>
        )}

        {/* Pricing */}
        <div className="flex items-center justify-between pt-1.5 border-t border-slate-700/50">
          <span className="text-xs text-slate-400">Prezzo</span>
          <div className="flex items-center gap-2">
            {pkg.prezzo_originale && parseFloat(pkg.prezzo_originale) > 0 && (
              <span className="text-xs text-slate-500 line-through">
                {parseFloat(pkg.prezzo_originale).toFixed(2)}
              </span>
            )}
            <span className="text-sm font-bold text-white">
              {parseFloat(pkg.prezzo).toFixed(2)}
            </span>
          </div>
        </div>

        {/* Order */}
        <div className="flex items-center justify-between">
          <span className="text-xs text-slate-400">Ordine</span>
          <span className="text-xs text-slate-300">{pkg.ordine || 0}</span>
        </div>
      </div>

      {/* Actions */}
      <div className="flex items-center gap-2">
        <button
          onClick={() => onEdit(pkg)}
          className="flex-1 flex items-center justify-center gap-1.5 px-3 py-2 bg-slate-700/50 hover:bg-slate-700 text-slate-300 hover:text-white text-sm rounded-lg transition-colors"
        >
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
          </svg>
          Modifica
        </button>
        {inactive && onReactivate ? (
          <button
            onClick={() => onReactivate(pkg)}
            className="flex-1 flex items-center justify-center gap-1.5 px-3 py-2 bg-emerald-600/20 hover:bg-emerald-600/30 text-emerald-400 text-sm rounded-lg transition-colors"
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
            </svg>
            Riattiva
          </button>
        ) : onDeactivate ? (
          <button
            onClick={() => onDeactivate(pkg)}
            className="flex-1 flex items-center justify-center gap-1.5 px-3 py-2 bg-red-600/20 hover:bg-red-600/30 text-red-400 text-sm rounded-lg transition-colors"
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M18.364 18.364A9 9 0 005.636 5.636m12.728 12.728A9 9 0 015.636 5.636m12.728 12.728L5.636 5.636" />
            </svg>
            Disattiva
          </button>
        ) : null}
      </div>
    </div>
  )
}
