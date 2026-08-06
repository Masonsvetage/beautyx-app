'use client'

import { useState } from 'react'
import { quizDomande, capitoli } from '@/lib/data/dieci-errori'

const QUIZ_STORAGE_KEY = 'beautyx-guida-quiz-risposte'

// Calcola il punteggio: somma le occorrenze per numero di errore tra le risposte date.
// Nessuna mappatura al metodo SvetAge qui — solo conteggio semplice sui 10 errori.
function calcolaRisultato(risposte) {
  const punteggi = {}
  Object.values(risposte).forEach((errore) => {
    punteggi[errore] = (punteggi[errore] || 0) + 1
  })
  const max = Math.max(0, ...Object.values(punteggi))
  const vincitori = Object.entries(punteggi)
    .filter(([, v]) => v === max)
    .map(([numero]) => Number(numero))
  return { punteggi, vincitori, max }
}

export default function Quiz() {
  const [step, setStep] = useState(0) // indice domanda corrente
  const [risposte, setRisposte] = useState({}) // { domandaId: numeroErrore }
  const [showResult, setShowResult] = useState(false)

  const totale = quizDomande.length
  const domandaCorrente = quizDomande[step]
  const completato = Object.keys(risposte).length === totale

  const scegli = (domandaId, errore) => {
    const next = { ...risposte, [domandaId]: errore }
    setRisposte(next)
    if (step < totale - 1) {
      setTimeout(() => setStep(step + 1), 220)
    } else {
      try {
        window.localStorage.setItem(QUIZ_STORAGE_KEY, JSON.stringify(next))
      } catch {
        // localStorage non disponibile, va bene comunque: il risultato resta in memoria
      }
      setTimeout(() => setShowResult(true), 220)
    }
  }

  const ricomincia = () => {
    setRisposte({})
    setStep(0)
    setShowResult(false)
  }

  if (showResult) {
    const { vincitori } = calcolaRisultato(risposte)
    return <RisultatoQuiz numeriErrore={vincitori} onRestart={ricomincia} />
  }

  return (
    <div className="max-w-2xl mx-auto px-6">
      {/* Barra avanzamento domande */}
      <div className="flex items-center gap-1.5 mb-8">
        {quizDomande.map((_, i) => (
          <div
            key={i}
            className={`h-1.5 flex-1 rounded-full transition-colors ${
              i < step ? 'bg-[#c9a34a]' : i === step ? 'bg-[#e8c874]' : 'bg-[#e3d9c2]'
            }`}
          />
        ))}
      </div>

      <p className="text-xs font-bold uppercase tracking-widest text-[#c9a34a] mb-3">
        Domanda {step + 1} di {totale}
      </p>
      <h3
        className="text-2xl sm:text-3xl font-bold text-[#1a1a0f] mb-8 leading-snug"
        style={{ fontFamily: 'var(--font-playfair), Georgia, serif' }}
      >
        {domandaCorrente.domanda}
      </h3>

      <div className="space-y-3">
        {domandaCorrente.opzioni.map((opt, i) => {
          const selected = risposte[domandaCorrente.id] === opt.errore
          return (
            <button
              key={i}
              onClick={() => scegli(domandaCorrente.id, opt.errore)}
              className={`w-full text-left px-5 py-4 rounded-xl border-2 transition-all text-[#2a2a1f] ${
                selected
                  ? 'border-[#c9a34a] bg-[#faf3df]'
                  : 'border-[#e3d9c2] bg-white hover:border-[#c9a34a]/60 hover:bg-[#faf7ef]'
              }`}
            >
              {opt.testo}
            </button>
          )
        })}
      </div>

      {step > 0 && (
        <button
          onClick={() => setStep(step - 1)}
          className="mt-6 text-sm text-[#8a6d1f] hover:underline"
        >
          ← Torna alla domanda precedente
        </button>
      )}
    </div>
  )
}

function RisultatoQuiz({ numeriErrore, onRestart }) {
  const risultati = numeriErrore
    .map((n) => capitoli.find((c) => c.numero === n))
    .filter(Boolean)

  const scrollToChapter = (numero) => {
    const el = document.getElementById(`capitolo-${numero}`)
    if (el) el.scrollIntoView({ behavior: 'smooth', block: 'start' })
  }

  return (
    <div className="max-w-2xl mx-auto px-6 text-center">
      <p className="text-xs font-bold uppercase tracking-widest text-[#c9a34a] mb-3">
        Il tuo risultato
      </p>
      <h3
        className="text-2xl sm:text-3xl font-bold text-[#1a1a0f] mb-6 leading-snug"
        style={{ fontFamily: 'var(--font-playfair), Georgia, serif' }}
      >
        {risultati.length > 1
          ? 'Questi sono gli errori che ti riguardano di più oggi'
          : "Questo è l'errore che ti riguarda di più oggi"}
      </h3>

      <div className="space-y-4 text-left mb-8">
        {risultati.map((c) => (
          <div key={c.numero} className="bg-white border-2 border-[#c9a34a] rounded-2xl p-6">
            <p className="text-xs font-bold uppercase tracking-widest text-[#c9a34a] mb-1">
              Errore {String(c.numero).padStart(2, '0')}
            </p>
            <h4 className="text-lg font-bold text-[#1a1a0f] mb-3" style={{ fontFamily: 'var(--font-playfair), Georgia, serif' }}>
              {c.titolo}
            </h4>
            <button
              onClick={() => scrollToChapter(c.numero)}
              className="text-sm font-semibold text-[#a97e1f] hover:underline"
            >
              Rileggi questo capitolo ↑
            </button>
          </div>
        ))}
      </div>

      <p className="text-sm text-[#6b6555] mb-6 leading-relaxed">
        Ricorda: non è un giudizio, è uno specchio. Riconoscerlo è già il primo passo per cambiarlo.
      </p>

      <button
        onClick={onRestart}
        className="text-sm text-[#8a6d1f] hover:underline"
      >
        Rifai il quiz
      </button>
    </div>
  )
}
