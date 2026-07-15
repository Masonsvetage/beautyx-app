'use client'

import { useState, useEffect, useRef } from 'react'
import { useAuth } from '@/contexts/AuthContext'
import MinuteBalance from '@/components/hpa/MinuteBalance'

export default function ContattaHpa() {
  const { profile, currentCentro } = useAuth()
  const [activeSection, setActiveSection] = useState('chat')
  const [messages, setMessages] = useState([])
  const [newMessage, setNewMessage] = useState('')
  const [sending, setSending] = useState(false)
  const [loadingMessages, setLoadingMessages] = useState(true)

  // Booking state
  const [availableSlots, setAvailableSlots] = useState([])
  const [selectedDate, setSelectedDate] = useState('')
  const [selectedDuration, setSelectedDuration] = useState(30)
  const [loadingSlots, setLoadingSlots] = useState(false)
  const [booking, setBooking] = useState(false)
  const [bookingNote, setBookingNote] = useState('')

  // Contact request state
  const [urgenza, setUrgenza] = useState('normale')
  const [motivo, setMotivo] = useState('')
  const [sendingRequest, setSendingRequest] = useState(false)

  const messagesEndRef = useRef(null)

  useEffect(() => {
    loadMessages()
  }, [currentCentro])

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages])

  const loadMessages = async () => {
    if (!currentCentro?.centro_id) return
    try {
      const res = await fetch(`/api/hpa/messages?centro_id=${currentCentro.centro_id}`)
      const data = await res.json()
      if (data.messages) {
        setMessages(data.messages)
        // Segna come letti
        await fetch('/api/hpa/messages/mark-read', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ centro_id: currentCentro.centro_id })
        })
      }
    } catch (error) {
      console.error('Errore caricamento messaggi:', error)
    } finally {
      setLoadingMessages(false)
    }
  }

  const sendMessage = async (e) => {
    e.preventDefault()
    if (!newMessage.trim() || sending) return

    setSending(true)
    try {
      const res = await fetch('/api/hpa/messages', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          centro_id: currentCentro.centro_id,
          contenuto: newMessage.trim()
        })
      })

      if (res.ok) {
        setNewMessage('')
        loadMessages()
      }
    } catch (error) {
      console.error('Errore invio messaggio:', error)
    } finally {
      setSending(false)
    }
  }

  const loadAvailableSlots = async () => {
    if (!selectedDate || !currentCentro?.hpa_id) return

    setLoadingSlots(true)
    try {
      const res = await fetch(
        `/api/booking?hpa_id=${currentCentro.hpa_id}&date=${selectedDate}&durata=${selectedDuration}`
      )
      const data = await res.json()
      if (data.slots) {
        setAvailableSlots(data.slots)
      }
    } catch (error) {
      console.error('Errore caricamento slot:', error)
    } finally {
      setLoadingSlots(false)
    }
  }

  useEffect(() => {
    if (selectedDate) {
      loadAvailableSlots()
    }
  }, [selectedDate, selectedDuration])

  const bookSlot = async (slot) => {
    if (booking) return

    setBooking(true)
    try {
      const res = await fetch('/api/booking', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          hpa_id: currentCentro.hpa_id,
          date: selectedDate,
          ora_inizio: slot.ora_inizio,
          durata: selectedDuration,
          note: bookingNote
        })
      })

      const data = await res.json()
      if (data.success) {
        alert('Appuntamento prenotato con successo!')
        setAvailableSlots([])
        setSelectedDate('')
        setBookingNote('')
      } else {
        alert(data.error || 'Errore nella prenotazione')
      }
    } catch (error) {
      console.error('Errore prenotazione:', error)
      alert('Errore nella prenotazione')
    } finally {
      setBooking(false)
    }
  }

  const sendContactRequest = async (e) => {
    e.preventDefault()
    if (!motivo.trim() || sendingRequest) return

    setSendingRequest(true)
    try {
      const res = await fetch('/api/contact-requests', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ urgenza, motivo: motivo.trim() })
      })

      if (res.ok) {
        alert('Richiesta inviata! Sarai ricontattato a breve.')
        setMotivo('')
        setUrgenza('normale')
      }
    } catch (error) {
      console.error('Errore invio richiesta:', error)
    } finally {
      setSendingRequest(false)
    }
  }

  const formatTime = (dateStr) => {
    const date = new Date(dateStr)
    return date.toLocaleString('it-IT', {
      day: '2-digit',
      month: 'short',
      hour: '2-digit',
      minute: '2-digit'
    })
  }

  // Genera date disponibili (prossimi 14 giorni, esclusi weekend)
  const getAvailableDates = () => {
    const dates = []
    const today = new Date()
    for (let i = 1; i <= 14; i++) {
      const date = new Date(today)
      date.setDate(today.getDate() + i)
      const dayOfWeek = date.getDay()
      if (dayOfWeek !== 0 && dayOfWeek !== 6) { // Escludi weekend
        dates.push(date.toISOString().split('T')[0])
      }
    }
    return dates
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900 p-4">
      <div className="max-w-4xl mx-auto">
        {/* Header */}
        <div className="bg-slate-950/60 backdrop-blur-md rounded-xl border border-slate-700/50 p-4 mb-6">
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 bg-gradient-to-br from-purple-600 to-pink-600 rounded-full flex items-center justify-center">
              <svg className="w-6 h-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M18.364 5.636l-3.536 3.536m0 5.656l3.536 3.536M9.172 9.172L5.636 5.636m3.536 9.192l-3.536 3.536M21 12a9 9 0 11-18 0 9 9 0 0118 0zm-5 0a4 4 0 11-8 0 4 4 0 018 0z" />
              </svg>
            </div>
            <div>
              <h1 className="text-xl font-bold text-white">Contatta il tuo HPA</h1>
              <p className="text-sm text-slate-400">Chat, prenota call e richiedi assistenza</p>
            </div>
          </div>
        </div>

        {/* Navigation */}
        <div className="flex gap-2 mb-6 overflow-x-auto pb-2">
          {[
            { id: 'chat', label: 'Chat', icon: '💬' },
            { id: 'booking', label: 'Prenota Call', icon: '📅' },
            { id: 'request', label: 'Richiesta Urgente', icon: '🚨' }
          ].map(section => (
            <button
              key={section.id}
              onClick={() => setActiveSection(section.id)}
              className={`flex items-center gap-2 px-4 py-2 rounded-lg font-medium whitespace-nowrap transition-all ${
                activeSection === section.id
                  ? 'bg-purple-500 text-white'
                  : 'bg-slate-800/50 text-slate-400 hover:text-white'
              }`}
            >
              <span>{section.icon}</span>
              {section.label}
            </button>
          ))}
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Main Content */}
          <div className="lg:col-span-2">
            {activeSection === 'chat' && (
              <div className="bg-slate-800/50 rounded-xl border border-slate-700/50 h-[500px] flex flex-col">
                {/* Chat Messages */}
                <div className="flex-1 overflow-y-auto p-4 space-y-3">
                  {loadingMessages ? (
                    <div className="flex items-center justify-center h-full">
                      <div className="w-6 h-6 border-2 border-purple-500 border-t-transparent rounded-full animate-spin"></div>
                    </div>
                  ) : messages.length === 0 ? (
                    <div className="flex items-center justify-center h-full text-slate-400">
                      Nessun messaggio. Inizia la conversazione!
                    </div>
                  ) : (
                    messages.map((msg) => (
                      <div
                        key={msg.id}
                        className={`flex ${msg.sender_type === 'client' ? 'justify-end' : 'justify-start'}`}
                      >
                        <div
                          className={`max-w-[80%] rounded-2xl px-4 py-2 ${
                            msg.sender_type === 'client'
                              ? 'bg-purple-500/30 text-purple-100 rounded-tr-sm'
                              : 'bg-slate-700/50 text-slate-200 rounded-tl-sm'
                          }`}
                        >
                          <p className="text-sm whitespace-pre-wrap">{msg.contenuto}</p>
                          <p className={`text-xs mt-1 ${
                            msg.sender_type === 'client' ? 'text-purple-300/70' : 'text-slate-400'
                          }`}>
                            {formatTime(msg.created_at)}
                          </p>
                        </div>
                      </div>
                    ))
                  )}
                  <div ref={messagesEndRef} />
                </div>

                {/* Chat Input */}
                <form onSubmit={sendMessage} className="p-4 border-t border-slate-700/50">
                  <div className="flex items-center gap-2">
                    <input
                      type="text"
                      value={newMessage}
                      onChange={(e) => setNewMessage(e.target.value)}
                      placeholder="Scrivi un messaggio..."
                      className="flex-1 px-4 py-2 bg-slate-700/50 border border-slate-600 rounded-full text-white placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-purple-500/50"
                      disabled={sending}
                    />
                    <button
                      type="submit"
                      disabled={!newMessage.trim() || sending}
                      className="p-2 bg-purple-500 hover:bg-purple-600 disabled:bg-slate-600 disabled:cursor-not-allowed rounded-full text-white transition-colors"
                    >
                      <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 19l9 2-9-18-9 18 9-2zm0 0v-8" />
                      </svg>
                    </button>
                  </div>
                </form>
              </div>
            )}

            {activeSection === 'booking' && (
              <div className="bg-slate-800/50 rounded-xl border border-slate-700/50 p-6">
                <h2 className="text-lg font-semibold text-white mb-4">Prenota una Call</h2>

                {/* Selezione durata */}
                <div className="mb-4">
                  <label className="block text-sm text-slate-400 mb-2">Durata</label>
                  <div className="flex gap-2">
                    {[15, 30, 45, 60].map(dur => (
                      <button
                        key={dur}
                        onClick={() => setSelectedDuration(dur)}
                        className={`px-4 py-2 rounded-lg font-medium transition-colors ${
                          selectedDuration === dur
                            ? 'bg-purple-500 text-white'
                            : 'bg-slate-700/50 text-slate-300 hover:bg-slate-700'
                        }`}
                      >
                        {dur} min
                      </button>
                    ))}
                  </div>
                </div>

                {/* Selezione data */}
                <div className="mb-4">
                  <label className="block text-sm text-slate-400 mb-2">Data</label>
                  <select
                    value={selectedDate}
                    onChange={(e) => setSelectedDate(e.target.value)}
                    className="w-full px-4 py-2 bg-slate-700/50 border border-slate-600 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-purple-500/50"
                  >
                    <option value="">Seleziona una data</option>
                    {getAvailableDates().map(date => (
                      <option key={date} value={date}>
                        {new Date(date).toLocaleDateString('it-IT', {
                          weekday: 'long',
                          day: 'numeric',
                          month: 'long'
                        })}
                      </option>
                    ))}
                  </select>
                </div>

                {/* Slot disponibili */}
                {selectedDate && (
                  <div className="mb-4">
                    <label className="block text-sm text-slate-400 mb-2">Orari Disponibili</label>
                    {loadingSlots ? (
                      <div className="flex items-center justify-center py-8">
                        <div className="w-6 h-6 border-2 border-purple-500 border-t-transparent rounded-full animate-spin"></div>
                      </div>
                    ) : availableSlots.length === 0 ? (
                      <p className="text-slate-500 text-center py-4">Nessuno slot disponibile per questa data</p>
                    ) : (
                      <div className="grid grid-cols-4 gap-2">
                        {availableSlots.map((slot, index) => (
                          <button
                            key={index}
                            onClick={() => bookSlot(slot)}
                            disabled={booking}
                            className="px-3 py-2 bg-emerald-500/20 hover:bg-emerald-500/30 text-emerald-300 rounded-lg text-sm transition-colors disabled:opacity-50"
                          >
                            {slot.ora_inizio?.slice(0, 5)}
                          </button>
                        ))}
                      </div>
                    )}
                  </div>
                )}

                {/* Note */}
                <div>
                  <label className="block text-sm text-slate-400 mb-2">Note (opzionale)</label>
                  <textarea
                    value={bookingNote}
                    onChange={(e) => setBookingNote(e.target.value)}
                    placeholder="Aggiungi note per la call..."
                    rows={3}
                    className="w-full px-4 py-2 bg-slate-700/50 border border-slate-600 rounded-lg text-white placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-purple-500/50 resize-none"
                  />
                </div>
              </div>
            )}

            {activeSection === 'request' && (
              <div className="bg-slate-800/50 rounded-xl border border-slate-700/50 p-6">
                <h2 className="text-lg font-semibold text-white mb-4">Richiesta di Contatto Urgente</h2>
                <p className="text-sm text-slate-400 mb-6">
                  Usa questo form per richiedere un contatto urgente dal tuo HPA.
                  Riceverai una risposta il prima possibile.
                </p>

                <form onSubmit={sendContactRequest}>
                  {/* Urgenza */}
                  <div className="mb-4">
                    <label className="block text-sm text-slate-400 mb-2">Livello di Urgenza</label>
                    <div className="flex gap-2 flex-wrap">
                      {[
                        { value: 'bassa', label: 'Bassa', color: 'bg-blue-500/20 text-blue-300' },
                        { value: 'normale', label: 'Normale', color: 'bg-slate-500/20 text-slate-300' },
                        { value: 'alta', label: 'Alta', color: 'bg-orange-500/20 text-orange-300' },
                        { value: 'urgente', label: 'Urgente', color: 'bg-red-500/20 text-red-300' }
                      ].map(urg => (
                        <button
                          key={urg.value}
                          type="button"
                          onClick={() => setUrgenza(urg.value)}
                          className={`px-4 py-2 rounded-lg font-medium transition-all ${
                            urgenza === urg.value
                              ? urg.color + ' ring-2 ring-offset-2 ring-offset-slate-800'
                              : 'bg-slate-700/50 text-slate-400 hover:text-white'
                          }`}
                        >
                          {urg.label}
                        </button>
                      ))}
                    </div>
                  </div>

                  {/* Motivo */}
                  <div className="mb-6">
                    <label className="block text-sm text-slate-400 mb-2">Motivo della richiesta</label>
                    <textarea
                      value={motivo}
                      onChange={(e) => setMotivo(e.target.value)}
                      placeholder="Descrivi brevemente il motivo della tua richiesta..."
                      rows={4}
                      className="w-full px-4 py-2 bg-slate-700/50 border border-slate-600 rounded-lg text-white placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-purple-500/50 resize-none"
                      required
                    />
                  </div>

                  <button
                    type="submit"
                    disabled={!motivo.trim() || sendingRequest}
                    className="w-full px-4 py-3 bg-purple-500 hover:bg-purple-600 disabled:bg-slate-600 disabled:cursor-not-allowed text-white font-medium rounded-lg transition-colors"
                  >
                    {sendingRequest ? 'Invio in corso...' : 'Invia Richiesta'}
                  </button>
                </form>
              </div>
            )}
          </div>

          {/* Sidebar */}
          <div className="space-y-4">
            <MinuteBalance />

            {/* Info HPA */}
            <div className="bg-slate-800/50 rounded-xl p-4 border border-slate-700/50">
              <h4 className="text-sm font-medium text-slate-400 mb-3">Il tuo HPA</h4>
              <div className="flex items-center gap-3">
                <div className="w-12 h-12 bg-gradient-to-br from-purple-500 to-pink-500 rounded-full flex items-center justify-center text-white font-semibold">
                  HPA
                </div>
                <div>
                  <p className="font-medium text-white">Consulente Dedicato</p>
                  <p className="text-sm text-slate-400">Disponibile Lun-Ven</p>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
