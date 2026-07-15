'use client'

import { useState, useEffect, useRef, use } from 'react'
import { useRouter } from 'next/navigation'

function formatDuration(seconds) {
  const m = Math.floor(seconds / 60).toString().padStart(2, '0')
  const s = (seconds % 60).toString().padStart(2, '0')
  return `${m}:${s}`
}

export default function CallPage({ params }) {
  const { sessionId } = use(params)
  const router = useRouter()

  const [session, setSession] = useState(null)
  const [remainingMinutes, setRemainingMinutes] = useState(0)
  const [callDuration, setCallDuration] = useState(0)
  const [jitsiReady, setJitsiReady] = useState(false)
  const [ending, setEnding] = useState(false)
  const [error, setError] = useState(null)
  const [autoEndWarning, setAutoEndWarning] = useState(false)

  const timerRef = useRef(null)
  const startTimeRef = useRef(null)
  const sessionRef = useRef(null)
  const durationRef = useRef(0)

  useEffect(() => {
    loadData()
    return () => clearInterval(timerRef.current)
  }, [sessionId])

  const loadData = async () => {
    try {
      const [sRes, mRes] = await Promise.all([
        fetch(`/api/hpa/call?session_id=${sessionId}`),
        fetch('/api/hpa/minutes')
      ])
      const [sData, mData] = await Promise.all([sRes.json(), mRes.json()])

      if (sData.error) { setError(sData.error); return }
      if (sData.session.status === 'completed' || sData.session.status === 'cancelled') {
        setError('Questa sessione è già terminata.')
        return
      }

      setSession(sData.session)
      sessionRef.current = sData.session
      setRemainingMinutes(mData.remaining || 0)

      if (sData.session.status === 'requested') {
        // Prima chiamata: marca come attiva
        await fetch('/api/hpa/call', {
          method: 'PATCH',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ session_id: sessionId, action: 'start' })
        })
        startTimer(0)
      } else if (sData.session.status === 'active' && sData.session.started_at) {
        // Ripresa dopo refresh: ripristina tempo trascorso
        const elapsed = Math.floor((Date.now() - new Date(sData.session.started_at).getTime()) / 1000)
        startTimer(elapsed)
      } else {
        startTimer(0)
      }
    } catch (e) {
      setError('Impossibile caricare la sessione. Riprova.')
    }
  }

  const startTimer = (initialOffset = 0) => {
    startTimeRef.current = Date.now() - initialOffset * 1000
    durationRef.current = initialOffset
    setCallDuration(initialOffset)
    timerRef.current = setInterval(() => {
      const elapsed = Math.floor((Date.now() - startTimeRef.current) / 1000)
      durationRef.current = elapsed
      setCallDuration(elapsed)
    }, 1000)
  }

  const handleEndCall = async () => {
    if (ending) return
    setEnding(true)
    clearInterval(timerRef.current)
    try {
      await fetch('/api/hpa/call', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          session_id: sessionId,
          action: 'end',
          duration_seconds: durationRef.current
        })
      })
    } catch (e) {}
    router.push('/dashboard')
  }

  // Auto-end quando i minuti si esauriscono
  const minutesUsedInCall = Math.ceil(callDuration / 60)
  const displayRemaining = Math.max(0, remainingMinutes - minutesUsedInCall)

  useEffect(() => {
    if (displayRemaining === 0 && callDuration > 0 && !ending) {
      setAutoEndWarning(true)
      // Termina automaticamente dopo 30 secondi
      const t = setTimeout(() => handleEndCall(), 30000)
      return () => clearTimeout(t)
    }
    if (displayRemaining <= 5 && displayRemaining > 0) {
      setAutoEndWarning(false)
    }
  }, [displayRemaining])

  if (error) {
    return (
      <div className="min-h-screen bg-slate-900 flex items-center justify-center p-4">
        <div className="bg-slate-800 rounded-2xl p-8 max-w-sm w-full text-center border border-slate-700">
          <div className="text-5xl mb-4">⚠️</div>
          <h2 className="text-white font-bold text-xl mb-3">Sessione non disponibile</h2>
          <p className="text-slate-400 text-sm mb-6">{error}</p>
          <button
            onClick={() => router.push('/dashboard')}
            className="w-full px-6 py-3 bg-teal-500 hover:bg-teal-600 text-white rounded-xl font-medium transition-colors"
          >
            Torna alla dashboard
          </button>
        </div>
      </div>
    )
  }

  if (!session) {
    return (
      <div className="min-h-screen bg-slate-900 flex flex-col items-center justify-center gap-4">
        <div className="w-10 h-10 border-2 border-teal-500 border-t-transparent rounded-full animate-spin" />
        <p className="text-slate-400 text-sm">Connessione in corso...</p>
      </div>
    )
  }

  const isVideo = session.call_type === 'video'

  // Costruisci URL Jitsi con configurazione
  const jitsiConfig = [
    `config.startWithVideoMuted=${!isVideo}`,
    'config.startWithAudioMuted=false',
    'config.prejoinPageEnabled=false',
    'config.disableDeepLinking=true',
    `userInfo.displayName=${encodeURIComponent('Cliente BeautyX')}`
  ].join('&')
  const jitsiUrl = session.room_url ? `${session.room_url}#${jitsiConfig}` : null

  return (
    <div className="min-h-screen bg-slate-900 flex flex-col">

      {/* Barra superiore */}
      <div className="bg-slate-800/90 backdrop-blur-md border-b border-slate-700/50 px-4 py-3 flex items-center justify-between z-10 flex-shrink-0">
        <div className="flex items-center gap-3">
          {/* Indicatore stato */}
          <div className={`w-2.5 h-2.5 rounded-full flex-shrink-0 ${callDuration > 0 ? 'bg-red-500 animate-pulse' : 'bg-yellow-400'}`} />
          <span className="text-white font-semibold text-sm">
            {isVideo ? '📹 Videochiamata' : '🎤 Audiochiamata'} con HPA
          </span>
          {callDuration > 0 && (
            <span className="text-slate-400 font-mono text-sm">{formatDuration(callDuration)}</span>
          )}
        </div>

        <div className="flex items-center gap-3">
          {/* Minuti rimasti */}
          <div className={`hidden sm:flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold ${
            displayRemaining === 0
              ? 'bg-red-500/30 text-red-300 border border-red-500/50'
              : displayRemaining <= 5
                ? 'bg-amber-500/20 text-amber-300 border border-amber-500/30'
                : 'bg-slate-700/60 text-slate-300 border border-slate-600/50'
          }`}>
            <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
            {displayRemaining} min rimanenti
          </div>

          {/* Bottone termina */}
          <button
            onClick={handleEndCall}
            disabled={ending}
            className="flex items-center gap-2 px-4 py-2 bg-red-500 hover:bg-red-600 active:bg-red-700 text-white rounded-xl text-sm font-semibold transition-colors disabled:opacity-60 disabled:cursor-wait"
          >
            {ending ? (
              <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
            ) : (
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 8l2-2m0 0l2-2m-2 2l-2-2m2 2l2 2M5 3a2 2 0 00-2 2v1c0 8.284 6.716 15 15 15h1a2 2 0 002-2v-3.28a1 1 0 00-.684-.948l-4.493-1.498a1 1 0 00-1.21.502l-1.13 2.257a11.042 11.042 0 01-5.516-5.517l2.257-1.128a1 1 0 00.502-1.21L9.228 3.683A1 1 0 008.279 3H5z" />
              </svg>
            )}
            {ending ? 'Terminando...' : 'Termina'}
          </button>
        </div>
      </div>

      {/* Area Jitsi */}
      <div className="flex-1 relative">
        {jitsiUrl ? (
          <iframe
            src={jitsiUrl}
            allow="camera; microphone; fullscreen; display-capture; autoplay"
            className="absolute inset-0 w-full h-full border-0"
            onLoad={() => setJitsiReady(true)}
            title="Chiamata HPA BeautyX"
          />
        ) : (
          <div className="absolute inset-0 flex items-center justify-center bg-slate-900">
            <p className="text-red-400">URL chiamata non disponibile</p>
          </div>
        )}

        {/* Loading overlay prima che Jitsi sia pronto */}
        {!jitsiReady && jitsiUrl && (
          <div className="absolute inset-0 flex flex-col items-center justify-center bg-slate-900 z-10 gap-4">
            <div className="w-14 h-14 border-2 border-teal-500 border-t-transparent rounded-full animate-spin" />
            <div className="text-center">
              <p className="text-white font-medium">Connessione alla stanza...</p>
              <p className="text-slate-400 text-sm mt-1">Assicurati di consentire l'accesso a microfono{isVideo ? ' e videocamera' : ''}</p>
            </div>
          </div>
        )}
      </div>

      {/* Warning minuti esauriti */}
      {autoEndWarning && (
        <div className="fixed bottom-6 left-1/2 -translate-x-1/2 z-50 bg-red-600 text-white px-6 py-4 rounded-2xl shadow-2xl flex items-center gap-3 max-w-sm w-[90%]">
          <div className="text-2xl flex-shrink-0">⏱️</div>
          <div>
            <p className="font-bold text-sm">Minuti esauriti</p>
            <p className="text-xs text-red-200 mt-0.5">La chiamata verrà terminata automaticamente tra 30 secondi</p>
          </div>
          <button
            onClick={handleEndCall}
            className="ml-auto flex-shrink-0 px-3 py-1.5 bg-white/20 hover:bg-white/30 rounded-lg text-xs font-medium"
          >
            Termina ora
          </button>
        </div>
      )}

      {/* Warning minuti in esaurimento */}
      {displayRemaining > 0 && displayRemaining <= 5 && callDuration > 0 && !autoEndWarning && (
        <div className="fixed bottom-6 left-1/2 -translate-x-1/2 z-50 bg-amber-500/90 backdrop-blur text-white px-5 py-3 rounded-xl shadow-xl flex items-center gap-2 text-sm font-medium">
          ⚠️ Solo {displayRemaining} {displayRemaining === 1 ? 'minuto rimanente' : 'minuti rimanenti'}
        </div>
      )}
    </div>
  )
}
