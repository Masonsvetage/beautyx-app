'use client'

import { createContext, useContext, useState, useEffect, useCallback, useRef } from 'react'
import { usePathname } from 'next/navigation'
import { createClient } from '@supabase/supabase-js'

const BeautyxContext = createContext()

// Client Supabase per Realtime (non SSR, client-side only)
let realtimeClient = null
function getRealtimeClient() {
  if (!realtimeClient && typeof window !== 'undefined') {
    realtimeClient = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
    )
  }
  return realtimeClient
}

export function BeautyxProvider({ children, centroId, isHpa = false, userId = null }) {
  const [isOpen, setIsOpen] = useState(false)
  const [isFullScreen, setIsFullScreen] = useState(false)
  const [messages, setMessages] = useState([])
  const [conversationId, setConversationId] = useState(null)
  const [isLoading, setIsLoading] = useState(false)
  const [insights, setInsights] = useState([])
  const [avatarUrl, setAvatarUrl] = useState('/beautyx-avatar.svg')
  const [showHistory, setShowHistory] = useState(false) // Mostra storico conversazioni
  const [conversations, setConversations] = useState([]) // Elenco conversazioni
  const [fontSize, setFontSize] = useState(14) // Dimensione font (default 14px)
  const pathname = usePathname()

  // === HPA CHAT STATE ===
  const [chatMode, setChatMode] = useState('ai')        // 'ai' | 'hpa'
  const [hpaMessages, setHpaMessages] = useState([])
  const [hpaUnread, setHpaUnread] = useState(0)
  const [hpaLoading, setHpaLoading] = useState(false)
  const [hpaHasAssignment, setHpaHasAssignment] = useState(false) // utente ha un HPA assegnato?
  const [hpaName, setHpaName] = useState(null)           // Nome dell'HPA assegnato
  const [hpaAvatarUrl, setHpaAvatarUrl] = useState(null) // Foto profilo dell'HPA assegnato
  const [tokenUsage, setTokenUsage] = useState(null)     // Crediti AI + ore HPA
  const realtimeChannelRef = useRef(null)
  const hpaInitializedRef = useRef(null)                  // centro_id per cui e' stato inizializzato

  // Carica dimensione font da localStorage
  useEffect(() => {
    const savedFontSize = localStorage.getItem('beautyx-font-size')
    if (savedFontSize) {
      setFontSize(parseInt(savedFontSize, 10))
    }
  }, [])

  // Funzioni per modificare dimensione font
  const increaseFontSize = () => {
    const newSize = Math.min(fontSize + 2, 24) // Max 24px
    setFontSize(newSize)
    localStorage.setItem('beautyx-font-size', newSize.toString())
  }

  const decreaseFontSize = () => {
    const newSize = Math.max(fontSize - 2, 10) // Min 10px
    setFontSize(newSize)
    localStorage.setItem('beautyx-font-size', newSize.toString())
  }

  // Determina il contesto della pagina corrente
  const getPageContext = useCallback(() => {
    if (pathname === '/') return 'dashboard'
    if (pathname.startsWith('/movimenti')) return 'movimenti'
    if (pathname.startsWith('/analytics')) return 'analytics'
    if (pathname.startsWith('/pianificazione')) return 'pianificazione'
    return 'altro'
  }, [pathname])

  const getPageDisplayName = useCallback(() => {
    const contexts = {
      dashboard: 'Dashboard',
      movimenti: 'Movimenti Bancari',
      analytics: 'Analytics',
      pianificazione: 'Pianificazione Finanziaria'
    }
    return contexts[getPageContext()] || 'Applicazione'
  }, [getPageContext])

  // Ref per evitare caricamenti duplicati e lazy loading
  const initializedCentroRef = useRef(null)
  const chatInitializedRef = useRef(false)

  // Avatar Beautyx globale: caricato una sola volta al mount
  useEffect(() => {
    loadAvatar()
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  // Cambio centro: re-inizializza chat (non avatar, che è globale)
  useEffect(() => {
    if (centroId && centroId !== initializedCentroRef.current) {
      initializedCentroRef.current = centroId
      chatInitializedRef.current = false
    }
  }, [centroId])

  // Carica avatar Beautyx globale (stesso per tutti, nessun centroId necessario)
  const loadAvatar = async () => {
    try {
      const res = await fetch('/api/admin/beautyx-avatar')
      const data = await res.json()
      if (data.avatar_url) {
        setAvatarUrl(data.avatar_url)
      }
    } catch (error) {
      console.error('Errore caricamento avatar:', error)
    }
  }

  // Aggiorna avatar direttamente (es. subito dopo upload) senza re-fetch
  const updateAvatarUrl = (url) => {
    setAvatarUrl(url || '/beautyx-avatar.svg')
  }

  // Carica consumo token AI + ore HPA dall'abbonamento
  const loadTokenUsage = async () => {
    if (!userId) return
    try {
      const res = await fetch('/api/subscriptions/balance')
      if (!res.ok) return
      const data = await res.json()
      if (data.subscription && data.plan) {
        setTokenUsage({
          token_ai_usati:   data.subscription.token_ai_usati || 0,
          token_ai_mensili: data.plan.token_ai_mensili || 0,
          token_percentage: data.usage?.token_percentage || 0,
          token_remaining:  data.usage?.token_remaining,
          piano:            data.plan.codice || 'free',
          hpa_usate:        data.subscription.ore_hpa_usate || 0,
          hpa_mensili:      data.plan.ore_hpa_mensili || 0,
          hpa_percentage:   data.usage?.hpa_percentage || 0,
        })
      }
    } catch (e) {
      console.error('[BeautyxContext] loadTokenUsage:', e.message)
    }
  }

  // Verifica se una data è oggi
  const isToday = (dateString) => {
    const date = new Date(dateString)
    const today = new Date()
    return date.toDateString() === today.toDateString()
  }

  // Carica conversazione attiva o ne crea una nuova
  // Logica: se la conversazione attiva è di oggi, la carica; altrimenti ne crea una nuova
  const loadOrCreateConversation = async () => {
    try {
      const res = await fetch(`/api/beautyx/conversations?centro_id=${centroId}&attiva=true`)
      const data = await res.json()

      if (data.conversations && data.conversations.length > 0) {
        const conv = data.conversations[0]

        // Verifica se la conversazione è di oggi
        const convDate = conv.data_ultimo_messaggio || conv.created_at
        if (isToday(convDate)) {
          // Conversazione di oggi: carica i messaggi esistenti
          setConversationId(conv.id)
          loadMessages(conv.id)
        } else {
          // Conversazione di un altro giorno: marca come non attiva e crea nuova
          await fetch('/api/beautyx/conversations', {
            method: 'PATCH',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ id: conv.id, attiva: false })
          })
          await createNewConversation()
        }
      } else {
        // Nessuna conversazione attiva: crea nuova
        await createNewConversation()
      }
    } catch (error) {
      console.error('Errore caricamento conversazione:', error)
    }
  }

  // Crea una nuova conversazione pulita
  const createNewConversation = async () => {
    const createRes = await fetch('/api/beautyx/conversations', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        centro_id: centroId,
        titolo: `Conversazione ${new Date().toLocaleDateString('it-IT')}`
      })
    })
    const createData = await createRes.json()
    if (createData.conversation) {
      setConversationId(createData.conversation.id)
      // Messaggio di benvenuto
      setMessages([{
        sender: 'beautyx',
        contenuto: `Ciao! Sono Beautyx, la tua consulente strategica AI. Come posso aiutarti oggi?`,
        timestamp: new Date().toISOString(),
        page_context: getPageContext()
      }])
    }
  }

  // Carica messaggi di una conversazione
  const loadMessages = async (convId) => {
    try {
      const res = await fetch(`/api/beautyx/messages?conversation_id=${convId}`)
      const data = await res.json()
      if (data.messages) {
        setMessages(data.messages)
      }
    } catch (error) {
      console.error('Errore caricamento messaggi:', error)
    }
  }

  // Carica insights attivi
  const loadInsights = async () => {
    try {
      const res = await fetch(`/api/beautyx/insights?centro_id=${centroId}&stato=attivo`)
      const data = await res.json()
      if (data.insights) {
        setInsights(data.insights)
      }
    } catch (error) {
      console.error('Errore caricamento insights:', error)
    }
  }

  // Invia messaggio a Beautyx
  const sendMessage = async (userMessage, contextData = {}) => {
    initChatIfNeeded()
    if (!userMessage.trim() || !conversationId) return

    const pageContext = getPageContext()

    // Aggiungi messaggio utente
    const userMsg = {
      sender: 'user',
      contenuto: userMessage,
      timestamp: new Date().toISOString(),
      page_context: pageContext
    }
    setMessages(prev => [...prev, userMsg])
    setIsLoading(true)

    try {
      // Salva messaggio utente
      await fetch('/api/beautyx/messages', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          conversation_id: conversationId,
          sender: 'user',
          contenuto: userMessage,
          page_context: pageContext,
          metadata: contextData
        })
      })

      // Prepara contesto completo per Beautyx
      const fullContext = {
        centro_id: centroId,
        user_id: userId,
        conversation_id: conversationId,
        pagina_corrente: getPageDisplayName(),
        storico_messaggi: messages.slice(-10), // Ultimi 10 messaggi per context
        insights_attivi: insights,
        dati_contesto: contextData, // KPI, filtri, dati visibili sulla pagina
        timestamp: new Date().toISOString()
      }

      // Ottieni risposta da Beautyx
      const chatRes = await fetch('/api/beautyx/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          message: userMessage,
          context: fullContext
        })
      })

      const chatData = await chatRes.json()

      // Aggiorna contatore token in tempo reale
      if (chatData.token_usage) {
        setTokenUsage(prev => prev ? {
          ...prev,
          token_ai_usati:   chatData.token_usage.token_ai_usati,
          token_percentage: chatData.token_usage.token_ai_mensili > 0
            ? Math.round((chatData.token_usage.token_ai_usati / chatData.token_usage.token_ai_mensili) * 100)
            : 0,
          limit_reached: chatData.token_usage.limit_reached || false
        } : null)
      }

      if (chatData.response) {
        const beautyxMsg = {
          sender: 'beautyx',
          contenuto: chatData.response,
          timestamp: new Date().toISOString(),
          page_context: pageContext
        }
        setMessages(prev => [...prev, beautyxMsg])

        // Salva risposta Beautyx
        await fetch('/api/beautyx/messages', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            conversation_id: conversationId,
            sender: 'beautyx',
            contenuto: chatData.response,
            page_context: pageContext,
            metadata: chatData.metadata || {}
          })
        })

        // Se Beautyx ha identificato nuovi insights, aggiorna
        if (chatData.insights && chatData.insights.length > 0) {
          loadInsights()
        }

        // Se BeautyX ha scritto dati, notifica i widget di aggiornarsi
        if (chatData.requires_refresh && chatData.requires_refresh.includes('registro')) {
          window.dispatchEvent(new CustomEvent('registro:updated'))
        }

        // Restituisci chatData per il monitor
        return chatData
      }
    } catch (error) {
      console.error('Errore invio messaggio:', error)
      setMessages(prev => [...prev, {
        sender: 'beautyx',
        contenuto: 'Mi dispiace, ho avuto un problema di connessione. Riprova.',
        timestamp: new Date().toISOString(),
        page_context: pageContext
      }])
      return null
    } finally {
      setIsLoading(false)
    }
  }

  // Carica tutte le conversazioni per lo storico
  const loadConversations = async () => {
    try {
      const res = await fetch(`/api/beautyx/conversations?centro_id=${centroId}`)
      const data = await res.json()
      if (data.conversations) {
        setConversations(data.conversations)
      }
    } catch (error) {
      console.error('Errore caricamento conversazioni:', error)
    }
  }

  // Pulisci chat visibile (crea nuova conversazione, mantiene storico)
  const clearChat = async () => {
    try {
      // Chiudi la conversazione corrente (non la elimina, solo la marca come non attiva)
      if (conversationId) {
        await fetch('/api/beautyx/conversations', {
          method: 'PATCH',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ id: conversationId, attiva: false })
        })
      }

      // Crea nuova conversazione
      const createRes = await fetch('/api/beautyx/conversations', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          centro_id: centroId,
          titolo: `Conversazione ${new Date().toLocaleDateString('it-IT')}`
        })
      })
      const createData = await createRes.json()
      if (createData.conversation) {
        setConversationId(createData.conversation.id)
        setMessages([{
          sender: 'beautyx',
          contenuto: `Nuova conversazione iniziata. Come posso aiutarti?`,
          timestamp: new Date().toISOString(),
          page_context: getPageContext()
        }])
      }
      setShowHistory(false)
    } catch (error) {
      console.error('Errore pulizia chat:', error)
    }
  }

  // Carica una conversazione dallo storico
  const loadConversation = async (convId) => {
    setConversationId(convId)
    await loadMessages(convId)
    setShowHistory(false)
  }

  // Toggle storico conversazioni
  const toggleHistory = () => {
    if (!showHistory) {
      loadConversations()
    }
    setShowHistory(prev => !prev)
  }

  // Elimina conversazione (soft-delete)
  // Ritorna { success: true } oppure { error: string, code: string }
  const deleteConversation = async (convId) => {
    try {
      const res = await fetch(`/api/beautyx/conversations?id=${convId}&user_id=${userId || ''}`, {
        method: 'DELETE'
      })
      const data = await res.json()

      if (!res.ok) {
        return { error: data.error, code: data.code }
      }

      // Rimuovi dalla lista locale
      setConversations(prev => prev.filter(c => c.id !== convId))

      // Se era la conversazione attiva, crea una nuova
      if (convId === conversationId) {
        await createNewConversation()
      }

      return { success: true }
    } catch (error) {
      console.error('Errore eliminazione conversazione:', error)
      return { error: 'Errore durante l\'eliminazione', code: 'UNKNOWN_ERROR' }
    }
  }

  // Pin/Unpin conversazione (solo HPA)
  const togglePinConversation = async (convId, pin = true, reason = null) => {
    if (!isHpa) {
      return { error: 'Solo i professionisti possono pinnare le conversazioni', code: 'NOT_HPA' }
    }

    try {
      const res = await fetch('/api/beautyx/conversations', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          id: convId,
          pinned_by_hpa: pin,
          pinned_by: userId,
          pinned_reason: reason,
          is_hpa: true
        })
      })
      const data = await res.json()

      if (!res.ok) {
        return { error: data.error }
      }

      // Aggiorna nella lista locale
      setConversations(prev => prev.map(c =>
        c.id === convId
          ? { ...c, pinned_by_hpa: pin, pinned_at: pin ? new Date().toISOString() : null }
          : c
      ))

      return { success: true, conversation: data.conversation }
    } catch (error) {
      console.error('Errore pin conversazione:', error)
      return { error: 'Errore durante l\'operazione', code: 'UNKNOWN_ERROR' }
    }
  }

  // Lazy init chat: carica conversazione, insights e token usage al primo apertura
  const initChatIfNeeded = useCallback(() => {
    if (!chatInitializedRef.current && centroId) {
      chatInitializedRef.current = true
      loadOrCreateConversation()
      loadInsights()
      loadTokenUsage()
    }
  }, [centroId]) // eslint-disable-line react-hooks/exhaustive-deps

  // === HPA CHAT FUNCTIONS ===

  // Controlla se l'utente ha un HPA assegnato (solo per non-HPA)
  const checkHpaAssignment = useCallback(async () => {
    if (isHpa || !centroId || hpaInitializedRef.current === centroId) return
    hpaInitializedRef.current = centroId
    try {
      const res = await fetch(`/api/hpa/messages?centro_id=${centroId}&limit=1`)
      if (res.ok) {
        setHpaHasAssignment(true)
        loadHpaUnread()
        // Carica nome e avatar dell'HPA assegnato
        fetch(`/api/hpa/mio-hpa?centro_id=${centroId}`)
          .then(r => r.ok ? r.json() : null)
          .then(data => {
            if (data?.hpa) {
              const { nome, cognome, avatar_url } = data.hpa
              setHpaName(nome && cognome ? `${nome} ${cognome}` : nome || cognome || 'HPA')
              setHpaAvatarUrl(avatar_url || null)
            }
          })
          .catch(() => {})
      }
    } catch {
      // HPA non assegnato o errore - nessun toggle visibile
    }
  }, [centroId, isHpa])

  // Carica conteggio messaggi HPA non letti
  const loadHpaUnread = useCallback(async () => {
    if (!centroId) return
    try {
      const res = await fetch(`/api/hpa/messages?centro_id=${centroId}&limit=100`)
      if (res.ok) {
        const data = await res.json()
        const msgs = data.messages || []
        // Per client: conta messaggi HPA non letti. Per HPA: conta messaggi client non letti
        const senderToCount = isHpa ? 'client' : 'hpa'
        const unread = msgs.filter(m => m.sender_type === senderToCount && !m.letto).length
        setHpaUnread(unread)
      }
    } catch {}
  }, [centroId, isHpa])

  // Inizializza verifica HPA al cambio centro (solo per utenti non-HPA)
  useEffect(() => {
    if (!isHpa && centroId) {
      checkHpaAssignment()
    }
  }, [centroId, isHpa, checkHpaAssignment])

  // Carica messaggi HPA
  const loadHpaMessages = useCallback(async () => {
    if (!centroId) return
    setHpaLoading(true)
    try {
      const res = await fetch(`/api/hpa/messages?centro_id=${centroId}&limit=100`)
      if (res.ok) {
        const data = await res.json()
        // I messaggi arrivano DESC, invertiamo per ASC
        const msgs = (data.messages || []).reverse()
        setHpaMessages(msgs)
        setHpaUnread(0)
        // Segna come letti
        fetch('/api/hpa/messages/mark-read', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ centro_id: centroId })
        }).catch(() => {})
      }
    } catch (error) {
      console.error('Errore caricamento messaggi HPA:', error)
    } finally {
      setHpaLoading(false)
    }
  }, [centroId])

  // Invia messaggio HPA
  const sendHpaMessage = async (text) => {
    if (!text.trim() || !centroId) return
    setHpaLoading(true)
    try {
      const res = await fetch('/api/hpa/messages', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          centro_id: centroId,
          contenuto: text.trim()
        })
      })
      if (res.ok) {
        const data = await res.json()
        if (data.message) {
          setHpaMessages(prev => [...prev, data.message])
        }
      }
    } catch (error) {
      console.error('Errore invio messaggio HPA:', error)
    } finally {
      setHpaLoading(false)
    }
  }

  // Supabase Realtime subscription per messaggi HPA
  const subscribeRealtime = useCallback(() => {
    if (realtimeChannelRef.current || !centroId) return

    const client = getRealtimeClient()
    if (!client) return

    const channel = client
      .channel(`hpa-messages-${centroId}`)
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'hpa_client_messages',
          filter: `centro_id=eq.${centroId}`
        },
        (payload) => {
          const newMsg = payload.new
          // Non aggiungere se e' un nostro messaggio (gia' aggiunto localmente)
          const isMine = (isHpa && newMsg.sender_type === 'hpa') ||
                        (!isHpa && newMsg.sender_type === 'client')
          if (!isMine) {
            if (chatMode === 'hpa' && isOpen) {
              setHpaMessages(prev => [...prev, newMsg])
              // Segna come letto
              fetch('/api/hpa/messages/mark-read', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ centro_id: centroId })
              }).catch(() => {})
            } else {
              // Badge non letti
              setHpaUnread(prev => prev + 1)
            }
          }
        }
      )
      .subscribe()

    realtimeChannelRef.current = channel
  }, [centroId, isHpa, chatMode, isOpen])

  const unsubscribeRealtime = useCallback(() => {
    if (realtimeChannelRef.current) {
      const client = getRealtimeClient()
      if (client) {
        client.removeChannel(realtimeChannelRef.current)
      }
      realtimeChannelRef.current = null
    }
  }, [])

  // Attiva/disattiva Realtime in base a centroId
  useEffect(() => {
    if (centroId) {
      subscribeRealtime()
    }
    return () => unsubscribeRealtime()
  }, [centroId, subscribeRealtime, unsubscribeRealtime])

  // Switch chat mode
  const switchChatMode = useCallback((mode) => {
    setChatMode(mode)
    setShowHistory(false)
    if (mode === 'hpa') {
      loadHpaMessages()
    }
  }, [loadHpaMessages])

  // HPA auto-open: quando HPA cambia centro, apri chat in mode HPA
  useEffect(() => {
    if (isHpa && centroId) {
      setChatMode('hpa')
      // Carica messaggi HPA
      loadHpaMessages()
    }
  }, [isHpa, centroId, loadHpaMessages])

  // Apri/chiudi sidebar
  const toggleSidebar = () => {
    setIsOpen(prev => {
      if (!prev) initChatIfNeeded()
      return !prev
    })
  }
  const openSidebar = () => {
    initChatIfNeeded()
    setIsOpen(true)
  }
  const closeSidebar = () => setIsOpen(false)

  // Full screen mode
  const toggleFullScreen = () => setIsFullScreen(prev => !prev)
  const enterFullScreen = () => {
    initChatIfNeeded()
    setIsFullScreen(true)
    setIsOpen(true)
  }
  const exitFullScreen = () => setIsFullScreen(false)

  const value = {
    isOpen,
    isFullScreen,
    messages,
    conversationId,
    isLoading,
    insights,
    avatarUrl,
    updateAvatarUrl,
    refreshAvatar: loadAvatar,
    pageContext: getPageContext(),
    pageDisplayName: getPageDisplayName(),
    sendMessage,
    toggleSidebar,
    openSidebar,
    closeSidebar,
    loadInsights,
    // Alias per footer chat
    isExpanded: isOpen,
    toggleExpanded: toggleSidebar,
    // Full screen controls
    toggleFullScreen,
    enterFullScreen,
    exitFullScreen,
    // Gestione storico
    showHistory,
    conversations,
    clearChat,
    toggleHistory,
    loadConversation,
    // Dimensione font
    fontSize,
    increaseFontSize,
    decreaseFontSize,
    // Gestione pin/delete conversazioni
    isHpa,
    deleteConversation,
    togglePinConversation,
    // HPA Chat
    chatMode,
    switchChatMode,
    hpaMessages,
    hpaUnread,
    hpaLoading,
    sendHpaMessage,
    hpaHasAssignment,
    hpaName,
    hpaAvatarUrl,
    centroId,
    // Token AI + ore HPA
    tokenUsage,
    loadTokenUsage
  }

  return (
    <BeautyxContext.Provider value={value}>
      {children}
    </BeautyxContext.Provider>
  )
}

export function useBeautyx() {
  return useContext(BeautyxContext) ?? null
}
