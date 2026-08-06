'use client'

import { useState } from 'react'
import { quizDomande, quizIntro, capitoli } from '@/lib/data/dieci-errori'

const QUIZ_STORAGE_KEY = 'beautyx-guida-quiz-risposte'

// ── Shuffle Fisher-Yates ────────────────────────────────────────────────────
// Mescola un array di INDICI (mai l'array di dati originale), cosi' la
// mappatura opzione -> errori resta sempre intatta anche dopo il rimescolo.
// E' il fix tecnico esplicito al problema "la seconda opzione e' sempre
// quella giusta" segnalato da Mason sulla v2.
function shuffleIndici(n) {
  const idx = Array.from({ length: n }, (_, i) => i)
  for (let i = idx.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1))
    ;[idx[i], idx[j]] = [idx[j], idx[i]]
  }
  return idx
}

// Nuova mappa di shuffle per ogni domanda: rigenerata a ogni nuova sessione
// (mount del componente) e a ogni "rifai il test", cosi' l'ordine delle
// opzioni cambia davvero a ogni render/sessione, non solo alla prima visita.
function generaMappaShuffle() {
  return quizDomande.map((d) => shuffleIndici(d.opzioni.length))
}

// Calcola il suggerimento di lettura: somma le occorrenze per numero di errore tra
// le risposte date (ogni opzione puo' puntare a 0, 1 o 2 errori contemporaneamente).
// Restituisce i 2-3 errori con punteggio piu' alto (a parita' di punteggio sulla
// soglia, li mostra tutti) — non un verdetto assoluto, solo uno spunto di lettura,
// coerente con l'approccio maieutico del brand.
// Le domande di controllo (tipo 'controllo') non entrano mai qui: le loro
// risposte hanno sempre errori: [], quindi non alterano la somma.
function calcolaSuggerimento(risposte) {
  const punteggi = {}
  Object.values(risposte).forEach((r) => {
    ;(r.errori || []).forEach((e) => {
      punteggi[e] = (punteggi[e] || 0) + 1
    })
  })
  const ordinati = Object.entries(punteggi)
    .map(([numero, punti]) => ({ numero: Number(numero), punti }))
    .filter((o) => o.punti > 0)
    .sort((a, b) => b.punti - a.punti)

  if (ordinati.length === 0) return []

  const soglia = ordinati[Math.min(2, ordinati.length - 1)].punti
  return ordinati.filter((o) => o.punti >= soglia).map((o) => o.numero)
}

// Calcola i segnali di coerenza (Q16/Q17 vs le domande comportamentali
// indicate in "controlloDi"). E' un confronto puramente tecnico/editoriale:
// non influenza mai lo scoring finale (quello viene sempre e solo dalle
// domande episodiche/scenario/forzata) e non viene mostrato alla lettrice.
// Logica (istruzioni di Federica): se la domanda di controllo dichiara
// un'immagine "virtuosa" di se' (es. "decido sempre con i numeri") ma una
// delle domande comportamentali collegate mostra uno degli errori
// sorvegliati, la dichiarazione e' "incoerente" — segno che le risposte
// potrebbero essere "di facciata". Altrimenti e' "coerente" (o "n/d" se la
// domanda di controllo non ha ricevuto risposta).
function calcolaCoerenza(risposte) {
  const segnali = {}
  quizDomande
    .filter((d) => d.tipo === 'controllo')
    .forEach((d) => {
      const rispostaControllo = risposte[d.id]
      if (!rispostaControllo) {
        segnali[d.id] = 'non-risposta'
        return
      }
      const dichiaraVirtuosa = rispostaControllo.dichiarazione === 'virtuosa'
      const comportamentoMostraErrore = d.controlloDi.some((altroId) => {
        const r = risposte[altroId]
        return r && (r.errori || []).some((e) => d.erroriSorvegliati.includes(e))
      })
      segnali[d.id] = dichiaraVirtuosa && comportamentoMostraErrore ? 'incoerente' : 'coerente'
    })
  return segnali
}

