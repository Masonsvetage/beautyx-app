'use client'

import { useState, useEffect, useCallback } from 'react'
import Link from 'next/link'
import { useAuth } from '@/contexts/AuthContext'
import { useRouter } from 'next/navigation'

// =====================================================
// COSTANTI
// =====================================================
const TABS = [
  { key: 'overview', label: 'Overview' },
  { key: 'utenti', label: 'Utenti' },
  { key: 'piani', label: 'Piani' },
  { key: 'token_addon', label: 'Token Addon' }
]

const STATI_ABBONAMENTO = [
  { value: '', label: 'Tutti gli stati' },
  { value: 'attivo', label: 'Attivo' },
  { value: 'trial', label: 'Trial' },
  { value: 'scaduto', label: 'Scaduto' },
  { value: 'sospeso', label: 'Sospeso' },
  { value: 'cancellato', label: 'Cancellato' }
]

const STATO_BADGE_COLORS = {
  attivo: 'bg-teal-500/20 text-teal-400 border-teal-500/40',
  trial: 'bg-amber-500/20 text-amber-400 border-amber-500/40',
  scaduto: 'bg-red-500/20 text-red-400 border-red-500/40',
  sospeso: 'bg-slate-500/20 text-slate-400 border-slate-500/40',
  cancellato: 'bg-red-800/20 text-red-300 border-red-800/40'
}

// =====================================================
// HELPERS
// =====================================================
function formatCurrency(value) {
  if (value == null || isNaN(value)) return '\u20AC 0'
  return new Intl.NumberFormat('it-IT', {
    style: 'currency',
    currency: 'EUR',
    minimumFractionDigits: 0,
    maximumFractionDigits: 2
  }).format(value)
}

function formatNumber(value) {
  if (value == null || isNaN(value)) return '0'
  return new Intl.NumberFormat('it-IT').format(value)
}

function formatTokens(value) {
  if (value == null || isNaN(value)) return '0'
  if (value >= 1000) {
    return Math.round(value / 1000) + 'K'
  }
  return String(value)
}

function formatDate(dateStr) {
  if (!dateStr) return '-'
  try {
    return new Intl.DateTimeFormat('it-IT', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric'
    }).format(new Date(dateStr))
  } catch {
    return '-'
  }
}

