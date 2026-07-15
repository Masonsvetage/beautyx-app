'use client'

import { useState, useEffect, use } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { useAuth } from '@/contexts/AuthContext'
import { supabase } from '@/lib/supabase'

const RUOLI_GERARCHICI = [
  { value: 'admin', label: 'Admin', color: 'emerald' },
  { value: 'hpa', label: 'HPA (Consulente)', color: 'purple' },
  { value: 'titolare', label: 'Titolare', color: 'cyan' },
  { value: 'direttore', label: 'Direttore', color: 'blue' },
  { value: 'amministrativo', label: 'Amministrativo', color: 'amber' }
]

const TABS = [
  { id: 'anagrafica', label: 'Anagrafica', icon: '👤' },
  { id: 'recapiti', label: 'Recapiti', icon: '📞' },
  { id: 'indirizzi', label: 'Indirizzi', icon: '🏠' },
  { id: 'ruoli', label: 'Ruoli & Profili', icon: '🎭' },
  { id: 'legale', label: 'Accettazioni Legali', icon: '📜' },
  { id: 'report_hpa', label: 'Report HPA', icon: '📋' },
  { id: 'abbonamento', label: 'Abbonamento', icon: '💳' }
]

export default function UserDetailPage({ params }) {
  const { id } = use(params)
  const router = useRouter()
  const { isAdmin } = useAuth()

  const [user, setUser] = useState(null)
  const [userRoles, setUserRoles] = useState([])
  const [centri, setCentri] = useState([])
  const [organizations, setOrganizations] = useState([])
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [activeTab, setActiveTab] = useState('anagrafica')
  const [showAddRoleModal, setShowAddRoleModal] = useState(false)
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false)
  const [deletingUser, setDeletingUser] = useState(false)
  const [showResetPassword, setShowResetPassword] = useState(false)
  const [resetPwData, setResetPwData] = useState({ password: '', confirm: '' })
  const [resetPwLoading, setResetPwLoading] = useState(false)
  const [resetPwSuccess, setResetPwSuccess] = useState(null)
  const [legalData, setLegalData] = useState(null)
  const [legalLoading, setLegalLoading] = useState(false)
  const [hpaReports, setHpaReports] = useState(null)
  const [hpaReportsLoading, setHpaReportsLoading] = useState(false)
  const [availablePlans, setAvailablePlans] = useState([])
  const [userSubscription, setUserSubscription] = useState(null)
  const [selectedPlan, setSelectedPlan] = useState('')
  const [assignNote, setAssignNote] = useState('')
  const [assigningPlan, setAssigningPlan] = useState(false)
  const [assignError, setAssignError] = useState(null)
  const [assignSuccess, setAssignSuccess] = useState(null)

  // Form state
  const [formData, setFormData] = useState({})

  useEffect(() => {
    loadData()
  }, [id])

  const loadData = async () => {
    try {
      // Carica profilo utente
      const { data: userData, error: userError } = await supabase
        .from('user_profiles')
        .select('*')
        .eq('id', id)
        .single()

      if (userError) throw userError
      setUser(userData)
      setFormData(userData || {})

      // Carica ruoli utente
      let rolesData = []
      try {
        const { data } = await supabase.rpc('get_user_all_roles', {
          p_user_id: id
        })
        rolesData = data || []
      } catch {
        rolesData = []
      }

      setUserRoles(rolesData || [])

      // Carica centri
      const { data: centriData } = await supabase
        .from('beauty_centers')
        .select('id, nome, citta')
        .order('nome')

      setCentri(centriData || [])

      // Carica organizzazioni
      const { data: orgsData } = await supabase
        .from('organizations')
        .select('id, nome')
        .order('nome')

      setOrganizations(orgsData || [])

      // Carica piani disponibili
      const plansRes = await fetch('/api/subscriptions/plans')
      const plansData = await plansRes.json()
      const plans = (plansData.plans || []).filter(p => !p.is_free && p.attivo !== false)
      setAvailablePlans(plans)

      // Carica abbonamento corrente dell'utente
      const subRes = await fetch(`/api/admin/subscriptions?user_id_exact=${id}`)
      if (subRes.ok) {
        const subData = await subRes.json()
        const sub = (subData.subscriptions || []).find(s => s.user_id === id)
        if (sub) {
          setUserSubscription(sub)
          setSelectedPlan(sub.plan?.codice || '')
        }
      }
    } catch (error) {
      console.error('Errore caricamento:', error)
    } finally {
      setLoading(false)
    }
  }

  const handleAssignPlan = async () => {
    if (!selectedPlan) return
    setAssigningPlan(true)
    setAssignError(null)
    setAssignSuccess(null)
    try {
      const res = await fetch('/api/admin/subscriptions', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          user_id: id,
          plan_codice: selectedPlan,
          note_admin: assignNote || null,
          is_free: false
        })
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error || 'Errore assegnazione piano')
      setAssignSuccess(`Piano "${selectedPlan}" assegnato correttamente.`)
      setUserSubscription(data.subscription)
      // Aggiorna anche il formData per coerenza visiva
      setFormData(prev => ({ ...prev, piano: selectedPlan }))
    } catch (err) {
      setAssignError(err.message)
    } finally {
      setAssigningPlan(false)
    }
  }

  const handleChange = (field, value) => {
    setFormData(prev => ({ ...prev, [field]: value }))
  }

  const handleSave = async () => {
    setSaving(true)
    try {
      // Rimuovi campi che non devono essere aggiornati
      // piano è gestito esclusivamente via /api/admin/subscriptions per mantenere user_subscriptions sincronizzato
      const { id: _, created_at, updated_at, centro, organization, piano, ...updateData } = formData

      const { error } = await supabase
        .from('user_profiles')
        .update(updateData)
        .eq('id', id)

      if (error) throw error

      alert('Salvato con successo!')
      setUser(formData)
    } catch (error) {
      console.error('Errore salvataggio:', error)
      alert('Errore: ' + error.message)
    } finally {
      setSaving(false)
    }
  }

  const handleDeleteUser = async () => {
    setDeletingUser(true)
    try {
      const response = await fetch(`/api/admin/users/${id}`, {
        method: 'DELETE'
      })
      const data = await response.json()
      if (!response.ok) throw new Error(data.error)

      router.push('/admin/users')
    } catch (error) {
      console.error('Errore eliminazione:', error)
      alert('Errore durante l\'eliminazione: ' + error.message)
      setShowDeleteConfirm(false)
    } finally {
      setDeletingUser(false)
    }
  }

  const generateRandomPassword = () => {
    const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZabcdefghjkmnpqrstuvwxyz23456789'
    const specials = '!@#$%&*'
    let pw = ''
    for (let i = 0; i < 10; i++) pw += chars[Math.floor(Math.random() * chars.length)]
    pw += specials[Math.floor(Math.random() * specials.length)]
    // Mescola
    pw = pw.split('').sort(() => Math.random() - 0.5).join('')
    setResetPwData({ password: pw, confirm: pw })
  }

  const handleResetPassword = async () => {
    if (resetPwData.password.length < 8) {
      alert('La password deve essere di almeno 8 caratteri')
      return
    }
    if (resetPwData.password !== resetPwData.confirm) {
      alert('Le password non coincidono')
      return
    }
    setResetPwLoading(true)
    try {
      const response = await fetch(`/api/admin/users/${id}/reset-password`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ password: resetPwData.password })
      })
      const data = await response.json()
      if (!response.ok) throw new Error(data.error)
      setResetPwSuccess(resetPwData.password)
    } catch (error) {
      console.error('Errore reset password:', error)
      alert('Errore: ' + error.message)
    } finally {
      setResetPwLoading(false)
    }
  }

  const handleAddRole = async (roleData) => {
    try {
      const { data, error } = await supabase.rpc('add_user_role', {
        p_user_id: id,
        p_role_type: roleData.role_type,
        p_centro_id: roleData.centro_id || null,
        p_organization_id: roleData.organization_id || null,
        p_is_primary: roleData.is_primary || false
      })

      if (error) {
        // Fallback: inserisci direttamente
        await supabase.from('user_roles').insert({
          user_id: id,
          role_type: roleData.role_type,
          centro_id: roleData.centro_id || null,
          organization_id: roleData.organization_id || null,
          is_primary: roleData.is_primary || false
        })
      }

      await loadData()
      setShowAddRoleModal(false)
    } catch (error) {
      console.error('Errore aggiunta ruolo:', error)
      alert('Errore: ' + error.message)
    }
  }

  const handleSwitchRole = async (roleId) => {
    try {
      await supabase.rpc('switch_user_role', {
        p_user_id: id,
        p_role_id: roleId
      })
      await loadData()
    } catch (error) {
      console.error('Errore switch ruolo:', error)
    }
  }

  const handleRemoveRole = async (roleId) => {
    if (!confirm('Rimuovere questo ruolo?')) return

    try {
      await supabase
        .from('user_roles')
        .update({ is_active: false })
        .eq('id', roleId)

      await loadData()
    } catch (error) {
      console.error('Errore rimozione ruolo:', error)
    }
  }

  // Carica storico accettazioni legali quando si attiva il tab
  useEffect(() => {
    if (activeTab === 'legale' && !legalData && !legalLoading) {
      setLegalLoading(true)
      fetch(`/api/admin/legal-documents/acceptances?user_id=${id}`)
        .then(res => res.ok ? res.json() : null)
        .then(json => {
          const raw = json?.data || {}
          const acceptances = raw.acceptances || []
          const clauseAcc = raw.clause_acceptances || []

          // Arricchisci ogni accettazione con le clausole correlate
          const enriched = acceptances.map(acc => {
            const doc = acc.document || {}
            const relatedClauses = clauseAcc
              .filter(ca => ca.clause?.document_id === acc.document_id)
              .map(ca => ({ titolo: ca.clause?.titolo, accettato_il: ca.accettato_il }))

            return {
              tipo: doc.tipo,
              versione: doc.versione,
              titolo: doc.titolo,
              accettato_il: acc.accettato_il,
              ip_address: acc.ip_address,
              clausole_accettate: relatedClauses
            }
          })

          setLegalData(enriched)
        })
        .catch(() => setLegalData([]))
        .finally(() => setLegalLoading(false))
    }
  }, [activeTab, id, legalData, legalLoading])

  // Carica report HPA quando si attiva il tab
  useEffect(() => {
    if (activeTab === 'report_hpa' && !hpaReports && !hpaReportsLoading && user?.centro_id) {
      setHpaReportsLoading(true)
      fetch(`/api/hpa/reports?centro_id=${user.centro_id}`)
        .then(res => res.ok ? res.json() : null)
        .then(json => setHpaReports(json?.reports || []))
        .catch(() => setHpaReports([]))
        .finally(() => setHpaReportsLoading(false))
    }
  }, [activeTab, user?.centro_id, hpaReports, hpaReportsLoading])

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900 p-6 flex items-center justify-center">
        <div className="text-center">
          <div className="w-12 h-12 border-4 border-teal-500 border-t-transparent rounded-full animate-spin mx-auto"></div>
          <p className="mt-4 text-slate-400">Caricamento utente...</p>
        </div>
      </div>
    )
  }

  if (!user) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900 p-6 flex items-center justify-center">
        <div className="text-center">
          <p className="text-red-400">Utente non trovato</p>
          <Link href="/admin/users" className="text-teal-400 hover:underline mt-2 block">
            Torna alla lista
          </Link>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900 p-6">
      {/* Header */}
      <div className="max-w-5xl mx-auto mb-6">
        <div className="bg-slate-950/60 backdrop-blur-md rounded-xl border border-slate-700/50 p-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              <Link href="/admin/users" className="text-slate-400 hover:text-white transition-colors">
                <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
                </svg>
              </Link>
              <div className="w-16 h-16 bg-gradient-to-br from-teal-500 to-cyan-500 rounded-full flex items-center justify-center text-white text-2xl font-bold">
                {(formData.nome?.[0] || formData.email?.[0] || '?').toUpperCase()}
              </div>
              <div>
                <h1 className="text-2xl font-bold text-white">
                  {formData.nome && formData.cognome
                    ? `${formData.nome} ${formData.cognome}`
                    : formData.email}
                </h1>
                <p className="text-sm text-slate-400">{formData.email}</p>
                <div className="flex gap-2 mt-1">
                  <span className={`px-2 py-0.5 rounded text-xs ${
                    formData.attivo ? 'bg-emerald-500/20 text-emerald-400' : 'bg-red-500/20 text-red-400'
                  }`}>
                    {formData.attivo ? 'Attivo' : 'Disabilitato'}
                  </span>
                  <span className="px-2 py-0.5 rounded text-xs bg-cyan-500/20 text-cyan-400">
                    {formData.ruolo_livello || formData.ruolo}
                  </span>
                  <span className="px-2 py-0.5 rounded text-xs bg-purple-500/20 text-purple-400">
                    Piano: {formData.piano}
                  </span>
                </div>
              </div>
            </div>
            <div className="flex gap-3">
              {formData.ruolo_livello !== 'admin' && (
                <>
                  <button
                    onClick={() => { setResetPwData({ password: '', confirm: '' }); setResetPwSuccess(null); setShowResetPassword(true) }}
                    className="px-4 py-2 bg-amber-500/20 text-amber-400 border border-amber-500/40 rounded-lg hover:bg-amber-500/30 transition-colors flex items-center gap-2"
                  >
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 7a2 2 0 012 2m4 0a6 6 0 01-7.743 5.743L11 17H9v2H7v2H4a1 1 0 01-1-1v-2.586a1 1 0 01.293-.707l5.964-5.964A6 6 0 1121 9z" />
                    </svg>
                    Reset Password
                  </button>
                  <button
                    onClick={() => setShowDeleteConfirm(true)}
                    className="px-4 py-2 bg-red-500/20 text-red-400 border border-red-500/40 rounded-lg hover:bg-red-500/30 transition-colors"
                  >
                    Elimina Utente
                  </button>
                </>
              )}
              <button
                onClick={handleSave}
                disabled={saving}
                className="px-6 py-2 bg-teal-500 text-white rounded-lg hover:bg-teal-600 transition-colors disabled:opacity-50"
              >
                {saving ? 'Salvataggio...' : 'Salva Modifiche'}
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Tabs */}
      <div className="max-w-5xl mx-auto mb-6">
        <div className="flex gap-2 overflow-x-auto pb-2">
          {TABS.map(tab => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium whitespace-nowrap transition-all ${
                activeTab === tab.id
                  ? 'bg-teal-500 text-white'
                  : 'bg-slate-800/50 text-slate-400 hover:text-white hover:bg-slate-700/50'
              }`}
            >
              <span>{tab.icon}</span>
              {tab.label}
            </button>
          ))}
        </div>
      </div>

      {/* Content */}
      <div className="max-w-5xl mx-auto">
        <div className="bg-slate-800/30 backdrop-blur-sm rounded-xl border border-slate-700/50 p-6">

          {/* Tab: Anagrafica */}
          {activeTab === 'anagrafica' && (
            <div className="space-y-6">
              <h3 className="text-lg font-semibold text-white mb-4">Dati Anagrafici</h3>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <InputField label="Nome" value={formData.nome} onChange={(v) => handleChange('nome', v)} />
                <InputField label="Cognome" value={formData.cognome} onChange={(v) => handleChange('cognome', v)} />
                <InputField label="Data di Nascita" type="date" value={formData.data_nascita} onChange={(v) => handleChange('data_nascita', v)} />
                <InputField label="Luogo di Nascita" value={formData.luogo_nascita} onChange={(v) => handleChange('luogo_nascita', v)} />
                <InputField label="Codice Fiscale" value={formData.codice_fiscale} onChange={(v) => handleChange('codice_fiscale', v?.toUpperCase())} maxLength={16} />
                <InputField label="Partita IVA" value={formData.partita_iva} onChange={(v) => handleChange('partita_iva', v)} maxLength={11} />
                <InputField label="Professione" value={formData.professione} onChange={(v) => handleChange('professione', v)} />
                <InputField label="Azienda" value={formData.azienda} onChange={(v) => handleChange('azienda', v)} />
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <SelectField
                  label="Ruolo"
                  value={formData.ruolo_livello || formData.ruolo}
                  onChange={(v) => handleChange('ruolo_livello', v)}
                  options={RUOLI_GERARCHICI.map(r => ({ value: r.value, label: r.label }))}
                />
                <div>
                  <label className="block text-sm font-medium text-slate-400 mb-1">Piano</label>
                  <div className="px-3 py-2 bg-slate-900/60 border border-slate-600/40 rounded-lg text-slate-300 text-sm flex items-center justify-between">
                    <span className="capitalize">{userSubscription?.plan?.nome || formData.piano || 'Demo'}</span>
                    <button
                      type="button"
                      onClick={() => setActiveTab('abbonamento')}
                      className="text-xs text-teal-400 hover:text-teal-300 underline ml-2"
                    >
                      Cambia →
                    </button>
                  </div>
                </div>
              </div>

              <div className="flex items-center gap-4">
                <label className="flex items-center gap-2 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={formData.attivo ?? true}
                    onChange={(e) => handleChange('attivo', e.target.checked)}
                    className="rounded border-slate-600 bg-slate-900 text-teal-500"
                  />
                  <span className="text-slate-300">Account Attivo</span>
                </label>
              </div>
            </div>
          )}

          {/* Tab: Recapiti */}
          {activeTab === 'recapiti' && (
            <div className="space-y-6">
              <h3 className="text-lg font-semibold text-white mb-4">Recapiti</h3>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <InputField label="Email" type="email" value={formData.email} onChange={(v) => handleChange('email', v)} disabled />
                <InputField label="PEC" type="email" value={formData.pec} onChange={(v) => handleChange('pec', v)} placeholder="pec@esempio.it" />
                <InputField label="Telefono Fisso" type="tel" value={formData.telefono_fisso} onChange={(v) => handleChange('telefono_fisso', v)} placeholder="+39 02 1234567" />
                <InputField label="Cellulare" type="tel" value={formData.cellulare || formData.telefono} onChange={(v) => handleChange('cellulare', v)} placeholder="+39 333 1234567" />
                <InputField label="Sito Web" type="url" value={formData.sito_web} onChange={(v) => handleChange('sito_web', v)} placeholder="https://www.esempio.it" />
              </div>
            </div>
          )}

          {/* Tab: Indirizzi */}
          {activeTab === 'indirizzi' && (
            <div className="space-y-6">
              <h3 className="text-lg font-semibold text-white mb-4">Residenza</h3>

              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div className="md:col-span-2">
                  <InputField label="Indirizzo" value={formData.residenza_indirizzo} onChange={(v) => handleChange('residenza_indirizzo', v)} />
                </div>
                <InputField label="Civico" value={formData.residenza_civico} onChange={(v) => handleChange('residenza_civico', v)} />
                <InputField label="CAP" value={formData.residenza_cap} onChange={(v) => handleChange('residenza_cap', v)} maxLength={5} />
                <InputField label="Città" value={formData.residenza_citta} onChange={(v) => handleChange('residenza_citta', v)} />
                <InputField label="Provincia" value={formData.residenza_provincia} onChange={(v) => handleChange('residenza_provincia', v?.toUpperCase())} maxLength={2} />
              </div>

              <div className="border-t border-slate-700 pt-6">
                <label className="flex items-center gap-2 cursor-pointer mb-4">
                  <input
                    type="checkbox"
                    checked={formData.domicilio_diverso ?? false}
                    onChange={(e) => handleChange('domicilio_diverso', e.target.checked)}
                    className="rounded border-slate-600 bg-slate-900 text-teal-500"
                  />
                  <span className="text-slate-300">Domicilio diverso dalla residenza</span>
                </label>

                {formData.domicilio_diverso && (
                  <>
                    <h3 className="text-lg font-semibold text-white mb-4">Domicilio</h3>
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                      <div className="md:col-span-2">
                        <InputField label="Indirizzo" value={formData.domicilio_indirizzo} onChange={(v) => handleChange('domicilio_indirizzo', v)} />
                      </div>
                      <InputField label="Civico" value={formData.domicilio_civico} onChange={(v) => handleChange('domicilio_civico', v)} />
                      <InputField label="CAP" value={formData.domicilio_cap} onChange={(v) => handleChange('domicilio_cap', v)} maxLength={5} />
                      <InputField label="Città" value={formData.domicilio_citta} onChange={(v) => handleChange('domicilio_citta', v)} />
                      <InputField label="Provincia" value={formData.domicilio_provincia} onChange={(v) => handleChange('domicilio_provincia', v?.toUpperCase())} maxLength={2} />
                    </div>
                  </>
                )}
              </div>
            </div>
          )}

          {/* Tab: Ruoli & Profili */}
          {activeTab === 'ruoli' && (
            <div className="space-y-6">
              <div className="flex items-center justify-between">
                <h3 className="text-lg font-semibold text-white">Ruoli & Profili</h3>
                <button
                  onClick={() => setShowAddRoleModal(true)}
                  className="flex items-center gap-2 px-4 py-2 bg-teal-500 text-white rounded-lg hover:bg-teal-600 transition-colors"
                >
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6v6m0 0v6m0-6h6m-6 0H6" />
                  </svg>
                  Aggiungi Ruolo
                </button>
              </div>

              <div className="bg-blue-500/10 border border-blue-500/30 rounded-lg p-4 mb-4">
                <p className="text-sm text-blue-300">
                  Un utente può avere più ruoli/profili. Il ruolo <strong>principale</strong> è quello usato al login.
                  L'utente può switchare tra i propri ruoli dalla dashboard.
                </p>
              </div>

              {userRoles.length > 0 ? (
                <div className="space-y-3">
                  {userRoles.map(role => (
                    <div
                      key={role.role_id}
                      className={`flex items-center justify-between p-4 rounded-lg border ${
                        role.is_primary
                          ? 'bg-teal-500/10 border-teal-500/40'
                          : 'bg-slate-800/50 border-slate-700/50'
                      }`}
                    >
                      <div className="flex items-center gap-4">
                        {role.is_primary && (
                          <span className="text-amber-400 text-xl" title="Ruolo principale">⭐</span>
                        )}
                        <div>
                          <p className="text-white font-medium">
                            {RUOLI_GERARCHICI.find(r => r.value === role.role_type)?.label || role.role_type}
                          </p>
                          <p className="text-sm text-slate-400">
                            {role.centro_nome && `Centro: ${role.centro_nome}`}
                            {role.organization_nome && `Organizzazione: ${role.organization_nome}`}
                            {!role.centro_nome && !role.organization_nome && 'Nessun centro/organizzazione'}
                          </p>
                        </div>
                      </div>
                      <div className="flex items-center gap-2">
                        {!role.is_primary && (
                          <button
                            onClick={() => handleSwitchRole(role.role_id)}
                            className="px-3 py-1 text-sm bg-teal-500/20 text-teal-400 rounded hover:bg-teal-500/30"
                          >
                            Imposta Principale
                          </button>
                        )}
                        <button
                          onClick={() => handleRemoveRole(role.role_id)}
                          className="p-2 text-red-400 hover:bg-red-500/20 rounded"
                        >
                          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                          </svg>
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="text-center py-8 text-slate-400">
                  <p>Nessun ruolo multi-profilo configurato.</p>
                  <p className="text-sm mt-1">L'utente usa il ruolo principale: <span className="text-teal-400">{formData.ruolo_livello || formData.ruolo}</span></p>
                </div>
              )}

              <div className="border-t border-slate-700 pt-6 mt-6">
                <h4 className="text-md font-semibold text-white mb-4">Collegamento Centro/Organizzazione</h4>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <SelectField
                    label="Centro Associato"
                    value={formData.centro_id}
                    onChange={(v) => handleChange('centro_id', v)}
                    options={centri.map(c => ({ value: c.id, label: `${c.nome}${c.citta ? ` (${c.citta})` : ''}` }))}
                    placeholder="Nessun centro"
                  />
                  <SelectField
                    label="Organizzazione"
                    value={formData.organization_id}
                    onChange={(v) => handleChange('organization_id', v)}
                    options={organizations.map(o => ({ value: o.id, label: o.nome }))}
                    placeholder="Nessuna organizzazione"
                  />
                </div>
              </div>
            </div>
          )}

          {/* Tab: Accettazioni Legali */}
          {activeTab === 'legale' && (
            <div className="space-y-6">
              <h3 className="text-lg font-semibold text-white mb-4">Storico Accettazioni Legali</h3>

              {legalLoading ? (
                <div className="text-center py-8">
                  <div className="w-8 h-8 border-4 border-teal-500 border-t-transparent rounded-full animate-spin mx-auto"></div>
                  <p className="mt-2 text-slate-400 text-sm">Caricamento...</p>
                </div>
              ) : legalData && legalData.length > 0 ? (
                <div className="space-y-4">
                  {legalData.map((acc, idx) => (
                    <div key={idx} className="bg-slate-900/50 rounded-lg border border-slate-700/50 p-4">
                      <div className="flex items-center justify-between mb-2">
                        <div className="flex items-center gap-3">
                          <span className={`px-2 py-0.5 rounded text-xs font-medium ${
                            acc.tipo === 'condizioni_contrattuali'
                              ? 'bg-indigo-500/20 text-indigo-400'
                              : 'bg-purple-500/20 text-purple-400'
                          }`}>
                            {acc.tipo === 'condizioni_contrattuali' ? 'Condizioni Contrattuali' : 'Informativa Privacy'}
                          </span>
                          <span className="text-slate-400 text-sm">v{acc.versione}</span>
                        </div>
                        <span className="text-emerald-400 text-sm flex items-center gap-1">
                          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                          </svg>
                          Accettato
                        </span>
                      </div>
                      <p className="text-white text-sm font-medium">{acc.titolo}</p>
                      <p className="text-slate-400 text-xs mt-1">
                        Accettato il: {new Date(acc.accettato_il).toLocaleString('it-IT')}
                      </p>
                      {acc.ip_address && (
                        <p className="text-slate-500 text-xs mt-1">
                          IP: {acc.ip_address}
                        </p>
                      )}
                      {acc.clausole_accettate && acc.clausole_accettate.length > 0 && (
                        <div className="mt-3 border-t border-slate-700 pt-3">
                          <p className="text-xs text-slate-400 font-medium mb-2">Clausole accettate singolarmente:</p>
                          <div className="space-y-1">
                            {acc.clausole_accettate.map((cl, ci) => (
                              <div key={ci} className="flex items-center gap-2 text-xs">
                                <svg className="w-3.5 h-3.5 text-emerald-400 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                                </svg>
                                <span className="text-slate-300">{cl.titolo}</span>
                                <span className="text-slate-500">({new Date(cl.accettato_il).toLocaleDateString('it-IT')})</span>
                              </div>
                            ))}
                          </div>
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              ) : (
                <div className="text-center py-8 text-slate-400">
                  <p>Nessuna accettazione legale registrata per questo utente.</p>
                </div>
              )}
            </div>
          )}

          {/* Tab: Report HPA */}
          {activeTab === 'report_hpa' && (
            <div className="space-y-6">
              <h3 className="text-lg font-semibold text-white mb-4">Report Sessioni HPA</h3>

              {hpaReportsLoading ? (
                <div className="text-center py-8">
                  <div className="w-8 h-8 border-4 border-purple-500 border-t-transparent rounded-full animate-spin mx-auto"></div>
                  <p className="mt-2 text-slate-400 text-sm">Caricamento report...</p>
                </div>
              ) : !user?.centro_id ? (
                <div className="text-center py-8 text-slate-400">
                  <p>Utente non associato a nessun centro. I report sono legati al centro.</p>
                </div>
              ) : hpaReports && hpaReports.length > 0 ? (
                <div className="space-y-4">
                  {hpaReports.map(r => (
                    <div key={r.id} className="bg-slate-900/50 rounded-lg border border-slate-700/50 p-4">
                      <div className="flex items-center justify-between mb-3">
                        <div className="flex items-center gap-3">
                          <div className="flex items-center gap-1">
                            {[1, 2, 3, 4, 5].map(n => (
                              <span key={n} className={`w-5 h-5 rounded-full text-[10px] flex items-center justify-center font-bold ${
                                n <= (r.valutazione_punteggio || 0)
                                  ? 'bg-purple-500 text-white'
                                  : 'bg-slate-700 text-slate-500'
                              }`}>{n}</span>
                            ))}
                          </div>
                          <span className={`text-xs font-medium ${
                            r.valutazione_beautyx === 'eccellente' ? 'text-emerald-400' :
                            r.valutazione_beautyx === 'buono' ? 'text-green-400' :
                            r.valutazione_beautyx === 'sufficiente' ? 'text-amber-400' :
                            r.valutazione_beautyx === 'insufficiente' ? 'text-orange-400' :
                            'text-red-400'
                          }`}>
                            {r.valutazione_beautyx ? r.valutazione_beautyx.charAt(0).toUpperCase() + r.valutazione_beautyx.slice(1) : '-'}
                          </span>
                        </div>
                        <div className="text-right">
                          <p className="text-sm text-white">
                            {new Date(r.created_at).toLocaleDateString('it-IT', { day: '2-digit', month: 'short', year: 'numeric' })}
                          </p>
                          {r.durata_minuti && (
                            <p className="text-xs text-slate-500">{r.durata_minuti} min</p>
                          )}
                        </div>
                      </div>

                      {r.user_profiles && (
                        <p className="text-xs text-purple-400 mb-2">
                          HPA: {r.user_profiles.nome} {r.user_profiles.cognome}
                        </p>
                      )}

                      <div className="space-y-2">
                        <div>
                          <p className="text-xs text-slate-400 font-medium">Sintesi</p>
                          <p className="text-sm text-white whitespace-pre-wrap">{r.sintesi}</p>
                        </div>

                        <div className="grid grid-cols-2 gap-3">
                          {r.punti_forza && (
                            <div>
                              <p className="text-xs text-green-400 font-medium">Punti di forza</p>
                              <p className="text-xs text-slate-300 whitespace-pre-wrap">{r.punti_forza}</p>
                            </div>
                          )}
                          {r.punti_debolezza && (
                            <div>
                              <p className="text-xs text-amber-400 font-medium">Aree di miglioramento</p>
                              <p className="text-xs text-slate-300 whitespace-pre-wrap">{r.punti_debolezza}</p>
                            </div>
                          )}
                        </div>

                        <div className="flex gap-4">
                          <div>
                            <p className="text-xs text-slate-400 font-medium">Obiettivi</p>
                            <p className="text-xs text-slate-300">
                              {r.obiettivi_stato === 'non_definiti' ? 'Non definiti' :
                               r.obiettivi_stato === 'definiti_non_focalizzato' ? 'Definiti ma non focalizzato' :
                               r.obiettivi_stato === 'focalizzato' ? 'Focalizzato' :
                               r.obiettivi_stato === 'raggiunto' ? 'Raggiunto' :
                               r.obiettivi_stato === 'superato' ? 'Superato' : r.obiettivi_stato}
                            </p>
                          </div>
                        </div>

                        {r.obiettivi_note && (
                          <div>
                            <p className="text-xs text-slate-400 font-medium">Note obiettivi</p>
                            <p className="text-xs text-slate-300 whitespace-pre-wrap">{r.obiettivi_note}</p>
                          </div>
                        )}

                        {r.raccomandazioni && (
                          <div>
                            <p className="text-xs text-purple-400 font-medium">Raccomandazioni</p>
                            <p className="text-xs text-slate-300 whitespace-pre-wrap">{r.raccomandazioni}</p>
                          </div>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="text-center py-8 text-slate-400">
                  <p>Nessun report HPA registrato per questo centro.</p>
                </div>
              )}
            </div>
          )}

          {/* Tab: Abbonamento */}
          {activeTab === 'abbonamento' && (
            <div className="space-y-6">
              <h3 className="text-lg font-semibold text-white mb-4">Abbonamento & Fatturazione</h3>

              {/* Piano corrente da user_subscriptions */}
              {userSubscription ? (
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <div className="bg-slate-900/50 rounded-lg p-4 border border-slate-700/50">
                    <p className="text-slate-400 text-sm mb-1">Piano Attuale</p>
                    <p className="text-xl font-bold text-teal-400">{userSubscription.plan?.nome || userSubscription.plan?.codice}</p>
                    <p className="text-xs text-slate-500 font-mono mt-1">{userSubscription.plan?.codice}</p>
                  </div>
                  <div className="bg-slate-900/50 rounded-lg p-4 border border-slate-700/50">
                    <p className="text-slate-400 text-sm mb-1">Stato</p>
                    <p className={`text-xl font-bold capitalize ${
                      userSubscription.stato === 'attivo' ? 'text-emerald-400' :
                      userSubscription.stato === 'trial' ? 'text-amber-400' : 'text-red-400'
                    }`}>{userSubscription.stato}</p>
                  </div>
                  <div className="bg-slate-900/50 rounded-lg p-4 border border-slate-700/50">
                    <p className="text-slate-400 text-sm mb-1">Scadenza</p>
                    <p className="text-xl font-bold text-white">
                      {userSubscription.data_fine
                        ? new Date(userSubscription.data_fine).toLocaleDateString('it-IT')
                        : 'Illimitato'}
                    </p>
                  </div>
                </div>
              ) : (
                <div className="bg-slate-900/50 rounded-lg p-4 border border-slate-700/50 text-slate-400 text-sm">
                  Nessun abbonamento trovato in user_subscriptions per questo utente.
                </div>
              )}

              {/* Assegna / Cambia Piano */}
              <div className="bg-slate-900/40 rounded-xl p-5 border border-slate-700/50">
                <h4 className="text-md font-semibold text-white mb-4">Assegna Piano</h4>

                {assignSuccess && (
                  <div className="mb-4 p-3 bg-teal-500/20 border border-teal-500/30 rounded-lg text-teal-300 text-sm">
                    ✓ {assignSuccess}
                  </div>
                )}
                {assignError && (
                  <div className="mb-4 p-3 bg-red-500/20 border border-red-500/30 rounded-lg text-red-300 text-sm">
                    ✗ {assignError}
                  </div>
                )}

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
                  <div>
                    <label className="block text-sm font-medium text-slate-300 mb-1">Piano *</label>
                    <select
                      value={selectedPlan}
                      onChange={(e) => setSelectedPlan(e.target.value)}
                      className="w-full px-3 py-2 bg-slate-900 border border-slate-600 rounded-lg text-white text-sm focus:ring-2 focus:ring-teal-500"
                    >
                      <option value="">Seleziona piano...</option>
                      {availablePlans.map(p => (
                        <option key={p.codice} value={p.codice}>
                          {p.nome} — {p.prezzo_mensile > 0 ? `€${p.prezzo_mensile}/mese` : 'Gratuito'}
                        </option>
                      ))}
                    </select>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-slate-300 mb-1">Note admin</label>
                    <input
                      type="text"
                      value={assignNote}
                      onChange={(e) => setAssignNote(e.target.value)}
                      placeholder="Motivazione assegnazione..."
                      className="w-full px-3 py-2 bg-slate-900 border border-slate-600 rounded-lg text-white text-sm focus:ring-2 focus:ring-teal-500"
                    />
                  </div>
                </div>

                <button
                  onClick={handleAssignPlan}
                  disabled={assigningPlan || !selectedPlan}
                  className="px-5 py-2 bg-teal-600 hover:bg-teal-500 disabled:opacity-50 text-white text-sm font-bold rounded-lg transition-all flex items-center gap-2"
                >
                  {assigningPlan ? (
                    <><div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" /> Assegnazione...</>
                  ) : (
                    '💳 Assegna Piano'
                  )}
                </button>
              </div>

              {/* Note interne */}
              <div>
                <h4 className="text-md font-semibold text-white mb-3">Note Interne</h4>
                <textarea
                  value={formData.note_interne || ''}
                  onChange={(e) => handleChange('note_interne', e.target.value)}
                  rows={3}
                  className="w-full px-3 py-2 bg-slate-900 border border-slate-600 rounded-lg text-white resize-none focus:ring-2 focus:ring-teal-500"
                  placeholder="Note visibili solo agli admin..."
                />
              </div>
            </div>
          )}

        </div>
      </div>

      {/* Modal Aggiungi Ruolo */}
      {showAddRoleModal && (
        <AddRoleModal
          onClose={() => setShowAddRoleModal(false)}
          onSave={handleAddRole}
          centri={centri}
          organizations={organizations}
        />
      )}

      {/* Modal Reset Password */}
      {showResetPassword && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className="bg-slate-800 rounded-xl border border-amber-500/30 w-full max-w-md">
            <div className="p-6 border-b border-slate-700">
              <h3 className="text-lg font-bold text-amber-400 flex items-center gap-2">
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 7a2 2 0 012 2m4 0a6 6 0 01-7.743 5.743L11 17H9v2H7v2H4a1 1 0 01-1-1v-2.586a1 1 0 01.293-.707l5.964-5.964A6 6 0 1121 9z" />
                </svg>
                Reset Password
              </h3>
            </div>
            <div className="p-6 space-y-4">
              {resetPwSuccess ? (
                <>
                  <div className="bg-green-500/10 border border-green-500/30 rounded-lg px-4 py-3">
                    <p className="text-green-400 text-sm font-medium">Password resettata con successo!</p>
                    <p className="text-slate-300 text-xs mt-1">L&apos;utente dovra&apos; cambiarla al prossimo accesso.</p>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-slate-300 mb-1">Password provvisoria</label>
                    <div className="flex gap-2">
                      <input
                        type="text"
                        value={resetPwSuccess}
                        readOnly
                        className="flex-1 px-3 py-2 bg-slate-900/50 border border-slate-600/50 rounded-lg text-white text-sm font-mono"
                      />
                      <button
                        onClick={() => { navigator.clipboard.writeText(resetPwSuccess); }}
                        className="px-3 py-2 bg-teal-500/20 text-teal-400 border border-teal-500/40 rounded-lg hover:bg-teal-500/30 transition-colors text-sm"
                      >
                        Copia
                      </button>
                    </div>
                    <p className="text-amber-400 text-xs mt-2">
                      Comunica questa password all&apos;utente. Non sara&apos; piu&apos; visibile dopo la chiusura.
                    </p>
                  </div>
                </>
              ) : (
                <>
                  <p className="text-slate-300 text-sm">
                    Stai resettando la password per: <span className="text-white font-medium">{formData.nome} {formData.cognome}</span>
                  </p>
                  <div>
                    <label className="block text-sm font-medium text-slate-300 mb-1">Password provvisoria</label>
                    <div className="flex gap-2">
                      <input
                        type="text"
                        value={resetPwData.password}
                        onChange={(e) => setResetPwData(prev => ({ ...prev, password: e.target.value }))}
                        className="flex-1 px-3 py-2 bg-slate-900/50 border border-slate-600/50 rounded-lg text-white text-sm font-mono placeholder-slate-500 focus:outline-none focus:ring-1 focus:ring-amber-500/50"
                        placeholder="Minimo 8 caratteri"
                      />
                      <button
                        onClick={generateRandomPassword}
                        className="px-3 py-2 bg-purple-500/20 text-purple-400 border border-purple-500/40 rounded-lg hover:bg-purple-500/30 transition-colors text-sm whitespace-nowrap"
                      >
                        Genera
                      </button>
                    </div>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-slate-300 mb-1">Conferma password</label>
                    <input
                      type="text"
                      value={resetPwData.confirm}
                      onChange={(e) => setResetPwData(prev => ({ ...prev, confirm: e.target.value }))}
                      className="w-full px-3 py-2 bg-slate-900/50 border border-slate-600/50 rounded-lg text-white text-sm font-mono placeholder-slate-500 focus:outline-none focus:ring-1 focus:ring-amber-500/50"
                      placeholder="Ripeti la password"
                    />
                  </div>
                  <div className="bg-amber-500/10 border border-amber-500/20 rounded-lg px-3 py-2">
                    <p className="text-amber-300 text-xs">
                      L&apos;utente sara&apos; obbligato a cambiare questa password al primo accesso successivo.
                    </p>
                  </div>
                </>
              )}
            </div>
            <div className="p-6 border-t border-slate-700 flex gap-3 justify-end">
              <button
                onClick={() => setShowResetPassword(false)}
                className="px-4 py-2 text-sm font-medium text-slate-400 hover:text-white transition-colors"
              >
                {resetPwSuccess ? 'Chiudi' : 'Annulla'}
              </button>
              {!resetPwSuccess && (
                <button
                  onClick={handleResetPassword}
                  disabled={resetPwLoading || !resetPwData.password || resetPwData.password !== resetPwData.confirm}
                  className="px-4 py-2 text-sm font-medium bg-amber-500 text-white rounded-lg hover:bg-amber-600 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {resetPwLoading ? 'Reset in corso...' : 'Resetta Password'}
                </button>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Modal conferma eliminazione */}
      {showDeleteConfirm && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className="bg-slate-800 rounded-xl border border-red-500/30 w-full max-w-md">
            <div className="p-6 border-b border-slate-700">
              <h3 className="text-lg font-bold text-red-400">Conferma Eliminazione</h3>
            </div>
            <div className="p-6">
              <p className="text-slate-300">
                Stai per eliminare definitivamente l&apos;utente:
              </p>
              <p className="text-white font-medium mt-2">
                {formData.nome} {formData.cognome} ({formData.email})
              </p>
              <p className="text-red-400 text-sm mt-4">
                Questa azione è irreversibile. Tutti i dati dell&apos;utente verranno eliminati permanentemente.
              </p>
            </div>
            <div className="p-6 border-t border-slate-700 flex gap-3 justify-end">
              <button
                onClick={() => setShowDeleteConfirm(false)}
                className="px-4 py-2 text-sm font-medium text-slate-400 hover:text-white transition-colors"
              >
                Annulla
              </button>
              <button
                onClick={handleDeleteUser}
                disabled={deletingUser}
                className="px-4 py-2 text-sm font-medium bg-red-500 text-white rounded-lg hover:bg-red-600 transition-colors disabled:opacity-50"
              >
                {deletingUser ? 'Eliminazione...' : 'Elimina Definitivamente'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

// Componenti helper
function InputField({ label, value, onChange, type = 'text', disabled = false, placeholder = '', maxLength }) {
  return (
    <div>
      <label className="block text-sm font-medium text-slate-300 mb-1">{label}</label>
      <input
        type={type}
        value={value || ''}
        onChange={(e) => onChange(e.target.value)}
        disabled={disabled}
        placeholder={placeholder}
        maxLength={maxLength}
        className="w-full px-3 py-2 bg-slate-900 border border-slate-600 rounded-lg text-white focus:ring-2 focus:ring-teal-500 focus:border-transparent disabled:opacity-50 disabled:cursor-not-allowed"
      />
    </div>
  )
}

function SelectField({ label, value, onChange, options, placeholder = '' }) {
  return (
    <div>
      <label className="block text-sm font-medium text-slate-300 mb-1">{label}</label>
      <select
        value={value || ''}
        onChange={(e) => onChange(e.target.value || null)}
        className="w-full px-3 py-2 bg-slate-900 border border-slate-600 rounded-lg text-white focus:ring-2 focus:ring-teal-500 focus:border-transparent"
      >
        {placeholder && <option value="">{placeholder}</option>}
        {options.map(opt => (
          <option key={opt.value} value={opt.value}>{opt.label}</option>
        ))}
      </select>
    </div>
  )
}

function AddRoleModal({ onClose, onSave, centri, organizations }) {
  const [roleData, setRoleData] = useState({
    role_type: 'titolare',
    centro_id: '',
    organization_id: '',
    is_primary: false
  })

  return (
    <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50 p-4">
      <div className="bg-slate-800 rounded-xl border border-slate-700 w-full max-w-md">
        <div className="p-6 border-b border-slate-700">
          <h3 className="text-lg font-bold text-white">Aggiungi Ruolo</h3>
          <p className="text-sm text-slate-400">Assegna un nuovo ruolo/profilo all'utente</p>
        </div>

        <div className="p-6 space-y-4">
          <SelectField
            label="Tipo Ruolo"
            value={roleData.role_type}
            onChange={(v) => setRoleData(prev => ({ ...prev, role_type: v }))}
            options={RUOLI_GERARCHICI.map(r => ({ value: r.value, label: r.label }))}
          />

          <SelectField
            label="Centro (opzionale)"
            value={roleData.centro_id}
            onChange={(v) => setRoleData(prev => ({ ...prev, centro_id: v }))}
            options={centri.map(c => ({ value: c.id, label: c.nome }))}
            placeholder="Nessun centro"
          />

          <SelectField
            label="Organizzazione (opzionale)"
            value={roleData.organization_id}
            onChange={(v) => setRoleData(prev => ({ ...prev, organization_id: v }))}
            options={organizations.map(o => ({ value: o.id, label: o.nome }))}
            placeholder="Nessuna organizzazione"
          />

          <label className="flex items-center gap-2 cursor-pointer">
            <input
              type="checkbox"
              checked={roleData.is_primary}
              onChange={(e) => setRoleData(prev => ({ ...prev, is_primary: e.target.checked }))}
              className="rounded border-slate-600 bg-slate-900 text-teal-500"
            />
            <span className="text-slate-300">Imposta come ruolo principale</span>
          </label>
        </div>

        <div className="p-6 border-t border-slate-700 flex gap-3 justify-end">
          <button onClick={onClose} className="px-4 py-2 text-slate-400 hover:text-white">
            Annulla
          </button>
          <button
            onClick={() => onSave(roleData)}
            className="px-4 py-2 bg-teal-500 text-white rounded-lg hover:bg-teal-600"
          >
            Aggiungi
          </button>
        </div>
      </div>
    </div>
  )
}
