'use client'

import { useState, useEffect, useMemo } from 'react'
import { useAuth } from '@/contexts/AuthContext'
import { useRouter } from 'next/navigation'
import Link from 'next/link'

// ── Constants ────────────────────────────────────────────────────────────────

const TIPO_SCONTO_OPTIONS = [
  { value: 'percentuale', label: 'Percentuale (%)' },
  { value: 'fisso', label: 'Fisso (EUR)' },
  { value: 'prezzo_speciale', label: 'Prezzo Speciale (EUR)' },
]

const TARGET_TIPO_OPTIONS = [
  { value: 'tutti', label: 'Tutti' },
  { value: 'piano_specifico', label: 'Piano Specifico' },
  { value: 'ruolo_specifico', label: 'Ruolo Specifico' },
]

const EMPTY_FORM = {
  nome: '',
  descrizione: '',
  tipo_sconto: 'percentuale',
  valore_sconto: '',
  addon_package_id: '',
  plan_id: '',
  codice_promo: '',
  data_inizio: '',
  data_fine: '',
  limite_utilizzi: '',
  target_tipo: 'tutti',
  target_valore: '',
}

// ── Helpers ──────────────────────────────────────────────────────────────────

function formatDateIT(isoString) {
  if (!isoString) return null
  const d = new Date(isoString)
  return d.toLocaleString('it-IT', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  })
}