// =====================================================
// COMPONENTE PRINCIPALE
// =====================================================
export default function AdminAbbonamenti() {
  const { profile, loading: authLoading } = useAuth()
  const router = useRouter()

  // State
  const [activeTab, setActiveTab] = useState('overview')
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)

  // Overview data
  const [overview, setOverview] = useState(null)
  const [subscriptions, setSubscriptions] = useState([])

  // Utenti tab filters
  const [searchEmail, setSearchEmail] = useState('')
  const [filterPlan, setFilterPlan] = useState('')
  const [filterStato, setFilterStato] = useState('')
  const [filterRischio, setFilterRischio] = useState('') // '' | 'warning' | 'esauriti'

  // Piani tab
  const [plans, setPlans] = useState([])
  const [plansLoading, setPlansLoading] = useState(false)

  // Token Addon tab
  const [addonPurchases, setAddonPurchases] = useState([])
  const [addonLoading, setAddonLoading] = useState(false)
  const [showCreditModal, setShowCreditModal] = useState(false)
  const [creditTarget, setCreditTarget] = useState(null)
  const [creditAmount, setCreditAmount] = useState('')
  const [creditNote, setCreditNote] = useState('')
  const [crediting, setCrediting] = useState(false)
  const [creditError, setCreditError] = useState(null)
  const [creditSuccess, setCreditSuccess] = useState(null)

  // Modal assegnazione piano
  const [showAssignModal, setShowAssignModal] = useState(false)
  const [assignTarget, setAssignTarget] = useState(null) // { user_id, email, nome }
  const [assignPlan, setAssignPlan] = useState('')
  const [assignNote, setAssignNote] = useState('')
  const [assignIsFree, setAssignIsFree] = useState(false)
  const [assigning, setAssigning] = useState(false)
  const [assignError, setAssignError] = useState(null)

  // =====================================================
  // AUTH GUARD
  // =====================================================
  useEffect(() => {
    if (!authLoading && profile?.ruolo_livello !== 'admin') {
      router.push('/')
    }
  }, [authLoading, profile, router])

  // =====================================================
  // DATA LOADING
  // =====================================================
  const loadSubscriptions = useCallback(async () => {
    setLoading(true)
    setError(null)
    try {
      const params = new URLSearchParams()
      if (searchEmail) params.set('search', searchEmail)
      if (filterPlan) params.set('plan', filterPlan)
      if (filterStato) params.set('stato', filterStato)

      const qs = params.toString()
      const res = await fetch(`/api/admin/subscriptions${qs ? '?' + qs : ''}`)
      if (!res.ok) {
        throw new Error(`Errore ${res.status}: ${res.statusText}`)
      }
      const data = await res.json()
      setOverview(data.overview || {})
      setSubscriptions(data.subscriptions || [])
    } catch (err) {
      console.error('Errore caricamento abbonamenti:', err)
      setError(err.message)
    } finally {
      setLoading(false)
    }
  }, [searchEmail, filterPlan, filterStato])

  const loadPlans = useCallback(async () => {
    setPlansLoading(true)
    try {
      // ?all=true per il tab gestione piani (mostra anche inattivi)
      const res = await fetch('/api/admin/plans?all=true')
      if (!res.ok) throw new Error('Errore caricamento piani')
      const data = await res.json()
      setPlans(data.plans || [])
    } catch (err) {
      console.error('Errore caricamento piani:', err)
    } finally {
      setPlansLoading(false)
    }
  }, [])

  const loadAddonPurchases = useCallback(async () => {
    setAddonLoading(true)
    try {
      const res = await fetch('/api/admin/subscriptions/purchases')
      if (!res.ok) throw new Error('Errore caricamento acquisti')
      const data = await res.json()
      setAddonPurchases(data.purchases || [])
    } catch (err) {
      console.error('Errore caricamento addon purchases:', err)
    } finally {
      setAddonLoading(false)
    }
  }, [])

  const handleCreditTokens = async () => {
    const amount = parseInt(creditAmount)
    if (!creditTarget?.user_id || !amount || amount <= 0) {
      setCreditError('Inserisci un importo valido')
      return
    }
    setCrediting(true)
    setCreditError(null)
    setCreditSuccess(null)
    try {
      const res = await fetch('/api/admin/subscriptions/credit-tokens', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          user_id: creditTarget.user_id,
          token_amount: amount,
          note: creditNote || null
        })
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error || 'Errore accredito')
      setCreditSuccess(`${amount.toLocaleString('it-IT')} token accreditati`)
      setCreditAmount('')
      setCreditNote('')
      loadAddonPurchases()
    } catch (err) {
      setCreditError(err.message)
    } finally {
      setCrediting(false)
    }
  }

  // Caricamento iniziale
  useEffect(() => {
    if (profile?.ruolo_livello === 'admin') {
      loadSubscriptions()
      loadPlans()
      loadAddonPurchases()
    }
  }, [profile, loadSubscriptions, loadPlans, loadAddonPurchases])

  // Ricarica quando cambiano i filtri (debounced per search)
  useEffect(() => {
    if (!profile || profile.ruolo_livello !== 'admin') return
    const timer = setTimeout(() => {
      loadSubscriptions()
    }, searchEmail ? 500 : 0)
    return () => clearTimeout(timer)
  }, [searchEmail, filterPlan, filterStato, profile, loadSubscriptions])

  // =====================================================
  // ASSEGNAZIONE PIANO
  // =====================================================
  const openAssignModal = (sub) => {
    setAssignTarget({
      user_id: sub.user_id || sub.user?.id,
      email: sub.user?.email || '',
      nome: sub.user?.nome || ''
    })
    setAssignPlan('')
    setAssignNote('')
    setAssignIsFree(false)
    setAssignError(null)
    setShowAssignModal(true)
  }

  const handleAssign = async () => {
    if (!assignTarget?.user_id || !assignPlan) {
      setAssignError('Seleziona un piano')
      return
    }
    setAssigning(true)
    setAssignError(null)

    try {
      const res = await fetch('/api/admin/subscriptions', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          user_id: assignTarget.user_id,
          plan_codice: assignPlan,
          note_admin: assignNote || null,
          is_free: assignIsFree
        })
      })

      const data = await res.json()
      if (!res.ok) {
        throw new Error(data.error || 'Errore assegnazione piano')
      }

      setShowAssignModal(false)
      // Ricarica dati
      loadSubscriptions()
    } catch (err) {
      console.error('Errore assegnazione:', err)
      setAssignError(err.message)
    } finally {
      setAssigning(false)
    }
  }

  // =====================================================
  // RENDER GUARDS
  // =====================================================
  if (authLoading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-800 via-slate-900 to-slate-800 p-6 flex items-center justify-center">
        <div className="text-center">
          <div className="w-12 h-12 border-4 border-teal-500 border-t-transparent rounded-full animate-spin mx-auto"></div>
          <p className="mt-4 text-slate-400">Verifica autenticazione...</p>
        </div>
      </div>
    )
  }

  if (profile?.ruolo_livello !== 'admin') {
    return null
  }

  // =====================================================
  // CALCOLI OVERVIEW
  // =====================================================
  const ov = overview || {}
  const planDistribution = ov.per_piano || []

  // Trova il valore massimo della distribuzione per dimensionare le barre
  const maxPlanCount = Math.max(...planDistribution.map(p => p.count || 0), 1)

  // =====================================================
  // RENDER
  // =====================================================
  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-800 via-slate-900 to-slate-800 p-4 md:p-6">
      <div className="max-w-7xl mx-auto space-y-6">

        {/* Header */}
        <div className="bg-slate-950/60 backdrop-blur-md rounded-xl border border-slate-700/50 p-4">
          <div className="flex items-center justify-between flex-wrap gap-4">
            <div className="flex items-center gap-3">
              <Link href="/admin" className="text-slate-400 hover:text-white transition-colors">
                <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
                </svg>
              </Link>
              <div className="w-10 h-10 bg-gradient-to-br from-teal-600 to-emerald-600 rounded-lg flex items-center justify-center">
                <svg className="w-6 h-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 10h18M7 15h1m4 0h1m-7 4h12a3 3 0 003-3V8a3 3 0 00-3-3H6a3 3 0 00-3 3v8a3 3 0 003 3z" />
                </svg>
              </div>
              <div>
                <h1 className="text-2xl font-bold text-white">Gestione Abbonamenti</h1>
                <p className="text-sm text-slate-400">Piani, sottoscrizioni e monitoraggio revenue</p>
              </div>
            </div>

            {/* Quick links */}
            <div className="flex items-center gap-2">
              <Link
                href="/admin/abbonamenti/pacchetti"
                className="px-3 py-1.5 bg-slate-700/60 hover:bg-slate-700 text-slate-300 hover:text-white rounded-lg text-sm font-medium transition-colors border border-slate-600/50"
              >
                Pacchetti Addon
              </Link>
              <Link
                href="/admin/abbonamenti/campagne"
                className="px-3 py-1.5 bg-slate-700/60 hover:bg-slate-700 text-slate-300 hover:text-white rounded-lg text-sm font-medium transition-colors border border-slate-600/50"
              >
                Campagne Sconto
              </Link>
            </div>
          </div>
        </div>

        {/* Tabs */}
        <div className="border-b border-slate-700/50">
          <div className="flex gap-0">
            {TABS.map(tab => (
              <button
                key={tab.key}
                onClick={() => setActiveTab(tab.key)}
                className={`px-6 py-3 text-sm font-medium transition-all border-b-2 ${
                  activeTab === tab.key
                    ? 'border-teal-500 text-teal-400'
                    : 'border-transparent text-slate-400 hover:text-white hover:border-slate-600'
                }`}
              >
                {tab.label}
              </button>
            ))}
          </div>
        </div>

        {/* Error Banner */}
        {error && (
          <div className="bg-red-500/20 border border-red-500/40 rounded-xl p-4 flex items-center gap-3">
            <svg className="w-5 h-5 text-red-400 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
            <p className="text-red-300 text-sm">{error}</p>
            <button onClick={loadSubscriptions} className="ml-auto text-red-400 hover:text-red-300 text-sm underline">
              Riprova
            </button>
          </div>
        )}

        {/* Tab Content */}
        {activeTab === 'overview' && (
          <TabOverview
            loading={loading}
            overview={ov}
            planDistribution={planDistribution}
            maxPlanCount={maxPlanCount}
            subscriptions={subscriptions}
            onGoToRischio={(tipo) => { setFilterRischio(tipo); setActiveTab('utenti') }}
          />
        )}

        {activeTab === 'utenti' && (
          <TabUtenti
            loading={loading}
            subscriptions={subscriptions}
            plans={plans}
            searchEmail={searchEmail}
            setSearchEmail={setSearchEmail}
            filterPlan={filterPlan}
            setFilterPlan={setFilterPlan}
            filterStato={filterStato}
            setFilterStato={setFilterStato}
            filterRischio={filterRischio}
            setFilterRischio={setFilterRischio}
            onAssign={openAssignModal}
          />
        )}

        {activeTab === 'piani' && (
          <TabPiani
            loading={plansLoading}
            plans={plans}
            onReload={loadPlans}
          />
        )}

        {activeTab === 'token_addon' && (
          <TabTokenAddon
            loading={addonLoading}
            purchases={addonPurchases}
            onReload={loadAddonPurchases}
            onOpenCredit={(sub) => {
              setCreditTarget({ user_id: sub.user_id, email: sub.user_profiles?.email || '' })
              setCreditAmount('')
              setCreditNote('')
              setCreditError(null)
              setCreditSuccess(null)
              setShowCreditModal(true)
            }}
          />
        )}
      </div>

      {/* Modal Credito Token Manuale */}
      {showCreditModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
          <div className="w-full max-w-md bg-slate-900 rounded-2xl border border-slate-700/50 shadow-2xl">
            <div className="p-6 border-b border-slate-700/50">
              <h3 className="text-lg font-bold text-white">Accredita Token Manualmente</h3>
              <p className="text-sm text-slate-400 mt-1">
                Utente: <span className="text-teal-400">{creditTarget?.email}</span>
              </p>
            </div>
            <div className="p-6 space-y-4">
              <div>
                <label className="text-xs font-semibold text-slate-400 uppercase tracking-wider mb-1.5 block">
                  Token da accreditare
                </label>
                <input
                  type="number"
                  min="1"
                  placeholder="es. 100000"
                  value={creditAmount}
                  onChange={e => setCreditAmount(e.target.value)}
                  className="w-full px-3 py-2 bg-slate-800 border border-slate-600/50 rounded-lg text-white text-sm focus:outline-none focus:border-teal-500"
                />
              </div>
              <div>
                <label className="text-xs font-semibold text-slate-400 uppercase tracking-wider mb-1.5 block">
                  Note (opzionale)
                </label>
                <input
                  type="text"
                  placeholder="es. Accredito post-pagamento manuale"
                  value={creditNote}
                  onChange={e => setCreditNote(e.target.value)}
                  className="w-full px-3 py-2 bg-slate-800 border border-slate-600/50 rounded-lg text-white text-sm focus:outline-none focus:border-teal-500"
                />
              </div>
              {creditError && <p className="text-sm text-red-400">{creditError}</p>}
              {creditSuccess && <p className="text-sm text-teal-400">{creditSuccess}</p>}
            </div>
            <div className="p-6 pt-0 flex gap-3">
              <button
                onClick={() => setShowCreditModal(false)}
                className="flex-1 px-4 py-2 bg-slate-700/60 hover:bg-slate-700 text-slate-300 rounded-lg text-sm font-medium transition-colors"
              >
                Chiudi
              </button>
              <button
                onClick={handleCreditTokens}
                disabled={crediting || !creditAmount}
                className="flex-1 px-4 py-2 bg-teal-600 hover:bg-teal-500 disabled:opacity-50 text-white rounded-lg text-sm font-bold transition-colors"
              >
                {crediting ? 'Accredito...' : 'Accredita Token'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Modal Assegnazione Piano */}
      {showAssignModal && (
        <ModalAssegnaPiano
          target={assignTarget}
          plans={plans}
          assignPlan={assignPlan}
          setAssignPlan={setAssignPlan}
          assignNote={assignNote}
          setAssignNote={setAssignNote}
          assignIsFree={assignIsFree}
          setAssignIsFree={setAssignIsFree}
          assigning={assigning}
          assignError={assignError}
          onConfirm={handleAssign}
          onClose={() => setShowAssignModal(false)}
        />
      )}
    </div>
  )
}

