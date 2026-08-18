'use client'

import { useEffect, useState } from 'react'
import { quizDomande } from '@/lib/data/dieci-errori'

// Stessa chiave gia' usata da Quiz.js per salvare il risultato del quiz
// diagnostico a fine test (fase === 'risultato'). Centralizzata qui cosi'
// sia Quiz.js (che scrive) sia GuidaContent.js (che legge, tramite l'hook
// sotto) usano la stessa costante — niente stringhe duplicate/disallineate.
export const QUIZ_STORAGE_KEY = 'beautyx-guida-quiz-risposte'

// Evento custom disparato da Quiz.js quando il quiz viene completato, stesso
// pattern di CHANGE_EVENT in useWorkbookAnswer.js — permette a GuidaContent di
// reagire subito (sbloccare il Capitolo 1) senza bisogno di un reload.
export const QUIZ_CHANGE_EVENT = 'beautyx-quiz-change'

// Un quiz si considera "completato" solo se in localStorage e' presente un
// risultato con tante risposte quante sono le domande del quiz attuale —
// non basta la sola presenza della chiave (potrebbe essere un dato parziale
// o residuo di una versione precedente del quiz con un numero diverso di
// domande).
function leggiQuizCompletato() {
  try {
    const raw = window.localStorage.getItem(QUIZ_STORAGE_KEY)
    if (!raw) return false
    const parsed = JSON.parse(raw)
    const risposte = parsed && parsed.risposte
    if (!risposte || typeof risposte !== 'object') return false
    return Object.keys(risposte).length >= quizDomande.length
  } catch {
    return false
  }
}

// Hook: tiene traccia in tempo reale se il quiz diagnostico e' stato
// completato in questo browser. Usato da GuidaContent per decidere se il
// Capitolo 1 e' raggiungibile (vedi unlockedNumbers).
export function useQuizCompleted() {
  const [completato, setCompletato] = useState(false)

  useEffect(() => {
    setCompletato(leggiQuizCompletato())
    const onChange = () => setCompletato(leggiQuizCompletato())
    window.addEventListener(QUIZ_CHANGE_EVENT, onChange)
    return () => window.removeEventListener(QUIZ_CHANGE_EVENT, onChange)
  }, [])

  return completato
}
