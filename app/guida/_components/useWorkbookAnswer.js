'use client'

import { useEffect, useRef, useState } from 'react'

const STORAGE_PREFIX = 'beautyx-guida-esercizio-'

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