// =====================================================
// TAB: OVERVIEW
// =====================================================
function TabOverview({ loading, overview, planDistribution, maxPlanCount, subscriptions, onGoToRischio }) {
  // Calcola utenti a rischio token (client-side, dai dati già caricati)
  const { nWarning, nEsauriti } = (() => {
    let nW = 0, nE = 0
    ;(subscriptions || []).forEach(sub => {
      if (!['attivo', 'trial'].includes(sub.stato)) return
      const piano = sub.plan || {}
      const limite = (piano.token_ai_mensili || 0) + (sub.token_ai_bonus || 0)
      if (limite === 0) return // illimitato
      const usati = sub.token_ai_usati || 0
      const perc = (usati / limite) * 100
      if (perc >= 100) nE++
      else if (perc >= 80) nW++
    })
    return { nWarning: nW, nEsauriti: nE }
  })()
  if (loading) {
    return (
      <div className="flex items-center justify-center py-20">
        <div className="text-center">
          <div className="w-10 h-10 border-4 border-teal-500 border-t-transparent rounded-full animate-spin mx-auto"></div>
          <p className="mt-3 text-slate-400 text-sm">Caricamento dati...</p>
        </div>
      </div>
    )
  }

  const kpis = [
    {
      icon: '\uD83D\uDC65',
      label: 'Utenti Totali',
      value: formatNumber(overview.totale_utenti || 0),
      color: 'from-blue-500 to-cyan-500'
    },
    {
      icon: '\u2705',
      label: 'Abbonamenti Attivi',
      value: formatNumber(overview.utenti_attivi || 0),
      color: 'from-teal-500 to-emerald-500'
    },
    {
      icon: '\u23F3',
      label: 'Utenti Trial',
      value: formatNumber(overview.utenti_trial || 0),
      color: 'from-amber-500 to-yellow-500'
    },
    {
      icon: '\u274C',
      label: 'Scaduti',
      value: formatNumber(overview.utenti_scaduti || 0),
      color: 'from-red-500 to-rose-500'
    },
    {
      icon: '\u23F8\uFE0F',
      label: 'Sospesi',
      value: formatNumber(overview.utenti_sospesi || 0),
      color: 'from-slate-400 to-slate-500'
    },
    {
      icon: '\uD83D\uDCB0',
      label: 'MRR',
      value: formatCurrency(overview.mrr || 0),
      color: 'from-green-500 to-emerald-500'
    },
    {
      icon: '\uD83E\uDD16',
      label: 'Token AI (mese)',
      value: formatTokens(overview.token_consumati_mese || 0),
      color: 'from-purple-500 to-violet-500'
    },
    {
      icon: '\uD83C\uDFF7\uFE0F',
      label: 'Campagne Attive',
      value: formatNumber(overview.campagne_attive || 0),
      color: 'from-pink-500 to-rose-500'
    }
  ]

  return (
    <div className="space-y-6">
      {/* KPI Grid */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        {kpis.map((kpi, idx) => (
          <div
            key={idx}
            className="bg-slate-800/60 border border-slate-700/50 rounded-xl p-4 hover:border-slate-600/50 transition-colors"
          >
            <div className="flex items-center gap-2 mb-2">
              <span className="text-xl">{kpi.icon}</span>
              <span className="text-xs text-slate-400 font-medium">{kpi.label}</span>
            </div>
            <p className={`text-2xl font-bold bg-gradient-to-r ${kpi.color} bg-clip-text text-transparent`}>
              {kpi.value}
            </p>
          </div>
        ))}
      </div>

      {/* Alert token a rischio */}
      {(nWarning > 0 || nEsauriti > 0) && (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {nEsauriti > 0 && (
            <button
              onClick={() => onGoToRischio('esauriti')}
              className="text-left bg-red-900/30 border border-red-500/50 rounded-xl p-4 hover:border-red-400/70 transition-colors group"
            >
              <div className="flex items-center gap-3">
                <span className="text-2xl">🚨</span>
                <div>
                  <p className="text-red-300 font-bold text-lg">{nEsauriti} utent{nEsauriti === 1 ? 'e' : 'i'}</p>
                  <p className="text-red-400/80 text-sm">Token esauriti — abbonamento attivo senza rinnovo</p>
                </div>
                <span className="ml-auto text-red-400/60 group-hover:text-red-300 text-xs">Vedi →</span>
              </div>
            </button>
          )}
          {nWarning > 0 && (
            <button
              onClick={() => onGoToRischio('warning')}
              className="text-left bg-amber-900/30 border border-amber-500/50 rounded-xl p-4 hover:border-amber-400/70 transition-colors group"
            >
              <div className="flex items-center gap-3">
                <span className="text-2xl">⚠️</span>
                <div>
                  <p className="text-amber-300 font-bold text-lg">{nWarning} utent{nWarning === 1 ? 'e' : 'i'}</p>
                  <p className="text-amber-400/80 text-sm">Oltre l'80% dei token mensili consumati</p>
                </div>
                <span className="ml-auto text-amber-400/60 group-hover:text-amber-300 text-xs">Vedi →</span>
              </div>
            </button>
          )}
        </div>
      )}

      {/* Distribuzione per piano */}
      <div className="bg-slate-800/60 border border-slate-700/50 rounded-xl p-6">
        <h3 className="text-lg font-semibold text-white mb-4">Distribuzione per Piano</h3>
        {planDistribution.length === 0 ? (
          <div className="text-center py-8 text-slate-400">
            <p className="text-sm">Nessun dato di distribuzione disponibile</p>
          </div>
        ) : (
          <div className="space-y-3">
            {planDistribution.map((plan, idx) => {
              const percentage = maxPlanCount > 0 ? ((plan.count || 0) / maxPlanCount) * 100 : 0
              return (
                <div key={idx} className="flex items-center gap-4">
                  <div className="w-28 text-sm text-slate-300 font-medium truncate">
                    {plan.nome || plan.codice || 'N/D'}
                  </div>
                  <div className="flex-1 h-8 bg-slate-700/40 rounded-lg overflow-hidden relative">
                    <div
                      className="h-full bg-gradient-to-r from-teal-600 to-teal-400 rounded-lg transition-all duration-700"
                      style={{ width: `${Math.max(percentage, 2)}%` }}
                    />
                    <span className="absolute inset-0 flex items-center px-3 text-xs font-medium text-white">
                      {formatNumber(plan.count || 0)} utenti
                    </span>
                  </div>
                  <div className="w-16 text-right text-sm text-slate-400">
                    {plan.revenue != null ? formatCurrency(plan.revenue) : ''}
                  </div>
                </div>
              )
            })}
          </div>
        )}
      </div>
    </div>
  )
}

// =====================================================
// TAB: UTENTI
// =====================================================
function TabUtenti({
  loading,
  subscriptions,
  plans,
  searchEmail,
  setSearchEmail,
  filterPlan,
  setFilterPlan,
  filterStato,
  setFilterStato,
  filterRischio,
  setFilterRischio,
  onAssign
}) {
  // Filtra localmente per rischio token (derivato dai dati già caricati)
  const visibleSubs = filterRischio
    ? subscriptions.filter(sub => {
        if (!['attivo', 'trial'].includes(sub.stato)) return false
        const piano = sub.plan || {}
        const limite = (piano.token_ai_mensili || 0) + (sub.token_ai_bonus || 0)
        if (limite === 0) return false
        const perc = ((sub.token_ai_usati || 0) / limite) * 100
        if (filterRischio === 'esauriti') return perc >= 100
        if (filterRischio === 'warning') return perc >= 80 && perc < 100
        return true
      })
    : subscriptions

  return (
    <div className="space-y-4">
      {/* Filtri */}
      <div className="bg-slate-800/60 border border-slate-700/50 rounded-xl p-4">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {/* Search email */}
          <div>
            <label className="block text-xs font-medium text-slate-400 mb-1">Cerca per email</label>
            <div className="relative">
              <svg className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
              </svg>
              <input
                type="text"
                placeholder="email@esempio.it"
                value={searchEmail}
                onChange={(e) => setSearchEmail(e.target.value)}
                className="w-full pl-10 pr-3 py-2 bg-slate-900/60 border border-slate-600/50 rounded-lg text-white text-sm placeholder:text-slate-500 focus:ring-2 focus:ring-teal-500 focus:border-transparent"
              />
            </div>
          </div>

          {/* Filter by plan */}
          <div>
            <label className="block text-xs font-medium text-slate-400 mb-1">Piano</label>
            <select
              value={filterPlan}
              onChange={(e) => setFilterPlan(e.target.value)}
              className="w-full px-3 py-2 bg-slate-900/60 border border-slate-600/50 rounded-lg text-white text-sm focus:ring-2 focus:ring-teal-500 focus:border-transparent"
            >
              <option value="">Tutti i piani</option>
              {plans.filter(p => p.attivo !== false).map(p => (
                <option key={p.codice} value={p.codice}>{p.nome}</option>
              ))}
            </select>
          </div>

          {/* Filter by stato */}
          <div>
            <label className="block text-xs font-medium text-slate-400 mb-1">Stato</label>
            <select
              value={filterStato}
              onChange={(e) => setFilterStato(e.target.value)}
              className="w-full px-3 py-2 bg-slate-900/60 border border-slate-600/50 rounded-lg text-white text-sm focus:ring-2 focus:ring-teal-500 focus:border-transparent"
            >
              {STATI_ABBONAMENTO.map(s => (
                <option key={s.value} value={s.value}>{s.label}</option>
              ))}
            </select>
          </div>
        </div>
        {/* Filtri rapidi rischio token */}
        <div className="flex gap-2 mt-3 flex-wrap">
          <span className="text-xs text-slate-500 self-center">Filtro rapido:</span>
          <button
            onClick={() => setFilterRischio('')}
            className={`px-3 py-1 rounded-full text-xs font-medium transition-colors ${filterRischio === '' ? 'bg-slate-600 text-white' : 'bg-slate-800 text-slate-400 hover:text-white border border-slate-700'}`}
          >
            Tutti
          </button>
          <button
            onClick={() => setFilterRischio('esauriti')}
            className={`px-3 py-1 rounded-full text-xs font-medium transition-colors ${filterRischio === 'esauriti' ? 'bg-red-600 text-white' : 'bg-slate-800 text-slate-400 hover:text-red-300 border border-slate-700'}`}
          >
            🚨 Token esauriti
          </button>
          <button
            onClick={() => setFilterRischio('warning')}
            className={`px-3 py-1 rounded-full text-xs font-medium transition-colors ${filterRischio === 'warning' ? 'bg-amber-600 text-white' : 'bg-slate-800 text-slate-400 hover:text-amber-300 border border-slate-700'}`}
          >
            ⚠️ Oltre 80%
          </button>
        </div>
      </div>

      {/* Loading */}
      {loading ? (
        <div className="flex items-center justify-center py-16">
          <div className="text-center">
            <div className="w-10 h-10 border-4 border-teal-500 border-t-transparent rounded-full animate-spin mx-auto"></div>
            <p className="mt-3 text-slate-400 text-sm">Caricamento utenti...</p>
          </div>
        </div>
      ) : visibleSubs.length === 0 ? (
        /* Empty state */
        <div className="bg-slate-800/60 border border-slate-700/50 rounded-xl p-12 text-center">
          <div className="text-5xl mb-4">
            {searchEmail || filterPlan || filterStato || filterRischio ? '\uD83D\uDD0D' : '\uD83D\uDCCB'}
          </div>
          <p className="text-slate-400 text-sm">
            {searchEmail || filterPlan || filterStato || filterRischio
              ? 'Nessun abbonamento trovato con i filtri selezionati'
              : 'Nessun abbonamento presente'}
          </p>
          {(searchEmail || filterPlan || filterStato || filterRischio) && (
            <button
              onClick={() => {
                setSearchEmail('')
                setFilterPlan('')
                setFilterStato('')
                setFilterRischio('')
              }}
              className="mt-3 text-teal-400 hover:text-teal-300 text-sm underline"
            >
              Resetta filtri
            </button>
          )}
        </div>
      ) : (
        /* Table */
        <div className="bg-slate-800/40 border border-slate-700/50 rounded-xl overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="border-b border-slate-700/50">
                  <th className="text-left p-4 text-xs font-medium text-slate-400 uppercase tracking-wider">Email</th>
                  <th className="text-left p-4 text-xs font-medium text-slate-400 uppercase tracking-wider">Nome</th>
                  <th className="text-left p-4 text-xs font-medium text-slate-400 uppercase tracking-wider">Piano</th>
                  <th className="text-left p-4 text-xs font-medium text-slate-400 uppercase tracking-wider">Stato</th>
                  <th className="text-left p-4 text-xs font-medium text-slate-400 uppercase tracking-wider">Token</th>
                  <th className="text-left p-4 text-xs font-medium text-slate-400 uppercase tracking-wider">Scadenza</th>
                  <th className="text-left p-4 text-xs font-medium text-slate-400 uppercase tracking-wider">Azioni</th>
                </tr>
              </thead>
              <tbody>
                {visibleSubs.map((sub) => {
                  const user = sub.user || {}
                  const plan = sub.plan || {}
                  const stato = sub.stato || 'sospeso'
                  const badgeClass = STATO_BADGE_COLORS[stato] || STATO_BADGE_COLORS.sospeso
                  const tokenUsati = sub.token_ai_usati || 0
                  const tokenLimite = (plan.token_ai_mensili || 0) + (sub.token_ai_bonus || 0)
                  const illimitato = tokenLimite === 0
                  const perc = illimitato ? 0 : Math.min((tokenUsati / tokenLimite) * 100, 100)
                  const isEsaurito = !illimitato && perc >= 100
                  const isWarning = !illimitato && perc >= 80 && perc < 100
                  const barColor = isEsaurito
                    ? 'from-red-600 to-red-500'
                    : isWarning
                    ? 'from-amber-600 to-amber-400'
                    : 'from-teal-600 to-teal-400'

                  return (
                    <tr key={sub.id || sub.user_id} className={`border-b border-slate-700/30 hover:bg-slate-700/40 transition-colors ${isEsaurito ? 'bg-red-900/10' : isWarning ? 'bg-amber-900/10' : ''}`}>
                      <td className="p-4">
                        <div className="flex items-center gap-1.5">
                          {isEsaurito && <span title="Token esauriti">🚨</span>}
                          {isWarning && <span title="Oltre 80% consumato">⚠️</span>}
                          <span className="text-slate-300 text-sm">{user.email || '-'}</span>
                        </div>
                      </td>
                      <td className="p-4">
                        <span className="text-white text-sm font-medium">
                          {user.nome || user.cognome
                            ? `${user.nome || ''} ${user.cognome || ''}`.trim()
                            : '-'}
                        </span>
                      </td>
                      <td className="p-4">
                        <span className="px-2 py-1 bg-slate-700/50 text-slate-300 rounded text-xs font-medium">
                          {plan.nome || plan.codice || '-'}
                        </span>
                      </td>
                      <td className="p-4">
                        <span className={`px-2 py-1 rounded text-xs font-medium border ${badgeClass}`}>
                          {stato.charAt(0).toUpperCase() + stato.slice(1)}
                        </span>
                      </td>
                      <td className="p-4 min-w-[140px]">
                        {illimitato ? (
                          <span className="text-slate-400 text-sm">∞ illimitato</span>
                        ) : (
                          <div className="space-y-1">
                            <div className="flex justify-between text-xs">
                              <span className={isEsaurito ? 'text-red-400 font-semibold' : isWarning ? 'text-amber-400 font-semibold' : 'text-slate-300'}>
                                {formatTokens(tokenUsati)} / {formatTokens(tokenLimite)}
                              </span>
                              <span className={isEsaurito ? 'text-red-400' : isWarning ? 'text-amber-400' : 'text-slate-500'}>
                                {Math.round(perc)}%
                              </span>
                            </div>
                            <div className="h-1.5 bg-slate-700 rounded-full overflow-hidden">
                              <div
                                className={`h-full bg-gradient-to-r ${barColor} rounded-full transition-all`}
                                style={{ width: `${Math.max(perc, 2)}%` }}
                              />
                            </div>
                          </div>
                        )}
                      </td>
                      <td className="p-4">
                        <span className="text-slate-400 text-sm">{formatDate(sub.data_fine)}</span>
                      </td>
                      <td className="p-4">
                        <button
                          onClick={() => onAssign(sub)}
                          className="px-3 py-1.5 bg-teal-600 hover:bg-teal-500 text-white text-xs font-medium rounded-lg transition-colors"
                        >
                          Assegna Piano
                        </button>
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>
          <div className="px-4 py-3 border-t border-slate-700/50 text-xs text-slate-500">
            {formatNumber(visibleSubs.length)}{visibleSubs.length !== subscriptions.length ? ` di ${formatNumber(subscriptions.length)}` : ''} risultati
          </div>
        </div>
      )}
    </div>
  )
}

// =====================================================
// TAB: PIANI (con modifica)
// =====================================================
function TabPiani({ loading, plans, onReload }) {
  const [editPlan, setEditPlan] = useState(null)
  const [saving, setSaving] = useState(false)
  const [saveError, setSaveError] = useState(null)
  const [saveSuccess, setSaveSuccess] = useState(false)

  const openEdit = (plan) => {
    setEditPlan({ ...plan })
    setSaveError(null)
    setSaveSuccess(false)
  }

  const handleFieldChange = (field, value) => {
    setEditPlan(prev => ({ ...prev, [field]: value }))
  }

  const handleSave = async () => {
    if (!editPlan?.id) return
    setSaving(true)
    setSaveError(null)
    setSaveSuccess(false)
    try {
      const res = await fetch('/api/admin/plans', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(editPlan)
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error || 'Errore salvataggio')
      setSaveSuccess(true)
      onReload()
      setTimeout(() => setEditPlan(null), 800)
    } catch (err) {
      setSaveError(err.message)
    } finally {
      setSaving(false)
    }
  }

  const toggleAttivo = async (plan) => {
    try {
      const res = await fetch('/api/admin/plans', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id: plan.id, attivo: !plan.attivo })
      })
      if (!res.ok) throw new Error('Errore toggle')
      onReload()
    } catch (err) {
      console.error('Errore toggle attivo:', err)
    }
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center py-20">
        <div className="text-center">
          <div className="w-10 h-10 border-4 border-teal-500 border-t-transparent rounded-full animate-spin mx-auto"></div>
          <p className="mt-3 text-slate-400 text-sm">Caricamento piani...</p>
        </div>
      </div>
    )
  }

  if (plans.length === 0) {
    return (
      <div className="bg-slate-800/60 border border-slate-700/50 rounded-xl p-12 text-center">
        <p className="text-slate-400 text-sm">Nessun piano configurato</p>
      </div>
    )
  }

  return (
    <>
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {plans.map((plan) => (
          <div
            key={plan.id || plan.codice}
            className={`bg-slate-800/60 border rounded-xl p-6 transition-colors relative ${
              plan.attivo
                ? 'border-slate-700/50 hover:border-teal-500/30'
                : 'border-red-500/30 opacity-60'
            }`}
          >
            {/* Badge nascosto */}
            {!plan.attivo && (
              <div className="absolute top-3 right-3 px-2 py-0.5 bg-red-500/20 text-red-400 border border-red-500/40 rounded text-[10px] font-bold uppercase">
                Nascosto
              </div>
            )}

            {/* Header piano */}
            <div className="flex items-center justify-between mb-4">
              <div>
                <h3 className="text-lg font-bold text-white">{plan.nome}</h3>
                <span className="text-xs text-slate-400 font-mono bg-slate-700/50 px-2 py-0.5 rounded">
                  {plan.codice}
                </span>
              </div>
              <div className="flex gap-1">
                {plan.is_free && (
                  <span className="px-2 py-1 bg-emerald-500/20 text-emerald-400 border border-emerald-500/40 rounded text-xs font-medium">
                    FREE
                  </span>
                )}
                {plan.is_trial && (
                  <span className="px-2 py-1 bg-amber-500/20 text-amber-400 border border-amber-500/40 rounded text-xs font-medium">
                    TRIAL
                  </span>
                )}
              </div>
            </div>

            {/* Prezzi */}
            <div className="space-y-1 mb-4">
              <div className="flex items-baseline gap-2">
                <span className="text-2xl font-bold text-white">{formatCurrency(plan.prezzo_mensile || 0)}</span>
                <span className="text-xs text-slate-400">/mese</span>
              </div>
              {plan.prezzo_trimestrale != null && plan.prezzo_trimestrale > 0 && (
                <div className="text-sm text-slate-400">
                  {formatCurrency(plan.prezzo_trimestrale)}<span className="text-xs">/trimestre</span>
                </div>
              )}
              {plan.prezzo_annuale != null && plan.prezzo_annuale > 0 && (
                <div className="text-sm text-slate-400">
                  {formatCurrency(plan.prezzo_annuale)}<span className="text-xs">/anno</span>
                </div>
              )}
            </div>

            {/* Limiti */}
            <div className="space-y-2 mb-4">
              <h4 className="text-xs font-semibold text-slate-400 uppercase tracking-wider">Limiti</h4>
              <div className="grid grid-cols-2 gap-2 text-sm">
                <div className="flex justify-between">
                  <span className="text-slate-400">Token AI</span>
                  <span className="text-white font-medium">
                    {plan.token_ai_mensili ? formatTokens(plan.token_ai_mensili) : '\u221E'}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-400">Ore HPA</span>
                  <span className="text-white font-medium">
                    {plan.ore_hpa_mensili != null && plan.ore_hpa_mensili > 0 ? plan.ore_hpa_mensili : '\u221E'}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-400">Centri</span>
                  <span className="text-white font-medium">
                    {plan.centri_max != null && plan.centri_max > 0 ? plan.centri_max : '\u221E'}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-400">Utenti</span>
                  <span className="text-white font-medium">
                    {plan.utenti_max != null && plan.utenti_max > 0 ? plan.utenti_max : '\u221E'}
                  </span>
                </div>
              </div>
            </div>

            {/* Funzionalita */}
            {plan.funzionalita && plan.funzionalita.length > 0 && (
              <div className="mb-4">
                <h4 className="text-xs font-semibold text-slate-400 uppercase tracking-wider mb-2">Funzionalita</h4>
                <div className="flex flex-wrap gap-1.5">
                  {plan.funzionalita.map((feat, idx) => (
                    <span
                      key={idx}
                      className="px-2 py-0.5 bg-teal-500/15 text-teal-400 border border-teal-500/30 rounded-full text-xs"
                    >
                      {feat}
                    </span>
                  ))}
                </div>
              </div>
            )}

            {/* Info trial */}
            {plan.is_trial && plan.durata_trial_giorni && (
              <div className="mb-4 text-xs text-slate-400">
                Durata trial: <span className="text-amber-400 font-medium">{plan.durata_trial_giorni} giorni</span>
              </div>
            )}

            {/* Azioni */}
            <div className="pt-3 border-t border-slate-700/50 flex gap-2">
              <button
                onClick={() => openEdit(plan)}
                className="flex-1 px-3 py-2 bg-teal-600 hover:bg-teal-500 text-white text-xs font-medium rounded-lg transition-colors"
              >
                Modifica
              </button>
              <button
                onClick={() => toggleAttivo(plan)}
                className={`px-3 py-2 text-xs font-medium rounded-lg transition-colors border ${
                  plan.attivo
                    ? 'bg-slate-700/60 hover:bg-red-500/20 text-slate-300 hover:text-red-400 border-slate-600/50 hover:border-red-500/40'
                    : 'bg-emerald-500/20 hover:bg-emerald-500/30 text-emerald-400 border-emerald-500/40'
                }`}
                title={plan.attivo ? 'Nascondi agli utenti' : 'Rendi visibile'}
              >
                {plan.attivo ? 'Nascondi' : 'Mostra'}
              </button>
            </div>
          </div>
        ))}
      </div>

      {/* Modal Modifica Piano */}
      {editPlan && (
        <ModalModificaPiano
          plan={editPlan}
          onChange={handleFieldChange}
          onSave={handleSave}
          onClose={() => setEditPlan(null)}
          saving={saving}
          saveError={saveError}
          saveSuccess={saveSuccess}
        />
      )}
    </>
  )
}

// =====================================================
// MODAL: MODIFICA PIANO
// =====================================================
function ModalModificaPiano({ plan, onChange, onSave, onClose, saving, saveError, saveSuccess }) {
  const inputClass = "w-full px-3 py-2 bg-slate-900/60 border border-slate-600/50 rounded-lg text-white text-sm focus:ring-2 focus:ring-teal-500 focus:border-transparent"
  const labelClass = "block text-xs font-medium text-slate-400 mb-1"

  return (
    <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-start justify-center z-50 p-4 overflow-y-auto">
      <div className="bg-slate-800 rounded-xl border border-slate-700 w-full max-w-2xl my-8">
        {/* Header */}
        <div className="p-6 border-b border-slate-700 flex items-center justify-between">
          <div>
            <h3 className="text-lg font-bold text-white">Modifica Piano</h3>
            <p className="text-sm text-slate-400 mt-1">
              Codice: <span className="text-teal-400 font-mono">{plan.codice}</span>
            </p>
          </div>
          <button onClick={onClose} className="text-slate-400 hover:text-white p-1">
            <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        {/* Body */}
        <div className="p-6 space-y-6 max-h-[70vh] overflow-y-auto">
          {/* Feedback */}
          {saveError && (
            <div className="bg-red-500/20 border border-red-500/40 text-red-400 px-4 py-2 rounded-lg text-sm">
              {saveError}
            </div>
          )}
          {saveSuccess && (
            <div className="bg-emerald-500/20 border border-emerald-500/40 text-emerald-400 px-4 py-2 rounded-lg text-sm">
              Piano aggiornato con successo!
            </div>
          )}

          {/* SEZIONE: Info base */}
          <div>
            <h4 className="text-sm font-semibold text-white mb-3 flex items-center gap-2">
              <span className="w-6 h-6 bg-teal-600 rounded flex items-center justify-center text-xs">1</span>
              Informazioni Base
            </h4>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className={labelClass}>Nome Piano</label>
                <input
                  type="text"
                  value={plan.nome || ''}
                  onChange={(e) => onChange('nome', e.target.value)}
                  className={inputClass}
                />
              </div>
              <div>
                <label className={labelClass}>Ordine visualizzazione</label>
                <input
                  type="number"
                  value={plan.ordine ?? 0}
                  onChange={(e) => onChange('ordine', e.target.value)}
                  className={inputClass}
                />
              </div>
              <div className="md:col-span-2">
                <label className={labelClass}>Descrizione</label>
                <textarea
                  value={plan.descrizione || ''}
                  onChange={(e) => onChange('descrizione', e.target.value)}
                  rows={2}
                  className={inputClass + ' resize-none'}
                />
              </div>
            </div>
          </div>

          {/* SEZIONE: Prezzi */}
          <div>
            <h4 className="text-sm font-semibold text-white mb-3 flex items-center gap-2">
              <span className="w-6 h-6 bg-teal-600 rounded flex items-center justify-center text-xs">2</span>
              Prezzi
            </h4>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div>
                <label className={labelClass}>Prezzo Mensile</label>
                <div className="relative">
                  <span className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-500 text-sm">&euro;</span>
                  <input
                    type="number"
                    step="0.01"
                    min="0"
                    value={plan.prezzo_mensile ?? 0}
                    onChange={(e) => onChange('prezzo_mensile', e.target.value)}
                    className={inputClass + ' pl-7'}
                  />
                </div>
              </div>
              <div>
                <label className={labelClass}>Prezzo Trimestrale</label>
                <div className="relative">
                  <span className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-500 text-sm">&euro;</span>
                  <input
                    type="number"
                    step="0.01"
                    min="0"
                    value={plan.prezzo_trimestrale ?? 0}
                    onChange={(e) => onChange('prezzo_trimestrale', e.target.value)}
                    className={inputClass + ' pl-7'}
                  />
                </div>
                <p className="text-[10px] text-slate-500 mt-1">0 = non disponibile</p>
              </div>
              <div>
                <label className={labelClass}>Prezzo Annuale</label>
                <div className="relative">
                  <span className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-500 text-sm">&euro;</span>
                  <input
                    type="number"
                    step="0.01"
                    min="0"
                    value={plan.prezzo_annuale ?? 0}
                    onChange={(e) => onChange('prezzo_annuale', e.target.value)}
                    className={inputClass + ' pl-7'}
                  />
                </div>
              </div>
            </div>
          </div>

          {/* SEZIONE: Limiti */}
          <div>
            <h4 className="text-sm font-semibold text-white mb-3 flex items-center gap-2">
              <span className="w-6 h-6 bg-teal-600 rounded flex items-center justify-center text-xs">3</span>
              Limiti Risorse
              <span className="text-[10px] text-slate-500 font-normal">(0 = illimitato)</span>
            </h4>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              <div>
                <label className={labelClass}>Token AI / mese</label>
                <input
                  type="number"
                  min="0"
                  value={plan.token_ai_mensili ?? 0}
                  onChange={(e) => onChange('token_ai_mensili', e.target.value)}
                  className={inputClass}
                />
              </div>
              <div>
                <label className={labelClass}>Ore HPA / mese</label>
                <input
                  type="number"
                  step="0.5"
                  min="0"
                  value={plan.ore_hpa_mensili ?? 0}
                  onChange={(e) => onChange('ore_hpa_mensili', e.target.value)}
                  className={inputClass}
                />
              </div>
              <div>
                <label className={labelClass}>Centri max</label>
                <input
                  type="number"
                  min="0"
                  value={plan.centri_max ?? 0}
                  onChange={(e) => onChange('centri_max', e.target.value)}
                  className={inputClass}
                />
              </div>
              <div>
                <label className={labelClass}>Utenti max</label>
                <input
                  type="number"
                  min="0"
                  value={plan.utenti_max ?? 0}
                  onChange={(e) => onChange('utenti_max', e.target.value)}
                  className={inputClass}
                />
              </div>
            </div>
          </div>

          {/* SEZIONE: Flags */}
          <div>
            <h4 className="text-sm font-semibold text-white mb-3 flex items-center gap-2">
              <span className="w-6 h-6 bg-teal-600 rounded flex items-center justify-center text-xs">4</span>
              Tipo Piano
            </h4>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div className="flex items-center gap-3 bg-slate-900/40 p-3 rounded-lg border border-slate-700/50">
                <input
                  type="checkbox"
                  id="edit_is_free"
                  checked={plan.is_free || false}
                  onChange={(e) => onChange('is_free', e.target.checked)}
                  className="rounded border-slate-600 bg-slate-900 text-teal-500 focus:ring-teal-500 w-4 h-4"
                />
                <label htmlFor="edit_is_free" className="text-sm text-slate-300">
                  Piano Free
                  <span className="block text-[10px] text-slate-500">Solo admin puo assegnare</span>
                </label>
              </div>
              <div className="flex items-center gap-3 bg-slate-900/40 p-3 rounded-lg border border-slate-700/50">
                <input
                  type="checkbox"
                  id="edit_is_trial"
                  checked={plan.is_trial || false}
                  onChange={(e) => onChange('is_trial', e.target.checked)}
                  className="rounded border-slate-600 bg-slate-900 text-teal-500 focus:ring-teal-500 w-4 h-4"
                />
                <label htmlFor="edit_is_trial" className="text-sm text-slate-300">
                  Piano Trial
                  <span className="block text-[10px] text-slate-500">Ha durata limitata</span>
                </label>
              </div>
              {plan.is_trial && (
                <div>
                  <label className={labelClass}>Durata Trial (giorni)</label>
                  <input
                    type="number"
                    min="1"
                    value={plan.durata_trial_giorni ?? 30}
                    onChange={(e) => onChange('durata_trial_giorni', e.target.value)}
                    className={inputClass}
                  />
                </div>
              )}
            </div>
          </div>

          {/* SEZIONE: Funzionalita */}
          <div>
            <h4 className="text-sm font-semibold text-white mb-3 flex items-center gap-2">
              <span className="w-6 h-6 bg-teal-600 rounded flex items-center justify-center text-xs">5</span>
              Funzionalita Abilitate
            </h4>
            <div>
              <label className={labelClass}>Lista funzionalita (separate da virgola)</label>
              <textarea
                value={Array.isArray(plan.funzionalita) ? plan.funzionalita.join(', ') : (plan.funzionalita || '')}
                onChange={(e) => onChange('funzionalita', e.target.value)}
                rows={3}
                placeholder="dashboard, movimenti, analytics_base, pianificazione, obiettivi, budget, report_pdf, analytics_avanzate, benchmark, piani_ottimizzazione"
                className={inputClass + ' resize-none font-mono text-xs'}
              />
              <p className="text-[10px] text-slate-500 mt-1">
                Codici disponibili: dashboard, movimenti, analytics_base, analytics_avanzate, benchmark, pianificazione, obiettivi, budget, report_pdf, piani_ottimizzazione
              </p>
            </div>
            {/* Preview chips */}
            {plan.funzionalita && (
              <div className="flex flex-wrap gap-1.5 mt-2">
                {(Array.isArray(plan.funzionalita) ? plan.funzionalita : plan.funzionalita.split(',').map(f => f.trim()).filter(Boolean)).map((feat, idx) => (
                  <span key={idx} className="px-2 py-0.5 bg-teal-500/15 text-teal-400 border border-teal-500/30 rounded-full text-xs">
                    {feat}
                  </span>
                ))}
              </div>
            )}
          </div>

          {/* SEZIONE: Visibilita */}
          <div>
            <h4 className="text-sm font-semibold text-white mb-3 flex items-center gap-2">
              <span className="w-6 h-6 bg-teal-600 rounded flex items-center justify-center text-xs">6</span>
              Visibilita
            </h4>
            <div className="flex items-center gap-3 bg-slate-900/40 p-3 rounded-lg border border-slate-700/50">
              <input
                type="checkbox"
                id="edit_attivo"
                checked={plan.attivo !== false}
                onChange={(e) => onChange('attivo', e.target.checked)}
                className="rounded border-slate-600 bg-slate-900 text-teal-500 focus:ring-teal-500 w-4 h-4"
              />
              <label htmlFor="edit_attivo" className="text-sm text-slate-300">
                Visibile agli utenti
                <span className="block text-[10px] text-slate-500">Se disattivato, il piano non appare nella schermata abbonamento utente</span>
              </label>
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="p-6 border-t border-slate-700 flex gap-3 justify-end">
          <button
            onClick={onClose}
            disabled={saving}
            className="px-4 py-2 text-sm font-medium text-slate-400 hover:text-white bg-slate-700 hover:bg-slate-600 rounded-lg transition-colors"
          >
            Annulla
          </button>
          <button
            onClick={onSave}
            disabled={saving}
            className="px-6 py-2 text-sm font-medium bg-teal-600 hover:bg-teal-500 text-white rounded-lg transition-colors disabled:opacity-50"
          >
            {saving ? (
              <span className="flex items-center gap-2">
                <svg className="w-4 h-4 animate-spin" fill="none" viewBox="0 0 24 24">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
                </svg>
                Salvataggio...
              </span>
            ) : saveSuccess ? (
              'Salvato!'
            ) : (
              'Salva Modifiche'
            )}
          </button>
        </div>
      </div>
    </div>
  )
}

// =====================================================
// MODAL: ASSEGNA PIANO
// =====================================================
function ModalAssegnaPiano({
  target,
  plans,
  assignPlan,
  setAssignPlan,
  assignNote,
  setAssignNote,
  assignIsFree,
  setAssignIsFree,
  assigning,
  assignError,
  onConfirm,
  onClose
}) {
  return (
    <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50 p-4">
      <div className="bg-slate-800 rounded-xl border border-slate-700 w-full max-w-md">
        {/* Header */}
        <div className="p-6 border-b border-slate-700">
          <h3 className="text-lg font-bold text-white">Assegna Piano</h3>
          <p className="text-sm text-slate-400 mt-1">
            Utente: <span className="text-white">{target?.email || target?.nome || 'N/D'}</span>
          </p>
        </div>

        {/* Body */}
        <div className="p-6 space-y-4">
          {assignError && (
            <div className="bg-red-500/20 border border-red-500/40 text-red-400 px-4 py-2 rounded-lg text-sm">
              {assignError}
            </div>
          )}

          {/* Selezione piano */}
          <div>
            <label className="block text-sm font-medium text-slate-300 mb-1">Piano *</label>
            <select
              value={assignPlan}
              onChange={(e) => setAssignPlan(e.target.value)}
              className="w-full px-3 py-2 bg-slate-900 border border-slate-600 rounded-lg text-white text-sm focus:ring-2 focus:ring-teal-500 focus:border-transparent"
            >
              <option value="">Seleziona piano...</option>
              {plans.filter(p => p.attivo !== false).map(p => (
                <option key={p.codice} value={p.codice}>
                  {p.nome} - {formatCurrency(p.prezzo_mensile || 0)}/mese
                </option>
              ))}
            </select>
          </div>

          {/* Note admin */}
          <div>
            <label className="block text-sm font-medium text-slate-300 mb-1">Note Admin</label>
            <textarea
              value={assignNote}
              onChange={(e) => setAssignNote(e.target.value)}
              rows={3}
              placeholder="Motivazione o note per l'assegnazione..."
              className="w-full px-3 py-2 bg-slate-900 border border-slate-600 rounded-lg text-white text-sm placeholder:text-slate-500 focus:ring-2 focus:ring-teal-500 focus:border-transparent resize-none"
            />
          </div>

          {/* Checkbox free */}
          <div className="flex items-center gap-3">
            <input
              type="checkbox"
              id="is_free_checkbox"
              checked={assignIsFree}
              onChange={(e) => setAssignIsFree(e.target.checked)}
              className="rounded border-slate-600 bg-slate-900 text-teal-500 focus:ring-teal-500 w-4 h-4"
            />
            <label htmlFor="is_free_checkbox" className="text-sm text-slate-300">
              Imposta come Free
              <span className="block text-xs text-slate-500">Il piano non avra scadenza e sara gratuito</span>
            </label>
          </div>
        </div>

        {/* Footer */}
        <div className="p-6 border-t border-slate-700 flex gap-3 justify-end">
          <button
            onClick={onClose}
            disabled={assigning}
            className="px-4 py-2 text-sm font-medium text-slate-400 hover:text-white bg-slate-700 hover:bg-slate-600 rounded-lg transition-colors"
          >
            Annulla
          </button>
          <button
            onClick={onConfirm}
            disabled={assigning || !assignPlan}
            className="px-4 py-2 text-sm font-medium bg-teal-600 hover:bg-teal-500 text-white rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {assigning ? (
              <span className="flex items-center gap-2">
                <svg className="w-4 h-4 animate-spin" fill="none" viewBox="0 0 24 24">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
                </svg>
                Assegnazione...
              </span>
            ) : (
              'Conferma Assegnazione'
            )}
          </button>
        </div>
      </div>
    </div>
  )
}

