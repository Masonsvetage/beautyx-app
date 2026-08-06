'use client'

import { useState } from 'react'

// Menu sticky per saltare a un capitolo. Mostra i numeri 1-10 + Quiz.
export default function ChapterNav({ numeri, activeId, onNavigate }) {
  const [open, setOpen] = useState(false)

  const items = [
    ...numeri.map((n) => ({ id: `capitolo-${n}`, label: String(n).padStart(2, '0') })),
    { id: 'quiz-finale', label: 'Quiz' },
  ]

  const handleClick = (id) => {
    setOpen(false)
    const el = document.getElementById(id)
    if (el) el.scrollIntoView({ behavior: 'smooth', block: 'start' })
    onNavigate?.(id)
  }

  return (
    <nav className="sticky top-1.5 z-50 bg-[#f5f1ea]/95 backdrop-blur-sm border-b border-[#e3d9c2]">
      <div className="max-w-5xl mx-auto px-4 py-2 flex items-center justify-between gap-3">
        <span className="text-xs font-semibold uppercase tracking-wider text-[#8a6d1f] shrink-0">
          10 errori
        </span>

        {/* Desktop: pillole in riga */}
        <div className="hidden md:flex items-center gap-1.5 overflow-x-auto">
          {items.map((item) => (
            <button
              key={item.id}
              onClick={() => handleClick(item.id)}
              className={`px-2.5 py-1 rounded-full text-xs font-semibold transition-colors whitespace-nowrap ${
                activeId === item.id
                  ? 'bg-[#c9a34a] text-[#1a1a0f]'
                  : 'text-[#8a6d1f] hover:bg-[#eadfc4]'
              }`}
            >
              {item.label}
            </button>
          ))}
        </div>

        {/* Mobile: dropdown compatto */}
        <div className="md:hidden relative">
          <button
            onClick={() => setOpen((o) => !o)}
            className="px-3 py-1.5 rounded-full text-xs font-semibold bg-[#eadfc4] text-[#8a6d1f]"
          >
            Vai a ▾
          </button>
          {open && (
            <div className="absolute right-0 mt-2 bg-white border border-[#e3d9c2] rounded-xl shadow-lg p-2 grid grid-cols-4 gap-1 w-52">
              {items.map((item) => (
                <button
                  key={item.id}
                  onClick={() => handleClick(item.id)}
                  className={`px-2 py-1.5 rounded-lg text-xs font-semibold ${
                    activeId === item.id ? 'bg-[#c9a34a] text-[#1a1a0f]' : 'text-[#8a6d1f]'
                  }`}
                >
                  {item.label}
                </button>
              ))}
            </div>
          )}
        </div>
      </div>
    </nav>
  )
}
