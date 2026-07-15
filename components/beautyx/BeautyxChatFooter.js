'use client'

import { useState, useEffect, useRef, memo } from 'react'
import { useBeautyx } from '@/contexts/BeautyxContext'
import MonitorPanel from './MonitorPanel'
import HpaSidePanel from '@/components/hpa/HpaSidePanel'
import TokenCounter from './TokenCounter'

// Componente chat content riutilizzabile - FUORI dal componente principale per evitare re-render
const ChatContent = memo(({
  messages,
  isLoading,
  isCompact = false,
  className = '',
  style = {},
  customRef = null,
  maxMessages = null,
  formatTimestamp,
  chatContainerRef,
  messagesEndRef,
  showHistory = false,
  conversations = [],
  loadConversation = null,
  fontSize = 14,
  // Props per pin/delete
  isHpa = false,
  onDeleteConversation = null,
  onTogglePin = null,
  deletingId = null,
  pinningId = null,
  confirmDelete = null,
  setConfirmDelete = null,
  // Chat mode (ai | hpa)
  chatMode = 'ai'
}) => {
  // In footer mostra tutti i messaggi, in fullscreen limita a 20
  const displayMessages = maxMessages ? messages.slice(-maxMessages) : messages

  // Vista Storico Conversazioni
  if (showHistory) {
    return (
      <div
        ref={customRef || chatContainerRef}
        className="flex-1 overflow-y-auto px-3 py-2"
        style={{
          fontFamily: "'Courier New', monospace",
          scrollbarWidth: 'thin',
          scrollbarColor: '#0d9488 #1e293b'
        }}
      >
        <div className="text-emerald-400 text-xs uppercase tracking-wide mb-2 font-bold">
          &gt; STORICO CONVERSAZIONI
        </div>
        {conversations.length === 0 ? (
          <div className="text-slate-500 text-sm">Nessuna conversazione salvata</div>
        ) : (
          conversations.map((conv) => (
            <div
              key={conv.id}
              className={`relative p-2 mb-1 rounded transition-all ${
                conv.attiva
                  ? 'bg-teal-600/30 border border-teal-500/40'
                  : 'bg-slate-800/50 hover:bg-slate-700/50 border border-slate-600/30'
              }`}
            >
              {/* Conferma eliminazione overlay */}
              {confirmDelete === conv.id && (
                <div className="absolute inset-0 bg-slate-900/95 rounded flex items-center justify-center gap-2 z-10">
                  <span className="text-[10px] text-slate-300">Eliminare?</span>
                  <button
                    onClick={() => onDeleteConversation && onDeleteConversation(conv.id)}
                    disabled={deletingId === conv.id}
                    className="px-2 py-0.5 bg-red-600 hover:bg-red-700 text-white text-[10px] rounded disabled:opacity-50"
                  >
                    {deletingId === conv.id ? '...' : 'Sì'}
                  </button>
                  <button
                    onClick={() => setConfirmDelete && setConfirmDelete(null)}
                    className="px-2 py-0.5 bg-slate-600 hover:bg-slate-500 text-white text-[10px] rounded"
                  >
                    No
                  </button>
                </div>
              )}

              <div className="flex items-start justify-between gap-2">
                <button
                  onClick={() => loadConversation && loadConversation(conv.id)}
                  className="flex-1 text-left"
                >
                  <div className="flex items-center gap-1">
                    {conv.pinned_by_hpa && (
                      <span className="text-amber-400 text-xs" title="Protetta">🔒</span>
                    )}
                    <span className="text-sm text-white truncate">{conv.titolo || 'Conversazione'}</span>
                  </div>
                  <div className="text-[10px] text-slate-400">
                    {new Date(conv.created_at).toLocaleDateString('it-IT', {
                      day: '2-digit', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit'
                    })}
                    {conv.attiva && <span className="ml-2 text-teal-400">(attiva)</span>}
                  </div>
                </button>

                {/* Azioni */}
                <div className="flex items-center gap-1 flex-shrink-0">
                  {isHpa && (
                    <button
                      onClick={(e) => {
                        e.stopPropagation()
                        onTogglePin && onTogglePin(conv.id, conv.pinned_by_hpa)
                      }}
                      disabled={pinningId === conv.id}
                      className={`w-5 h-5 rounded flex items-center justify-center text-[10px] transition-all ${
                        conv.pinned_by_hpa
                          ? 'bg-amber-600/50 text-amber-300'
                          : 'bg-slate-600/50 text-slate-400 hover:text-amber-300'
                      }`}
                      title={conv.pinned_by_hpa ? 'Rimuovi protezione' : 'Proteggi'}
                    >
                      {pinningId === conv.id ? '·' : (conv.pinned_by_hpa ? '🔒' : '🔓')}
                    </button>
                  )}
                  <button
                    onClick={(e) => {
                      e.stopPropagation()
                      setConfirmDelete && setConfirmDelete(conv.id)
                    }}
                    disabled={conv.pinned_by_hpa && !isHpa}
                    className={`w-5 h-5 rounded flex items-center justify-center text-[10px] transition-all ${
                      conv.pinned_by_hpa && !isHpa
                        ? 'bg-slate-700/30 text-slate-600 cursor-not-allowed'
                        : 'bg-slate-600/50 text-slate-400 hover:text-red-300'
                    }`}
                    title={conv.pinned_by_hpa && !isHpa ? 'Protetta' : 'Elimina'}
                  >
                    🗑️
                  </button>
                </div>
              </div>
            </div>
          ))
        )}
      </div>
    )
  }

  return (
    <>
      {/* Messages Area - Scrollable */}
      <div
        ref={customRef || chatContainerRef}
        className="flex-1 overflow-y-auto px-3 py-2"
        style={{
          ...(isCompact && { maxHeight: '220px' }), // Compatto nel footer
          fontFamily: "'Courier New', monospace",
          scrollbarWidth: 'thin',
          scrollbarColor: chatMode === 'hpa' ? '#a855f7 #1e293b' : '#0d9488 #1e293b'
        }}
      >
        {displayMessages.length === 0 ? (
          <div className={`text-sm animate-pulse ${chatMode === 'hpa' ? 'text-purple-300' : 'text-emerald-300'}`}>
            &gt; {chatMode === 'hpa' ? 'CHAT HPA PRONTA...' : 'BEAUTYX AI READY...'}
          </div>
        ) : (
          displayMessages.map((msg, idx) => {
            // Determina se il messaggio e' dell'utente corrente
            const isSelf = chatMode === 'hpa'
              ? (msg.sender_type === (isHpa ? 'hpa' : 'client'))
              : (msg.sender === 'user')
            const otherColor = chatMode === 'hpa' ? 'text-purple-300' : 'text-emerald-300'
            const prefix = chatMode === 'hpa'
              ? (isSelf ? '>' : '> HPA:')
              : (msg.sender === 'user' ? '>' : '> AI:')

            return (
            <div key={msg.id || idx} className="mb-2">
              {/* Timestamp */}
              {formatTimestamp && (msg.timestamp || msg.created_at) && (
                <div className="text-slate-500 mb-0.5" style={{ fontSize: `${Math.max(fontSize - 5, 8)}px` }}>
                  {formatTimestamp(msg.timestamp || msg.created_at)}
                </div>
              )}
              {/* Messaggio con interlinea stretta */}
              <div
                className={`leading-tight ${isSelf ? 'text-white' : otherColor}`}
                style={{ fontSize: `${fontSize}px` }}
              >
                <span className="font-bold">
                  {prefix}
                </span>{' '}
                {/* Testo con paragrafi distanziati */}
                {(msg.contenuto || msg.text || '').split('\n\n').map((para, i) => (
                  <span key={i}>
                    {i > 0 && <><br /><br /></>}
                    {para.split('\n').map((line, j) => (
                      <span key={j}>
                        {j > 0 && <br />}
                        {line}
                      </span>
                    ))}
                  </span>
                ))}
              </div>
            </div>
          )})
        )}
        {isLoading && (
          <div className={`text-sm animate-pulse ${chatMode === 'hpa' ? 'text-purple-300' : 'text-amber-300'}`}>
            &gt; {chatMode === 'hpa' ? 'Invio...' : 'Processing...'}
          </div>
        )}
        <div ref={messagesEndRef} />
      </div>
    </>
  )
})