// =====================================================
// TAB: TOKEN ADDON
// =====================================================
function TabTokenAddon({ loading, purchases, onReload, onOpenCredit }) {
  if (loading) {
    return (
      <div className="flex items-center justify-center py-20">
        <div className="text-center">
          <div className="w-10 h-10 border-4 border-teal-500 border-t-transparent rounded-full animate-spin mx-auto"></div>
          <p className="mt-3 text-slate-400 text-sm">Caricamento acquisti...</p>
        </div>
      </div>
    )
  }

  function formatTokens(n) {
    if (!n) return '0'
    if (n >= 1000000) return `${(n / 1000000).toFixed(1)}M`
    if (n >= 1000) return `${Math.round(n / 1000)}K`
    return String(n)
  }

  function formatDate(d) {
    if (!d) return '-'
    return new Intl.DateTimeFormat('it-IT', { day: '2-digit', month: '2-digit', year: 'numeric', hour: '2-digit', minute: '2-digit' }).format(new Date(d))
  }

  const isManual = (p) => p.stripe_checkout_session_id?.startsWith('admin_manual_')

  return (
    <div className="space-y-4">
      {/* Header + azioni */}
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div>
          <h2 className="text-lg font-bold text-white">Acquisti Token Addon</h2>
          <p className="text-sm text-slate-400">{purchases.length} acquisti totali</p>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={() => onOpenCredit({ user_id: '', user_profiles: { email: '' } })}
            className="px-4 py-2 bg-teal-600 hover:bg-teal-500 text-white rounded-lg text-sm font-bold transition-colors"
          >
            + Accredita Token Manualmente
          </button>
          <button
            onClick={onReload}
            className="px-3 py-2 bg-slate-700/60 hover:bg-slate-700 text-slate-300 rounded-lg text-sm transition-colors"
          >
            Aggiorna
          </button>
        </div>
      </div>

      {purchases.length === 0 ? (
        <div className="bg-slate-950/40 border border-slate-700/40 rounded-xl p-10 text-center">
          <p className="text-4xl mb-3">⚡</p>
          <p className="text-slate-400 text-sm">Nessun acquisto addon registrato</p>
        </div>
      ) : (
        <div className="bg-slate-950/40 border border-slate-700/40 rounded-xl overflow-hidden">
          <table className="w-full">
            <thead>
              <tr className="border-b border-slate-700/40">
                <th className="px-4 py-3 text-left text-xs font-semibold text-slate-400 uppercase tracking-wider">Utente</th>
                <th className="px-4 py-3 text-left text-xs font-semibold text-slate-400 uppercase tracking-wider">Pacchetto</th>
                <th className="px-4 py-3 text-right text-xs font-semibold text-slate-400 uppercase tracking-wider">Token</th>
                <th className="px-4 py-3 text-right text-xs font-semibold text-slate-400 uppercase tracking-wider">Importo</th>
                <th className="px-4 py-3 text-left text-xs font-semibold text-slate-400 uppercase tracking-wider">Fonte</th>
                <th className="px-4 py-3 text-left text-xs font-semibold text-slate-400 uppercase tracking-wider">Data</th>
                <th className="px-4 py-3 text-center text-xs font-semibold text-slate-400 uppercase tracking-wider">Azioni</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-700/30">
              {purchases.map(p => (
                <tr key={p.id} className="hover:bg-slate-800/30 transition-colors">
                  <td className="px-4 py-3">
                    <p className="text-sm text-white">{p.user_profiles?.email || p.user_id?.slice(0, 8) + '...'}</p>
                    {p.user_profiles?.nome && (
                      <p className="text-xs text-slate-400">{p.user_profiles.nome}</p>
                    )}
                  </td>
                  <td className="px-4 py-3">
                    <p className="text-sm text-slate-300">{p.addon_packages?.nome || '-'}</p>
                  </td>
                  <td className="px-4 py-3 text-right">
                    <span className="text-sm font-mono text-teal-400">
                      +{formatTokens(p.addon_packages?.token_ai_bonus || 0)}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-right">
                    <span className="text-sm text-slate-300">
                      {p.importo > 0 ? `€${Number(p.importo).toFixed(2)}` : <span className="text-slate-500">—</span>}
                    </span>
                  </td>
                  <td className="px-4 py-3">
                    {isManual(p) ? (
                      <span className="px-2 py-0.5 rounded-full text-xs bg-amber-500/20 text-amber-400 border border-amber-500/40">
                        Manuale
                      </span>
                    ) : (
                      <span className="px-2 py-0.5 rounded-full text-xs bg-teal-500/20 text-teal-400 border border-teal-500/40">
                        Stripe
                      </span>
                    )}
                  </td>
                  <td className="px-4 py-3">
                    <span className="text-xs text-slate-400">{formatDate(p.created_at)}</span>
                  </td>
                  <td className="px-4 py-3 text-center">
                    <button
                      onClick={() => onOpenCredit(p)}
                      className="px-2 py-1 text-xs text-teal-400 hover:text-teal-300 border border-teal-600/40 hover:border-teal-500/60 rounded-lg transition-colors"
                    >
                      + Token
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  )
}