export default function Quiz() {
  const [fase, setFase] = useState('intro') // 'intro' | 'domande' | 'risultato'
  const [step, setStep] = useState(0)
  const [risposte, setRisposte] = useState({}) // { domandaId: { optIndex, errori, dichiarazione } }
  const [shuffleMap, setShuffleMap] = useState(generaMappaShuffle)

  const totale = quizDomande.length
  const domandaCorrente = quizDomande[step]
  const ordineOpzioni = shuffleMap[step] || domandaCorrente.opzioni.map((_, i) => i)

  const iniziaTest = () => {
    setShuffleMap(generaMappaShuffle())
    setFase('domande')
    setStep(0)
    setRisposte({})
  }

  const scegli = (domandaId, opt, optIndex) => {
    const next = {
      ...risposte,
      [domandaId]: { optIndex, errori: opt.errori || [], dichiarazione: opt.dichiarazione },
    }
    setRisposte(next)
    if (step < totale - 1) {
      setTimeout(() => setStep(step + 1), 220)
    } else {
      try {
        const coerenza = calcolaCoerenza(next)
        window.localStorage.setItem(QUIZ_STORAGE_KEY, JSON.stringify({ risposte: next, coerenza }))
      } catch {
        // localStorage non disponibile, va bene comunque: il risultato resta in memoria
      }
      setTimeout(() => setFase('risultato'), 220)
    }
  }

  const ricomincia = () => {
    setRisposte({})
    setStep(0)
    setShuffleMap(generaMappaShuffle())
    setFase('intro')
  }

  if (fase === 'intro') {
    return (
      <div className="max-w-xl mx-auto px-6 text-center">
        <h2
          className="text-2xl sm:text-3xl font-bold text-[#1a1a0f] mb-5 leading-snug"
          style={{ fontFamily: 'var(--font-playfair), Georgia, serif' }}
        >
          {quizIntro.titolo}
        </h2>
        <p className="text-[#4a4636] text-[1.02rem] leading-[1.85] mb-8">
          {quizIntro.paragrafo}
        </p>
        <button
          onClick={iniziaTest}
          className="inline-flex items-center gap-2 px-8 py-4 bg-[#c9a34a] hover:bg-[#e8c874] text-[#1a1a0f] rounded-xl text-base font-bold transition-colors"
        >
          {quizIntro.cta}
        </button>
        <p className="text-xs text-[#a29c8a] mt-4">19 domande veloci · circa 3 minuti · nessuna risposta sbagliata</p>
      </div>
    )
  }

  if (fase === 'risultato') {
    const suggeriti = calcolaSuggerimento(risposte)
    return <SuggerimentoQuiz numeriErrore={suggeriti} onRestart={ricomincia} />
  }

  return (
    <div className="max-w-2xl mx-auto px-6">
      {/* Barra avanzamento domande */}
      <div className="flex items-center gap-1 mb-8 flex-wrap">
        {quizDomande.map((_, i) => (
          <div
            key={i}
            className={`h-1.5 flex-1 min-w-[10px] rounded-full transition-colors ${
              i < step ? 'bg-[#c9a34a]' : i === step ? 'bg-[#e8c874]' : 'bg-[#e3d9c2]'
            }`}
          />
        ))}
      </div>

      <p className="text-xs font-bold uppercase tracking-widest text-[#c9a34a] mb-3">
        Domanda {step + 1} di {totale}
      </p>
      <h3
        className="text-xl sm:text-2xl font-bold text-[#1a1a0f] mb-4 leading-snug"
        style={{ fontFamily: 'var(--font-playfair), Georgia, serif' }}
      >
        {domandaCorrente.domanda}
      </h3>

      {domandaCorrente.tipo === 'forzata' && domandaCorrente.nota && (
        <p className="text-sm italic text-[#8a6d1f] mb-6">{domandaCorrente.nota}</p>
      )}

      <div className="space-y-3">
        {ordineOpzioni.map((origIdx) => {
          const opt = domandaCorrente.opzioni[origIdx]
          const selected = risposte[domandaCorrente.id]?.optIndex === origIdx
          return (
            <button
              key={origIdx}
              onClick={() => scegli(domandaCorrente.id, opt, origIdx)}
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

function SuggerimentoQuiz({ numeriErrore, onRestart }) {
  const suggeriti = numeriErrore
    .map((n) => capitoli.find((c) => c.numero === n))
    .filter(Boolean)

  const scrollToChapter = (numero) => {
    const el = document.getElementById(`capitolo-${numero}`)
    if (el) el.scrollIntoView({ behavior: 'smooth', block: 'start' })
  }

  const scrollToFirstChapter = () => {
    const el = document.getElementById('capitolo-1')
    if (el) el.scrollIntoView({ behavior: 'smooth', block: 'start' })
  }

  return (
    <div className="max-w-2xl mx-auto px-6 text-center">
      <p className="text-xs font-bold uppercase tracking-widest text-[#c9a34a] mb-3">
        Il tuo spunto di lettura
      </p>
      <h3
        className="text-2xl sm:text-3xl font-bold text-[#1a1a0f] mb-4 leading-snug"
        style={{ fontFamily: 'var(--font-playfair), Georgia, serif' }}
      >
        {suggeriti.length > 0
          ? 'Parti probabilmente da qui'
          : 'Nessun campanello acceso in particolare'}
      </h3>
      <p className="text-sm text-[#6b6555] mb-8 leading-relaxed max-w-md mx-auto">
        {suggeriti.length > 0
          ? 'Non è un verdetto, è solo uno specchio parziale: da come rispondi oggi, questi sono i capitoli che probabilmente ti riguardano di più. Ma vale la pena leggerli tutti — sono dieci porte sulla stessa stanza.'
          : 'Dalle tue risposte non emerge un errore in particolare — ottimo segno, ma leggi comunque i dieci capitoli con calma: quasi sempre qualcosa ti somiglia più di quanto pensi.'}
      </p>

      {suggeriti.length > 0 && (
        <div className="space-y-4 text-left mb-8">
          {suggeriti.map((c) => (
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
                Leggi questo capitolo ↓
              </button>
            </div>
          ))}
        </div>
      )}

      <div className="flex flex-col sm:flex-row items-center justify-center gap-4">
        <button
          onClick={scrollToFirstChapter}
          className="inline-flex items-center gap-2 px-8 py-4 bg-[#c9a34a] hover:bg-[#e8c874] text-[#1a1a0f] rounded-xl text-base font-bold transition-colors"
        >
          Inizia dal Capitolo 1 ↓
        </button>
        <button
          onClick={onRestart}
          className="text-sm text-[#8a6d1f] hover:underline"
        >
          Rifai il test
        </button>
      </div>
    </div>
  )
}
