'use client'

import { useReveal } from './useReveal'

const OFFSETS = {
  up: 'translateY(28px)',
  left: 'translateX(-28px)',
  right: 'translateX(28px)',
  none: 'none',
}

// Wrapper generico per il reveal-on-scroll dei blocchi di testo/immagine.
// direction: 'up' | 'left' | 'right' | 'none'
export default function RevealBlock({ children, direction = 'up', delay = 0, className = '' }) {
  const [ref, visible] = useReveal({ threshold: 0.12 })
  const offset = OFFSETS[direction] || OFFSETS.up

  return (
    <div
      ref={ref}
      className={className}
      style={{
        opacity: visible ? 1 : 0,
        transform: visible ? 'none' : offset,
        transition: `opacity 700ms ease-out ${delay}ms, transform 700ms ease-out ${delay}ms`,
        willChange: 'opacity, transform',
      }}
    >
      {children}
    </div>
  )
}
