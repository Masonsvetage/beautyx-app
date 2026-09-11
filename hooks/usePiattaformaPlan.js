'use client'

import { useState, useEffect } from 'react'
import { useAuth } from '@/contexts/AuthContext'
import { isPiattaformaPlanCodice } from '@/lib/platformPlan'

// Hook condiviso — stesso meccanismo introdotto in app/dashboard/page.js il
// 04/09/2026 (fetch di /api/subscriptions/balance per sapere il piano reale
// dell'utente), estratto qui perché va riusato anche da components/Navbar.js
// (per nascondere i LINK ai moduli gestionali) e dalle pagine gestionali
// stesse (/movimenti, /analytics, /obiettivi, /pianificazione, /centro,
// /strategie — per bloccare l'accesso diretto via URL, non solo il click
// dal menu). Vedi lib/platformPlan.js per il perché di questa regola.
//
// planLoaded distingue "ancora non so" da "so che non ha piano piattaforma":
// finché non è true, i chiamanti devono trattare l'utente come SENZA
// accesso ai moduli gestionali (default-deny), per non fare un flash del
// contenuto pieno seguito da uno sparire/redirect.
export function usePiattaformaPlan() {
  const { isAdmin, isHpa, currentCentro, profile } = useAuth()
  const centroId = currentCentro?.centro_id || profile?.centro_id || null

  const [planCodice, setPlanCodice] = useState(null)
  const [planLoaded, setPlanLoaded] = useState(false)

  useEffect(() => {
    // Admin e HPA non hanno un piano "cliente" — hanno sempre accesso ai
    // moduli gestionali dei centri che gestiscono (stesso comportamento già
    // in vigore per i widget della dashboard).
    if (isAdmin || isHpa) {
      setPlanLoaded(true)
      return
    }
    if (!centroId) return

    let cancelled = false
    fetch('/api/subscriptions/balance')
      .then(r => (r.ok ? r.json() : null))
      .then(data => { if (!cancelled) setPlanCodice(data?.plan?.codice || null) })
      .catch(() => {})
      .finally(() => { if (!cancelled) setPlanLoaded(true) })

    return () => { cancelled = true }
  }, [isAdmin, isHpa, centroId])

  const hasPiattaformaPlan = isAdmin || isHpa || (planLoaded && isPiattaformaPlanCodice(planCodice))

  return { planCodice, planLoaded, hasPiattaformaPlan }
}
