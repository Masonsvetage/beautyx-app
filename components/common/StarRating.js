'use client'

import { useState } from 'react'

const LABELS = { 1: 'Pessimo', 2: 'Scarso', 3: 'Nella norma', 4: 'Buono', 5: 'Eccellente' }

export default function StarRating({
  value = 0,
  onChange,
  size = 'md',
  showLabel = false,
  readonly = false
}) {
  const [hovered, setHovered] = useState(null)
  const display = hovered ?? value
  const interactive = !!onChange && !readonly

  const sizes = {
    sm: 'w-4 h-4',
    md: 'w-6 h-6',
    lg: 'w-8 h-8',
    xl: 'w-10 h-10'
  }

  return (
    <div className="flex items-center gap-1">
      {[1, 2, 3, 4, 5].map(star => (
        <button
          key={star}
          type="button"
          onClick={() => interactive && onChange(star)}
          onMouseEnter={() => interactive && setHovered(star)}
          onMouseLeave={() => interactive && setHovered(null)}
          className={interactive ? 'cursor-pointer focus:outline-none' : 'cursor-default'}
          disabled={!interactive}
          tabIndex={interactive ? 0 : -1}
        >
          <svg
            className={`${sizes[size]} transition-all duration-100 ${
              star <= display
                ? hovered && interactive
                  ? 'text-amber-300 scale-110'
                  : 'text-amber-400'
                : 'text-slate-600'
            }`}
            fill="currentColor"
            viewBox="0 0 24 24"
          >
            <path d="M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z" />
          </svg>
        </button>
      ))}
      {showLabel && display > 0 && (
        <span className="ml-2 text-sm text-amber-300 font-medium">{LABELS[display]}</span>
      )}
    </div>
  )
}

// Componente display compatto: "★ 4.3 (12)"
export function StarBadge({ avg, count, size = 'sm' }) {
  if (!avg || avg === 0) return <span className="text-slate-500 text-xs">Nessuna valutazione</span>

  const filled = Math.round(avg)
  return (
    <div className="flex items-center gap-1.5">
      <StarRating value={filled} size={size} readonly />
      <span className="text-amber-400 font-semibold text-sm">{avg.toFixed(1)}</span>
      {count !== undefined && (
        <span className="text-slate-400 text-xs">({count})</span>
      )}
    </div>
  )
}
