'use client'

import { useEffect, useState } from 'react'

// Osserva una lista di id di sezione e restituisce quello attualmente piu' visibile,
// per evidenziare la voce corrispondente nel menu sticky dei capitoli.
export function useActiveSection(ids) {
  const [activeId, setActiveId] = useState(ids[0] || null)

  useEffect(() => {
    const elements = ids
      .map((id) => document.getElementById(id))
      .filter(Boolean)
    if (elements.length === 0) return

    const observer = new IntersectionObserver(
      (entries) => {
        const visible = entries
          .filter((e) => e.isIntersecting)
          .sort((a, b) => b.intersectionRatio - a.intersectionRatio)
        if (visible[0]) setActiveId(visible[0].target.id)
      },
      { threshold: [0.2, 0.4, 0.6], rootMargin: '-15% 0px -55% 0px' }
    )
    elements.forEach((el) => observer.observe(el))
    return () => observer.disconnect()
  }, [ids])

  return activeId
}
