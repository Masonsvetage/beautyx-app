'use client'

// Pagina che collega end-to-end il questionario di profiling CURA:
// quiz UI (QuizScenario, componente puro già esistente) -> motore
// deterministico (lib/beautyx/profilingEngine.js via /api/beautyx/profiling)
// -> narrazione libera (chat esistente in modalità profiling, /api/beautyx/chat)
// -> generazione report -> redirect alla pagina di risultato.
//
// Perché UN endpoint deterministico per gli scenari a scelta forzata e la
// chat esistente SOLO per la narrazione libera: vedi commento in cima ad
// app/api/beautyx/profiling/route.js. Questa pagina fa da "regista": chiede
// sempre il prossimo passo (action:'next'), e in base al tipo restituito
// mostra il componente giusto. Lo stato di avanzamento reale vive
// interamente in profiling_sessions (mai qui) — questa pagina può essere
// ricaricata o riaperta in qualunque momento e riprende esattamente da dove
// l'utente aveva lasciato, senza bisogno di logica di resume dedicata.

import { useState, useEffect, useRef, useCallback } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { useAuth } from '@/contexts/AuthContext'
import QuizScenario from '@/components/profiling/QuizScenario'

export default function QuestionarioPage() {
  const { centroId, loading: authLoading, isAuthenticated } = useAuth()
  const router = useRouter()

  const [step, setStep] = useState(null)       // { tipo: 'scenario'|'narrazione_libera'|'completato'|'errore', ... }
  const [progress, setProgress] = useState(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)
  const [generating, setGenerating] = useState(false)

  // Stato della mini-chat per la narrazione libera (task #153: la parte a
  // scelta forzata è un componente puro, la narrazione resta nella chat
  // esistente perché richiede davvero una conversazione con follow-up).
  const [conversationId, setConversationId] = useState(null)
  const [chatMessages, setChatMessages] = useState([])
  const [chatInput, setChatInput] = useState('')
  const [chatLoading, setChatLoading] = useState(false)
  const chatEndRef = useRef(null)
  const narrazioneAmbitoRef = useRef(null) // ambito per cui la chat è già stata inizializzata

  const call = useCallback(async (payload) => {
    const res = await fetch('/api/beautyx/profiling', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ centro_id: centroId, ...payload }),
    })
    const data = await res.json()
    if (!res.ok) throw new Error(data.error || 'Errore questionario CURA')
    return data
  }, [centroId])

  const loadNext = useCallback(async () => {
    if (!centroId) return
    setError(null)
    try {
      const data = await call({ action: 'next' })
      setStep(data.step)
      setProgress(data.progress)
      if (data.step?.tipo === 'completato') {
        await handleCompletato()
      }
    } catch (err) {
      setError(err.message)
    } finally {
      setLoading(false)
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [centroId, call])

  useEffect(() => {
    if (!authLoading && isAuthenticated && centroId) {
      loadNext()
    }
    if (!authLoading && (!isAuthenticated)) {
      router.push('/login?redirect=/questionario')
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [authLoading, isAuthenticated, centroId])

  // Genera il report (idempotente lato server) e porta l'utente al risultato.
  async function handleCompletato() {
    setGenerating(true)
    try {
      await call({ action: 'generate' })
      router.push('/questionario/risultato')
    } catch (err) {
      setError(err.message)
      setGenerating(false)
    }
  }

  // ── Scelta forzata: onConfirm arriva da QuizScenario già pronto nel
  // formato {"1":"fuoco",...} — lo inoltriamo così com'è, il server ricalcola
  // sempre i punteggi (mai fidarsi del client, vedi profilingEngine.js).
  async function handleConfirmScenario(ordinamento, meta) {
    setLoading(true)
    setError(null)
    try {
      const data = await call({ action: 'answer', scenario_code: meta.scenario_code, ordinamento })
      setStep(data.step)
      setProgress(data.progress)
      if (data.step?.tipo === 'completato') {
        await handleCompletato()
      }
    } catch (err) {
      setError(err.message)
    } finally {
      setLoading(false)
    }
  }

  // ── Narrazione libera: inizializza la mini-chat con la domanda di apertura
  // già fornita da get_prossimo_scenario, poi ogni turno passa da
  // /api/beautyx/chat (che in modalità profiling gestisce follow-up e alla
  // fine chiama da sola salva_narrazione_libera).
  useEffect(() => {
    if (step?.tipo !== 'narrazione_libera' || !centroId) return
    if (narrazioneAmbitoRef.current === step.ambito) return // già inizializzata per questo ambito
    narrazioneAmbitoRef.current = step.ambito

    setChatMessages([{ sender: 'beautyx', contenuto: step.domanda_apertura }])

    // Conversazione dedicata per tracciabilità, stesso pattern già in uso in
    // contexts/BeautyxContext.js (loadOrCreateConversation/createNewConversation).
    fetch('/api/beautyx/conversations', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ centro_id: centroId, titolo: `Questionario CURA — ${step.ambito}` }),
    })
      .then((r) => r.json())
      .then((d) => setConversationId(d.conversation?.id || null))
      .catch(() => setConversationId(null))
  }, [step, centroId])

  useEffect(() => {
    chatEndRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [chatMessages])

  async function sendNarrazioneMessage() {
    const testo = chatInput.trim()
    if (!testo || chatLoading) return
    setChatInput('')
    const nuovi = [...chatMessages, { sender: 'user', contenuto: testo }]
    setChatMessages(nuovi)
    setChatLoading(true)
    try {
      const res = await fetch('/api/beautyx/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          message: testo,
          context: {
            centro_id: centroId,
            conversation_id: conversationId,
            pagina_corrente: 'Questionario CURA',
            storico_messaggi: nuovi.slice(-14),
          },
        }),
      })
      const data = await res.json()
      const risposta = data.response || 'Scusa, ho avuto un problema. Riprova.'
      setChatMessages((prev) => [...prev, { sender: 'beautyx', contenuto: risposta }])

      // Dopo ogni scambio, verifica se la narrazione per questo ambito è
      // stata salvata (il tool salva_narrazione_libera l'ha già fatta
      // avanzare lato server) — se lo stato è cambiato, esce dalla chat e
      // torna al regista principale (prossimo scenario, prossimo ambito, o
      // completato).
      const next = await call({ action: 'next' })
      if (next.step?.tipo !== 'narrazione_libera' || next.step?.ambito !== step.ambito) {
        setStep(next.step)
        setProgress(next.progress)
        if (next.step?.tipo === 'completato') {
          await handleCompletato()
        }
      }
    } catch {
      setChatMessages((prev) => [...prev, { sender: 'beautyx', contenuto: 'Problema di connessione, riprova.' }])
    } finally {
      setChatLoading(false)
    }
  }

  // ============================================
  // RENDER
  // ============================================

  if (authLoading || (loading && !step)) {
    return <FullscreenLoader label="Prepariamo il tuo questionario CURA..." />
  }

  if (error && !step) {
    return (
      <FullscreenMessage
        title="Non riusciamo ad aprire il questionario"
        text={error}
        cta={<Link href="/dashboard" style={linkStyle}>Torna alla dashboard</Link>}
      />
    )
  }

  if (generating) {
    return <FullscreenLoader label="Componiamo il tuo report CURA..." />
  }

  if (step?.tipo === 'scenario') {
    return (
      <>
        <ErrorToast message={error} onDismiss={() => setError(null)} />
        <QuizScenario
          scenario={step}
          progress={progress}
          onConfirm={handleConfirmScenario}
          onExit={() => router.push('/dashboard')}
        />
      </>
    )
  }

  if (step?.tipo === 'narrazione_libera') {
    return (
      <>
        <ErrorToast message={error} onDismiss={() => setError(null)} />
        <NarrazioneChat
          progress={progress}
          messages={chatMessages}
          input={chatInput}
          setInput={setChatInput}
          loading={chatLoading}
          onSend={sendNarrazioneMessage}
          endRef={chatEndRef}
          onExit={() => router.push('/dashboard')}
        />
      </>
    )
  }

  if (step?.tipo === 'errore') {
    return (
      <FullscreenMessage
        title="Qualcosa non torna"
        text={step.messaggio}
        cta={<Link href="/dashboard" style={linkStyle}>Torna alla dashboard</Link>}
      />
    )
  }

  return <FullscreenLoader label="Un attimo..." />
}