function isoToDatetimeLocal(isoString) {
  if (!isoString) return ''
  const d = new Date(isoString)
  const pad = (n) => String(n).padStart(2, '0')
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`
}

function getCampaignStatus(campaign) {
  if (!campaign.attivo) return 'disattivata'
  const now = new Date()
  if (campaign.data_fine && new Date(campaign.data_fine) < now) return 'scaduta'
  if (campaign.limite_utilizzi != null && campaign.utilizzi_correnti >= campaign.limite_utilizzi) return 'esaurita'
  if (new Date(campaign.data_inizio) > now) return 'programmata'
  return 'attiva'
}

function getStatusConfig(status) {
  switch (status) {
    case 'attiva':
      return { label: 'Attiva', dotClass: 'bg-green-400', badgeBg: 'bg-green-500/15', badgeText: 'text-green-400', badgeBorder: 'border-green-500/30' }
    case 'programmata':
      return { label: 'Programmata', dotClass: 'bg-blue-400', badgeBg: 'bg-blue-500/15', badgeText: 'text-blue-400', badgeBorder: 'border-blue-500/30' }
    case 'scaduta':
      return { label: 'Scaduta', dotClass: 'bg-red-400', badgeBg: 'bg-red-500/15', badgeText: 'text-red-400', badgeBorder: 'border-red-500/30' }
    case 'esaurita':
      return { label: 'Esaurita', dotClass: 'bg-amber-400', badgeBg: 'bg-amber-500/15', badgeText: 'text-amber-400', badgeBorder: 'border-amber-500/30' }
    case 'disattivata':
      return { label: 'Disattivata', dotClass: 'bg-red-400', badgeBg: 'bg-red-500/15', badgeText: 'text-red-400', badgeBorder: 'border-red-500/30' }
    default:
      return { label: status, dotClass: 'bg-slate-400', badgeBg: 'bg-slate-500/15', badgeText: 'text-slate-400', badgeBorder: 'border-slate-500/30' }
  }
}

function getDiscountBadge(campaign) {
  switch (campaign.tipo_sconto) {
    case 'percentuale':
      return { label: `-${campaign.valore_sconto}%`, bg: 'bg-purple-500/15', text: 'text-purple-400', border: 'border-purple-500/30' }
    case 'fisso':
      return { label: `-${Number(campaign.valore_sconto).toFixed(2)}`, bg: 'bg-blue-500/15', text: 'text-blue-400', border: 'border-blue-500/30' }
    case 'prezzo_speciale':
      return { label: `${Number(campaign.valore_sconto).toFixed(2)}`, bg: 'bg-teal-500/15', text: 'text-teal-400', border: 'border-teal-500/30' }
    default:
      return { label: campaign.valore_sconto, bg: 'bg-slate-500/15', text: 'text-slate-400', border: 'border-slate-500/30' }
  }
}

function getTargetLabel(target_tipo) {
  switch (target_tipo) {
    case 'tutti': return 'Tutti'
    case 'piano_specifico': return 'Piano Specifico'
    case 'ruolo_specifico': return 'Ruolo Specifico'
    default: return target_tipo
  }
}

// ── Inline SVG Icons ─────────────────────────────────────────────────────────

function IconBack() {
  return (
    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
    </svg>
  )
}

function IconPlus() {
  return (
    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
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

function IconEdit() {
  return (
    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
    </svg>
  )
}

function IconBan() {
  return (
    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M18.364 18.364A9 9 0 005.636 5.636m12.728 12.728A9 9 0 015.636 5.636m12.728 12.728L5.636 5.636" />
    </svg>
  )
}

function IconTag() {
  return (
    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 7h.01M7 3h5c.512 0 1.024.195 1.414.586l7 7a2 2 0 010 2.828l-7 7a2 2 0 01-2.828 0l-7-7A1.994 1.994 0 013 12V7a4 4 0 014-4z" />
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

function IconUsers() {
  return (
    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197M13 7a4 4 0 11-8 0 4 4 0 018 0z" />
    </svg>
  )
}

function IconTicket() {
  return (
    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 5v2m0 4v2m0 4v2M5 5a2 2 0 00-2 2v3a2 2 0 110 4v3a2 2 0 002 2h14a2 2 0 002-2v-3a2 2 0 110-4V7a2 2 0 00-2-2H5z" />
    </svg>
  )
}

// ── Main Page Component ──────────────────────────────────────────────────────

export default function AdminCampagneScontoPage() {
  const { profile, loading: authLoading } = useAuth()
  const router = useRouter()

  // Data state
  const [campaigns, setCampaigns] = useState([])
  const [plans, setPlans] = useState([])
  const [packages, setPackages] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [successMsg, setSuccessMsg] = useState('')

  // Modal state
  const [showModal, setShowModal] = useState(false)
  const [editingId, setEditingId] = useState(null)
  const [form, setForm] = useState({ ...EMPTY_FORM })
  const [saving, setSaving] = useState(false)
  const [formError, setFormError] = useState('')

  // Deactivation state
  const [deactivating, setDeactivating] = useState(null)
  const [confirmDeactivateId, setConfirmDeactivateId] = useState(null)

  // ── Auth guard ───────────────────────────────────────────────────────────

  useEffect(() => {
    if (!authLoading && (!profile || (profile.ruolo_livello !== 'admin' && profile.ruolo !== 'admin'))) {
      router.push('/admin')
    }
  }, [authLoading, profile, router])

  // ── Data loading ─────────────────────────────────────────────────────────

  useEffect(() => {
    if (profile && (profile.ruolo_livello === 'admin' || profile.ruolo === 'admin')) {
      loadData()
    }
  }, [profile])

  useEffect(() => {
    if (successMsg) {
      const t = setTimeout(() => setSuccessMsg(''), 4000)
      return () => clearTimeout(t)
    }
  }, [successMsg])

  const loadData = async () => {
    setLoading(true)
    setError('')
    try {
      const [campaignsRes, plansRes, packagesRes] = await Promise.all([
        fetch('/api/admin/campaigns'),
        fetch('/api/subscriptions/plans'),
        fetch('/api/admin/addon-packages'),
      ])

      if (!campaignsRes.ok) throw new Error('Errore nel caricamento delle campagne')

      const campaignsData = await campaignsRes.json()
      setCampaigns(campaignsData.data || [])

      if (plansRes.ok) {
        const plansData = await plansRes.json()
        setPlans(plansData.plans || [])
      }

      if (packagesRes.ok) {
        const packagesData = await packagesRes.json()
        setPackages(packagesData.data || [])
      }
    } catch (err) {
      console.error('Errore caricamento dati:', err)
      setError('Impossibile caricare i dati. Riprova.')
    } finally {
      setLoading(false)
    }
  }

  // ── Computed values ──────────────────────────────────────────────────────

  const campaignsWithStatus = useMemo(() => {
    return campaigns.map(c => ({
      ...c,
      _status: getCampaignStatus(c),
    }))
  }, [campaigns])

  const stats = useMemo(() => ({
    totali: campaigns.length,
    attive: campaignsWithStatus.filter(c => c._status === 'attiva').length,
    scadute: campaignsWithStatus.filter(c => c._status === 'scaduta' || c._status === 'disattivata').length,
    esaurite: campaignsWithStatus.filter(c => c._status === 'esaurita').length,
  }), [campaigns, campaignsWithStatus])

  // ── Discount preview ─────────────────────────────────────────────────────

  const discountPreview = useMemo(() => {
    const val = parseFloat(form.valore_sconto)
    if (isNaN(val) || val <= 0) return null

    switch (form.tipo_sconto) {
      case 'percentuale':
        return {
          example: `Su un prezzo di 100,00: sconto di ${val.toFixed(2)}, prezzo finale ${(100 - val).toFixed(2)}`,
          label: `Sconto ${val}%`,
        }
      case 'fisso':
        return {
          example: `Su un prezzo di 100,00: sconto di ${val.toFixed(2)}, prezzo finale ${(100 - val).toFixed(2)}`,
          label: `Sconto fisso di ${val.toFixed(2)}`,
        }
      case 'prezzo_speciale':
        return {
          example: `Il prezzo finale sara sempre ${val.toFixed(2)}, indipendentemente dal prezzo originale`,
          label: `Prezzo speciale: ${val.toFixed(2)}`,
        }
      default:
        return null
    }
  }, [form.tipo_sconto, form.valore_sconto])

  // ── Valore label based on tipo_sconto ────────────────────────────────────

  const valoreLabel = useMemo(() => {
    switch (form.tipo_sconto) {
      case 'percentuale': return 'Percentuale sconto (%)'
      case 'fisso': return 'Importo sconto (EUR)'
      case 'prezzo_speciale': return 'Prezzo speciale (EUR)'
      default: return 'Valore sconto'
    }
  }, [form.tipo_sconto])

  // ── Form handlers ────────────────────────────────────────────────────────

  const openCreate = () => {
    setEditingId(null)
    setForm({
      ...EMPTY_FORM,
      data_inizio: isoToDatetimeLocal(new Date().toISOString()),
    })
    setFormError('')
    setShowModal(true)
  }

  const openEdit = (campaign) => {
    setEditingId(campaign.id)
    setForm({
      nome: campaign.nome || '',
      descrizione: campaign.descrizione || '',
      tipo_sconto: campaign.tipo_sconto || 'percentuale',
      valore_sconto: campaign.valore_sconto != null ? String(campaign.valore_sconto) : '',
      addon_package_id: campaign.addon_package_id || '',
      plan_id: campaign.plan_id || '',
      codice_promo: campaign.codice_promo || '',
      data_inizio: isoToDatetimeLocal(campaign.data_inizio),
      data_fine: isoToDatetimeLocal(campaign.data_fine),
      limite_utilizzi: campaign.limite_utilizzi != null ? String(campaign.limite_utilizzi) : '',
      target_tipo: campaign.target_tipo || 'tutti',
      target_valore: campaign.target_valore || '',
    })
    setFormError('')
    setShowModal(true)
  }

  const closeModal = () => {
    setShowModal(false)
    setEditingId(null)
    setForm({ ...EMPTY_FORM })
    setFormError('')
  }

  const updateField = (field, value) => {
    setForm(prev => ({ ...prev, [field]: value }))
  }

  // ── Save campaign ────────────────────────────────────────────────────────

  const handleSave = async () => {
    // Validation
    if (!form.nome.trim()) {
      setFormError('Il nome della campagna e obbligatorio.')
      return
    }
    if (!form.valore_sconto || parseFloat(form.valore_sconto) <= 0) {
      setFormError('Il valore dello sconto deve essere maggiore di zero.')
      return
    }
    if (form.tipo_sconto === 'percentuale' && parseFloat(form.valore_sconto) > 100) {
      setFormError('La percentuale non puo superare 100%.')
      return
    }
    if (!form.data_inizio) {
      setFormError('La data di inizio e obbligatoria.')
      return
    }
    if (form.data_fine && new Date(form.data_fine) <= new Date(form.data_inizio)) {
      setFormError('La data di fine deve essere successiva alla data di inizio.')
      return
    }
    if (form.target_tipo !== 'tutti' && !form.target_valore.trim()) {
      setFormError('Specificare il valore target per il tipo selezionato.')
      return
    }

    setSaving(true)
    setFormError('')

    try {
      const payload = {
        nome: form.nome.trim(),
        descrizione: form.descrizione.trim() || null,
        tipo_sconto: form.tipo_sconto,
        valore_sconto: parseFloat(form.valore_sconto),
        addon_package_id: form.addon_package_id || null,
        plan_id: form.plan_id || null,
        codice_promo: form.codice_promo.trim() || null,
        data_inizio: new Date(form.data_inizio).toISOString(),
        data_fine: form.data_fine ? new Date(form.data_fine).toISOString() : null,
        limite_utilizzi: form.limite_utilizzi ? parseInt(form.limite_utilizzi, 10) : null,
        target_tipo: form.target_tipo,
        target_valore: form.target_tipo !== 'tutti' ? form.target_valore.trim() : null,
        attivo: true,
      }

      if (editingId) {
        payload.id = editingId
      }

      const method = editingId ? 'PUT' : 'POST'
      const res = await fetch('/api/admin/campaigns', {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      })

      if (!res.ok) {
        const errData = await res.json().catch(() => ({}))
        throw new Error(errData.error || 'Errore durante il salvataggio')
      }

      setSuccessMsg(editingId ? 'Campagna aggiornata con successo!' : 'Campagna creata con successo!')
      closeModal()
      await loadData()
    } catch (err) {
      console.error('Errore salvataggio campagna:', err)
      setFormError(err.message || 'Errore durante il salvataggio.')
    } finally {
      setSaving(false)
    }
  }

  // ── Deactivate campaign ──────────────────────────────────────────────────

  const handleDeactivate = async (id) => {
    setDeactivating(id)
    try {
      const res = await fetch(`/api/admin/campaigns?id=${id}`, { method: 'DELETE' })
      if (!res.ok) throw new Error('Errore nella disattivazione')

      setCampaigns(prev => prev.map(c => c.id === id ? { ...c, attivo: false } : c))
      setSuccessMsg('Campagna disattivata con successo.')
    } catch (err) {
      console.error('Errore disattivazione:', err)
      setError('Impossibile disattivare la campagna.')
    } finally {
      setDeactivating(null)
      setConfirmDeactivateId(null)
    }
  }

  // ── Resolve plan/package names ───────────────────────────────────────────

  const getPlanName = (planId) => {
    if (!planId) return null
    const plan = plans.find(p => p.id === planId)
    return plan ? plan.nome : 'Piano sconosciuto'
  }

  const getPackageName = (packageId) => {
    if (!packageId) return null
    const pkg = packages.find(p => p.id === packageId)
    return pkg ? pkg.nome : 'Pacchetto sconosciuto'
  }

  // ── Loading state ────────────────────────────────────────────────────────

  if (authLoading || loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-800 via-slate-900 to-slate-800 flex items-center justify-center">
        <div className="text-center">
          <div className="w-12 h-12 border-4 border-teal-500 border-t-transparent rounded-full animate-spin mx-auto" />
          <p className="mt-4 text-slate-400">Caricamento campagne sconto...</p>
        </div>
      </div>
    )
  }

  // ── Render ─────────────────────────────────────────────────────────────────

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-800 via-slate-900 to-slate-800 p-4 md:p-6">
      <div className="max-w-6xl mx-auto space-y-6">

        {/* ── Success Toast ─────────────────────────────────────────────── */}
        {successMsg && (
          <div className="fixed top-4 right-4 z-[60] bg-green-600/90 backdrop-blur-sm text-white px-5 py-3 rounded-lg shadow-lg border border-green-500/50 flex items-center gap-2 animate-fade-in">
            <svg className="w-5 h-5 text-green-200 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
            </svg>
            {successMsg}
          </div>
        )}

        {/* ── Header ────────────────────────────────────────────────────── */}
        <div className="bg-slate-800/80 backdrop-blur-md rounded-xl border border-slate-700/50 p-5">
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
            <div className="flex items-center gap-3">
              <Link
                href="/admin/abbonamenti"
                className="p-2 bg-slate-700/50 hover:bg-slate-600/50 text-slate-400 hover:text-white rounded-lg transition-colors border border-slate-600/50"
              >
                <IconBack />
              </Link>
              <div className="w-10 h-10 bg-gradient-to-br from-teal-600 to-cyan-600 rounded-lg flex items-center justify-center shadow-lg shadow-teal-900/30">
                <IconTag />
              </div>
              <div>
                <h1 className="text-xl font-bold text-white">Gestione Campagne Sconto</h1>
                <p className="text-sm text-slate-400">Crea e gestisci campagne di sconto e codici promo</p>
              </div>
            </div>
            <button
              onClick={openCreate}
              className="flex items-center gap-2 px-4 py-2.5 bg-teal-600 hover:bg-teal-500 text-white font-medium rounded-lg transition-colors shadow-lg shadow-teal-900/30"
            >
              <IconPlus />
              <span>Nuova Campagna</span>
            </button>
          </div>
        </div>

        {/* ── Stats Row ─────────────────────────────────────────────────── */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
          {[
            { label: 'Totali', value: stats.totali, color: 'text-white' },
            { label: 'Attive', value: stats.attive, color: 'text-green-400' },
            { label: 'Scadute/Disattivate', value: stats.scadute, color: 'text-red-400' },
            { label: 'Esaurite', value: stats.esaurite, color: 'text-amber-400' },
          ].map((stat) => (
            <div key={stat.label} className="bg-slate-800/60 border border-slate-700/50 rounded-xl p-4 text-center">
              <p className={`text-2xl font-bold ${stat.color}`}>{stat.value}</p>
              <p className="text-xs text-slate-400 mt-1">{stat.label}</p>
            </div>
          ))}
        </div>

        {/* ── Global Error ──────────────────────────────────────────────── */}
        {error && (
          <div className="bg-red-500/10 border border-red-500/30 rounded-xl p-4 flex items-center gap-3">
            <svg className="w-5 h-5 text-red-400 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
            <p className="text-red-400 text-sm flex-1">{error}</p>
            <button onClick={() => setError('')} className="text-red-400 hover:text-red-300">
              <IconX />
            </button>
          </div>
        )}

        {/* ── Campaign Cards ────────────────────────────────────────────── */}
        {campaignsWithStatus.length === 0 ? (
          <div className="bg-slate-800/60 border border-slate-700/50 rounded-xl p-12 text-center">
            <div className="w-16 h-16 bg-slate-700/50 rounded-full flex items-center justify-center mx-auto mb-4">
              <svg className="w-8 h-8 text-slate-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M7 7h.01M7 3h5c.512 0 1.024.195 1.414.586l7 7a2 2 0 010 2.828l-7 7a2 2 0 01-2.828 0l-7-7A1.994 1.994 0 013 12V7a4 4 0 014-4z" />
              </svg>
            </div>
            <p className="text-slate-400 text-lg mb-2">Nessuna campagna sconto trovata</p>
            <p className="text-slate-500 text-sm mb-6">Crea la tua prima campagna per offrire sconti e promozioni.</p>
            <button
              onClick={openCreate}
              className="inline-flex items-center gap-2 px-4 py-2.5 bg-teal-600 hover:bg-teal-500 text-white rounded-lg transition-colors text-sm font-medium"
            >
              <IconPlus />
              Crea prima campagna
            </button>
          </div>
        ) : (
          <div className="space-y-4">
            {campaignsWithStatus.map(campaign => {
              const status = campaign._status
              const statusConf = getStatusConfig(status)
              const discountBadge = getDiscountBadge(campaign)
              const planName = getPlanName(campaign.plan_id)
              const packageName = getPackageName(campaign.addon_package_id)

              return (
                <div
                  key={campaign.id}
                  className={`bg-slate-800/60 border rounded-xl p-4 md:p-5 transition-all hover:border-slate-600/70 ${
                    status === 'disattivata' ? 'border-slate-700/30 opacity-60' : 'border-slate-700/50'
                  }`}
                >
                  <div className="flex flex-col lg:flex-row lg:items-start lg:justify-between gap-4">

                    {/* Left: campaign info */}
                    <div className="flex-1 min-w-0 space-y-3">

                      {/* Title + status */}
                      <div className="flex flex-wrap items-center gap-2">
                        <div className={`w-2.5 h-2.5 rounded-full ${statusConf.dotClass}`} />
                        <h3 className="text-white font-semibold text-base">{campaign.nome}</h3>
                        <span className={`inline-flex items-center px-2 py-0.5 rounded-md text-xs font-medium border ${statusConf.badgeBg} ${statusConf.badgeText} ${statusConf.badgeBorder}`}>
                          {statusConf.label}
                        </span>
                      </div>

                      {/* Description */}
                      {campaign.descrizione && (
                        <p className="text-slate-400 text-sm leading-relaxed">{campaign.descrizione}</p>
                      )}

                      {/* Badges row */}
                      <div className="flex flex-wrap gap-2">
                        {/* Discount type badge */}
                        <span className={`inline-flex items-center px-2.5 py-1 rounded-md text-xs font-bold border ${discountBadge.bg} ${discountBadge.text} ${discountBadge.border}`}>
                          {discountBadge.label}
                        </span>

                        {/* Tipo sconto label */}
                        <span className="inline-flex items-center px-2 py-0.5 rounded-md text-xs font-medium bg-slate-700/50 text-slate-300 border border-slate-600/30">
                          {TIPO_SCONTO_OPTIONS.find(o => o.value === campaign.tipo_sconto)?.label || campaign.tipo_sconto}
                        </span>

                        {/* Codice promo */}
                        {campaign.codice_promo && (
                          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-xs font-medium bg-amber-500/15 text-amber-400 border border-amber-500/30">
                            <IconTicket />
                            {campaign.codice_promo}
                          </span>
                        )}

                        {/* Target */}
                        <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-xs font-medium bg-cyan-500/15 text-cyan-400 border border-cyan-500/30">
                          <IconUsers />
                          {getTargetLabel(campaign.target_tipo)}
                          {campaign.target_valore && `: ${campaign.target_valore}`}
                        </span>
                      </div>

                      {/* Plan / Package association */}
                      {(planName || packageName) && (
                        <div className="flex flex-wrap gap-2 text-xs text-slate-400">
                          {planName && (
                            <span className="bg-slate-700/40 px-2 py-1 rounded">Piano: {planName}</span>
                          )}
                          {packageName && (
                            <span className="bg-slate-700/40 px-2 py-1 rounded">Pacchetto: {packageName}</span>
                          )}
                        </div>
                      )}

                      {/* Metadata row */}
                      <div className="flex flex-wrap items-center gap-x-5 gap-y-2 text-xs text-slate-500">
                        {/* Date range */}
                        <span className="flex items-center gap-1.5">
                          <IconCalendar />
                          {formatDateIT(campaign.data_inizio)}
                          {' - '}
                          {campaign.data_fine ? formatDateIT(campaign.data_fine) : 'Senza scadenza'}
                        </span>

                        {/* Usage count */}
                        <span className="flex items-center gap-1.5">
                          <IconUsers />
                          Utilizzi: {campaign.utilizzi_correnti ?? 0}
                          {' / '}
                          {campaign.limite_utilizzi != null ? campaign.limite_utilizzi : 'Illimitati'}
                        </span>
                      </div>
                    </div>

                    {/* Right: actions */}
                    <div className="flex items-center gap-2 lg:flex-col lg:items-end shrink-0">
                      <button
                        onClick={() => openEdit(campaign)}
                        className="flex items-center gap-1.5 px-3 py-2 bg-slate-700/50 hover:bg-slate-600/60 text-slate-300 hover:text-white rounded-lg transition-colors text-sm border border-slate-600/40"
                      >
                        <IconEdit />
                        <span className="hidden sm:inline">Modifica</span>
                      </button>

                      {campaign.attivo && (
                        <>
                          {confirmDeactivateId === campaign.id ? (
                            <div className="flex items-center gap-1.5">
                              <button
                                onClick={() => handleDeactivate(campaign.id)}
                                disabled={deactivating === campaign.id}
                                className="flex items-center gap-1 px-3 py-2 bg-red-600/80 hover:bg-red-500/80 text-white rounded-lg transition-colors text-xs font-medium disabled:opacity-50"
                              >
                                {deactivating === campaign.id ? (
                                  <div className="w-3.5 h-3.5 border-2 border-white/40 border-t-white rounded-full animate-spin" />
                                ) : (
                                  'Conferma'
                                )}
                              </button>
                              <button
                                onClick={() => setConfirmDeactivateId(null)}
                                className="px-2 py-2 text-slate-400 hover:text-white text-xs rounded-lg transition-colors"
                              >
                                Annulla
                              </button>
                            </div>
                          ) : (
                            <button
                              onClick={() => setConfirmDeactivateId(campaign.id)}
                              className="flex items-center gap-1.5 px-3 py-2 bg-red-500/10 hover:bg-red-500/20 text-red-400 hover:text-red-300 rounded-lg transition-colors text-sm border border-red-500/20"
                            >
                              <IconBan />
                              <span className="hidden sm:inline">Disattiva</span>
                            </button>
                          )}
                        </>
                      )}
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
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-start justify-center pt-6 pb-6 px-4 overflow-y-auto">
          <div className="w-full max-w-2xl bg-slate-800 rounded-2xl border border-slate-700 shadow-2xl shadow-black/40">

            {/* Modal Header */}
            <div className="flex items-center justify-between p-5 border-b border-slate-700/50">
              <h2 className="text-lg font-bold text-white">
                {editingId ? 'Modifica Campagna' : 'Nuova Campagna Sconto'}
              </h2>
              <button
                onClick={closeModal}
                className="p-2 hover:bg-slate-700/50 rounded-lg text-slate-400 hover:text-white transition-colors"
              >
                <IconX />
              </button>
            </div>

            {/* Modal Body */}
            <div className="p-5 space-y-5 max-h-[calc(100vh-200px)] overflow-y-auto">

              {/* Error inside modal */}
              {formError && (
                <div className="bg-red-500/10 border border-red-500/30 rounded-lg p-3 flex items-center gap-2">
                  <svg className="w-4 h-4 text-red-400 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                  </svg>
                  <p className="text-red-400 text-sm">{formError}</p>
                </div>
              )}

              {/* Nome */}
              <div>
                <label className="block text-sm font-medium text-slate-300 mb-1.5">
                  Nome campagna <span className="text-red-400">*</span>
                </label>
                <input
                  type="text"
                  value={form.nome}
                  onChange={e => updateField('nome', e.target.value)}
                  placeholder="Es: Promo Lancio Estivo"
                  className="w-full px-4 py-2.5 bg-slate-900/50 border border-slate-600 rounded-lg text-white placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-teal-500/50 focus:border-teal-500/50 transition-colors"
                />
              </div>

              {/* Descrizione */}
              <div>
                <label className="block text-sm font-medium text-slate-300 mb-1.5">Descrizione</label>
                <textarea
                  value={form.descrizione}
                  onChange={e => updateField('descrizione', e.target.value)}
                  placeholder="Descrizione opzionale della campagna..."
                  rows={3}
                  className="w-full px-4 py-2.5 bg-slate-900/50 border border-slate-600 rounded-lg text-white placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-teal-500/50 focus:border-teal-500/50 transition-colors resize-y"
                />
              </div>

              {/* Tipo sconto + Valore */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-slate-300 mb-1.5">
                    Tipo sconto <span className="text-red-400">*</span>
                  </label>
                  <select
                    value={form.tipo_sconto}
                    onChange={e => updateField('tipo_sconto', e.target.value)}
                    className="w-full px-4 py-2.5 bg-slate-900/50 border border-slate-600 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-teal-500/50 focus:border-teal-500/50 transition-colors appearance-none"
                  >
                    {TIPO_SCONTO_OPTIONS.map(o => (
                      <option key={o.value} value={o.value} className="bg-slate-800">{o.label}</option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium text-slate-300 mb-1.5">
                    {valoreLabel} <span className="text-red-400">*</span>
                  </label>
                  <input
                    type="number"
                    min="0"
                    step="0.01"
                    value={form.valore_sconto}
                    onChange={e => updateField('valore_sconto', e.target.value)}
                    placeholder={form.tipo_sconto === 'percentuale' ? 'Es: 20' : 'Es: 9.99'}
                    className="w-full px-4 py-2.5 bg-slate-900/50 border border-slate-600 rounded-lg text-white placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-teal-500/50 focus:border-teal-500/50 transition-colors"
                  />
                </div>
              </div>

              {/* Discount Preview */}
              {discountPreview && (
                <div className="bg-teal-500/10 border border-teal-500/30 rounded-lg p-3">
                  <p className="text-teal-400 text-sm font-medium mb-1">Anteprima sconto</p>
                  <p className="text-teal-300 text-xs font-bold">{discountPreview.label}</p>
                  <p className="text-slate-400 text-xs mt-1">{discountPreview.example}</p>
                </div>
              )}

              {/* Plan + Package selects */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-slate-300 mb-1.5">Applica a piano</label>
                  <select
                    value={form.plan_id}
                    onChange={e => updateField('plan_id', e.target.value)}
                    className="w-full px-4 py-2.5 bg-slate-900/50 border border-slate-600 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-teal-500/50 focus:border-teal-500/50 transition-colors appearance-none"
                  >
                    <option value="" className="bg-slate-800">Tutti i piani</option>
                    {plans.map(p => (
                      <option key={p.id} value={p.id} className="bg-slate-800">{p.nome}</option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium text-slate-300 mb-1.5">Applica a pacchetto</label>
                  <select
                    value={form.addon_package_id}
                    onChange={e => updateField('addon_package_id', e.target.value)}
                    className="w-full px-4 py-2.5 bg-slate-900/50 border border-slate-600 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-teal-500/50 focus:border-teal-500/50 transition-colors appearance-none"
                  >
                    <option value="" className="bg-slate-800">Tutti i pacchetti</option>
                    {packages.map(p => (
                      <option key={p.id} value={p.id} className="bg-slate-800">{p.nome}</option>
                    ))}
                  </select>
                </div>
              </div>

              {/* Codice promo */}
              <div>
                <label className="block text-sm font-medium text-slate-300 mb-1.5">Codice promo</label>
                <input
                  type="text"
                  value={form.codice_promo}
                  onChange={e => updateField('codice_promo', e.target.value.toUpperCase())}
                  placeholder="Es: ESTATE2026"
                  className="w-full px-4 py-2.5 bg-slate-900/50 border border-slate-600 rounded-lg text-white placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-teal-500/50 focus:border-teal-500/50 transition-colors uppercase"
                />
                <p className="text-xs text-slate-500 mt-1">Opzionale. Se inserito, lo sconto si attiva solo con questo codice.</p>
              </div>

              {/* Date range */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-slate-300 mb-1.5">
                    Data inizio <span className="text-red-400">*</span>
                  </label>
                  <input
                    type="datetime-local"
                    value={form.data_inizio}
                    onChange={e => updateField('data_inizio', e.target.value)}
                    className="w-full px-4 py-2.5 bg-slate-900/50 border border-slate-600 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-teal-500/50 focus:border-teal-500/50 transition-colors [color-scheme:dark]"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-slate-300 mb-1.5">Data fine (opzionale)</label>
                  <input
                    type="datetime-local"
                    value={form.data_fine}
                    onChange={e => updateField('data_fine', e.target.value)}
                    className="w-full px-4 py-2.5 bg-slate-900/50 border border-slate-600 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-teal-500/50 focus:border-teal-500/50 transition-colors [color-scheme:dark]"
                  />
                  <p className="text-xs text-slate-500 mt-1">Lascia vuoto per campagna senza scadenza.</p>
                </div>
              </div>

              {/* Limite utilizzi */}
              <div>
                <label className="block text-sm font-medium text-slate-300 mb-1.5">Limite utilizzi</label>
                <input
                  type="number"
                  min="0"
                  step="1"
                  value={form.limite_utilizzi}
                  onChange={e => updateField('limite_utilizzi', e.target.value)}
                  placeholder="Lascia vuoto per illimitato"
                  className="w-full px-4 py-2.5 bg-slate-900/50 border border-slate-600 rounded-lg text-white placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-teal-500/50 focus:border-teal-500/50 transition-colors"
                />
                <p className="text-xs text-slate-500 mt-1">Numero massimo di volte che lo sconto puo essere usato. Vuoto = illimitato.</p>
              </div>

              {/* Target */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-slate-300 mb-1.5">Target</label>
                  <select
                    value={form.target_tipo}
                    onChange={e => {
                      updateField('target_tipo', e.target.value)
                      if (e.target.value === 'tutti') {
                        updateField('target_valore', '')
                      }
                    }}
                    className="w-full px-4 py-2.5 bg-slate-900/50 border border-slate-600 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-teal-500/50 focus:border-teal-500/50 transition-colors appearance-none"
                  >
                    {TARGET_TIPO_OPTIONS.map(o => (
                      <option key={o.value} value={o.value} className="bg-slate-800">{o.label}</option>
                    ))}
                  </select>
                </div>
                {form.target_tipo !== 'tutti' && (
                  <div>
                    <label className="block text-sm font-medium text-slate-300 mb-1.5">
                      Valore target <span className="text-red-400">*</span>
                    </label>
                    <input
                      type="text"
                      value={form.target_valore}
                      onChange={e => updateField('target_valore', e.target.value)}
                      placeholder={form.target_tipo === 'piano_specifico' ? 'Es: professional' : 'Es: titolare'}
                      className="w-full px-4 py-2.5 bg-slate-900/50 border border-slate-600 rounded-lg text-white placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-teal-500/50 focus:border-teal-500/50 transition-colors"
                    />
                    <p className="text-xs text-slate-500 mt-1">
                      {form.target_tipo === 'piano_specifico'
                        ? 'Codice del piano a cui si applica lo sconto.'
                        : 'Ruolo specifico a cui si applica lo sconto.'}
                    </p>
                  </div>
                )}
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
                onClick={handleSave}
                disabled={saving}
                className="px-5 py-2.5 bg-teal-600 hover:bg-teal-500 text-white rounded-lg transition-colors text-sm font-medium shadow-lg shadow-teal-900/30 disabled:opacity-50 flex items-center gap-2"
              >
                {saving && (
                  <div className="w-4 h-4 border-2 border-white/40 border-t-white rounded-full animate-spin" />
                )}
                {editingId ? 'Aggiorna Campagna' : 'Crea Campagna'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ── Deactivation Confirmation Overlay (for mobile) ─────────────── */}
      {/* Note: confirmation is handled inline per card via confirmDeactivateId state */}
    </div>
  )
}
