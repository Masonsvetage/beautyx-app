'use client'

import { useState, useEffect, useMemo } from 'react'
import Link from 'next/link'
import { useAuth } from '@/contexts/AuthContext'
import { supabase } from '@/lib/supabase'

// Definizione ruoli gerarchici
const RUOLI_GERARCHICI = [
  { value: 'admin', label: 'Admin', level: 0, color: 'emerald', description: 'Accesso completo al sistema' },
  { value: 'hpa', label: 'HPA (Consulente)', level: 1, color: 'purple', description: 'Gestisce centri assegnati' },
  { value: 'titolare', label: 'Titolare', level: 2, color: 'cyan', description: 'Proprietario del centro' },
  { value: 'direttore', label: 'Direttore', level: 3, color: 'blue', description: 'Direttore di sede' },
  { value: 'amministrativo', label: 'Amministrativo', level: 3, color: 'amber', description: 'Responsabile amministrativo' }
]

const TIPI_SOCIETA = ['SRL', 'SRLS', 'SAS', 'SNC', 'SPA', 'SAPA', 'SS', 'Ditta Individuale', 'Altro']

export default function AdminUsersPage() {
  const { isAdmin, user: currentUser } = useAuth()
  const [users, setUsers] = useState([])
  const [centri, setCentri] = useState([])
  const [organizations, setOrganizations] = useState([])
  const [availablePlans, setAvailablePlans] = useState([])
  const [loading, setLoading] = useState(true)
  const [filter, setFilter] = useState('all') // all, admin, hpa, titolare, direttore, amministrativo, bloccati
  const [search, setSearch] = useState('')
  const [unlocking, setUnlocking] = useState(null) // ID utente in fase di sblocco
  const [editingUser, setEditingUser] = useState(null)
  const [saving, setSaving] = useState(false)
  const [showCreateModal, setShowCreateModal] = useState(false)
  const [showPermissionsModal, setShowPermissionsModal] = useState(null)
  const [deletingUser, setDeletingUser] = useState(null)
  const [deleting, setDeleting] = useState(false)
  const [newUser, setNewUser] = useState({
    email: '',
    password: '',
    nome: '',
    cognome: '',
    ruolo_livello: 'titolare',
    piano: 'demo',
    centro_id: '',
    organization_id: '',
    parent_user_id: '',
    tipo_soggetto: 'persona_fisica',
    ragione_sociale: '',
    tipo_societa: '',
    codice_fiscale: '',
    partita_iva: '',
    cellulare: '',
    telefono_fisso: '',
    pec: '',
    residenza_indirizzo: '',
    residenza_civico: '',
    residenza_cap: '',
    residenza_citta: '',
    residenza_provincia: '',
    domicilio_diverso: false,
    domicilio_indirizzo: '',
    domicilio_civico: '',
    domicilio_cap: '',
    domicilio_citta: '',
    domicilio_provincia: ''
  })
  const [createError, setCreateError] = useState(null)

  useEffect(() => {
    loadData()
  }, [])

  const loadData = async () => {
    try {
      console.log('[ADMIN USERS] Inizio caricamento dati...')

      // Carica utenti (query semplice)
      console.log('[ADMIN USERS] Query user_profiles...')
      const { data: usersData, error: usersError } = await supabase
        .from('user_profiles')
        .select('*')
        .order('created_at', { ascending: false })

      if (usersError) {
        console.error('[ADMIN USERS] Errore caricamento utenti:', usersError)
      }
      console.log('[ADMIN USERS] Utenti caricati:', usersData?.length ?? 0)

      // Carica lista centri per assegnazione
      console.log('[ADMIN USERS] Query beauty_centers...')
      const { data: centriData, error: centriError } = await supabase
        .from('beauty_centers')
        .select('id, nome')
        .order('nome')

      if (centriError) {
        console.error('[ADMIN USERS] Errore caricamento centri:', centriError)
      }
      console.log('[ADMIN USERS] Centri caricati:', centriData?.length ?? 0)

      // Carica organizzazioni
      console.log('[ADMIN USERS] Query organizations...')
      let orgsData = null
      try {
        const result = await supabase
          .from('organizations')
          .select('id, nome')
          .order('nome')
        orgsData = result.data
        if (result.error) {
          console.error('[ADMIN USERS] Errore caricamento organizzazioni:', result.error)
        }
      } catch (orgErr) {
        console.error('[ADMIN USERS] Eccezione organizations:', orgErr)
      }
      console.log('[ADMIN USERS] Organizzazioni caricate:', orgsData?.length ?? 0)

      // Associa manualmente il nome del centro e organizzazione agli utenti
      const centriMap = {}
      ;(centriData || []).forEach(c => { centriMap[c.id] = c })

      const orgsMap = {}
      ;(orgsData || []).forEach(o => { orgsMap[o.id] = o })

      const usersWithCentro = (usersData || []).map(u => ({
        ...u,
        centro: u.centro_id ? centriMap[u.centro_id] : null,
        organization: u.organization_id ? orgsMap[u.organization_id] : null
      }))

      // Carica stato accettazioni legali
      let legalStatusMap = {}
      try {
        const legalRes = await fetch('/api/admin/legal-documents/acceptances')
        if (legalRes.ok) {
          const legalJson = await legalRes.json()
          const legalUsers = legalJson.data?.users || []
          legalUsers.forEach(lu => {
            legalStatusMap[lu.id] = {
              status: lu.legal_status,
              pending: lu.pending_documents,
              lastDate: lu.last_acceptance_date
            }
          })
        }
      } catch (e) {
        // API potrebbe non esistere ancora (migrazione non eseguita)
      }

      const usersWithLegal = usersWithCentro.map(u => ({
        ...u,
        legal: legalStatusMap[u.id] || null
      }))

      // Carica piani attivi dall'API
      try {
        const plansRes = await fetch('/api/admin/plans')
        if (plansRes.ok) {
          const plansJson = await plansRes.json()
          setAvailablePlans(plansJson.plans || [])
        }
      } catch (e) {}

      // Carica abbonamenti reali da user_subscriptions (fonte di verità)
      // e sovrascrivi user_profiles.piano con il piano effettivo
      let subsMap = {}
      try {
        const subsRes = await fetch('/api/admin/subscriptions')
        if (subsRes.ok) {
          const subsJson = await subsRes.json()
          // La route restituisce già le sub ordinate per created_at DESC
          // Prendiamo solo la prima per ogni user_id (la più recente/prioritaria)
          ;(subsJson.subscriptions || []).forEach(s => {
            if (!subsMap[s.user_id]) {
              subsMap[s.user_id] = s.plan?.codice || null
            }
          })
        }
      } catch (e) {}

      const usersWithRealPlan = usersWithLegal.map(u => ({
        ...u,
        piano: subsMap[u.id] || u.piano  // usa la subscription reale, fallback su profilo
      }))

      setUsers(usersWithRealPlan)
      setCentri(centriData || [])
      setOrganizations(orgsData || [])
      console.log('[ADMIN USERS] Caricamento completato')
    } catch (error) {
      console.error('[ADMIN USERS] Errore caricamento dati:', error)
      setUsers([])
      setCentri([])
      setOrganizations([])
    } finally {
      setLoading(false)
    }
  }

  // Ottieni il ruolo effettivo (nuovo sistema o legacy)
  const getUserRole = (user) => user.ruolo_livello || user.ruolo || 'titolare'

  const filteredUsers = useMemo(() => {
    let result = users
    // Filtro ruolo
    if (filter !== 'all') {
      if (filter === 'bloccati') {
        result = result.filter(u => u.profilo_bloccato === true)
      } else {
        result = result.filter(u => {
          const userRole = getUserRole(u)
          if (filter === 'titolare' && userRole === 'centro') return true
          return userRole === filter
        })
      }
    }
    // Filtro testo
    if (search.trim()) {
      const q = search.toLowerCase()
      result = result.filter(u =>
        (u.email || '').toLowerCase().includes(q) ||
        (u.nome || '').toLowerCase().includes(q) ||
        (u.cognome || '').toLowerCase().includes(q) ||
        (`${u.nome || ''} ${u.cognome || ''}`).toLowerCase().includes(q) ||
        (u.centro?.nome || '').toLowerCase().includes(q) ||
        (u.codice_fiscale || '').toLowerCase().includes(q) ||
        (u.partita_iva || '').toLowerCase().includes(q) ||
        (u.cellulare || '').toLowerCase().includes(q)
      )
    }
    return result
  }, [users, filter, search])

  // Conta utenti bloccati
  const blockedCount = users.filter(u => u.profilo_bloccato === true).length

  // Funzione per sbloccare un profilo
  const handleUnlockProfile = async (userId) => {
    if (!currentUser?.id) return
    setUnlocking(userId)

    try {
      const { data, error } = await supabase.rpc('sblocca_profilo', {
        p_user_id: userId,
        p_admin_id: currentUser.id
      })

      if (error) throw error

      // Aggiorna lista locale
      setUsers(prev => prev.map(u =>
        u.id === userId
          ? { ...u, profilo_bloccato: false, profilo_bloccato_motivo: null, profilo_bloccato_data: null }
          : u
      ))
    } catch (error) {
      console.error('Errore sblocco profilo:', error)
      alert('Errore durante lo sblocco del profilo: ' + error.message)
    } finally {
      setUnlocking(null)
    }
  }

  const handleSaveUser = async () => {
    if (!editingUser) return
    setSaving(true)

    try {
      // Mapping nuovo ruolo -> ruolo legacy per compatibilità
      const ruoloLegacy = editingUser.ruolo_livello === 'titolare' ||
                          editingUser.ruolo_livello === 'direttore' ||
                          editingUser.ruolo_livello === 'amministrativo'
                          ? 'centro' : editingUser.ruolo_livello

      const { error } = await supabase
        .from('user_profiles')
        .update({
          ruolo: ruoloLegacy,
          ruolo_livello: editingUser.ruolo_livello,
          centro_id: editingUser.centro_id || null,
          organization_id: editingUser.organization_id || null,
          parent_user_id: editingUser.parent_user_id || null,
          piano: editingUser.piano,
          attivo: editingUser.attivo,
          nome: editingUser.nome,
          cognome: editingUser.cognome
        })
        .eq('id', editingUser.id)

      if (error) throw error

      // Aggiorna lista locale
      setUsers(prev => prev.map(u =>
        u.id === editingUser.id ? { ...u, ...editingUser, ruolo: ruoloLegacy } : u
      ))
      setEditingUser(null)
    } catch (error) {
      console.error('Errore salvataggio:', error)
      alert('Errore durante il salvataggio')
    } finally {
      setSaving(false)
    }
  }

  const toggleUserActive = async (userId, currentStatus) => {
    try {
      const { error } = await supabase
        .from('user_profiles')
        .update({ attivo: !currentStatus })
        .eq('id', userId)

      if (error) throw error

      setUsers(prev => prev.map(u =>
        u.id === userId ? { ...u, attivo: !currentStatus } : u
      ))
    } catch (error) {
      console.error('Errore toggle attivo:', error)
    }
  }

  const handleDeleteUser = async () => {
    if (!deletingUser) return
    setDeleting(true)
    try {
      const response = await fetch(`/api/admin/users/${deletingUser.id}`, {
        method: 'DELETE'
      })
      const data = await response.json()
      if (!response.ok) throw new Error(data.error)

      setUsers(prev => prev.filter(u => u.id !== deletingUser.id))
      setDeletingUser(null)
    } catch (error) {
      console.error('Errore eliminazione:', error)
      alert('Errore durante l\'eliminazione: ' + error.message)
    } finally {
      setDeleting(false)
    }
  }

  const validateNewUser = () => {
    if (!newUser.email || !newUser.password) return 'Email e password sono obbligatori'
    if (newUser.password.length < 8) return 'La password deve essere di almeno 8 caratteri'
    if (newUser.tipo_soggetto === 'persona_fisica') {
      if (!newUser.nome || !newUser.cognome) return 'Nome e cognome sono obbligatori per persona fisica'
      if (!newUser.codice_fiscale && !newUser.partita_iva) return 'Inserisci almeno il codice fiscale o la P.IVA'
    } else {
      if (!newUser.ragione_sociale) return 'La ragione sociale e obbligatoria per le societa'
      if (!newUser.tipo_societa) return 'Seleziona il tipo di societa'
      if (!newUser.partita_iva && !newUser.codice_fiscale) return 'Inserisci almeno la P.IVA o il codice fiscale'
    }
    if (!newUser.cellulare) return 'Il cellulare e obbligatorio'
    if (!newUser.residenza_indirizzo || !newUser.residenza_civico || !newUser.residenza_cap || !newUser.residenza_citta || !newUser.residenza_provincia) {
      return 'Compila tutti i campi dell\'indirizzo di residenza/sede'
    }
    return null
  }

  const handleCreateUser = async () => {
    setCreateError(null)

    const validationError = validateNewUser()
    if (validationError) {
      setCreateError(validationError)
      return
    }

    setSaving(true)

    try {
      const response = await fetch('/api/admin/users', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          ...newUser,
          centro_id: newUser.centro_id || null,
          organization_id: newUser.organization_id || null,
          parent_user_id: newUser.parent_user_id || null
        })
      })

      const data = await response.json()

      if (!response.ok) {
        throw new Error(data.error || 'Errore creazione utente')
      }

      // Ricarica lista utenti
      await loadData()
      setShowCreateModal(false)
      setNewUser({
        email: '',
        password: '',
        nome: '',
        cognome: '',
        ruolo_livello: 'titolare',
        piano: 'demo',
        centro_id: '',
        organization_id: '',
        parent_user_id: '',
        tipo_soggetto: 'persona_fisica',
        ragione_sociale: '',
        tipo_societa: '',
        codice_fiscale: '',
        partita_iva: '',
        cellulare: '',
        telefono_fisso: '',
        pec: '',
        residenza_indirizzo: '',
        residenza_civico: '',
        residenza_cap: '',
        residenza_citta: '',
        residenza_provincia: '',
        domicilio_diverso: false,
        domicilio_indirizzo: '',
        domicilio_civico: '',
        domicilio_cap: '',
        domicilio_citta: '',
        domicilio_provincia: ''
      })
    } catch (error) {
      console.error('Errore:', error)
      setCreateError(error.message)
    } finally {
      setSaving(false)
    }
  }

  const getRoleBadgeColor = (ruoloLivello, ruoloLegacy) => {
    const ruolo = ruoloLivello || ruoloLegacy
    switch (ruolo) {
      case 'admin': return 'bg-emerald-500/20 text-emerald-400 border-emerald-500/40'
      case 'hpa': return 'bg-purple-500/20 text-purple-400 border-purple-500/40'
      case 'titolare':
      case 'centro': return 'bg-cyan-500/20 text-cyan-400 border-cyan-500/40'
      case 'direttore': return 'bg-blue-500/20 text-blue-400 border-blue-500/40'
      case 'amministrativo': return 'bg-amber-500/20 text-amber-400 border-amber-500/40'
      default: return 'bg-slate-500/20 text-slate-400 border-slate-500/40'
    }
  }

  const getRoleLabel = (ruoloLivello, ruoloLegacy) => {
    const ruolo = ruoloLivello || ruoloLegacy
    const found = RUOLI_GERARCHICI.find(r => r.value === ruolo)
    if (found) return found.label
    // Mapping legacy
    if (ruolo === 'centro') return 'Titolare'
    return ruolo
  }

  const getPlanBadgeColor = (piano) => {
    switch (piano) {
      case 'enterprise':    return 'bg-amber-500/20 text-amber-400'
      case 'professional':  return 'bg-purple-500/20 text-purple-400'
      case 'starter':       return 'bg-blue-500/20 text-blue-400'
      case 'demo':          return 'bg-slate-500/20 text-slate-400'
      // vecchi piani (retrocompatibilità display)
      case 'pro':      return 'bg-amber-500/20 text-amber-400'
      case 'base':     return 'bg-blue-500/20 text-blue-400'
      case 'advanced': return 'bg-emerald-500/20 text-emerald-400'
      default: return 'bg-slate-500/20 text-slate-400'
    }
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900 p-6 flex items-center justify-center">
        <div className="text-center">
          <div className="w-12 h-12 border-4 border-teal-500 border-t-transparent rounded-full animate-spin mx-auto"></div>
          <p className="mt-4 text-slate-400">Caricamento utenti...</p>
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
                <h1 className="text-2xl font-bold text-white">Gestione Utenti</h1>
                <p className="text-sm text-slate-400">{users.length} utenti registrati</p>
              </div>
            </div>
            <button
              onClick={() => setShowCreateModal(true)}
              className="flex items-center gap-2 px-4 py-2 bg-teal-500 text-white rounded-lg hover:bg-teal-600 transition-colors"
            >
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6v6m0 0v6m0-6h6m-6 0H6" />
              </svg>
              Nuovo Utente
            </button>
          </div>
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
            placeholder="Cerca per nome, email, centro, CF, P.IVA, cellulare..."
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
          <p className="text-xs text-slate-500 mt-2 ml-1">{filteredUsers.length} risultati per &quot;{search}&quot;</p>
        )}
      </div>

      {/* Filtri */}
      <div className="max-w-6xl mx-auto mb-6">
        <div className="flex gap-2 flex-wrap">
          <button
            onClick={() => setFilter('all')}
            className={`px-4 py-2 rounded-lg text-sm font-medium transition-all ${
              filter === 'all'
                ? 'bg-teal-500 text-white'
                : 'bg-slate-800/50 text-slate-400 hover:text-white hover:bg-slate-700/50'
            }`}
          >
            Tutti
            <span className="ml-2 text-xs opacity-70">({users.length})</span>
          </button>
          {RUOLI_GERARCHICI.map(r => {
            const count = users.filter(u => {
              const userRole = getUserRole(u)
              if (r.value === 'titolare' && userRole === 'centro') return true
              return userRole === r.value
            }).length
            return (
              <button
                key={r.value}
                onClick={() => setFilter(r.value)}
                className={`px-4 py-2 rounded-lg text-sm font-medium transition-all ${
                  filter === r.value
                    ? 'bg-teal-500 text-white'
                    : 'bg-slate-800/50 text-slate-400 hover:text-white hover:bg-slate-700/50'
                }`}
              >
                {r.label}
                <span className="ml-2 text-xs opacity-70">({count})</span>
              </button>
            )
          })}
          {/* Filtro profili bloccati */}
          {blockedCount > 0 && (
            <button
              onClick={() => setFilter('bloccati')}
              className={`px-4 py-2 rounded-lg text-sm font-medium transition-all ${
                filter === 'bloccati'
                  ? 'bg-red-500 text-white'
                  : 'bg-red-900/30 text-red-400 hover:bg-red-900/50 border border-red-500/30'
              }`}
            >
              Bloccati
              <span className="ml-2 text-xs opacity-70">({blockedCount})</span>
            </button>
          )}
        </div>
      </div>

      {/* Tabella utenti */}
      <div className="max-w-6xl mx-auto">
        <div className="bg-slate-800/30 backdrop-blur-sm rounded-xl border border-slate-700/50 overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="border-b border-slate-700/50">
                  <th className="text-left p-4 text-sm font-medium text-slate-400">Utente</th>
                  <th className="text-left p-4 text-sm font-medium text-slate-400">Ruolo</th>
                  <th className="text-left p-4 text-sm font-medium text-slate-400">Centro</th>
                  <th className="text-left p-4 text-sm font-medium text-slate-400">Piano</th>
                  <th className="text-left p-4 text-sm font-medium text-slate-400">Stato</th>
                  <th className="text-left p-4 text-sm font-medium text-slate-400">Azioni</th>
                </tr>
              </thead>
              <tbody>
                {filteredUsers.map(user => (
                  <tr key={user.id} className="border-b border-slate-700/30 hover:bg-slate-700/20">
                    <td className="p-4">
                      <div>
                        <p className="text-white font-medium">
                          {user.nome && user.cognome ? `${user.nome} ${user.cognome}` : user.email}
                        </p>
                        <p className="text-sm text-slate-400">{user.email}</p>
                      </div>
                    </td>
                    <td className="p-4">
                      <span className={`px-2 py-1 rounded text-xs font-medium border ${getRoleBadgeColor(user.ruolo_livello, user.ruolo)}`}>
                        {getRoleLabel(user.ruolo_livello, user.ruolo)}
                      </span>
                    </td>
                    <td className="p-4">
                      <div>
                        <span className="text-slate-300">
                          {user.centro?.nome || '-'}
                        </span>
                        {user.organization && (
                          <p className="text-xs text-amber-400 mt-0.5">
                            {user.organization.nome}
                          </p>
                        )}
                      </div>
                    </td>
                    <td className="p-4">
                      <div className="flex items-center gap-2">
                        <span className={`px-2 py-1 rounded text-xs ${getPlanBadgeColor(user.piano)}`}>
                          {user.piano}
                        </span>
                        {user.legal && (
                          <span title={user.legal.lastDate ? `Ultima accettazione: ${new Date(user.legal.lastDate).toLocaleDateString('it-IT')}` : 'Nessuna accettazione'}>
                            {user.legal.status === 'compliant' ? (
                              <span className="w-5 h-5 inline-flex items-center justify-center rounded-full bg-green-500/20 text-green-400 text-xs" title="Policy accettate">
                                <svg className="w-3 h-3" fill="currentColor" viewBox="0 0 20 20"><path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" /></svg>
                              </span>
                            ) : (
                              <span className="w-5 h-5 inline-flex items-center justify-center rounded-full bg-amber-500/20 text-amber-400 text-xs" title={`${user.legal.pending} documenti da accettare`}>
                                !
                              </span>
                            )}
                          </span>
                        )}
                      </div>
                    </td>
                    <td className="p-4">
                      <div className="flex flex-col gap-1">
                        <button
                          onClick={() => toggleUserActive(user.id, user.attivo)}
                          className={`px-2 py-1 rounded text-xs font-medium ${
                            user.attivo
                              ? 'bg-emerald-500/20 text-emerald-400'
                              : 'bg-red-500/20 text-red-400'
                          }`}
                        >
                          {user.attivo ? 'Attivo' : 'Disabilitato'}
                        </button>
                        {user.profilo_bloccato && (
                          <span className="px-2 py-1 rounded text-xs font-medium bg-red-600/30 text-red-300 border border-red-500/40 flex items-center gap-1">
                            <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
                            </svg>
                            Bloccato
                          </span>
                        )}
                      </div>
                    </td>
                    <td className="p-4">
                      <div className="flex items-center gap-2">
                        <Link
                          href={`/admin/users/${user.id}`}
                          className="p-2 text-blue-400 hover:bg-blue-500/20 rounded-lg transition-colors"
                          title="Vedi dettagli"
                        >
                          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
                          </svg>
                        </Link>
                        <button
                          onClick={() => setEditingUser({ ...user })}
                          className="p-2 text-teal-400 hover:bg-teal-500/20 rounded-lg transition-colors"
                          title="Modifica rapida"
                        >
                          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                          </svg>
                        </button>
                        {/* Pulsante sblocca profilo */}
                        {user.profilo_bloccato && (
                          <button
                            onClick={() => handleUnlockProfile(user.id)}
                            disabled={unlocking === user.id}
                            className="p-2 text-amber-400 hover:bg-amber-500/20 rounded-lg transition-colors disabled:opacity-50"
                            title={`Sblocca profilo (${user.profilo_bloccato_motivo === 'documento_scaduto' ? 'Documento scaduto' : user.profilo_bloccato_motivo || 'Bloccato'})`}
                          >
                            {unlocking === user.id ? (
                              <svg className="w-5 h-5 animate-spin" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
                              </svg>
                            ) : (
                              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 11V7a4 4 0 118 0m-4 8v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2z" />
                              </svg>
                            )}
                          </button>
                        )}
                        {/* Pulsante elimina utente (solo non-admin) */}
                        {getUserRole(user) !== 'admin' && (
                          <button
                            onClick={() => setDeletingUser(user)}
                            className="p-2 text-red-400 hover:bg-red-500/20 rounded-lg transition-colors"
                            title="Elimina utente"
                          >
                            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                            </svg>
                          </button>
                        )}
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </div>

      {/* Modal modifica utente */}
      {editingUser && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className="bg-slate-800 rounded-xl border border-slate-700 w-full max-w-md">
            <div className="p-6 border-b border-slate-700">
              <h3 className="text-lg font-bold text-white">Modifica Utente</h3>
              <p className="text-sm text-slate-400">{editingUser.email}</p>
            </div>

            <div className="p-6 space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-slate-300 mb-1">Nome</label>
                  <input
                    type="text"
                    value={editingUser.nome || ''}
                    onChange={(e) => setEditingUser(prev => ({ ...prev, nome: e.target.value }))}
                    className="w-full px-3 py-2 bg-slate-900 border border-slate-600 rounded-lg text-white focus:ring-2 focus:ring-teal-500 focus:border-transparent"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-slate-300 mb-1">Cognome</label>
                  <input
                    type="text"
                    value={editingUser.cognome || ''}
                    onChange={(e) => setEditingUser(prev => ({ ...prev, cognome: e.target.value }))}
                    className="w-full px-3 py-2 bg-slate-900 border border-slate-600 rounded-lg text-white focus:ring-2 focus:ring-teal-500 focus:border-transparent"
                  />
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-slate-300 mb-1">Ruolo</label>
                <select
                  value={editingUser.ruolo_livello || editingUser.ruolo || 'titolare'}
                  onChange={(e) => setEditingUser(prev => ({ ...prev, ruolo_livello: e.target.value }))}
                  className="w-full px-3 py-2 bg-slate-900 border border-slate-600 rounded-lg text-white focus:ring-2 focus:ring-teal-500 focus:border-transparent"
                >
                  {RUOLI_GERARCHICI.map(r => (
                    <option key={r.value} value={r.value}>{r.label} - {r.description}</option>
                  ))}
                </select>
              </div>

              {/* Centro - mostrato per titolare, direttore, amministrativo */}
              {['titolare', 'direttore', 'amministrativo', 'centro'].includes(editingUser.ruolo_livello || editingUser.ruolo) && (
                <div>
                  <label className="block text-sm font-medium text-slate-300 mb-1">Centro Associato</label>
                  <select
                    value={editingUser.centro_id || ''}
                    onChange={(e) => setEditingUser(prev => ({ ...prev, centro_id: e.target.value || null }))}
                    className="w-full px-3 py-2 bg-slate-900 border border-slate-600 rounded-lg text-white focus:ring-2 focus:ring-teal-500 focus:border-transparent"
                  >
                    <option value="">Nessun centro</option>
                    {centri.map(c => (
                      <option key={c.id} value={c.id}>{c.nome}</option>
                    ))}
                  </select>
                </div>
              )}

              {/* Organizzazione */}
              <div>
                <label className="block text-sm font-medium text-slate-300 mb-1">Organizzazione</label>
                <select
                  value={editingUser.organization_id || ''}
                  onChange={(e) => setEditingUser(prev => ({ ...prev, organization_id: e.target.value || null }))}
                  className="w-full px-3 py-2 bg-slate-900 border border-slate-600 rounded-lg text-white focus:ring-2 focus:ring-teal-500 focus:border-transparent"
                >
                  <option value="">Nessuna organizzazione</option>
                  {organizations.map(o => (
                    <option key={o.id} value={o.id}>{o.nome}</option>
                  ))}
                </select>
              </div>

              {/* Parent User - per direttore e amministrativo */}
              {['direttore', 'amministrativo'].includes(editingUser.ruolo_livello) && (
                <div>
                  <label className="block text-sm font-medium text-slate-300 mb-1">Sotto il Titolare</label>
                  <select
                    value={editingUser.parent_user_id || ''}
                    onChange={(e) => setEditingUser(prev => ({ ...prev, parent_user_id: e.target.value || null }))}
                    className="w-full px-3 py-2 bg-slate-900 border border-slate-600 rounded-lg text-white focus:ring-2 focus:ring-teal-500 focus:border-transparent"
                  >
                    <option value="">Nessun titolare</option>
                    {users.filter(u => getUserRole(u) === 'titolare' || getUserRole(u) === 'centro').map(u => (
                      <option key={u.id} value={u.id}>{u.nome} {u.cognome} ({u.email})</option>
                    ))}
                  </select>
                </div>
              )}

              <div>
                <label className="block text-sm font-medium text-slate-300 mb-1">Piano</label>
                <select
                  value={editingUser.piano}
                  onChange={(e) => setEditingUser(prev => ({ ...prev, piano: e.target.value }))}
                  className="w-full px-3 py-2 bg-slate-900 border border-slate-600 rounded-lg text-white focus:ring-2 focus:ring-teal-500 focus:border-transparent"
                >
                  {availablePlans.length > 0
                    ? availablePlans.map(p => (
                        <option key={p.codice} value={p.codice}>{p.nome}</option>
                      ))
                    : <option value={editingUser.piano}>{editingUser.piano}</option>
                  }
                </select>
              </div>

              <div className="flex items-center gap-2">
                <input
                  type="checkbox"
                  id="attivo"
                  checked={editingUser.attivo}
                  onChange={(e) => setEditingUser(prev => ({ ...prev, attivo: e.target.checked }))}
                  className="rounded border-slate-600 bg-slate-900 text-teal-500 focus:ring-teal-500"
                />
                <label htmlFor="attivo" className="text-sm text-slate-300">Account attivo</label>
              </div>
            </div>

            <div className="p-6 border-t border-slate-700 flex gap-3 justify-end">
              <button
                onClick={() => setEditingUser(null)}
                className="px-4 py-2 text-sm font-medium text-slate-400 hover:text-white transition-colors"
              >
                Annulla
              </button>
              <button
                onClick={handleSaveUser}
                disabled={saving}
                className="px-4 py-2 text-sm font-medium bg-teal-500 text-white rounded-lg hover:bg-teal-600 transition-colors disabled:opacity-50"
              >
                {saving ? 'Salvataggio...' : 'Salva'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Modal creazione utente */}
      {showCreateModal && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className="bg-slate-800 rounded-xl border border-slate-700 w-full max-w-2xl max-h-[90vh] overflow-y-auto">
            <div className="p-6 border-b border-slate-700">
              <h3 className="text-lg font-bold text-white">Crea Nuovo Utente</h3>
              <p className="text-sm text-slate-400">Inserisci i dati anagrafici completi</p>
            </div>

            <div className="p-6 space-y-4">
              {createError && (
                <div className="bg-red-500/20 border border-red-500/40 text-red-400 px-4 py-2 rounded-lg text-sm">
                  {createError}
                </div>
              )}

              {/* --- Credenziali --- */}
              <div className="text-xs font-semibold text-teal-400 uppercase tracking-wider">Credenziali</div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-slate-300 mb-1">Email *</label>
                  <input
                    type="email"
                    value={newUser.email}
                    onChange={(e) => setNewUser(prev => ({ ...prev, email: e.target.value }))}
                    className="w-full px-3 py-2 bg-slate-900 border border-slate-600 rounded-lg text-white focus:ring-2 focus:ring-teal-500 focus:border-transparent"
                    placeholder="email@esempio.it"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-slate-300 mb-1">Password *</label>
                  <input
                    type="password"
                    value={newUser.password}
                    onChange={(e) => setNewUser(prev => ({ ...prev, password: e.target.value }))}
                    className="w-full px-3 py-2 bg-slate-900 border border-slate-600 rounded-lg text-white focus:ring-2 focus:ring-teal-500 focus:border-transparent"
                    placeholder="Minimo 8 caratteri"
                  />
                </div>
              </div>

              {/* --- Tipo soggetto --- */}
              <div className="text-xs font-semibold text-teal-400 uppercase tracking-wider pt-2">Tipo Soggetto</div>
              <div className="grid grid-cols-2 gap-3">
                <button
                  type="button"
                  onClick={() => setNewUser(prev => ({ ...prev, tipo_soggetto: 'persona_fisica' }))}
                  className={`py-2 px-4 rounded-lg border text-sm font-medium transition-all ${
                    newUser.tipo_soggetto === 'persona_fisica'
                      ? 'border-teal-500 bg-teal-500/20 text-teal-300'
                      : 'border-slate-600 text-slate-400 hover:border-teal-500/50'
                  }`}
                >
                  Persona Fisica
                </button>
                <button
                  type="button"
                  onClick={() => setNewUser(prev => ({ ...prev, tipo_soggetto: 'societa' }))}
                  className={`py-2 px-4 rounded-lg border text-sm font-medium transition-all ${
                    newUser.tipo_soggetto === 'societa'
                      ? 'border-teal-500 bg-teal-500/20 text-teal-300'
                      : 'border-slate-600 text-slate-400 hover:border-teal-500/50'
                  }`}
                >
                  Societa
                </button>
              </div>

              {/* Campi persona fisica */}
              {newUser.tipo_soggetto === 'persona_fisica' && (
                <>
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className="block text-sm font-medium text-slate-300 mb-1">Nome *</label>
                      <input type="text" value={newUser.nome} onChange={(e) => setNewUser(prev => ({ ...prev, nome: e.target.value }))} className="w-full px-3 py-2 bg-slate-900 border border-slate-600 rounded-lg text-white focus:ring-2 focus:ring-teal-500 focus:border-transparent" />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-slate-300 mb-1">Cognome *</label>
                      <input type="text" value={newUser.cognome} onChange={(e) => setNewUser(prev => ({ ...prev, cognome: e.target.value }))} className="w-full px-3 py-2 bg-slate-900 border border-slate-600 rounded-lg text-white focus:ring-2 focus:ring-teal-500 focus:border-transparent" />
                    </div>
                  </div>
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className="block text-sm font-medium text-slate-300 mb-1">Codice Fiscale</label>
                      <input type="text" maxLength={16} value={newUser.codice_fiscale} onChange={(e) => setNewUser(prev => ({ ...prev, codice_fiscale: e.target.value }))} className="w-full px-3 py-2 bg-slate-900 border border-slate-600 rounded-lg text-white focus:ring-2 focus:ring-teal-500 focus:border-transparent" placeholder="RSSMRA80A01H501Z" />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-slate-300 mb-1">P.IVA</label>
                      <input type="text" maxLength={11} value={newUser.partita_iva} onChange={(e) => setNewUser(prev => ({ ...prev, partita_iva: e.target.value }))} className="w-full px-3 py-2 bg-slate-900 border border-slate-600 rounded-lg text-white focus:ring-2 focus:ring-teal-500 focus:border-transparent" placeholder="12345678901" />
                    </div>
                  </div>
                  <p className="text-xs text-slate-500">Almeno uno tra Codice Fiscale e P.IVA e obbligatorio</p>
                </>
              )}

              {/* Campi societa */}
              {newUser.tipo_soggetto === 'societa' && (
                <>
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className="block text-sm font-medium text-slate-300 mb-1">Ragione Sociale *</label>
                      <input type="text" value={newUser.ragione_sociale} onChange={(e) => setNewUser(prev => ({ ...prev, ragione_sociale: e.target.value }))} className="w-full px-3 py-2 bg-slate-900 border border-slate-600 rounded-lg text-white focus:ring-2 focus:ring-teal-500 focus:border-transparent" />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-slate-300 mb-1">Tipo Societa *</label>
                      <select value={newUser.tipo_societa} onChange={(e) => setNewUser(prev => ({ ...prev, tipo_societa: e.target.value }))} className="w-full px-3 py-2 bg-slate-900 border border-slate-600 rounded-lg text-white focus:ring-2 focus:ring-teal-500 focus:border-transparent">
                        <option value="">Seleziona...</option>
                        {TIPI_SOCIETA.map(t => <option key={t} value={t}>{t}</option>)}
                      </select>
                    </div>
                  </div>
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className="block text-sm font-medium text-slate-300 mb-1">P.IVA</label>
                      <input type="text" maxLength={11} value={newUser.partita_iva} onChange={(e) => setNewUser(prev => ({ ...prev, partita_iva: e.target.value }))} className="w-full px-3 py-2 bg-slate-900 border border-slate-600 rounded-lg text-white focus:ring-2 focus:ring-teal-500 focus:border-transparent" placeholder="12345678901" />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-slate-300 mb-1">Codice Fiscale</label>
                      <input type="text" maxLength={16} value={newUser.codice_fiscale} onChange={(e) => setNewUser(prev => ({ ...prev, codice_fiscale: e.target.value }))} className="w-full px-3 py-2 bg-slate-900 border border-slate-600 rounded-lg text-white focus:ring-2 focus:ring-teal-500 focus:border-transparent" />
                    </div>
                  </div>
                  <p className="text-xs text-slate-500">Almeno uno tra P.IVA e Codice Fiscale e obbligatorio</p>
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className="block text-sm font-medium text-slate-300 mb-1">Nome referente</label>
                      <input type="text" value={newUser.nome} onChange={(e) => setNewUser(prev => ({ ...prev, nome: e.target.value }))} className="w-full px-3 py-2 bg-slate-900 border border-slate-600 rounded-lg text-white focus:ring-2 focus:ring-teal-500 focus:border-transparent" />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-slate-300 mb-1">Cognome referente</label>
                      <input type="text" value={newUser.cognome} onChange={(e) => setNewUser(prev => ({ ...prev, cognome: e.target.value }))} className="w-full px-3 py-2 bg-slate-900 border border-slate-600 rounded-lg text-white focus:ring-2 focus:ring-teal-500 focus:border-transparent" />
                    </div>
                  </div>
                </>
              )}

              {/* --- Recapiti --- */}
              <div className="text-xs font-semibold text-teal-400 uppercase tracking-wider pt-2">Recapiti</div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-slate-300 mb-1">Cellulare *</label>
                  <input type="tel" value={newUser.cellulare} onChange={(e) => setNewUser(prev => ({ ...prev, cellulare: e.target.value }))} className="w-full px-3 py-2 bg-slate-900 border border-slate-600 rounded-lg text-white focus:ring-2 focus:ring-teal-500 focus:border-transparent" placeholder="+39 333 1234567" />
                </div>
                <div>
                  <label className="block text-sm font-medium text-slate-300 mb-1">Telefono fisso</label>
                  <input type="tel" value={newUser.telefono_fisso} onChange={(e) => setNewUser(prev => ({ ...prev, telefono_fisso: e.target.value }))} className="w-full px-3 py-2 bg-slate-900 border border-slate-600 rounded-lg text-white focus:ring-2 focus:ring-teal-500 focus:border-transparent" />
                </div>
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-300 mb-1">PEC</label>
                <input type="email" value={newUser.pec} onChange={(e) => setNewUser(prev => ({ ...prev, pec: e.target.value }))} className="w-full px-3 py-2 bg-slate-900 border border-slate-600 rounded-lg text-white focus:ring-2 focus:ring-teal-500 focus:border-transparent" placeholder="nome@pec.it" />
              </div>

              {/* --- Residenza/Sede --- */}
              <div className="text-xs font-semibold text-teal-400 uppercase tracking-wider pt-2">
                {newUser.tipo_soggetto === 'persona_fisica' ? 'Residenza' : 'Sede Legale'} *
              </div>
              <div className="grid grid-cols-4 gap-3">
                <div className="col-span-3">
                  <label className="block text-sm font-medium text-slate-300 mb-1">Indirizzo *</label>
                  <input type="text" value={newUser.residenza_indirizzo} onChange={(e) => setNewUser(prev => ({ ...prev, residenza_indirizzo: e.target.value }))} className="w-full px-3 py-2 bg-slate-900 border border-slate-600 rounded-lg text-white focus:ring-2 focus:ring-teal-500 focus:border-transparent" placeholder="Via Roma" />
                </div>
                <div>
                  <label className="block text-sm font-medium text-slate-300 mb-1">Civico *</label>
                  <input type="text" value={newUser.residenza_civico} onChange={(e) => setNewUser(prev => ({ ...prev, residenza_civico: e.target.value }))} className="w-full px-3 py-2 bg-slate-900 border border-slate-600 rounded-lg text-white focus:ring-2 focus:ring-teal-500 focus:border-transparent" placeholder="42" />
                </div>
              </div>
              <div className="grid grid-cols-4 gap-3">
                <div>
                  <label className="block text-sm font-medium text-slate-300 mb-1">CAP *</label>
                  <input type="text" maxLength={5} value={newUser.residenza_cap} onChange={(e) => setNewUser(prev => ({ ...prev, residenza_cap: e.target.value }))} className="w-full px-3 py-2 bg-slate-900 border border-slate-600 rounded-lg text-white focus:ring-2 focus:ring-teal-500 focus:border-transparent" placeholder="20100" />
                </div>
                <div className="col-span-2">
                  <label className="block text-sm font-medium text-slate-300 mb-1">Citta *</label>
                  <input type="text" value={newUser.residenza_citta} onChange={(e) => setNewUser(prev => ({ ...prev, residenza_citta: e.target.value }))} className="w-full px-3 py-2 bg-slate-900 border border-slate-600 rounded-lg text-white focus:ring-2 focus:ring-teal-500 focus:border-transparent" placeholder="Milano" />
                </div>
                <div>
                  <label className="block text-sm font-medium text-slate-300 mb-1">Prov *</label>
                  <input type="text" maxLength={2} value={newUser.residenza_provincia} onChange={(e) => setNewUser(prev => ({ ...prev, residenza_provincia: e.target.value }))} className="w-full px-3 py-2 bg-slate-900 border border-slate-600 rounded-lg text-white focus:ring-2 focus:ring-teal-500 focus:border-transparent" placeholder="MI" />
                </div>
              </div>

              {/* Domicilio diverso */}
              <div className="flex items-center gap-2 pt-1">
                <input type="checkbox" id="admin_dom_diverso" checked={newUser.domicilio_diverso} onChange={(e) => setNewUser(prev => ({ ...prev, domicilio_diverso: e.target.checked }))} className="rounded border-slate-600 bg-slate-900 text-teal-500 focus:ring-teal-500" />
                <label htmlFor="admin_dom_diverso" className="text-sm text-slate-300">Domicilio diverso</label>
              </div>

              {newUser.domicilio_diverso && (
                <>
                  <div className="text-xs font-semibold text-teal-400 uppercase tracking-wider">Domicilio</div>
                  <div className="grid grid-cols-4 gap-3">
                    <div className="col-span-3">
                      <label className="block text-sm font-medium text-slate-300 mb-1">Indirizzo</label>
                      <input type="text" value={newUser.domicilio_indirizzo} onChange={(e) => setNewUser(prev => ({ ...prev, domicilio_indirizzo: e.target.value }))} className="w-full px-3 py-2 bg-slate-900 border border-slate-600 rounded-lg text-white focus:ring-2 focus:ring-teal-500 focus:border-transparent" />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-slate-300 mb-1">Civico</label>
                      <input type="text" value={newUser.domicilio_civico} onChange={(e) => setNewUser(prev => ({ ...prev, domicilio_civico: e.target.value }))} className="w-full px-3 py-2 bg-slate-900 border border-slate-600 rounded-lg text-white focus:ring-2 focus:ring-teal-500 focus:border-transparent" />
                    </div>
                  </div>
                  <div className="grid grid-cols-4 gap-3">
                    <div>
                      <label className="block text-sm font-medium text-slate-300 mb-1">CAP</label>
                      <input type="text" maxLength={5} value={newUser.domicilio_cap} onChange={(e) => setNewUser(prev => ({ ...prev, domicilio_cap: e.target.value }))} className="w-full px-3 py-2 bg-slate-900 border border-slate-600 rounded-lg text-white focus:ring-2 focus:ring-teal-500 focus:border-transparent" />
                    </div>
                    <div className="col-span-2">
                      <label className="block text-sm font-medium text-slate-300 mb-1">Citta</label>
                      <input type="text" value={newUser.domicilio_citta} onChange={(e) => setNewUser(prev => ({ ...prev, domicilio_citta: e.target.value }))} className="w-full px-3 py-2 bg-slate-900 border border-slate-600 rounded-lg text-white focus:ring-2 focus:ring-teal-500 focus:border-transparent" />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-slate-300 mb-1">Prov</label>
                      <input type="text" maxLength={2} value={newUser.domicilio_provincia} onChange={(e) => setNewUser(prev => ({ ...prev, domicilio_provincia: e.target.value }))} className="w-full px-3 py-2 bg-slate-900 border border-slate-600 rounded-lg text-white focus:ring-2 focus:ring-teal-500 focus:border-transparent" />
                    </div>
                  </div>
                </>
              )}

              {/* --- Ruolo e assegnazioni --- */}
              <div className="text-xs font-semibold text-teal-400 uppercase tracking-wider pt-2">Ruolo e Assegnazioni</div>
              <div>
                <label className="block text-sm font-medium text-slate-300 mb-1">Ruolo</label>
                <select
                  value={newUser.ruolo_livello}
                  onChange={(e) => setNewUser(prev => ({ ...prev, ruolo_livello: e.target.value }))}
                  className="w-full px-3 py-2 bg-slate-900 border border-slate-600 rounded-lg text-white focus:ring-2 focus:ring-teal-500 focus:border-transparent"
                >
                  {RUOLI_GERARCHICI.map(r => (
                    <option key={r.value} value={r.value}>{r.label} - {r.description}</option>
                  ))}
                </select>
              </div>

              {['titolare', 'direttore', 'amministrativo'].includes(newUser.ruolo_livello) && (
                <div>
                  <label className="block text-sm font-medium text-slate-300 mb-1">Centro Associato</label>
                  <select
                    value={newUser.centro_id}
                    onChange={(e) => setNewUser(prev => ({ ...prev, centro_id: e.target.value }))}
                    className="w-full px-3 py-2 bg-slate-900 border border-slate-600 rounded-lg text-white focus:ring-2 focus:ring-teal-500 focus:border-transparent"
                  >
                    <option value="">Nessun centro (assegna dopo)</option>
                    {centri.map(c => (
                      <option key={c.id} value={c.id}>{c.nome}</option>
                    ))}
                  </select>
                </div>
              )}

              <div>
                <label className="block text-sm font-medium text-slate-300 mb-1">Organizzazione</label>
                <select
                  value={newUser.organization_id}
                  onChange={(e) => setNewUser(prev => ({ ...prev, organization_id: e.target.value }))}
                  className="w-full px-3 py-2 bg-slate-900 border border-slate-600 rounded-lg text-white focus:ring-2 focus:ring-teal-500 focus:border-transparent"
                >
                  <option value="">Nessuna organizzazione</option>
                  {organizations.map(o => (
                    <option key={o.id} value={o.id}>{o.nome}</option>
                  ))}
                </select>
              </div>

              {['direttore', 'amministrativo'].includes(newUser.ruolo_livello) && (
                <div>
                  <label className="block text-sm font-medium text-slate-300 mb-1">Sotto il Titolare</label>
                  <select
                    value={newUser.parent_user_id}
                    onChange={(e) => setNewUser(prev => ({ ...prev, parent_user_id: e.target.value }))}
                    className="w-full px-3 py-2 bg-slate-900 border border-slate-600 rounded-lg text-white focus:ring-2 focus:ring-teal-500 focus:border-transparent"
                  >
                    <option value="">Nessun titolare</option>
                    {users.filter(u => getUserRole(u) === 'titolare' || getUserRole(u) === 'centro').map(u => (
                      <option key={u.id} value={u.id}>{u.nome} {u.cognome} ({u.email})</option>
                    ))}
                  </select>
                </div>
              )}

              <div>
                <label className="block text-sm font-medium text-slate-300 mb-1">Piano</label>
                <select
                  value={newUser.piano}
                  onChange={(e) => setNewUser(prev => ({ ...prev, piano: e.target.value }))}
                  className="w-full px-3 py-2 bg-slate-900 border border-slate-600 rounded-lg text-white focus:ring-2 focus:ring-teal-500 focus:border-transparent"
                >
                  {availablePlans.length > 0
                    ? availablePlans.map(p => (
                        <option key={p.codice} value={p.codice}>{p.nome}</option>
                      ))
                    : <>
                        <option value="demo">Demo</option>
                        <option value="starter">Starter</option>
                        <option value="professional">Professional</option>
                        <option value="enterprise">Enterprise</option>
                      </>
                  }
                </select>
              </div>
            </div>

            <div className="p-6 border-t border-slate-700 flex gap-3 justify-end">
              <button
                onClick={() => {
                  setShowCreateModal(false)
                  setCreateError(null)
                }}
                className="px-4 py-2 text-sm font-medium text-slate-400 hover:text-white transition-colors"
              >
                Annulla
              </button>
              <button
                onClick={handleCreateUser}
                disabled={saving || !newUser.email || !newUser.password}
                className="px-4 py-2 text-sm font-medium bg-teal-500 text-white rounded-lg hover:bg-teal-600 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {saving ? 'Creazione...' : 'Crea Utente'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Modal conferma eliminazione utente */}
      {deletingUser && (
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
                {deletingUser.nome} {deletingUser.cognome} ({deletingUser.email})
              </p>
              <p className="text-red-400 text-sm mt-4">
                Questa azione è irreversibile. Tutti i dati dell&apos;utente verranno eliminati permanentemente.
              </p>
            </div>
            <div className="p-6 border-t border-slate-700 flex gap-3 justify-end">
              <button
                onClick={() => setDeletingUser(null)}
                className="px-4 py-2 text-sm font-medium text-slate-400 hover:text-white transition-colors"
              >
                Annulla
              </button>
              <button
                onClick={handleDeleteUser}
                disabled={deleting}
                className="px-4 py-2 text-sm font-medium bg-red-500 text-white rounded-lg hover:bg-red-600 transition-colors disabled:opacity-50"
              >
                {deleting ? 'Eliminazione...' : 'Elimina Definitivamente'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