// ── Componenti di supporto (stessa palette oro/crema del quiz, per
// continuità visiva tra le fasi) ──────────────────────────────────────────

const linkStyle = { color: '#c9a34a', fontWeight: 700, textDecoration: 'underline' }

function FullscreenLoader({ label }) {
  return (
    <div style={{
      minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center',
      flexDirection: 'column', gap: 16,
      background: 'linear-gradient(180deg, #120f0a 0%, #241d10 55%, #120f0a 100%)',
      color: '#e8c874', fontFamily: 'var(--font-inter), system-ui, sans-serif',
    }}>
      <div style={{
        width: 40, height: 40, borderRadius: '50%',
        border: '3px solid rgba(201,163,74,0.25)', borderTopColor: '#c9a34a',
        animation: 'spin 0.9s linear infinite',
      }} />
      <style>{'@keyframes spin { to { transform: rotate(360deg) } }'}</style>
      <p style={{ fontSize: 14, opacity: 0.85 }}>{label}</p>
    </div>
  )
}

function ErrorToast({ message, onDismiss }) {
  if (!message) return null
  return (
    <div style={{
      position: 'fixed', top: 70, left: '50%', transform: 'translateX(-50%)', zIndex: 100,
      maxWidth: 480, width: 'calc(100% - 32px)',
      background: '#3a1f14', border: '1px solid rgba(224,120,80,0.5)', color: '#f5d6c4',
      borderRadius: 12, padding: '10px 14px', fontSize: '0.8rem', display: 'flex',
      alignItems: 'center', justifyContent: 'space-between', gap: 12,
      boxShadow: '0 10px 30px -8px rgba(0,0,0,0.6)',
    }}>
      <span>{message}</span>
      <button type="button" onClick={onDismiss} style={{ background: 'none', border: 'none', color: '#f5d6c4', cursor: 'pointer', fontSize: '1rem', lineHeight: 1 }}>×</button>
    </div>
  )
}

