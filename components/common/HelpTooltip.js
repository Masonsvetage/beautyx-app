'use client'
import { useState, useEffect, useRef } from 'react'
import { createPortal } from 'react-dom'

/**
 * HelpTooltip — bottone "?" contestuale con pannello informativo.
 *
 * Uso:
 *   <HelpTooltip
 *     title="Costo di esercizio"
 *     content="Il costo orario totale del centro, calcolato su affitto, utenze, personale e ammortamenti. Serve come base per calcolare il prezzo minimo sostenibile di ogni servizio."
 *     link="/guida#costo-esercizio"   // opzionale
 *   />
 *
 * Ogni volta che aggiungi una nuova funzione, aggiungi un HelpTooltip
 * vicino al titolo della sezione con title e content aggiornati.
 */
export default function HelpTooltip({ title, content, link, size = 'sm' }) {
  const [open, setOpen] = useState(false)
  const [pos, setPos] = useState({ top: 0, left: 0 })
  const btnRef = useRef(null)
  const panelRef = useRef(null)

  const toggle = () => {
    if (!open && btnRef.current) {
      const rect = btnRef.current.getBoundingClientRect()
      const panelW = 280
      let left = rect.left + window.scrollX
      // evita overflow a destra
      if (left + panelW > window.innerWidth - 16) {
        left = window.innerWidth - panelW - 16
      }
      setPos({ top: rect.bottom + window.scrollY + 6, left })
    }
    setOpen(o => !o)
  }

  // Chiudi cliccando fuori
  useEffect(() => {
    if (!open) return
    const handler = (e) => {
      if (panelRef.current && !panelRef.current.contains(e.target) &&
          btnRef.current && !btnRef.current.contains(e.target)) {
        setOpen(false)
      }
    }
    const esc = (e) => { if (e.key === 'Escape') setOpen(false) }
    document.addEventListener('mousedown', handler)
    document.addEventListener('keydown', esc)
    return () => {
      document.removeEventListener('mousedown', handler)
      document.removeEventListener('keydown', esc)
    }
  }, [open])

  const sizeClass = size === 'xs'
    ? 'w-4 h-4 text-[10px]'
    : 'w-5 h-5 text-xs'

  return (
    <>
      <button
        ref={btnRef}
        type="button"
        onClick={toggle}
        title={`Aiuto: ${title}`}
        className={`inline-flex items-center justify-center ${sizeClass} rounded-full bg-teal-800/60 hover:bg-teal-600 text-teal-300 hover:text-white border border-teal-600/50 hover:border-teal-400 transition-all flex-shrink-0 font-bold`}
        aria-label={`Aiuto: ${title}`}
      >
        ?
      </button>

      {open && typeof window !== 'undefined' && createPortal(
        <div
          ref={panelRef}
          className="fixed z-[9999] w-[280px] bg-slate-900 border border-teal-700/60 rounded-xl shadow-2xl p-4 space-y-2"
          style={{ top: pos.top, left: pos.left }}
        >
          <div className="flex items-start justify-between gap-2">
            <p className="text-sm font-semibold text-teal-300">{title}</p>
            <button
              type="button"
              onClick={() => setOpen(false)}
              className="text-slate-500 hover:text-slate-300 text-xs leading-none mt-0.5 flex-shrink-0"
            >✕</button>
          </div>
          <p className="text-xs text-slate-300 leading-relaxed">{content}</p>
          {link && (
            <a
              href={link}
              className="text-xs text-teal-400 hover:text-teal-300 underline"
              target="_blank" rel="noreferrer"
            >
              Approfondisci →
            </a>
          )}
          <div className="pt-1 border-t border-slate-800 flex items-center gap-1.5">
            <span className="text-[10px] text-slate-600">✨</span>
            <span className="text-[10px] text-slate-500 italic">
              Puoi chiedere a BeautyX per una spiegazione più dettagliata
            </span>
          </div>
        </div>,
        document.body
      )}
    </>
  )
}
