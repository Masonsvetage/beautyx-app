'use client'

import { useEffect, useRef, useState } from 'react'

const STORAGE_PREFIX = 'beautyx-guida-esercizio-'
const CHANGE_EVENT = 'beautyx-workbook-change'

// Numero minimo di caratteri (dopo trim) perche' un esercizio conti come "compilato"
// e sblocchi il capitolo successivo. Vedi Chapter.js e ChapterNav.js.
export const MIN_UNLOCK_CHARS = 15

export function workbookKey(numero) {
  return `${STORAGE_PREFIX}${numero}`
}

// Persiste la risposta del workbook di un capitolo in localStorage.
// NB: solo localStorage per ora — nessuna persistenza Supabase (vedi report finale).
export function useWorkbookAnswer(numero) {
  const [value, setValue] = useState('')
  const [saved, setSaved] = useState(false)
  const saveTimeout = useRef(null)

  useEffect(() => {
    try {
      const stored = window.localStorage.getItem(workbookKey(numero))
      if (stored !== null) setValue(stored)
    } catch {
      // localStorage non disponibile (privacy mode, SSR, ecc.) — nessun crash
    }
  }, [numero])

  const update = (next) => {
    setValue(next)
    setSaved(false)
    if (saveTimeout.current) clearTimeout(saveTimeout.current)
    saveTimeout.current = setTimeout(() => {
      try {
        window.localStorage.setItem(workbookKey(numero), next)
        setSaved(true)
        // Notifica altri componenti (es. ChapterNav) che lo stato di sblocco puo' essere cambiato.
        window.dispatchEvent(new CustomEvent(CHANGE_EVENT, { detail: { numero, value: next } }))
      } catch {
        // ignora — niente persistenza possibile in questo browser
      }
    }, 500)
  }

  return { value, update, saved }
}

// Legge tutte le risposte salvate per il riepilogo finale (client-side only).
export function readAllWorkbookAnswers(numeri) {
  const out = {}
  numeri.forEach((n) => {
    try {
      const v = window.localStorage.getItem(workbookKey(n))
      out[n] = v || ''
    } catch {
      out[n] = ''
    }
  })
  return out
}

// Hook condiviso: tiene traccia in tempo reale di tutte le risposte del workbook,
// aggiornandosi quando useWorkbookAnswer salva un nuovo valore in un altro capitolo.
// Usato da GuidaContent per calcolare quali capitoli sono sbloccati nel ChapterNav.
export function useAllWorkbookAnswers(numeri) {
  const key = numeri.join(',')
  const [risposte, setRisposte] = useState({})

  useEffect(() => {
    setRisposte(readAllWorkbookAnswers(numeri))
    const onChange = (e) => {
      const { numero, value } = e.detail || {}
      if (numero === undefined) return
      setRisposte((prev) => ({ ...prev, [numero]: value }))
    }
    window.addEventListener(CHANGE_EVENT, onChange)
    return () => window.removeEventListener(CHANGE_EVENT, onChange)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [key])

  return risposte
}