function FullscreenMessage({ title, text, cta }) {
  return (
    <div style={{
      minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center',
      flexDirection: 'column', gap: 12, textAlign: 'center', padding: 24,
      background: 'linear-gradient(180deg, #120f0a 0%, #241d10 55%, #120f0a 100%)',
      color: '#faf3df', fontFamily: 'var(--font-inter), system-ui, sans-serif',
    }}>
      <h1 style={{ fontFamily: 'var(--font-playfair), Georgia, serif', fontSize: 22, color: '#e8c874' }}>{title}</h1>
      <p style={{ maxWidth: 420, opacity: 0.85, fontSize: 14 }}>{text}</p>
      {cta}
    </div>
  )
}

function NarrazioneChat({ progress, messages, input, setInput, loading, onSend, endRef, onExit }) {
  return (
    <div style={{
      minHeight: '100vh', display: 'flex', flexDirection: 'column',
      background: 'linear-gradient(180deg, #120f0a 0%, #241d10 55%, #120f0a 100%)',
      fontFamily: 'var(--font-inter), system-ui, sans-serif', color: '#4a4636',
    }}>
      <div style={{
        position: 'sticky', top: 0, zIndex: 10, display: 'flex', alignItems: 'center',
        justifyContent: 'space-between', padding: '9px 20px',
        background: 'rgba(18,15,10,0.75)', backdropFilter: 'blur(6px)',
        borderBottom: '1px solid rgba(201,163,74,0.25)',
      }}>
        <div style={{ fontFamily: 'var(--font-playfair), Georgia, serif', fontWeight: 900, fontStyle: 'italic', color: '#e8c874', fontSize: '1.05rem' }}>
          Beautyx <small style={{ display: 'block', fontFamily: 'var(--font-inter), sans-serif', fontStyle: 'normal', fontWeight: 600, fontSize: '0.62rem', letterSpacing: '0.16em', textTransform: 'uppercase', color: '#a29c8a' }}>Report di profiling</small>
        </div>
        <button type="button" onClick={onExit} style={{
          fontSize: '0.78rem', color: '#a29c8a', background: 'none', border: '1px solid rgba(201,163,74,0.25)',
          padding: '6px 12px', borderRadius: 999, cursor: 'pointer',
        }}>Esci e continua dopo</button>
      </div>

      {progress?.ambitoLabel && (
        <div style={{ maxWidth: 640, margin: '12px auto 0', padding: '0 20px', width: '100%' }}>
          <span style={{
            display: 'inline-flex', fontSize: '0.68rem', fontWeight: 800, letterSpacing: '0.14em',
            textTransform: 'uppercase', color: '#120f0a', background: 'linear-gradient(135deg,#e8c874,#c9a34a)',
            padding: '4px 12px', borderRadius: 999,
          }}>Ambito · {progress.ambitoLabel}</span>
          {progress.faseLabel && <div style={{ fontSize: '0.72rem', color: '#a29c8a', marginTop: 6 }}>{progress.faseLabel} — racconta un episodio reale</div>}
        </div>
      )}

      <div style={{ flex: 1, maxWidth: 640, margin: '0 auto', padding: '16px 20px', width: '100%', display: 'flex', flexDirection: 'column', gap: 10 }}>
        {messages.map((m, i) => (
          <div key={i} style={{
            alignSelf: m.sender === 'user' ? 'flex-end' : 'flex-start',
            maxWidth: '85%',
            background: m.sender === 'user' ? 'linear-gradient(135deg,#e8c874,#c9a34a)' : '#faf7ef',
            color: m.sender === 'user' ? '#120f0a' : '#1a1a0f',
            padding: '10px 14px', borderRadius: 14,
            fontSize: '0.86rem', lineHeight: 1.45,
            border: m.sender === 'user' ? 'none' : '1px solid #e3d9c2',
          }}>
            {m.contenuto}
          </div>
        ))}
        {loading && (
          <div style={{ alignSelf: 'flex-start', color: '#a29c8a', fontSize: '0.8rem', fontStyle: 'italic' }}>Beautyx sta scrivendo...</div>
        )}
        <div ref={endRef} />
      </div>

      <div style={{
        position: 'sticky', bottom: 0, background: 'rgba(18,15,10,0.9)', backdropFilter: 'blur(6px)',
        borderTop: '1px solid rgba(201,163,74,0.25)', padding: 14,
      }}>
        <div style={{ maxWidth: 640, margin: '0 auto', display: 'flex', gap: 10 }}>
          <input
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={(e) => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); onSend() } }}
            placeholder="Scrivi la tua risposta..."
            disabled={loading}
            style={{
              flex: 1, padding: '11px 14px', borderRadius: 12, border: '1px solid rgba(201,163,74,0.35)',
              background: '#faf7ef', color: '#1a1a0f', fontSize: '0.86rem', outline: 'none',
            }}
          />
          <button
            type="button"
            onClick={onSend}
            disabled={loading || !input.trim()}
            style={{
              padding: '11px 20px', borderRadius: 12, border: 'none', fontWeight: 800, cursor: 'pointer',
              background: 'linear-gradient(135deg,#e8c874,#c9a34a)', color: '#120f0a',
              opacity: loading || !input.trim() ? 0.6 : 1,
            }}
          >Invia</button>
        </div>
      </div>
    </div>
  )
}