ChatContent.displayName = 'ChatContent'

export default function BeautyxChatFooter() {
  // Chiamata al context - può essere null se l'utente non ha ancora un centro
  const ctx = useBeautyx()

  // Tutti gli hook devono essere chiamati incondizionatamente (React rules of hooks)
  const [input, setInput] = useState('')
  const [isRecording, setIsRecording] = useState(false)
  const recognitionRef = useRef(null)
  const [monitorData, setMonitorData] = useState(null) // null = schermo vuoto
  const inputRef = useRef(null)
  const messagesEndRef = useRef(null)

  // State per gestione eliminazione/pin
  const [confirmDelete, setConfirmDelete] = useState(null)
  const [deletingId, setDeletingId] = useState(null)
  const [pinningId, setPinningId] = useState(null)

  const chatContainerRef = useRef(null)
  const fullScreenChatRef = useRef(null)

  // Destructure con defaults sicuri per gli useEffect che seguono
  const {
    messages = [],
    isLoading = false,
    sendMessage,
    avatarUrl,
    isExpanded = false,
    toggleExpanded,
    isFullScreen = false,
    toggleFullScreen,
    exitFullScreen,
    showHistory = false,
    conversations = [],
    clearChat,
    toggleHistory,
    loadConversation,
    fontSize,
    increaseFontSize,
    decreaseFontSize,
    // Gestione pin/delete
    isHpa = false,
    deleteConversation,
    togglePinConversation,
    // HPA Chat
    chatMode = 'beautyx',
    switchChatMode,
    hpaMessages = [],
    hpaUnread = 0,
    hpaLoading = false,
    sendHpaMessage,
    hpaHasAssignment = false,
    hpaName,
    hpaAvatarUrl,
    centroId,
    tokenUsage
  } = ctx || {}

  // Messaggi e loading correnti in base alla modalita'
  const currentMessages = chatMode === 'hpa' ? hpaMessages : messages
  const currentLoading = chatMode === 'hpa' ? hpaLoading : isLoading

  // Handler per eliminazione conversazione
  const handleDeleteConversation = async (convId) => {
    setDeletingId(convId)
    const result = await deleteConversation(convId)
    setDeletingId(null)
    setConfirmDelete(null)
    if (result.error) {
      alert(result.error)
    }
  }

  // Handler per pin/unpin
  const handleTogglePin = async (convId, currentlyPinned) => {
    setPinningId(convId)
    const result = await togglePinConversation(convId, !currentlyPinned)
    setPinningId(null)
    if (result.error) {
      alert(result.error)
    }
  }

  // Auto-scroll to bottom when new messages arrive OR when opening
  useEffect(() => {
    const scrollToBottom = () => {
      // Usa il ref corretto a seconda della modalità
      const targetRef = isFullScreen ? fullScreenChatRef : chatContainerRef

      if (targetRef.current) {
        targetRef.current.scrollTop = targetRef.current.scrollHeight
      }
    }

    if (isExpanded || isFullScreen) {
      // Delay to ensure DOM is fully rendered
      setTimeout(scrollToBottom, 200)
    }
  }, [messages.length, hpaMessages.length, isExpanded, isFullScreen, chatMode])

  // ESC key to exit full screen
  useEffect(() => {
    const handleEsc = (e) => {
      if (e.key === 'Escape' && isFullScreen) {
        exitFullScreen?.()
      }
    }
    window.addEventListener('keydown', handleEsc)
    return () => window.removeEventListener('keydown', handleEsc)
  }, [isFullScreen, exitFullScreen])

  // Utente senza centro: mostra il FAB Beautyx che porta alle impostazioni
  if (!ctx) {
    return (
      <div className="fixed bottom-0 left-0 right-0 z-50">
        <div
          className="absolute z-10"
          style={{ left: '12px', bottom: '5px', width: '90px', height: '90px' }}
        >
          <button
            onClick={() => window.location.href = '/impostazioni?primo-accesso=1'}
            title="Configura il tuo centro per usare Beautyx AI"
            className="relative w-full h-full rounded-full overflow-hidden transition-all duration-300 hover:scale-105 active:scale-95"
            style={{
              background: 'linear-gradient(135deg, #14b8a6 0%, #06b6d4 100%)',
              boxShadow: '0 10px 30px rgba(20, 184, 166, 0.4), 0 0 20px rgba(6, 182, 212, 0.2)'
            }}
          >
            <div className="absolute inset-0 rounded-full bg-gradient-to-br from-teal-500 to-cyan-500 animate-ping opacity-40"></div>
            <div className="relative z-10 w-full h-full flex items-center justify-center">
              <img src="/beautyx-avatar.svg" alt="Beautyx" className="w-full h-full object-cover" />
            </div>
          </button>
        </div>
      </div>
    )
  }

  const speechSupported = typeof window !== 'undefined' &&
    !!(window.SpeechRecognition || window.webkitSpeechRecognition)

  const handleVoice = () => {
    if (isRecording) {
      recognitionRef.current?.stop()
      return
    }
    const SR = window.SpeechRecognition || window.webkitSpeechRecognition
    if (!SR) return
    const rec = new SR()
    rec.lang = 'it-IT'
    rec.interimResults = false
    rec.onresult = (e) => {
      const transcript = e.results[0][0].transcript
      setInput(prev => prev ? prev + ' ' + transcript : transcript)
      setIsRecording(false)
    }
    rec.onerror = () => setIsRecording(false)
    rec.onend  = () => setIsRecording(false)
    recognitionRef.current = rec
    rec.start()
    setIsRecording(true)
  }

  const handleSend = async () => {
    if (!input.trim()) return

    if (chatMode === 'hpa') {
      // Invio messaggio HPA
      if (!hpaLoading) {
        await sendHpaMessage(input)
        setInput('')
      }
    } else {
      // Invio messaggio AI
      if (!isLoading) {
        const response = await sendMessage(input)
        setInput('')

        // Popola il monitor solo con dati strutturati dal server (MONITOR_START/END)
        // Non usare fallback euristici che producono dati sbagliati
        if (response?.monitor) {
          setMonitorData(response.monitor)
        }
      }
    }
  }

  const handleKeyPress = (e) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault()
      handleSend()
    }
  }

  // Compact heights
  const footerHeight = 320 // Altezza footer compatto — abbastanza per leggere una conversazione
  const fabSize = 90 // FAB visibile ma non troppo grande

  // Formatta timestamp per visualizzazione
  const formatTimestamp = (timestamp) => {
    if (!timestamp) return ''

    const date = new Date(timestamp)
    const now = new Date()
    const isToday = date.toDateString() === now.toDateString()

    const yesterday = new Date(now)
    yesterday.setDate(yesterday.getDate() - 1)
    const isYesterday = date.toDateString() === yesterday.toDateString()

    const timeStr = date.toLocaleTimeString('it-IT', {
      hour: '2-digit',
      minute: '2-digit'
    })

    if (isToday) {
      return `Oggi, ${timeStr}`
    } else if (isYesterday) {
      return `Ieri, ${timeStr}`
    } else {
      const dateStr = date.toLocaleDateString('it-IT', {
        day: 'numeric',
        month: 'short'
      })
      return `${dateStr}, ${timeStr}`
    }
  }

  // Colori in base al chatMode
  const modeColors = chatMode === 'hpa' ? {
    border: 'border-purple-500/30',
    prompt: 'text-purple-300',
    promptGlow: '0 0 4px rgba(168, 85, 247, 0.3)',
    input: 'text-purple-300',
    placeholder: 'placeholder-purple-600/50',
    btnGradient: 'from-purple-600 to-pink-600 hover:from-purple-500 hover:to-pink-500',
    scrollbar: '#a855f7 #1e293b'
  } : {
    border: 'border-teal-500/30',
    prompt: 'text-emerald-300',
    promptGlow: '0 0 4px rgba(16, 185, 129, 0.3)',
    input: 'text-emerald-300',
    placeholder: 'placeholder-emerald-600/50',
    btnGradient: 'from-teal-600 to-cyan-600 hover:from-teal-500 hover:to-cyan-500',
    scrollbar: '#0d9488 #1e293b'
  }

  // Toggle per switchare tra AI e HPA (solo per non-HPA con HPA assegnato)
  const showModeToggle = !isHpa && hpaHasAssignment

  // Componente Input Area - Compatto
  const renderInputArea = () => (
    <div className={`border-t ${modeColors.border} px-3 py-2 flex items-center gap-2`} style={{ pointerEvents: 'auto' }}>
      {/* Mode toggle inline */}
      {showModeToggle && (
        <div className="flex items-center gap-0.5 mr-1 flex-shrink-0">
          <button
            onClick={() => switchChatMode('ai')}
            className={`w-7 h-7 rounded-full text-xs flex items-center justify-center transition-all ${
              chatMode === 'ai'
                ? 'bg-teal-500/30 text-teal-300 ring-1 ring-teal-400/50'
                : 'bg-slate-700/50 text-slate-500 hover:text-slate-300'
            }`}
            title="BeautyX AI"
          >
            🤖
          </button>
          <button
            onClick={() => switchChatMode('hpa')}
            className={`w-7 h-7 rounded-full text-xs flex items-center justify-center transition-all relative ${
              chatMode === 'hpa'
                ? 'bg-purple-500/30 text-purple-300 ring-1 ring-purple-400/50'
                : 'bg-slate-700/50 text-slate-500 hover:text-slate-300'
            }`}
            title="Chat HPA"
          >
            👤
            {hpaUnread > 0 && chatMode !== 'hpa' && (
              <span className="absolute -top-1 -right-1 w-4 h-4 bg-red-500 rounded-full text-[8px] text-white flex items-center justify-center font-bold">
                {hpaUnread > 9 ? '9+' : hpaUnread}
              </span>
            )}
          </button>
        </div>
      )}
      <span
        className={`${modeColors.prompt} font-bold text-base`}
        style={{ textShadow: modeColors.promptGlow }}
      >
        &gt;
      </span>
      {chatMode === 'ai' && speechSupported && (
        <button
          type="button"
          onClick={handleVoice}
          disabled={currentLoading || showHistory}
          title={isRecording ? 'Stop registrazione vocale' : 'Parla con BeautyX (it-IT)'}
          className={`flex-shrink-0 w-6 h-6 rounded-full flex items-center justify-center text-xs transition-all ${
            isRecording
              ? 'bg-red-600 animate-pulse text-white'
              : 'bg-slate-700 hover:bg-teal-700 text-slate-300 hover:text-white'
          }`}
        >
          🎤
        </button>
      )}
      <input
        ref={inputRef}
        type="text"
        value={input}
        onChange={(e) => setInput(e.target.value)}
        onKeyPress={handleKeyPress}
        placeholder={chatMode === 'hpa' ? 'Messaggio al tuo HPA...' : isRecording ? 'In ascolto...' : 'Scrivi...'}
        disabled={currentLoading || showHistory}
        className={`flex-1 bg-transparent ${modeColors.input} text-base outline-none ${modeColors.placeholder} font-mono min-w-0`}
        style={{
          fontFamily: "'Courier New', monospace",
          pointerEvents: 'auto'
        }}
      />
      {/* Controlli font - Solo nel footer compatto */}
      {!isFullScreen && isExpanded && (
        <div className="flex items-center gap-0.5">
          <button
            onClick={decreaseFontSize}
            className="w-6 h-6 bg-slate-700 hover:bg-slate-600 text-slate-200 text-xs font-bold rounded transition-all flex items-center justify-center"
            title="A-"
          >
            -
          </button>
          <button
            onClick={increaseFontSize}
            className="w-6 h-6 bg-slate-700 hover:bg-slate-600 text-slate-200 text-xs font-bold rounded transition-all flex items-center justify-center"
            title="A+"
          >
            +
          </button>
        </div>
      )}
      {/* Bottone Storico - Solo nel footer compatto, solo mode AI */}
      {!isFullScreen && isExpanded && chatMode === 'ai' && (
        <button
          onClick={toggleHistory}
          className={`px-2 py-1.5 text-sm font-bold rounded transition-all ${
            showHistory
              ? 'bg-teal-600 text-white'
              : 'bg-slate-700 hover:bg-slate-600 text-slate-200'
          }`}
          title="Storico"
        >
          📋
        </button>
      )}
      {/* Bottone Nuova Chat - Solo nel footer compatto, solo mode AI */}
      {!isFullScreen && isExpanded && chatMode === 'ai' && (
        <button
          onClick={clearChat}
          className="px-2 py-1.5 bg-slate-700 hover:bg-slate-600 text-slate-200 text-sm font-bold rounded transition-all"
          title="Nuova chat"
        >
          ✨
        </button>
      )}
      {isFullScreen && (
        <button
          onClick={exitFullScreen}
          className="px-2.5 py-1.5 bg-slate-700 hover:bg-slate-600 text-slate-200 text-sm font-bold rounded transition-all"
          title="Minimize (ESC)"
        >
          ⊟
        </button>
      )}
      {!isFullScreen && isExpanded && (
        <button
          onClick={toggleFullScreen}
          className="px-2.5 py-1.5 bg-slate-700 hover:bg-slate-600 text-slate-200 text-sm font-bold rounded transition-all"
          title="Expand"
        >
          ⛶
        </button>
      )}
      <button
        onClick={handleSend}
        disabled={!input.trim() || currentLoading || showHistory}
        className={`px-3 py-1.5 bg-gradient-to-r ${modeColors.btnGradient} text-white text-sm font-bold rounded transition-all disabled:opacity-50 disabled:cursor-not-allowed shadow`}
      >
        {currentLoading ? '...' : 'INVIA'}
      </button>
    </div>
  )

  return (
    <>
      {/* Full Screen Modal */}
      {isFullScreen && (
        <div
          className="fixed inset-0 z-[100] flex items-start justify-center gap-4 px-4 py-[5vh] overflow-auto"
          onClick={exitFullScreen}
        >
          {/* Overlay - click passa attraverso al div genitore */}
          <div className="absolute inset-0 bg-black/80 backdrop-blur-sm" />

          {/* Avatar - Figura Intera a Sinistra - Nascosto su schermi piccoli */}
          <div
            className="relative flex-shrink-0 rounded-3xl overflow-hidden shadow-2xl hidden lg:block"
            style={{
              width: '100px',
              height: '200px',
              background: chatMode === 'hpa'
                ? 'linear-gradient(135deg, #a855f7 0%, #ec4899 100%)'
                : 'linear-gradient(135deg, #14b8a6 0%, #06b6d4 100%)',
              boxShadow: chatMode === 'hpa'
                ? '0 30px 90px rgba(168, 85, 247, 0.6), 0 0 80px rgba(236, 72, 153, 0.4)'
                : '0 30px 90px rgba(20, 184, 166, 0.6), 0 0 80px rgba(6, 182, 212, 0.4)'
            }}
            onClick={(e) => e.stopPropagation()}
          >
            <div className={`absolute inset-0 animate-pulse ${
              chatMode === 'hpa'
                ? 'bg-gradient-to-br from-purple-400/20 to-pink-400/20'
                : 'bg-gradient-to-br from-cyan-400/20 to-teal-400/20'
            }`}></div>

            <div className="relative z-10 w-full h-full flex items-center justify-center">
              {chatMode === 'hpa' ? (
                hpaAvatarUrl ? (
                  <img src={hpaAvatarUrl} alt={hpaName || 'HPA'} className="w-full h-full object-cover" />
                ) : (
                  <div className="flex flex-col items-center justify-center text-center px-4">
                    <span className="text-6xl mb-2">👤</span>
                    <div className="text-white font-bold text-base" style={{
                      textShadow: '0 0 10px rgba(255, 255, 255, 0.5)'
                    }}>
                      {hpaName || 'HPA'}
                    </div>
                    <div className="text-purple-200 text-xs mt-1">
                      Consulente
                    </div>
                  </div>
                )
              ) : avatarUrl ? (
                <img
                  src={avatarUrl}
                  alt="Beautyx"
                  className="w-full h-full object-cover"
                />
              ) : (
                <div className="flex flex-col items-center justify-center text-center px-4">
                  <span className="text-6xl mb-2">🤖</span>
                  <div className="text-white font-bold text-base" style={{
                    textShadow: '0 0 10px rgba(255, 255, 255, 0.5)'
                  }}>
                    BEAUTYX
                  </div>
                  <div className="text-cyan-200 text-xs mt-1">
                    AI Consultant
                  </div>
                </div>
              )}
            </div>

            <div className={`absolute inset-0 rounded-3xl border-2 ${
              chatMode === 'hpa' ? 'border-purple-400/50' : 'border-teal-400/50'
            }`}></div>
          </div>

          {/* Chat Box Espanso - Centro - Responsive */}
          <div
            className="relative h-[90vh] max-h-[800px] rounded-2xl shadow-2xl flex flex-col w-full max-w-[700px] min-w-[300px]"
            style={{
              background: chatMode === 'hpa'
                ? 'linear-gradient(135deg, rgba(20, 15, 40, 0.98), rgba(15, 23, 42, 0.95))'
                : 'linear-gradient(135deg, rgba(15, 23, 42, 0.98), rgba(15, 23, 42, 0.95))',
              border: chatMode === 'hpa'
                ? '2px solid rgba(168, 85, 247, 0.4)'
                : '2px solid rgba(20, 184, 166, 0.4)',
              boxShadow: chatMode === 'hpa'
                ? '0 0 60px rgba(168, 85, 247, 0.3)'
                : '0 0 60px rgba(20, 184, 166, 0.3)',
              overflow: 'hidden'
            }}
            onClick={(e) => e.stopPropagation()}
          >
            {/* Header */}
            <div className={`px-6 py-4 border-b ${chatMode === 'hpa' ? 'border-purple-500/30' : 'border-teal-500/30'} flex items-center justify-between flex-shrink-0`}>
              <div>
                <h3 className={`text-xl font-bold ${chatMode === 'hpa' ? 'text-purple-300' : 'text-emerald-300'}`} style={{
                  textShadow: chatMode === 'hpa'
                    ? '0 0 6px rgba(168, 85, 247, 0.4)'
                    : '0 0 6px rgba(16, 185, 129, 0.4)'
                }}>
                  {chatMode === 'hpa'
                    ? (hpaName ? `Chat con ${hpaName}` : 'Chat HPA')
                    : (showHistory ? 'Storico Conversazioni' : 'Conversazione Estesa')}
                </h3>
                <p className={`text-xs ${chatMode === 'hpa' ? 'text-purple-400/60' : 'text-emerald-400/60'}`}>Premi ESC o clicca fuori per tornare alla vista compatta</p>
              </div>
              <div className="flex items-center gap-2">
                {/* Controllo dimensione font */}
                <div className="flex items-center gap-1 bg-slate-800 rounded-lg px-2 py-1">
                  <button
                    onClick={decreaseFontSize}
                    className="w-7 h-7 rounded bg-slate-700 hover:bg-slate-600 text-slate-200 text-sm font-bold transition-all flex items-center justify-center"
                    title="Riduci carattere"
                  >
                    A-
                  </button>
                  <span className="text-slate-400 text-xs w-8 text-center">{fontSize}</span>
                  <button
                    onClick={increaseFontSize}
                    className="w-7 h-7 rounded bg-slate-700 hover:bg-slate-600 text-slate-200 text-sm font-bold transition-all flex items-center justify-center"
                    title="Ingrandisci carattere"
                  >
                    A+
                  </button>
                </div>
                {/* Mode toggle nel fullscreen */}
                {showModeToggle && (
                  <div className="flex items-center gap-1 bg-slate-800 rounded-lg px-2 py-1">
                    <button
                      onClick={() => switchChatMode('ai')}
                      className={`px-2 py-1 rounded text-xs font-bold transition-all ${
                        chatMode === 'ai'
                          ? 'bg-teal-500/30 text-teal-300'
                          : 'text-slate-500 hover:text-slate-300'
                      }`}
                    >
                      🤖 AI
                    </button>
                    <button
                      onClick={() => switchChatMode('hpa')}
                      className={`px-2 py-1 rounded text-xs font-bold transition-all relative ${
                        chatMode === 'hpa'
                          ? 'bg-purple-500/30 text-purple-300'
                          : 'text-slate-500 hover:text-slate-300'
                      }`}
                    >
                      👤 HPA
                      {hpaUnread > 0 && chatMode !== 'hpa' && (
                        <span className="absolute -top-1 -right-1 w-3.5 h-3.5 bg-red-500 rounded-full text-[7px] text-white flex items-center justify-center">
                          {hpaUnread}
                        </span>
                      )}
                    </button>
                  </div>
                )}
                {/* Bottone Storico - solo in mode AI */}
                {chatMode === 'ai' && (
                  <button
                    onClick={toggleHistory}
                    className={`px-3 py-2 rounded-lg text-xs font-bold transition-all ${
                      showHistory
                        ? 'bg-teal-600 text-white'
                        : 'bg-slate-700 text-slate-300 hover:bg-slate-600'
                    }`}
                    title="Storico conversazioni"
                  >
                    📋 Storico
                  </button>
                )}
                {/* Bottone Nuova Chat - solo in mode AI */}
                {chatMode === 'ai' && (
                  <button
                    onClick={clearChat}
                    className="px-3 py-2 rounded-lg text-xs font-bold transition-all bg-slate-700 text-slate-300 hover:bg-slate-600"
                    title="Nuova conversazione"
                  >
                    ✨ Nuova
                  </button>
                )}
                {/* Token counter - fullscreen header */}
                {tokenUsage && (
                  <div className="flex-shrink-0">
                    <TokenCounter tokenUsage={tokenUsage} compact={true} />
                  </div>
                )}
                <button
                  onClick={exitFullScreen}
                  className="w-10 h-10 rounded-full bg-slate-700 hover:bg-slate-600 text-white flex items-center justify-center transition-all"
                  title="Close (ESC)"
                >
                  ✕
                </button>
              </div>
            </div>

            {/* Chat Content e Input - Occupano tutto lo spazio rimanente */}
            <div className="flex-1 flex flex-col min-h-0">
              <ChatContent
                messages={currentMessages}
                isLoading={currentLoading}
                isCompact={false}
                customRef={fullScreenChatRef}
                maxMessages={chatMode === 'hpa' ? 50 : 20}
                formatTimestamp={formatTimestamp}
                chatContainerRef={chatContainerRef}
                messagesEndRef={messagesEndRef}
                showHistory={chatMode === 'ai' ? showHistory : false}
                conversations={conversations}
                loadConversation={loadConversation}
                fontSize={fontSize}
                isHpa={isHpa}
                onDeleteConversation={handleDeleteConversation}
                onTogglePin={handleTogglePin}
                deletingId={deletingId}
                pinningId={pinningId}
                confirmDelete={confirmDelete}
                setConfirmDelete={setConfirmDelete}
                chatMode={chatMode}
              />
              <div className="flex-shrink-0">
                {renderInputArea()}
              </div>
            </div>
          </div>

          {/* Pannello Destro - Monitor (AI) o HpaSidePanel (HPA) */}
          <div
            className="relative h-[90vh] max-h-[800px] rounded-2xl overflow-hidden shadow-2xl hidden xl:block w-full max-w-[500px] min-w-[300px]"
            onClick={(e) => e.stopPropagation()}
          >
            {chatMode === 'hpa' && centroId ? (
              <HpaSidePanel centroId={centroId} />
            ) : (
              <MonitorPanel monitorData={monitorData} isVisible={true} />
            )}
          </div>
        </div>
      )}

      {/* Footer Normale */}
    <div className="fixed bottom-0 left-0 right-0 z-50">
      {/* FAB Beautyx - Ingrandito */}
      <div
        className="absolute z-10"
        style={{
          left: '12px',
          bottom: '5px',
          width: `${fabSize}px`,
          height: `${fabSize}px`
        }}
      >
        <button
          onClick={toggleExpanded}
          className="relative w-full h-full rounded-full overflow-hidden transition-all duration-300 hover:scale-105 active:scale-95"
          style={{
            background: chatMode === 'hpa'
              ? 'linear-gradient(135deg, #a855f7 0%, #ec4899 100%)'
              : 'linear-gradient(135deg, #14b8a6 0%, #06b6d4 100%)',
            boxShadow: chatMode === 'hpa'
              ? '0 10px 30px rgba(168, 85, 247, 0.4), 0 0 20px rgba(236, 72, 153, 0.2)'
              : '0 10px 30px rgba(20, 184, 166, 0.4), 0 0 20px rgba(6, 182, 212, 0.2)'
          }}
        >
          {/* Avatar o Icona */}
          <div className="relative z-10 w-full h-full flex items-center justify-center">
            {chatMode === 'hpa' ? (
              hpaAvatarUrl ? (
                <img src={hpaAvatarUrl} alt={hpaName || 'HPA'} className="w-full h-full object-cover" />
              ) : (
                <span className="text-5xl">👤</span>
              )
            ) : avatarUrl ? (
              <img
                src={avatarUrl}
                alt="Beautyx"
                className="w-full h-full object-cover"
              />
            ) : (
              <span className="text-5xl">🤖</span>
            )}
          </div>

          {/* Badge: messaggi non letti HPA (quando in mode AI) */}
          {hpaUnread > 0 && chatMode === 'ai' && !isExpanded && (
            <div className="absolute top-1 right-1 w-5 h-5 bg-purple-500 rounded-full flex items-center justify-center text-white text-[9px] font-bold animate-bounce shadow">
              {hpaUnread > 9 ? '9+' : hpaUnread}
            </div>
          )}
          {/* Badge: messaggi AI (comportamento originale) */}
          {messages.length > 0 && chatMode !== 'hpa' && !isExpanded && hpaUnread === 0 && (
            <div className="absolute top-1 right-1 w-4 h-4 bg-red-500 rounded-full flex items-center justify-center text-white text-[8px] font-bold animate-bounce shadow">
              !
            </div>
          )}
        </button>
      </div>

      {/* Chat Console Area */}
      <div
        className={`transition-all duration-500 ease-in-out ${
          isExpanded ? `h-[${footerHeight}px]` : 'h-0 opacity-0'
        }`}
        style={{
          height: isExpanded ? `${footerHeight}px` : '0px',
          background: chatMode === 'hpa'
            ? 'linear-gradient(to right, rgba(20, 15, 40, 0.98), rgba(15, 23, 42, 0.95))'
            : 'linear-gradient(to right, rgba(15, 23, 42, 0.98), rgba(15, 23, 42, 0.95))',
          backdropFilter: 'blur(10px)',
          borderTop: chatMode === 'hpa'
            ? '1px solid rgba(168, 85, 247, 0.4)'
            : '1px solid rgba(20, 184, 166, 0.4)',
          paddingLeft: `${fabSize + 24}px`
        }}
      >
        {isExpanded && (
          <div className="h-full flex flex-col min-h-0">
            <ChatContent
              messages={currentMessages}
              isLoading={currentLoading}
              isCompact={true}
              formatTimestamp={formatTimestamp}
              chatContainerRef={chatContainerRef}
              messagesEndRef={messagesEndRef}
              showHistory={chatMode === 'ai' ? showHistory : false}
              conversations={conversations}
              loadConversation={loadConversation}
              fontSize={fontSize}
              isHpa={isHpa}
              onDeleteConversation={handleDeleteConversation}
              onTogglePin={handleTogglePin}
              deletingId={deletingId}
              pinningId={pinningId}
              confirmDelete={confirmDelete}
              setConfirmDelete={setConfirmDelete}
              chatMode={chatMode}
            />
            {/* Token counter - compact footer */}
            {tokenUsage && chatMode === 'ai' && (
              <div className="flex-shrink-0 px-3 py-0.5 flex items-center">
                <TokenCounter tokenUsage={tokenUsage} compact={true} />
              </div>
            )}
            <div className="flex-shrink-0">
              {renderInputArea()}
            </div>
          </div>
        )}
      </div>
    </div>
    </>
  )
}
