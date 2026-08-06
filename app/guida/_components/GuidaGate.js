'use client'

import { useState } from 'react'

export default function GuidaGate() {
  const [email, setEmail] = useState('')
  const [status, setStatus] = useState('idle') // idle | loading | notfound | error
  const [message, setMessage] = useState('')

  async function handleSubmit(e) {
    e.preventDefault()
    setStatus('loading')
    setMessage('')

    try {
      const res = await fetch('/api/guida/access', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email }),
      })
      const data = await res.json()

      if (res.ok && data.token) {
        window.location.href = `/guida?t=${data.token}`
        return
      }

      setStatus('notfound')
      setMessage(data.error || 'Email non trovata.')
    } catch {
      setStatus('error')
      setMessage('Errore di rete. Riprova tra poco.')
    }
  }

  return (
    <div
      className="min-h-screen flex items-center justify-center bg-[#1a1a0f] px-6"
      style={{ fontFamily: 'var(--font-inter), system-ui, sans-serif' }}
    >
      <div className="max-w-md w-full bg-[#f5f1ea] rounded-2xl p-8 text-center shadow-xl">
        <span className="inline-block px-4 py-1.5 rounded-full bg-[#c9a34a] text-[#1a1a0f] text-xs font-bold uppercase tracking-widest mb-6">
          Guida interattiva · gratuita
        </span>
        <h1
          className="text-2xl font-black text-[#1a1a0f] mb-3"
          style={{ fontFamily: 'var(--font-playfair), Georgia, serif' }}
        >
          Inserisci la tua email per accedere
        </h1>
        <p className="text-[#6b6555] text-sm leading-relaxed mb-6">
          La guida "10 errori che tradiscono il tuo centro" è riservata a chi è iscritto alla
          newsletter Beautyx. Se sei già iscritta/o, scrivi qui la tua email per entrare.
        </p>

        <form onSubmit={handleSubmit} className="flex flex-col gap-3">
          <input
            type="email"
            required
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            placeholder="la-tua-email@esempio.it"
            className="px-4 py-3 rounded-xl border border-[#e3d9c2] text-[#1a1a0f] bg-white focus:outline-none focus:ring-2 focus:ring-[#c9a34a]"
          />
          <button
            type="submit"
            disabled={status === 'loading'}
            className="px-6 py-3 bg-[#c9a34a] hover:bg-[#e8c874] text-[#1a1a0f] rounded-xl text-base font-bold transition-colors disabled:opacity-60"
          >
            {status === 'loading' ? 'Verifica…' : 'Accedi alla guida'}
          </button>
        </form>

        {message && (
          <p className="text-sm mt-5 text-[#a97e1f] leading-relaxed">
            {message}
            {status === 'notfound' && (
              <>
                {' '}
                <a href="/newsletter" className="underline font-bold">
                  Iscriviti qui
                </a>{' '}
                per riceverla.
              </>
            )}
          </p>
        )}
      </div>
    </div>
  )
}
