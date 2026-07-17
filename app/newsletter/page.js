'use client'

import { useState } from 'react'
import Link from 'next/link'

const argomenti = [
  {
    emoji: '👥',
    titolo: 'Il personale che non rende',
    descrizione: 'Come capire quali collaboratori stanno frenando il tuo centro — e cosa fare davvero.',
  },
  {
    emoji: '💰',
    titolo: 'Vendere prodotti senza sembrare una venditrice',
    descrizione: 'Il metodo che trasforma il consiglio in acquisto, senza pressione e senza imbarazzo.',
  },
  {
    emoji: '📅',
    titolo: 'L\'agenda piena non è il tuo obiettivo',
    descrizione: 'Perché lavorare meno ore può farti guadagnare di più — i numeri che non ti aspetti.',
  },
  {
    emoji: '🔄',
    titolo: 'Il modello abbonamento per i centri estetici',
    descrizione: 'Come costruire entrate fisse mensili anche senza cambiare i tuoi servizi.',
  },
  {
    emoji: '📊',
    titolo: 'I numeri che ogni titolare dovrebbe guardare ogni settimana',
    descrizione: 'Non il fatturato. Non i clienti. I tre indicatori che ti dicono davvero come stai andando.',
  },
  {
    emoji: '🌍',
    titolo: 'Cosa fanno i centri estetici all\'estero che qui non facciamo ancora',
    descrizione: 'Trend internazionali beauty & wellness che stanno arrivando in Italia — e come prepararsi.',
  },
]

