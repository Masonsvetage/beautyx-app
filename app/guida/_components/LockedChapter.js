'use client'

// Placeholder "onesto" per un capitolo non ancora raggiungibile. Sostituisce il
// rendering completo del <Chapter/> finche' l'esercizio del capitolo precedente
// non e' stato compilato (vedi unlockedNumbers in GuidaContent.js). Mantiene lo
// stesso id `capitolo-${numero}` del capitolo reale cosi' i link di ChapterNav e
// lo scroll "Capitolo successivo" del capitolo precedente continuano a puntare
// a un elemento esistente nel DOM — solo che qui non c'e' contenuto pieno da
// scorrere oltre: e' un muro reale, non un avviso visivo su un pulsante.
export default function LockedChapter({ numero, titolo, totaleCapitoli = 10 }) {
  const numeroPad = String(numero).padStart(2, '0')

  return (
    <section id={`capitolo-${numero}`} className="scroll-mt-24">
      <div className="relative min-h-[45vh] flex items-center justify-center overflow-hidden bg-[#1a1a0f] px-6 text-center">
        <div className="absolute inset-0 opacity-20 bg-[radial-gradient(ellipse_at_center,_rgba(201,163,74,0.25)_0%,_transparent_65%)]" />
        <div className="relative max-w-md">
          <span className="inline-flex items-center gap-2 text-[#8a7a4a] font-semibold text-sm tracking-[0.25em] uppercase mb-4">
            <span aria-hidden="true">🔒</span>
            Errore {numeroPad} / {String(totaleCapitoli).padStart(2, '0')}
          </span>
          <h2
            className="text-2xl sm:text-3xl font-black text-[#4a4736] leading-tight blur-[4px] select-none"
            style={{ fontFamily: 'var(--font-playfair), Georgia, serif' }}
            aria-hidden="true"
          >
            {titolo}
          </h2>
          <p className="mt-6 text-[#cfc6b0] text-sm leading-relaxed">
            Completa l&apos;esercizio del capitolo precedente per continuare.
          </p>
        </div>
      </div>
    </section>
  )
}
