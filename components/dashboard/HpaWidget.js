'use client'

import { useState, useEffect, useRef, useCallback, useMemo } from 'react'

const STAR_LABELS = { 1: 'Pessimo', 2: 'Scarso', 3: 'Nella norma', 4: 'Buono', 5: 'Eccellente' }

function InlineStars({ value, onChange, saving }) {
  const [hovered, setHovered] = useState(null)
  const display = hovered ?? value

  return (
    <div className="flex items-center gap-0.5">
      {[1, 2, 3, 4, 5].map(star => (
        <button
          key={star}
          type="button"
          onClick={() => !saving && onChange(star)}
          onMouseEnter={() => setHovered(star)}
          onMouseLeave={() => setHovered(null)}
          className={`focus:outline-none transition-transform ${saving ? 'cursor-wait' : 'cursor-pointer hover:scale-110'}`}
          disabled={saving}
        >
          <svg
            className={`w-5 h-5 transition-colors ${star <= display ? 'text-amber-400' : 'text-slate-600'}`}
            fill="currentColor" viewBox="0 0 24 24"
          >
            <path d="M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z" />
          </svg>
        </button>
      ))}
      {display > 0 && (
        <span className="ml-1.5 text-xs text-amber-300 font-medium">{STAR_LABELS[display]}</span>
      )}
    </div>
  )
}