export default function NewsletterPage() {
  const [email, setEmail] = useState('')
  const [website, setWebsite] = useState('')
  const [status, setStatus] = useState('idle') // idle | loading | success | error
  const [errorMsg, setErrorMsg] = useState('')

  const handleSubmit = async (e) => {
    e.preventDefault()
    setStatus('loading')
    setErrorMsg('')

    try {
      const res = await fetch('/api/newsletter/subscribe', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, website }),
      })

      const data = await res.json()

      if (data.success) {
        setStatus('success')
        setEmail('')
      } else {
        setStatus('error')
        setErrorMsg(data.error || 'Qualcosa è andato storto. Riprova.')
      }
    } catch {
      setStatus('error')
      setErrorMsg('Errore di connessione. Riprova tra qualche secondo.')
    }
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-pink-50 via-white to-purple-50">

      {/* Header */}
      <header className="px-6 py-5 flex items-center justify-between max-w-5xl mx-auto">
        <Link href="/" className="flex items-center gap-2">
          <div className="h-9 w-9 bg-gradient-to-br from-pink-500 to-purple-600 rounded-full flex items-center justify-center">
            <span className="text-sm font-bold text-white">B</span>
          </div>
          <span className="font-semibold text-gray-800">Beautyx</span>
        </Link>
        <Link
          href="/login"
          className="text-sm text-gray-500 hover:text-gray-800 transition-colors"
        >
          Hai già un account? <span className="text-pink-600 font-medium">Accedi</span>
        </Link>
      </header>

      {/* Hero */}
      <section className="max-w-3xl mx-auto px-6 pt-16 pb-12 text-center">
        <span className="inline-block bg-pink-100 text-pink-700 text-xs font-semibold px-3 py-1 rounded-full mb-6 uppercase tracking-wide">
          Newsletter gratuita · Ogni settimana
        </span>
        <h1 className="text-4xl sm:text-5xl font-extrabold text-gray-900 leading-tight mb-5">
          Il centro estetico che vuoi<br />
          <span className="text-transparent bg-clip-text bg-gradient-to-r from-pink-500 to-purple-600">
            si costruisce con le giuste informazioni
          </span>
        </h1>
        <p className="text-lg text-gray-600 mb-10 max-w-2xl mx-auto leading-relaxed">
          Ogni settimana un argomento concreto sulla gestione del tuo centro: personale, prezzi, clienti, numeri.
          Niente teoria, niente fronzoli. Solo quello che puoi applicare subito.
        </p>

        {/* Form iscrizione */}
        {status === 'success' ? (
          <div className="bg-green-50 border border-green-200 rounded-2xl px-8 py-8 max-w-md mx-auto">
            <div className="text-4xl mb-3">🎉</div>
            <h3 className="text-lg font-bold text-green-800 mb-2">Sei dentro!</h3>
            <p className="text-green-700 text-sm">
              Controlla la tua email — ti abbiamo inviato un messaggio di benvenuto.
              La prima newsletter arriva martedì.
            </p>
          </div>
        ) : (
          <form onSubmit={handleSubmit} className="max-w-md mx-auto">
            <input
              type="text"
              name="website"
              value={website}
              onChange={(e) => setWebsite(e.target.value)}
              style={{ position: 'absolute', left: '-9999px', opacity: 0, height: 0 }}
              tabIndex={-1}
              autoComplete="off"
              aria-hidden="true"
            />
            <div className="flex flex-col sm:flex-row gap-3">
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="la-tua-email@centro.it"
                required
                className="flex-1 px-4 py-3 rounded-xl border border-gray-200 text-gray-900 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-pink-400 focus:border-transparent text-sm"
              />
              <button
                type="submit"
                disabled={status === 'loading'}
                className="px-6 py-3 bg-gradient-to-r from-pink-500 to-purple-600 text-white font-semibold rounded-xl hover:from-pink-600 hover:to-purple-700 transition-all disabled:opacity-60 disabled:cursor-not-allowed text-sm whitespace-nowrap"
              >
                {status === 'loading' ? 'Iscrizione...' : 'Iscriviti gratis →'}
              </button>
            </div>
            {status === 'error' && (
              <p className="mt-3 text-red-600 text-sm">{errorMsg}</p>
            )}
            <p className="mt-3 text-xs text-gray-400">
              Niente spam. Disiscriviti quando vuoi con un click.
            </p>
          </form>
        )}
      </section>

      {/* Argomenti trattati */}
      <section className="max-w-5xl mx-auto px-6 py-12">
        <h2 className="text-center text-2xl font-bold text-gray-800 mb-2">
          Di cosa parla la newsletter
        </h2>
        <p className="text-center text-gray-500 text-sm mb-10">
          Argomenti che abbiamo già trattato — e altri in arrivo
        </p>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">
          {argomenti.map((a, i) => (
            <div
              key={i}
              className="bg-white rounded-2xl p-6 border border-gray-100 hover:border-pink-200 hover:shadow-sm transition-all"
            >
              <div className="text-3xl mb-3">{a.emoji}</div>
              <h3 className="font-semibold text-gray-900 mb-2 text-sm leading-snug">{a.titolo}</h3>
              <p className="text-gray-500 text-xs leading-relaxed">{a.descrizione}</p>
            </div>
          ))}
        </div>
      </section>

      {/* Social proof */}
      <section className="max-w-3xl mx-auto px-6 py-10 text-center">
        <div className="bg-white rounded-2xl border border-gray-100 px-8 py-8">
          <p className="text-gray-700 text-base italic leading-relaxed mb-4">
            &ldquo;Finalmente una newsletter che parla di gestione vera — non di prodotti o tendenze nail art.
            Ogni numero ha almeno una cosa che riesco ad applicare subito nel mio centro.&rdquo;
          </p>
          <p className="text-sm font-semibold text-gray-800">Chiara R.</p>
          <p className="text-xs text-gray-400">Titolare di centro estetico, Milano</p>
        </div>
      </section>

      {/* CTA finale */}
      <section className="max-w-3xl mx-auto px-6 pt-6 pb-20 text-center">
        <h2 className="text-2xl font-bold text-gray-900 mb-4">
          Pronta a gestire il tuo centro in modo diverso?
        </h2>
        <p className="text-gray-500 text-sm mb-8">
          Iscriviti gratis. Nessuna carta di credito, nessun impegno.
        </p>
        {status !== 'success' && (
          <form onSubmit={handleSubmit} className="max-w-md mx-auto">
            <input
              type="text"
              name="website"
              value={website}
              onChange={(e) => setWebsite(e.target.value)}
              style={{ position: 'absolute', left: '-9999px', opacity: 0, height: 0 }}
              tabIndex={-1}
              autoComplete="off"
              aria-hidden="true"
            />
            <div className="flex flex-col sm:flex-row gap-3">
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="la-tua-email@centro.it"
                required
                className="flex-1 px-4 py-3 rounded-xl border border-gray-200 text-gray-900 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-pink-400 text-sm"
              />
              <button
                type="submit"
                disabled={status === 'loading'}
                className="px-6 py-3 bg-gradient-to-r from-pink-500 to-purple-600 text-white font-semibold rounded-xl hover:from-pink-600 hover:to-purple-700 transition-all disabled:opacity-60 text-sm whitespace-nowrap"
              >
                {status === 'loading' ? 'Iscrizione...' : 'Iscriviti gratis →'}
              </button>
            </div>
          </form>
        )}
      </section>

      {/* Footer */}
      <footer className="border-t border-gray-100 py-6 text-center">
        <p className="text-xs text-gray-400">
          © 2025 Beautyx · <Link href="/privacy" className="hover:text-gray-600">Privacy</Link> · <Link href="/login" className="hover:text-gray-600">Accedi al gestionale</Link>
        </p>
      </footer>

    </div>
  )
}
