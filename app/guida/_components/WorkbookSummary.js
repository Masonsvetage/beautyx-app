'use client'

import { useEffect, useState } from 'react'
import { capitoli } from '@/lib/data/dieci-errori'
import { readAllWorkbookAnswers } from './useWorkbookAnswer'

// Riepilogo finale di tutte le risposte del workbook salvate in localStorage.
export default function WorkbookSummary() {
  const [risposte, setRisposte] = useState(null)

  useEffect(() => {
    setRisposte(readAllWorkbookAnswers(capitoli.map((c) => c.numero)))
  }, [])

  if (!risposte) return null

  const compilati = capitoli.filter((c) => (risposte[c.numero] || '').trim().length > 0)

  const scrollToChapter = (numero) => {
    const el = document.getElementById(`capitolo-${numero}`)
    if (el) el.scrollIntoView({ behavior: 'smooth', block: 'start' })
  }

  return (
    <div className="max-w-3xl mx-auto px-6 py-16">
      <p className="text-xs font-bold uppercase tracking-widest text-[#c9a34a] mb-3 text-center">
        Il tuo workbook
      </p>
      <h3
        className="text-2xl sm:text-3xl font-bold text-[#1a1a0f] mb-3 text-center leading-snug"
        style={{ fontFamily: 'var(--font-playfair), Georgia, serif' }}
      >
        Ecco tutto quello che hai scritto
      </h3>
      <p className="text-center text-[#6b6555] mb-10">
        {compilati.length === 0
          ? 'Non hai ancora compilato nessun esercizio — torna sui capitoli e prova a scrivere qualcosa, anche solo su uno.'
          : `Hai compilato ${compilati.length} esercizi su 10. Restano salvati in questo browser.`}
      </p>

      {compilati.length > 0 && (
        <div className="space-y-5">
          {compilati.map((c) => (
            <div key={c.numero} className="bg-white border border-[#e3d9c2] rounded-2xl p-6">
              <div className="flex items-center justify-between mb-3 gap-3 flex-wrap">
                <p className="text-xs font-bold uppercase tracking-widest text-[#c9a34a]">
                  Errore {String(c.numero).padStart(2, '0')} — {c.titolo}
                </p>
                <button
                  onClick={() => scrollToChapter(c.numero)}
                  className="text-xs font-semibold text-[#a97e1f] hover:underline shrink-0"
                >
                  Rivedi capitolo ↑
                </button>
              </div>
              <p className="text-[#2a2a1f] text-sm leading-relaxed whitespace-pre-wrap">
                {risposte[c.numero]}
              </p>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
