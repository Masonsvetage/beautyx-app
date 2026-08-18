'use client'

import { useState } from 'react'

// Menu sticky per saltare a un capitolo. Mostra Quiz (in apertura) + numeri 1-10.
// unlockedNumbers: Set<number> dei capitoli raggiungibili — il Capitolo 1 e'
// sbloccato solo dopo aver completato il quiz diagnostico, un capitolo N>1 solo
// se l'esercizio del capitolo N-1 e' stato compilato (vedi GuidaContent.js +
// useQuizCompleted / useWorkbookAnswer.useAllWorkbookAnswers). Il quiz stesso e'
// sempre raggiungibile (e' il primo step, non dipende da nulla).
export default function ChapterNav({ numeri, activeId, unlockedNumbers, onNavigate }) {
  const [open, setOpen] = useState(false)

  const items = [
    { id: 'quiz', label: 'Quiz', locked: false },
    ...numeri.map((n) => ({
      id: `capitolo-${n}`,
      label: String(n).padStart(2, '0'),
      locked: unlockedNumbers ? !unlockedNumbers.has(n) : false,
      lockedHint:
        n === 1
          ? 'Completa il quiz diagnostico per continuare'
          : 'Completa prima l’esercizio del capitolo precedente',
    })),
  ]

  const handleClick = (item) => {
    if (item.locked) return
    setOpen(false)
    const el = document.getElementById(item.id)
    if (el) el.scrollIntoView({ behavior: 'smooth', block: 'start' })
    onNavigate?.(item.id)
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
              onClick={() => handleClick(item)}
              disabled={item.locked}
              title={item.locked ? item.lockedHint : undefined}
              className={`px-2.5 py-1 rounded-full text-xs font-semibold transition-colors whitespace-nowrap flex items-center gap-1 ${
                item.locked
                  ? 'text-[#c2b896] cursor-not-allowed'
                  : activeId === item.id
                  ? 'bg-[#c9a34a] text-[#1a1a0f]'
                  : 'text-[#8a6d1f] hover:bg-[#eadfc4]'
              }`}
            >
              {item.locked && <span aria-hidden="true">🔒</span>}
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
                  onClick={() => handleClick(item)}
                  disabled={item.locked}
                  className={`px-2 py-1.5 rounded-lg text-xs font-semibold flex items-center justify-center gap-1 ${
                    item.locked
                      ? 'text-[#c2b896] cursor-not-allowed'
                      : activeId === item.id
                      ? 'bg-[#c9a34a] text-[#1a1a0f]'
                      : 'text-[#8a6d1f]'
                  }`}
                >
                  {item.locked && <span aria-hidden="true">🔒</span>}
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
