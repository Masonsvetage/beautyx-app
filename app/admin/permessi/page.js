'use client'

import { useState, useEffect } from 'react'
import Link from 'next/link'
import { useAuth } from '@/contexts/AuthContext'
import { supabase } from '@/lib/supabase'

// Categorie funzioni
const CATEGORIES = {
  dashboard: { label: 'Dashboard', icon: '📊' },
  movimenti: { label: 'Movimenti', icon: '💰' },
  analytics: { label: 'Analytics', icon: '📈' },
  obiettivi: { label: 'Obiettivi', icon: '🎯' },
  pianificazione: { label: 'Pianificazione', icon: '📅' },
  contabilita: { label: 'Contabilità', icon: '📋' },
  banca: { label: 'Banca', icon: '🏦' },
  beautyx: { label: 'Beautyx AI', icon: '🤖' },
  utenti: { label: 'Utenti', icon: '👥' },
  centri: { label: 'Centri', icon: '🏢' },
  impostazioni: { label: 'Impostazioni', icon: '⚙️' }
}

export default function AdminPermessiPage() {
  const { isAdmin } = useAuth()
  const [users, setUsers] = useState([])
  const [selectedUser, setSelectedUser] = useState(null)
  const [appFunctions, setAppFunctions] = useState([])
  const [userPermissions, setUserPermissions] = useState({})
  const [userOverrides, setUserOverrides] = useState([])
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [searchTerm, setSearchTerm] = useState('')

  useEffect(() => {
    loadData()
  }, [])

  useEffect(() => {
    if (selectedUser) {
      loadUserPermissions(selectedUser.id)
    }
  }, [selectedUser])

  const loadData = async () => {
    try {
      // Carica utenti
      const { data: usersData } = await supabase
        .from('user_profiles')
        .select('id, email, nome, cognome, ruolo, ruolo_livello')
        .order('email')

      setUsers(usersData || [])

      // Carica funzioni app
      const { data: funcsData, error: funcsError } = await supabase
        .from('app_functions')
        .select('*')
        .order('categoria, codice')

      if (funcsError) {
        console.log('Tabella app_functions non esiste:', funcsError)
        // Usa funzioni di default se la tabella non esiste
        setAppFunctions(getDefaultFunctions())
      } else {
        setAppFunctions(funcsData || [])
      }
    } catch (error) {
      console.error('Errore caricamento:', error)
    } finally {
      setLoading(false)
    }
  }

  const loadUserPermissions = async (userId) => {
    try {
      // Prova a caricare permessi con RPC
      const { data: perms, error } = await supabase.rpc('get_user_permissions', {
        p_user_id: userId
      })

      if (error) {
        console.log('Fallback permessi:', error.message)
        // Calcola permessi di default basati sul ruolo
        const user = users.find(u => u.id === userId)
        const defaultPerms = getDefaultPermissionsForRole(user?.ruolo_livello || user?.ruolo)
        setUserPermissions(defaultPerms)
        setUserOverrides([])
        return
      }

      // Converti in mappa
      const permsMap = {}
      ;(perms || []).forEach(p => {
        permsMap[p.function_code] = {
          abilitato: p.abilitato,
          is_override: p.is_override
        }
      })
      setUserPermissions(permsMap)

      // Carica override specifici con join a app_functions per avere il codice
      const { data: overrides } = await supabase
        .from('user_permission_overrides')
        .select('*, app_functions!function_id(codice)')
        .eq('user_id', userId)

      setUserOverrides(overrides || [])
    } catch (error) {
      console.error('Errore caricamento permessi:', error)
    }
  }

  // Helper: trova function_id dal codice
  const getFunctionId = (functionCode) => {
    const func = appFunctions.find(f => f.codice === functionCode)
    return func?.id || null
  }

  // Helper: controlla se un override esiste per un dato codice funzione
  const findOverrideByCode = (functionCode) => {
    return userOverrides.find(o => o.app_functions?.codice === functionCode)
  }

  const handleTogglePermission = async (functionCode, currentValue) => {
    if (!selectedUser) return
    setSaving(true)

    try {
      // Usa RPC per impostare permesso
      const { error } = await supabase.rpc('set_user_permission', {
        p_target_user_id: selectedUser.id,
        p_function_code: functionCode,
        p_abilitato: !currentValue,
        p_motivo: 'Override manuale da admin'
      })

      if (error) {
        console.log('RPC fallback:', error.message)
        // Fallback: inserisci/aggiorna direttamente usando function_id
        const functionId = getFunctionId(functionCode)
        if (!functionId) {
          alert('Funzione non trovata nel database. Esegui la migrazione SQL.')
          setSaving(false)
          return
        }

        const existingOverride = findOverrideByCode(functionCode)

        if (existingOverride) {
          await supabase
            .from('user_permission_overrides')
            .update({ abilitato: !currentValue, updated_at: new Date().toISOString() })
            .eq('id', existingOverride.id)
        } else {
          await supabase
            .from('user_permission_overrides')
            .insert({
              user_id: selectedUser.id,
              function_id: functionId,
              abilitato: !currentValue,
              impostato_da: selectedUser.id,
              motivo: 'Override manuale da admin'
            })
        }
      }

      // Ricarica permessi
      await loadUserPermissions(selectedUser.id)
    } catch (error) {
      console.error('Errore toggle permesso:', error)
      alert('Errore: ' + error.message)
    } finally {
      setSaving(false)
    }
  }

  const handleRemoveOverride = async (functionCode) => {
    if (!selectedUser) return
    setSaving(true)

    try {
      const existingOverride = findOverrideByCode(functionCode)
      if (existingOverride) {
        await supabase
          .from('user_permission_overrides')
          .delete()
          .eq('id', existingOverride.id)
      } else {
        // Fallback: usa function_id
        const functionId = getFunctionId(functionCode)
        if (functionId) {
          await supabase
            .from('user_permission_overrides')
            .delete()
            .eq('user_id', selectedUser.id)
            .eq('function_id', functionId)
        }
      }

      await loadUserPermissions(selectedUser.id)
    } catch (error) {
      console.error('Errore rimozione override:', error)
    } finally {
      setSaving(false)
    }
  }

  // Raggruppa funzioni per categoria
  const groupedFunctions = appFunctions.reduce((acc, func) => {
    const cat = func.categoria || 'altro'
    if (!acc[cat]) acc[cat] = []
    acc[cat].push(func)
    return acc
  }, {})

  const filteredUsers = users.filter(u =>
    u.email.toLowerCase().includes(searchTerm.toLowerCase()) ||
    (u.nome && u.nome.toLowerCase().includes(searchTerm.toLowerCase())) ||
    (u.cognome && u.cognome.toLowerCase().includes(searchTerm.toLowerCase()))
  )

  const getUserRole = (user) => user.ruolo_livello || user.ruolo || 'titolare'

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900 p-6 flex items-center justify-center">
        <div className="text-center">
          <div className="w-12 h-12 border-4 border-teal-500 border-t-transparent rounded-full animate-spin mx-auto"></div>
          <p className="mt-4 text-slate-400">Caricamento permessi...</p>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900 p-6">
      {/* Header */}
      <div className="max-w-7xl mx-auto mb-6">
        <div className="bg-slate-950/60 backdrop-blur-md rounded-xl border border-slate-700/50 p-4">
          <div className="flex items-center gap-3">
            <Link href="/admin" className="text-slate-400 hover:text-white transition-colors">
              <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
              </svg>
            </Link>
            <div>
              <h1 className="text-2xl font-bold text-white">Gestione Permessi</h1>
              <p className="text-sm text-slate-400">Configura permessi granulari per ogni utente</p>
            </div>
          </div>
        </div>
      </div>

      {/* Info Box */}
      <div className="max-w-7xl mx-auto mb-6">
        <div className="bg-purple-500/10 border border-purple-500/30 rounded-xl p-4">
          <h3 className="text-purple-400 font-medium mb-2">Come funzionano i Permessi?</h3>
          <ul className="text-sm text-slate-400 space-y-1">
            <li>Ogni ruolo ha permessi di default (es. Admin ha tutto, Titolare ha gestione centro)</li>
            <li>Puoi creare override per dare o togliere permessi specifici a un utente</li>
            <li>Gli override hanno priorità sui permessi di default del ruolo</li>
          </ul>
        </div>
      </div>

      <div className="max-w-7xl mx-auto grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Lista Utenti */}
        <div className="lg:col-span-1">
          <div className="bg-slate-800/30 backdrop-blur-sm rounded-xl border border-slate-700/50 overflow-hidden">
            <div className="p-4 border-b border-slate-700/50">
              <h3 className="text-lg font-semibold text-white mb-3">Seleziona Utente</h3>
              <input
                type="text"
                placeholder="Cerca utente..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full px-3 py-2 bg-slate-900 border border-slate-600 rounded-lg text-white text-sm"
              />
            </div>
            <div className="max-h-[60vh] overflow-y-auto">
              {filteredUsers.map(user => (
                <button
                  key={user.id}
                  onClick={() => setSelectedUser(user)}
                  className={`w-full p-3 text-left border-b border-slate-700/30 hover:bg-slate-700/30 transition-colors ${
                    selectedUser?.id === user.id ? 'bg-teal-500/20 border-l-4 border-l-teal-500' : ''
                  }`}
                >
                  <p className="text-white font-medium text-sm">
                    {user.nome && user.cognome ? `${user.nome} ${user.cognome}` : user.email}
                  </p>
                  <p className="text-xs text-slate-400">{user.email}</p>
                  <span className={`inline-block mt-1 px-2 py-0.5 rounded text-xs ${
                    getUserRole(user) === 'admin' ? 'bg-emerald-500/20 text-emerald-400' :
                    getUserRole(user) === 'hpa' ? 'bg-purple-500/20 text-purple-400' :
                    'bg-cyan-500/20 text-cyan-400'
                  }`}>
                    {getUserRole(user)}
                  </span>
                </button>
              ))}
            </div>
          </div>
        </div>

        {/* Permessi Utente */}
        <div className="lg:col-span-2">
          {selectedUser ? (
            <div className="bg-slate-800/30 backdrop-blur-sm rounded-xl border border-slate-700/50 overflow-hidden">
              <div className="p-4 border-b border-slate-700/50">
                <h3 className="text-lg font-semibold text-white">
                  Permessi di {selectedUser.nome || selectedUser.email}
                </h3>
                <p className="text-sm text-slate-400">
                  Ruolo: <span className="text-teal-400">{getUserRole(selectedUser)}</span>
                  {userOverrides.length > 0 && (
                    <span className="ml-2 text-amber-400">({userOverrides.length} override attivi)</span>
                  )}
                </p>
              </div>

              <div className="p-4 max-h-[60vh] overflow-y-auto space-y-6">
                {Object.entries(groupedFunctions).map(([categoria, funcs]) => (
                  <div key={categoria}>
                    <h4 className="flex items-center gap-2 text-white font-medium mb-3">
                      <span>{CATEGORIES[categoria]?.icon || '📌'}</span>
                      {CATEGORIES[categoria]?.label || categoria}
                    </h4>
                    <div className="space-y-2">
                      {funcs.map(func => {
                        const perm = userPermissions[func.codice]
                        const isEnabled = perm?.abilitato ?? false
                        const isOverride = perm?.is_override ?? false
                        const hasOverride = userOverrides.some(o => o.app_functions?.codice === func.codice)

                        return (
                          <div
                            key={func.codice}
                            className={`flex items-center justify-between p-3 rounded-lg ${
                              hasOverride ? 'bg-amber-500/10 border border-amber-500/30' : 'bg-slate-900/50'
                            }`}
                          >
                            <div className="flex-1">
                              <p className="text-white text-sm font-medium">{func.nome}</p>
                              <p className="text-xs text-slate-400">{func.descrizione}</p>
                              <code className="text-xs text-slate-500">{func.codice}</code>
                            </div>
                            <div className="flex items-center gap-2">
                              {hasOverride && (
                                <button
                                  onClick={() => handleRemoveOverride(func.codice)}
                                  className="text-xs text-amber-400 hover:text-amber-300 px-2 py-1"
                                  title="Rimuovi override"
                                >
                                  Reset
                                </button>
                              )}
                              <button
                                onClick={() => handleTogglePermission(func.codice, isEnabled)}
                                disabled={saving}
                                className={`relative w-12 h-6 rounded-full transition-colors ${
                                  isEnabled ? 'bg-teal-500' : 'bg-slate-600'
                                } ${saving ? 'opacity-50' : ''}`}
                              >
                                <span
                                  className={`absolute top-1 left-1 w-4 h-4 rounded-full bg-white transition-transform ${
                                    isEnabled ? 'translate-x-6' : 'translate-x-0'
                                  }`}
                                />
                              </button>
                            </div>
                          </div>
                        )
                      })}
                    </div>
                  </div>
                ))}

                {appFunctions.length === 0 && (
                  <div className="text-center py-8 text-slate-400">
                    <p>Nessuna funzione definita.</p>
                    <p className="text-sm mt-2">Esegui la migrazione SQL per creare le funzioni app.</p>
                  </div>
                )}
              </div>
            </div>
          ) : (
            <div className="bg-slate-800/30 backdrop-blur-sm rounded-xl border border-slate-700/50 p-12 text-center">
              <div className="text-6xl mb-4">👈</div>
              <p className="text-slate-400">Seleziona un utente dalla lista per gestire i suoi permessi</p>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}

// Funzioni di default (usate se la tabella app_functions non esiste)
function getDefaultFunctions() {
  return [
    { codice: 'dashboard.visualizza', nome: 'Visualizza Dashboard', descrizione: 'Accesso alla dashboard principale', categoria: 'dashboard' },
    { codice: 'dashboard.widget_fatturato', nome: 'Widget Fatturato', descrizione: 'Visualizza widget fatturato', categoria: 'dashboard' },
    { codice: 'dashboard.widget_obiettivi', nome: 'Widget Obiettivi', descrizione: 'Visualizza widget obiettivi', categoria: 'dashboard' },
    { codice: 'movimenti.visualizza', nome: 'Visualizza Movimenti', descrizione: 'Accesso alla lista movimenti', categoria: 'movimenti' },
    { codice: 'movimenti.inserisci', nome: 'Inserisci Movimenti', descrizione: 'Può inserire nuovi movimenti', categoria: 'movimenti' },
    { codice: 'movimenti.modifica', nome: 'Modifica Movimenti', descrizione: 'Può modificare movimenti esistenti', categoria: 'movimenti' },
    { codice: 'analytics.visualizza', nome: 'Visualizza Analytics', descrizione: 'Accesso alle analisi', categoria: 'analytics' },
    { codice: 'obiettivi.visualizza', nome: 'Visualizza Obiettivi', descrizione: 'Accesso agli obiettivi', categoria: 'obiettivi' },
    { codice: 'obiettivi.crea', nome: 'Crea Obiettivi', descrizione: 'Può creare nuovi obiettivi', categoria: 'obiettivi' },
    { codice: 'beautyx.chat', nome: 'Chat Beautyx', descrizione: 'Accesso alla chat AI', categoria: 'beautyx' },
    { codice: 'beautyx.analisi_dati', nome: 'Analisi Dati AI', descrizione: 'AI può analizzare dati sensibili', categoria: 'beautyx' },
    { codice: 'contabilita.visualizza', nome: 'Visualizza Contabilità', descrizione: 'Accesso alla contabilità', categoria: 'contabilita' },
    { codice: 'banca.visualizza_saldi', nome: 'Visualizza Saldi', descrizione: 'Può vedere saldi bancari', categoria: 'banca' },
    { codice: 'utenti.visualizza', nome: 'Visualizza Utenti', descrizione: 'Può vedere lista utenti', categoria: 'utenti' },
    { codice: 'utenti.crea', nome: 'Crea Utenti', descrizione: 'Può creare nuovi utenti', categoria: 'utenti' },
    { codice: 'centri.visualizza', nome: 'Visualizza Centri', descrizione: 'Può vedere centri', categoria: 'centri' },
    { codice: 'centri.modifica', nome: 'Modifica Centri', descrizione: 'Può modificare centri', categoria: 'centri' },
    { codice: 'impostazioni.profilo', nome: 'Impostazioni Profilo', descrizione: 'Può modificare il proprio profilo', categoria: 'impostazioni' },
    { codice: 'impostazioni.centro', nome: 'Impostazioni Centro', descrizione: 'Può modificare impostazioni centro', categoria: 'impostazioni' }
  ]
}

// Permessi di default per ruolo
function getDefaultPermissionsForRole(ruolo) {
  const allPerms = {}

  // Admin ha tutto
  if (ruolo === 'admin') {
    getDefaultFunctions().forEach(f => {
      allPerms[f.codice] = { abilitato: true, is_override: false }
    })
    return allPerms
  }

  // HPA
  if (ruolo === 'hpa') {
    const hpaPerms = [
      'dashboard.visualizza', 'dashboard.widget_fatturato', 'dashboard.widget_obiettivi',
      'movimenti.visualizza', 'analytics.visualizza', 'obiettivi.visualizza', 'obiettivi.crea',
      'beautyx.chat', 'utenti.visualizza', 'centri.visualizza'
    ]
    getDefaultFunctions().forEach(f => {
      allPerms[f.codice] = { abilitato: hpaPerms.includes(f.codice), is_override: false }
    })
    return allPerms
  }

  // Titolare
  if (ruolo === 'titolare' || ruolo === 'centro') {
    const titolarePerms = [
      'dashboard.visualizza', 'dashboard.widget_fatturato', 'dashboard.widget_obiettivi',
      'movimenti.visualizza', 'movimenti.inserisci', 'movimenti.modifica',
      'analytics.visualizza', 'obiettivi.visualizza', 'obiettivi.crea',
      'beautyx.chat', 'beautyx.analisi_dati',
      'contabilita.visualizza', 'banca.visualizza_saldi',
      'utenti.visualizza', 'utenti.crea',
      'centri.visualizza', 'centri.modifica',
      'impostazioni.profilo', 'impostazioni.centro'
    ]
    getDefaultFunctions().forEach(f => {
      allPerms[f.codice] = { abilitato: titolarePerms.includes(f.codice), is_override: false }
    })
    return allPerms
  }

  // Direttore
  if (ruolo === 'direttore') {
    const direttorePerms = [
      'dashboard.visualizza', 'dashboard.widget_fatturato',
      'analytics.visualizza', 'obiettivi.visualizza',
      'beautyx.chat', 'impostazioni.profilo'
    ]
    getDefaultFunctions().forEach(f => {
      allPerms[f.codice] = { abilitato: direttorePerms.includes(f.codice), is_override: false }
    })
    return allPerms
  }

  // Amministrativo
  if (ruolo === 'amministrativo') {
    const ammPerms = [
      'dashboard.visualizza', 'movimenti.visualizza', 'movimenti.inserisci',
      'contabilita.visualizza', 'contabilita.modifica',
      'banca.visualizza_saldi', 'banca.visualizza_movimenti',
      'impostazioni.profilo'
    ]
    getDefaultFunctions().forEach(f => {
      allPerms[f.codice] = { abilitato: ammPerms.includes(f.codice), is_override: false }
    })
    return allPerms
  }

  // Default: nessun permesso
  getDefaultFunctions().forEach(f => {
    allPerms[f.codice] = { abilitato: false, is_override: false }
  })
  return allPerms
}
