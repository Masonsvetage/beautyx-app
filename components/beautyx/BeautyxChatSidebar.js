'use client'

import { useState, useEffect, useRef } from 'react'
import { useBeautyx } from '@/contexts/BeautyxContext'
import { useAuth } from '@/contexts/AuthContext'
import TokenCounter from './TokenCounter'

export default function BeautyxChatSidebar() {
  const ctx = useBeautyx()

  // Hooks chiamati incondizionatamente (React rules of hooks)
  const [deletingId, setDeletingId] = useState(null)
  const [confirmDelete, setConfirmDelete] = useState(null)
  const [pinningId, setPinningId] = useState(null)
  const { currentCentro, profile } = useAuth()
  const [input, setInput] = useState('')
  const [avatarUrl, setAvatarUrl] = useState('/beautyx-avatar.svg')
  const messagesEndRef = useRef(null)
  const inputRef = useRef(null)

  const {
    isOpen = false,
    closeSidebar,
    messages = [],
    isLoading = false,
    sendMessage,
    pageDisplayName,
    insights = [],
    showHistory = false,
    conversations = [],
    clearChat,
    toggleHistory,
    loadConversation,
    isHpa = false,
    deleteConversation,
    togglePinConversation,
    tokenUsage
  } = ctx || {}

  const centroId = currentCentro?.centro_id || profile?.centro_id

  // Carica avatar
  useEffect(() => {
    if (centroId) loadAvatar()
  }, [centroId])

  async function loadAvatar() {
    try {
      const res = await fetch(`/api/admin/beautyx-avatar?centro_id=${centroId}`)
      const data = await res.json()
      if (data.avatar_url) {
        setAvatarUrl(data.avatar_url)
      }
    } catch (error) {
      console.error('Errore caricamento avatar:', error)
    }
  }

  // Auto-scroll ai nuovi messaggi
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages])

  // Focus input quando si apre
  useEffect(() => {
    if (isOpen) {
      setTimeout(() => inputRef.current?.focus(), 300)
    }
  }, [isOpen])

  // Utente senza centro: sidebar non disponibile
  if (!ctx) return null

  const handleSend = () => {
    if (input.trim() && !isLoading) {
      sendMessage(input)
      setInput('')
    }
  }

  const handleKeyPress = (e) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault()
      handleSend()
    }
  }

  // Handler per eliminazione conversazione
  const handleDeleteConversation = async (convId) => {
    setDeletingId(convId)
    const result = await deleteConversation(convId)
    setDeletingId(null)
    setConfirmDelete(null)

    if (result.error) {
      // Mostra errore - potrebbe essere pinnata
      alert(result.error)
    }
  }

  // Handler per pin/unpin conversazione (solo HPA)
  const handleTogglePin = async (convId, currentlyPinned) => {
    setPinningId(convId)
    const result = await togglePinConversation(convId, !currentlyPinned)
    setPinningId(null)

    if (result.error) {
      alert(result.error)
    }
  }

  // Formatta timestamp per visualizzazione
  const formatTimestamp = (timestamp) => {
    if (!timestamp) return ''
    const date = new Date(timestamp)
    const today = new Date()
    const isToday = date.toDateString() === today.toDateString()
    const time = date.toLocaleTimeString('it-IT', { hour: '2-digit', minute: '2-digit' })
    if (isToday) {
      return `Oggi ${time}`
    }
    return date.toLocaleDateString('it-IT', { day: '2-digit', month: 'short' }) + ` ${time}`
  }

  return (
    <>
      {/* Overlay oscuro - nascosto su mobile dove sidebar è fullscreen */}
      <div
        className={`fixed inset-0 bg-black transition-opacity duration-300 z-40 pointer-events-none hidden sm:block ${
          isOpen ? 'opacity-30' : 'opacity-0'
        }`}
        style={{
          // L'overlay copre solo fino a dove inizia la sidebar
          right: '380px'
        }}
      />

      {/* Sidebar Chat - Responsive: 100% su mobile, 380px su desktop */}
      <div
        className={`fixed top-0 right-0 h-full w-full sm:w-[380px] bg-gradient-to-b from-slate-900 via-slate-800 to-slate-900 transform transition-transform duration-300 ease-in-out z-50 flex flex-col ${
          isOpen ? 'translate-x-0' : 'translate-x-full'
        }`}
        style={{
          boxShadow: isOpen ? '-10px 0 40px rgba(0, 0, 0, 0.5)' : 'none',
          maxWidth: '100vw'
        }}
      >
        {/* Header */}
        <div className="relative bg-gradient-to-r from-slate-800/90 to-slate-700/90 backdrop-blur-xl border-b border-slate-600/40 p-4" style={{
          boxShadow: '0 10px 25px -5px rgba(0, 0, 0, 0.4)'
        }}>
          <div className="flex items-center justify-between mb-3">
            <div className="flex items-center gap-3">
              {/* Avatar Beautyx */}
              <div className="relative w-12 h-12 rounded-full bg-gradient-to-br from-teal-600 to-cyan-600 p-0.5 shadow-lg">
                <div className="w-full h-full rounded-full bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900 flex items-center justify-center overflow-hidden border-2 border-teal-400/30">
                  <img
                    src={avatarUrl}
                    alt="Beautyx AI"
                    className="w-full h-full object-cover"
                  />
                </div>
                {/* Online indicator */}
                <div className="absolute bottom-0 right-0 w-3.5 h-3.5 bg-emerald-500 rounded-full border-2 border-slate-900">
                  <div className="w-full h-full rounded-full bg-emerald-400 animate-pulse"></div>
                </div>
              </div>

              <div>
                <h3 className="text-white font-bold text-lg">Beautyx AI</h3>
                <p className="text-teal-400 text-xs font-semibold">Consulente Strategico</p>
              </div>
            </div>

            {/* Bottoni azioni */}
            <div className="flex items-center gap-1">
              {/* Bottone Storico */}
              <button
                onClick={toggleHistory}
                className={`w-9 h-9 rounded-lg transition-all flex items-center justify-center ${
                  showHistory
                    ? 'bg-teal-600/50 text-teal-300'
                    : 'bg-slate-700/50 hover:bg-slate-600/50 text-slate-300 hover:text-white'
                }`}
                title="Storico conversazioni"
              >
                <span className="text-lg">📋</span>
              </button>
              {/* Bottone Nuova Chat */}
              <button
                onClick={clearChat}
                className="w-9 h-9 rounded-lg bg-slate-700/50 hover:bg-slate-600/50 text-slate-300 hover:text-white transition-all flex items-center justify-center"
                title="Nuova conversazione"
              >
                <span className="text-lg">✨</span>
              </button>
              {/* Bottone Chiudi */}
              <button
                onClick={closeSidebar}
                className="w-9 h-9 rounded-lg bg-slate-700/50 hover:bg-slate-600/50 text-slate-300 hover:text-white transition-all flex items-center justify-center"
                title="Chiudi"
              >
                <span className="text-xl">✕</span>
              </button>
            </div>
          </div>

          {/* Token counter */}
          {tokenUsage && (
            <div className="mt-1.5 mb-1">
              <TokenCounter tokenUsage={tokenUsage} compact={false} />
            </div>
          )}

          {/* Contesto pagina corrente */}
          <div className="flex items-center gap-2 text-sm flex-wrap">
            <span className="px-2.5 py-1.5 bg-cyan-600/30 border border-cyan-500/40 rounded text-cyan-300 font-semibold">
              📍 {pageDisplayName}
            </span>
            {insights.length > 0 && (
              <span className="px-2.5 py-1.5 bg-amber-600/30 border border-amber-500/40 rounded text-amber-300 font-semibold">
                💡 {insights.length} insights attivi
              </span>
            )}
          </div>
        </div>

        {/* Area Messaggi / Storico */}
        <div className="flex-1 overflow-y-auto p-4">
          {showHistory ? (
            /* Vista Storico Conversazioni */
            <div className="space-y-2">
              <div className="text-xs text-slate-400 uppercase tracking-wide mb-3 font-semibold">
                Conversazioni precedenti
              </div>
              {conversations.length === 0 ? (
                <div className="text-center text-slate-500 py-8">
                  Nessuna conversazione salvata
                </div>
              ) : (
                conversations.map((conv) => (
                  <div
                    key={conv.id}
                    className={`relative p-3 rounded-lg transition-all ${
                      conv.attiva
                        ? 'bg-teal-600/30 border border-teal-500/40'
                        : 'bg-slate-700/30 hover:bg-slate-700/50 border border-slate-600/30'
                    }`}
                  >
                    {/* Conferma eliminazione overlay */}
                    {confirmDelete === conv.id && (
                      <div className="absolute inset-0 bg-slate-900/95 rounded-lg flex items-center justify-center gap-2 z-10">
                        <span className="text-xs text-slate-300">Eliminare?</span>
                        <button
                          onClick={() => handleDeleteConversation(conv.id)}
                          disabled={deletingId === conv.id}
                          className="px-2 py-1 bg-red-600 hover:bg-red-700 text-white text-xs rounded disabled:opacity-50"
                        >
                          {deletingId === conv.id ? '...' : 'Sì'}
                        </button>
                        <button
                          onClick={() => setConfirmDelete(null)}
                          className="px-2 py-1 bg-slate-600 hover:bg-slate-500 text-white text-xs rounded"
                        >
                          No
                        </button>
                      </div>
                    )}

                    {/* Contenuto conversazione */}
                    <div className="flex items-start justify-between gap-2">
                      <button
                        onClick={() => loadConversation(conv.id)}
                        className="flex-1 text-left"
                      >
                        <div className="flex items-center gap-2">
                          {/* Icona lucchetto se pinnata */}
                          {conv.pinned_by_hpa && (
                            <span className="text-amber-400" title="Protetta dal professionista">🔒</span>
                          )}
                          <span className="text-sm font-medium text-white truncate">
                            {conv.titolo || 'Conversazione'}
                          </span>
                        </div>
                        <div className="text-xs text-slate-400 mt-1">
                          {new Date(conv.created_at).toLocaleDateString('it-IT', {
                            day: '2-digit',
                            month: 'short',
                            year: 'numeric',
                            hour: '2-digit',
                            minute: '2-digit'
                          })}
                          {conv.attiva && <span className="ml-2 text-teal-400">(attiva)</span>}
                        </div>
                      </button>

                      {/* Azioni conversazione */}
                      <div className="flex items-center gap-1 flex-shrink-0">
                        {/* Bottone Pin/Unpin (solo HPA) */}
                        {isHpa && (
                          <button
                            onClick={(e) => {
                              e.stopPropagation()
                              handleTogglePin(conv.id, conv.pinned_by_hpa)
                            }}
                            disabled={pinningId === conv.id}
                            className={`w-7 h-7 rounded flex items-center justify-center transition-all ${
                              conv.pinned_by_hpa
                                ? 'bg-amber-600/50 text-amber-300 hover:bg-amber-600/70'
                                : 'bg-slate-600/50 text-slate-400 hover:bg-slate-600/70 hover:text-amber-300'
                            }`}
                            title={conv.pinned_by_hpa ? 'Rimuovi protezione' : 'Proteggi conversazione'}
                          >
                            {pinningId === conv.id ? '...' : (conv.pinned_by_hpa ? '🔒' : '🔓')}
                          </button>
                        )}

                        {/* Bottone Elimina (disabilitato se pinnata e non sei HPA) */}
                        <button
                          onClick={(e) => {
                            e.stopPropagation()
                            setConfirmDelete(conv.id)
                          }}
                          disabled={conv.pinned_by_hpa && !isHpa}
                          className={`w-7 h-7 rounded flex items-center justify-center transition-all ${
                            conv.pinned_by_hpa && !isHpa
                              ? 'bg-slate-700/30 text-slate-600 cursor-not-allowed'
                              : 'bg-slate-600/50 text-slate-400 hover:bg-red-600/50 hover:text-red-300'
                          }`}
                          title={conv.pinned_by_hpa && !isHpa ? 'Conversazione protetta' : 'Elimina conversazione'}
                        >
                          🗑️
                        </button>
                      </div>
                    </div>
                  </div>
                ))
              )}
            </div>
          ) : (
            /* Vista Chat Messaggi */
            <div className="space-y-3">
              {messages.map((msg, idx) => (
                <div
                  key={idx}
                  className={`flex ${msg.sender === 'beautyx' ? 'justify-start' : 'justify-end'}`}
                >
                  <div
                    className={`max-w-[85%] rounded-2xl p-3 ${
                      msg.sender === 'beautyx'
                        ? 'bg-slate-700/40 border border-slate-600/40 text-slate-100'
                        : 'bg-gradient-to-br from-teal-600 to-cyan-600 text-white'
                    }`}
                    style={{
                      boxShadow: msg.sender === 'beautyx'
                        ? '0 4px 6px rgba(0,0,0,0.1)'
                        : '0 4px 6px rgba(20, 184, 166, 0.3)'
                    }}
                  >
                    {/* Testo con interlinea stretta, paragrafi distanziati */}
                    <div className="text-sm leading-snug whitespace-pre-wrap break-words [&>p]:mb-2 [&>p:last-child]:mb-0">
                      {msg.contenuto.split('\n\n').map((para, i) => (
                        <p key={i} className={i > 0 ? 'mt-2' : ''}>
                          {para.split('\n').map((line, j) => (
                            <span key={j}>
                              {line}
                              {j < para.split('\n').length - 1 && <br />}
                            </span>
                          ))}
                        </p>
                      ))}
                    </div>
                    {/* Timestamp e contesto */}
                    <div className={`text-[10px] mt-1.5 flex items-center gap-2 ${
                      msg.sender === 'beautyx' ? 'text-slate-400' : 'text-white/60'
                    }`}>
                      <span>{formatTimestamp(msg.timestamp)}</span>
                      {msg.page_context && msg.sender === 'user' && (
                        <span>· da {msg.page_context}</span>
                      )}
                    </div>
                  </div>
                </div>
              ))}

              {/* Indicatore "Sta scrivendo..." */}
              {isLoading && (
                <div className="flex justify-start">
                  <div className="bg-slate-700/40 border border-slate-600/40 rounded-2xl px-4 py-3">
                    <div className="flex gap-1">
                      <div className="w-2 h-2 bg-teal-400 rounded-full animate-bounce" style={{ animationDelay: '0ms' }}></div>
                      <div className="w-2 h-2 bg-teal-400 rounded-full animate-bounce" style={{ animationDelay: '150ms' }}></div>
                      <div className="w-2 h-2 bg-teal-400 rounded-full animate-bounce" style={{ animationDelay: '300ms' }}></div>
                    </div>
                  </div>
                </div>
              )}

              <div ref={messagesEndRef} />
            </div>
          )}
        </div>

        {/* Input Area */}
        <div className="border-t border-slate-600/40 p-4 bg-slate-900/50 backdrop-blur-xl">
          {/* Quick Actions */}
          <div className="flex gap-2 mb-3 overflow-x-auto pb-2">
            <button
              onClick={() => setInput('Analizza la situazione finanziaria')}
              className="px-3 py-2 bg-emerald-600/30 border border-emerald-500/40 rounded-lg text-emerald-300 text-sm font-semibold whitespace-nowrap hover:bg-emerald-600/40 transition-all"
            >
              💚 Analizza
            </button>
            <button
              onClick={() => setInput('Suggerisci ottimizzazioni')}
              className="px-3 py-2 bg-teal-600/30 border border-teal-500/40 rounded-lg text-teal-300 text-sm font-semibold whitespace-nowrap hover:bg-teal-600/40 transition-all"
            >
              🎯 Ottimizza
            </button>
            <button
              onClick={() => setInput('Mostrami gli obiettivi attivi')}
              className="px-3 py-2 bg-cyan-600/30 border border-cyan-500/40 rounded-lg text-cyan-300 text-sm font-semibold whitespace-nowrap hover:bg-cyan-600/40 transition-all"
            >
              📊 Obiettivi
            </button>
          </div>

          {/* Input */}
          <div className="flex gap-2">
            <textarea
              ref={inputRef}
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyPress={handleKeyPress}
              placeholder="Chiedi a Beautyx..."
              disabled={isLoading}
              rows={1}
              className="flex-1 px-4 py-3 bg-slate-800/50 border border-slate-600/40 rounded-xl text-white placeholder-slate-400/60 focus:outline-none focus:border-teal-500 focus:ring-2 focus:ring-teal-500/30 transition-all resize-none"
              style={{ minHeight: '48px', maxHeight: '120px' }}
            />
            <button
              onClick={handleSend}
              disabled={isLoading || !input.trim()}
              className="px-6 py-3 bg-gradient-to-r from-teal-600 to-cyan-600 hover:from-teal-700 hover:to-cyan-700 disabled:from-slate-700 disabled:to-slate-700 text-white rounded-xl font-semibold transition-all disabled:opacity-50 disabled:cursor-not-allowed"
              style={{
                boxShadow: !isLoading && input.trim()
                  ? '0 4px 6px rgba(20, 184, 166, 0.3)'
                  : 'none'
              }}
            >
              Invia
            </button>
          </div>
        </div>
      </div>
    </>
  )
}