// Sezione valutazione + recensione per un singolo target
function RatingSection({ label, avatar, targetType, targetId, targetName, centroId, initialRating, initialReview }) {
  const [rating, setRating] = useState(initialRating || 0)
  const [review, setReview] = useState(initialReview || '')
  const [showReview, setShowReview] = useState(false)
  const [saving, setSaving] = useState(false)
  const [msg, setMsg] = useState('')

  useEffect(() => {
    setRating(initialRating || 0)
    setReview(initialReview || '')
  }, [initialRating, initialReview])

  const handleStarClick = async (value) => {
    setRating(value)
    await doSave(value, review)
  }

  const handleReviewSave = async () => {
    await doSave(rating, review)
    setShowReview(false)
  }

  const doSave = async (ratingValue, reviewValue) => {
    if (!ratingValue) return
    setSaving(true)
    setMsg('')
    try {
      const res = await fetch('/api/user/ratings', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          target_type: targetType,
          target_id: targetId || null,   // deve essere UUID o null
          target_name: targetName || null,
          rating: ratingValue,
          review: reviewValue?.trim() || null,
          centro_id: centroId || null
        })
      })
      const data = await res.json()
      if (data.error) throw new Error(data.error)
      setMsg('Salvato')
      setTimeout(() => setMsg(''), 2000)
    } catch (e) {
      setMsg('Errore: ' + e.message)
      setTimeout(() => setMsg(''), 3000)
    } finally {
      setSaving(false)
    }
  }

  return (
    <div className="space-y-2">
      {/* Riga stelline */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2 min-w-0">
          {avatar}
          <span className="text-sm text-slate-300 truncate">{label}</span>
        </div>
        <div className="flex items-center gap-2 flex-shrink-0">
          {msg && (
            <span className={`text-xs font-medium ${msg.startsWith('Errore') ? 'text-red-400' : 'text-teal-400'}`}>
              {msg}
            </span>
          )}
          <InlineStars value={rating} onChange={handleStarClick} saving={saving} />
        </div>
      </div>

      {/* Recensione esistente o pulsante per aggiungerne una */}
      {rating > 0 && (
        <div className="ml-9">
          {!showReview ? (
            <button
              onClick={() => setShowReview(true)}
              className="text-xs text-slate-500 hover:text-slate-300 transition-colors flex items-start gap-1 text-left"
            >
              {review ? (
                <>
                  <span className="italic text-slate-400">&ldquo;{review.slice(0, 60)}{review.length > 60 ? '…' : ''}&rdquo;</span>
                  <span className="text-slate-600 hover:text-slate-400 flex-shrink-0 underline underline-offset-2 ml-1">modifica</span>
                </>
              ) : (
                <span className="underline underline-offset-2">+ Aggiungi recensione</span>
              )}
            </button>
          ) : (
            <div className="space-y-2">
              <textarea
                value={review}
                onChange={e => setReview(e.target.value)}
                placeholder="Scrivi la tua opinione (opzionale)..."
                rows={2}
                className="w-full px-3 py-2 bg-slate-900/60 border border-slate-600/50 rounded-lg text-white text-xs placeholder:text-slate-500 focus:ring-1 focus:ring-teal-500 focus:border-transparent resize-none"
              />
              <div className="flex gap-2 justify-end">
                <button
                  onClick={() => setShowReview(false)}
                  className="text-xs text-slate-500 hover:text-slate-300 px-2 py-1"
                >
                  Annulla
                </button>
                <button
                  onClick={handleReviewSave}
                  disabled={saving}
                  className="text-xs bg-teal-600 hover:bg-teal-500 text-white px-3 py-1 rounded-lg disabled:opacity-50 transition-colors"
                >
                  {saving ? 'Salvo...' : 'Salva'}
                </button>
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  )
}

const PLAN_CALL_FEATURES = {
  demo: { audio: false, video: false, label: 'Solo chat' },
  starter: { audio: true, video: false, label: 'Chat + Audio' },
  professional: { audio: true, video: true, label: 'Chat + Audio + Video' },
  enterprise: { audio: true, video: true, label: 'Chat + Audio + Video HD' }
}

const TYPE_ICONS = { chat: '💬', audio: '🎙️', video: '🎥' }
const TYPE_LABELS = { chat: 'Chat', audio: 'Audio', video: 'Video' }

function BookingModal({ hpaId, centroId, minuteData, planFeatures, onClose, onBooked }) {
  const [selectedDate, setSelectedDate] = useState(null)
  const [selectedSlot, setSelectedSlot] = useState(null)
  const [durata, setDurata] = useState(30)
  const [tipoContatto, setTipoContatto] = useState('chat')
  const [note, setNote] = useState('')
  const [slots, setSlots] = useState([])
  const [loadingSlots, setLoadingSlots] = useState(false)
  const [booking, setBooking] = useState(false)
  const [bookingMsg, setBookingMsg] = useState('')

  const days = useMemo(() => {
    return Array.from({ length: 7 }, (_, i) => {
      const d = new Date()
      d.setDate(d.getDate() + 1 + i)
      return d
    })
  }, [])

  const maxMinutes = minuteData?.remaining || 60
  const durationOptions = useMemo(() => {
    const opts = [15, 30, 45, 60].filter(d => d <= maxMinutes)
    return opts.length > 0 ? opts : [15]
  }, [maxMinutes])

  const typeOptions = useMemo(() => {
    const opts = ['chat']
    if (planFeatures?.audio) opts.push('audio')
    if (planFeatures?.video) opts.push('video')
    return opts
  }, [planFeatures])

  const loadSlots = useCallback(async (date, dur) => {
    if (!date) return
    setLoadingSlots(true)
    setSlots([])
    setSelectedSlot(null)
    try {
      const dateStr = date.toISOString().split('T')[0]
      const res = await fetch(`/api/booking?hpa_id=${hpaId}&date=${dateStr}&durata=${dur}`)
      const data = await res.json()
      setSlots(data.slots || [])
    } catch (e) {}
    finally { setLoadingSlots(false) }
  }, [hpaId])

  useEffect(() => {
    if (selectedDate) loadSlots(selectedDate, durata)
  }, [selectedDate, durata, loadSlots])

  const handleBook = async () => {
    if (!selectedDate || !selectedSlot || booking) return
    setBooking(true)
    setBookingMsg('')
    try {
      const res = await fetch('/api/booking', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          hpa_id: hpaId,
          date: selectedDate.toISOString().split('T')[0],
          ora_inizio: selectedSlot,
          durata,
          note: note.trim() || undefined,
          tipo_contatto: tipoContatto
        })
      })
      const data = await res.json()
      if (data.error) { setBookingMsg(data.error); return }
      onBooked(data.appointment)
    } catch (e) {
      setBookingMsg('Errore durante la prenotazione')
    } finally {
      setBooking(false)
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center sm:items-center p-4">
      <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={onClose} />
      <div className="relative bg-slate-800 border border-slate-700/80 rounded-2xl w-full max-w-sm shadow-2xl max-h-[85vh] overflow-y-auto">
        {/* Header */}
        <div className="flex items-center justify-between p-4 border-b border-slate-700/50 sticky top-0 bg-slate-800 z-10">
          <h3 className="text-white font-semibold">Prenota consulenza</h3>
          <button onClick={onClose} className="text-slate-400 hover:text-white transition-colors p-1">
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        <div className="p-4 space-y-4">
          {/* Durata + Tipo */}
          <div className="grid grid-cols-2 gap-3">
            <div>
              <p className="text-xs text-slate-500 uppercase tracking-wider mb-1.5">Durata</p>
              <div className="flex flex-wrap gap-1.5">
                {durationOptions.map(d => (
                  <button
                    key={d}
                    onClick={() => setDurata(d)}
                    className={`px-2.5 py-1 rounded-lg text-xs font-medium transition-colors ${
                      durata === d ? 'bg-teal-500 text-white' : 'bg-slate-700/60 text-slate-300 hover:bg-slate-700'
                    }`}
                  >
                    {d} min
                  </button>
                ))}
              </div>
            </div>

            <div>
              <p className="text-xs text-slate-500 uppercase tracking-wider mb-1.5">Tipo</p>
              <div className="flex flex-wrap gap-1.5">
                {typeOptions.map(t => (
                  <button
                    key={t}
                    onClick={() => setTipoContatto(t)}
                    className={`px-2.5 py-1 rounded-lg text-xs font-medium transition-colors ${
                      tipoContatto === t ? 'bg-teal-500 text-white' : 'bg-slate-700/60 text-slate-300 hover:bg-slate-700'
                    }`}
                  >
                    {TYPE_ICONS[t]} {TYPE_LABELS[t]}
                  </button>
                ))}
              </div>
            </div>
          </div>

          {/* Date selector */}
          <div>
            <p className="text-xs text-slate-500 uppercase tracking-wider mb-2">Scegli giorno</p>
            <div className="flex gap-1.5 overflow-x-auto pb-1">
              {days.map(d => {
                const isSelected = selectedDate?.toDateString() === d.toDateString()
                return (
                  <button
                    key={d.toISOString()}
                    onClick={() => setSelectedDate(d)}
                    className={`flex-shrink-0 flex flex-col items-center px-3 py-2 rounded-xl text-xs transition-colors min-w-[46px] ${
                      isSelected ? 'bg-teal-500 text-white' : 'bg-slate-700/60 text-slate-300 hover:bg-slate-700'
                    }`}
                  >
                    <span className="uppercase">{d.toLocaleDateString('it-IT', { weekday: 'short' })}</span>
                    <span className="font-bold text-sm mt-0.5">{d.getDate()}</span>
                  </button>
                )
              })}
            </div>
          </div>

          {/* Slots */}
          {selectedDate && (
            <div>
              <p className="text-xs text-slate-500 uppercase tracking-wider mb-2">Orario disponibile</p>
              {loadingSlots ? (
                <div className="flex justify-center py-4">
                  <div className="w-5 h-5 border-2 border-teal-500 border-t-transparent rounded-full animate-spin" />
                </div>
              ) : slots.length === 0 ? (
                <p className="text-slate-500 text-xs py-2 text-center">Nessuno slot disponibile per questo giorno</p>
              ) : (
                <div className="grid grid-cols-4 gap-1.5">
                  {slots.map(s => (
                    <button
                      key={s.ora_inizio}
                      onClick={() => setSelectedSlot(s.ora_inizio)}
                      className={`py-1.5 rounded-lg text-xs font-medium transition-colors ${
                        selectedSlot === s.ora_inizio
                          ? 'bg-teal-500 text-white'
                          : 'bg-slate-700/60 text-slate-300 hover:bg-slate-700'
                      }`}
                    >
                      {s.ora_inizio.slice(0, 5)}
                    </button>
                  ))}
                </div>
              )}
            </div>
          )}

          {/* Note */}
          {selectedSlot && (
            <textarea
              value={note}
              onChange={e => setNote(e.target.value)}
              placeholder="Note per il consulente (opzionale)..."
              rows={2}
              className="w-full px-3 py-2 bg-slate-900/60 border border-slate-700/50 rounded-xl text-white text-sm placeholder:text-slate-500 focus:ring-1 focus:ring-teal-500 focus:border-transparent resize-none"
            />
          )}

          {bookingMsg && (
            <p className="text-red-400 text-xs text-center">{bookingMsg}</p>
          )}

          {/* Confirm */}
          <button
            onClick={handleBook}
            disabled={!selectedDate || !selectedSlot || booking}
            className="w-full bg-teal-500 hover:bg-teal-600 disabled:opacity-40 disabled:cursor-not-allowed text-white py-2.5 rounded-xl font-medium text-sm transition-colors"
          >
            {booking ? (
              <span className="flex items-center justify-center gap-2">
                <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                Prenotazione in corso...
              </span>
            ) : selectedDate && selectedSlot ? (
              `Conferma — ${selectedDate.toLocaleDateString('it-IT', { weekday: 'short', day: 'numeric', month: 'short' })} alle ${selectedSlot.slice(0, 5)}`
            ) : (
              'Seleziona data e orario'
            )}
          </button>
        </div>
      </div>
    </div>
  )
}

export default function HpaWidget({ centroId }) {
  const [hpa, setHpa] = useState(null)
  const [loading, setLoading] = useState(true)
  const [showChat, setShowChat] = useState(false)
  const [messages, setMessages] = useState([])
  const [msgLoading, setMsgLoading] = useState(false)
  const [input, setInput] = useState('')
  const [sending, setSending] = useState(false)
  const messagesEndRef = useRef(null)
  const inputRef = useRef(null)

  const [existingRatings, setExistingRatings] = useState({})
  const [minuteData, setMinuteData] = useState(null)  // { credits, piano, remaining }
  const [showBooking, setShowBooking] = useState(false)

  useEffect(() => {
    if (centroId) {
      loadHpa()
      loadRatings()
      loadMinutes()
    }
  }, [centroId])

  const loadHpa = async () => {
    try {
      const res = await fetch(`/api/hpa/mio-hpa?centro_id=${centroId}`)
      const data = await res.json()
      if (!data.error) setHpa(data.hpa)
    } catch (e) {
      console.error('Errore caricamento HPA:', e)
    } finally {
      setLoading(false)
    }
  }

  const loadRatings = async () => {
    try {
      const res = await fetch('/api/user/ratings')
      const data = await res.json()
      if (data.ratings) {
        const map = {}
        data.ratings.forEach(r => { map[r.target_type] = r })
        setExistingRatings(map)
      }
    } catch (e) {}
  }

  const loadMinutes = async () => {
    try {
      const res = await fetch(`/api/hpa/minutes${centroId ? `?centro_id=${centroId}` : ''}`)
      const data = await res.json()
      if (!data.error) setMinuteData(data)
    } catch (e) {}
  }

  const handleBooked = (appointment) => {
    setShowBooking(false)
    loadHpa()  // Ricarica per mostrare il nuovo appuntamento
  }

  const loadMessages = useCallback(async () => {
    if (!hpa) return
    setMsgLoading(true)
    try {
      const res = await fetch(`/api/hpa/messages?centro_id=${centroId}&limit=50`)
      const data = await res.json()
      setMessages((data.messages || []).reverse())
      await fetch('/api/hpa/messages/mark-read', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ centro_id: centroId })
      })
      setHpa(prev => prev ? { ...prev, unread_count: 0 } : prev)
    } catch (e) {}
  }, [hpa, centroId])

  useEffect(() => {
    if (showChat && hpa) loadMessages()
  }, [showChat, hpa, loadMessages])

  useEffect(() => {
    if (showChat) messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages, showChat])

  const handleSend = async () => {
    if (!input.trim() || sending) return
    const text = input.trim()
    setInput('')
    setSending(true)
    const optimistic = { id: 'tmp-' + Date.now(), sender_type: 'client', contenuto: text, created_at: new Date().toISOString() }
    setMessages(prev => [...prev, optimistic])
    try {
      const res = await fetch('/api/hpa/messages', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ centro_id: centroId, contenuto: text })
      })
      const data = await res.json()
      if (data.error) throw new Error(data.error)
      setMessages(prev => prev.map(m => m.id === optimistic.id ? data.message : m))
    } catch (e) {
      setMessages(prev => prev.filter(m => m.id !== optimistic.id))
      setInput(text)
    } finally {
      setSending(false)
      inputRef.current?.focus()
    }
  }

  const handleKeyDown = (e) => {
    if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); handleSend() }
  }

  const getHpaDisplayName = () => {
    if (!hpa) return ''
    if (hpa.nome && hpa.cognome) return `${hpa.nome} ${hpa.cognome}`
    return hpa.email
  }

  const getInitials = () => {
    if (!hpa) return '?'
    if (hpa.nome && hpa.cognome) return `${hpa.nome[0]}${hpa.cognome[0]}`.toUpperCase()
    return hpa.email[0].toUpperCase()
  }

  const formatTime = (iso) => {
    if (!iso) return ''
    const d = new Date(iso)
    const now = new Date()
    const diff = now - d
    if (diff < 60000) return 'ora'
    if (diff < 3600000) return `${Math.floor(diff / 60000)} min fa`
    if (diff < 86400000) return d.toLocaleTimeString('it-IT', { hour: '2-digit', minute: '2-digit' })
    return d.toLocaleDateString('it-IT', { day: 'numeric', month: 'short' })
  }

  if (loading) {
    return (
      <div className="bg-slate-800/40 rounded-xl border border-slate-700/50 p-5 animate-pulse">
        <div className="flex items-center gap-3">
          <div className="w-12 h-12 rounded-full bg-slate-700" />
          <div className="flex-1 space-y-2">
            <div className="h-4 bg-slate-700 rounded w-32" />
            <div className="h-3 bg-slate-700 rounded w-24" />
          </div>
        </div>
      </div>
    )
  }

  // Senza HPA: solo box valutazione Beautyx
  if (!hpa) {
    return (
      <div className="bg-slate-800/40 rounded-xl border border-slate-700/50 p-5">
        <p className="text-xs font-medium text-slate-500 uppercase tracking-wider mb-4">Valutazioni</p>
        <RatingSection
          label="Beautyx AI"
          avatar={<div className="w-7 h-7 rounded-full bg-teal-500/20 flex items-center justify-center flex-shrink-0"><span className="text-base leading-none">✨</span></div>}
          targetType="beautyx"
          targetId={null}
          targetName="Beautyx AI"
          centroId={centroId}
          initialRating={existingRatings.beautyx?.rating}
          initialReview={existingRatings.beautyx?.review}
        />
      </div>
    )
  }

  return (
    <div className="bg-slate-800/40 rounded-xl border border-slate-700/50 overflow-hidden">
      {/* Header HPA */}
      <div className="p-5">
        <p className="text-xs font-medium text-slate-500 uppercase tracking-wider mb-3">Il tuo consulente HPA</p>
        <div className="flex items-start gap-3">
          <div className="relative flex-shrink-0">
            {hpa.avatar_url ? (
              <img src={hpa.avatar_url} alt={getHpaDisplayName()} className="w-12 h-12 rounded-full object-cover" />
            ) : (
              <div className="w-12 h-12 bg-purple-500/30 rounded-full flex items-center justify-center">
                <span className="text-purple-400 font-semibold text-sm">{getInitials()}</span>
              </div>
            )}
            <div className="absolute -bottom-0.5 -right-0.5 w-3.5 h-3.5 bg-green-500 rounded-full border-2 border-slate-800" />
          </div>

          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2">
              <p className="text-white font-semibold truncate">{getHpaDisplayName()}</p>
              <span className="px-1.5 py-0.5 bg-purple-500/20 text-purple-400 rounded text-xs flex-shrink-0">HPA</span>
            </div>
            {(hpa.specializzazione || hpa.telefono) && (
              <p className="text-slate-400 text-xs mt-0.5 truncate">{hpa.specializzazione || hpa.telefono}</p>
            )}
            {hpa.unread_count > 0 && (
              <div className="flex items-center gap-1 mt-1">
                <div className="w-2 h-2 rounded-full bg-teal-400 animate-pulse" />
                <span className="text-teal-400 text-xs font-medium">
                  {hpa.unread_count} {hpa.unread_count === 1 ? 'messaggio nuovo' : 'messaggi nuovi'}
                </span>
              </div>
            )}
          </div>

          {hpa.unread_count > 0 && (
            <div className="w-6 h-6 rounded-full bg-teal-500 flex items-center justify-center flex-shrink-0">
              <span className="text-white text-xs font-bold">{hpa.unread_count > 9 ? '9+' : hpa.unread_count}</span>
            </div>
          )}
        </div>

        {hpa.next_appointment && (() => {
          const appt = hpa.next_appointment
          const apptDateTime = new Date(`${appt.data_appuntamento}T${appt.ora_inizio}`)
          const minutesDiff = (apptDateTime - new Date()) / 60000
          const isImminent = minutesDiff <= 15 && minutesDiff >= -60
          const hasCallLink = appt.room_url && (appt.tipo_contatto === 'audio' || appt.tipo_contatto === 'video')

          return (
            <>
              {/* Banner "Entra" se la chiamata è imminente (entro 15 min o iniziata da <60 min) */}
              {isImminent && hasCallLink && (
                <div className="mt-3 px-3 py-2.5 bg-green-500/15 border border-green-500/30 rounded-xl flex items-center justify-between gap-3">
                  <div>
                    <p className="text-green-300 font-semibold text-sm">
                      {minutesDiff > 0 ? 'Consulenza tra poco' : 'Consulenza in corso'}
                    </p>
                    <p className="text-slate-400 text-xs mt-0.5">
                      {TYPE_ICONS[appt.tipo_contatto]} {TYPE_LABELS[appt.tipo_contatto]} · alle {appt.ora_inizio?.slice(0, 5)}
                    </p>
                  </div>
                  <a
                    href={appt.room_url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="flex-shrink-0 px-4 py-1.5 bg-green-500 hover:bg-green-400 text-white rounded-lg text-sm font-semibold transition-colors"
                  >
                    Entra
                  </a>
                </div>
              )}

              {/* Info prossimo appuntamento */}
              {!(isImminent && hasCallLink) && (
                <div className="mt-3 px-3 py-2 bg-blue-500/10 border border-blue-500/20 rounded-lg flex items-center gap-2">
                  <svg className="w-4 h-4 text-blue-400 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
                  </svg>
                  <div className="text-xs flex-1">
                    <span className="text-blue-300 font-medium">
                      {appt.tipo_contatto && appt.tipo_contatto !== 'chat' ? `${TYPE_ICONS[appt.tipo_contatto]} ` : ''}
                      Prossimo appuntamento:{' '}
                    </span>
                    <span className="text-slate-300">
                      {new Date(appt.data_appuntamento).toLocaleDateString('it-IT', { weekday: 'short', day: 'numeric', month: 'short' })}
                      {' alle '}{appt.ora_inizio?.slice(0, 5)}
                    </span>
                  </div>
                </div>
              )}
            </>
          )
        })()}

        {/* Minuti HPA disponibili */}
        {minuteData && (
          <div className="mt-3 px-3 py-2.5 bg-slate-900/50 border border-slate-700/50 rounded-lg">
            <div className="flex items-center justify-between mb-1.5">
              <span className="text-xs text-slate-500 font-medium uppercase tracking-wider">Minuti consulenza</span>
              <span className={`text-xs font-semibold px-2 py-0.5 rounded-full ${
                minuteData.remaining === 0 ? 'bg-red-500/20 text-red-300' :
                minuteData.remaining <= 10 ? 'bg-amber-500/20 text-amber-300' :
                'bg-teal-500/10 text-teal-300'
              }`}>
                {minuteData.remaining} min
              </span>
            </div>
            {/* Barra progresso */}
            <div className="w-full h-1.5 bg-slate-700 rounded-full overflow-hidden">
              <div
                className={`h-full rounded-full transition-all ${
                  minuteData.remaining === 0 ? 'bg-red-500' :
                  minuteData.remaining <= 10 ? 'bg-amber-400' :
                  'bg-teal-400'
                }`}
                style={{
                  width: `${Math.min(100, (minuteData.remaining / (minuteData.credits?.minutes_total || 30)) * 100)}%`
                }}
              />
            </div>
            <p className="text-xs text-slate-600 mt-1">
              {PLAN_CALL_FEATURES[minuteData.piano]?.label || 'Chat'} · Piano {minuteData.piano}
            </p>
          </div>
        )}

        {/* Azioni contatto */}
        <div className="flex gap-2 mt-3">
          <button
            onClick={() => setShowChat(!showChat)}
            className={`flex-1 flex items-center justify-center gap-2 py-2 rounded-lg text-sm font-medium transition-colors ${
              showChat
                ? 'bg-teal-500/20 text-teal-300 border border-teal-500/30'
                : 'bg-teal-500 hover:bg-teal-600 text-white'
            }`}
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" />
            </svg>
            {showChat ? 'Chiudi chat' : 'Chat'}
          </button>

          {/* Prenota consulenza */}
          <button
            onClick={() => setShowBooking(true)}
            disabled={(minuteData?.remaining || 0) === 0}
            title={(minuteData?.remaining || 0) === 0 ? 'Minuti esauriti — aggiorna il piano' : 'Prenota una consulenza'}
            className="flex items-center justify-center gap-1.5 px-3 py-2 bg-purple-500/20 hover:bg-purple-500/30 text-purple-300 rounded-lg text-sm font-medium transition-colors disabled:opacity-40 disabled:cursor-not-allowed border border-purple-500/30"
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
            </svg>
            <span className="hidden sm:inline">Prenota</span>
          </button>

          {hpa.email && (
            <a href={`mailto:${hpa.email}`}
              className="flex items-center justify-center px-3 py-2 bg-slate-700/60 hover:bg-slate-700 text-slate-300 rounded-lg text-sm transition-colors"
              title={`Email a ${getHpaDisplayName()}`}
            >
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
              </svg>
            </a>
          )}
        </div>

        {/* Valutazioni */}
        <div className="mt-4 pt-4 border-t border-slate-700/50 space-y-3">
          <p className="text-xs font-medium text-slate-500 uppercase tracking-wider">Le tue valutazioni</p>

          <RatingSection
            label={hpa.nome || getHpaDisplayName()}
            avatar={
              <div className="w-7 h-7 rounded-full bg-purple-500/20 flex items-center justify-center flex-shrink-0">
                <span className="text-purple-400 text-xs font-bold">{getInitials()}</span>
              </div>
            }
            targetType="hpa"
            targetId={hpa.id}          // UUID reale dell'HPA
            targetName={getHpaDisplayName()}
            centroId={centroId}
            initialRating={existingRatings.hpa?.rating}
            initialReview={existingRatings.hpa?.review}
          />

          <RatingSection
            label="Beautyx AI"
            avatar={
              <div className="w-7 h-7 rounded-full bg-teal-500/20 flex items-center justify-center flex-shrink-0">
                <span className="text-base leading-none">✨</span>
              </div>
            }
            targetType="beautyx"
            targetId={null}            // nessun UUID per Beautyx
            targetName="Beautyx AI"
            centroId={centroId}
            initialRating={existingRatings.beautyx?.rating}
            initialReview={existingRatings.beautyx?.review}
          />
        </div>
      </div>

      {/* Booking modal */}
      {showBooking && (
        <BookingModal
          hpaId={hpa.id}
          centroId={centroId}
          minuteData={minuteData}
          planFeatures={PLAN_CALL_FEATURES[minuteData?.piano || 'demo']}
          onClose={() => setShowBooking(false)}
          onBooked={handleBooked}
        />
      )}

      {/* Chat */}
      {showChat && (
        <div className="border-t border-slate-700/50">
          <div className="h-72 overflow-y-auto p-4 space-y-3 bg-slate-900/40">
            {msgLoading ? (
              <div className="flex items-center justify-center h-full">
                <div className="w-6 h-6 border-2 border-teal-500 border-t-transparent rounded-full animate-spin" />
              </div>
            ) : messages.length === 0 ? (
              <div className="flex flex-col items-center justify-center h-full text-center">
                <div className="w-12 h-12 bg-purple-500/10 rounded-full flex items-center justify-center mb-3">
                  <svg className="w-6 h-6 text-purple-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" />
                  </svg>
                </div>
                <p className="text-slate-400 text-sm">Inizia la conversazione con il tuo consulente</p>
                <p className="text-slate-500 text-xs mt-1">{getHpaDisplayName()} ti risponderà al più presto</p>
              </div>
            ) : (
              messages.map(msg => (
                <div key={msg.id} className={`flex ${msg.sender_type === 'client' ? 'justify-end' : 'justify-start'}`}>
                  {msg.sender_type === 'hpa' && (
                    <div className="w-6 h-6 rounded-full bg-purple-500/30 flex items-center justify-center mr-2 flex-shrink-0 mt-1">
                      <span className="text-purple-400 text-xs font-medium">{getInitials()}</span>
                    </div>
                  )}
                  <div className={`max-w-[75%] flex flex-col gap-0.5 ${msg.sender_type === 'client' ? 'items-end' : 'items-start'}`}>
                    <div className={`px-3 py-2 rounded-2xl text-sm leading-relaxed ${
                      msg.sender_type === 'client'
                        ? 'bg-teal-500 text-white rounded-br-sm'
                        : 'bg-slate-700/80 text-slate-200 rounded-bl-sm'
                    } ${msg.id?.toString().startsWith('tmp-') ? 'opacity-60' : ''}`}>
                      {msg.contenuto}
                    </div>
                    <span className="text-xs text-slate-600 px-1">{formatTime(msg.created_at)}</span>
                  </div>
                </div>
              ))
            )}
            <div ref={messagesEndRef} />
          </div>

          <div className="p-3 border-t border-slate-700/50 flex gap-2">
            <textarea
              ref={inputRef}
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={handleKeyDown}
              placeholder={`Scrivi a ${hpa.nome || 'HPA'}...`}
              rows={1}
              className="flex-1 px-3 py-2 bg-slate-800/80 border border-slate-600/50 rounded-xl text-white text-sm placeholder:text-slate-500 focus:ring-1 focus:ring-teal-500 focus:border-transparent resize-none"
              style={{ minHeight: '40px', maxHeight: '100px' }}
            />
            <button
              onClick={handleSend}
              disabled={!input.trim() || sending}
              className="w-10 h-10 bg-teal-500 hover:bg-teal-600 text-white rounded-xl flex items-center justify-center transition-colors disabled:opacity-40 disabled:cursor-not-allowed flex-shrink-0"
            >
              {sending ? (
                <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
              ) : (
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 19l9 2-9-18-9 18 9-2zm0 0v-8" />
                </svg>
              )}
            </button>
          </div>
        </div>
      )}
    </div>
  )
}
