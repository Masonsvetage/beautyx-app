'use client'

import { createContext, useContext, useState, useEffect, useCallback, useRef, useMemo } from 'react'
import { supabase } from '@/lib/supabase'
import { useRouter } from 'next/navigation'

const AuthContext = createContext()

// Timeout inattività: 8 ore in ms
const INACTIVITY_TIMEOUT_MS = 8 * 60 * 60 * 1000
const LAST_ACTIVITY_KEY = 'beautyx_last_activity'

// Gerarchia ruoli (livello numerico)
const ROLE_LEVELS = {
  admin: 0,
  hpa: 1,
  titolare: 2,
  direttore: 3,
  amministrativo: 3
}

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null)
  const [profile, setProfile] = useState(null)
  const [loading, setLoading] = useState(true)
  const router = useRouter()

  // Sistema permessi
  const [permissions, setPermissions] = useState({}) // { 'codice.funzione': true/false }
  const [permissionsLoaded, setPermissionsLoaded] = useState(false)

  // Accesso centri
  const [centriAccess, setCentriAccess] = useState([])
  const [currentCentro, setCurrentCentro] = useState(null)

  // Ref per accedere a centriAccess senza dipendenze (evita loop)
  const centriAccessRef = useRef([])

  // =====================================================
  // INACTIVITY TIMEOUT (8 ore)
  // =====================================================
  const inactivityTimerRef = useRef(null)

  const forceSignOutInactive = useCallback(() => {
    if (typeof window !== 'undefined') {
      localStorage.removeItem(LAST_ACTIVITY_KEY)
      localStorage.removeItem('beautyx_current_centro')
      localStorage.removeItem('beautyx_current_centro_nome')
    }
    supabase.auth.signOut().finally(() => {
      window.location.href = '/login?error=session_expired'
    })
  }, [])

  const updateLastActivity = useCallback(() => {
    if (typeof window !== 'undefined') {
      localStorage.setItem(LAST_ACTIVITY_KEY, Date.now().toString())
    }
  }, [])

  // Avvia il monitoraggio inattività (chiamato dopo login confermato)
  const startInactivityMonitor = useCallback((userRef) => {
    if (typeof window === 'undefined') return

    // Aggiorna timestamp ad ogni interazione utente
    const activityEvents = ['click', 'keydown', 'scroll', 'touchstart', 'mousemove']
    const handleActivity = () => updateLastActivity()
    activityEvents.forEach(e => window.addEventListener(e, handleActivity, { passive: true }))

    // Controllo periodico ogni 60 secondi
    inactivityTimerRef.current = setInterval(() => {
      const lastActivity = parseInt(localStorage.getItem(LAST_ACTIVITY_KEY) || '0', 10)
      if (lastActivity && Date.now() - lastActivity > INACTIVITY_TIMEOUT_MS) {
        activityEvents.forEach(e => window.removeEventListener(e, handleActivity))
        clearInterval(inactivityTimerRef.current)
        forceSignOutInactive()
      }
    }, 60_000)

    return () => {
      activityEvents.forEach(e => window.removeEventListener(e, handleActivity))
      clearInterval(inactivityTimerRef.current)
    }
  }, [updateLastActivity, forceSignOutInactive])

  // Gerarchia utenti (per titolari)
  const [subUsers, setSubUsers] = useState([])

  // Multi-ruolo
  const [allRoles, setAllRoles] = useState([])
  const [activeRole, setActiveRole] = useState(null)

  // =====================================================
  // CARICAMENTO PROFILO
  // =====================================================
  const loadProfile = useCallback(async (userId) => {
    try {
      const { data, error } = await supabase
        .from('user_profiles')
        .select('*')
        .eq('id', userId)
        .maybeSingle()

      if (error) throw error
      setProfile(data)
      return data
    } catch (error) {
      console.error('Errore caricamento profilo:', error)
      return null
    }
  }, [])

  // =====================================================
  // CARICAMENTO PERMESSI
  // =====================================================
  const loadPermissions = useCallback(async (userId) => {
    // Usa direttamente i permessi legacy basati sul ruolo
    return loadLegacyPermissions(userId)
  }, [])

  // Fallback permessi per sistema legacy
  const loadLegacyPermissions = useCallback(async (userId, existingProfile = null) => {
    // Se non esiste il nuovo sistema, usa i permessi di default basati sul ruolo
    const prof = existingProfile || profile
    if (!prof) return {}

    const ruolo = prof.ruolo_livello || prof.ruolo || 'titolare'
    const legacyPerms = {}

    // Permessi di default per ruolo (semplificato)
    const defaults = {
      admin: true,  // Admin ha tutto
      hpa: {
        'dashboard.visualizza': true,
        'dashboard.widget_fatturato': true,
        'dashboard.widget_obiettivi': true,
        'movimenti.visualizza': true,
        'analytics.visualizza': true,
        'obiettivi.visualizza': true,
        'obiettivi.crea': true,
        'beautyx.chat': true,
        'utenti.visualizza': true,
        'utenti.gestisci_permessi': true,
        'centri.visualizza': true
      },
      titolare: {
        'dashboard.visualizza': true,
        'dashboard.widget_fatturato': true,
        'dashboard.widget_obiettivi': true,
        'movimenti.visualizza': true,
        'movimenti.inserisci': true,
        'movimenti.modifica': true,
        'analytics.visualizza': true,
        'obiettivi.visualizza': true,
        'obiettivi.crea': true,
        'beautyx.chat': true,
        'beautyx.analisi_dati': true,
        'contabilita.visualizza': true,
        'banca.visualizza_saldi': true,
        'utenti.visualizza': true,
        'utenti.crea': true,
        'centri.visualizza': true,
        'centri.modifica': true,
        'impostazioni.profilo': true,
        'impostazioni.centro': true
      },
      direttore: {
        'dashboard.visualizza': true,
        'dashboard.widget_fatturato': true,
        'analytics.visualizza': true,
        'obiettivi.visualizza': true,
        'beautyx.chat': true,
        'impostazioni.profilo': true
      },
      amministrativo: {
        'dashboard.visualizza': true,
        'movimenti.visualizza': true,
        'movimenti.inserisci': true,
        'contabilita.visualizza': true,
        'contabilita.modifica': true,
        'banca.visualizza_saldi': true,
        'banca.visualizza_movimenti': true,
        'impostazioni.profilo': true
      }
    }

    if (ruolo === 'admin') {
      legacyPerms['*'] = true
    } else {
      Object.assign(legacyPerms, defaults[ruolo] || defaults.titolare)
    }

    setPermissions(legacyPerms)
    setPermissionsLoaded(true)
    return legacyPerms
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []) // Nessuna dipendenza - profile viene passato come parametro

  // =====================================================
  // CARICAMENTO ACCESSO CENTRI
  // =====================================================
  const loadCentriAccess = useCallback(async (userId) => {
    // Usa direttamente il sistema legacy
    return loadLegacyCentriAccess(userId)
  }, [])

  // Fallback centri per sistema legacy
  const loadLegacyCentriAccess = useCallback(async (userId, existingProfile = null) => {
    const prof = existingProfile || profile
    if (!prof) return []

    const accessi = []

    // Admin: vista globale di default, centri caricati on-demand
    if (prof.ruolo === 'admin' || prof.ruolo_livello === 'admin') {
      // Non caricare tutti i centri - admin ha vista globale
      // I centri verranno caricati on-demand via searchCentri()
      setCentriAccess([])
      setCurrentCentro(null)
      return []
    }
    // HPA vede centri assegnati
    else if (prof.ruolo === 'hpa' || prof.ruolo_livello === 'hpa') {
      const { data: assignments, error: assignError } = await supabase
        .from('hpa_centro_assignments')
        .select('centro_id, beauty_centers(id, nome)')
        .eq('hpa_id', userId)
        .or('data_fine.is.null,data_fine.gte.' + new Date().toISOString().split('T')[0])

      if (assignError) {
        console.error('Errore caricamento assegnamenti HPA:', assignError)
      }

      // Per ogni assegnamento, risolvi il nome centro (con fallback se il join non funziona)
      for (const a of (assignments || [])) {
        let centroNome = a.beauty_centers?.nome
        if (!centroNome && a.centro_id) {
          const { data: bc } = await supabase
            .from('beauty_centers')
            .select('nome')
            .eq('id', a.centro_id)
            .single()
          centroNome = bc?.nome
        }
        accessi.push({
          centro_id: a.centro_id,
          centro_nome: centroNome || 'Centro sconosciuto',
          tipo_accesso: 'hpa',
          is_sede_principale: false,
          permessi_centro: {}
        })
      }
    }
    // Titolare/Centro vede il proprio centro
    else if (prof.centro_id) {
      const { data: centro } = await supabase
        .from('beauty_centers')
        .select('id, nome')
        .eq('id', prof.centro_id)
        .single()

      if (centro) {
        accessi.push({
          centro_id: centro.id,
          centro_nome: centro.nome,
          tipo_accesso: 'titolare',
          is_sede_principale: true,
          permessi_centro: {}
        })
      }
    }

    setCentriAccess(accessi)
    if (accessi.length > 0) {
      setCurrentCentro(accessi[0])
    }

    return accessi
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []) // Nessuna dipendenza - profile viene passato come parametro

  // =====================================================
  // CARICAMENTO SOTTO-UTENTI (per titolari)
  // =====================================================
  const loadSubUsers = useCallback(async (userId) => {
    try {
      const { data: direct } = await supabase
        .from('user_profiles')
        .select('id, email, nome, cognome, ruolo_livello, parent_user_id')
        .eq('parent_user_id', userId)

      setSubUsers(direct || [])
      return direct || []
    } catch (error) {
      console.error('Errore caricamento sotto-utenti:', error)
      return []
    }
  }, [])

  // Aggiorna ref quando centriAccess cambia
  useEffect(() => {
    centriAccessRef.current = centriAccess
  }, [centriAccess])

  // =====================================================
  // CAMBIO CENTRO CORRENTE
  // =====================================================
  const switchCentro = useCallback((centroId, centri = null) => {
    const lista = centri || centriAccessRef.current
    const centro = lista.find(c => c.centro_id === centroId)
    if (centro) {
      setCurrentCentro(centro)
      // Salva in localStorage
      if (typeof window !== 'undefined') {
        localStorage.setItem('beautyx_current_centro', centroId)
      }
      return true
    }
    return false
  }, []) // Usiamo ref invece di centriAccess per evitare loop

  // =====================================================
  // ADMIN: RICERCA CENTRI ON-DEMAND + ENTRA/ESCI
  // =====================================================
  const searchCentri = useCallback(async (query = '') => {
    let queryBuilder = supabase
      .from('beauty_centers')
      .select('id, nome')
      .order('nome')
      .limit(50)
    if (query) {
      queryBuilder = queryBuilder.ilike('nome', `%${query}%`)
    }
    const { data } = await queryBuilder
    return (data || []).map(c => ({
      centro_id: c.id,
      centro_nome: c.nome,
      tipo_accesso: 'admin'
    }))
  }, [])

  const enterCentro = useCallback((centroId, centroNome) => {
    setCurrentCentro({
      centro_id: centroId,
      centro_nome: centroNome,
      tipo_accesso: 'admin',
      is_sede_principale: true,
      permessi_centro: {}
    })
    if (typeof window !== 'undefined') {
      localStorage.setItem('beautyx_current_centro', centroId)
      localStorage.setItem('beautyx_current_centro_nome', centroNome)
    }
  }, [])

  const exitCentro = useCallback(() => {
    setCurrentCentro(null)
    if (typeof window !== 'undefined') {
      localStorage.removeItem('beautyx_current_centro')
      localStorage.removeItem('beautyx_current_centro_nome')
    }
  }, [])

  // =====================================================
  // CARICAMENTO RUOLI MULTIPLI
  // =====================================================
  const loadUserRoles = useCallback(async (userId) => {
    try {
      const { data, error } = await supabase.rpc('get_user_all_roles', { p_user_id: userId })
      if (error) {
        // La funzione RPC potrebbe non esistere o avere schema diverso - fallback silenzioso
        setAllRoles([])
        return []
      }
      setAllRoles(data || [])

      // Imposta ruolo primario se non ancora impostato
      const primary = data?.find(r => r.is_primary) || data?.[0]
      if (primary) {
        setActiveRole(primary)
      }
      return data || []
    } catch (error) {
      console.error('Errore caricamento ruoli:', error)
      setAllRoles([])
      return []
    }
  }, [])

  // =====================================================
  // SWITCH RUOLO
  // =====================================================
  const switchRole = useCallback(async (roleId) => {
    if (!user) return false
    try {
      const { error } = await supabase.rpc('switch_user_role', {
        p_user_id: user.id,
        p_role_id: roleId
      })
      if (error) throw error

      const newRole = allRoles.find(r => r.role_id === roleId)
      if (newRole) {
        setActiveRole(newRole)

        // Ricarica profilo, permessi e centri per il nuovo ruolo
        const newProfile = await loadProfile(user.id)
        await Promise.all([
          loadLegacyPermissions(user.id, newProfile),
          loadLegacyCentriAccess(user.id, newProfile)
        ])

        // Se il ruolo ha un centro specifico, selezionalo
        if (newRole.centro_id) {
          switchCentro(newRole.centro_id)
        }
      }
      return true
    } catch (error) {
      console.error('Errore switch ruolo:', error)
      return false
    }
  }, [user, allRoles, loadProfile, loadLegacyPermissions, loadLegacyCentriAccess, switchCentro])

  // =====================================================
  // VERIFICA PERMESSI
  // =====================================================
  const hasPermission = useCallback((functionCode) => {
    if (!permissionsLoaded) return false

    // Admin ha tutto
    if (permissions['*'] === true) return true

    // Verifica permesso specifico
    return permissions[functionCode] === true
  }, [permissions, permissionsLoaded])

  // Verifica se può gestire un utente specifico
  const canManageUser = useCallback((targetUserId) => {
    if (!profile) return false

    // Admin può gestire tutti
    if (profile.ruolo_livello === 'admin') return true

    // Titolare può gestire i suoi sotto-utenti
    if (profile.ruolo_livello === 'titolare') {
      return subUsers.some(u => u.user_id === targetUserId || u.id === targetUserId)
    }

    // HPA può gestire utenti assegnati
    if (profile.ruolo_livello === 'hpa') {
      // Questo richiede una query - per ora return false
      // In futuro: verificare hpa_assegnato_id
      return false
    }

    return false
  }, [profile, subUsers])

  // =====================================================
  // INIZIALIZZAZIONE AUTH
  // =====================================================
  useEffect(() => {
    let isMounted = true
    // Flag per prevenire doppio caricamento: onAuthStateChange SIGNED_IN
    // viene sparato anche per sessioni esistenti al mount, sovrapponendosi a initAuth
    const initDoneRef = { current: false }

    const loadUserData = async (userId) => {
      const userProfile = await loadProfile(userId)
      if (!isMounted) return null

      if (userProfile) {
        // Traccia ultimo accesso per GDPR (fire and forget)
        supabase.rpc('update_ultimo_accesso', { p_user_id: userId }).then(() => {}, () => {})

        // Check cancellazione account scaduta (lato client)
        if (userProfile.cancellazione_effettiva_il) {
          const effectiveDate = new Date(userProfile.cancellazione_effettiva_il)
          if (effectiveDate <= new Date()) {
            await supabase.auth.signOut()
            if (typeof window !== 'undefined') {
              window.location.href = '/login?error=account_deleted'
            }
            return null
          }
        }

        const [, loadedCentri] = await Promise.all([
          loadLegacyPermissions(userId, userProfile),
          loadLegacyCentriAccess(userId, userProfile),
        ])
        // Non-critici: background
        loadSubUsers(userId)
        loadUserRoles(userId)

        if (!isMounted) return userProfile

        // Ripristina centro da localStorage
        if (typeof window !== 'undefined') {
          const savedCentro = localStorage.getItem('beautyx_current_centro')
          if (savedCentro) {
            if (userProfile.ruolo_livello === 'admin') {
              const savedNome = localStorage.getItem('beautyx_current_centro_nome') || 'Centro'
              setCurrentCentro({
                centro_id: savedCentro,
                centro_nome: savedNome,
                tipo_accesso: 'admin',
                is_sede_principale: true,
                permessi_centro: {}
              })
            } else if (loadedCentri?.length > 0) {
              switchCentro(savedCentro, loadedCentri)
            }
          }
        }
      }
      return userProfile
    }

    const initAuth = async () => {
      // Timeout di sicurezza - sblocca loading dopo 5 secondi
      const timeoutId = setTimeout(() => {
        if (isMounted) {
          console.warn('Auth timeout - sbloccato loading forzatamente')
          setLoading(false)
        }
      }, 5000)

      try {
        // getSession può fare network call per refresh token — limitiamo a 4s
        const sessionResult = await Promise.race([
          supabase.auth.getSession(),
          new Promise((_, reject) => setTimeout(() => reject(new Error('getSession timeout')), 4000))
        ])

        if (!isMounted) return

        const session = sessionResult?.data?.session
        if (session?.user) {
          // Controlla inattività prima di ripristinare la sessione
          const lastActivity = parseInt(localStorage.getItem(LAST_ACTIVITY_KEY) || '0', 10)
          if (lastActivity && Date.now() - lastActivity > INACTIVITY_TIMEOUT_MS) {
            clearTimeout(timeoutId)
            forceSignOutInactive()
            return
          }

          setUser(session.user)
          updateLastActivity()
          await loadUserData(session.user.id)
          startInactivityMonitor(session.user)
        }
      } catch (error) {
        if (error.message !== 'getSession timeout') {
          console.error('Errore inizializzazione auth:', error)
        }
      } finally {
        clearTimeout(timeoutId)
        initDoneRef.current = true
        if (isMounted) {
          setLoading(false)
        }
      }
    }

    initAuth()

    // Listener auth changes
    const { data: { subscription } } = supabase.auth.onAuthStateChange(async (event, session) => {
      if (!isMounted) return

      if (event === 'SIGNED_IN' && session?.user) {
        // Se initAuth sta ancora girando, lui gestisce già il caricamento — evita doppio lavoro
        if (!initDoneRef.current) return

        setUser(session.user)
        updateLastActivity()
        await loadUserData(session.user.id)
        startInactivityMonitor(session.user)
      } else if (event === 'PASSWORD_RECOVERY' && session?.user) {
        // Fix redirect prematuro reset-password (05/09/2026, segnalazione
        // Mason): il link di recovery Supabase fa arrivare l'utente con una
        // sessione temporanea e questo listener riceve l'evento
        // `PASSWORD_RECOVERY` (non `SIGNED_IN`). Prima di questo fix
        // l'evento non era gestito affatto: `user` restava `null`, e il
        // guard in app/reset-password/update/page.js ("se dopo 3s non c'è
        // user, torna a /reset-password") rimandava indietro l'utente prima
        // che potesse digitare la nuova password. Qui NON si applica il
        // guard `initDoneRef` usato per SIGNED_IN (quel guard serve solo ad
        // evitare un doppio caricamento al mount per sessioni già
        // esistenti — questo evento arriva sempre e solo dal link di
        // recovery, mai al mount normale).
        setUser(session.user)
        updateLastActivity()
        await loadUserData(session.user.id)
        startInactivityMonitor(session.user)
      } else if (event === 'SIGNED_OUT') {
        clearInterval(inactivityTimerRef.current)
        setUser(null)
        setProfile(null)
        setPermissions({})
        setPermissionsLoaded(false)
        setCentriAccess([])
        setCurrentCentro(null)
        setSubUsers([])
        setAllRoles([])
        setActiveRole(null)
        setLoading(false)
        if (typeof window !== 'undefined') {
          localStorage.removeItem('beautyx_current_centro')
          localStorage.removeItem('beautyx_current_centro_nome')
          localStorage.removeItem(LAST_ACTIVITY_KEY)
        }
        // Non usare router.push qui - signOut() fa hard redirect con window.location.href
        // Per session expiry, il middleware gestisce il redirect
      }
    })

    return () => {
      isMounted = false
      subscription.unsubscribe()
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []) // Eseguiamo solo al mount - le funzioni usano sempre i valori più recenti via closure

  // =====================================================
  // AZIONI AUTH
  // =====================================================
  const signIn = async (email, password) => {
    try {
      const { data, error } = await supabase.auth.signInWithPassword({ email, password })
      if (error) throw error
      return { success: true, user: data.user }
    } catch (error) {
      console.error('Errore login:', error)
      return { success: false, error: error.message }
    }
  }

  const signUp = async (email, password, datiExtra = {}) => {
    try {
      // Bug fix (03/09/2026, collaudo Mason — bug #4): senza emailRedirectTo
      // esplicito, il link di conferma nell'email usa il "Site URL" di
      // default configurato su Supabase (dashboard), che spesso non punta
      // affatto a una route capace di completare il login (nel progetto non
      // esisteva proprio nessuna route di questo tipo, vedi
      // app/auth/callback/route.js, creata in questo stesso giro). Passare
      // qui l'origin corrente fa sì che il link email porti sempre alla
      // nostra route di scambio sessione, sia in locale sia in produzione.
      const { data: authData, error: authError } = await supabase.auth.signUp({
        email,
        password,
        options: {
          data: { nome: datiExtra.nome, cognome: datiExtra.cognome },
          emailRedirectTo: typeof window !== 'undefined' ? `${window.location.origin}/auth/callback` : undefined
        }
      })

      if (authError) throw authError

      // Fix messaggio ambiguo post-signup (05/09/2026, segnalazione Mason):
      // Supabase risponde 200 alla signup anche se l'email esiste già, ma
      // espone un segnale distinguibile lato client: per un utente DAVVERO
      // nuovo `authData.user.identities` contiene almeno un elemento, per
      // un'email già registrata (e già confermata) torna un array VUOTO
      // `[]` sullo stesso `authData.user` (nessun errore esplicito, per non
      // permettere l'enumerazione email). Usiamo questo per dire la verità
      // alla persona invece di un messaggio "paracadute" ambiguo.
      const alreadyRegistered = !!(
        authData.user &&
        Array.isArray(authData.user.identities) &&
        authData.user.identities.length === 0
      )

      // Salva i dati anagrafici in user_profiles SOLO per un account
      // davvero nuovo: se alreadyRegistered è true, authData.user è
      // l'utente ESISTENTE (stesso id) e fare comunque l'upsert qui
      // sovrascriverebbe silenziosamente l'anagrafica già salvata di
      // quell'account con i dati del nuovo tentativo di signup — bug
      // di integrità dati scoperto insieme al fix del messaggio.
      if (authData.user && !alreadyRegistered) {
        const profileData = {
          id: authData.user.id,
          email: email,
          nome: datiExtra.nome || null,
          cognome: datiExtra.cognome || null,
          tipo_soggetto: datiExtra.tipo_soggetto || 'persona_fisica',
          ragione_sociale: datiExtra.ragione_sociale || null,
          tipo_societa: datiExtra.tipo_societa || null,
          codice_fiscale: datiExtra.codice_fiscale || null,
          partita_iva: datiExtra.partita_iva || null,
          cellulare: datiExtra.cellulare || null,
          telefono_fisso: datiExtra.telefono_fisso || null,
          pec: datiExtra.pec || null,
          residenza_indirizzo: datiExtra.residenza_indirizzo || null,
          residenza_civico: datiExtra.residenza_civico || null,
          residenza_cap: datiExtra.residenza_cap || null,
          residenza_citta: datiExtra.residenza_citta || null,
          residenza_provincia: datiExtra.residenza_provincia || null,
          domicilio_diverso: datiExtra.domicilio_diverso || false,
          domicilio_indirizzo: datiExtra.domicilio_indirizzo || null,
          domicilio_civico: datiExtra.domicilio_civico || null,
          domicilio_cap: datiExtra.domicilio_cap || null,
          domicilio_citta: datiExtra.domicilio_citta || null,
          domicilio_provincia: datiExtra.domicilio_provincia || null,
          documento_tipo: datiExtra.documento_tipo || null,
          documento_numero: datiExtra.documento_numero || null,
          documento_data_scadenza: datiExtra.documento_data_scadenza || null,
          ruolo: 'centro',
          ruolo_livello: 'titolare',
          piano: 'demo',
          attivo: true
        }

        // Attendi un momento per il trigger auth
        await new Promise(resolve => setTimeout(resolve, 500))

        const { error: profileError } = await supabase
          .from('user_profiles')
          .upsert(profileData, { onConflict: 'id' })

        if (profileError) {
          console.error('Errore salvataggio profilo anagrafica:', profileError)
        }
      }

      return { success: true, user: authData.user, alreadyRegistered }
    } catch (error) {
      console.error('Errore registrazione:', error)
      return { success: false, error: error.message }
    }
  }

  const signOut = async () => {
    // Pulizia localStorage
    if (typeof window !== 'undefined') {
      localStorage.removeItem('beautyx_current_centro')
      localStorage.removeItem('beautyx_current_centro_nome')
    }
    // Redirect all'API route server-side che invalida la sessione
    // e cancella correttamente i cookie HttpOnly SSR
    window.location.href = '/api/auth/signout'
  }

  // =====================================================
  // RESET PASSWORD
  // =====================================================
  const resetPassword = async (email) => {
    try {
      const { error } = await supabase.auth.resetPasswordForEmail(email, {
        redirectTo: `${window.location.origin}/reset-password/update`
      })
      if (error) throw error
      return { success: true }
    } catch (error) {
      console.error('Errore reset password:', error)
      return { success: false, error: error.message }
    }
  }

  const updatePassword = async (newPassword) => {
    try {
      const { error } = await supabase.auth.updateUser({ password: newPassword })
      if (error) throw error
      return { success: true }
    } catch (error) {
      console.error('Errore aggiornamento password:', error)
      return { success: false, error: error.message }
    }
  }

  // =====================================================
  // HELPER RUOLI (compatibilità)
  // =====================================================
  const ruoloLivello = profile?.ruolo_livello || profile?.ruolo || null
  const isAdmin = ruoloLivello === 'admin'
  const isHpa = ruoloLivello === 'hpa'
  const isTitolare = ruoloLivello === 'titolare'
  const isDirettore = ruoloLivello === 'direttore'
  const isAmministrativo = ruoloLivello === 'amministrativo'

  // Livello gerarchico numerico
  const roleLevel = ROLE_LEVELS[ruoloLivello] ?? 99

  // Può gestire un ruolo inferiore?
  const canManageRole = useCallback((targetRole) => {
    const targetLevel = ROLE_LEVELS[targetRole] ?? 99
    return roleLevel < targetLevel
  }, [roleLevel])

  // =====================================================
  // INFO PER BEAUTYX AI (memoized)
  // =====================================================
  const beautyxContext = useMemo(() => ({
    ruolo: ruoloLivello,
    livello: roleLevel,
    puoVedereFatturato: hasPermission('dashboard.widget_fatturato'),
    puoVedereMovimenti: hasPermission('movimenti.visualizza'),
    puoVedereAnalytics: hasPermission('analytics.visualizza'),
    puoVedereContabilita: hasPermission('contabilita.visualizza'),
    puoVedereBanca: hasPermission('banca.visualizza_saldi'),
    puoAnalizzareDati: hasPermission('beautyx.analisi_dati'),
    puoAccedereDatiSensibili: hasPermission('beautyx.dati_sensibili'),
    centriAccessibili: centriAccess.map(c => ({
      id: c.centro_id,
      nome: c.centro_nome,
      tipoAccesso: c.tipo_accesso
    })),
    centroCorrente: currentCentro ? {
      id: currentCentro.centro_id,
      nome: currentCentro.centro_nome,
      tipoAccesso: currentCentro.tipo_accesso
    } : null
  }), [ruoloLivello, roleLevel, hasPermission, centriAccess, currentCentro])

  // =====================================================
  // CONTEXT VALUE (memoized per evitare re-render a cascata)
  // =====================================================
  const value = useMemo(() => ({
    // Stato base
    user,
    profile,
    loading,

    // Permessi
    permissions,
    permissionsLoaded,
    hasPermission,

    // Centri
    centriAccess,
    currentCentro,
    switchCentro,
    searchCentri,
    enterCentro,
    exitCentro,
    isGlobalView: isAdmin && !currentCentro,

    // Gerarchia utenti
    subUsers,
    canManageUser,
    canManageRole,

    // Ruoli (helper)
    ruoloLivello,
    roleLevel,
    isAdmin,
    isHpa,
    isTitolare,
    isDirettore,
    isAmministrativo,

    // Compatibilita vecchio sistema
    isAuthenticated: !!user,
    isLoading: loading,
    centroId: currentCentro?.centro_id || profile?.centro_id || null,
    ruolo: ruoloLivello,
    isCentro: isTitolare || isDirettore || isAmministrativo,

    // Per Beautyx AI
    beautyxContext,

    // Azioni
    signIn,
    signUp,
    signOut,
    resetPassword,
    updatePassword,

    // Ricarica dati
    reloadPermissions: loadLegacyPermissions,
    reloadCentri: loadLegacyCentriAccess,
    reloadSubUsers: loadSubUsers,

    // Multi-ruolo
    allRoles,
    activeRole,
    switchRole,
    hasMultipleRoles: allRoles.length > 1,
    reloadRoles: loadUserRoles
  }), [
    user, profile, loading, permissions, permissionsLoaded, hasPermission,
    centriAccess, currentCentro, switchCentro, searchCentri, enterCentro, exitCentro,
    isAdmin, subUsers, canManageUser, canManageRole,
    ruoloLivello, roleLevel, isHpa, isTitolare, isDirettore, isAmministrativo,
    beautyxContext, allRoles, activeRole, switchRole,
    signOut, resetPassword, updatePassword,
    loadLegacyPermissions, loadLegacyCentriAccess, loadSubUsers, loadUserRoles,
    updateLastActivity, forceSignOutInactive, startInactivityMonitor
  ])

  return (
    <AuthContext.Provider value={value}>
      {children}
    </AuthContext.Provider>
  )
}

export function useAuth() {
  const context = useContext(AuthContext)
  if (!context) {
    throw new Error('useAuth must be used within AuthProvider')
  }
  return context
}

// Hook per verificare permesso specifico
export function usePermission(functionCode) {
  const { hasPermission, permissionsLoaded } = useAuth()
  return {
    allowed: hasPermission(functionCode),
    loading: !permissionsLoaded
  }
}

// Hook per proteggere componenti
export function useRequirePermission(functionCode) {
  const { hasPermission, permissionsLoaded, loading } = useAuth()
  const router = useRouter()

  useEffect(() => {
    if (!loading && permissionsLoaded && !hasPermission(functionCode)) {
      router.push('/unauthorized')
    }
  }, [loading, permissionsLoaded, hasPermission, functionCode, router])

  return {
    allowed: hasPermission(functionCode),
    loading: loading || !permissionsLoaded
  }
}
