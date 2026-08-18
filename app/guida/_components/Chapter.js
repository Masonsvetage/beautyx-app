'use client'

import Image from 'next/image'
import RevealBlock from './RevealBlock'
import RichText from './RichText'
import { useWorkbookAnswer, MIN_UNLOCK_CHARS } from './useWorkbookAnswer'

export default function Chapter({ capitolo, totaleCapitoli = 10 }) {
  const { numero, titolo, narrazione, casoPratico, esercizio, esercizioLabel, esercizioPrompt, citazione } = capitolo
  const { value, update, saved } = useWorkbookAnswer(numero)
  const numeroPad = String(numero).padStart(2, '0')
  const ultimoCapitolo = numero >= totaleCapitoli
  const sbloccato = value.trim().length > MIN_UNLOCK_CHARS
  const prossimoId = ultimoCapitolo ? 'conclusione' : `capitolo-${numero + 1}`

  const primoParagrafo = narrazione[0]
  const ultimoParagrafo = narrazione.length > 1 ? narrazione[narrazione.length - 1] : null
  const paragrafiCentrali = narrazione.length > 2 ? narrazione.slice(1, -1) : []

  const vaiAlProssimo = () => {
    if (!sbloccato) return
    const el = document.getElementById(prossimoId)
    if (el) el.scrollIntoView({ behavior: 'smooth', block: 'start' })
  }

  return (
    <section id={`capitolo-${numero}`} className="scroll-mt-24">

      {/* ── SCENA DI APERTURA — titolo a schermo pieno con dissolvenza ── */}
      <div className="relative min-h-[70vh] md:min-h-[85vh] flex items-center justify-center overflow-hidden bg-[#1a1a0f]">
        <div className="absolute inset-0 opacity-30 bg-[radial-gradient(ellipse_at_center,_rgba(201,163,74,0.35)_0%,_transparent_65%)]" />
        <RevealBlock direction="up" className="relative text-center px-6 max-w-3xl">
          <span className="block text-[#c9a34a] font-semibold text-sm tracking-[0.25em] uppercase mb-4">
            Errore {numeroPad} / {String(totaleCapitoli).padStart(2, '0')}
          </span>
          <h2
            className="text-3xl sm:text-5xl font-black text-[#f5f1ea] leading-tight"
            style={{ fontFamily: 'var(--font-playfair), Georgia, serif' }}
          >
            {titolo}
          </h2>
        </RevealBlock>
      </div>

      {/* ── NARRAZIONE + CASO PRATICO — sfondo fisso (sticky), stessa illustrazione ──
          Pattern: niente background-attachment:fixed (rotto su iOS Safari). Il
          layer immagine e' position:sticky dentro un contenitore alto (min-h
          160vh+), il layer di testo lo segue in flusso normale con un
          margin-top negativo pari a 100vh, cosi' scorre visivamente sopra
          l'immagine agganciata finche' il contenitore non finisce. */}
      <div className="relative min-h-[170vh] bg-[#1a1a0f]">
        {/* Layer immagine agganciato */}
        <div className="sticky top-0 h-screen w-full overflow-hidden">
          <Image
            src={`/guida/errore-${numeroPad}-narrazione.png`}
            alt={`Illustrazione errore ${numero}: ${titolo}`}
            fill
            className="object-cover"
            sizes="100vw"
            priority={numero === 1}
          />
          {/* Velo uniforme brand (piu' scuro su schermi stretti) */}
          <div className="absolute inset-0 bg-[#1a1a0f]/40 sm:bg-[#1a1a0f]/35" />
          {/* Gradiente aggiuntivo: scuro dietro la zona testo (basso), libero di
              "respirare" verso l'alto dove non c'e' testo */}
          <div className="absolute inset-0 bg-gradient-to-t from-[#1a1a0f]/85 via-[#1a1a0f]/40 to-transparent" />

          {/* Badge numero capitolo — angolo fisso in alto a destra del viewport */}
          <div className="absolute top-4 right-4 sm:top-6 sm:right-6 flex items-center gap-2 rounded-full bg-[#1a1a0f]/80 backdrop-blur-sm pl-3 pr-2.5 py-1.5">
            <span className="text-[#e8c874] text-xs font-bold tracking-wide tabular-nums">
              {numeroPad} / {String(totaleCapitoli).padStart(2, '0')}
            </span>
            <div className="flex items-center gap-0.5">
              {Array.from({ length: totaleCapitoli }).map((_, i) => (
                <span
                  key={i}
                  className={`block w-1.5 h-1.5 rounded-full ${i < numero ? 'bg-[#c9a34a]' : 'bg-white/25'}`}
                />
              ))}
            </div>
          </div>
        </div>

        {/* Layer di testo — scorre in flusso normale sopra l'immagine agganciata */}
        <div className="relative z-10 -mt-[100vh]">

          {/* Narrazione — card chiara ancorata nella meta' inferiore del viewport */}
          <div className="min-h-screen flex items-end justify-center px-5 sm:px-10 pb-14 sm:pb-20">
            <div className="max-w-xl sm:max-w-2xl w-full rounded-2xl border border-[#c9a34a]/30 shadow-xl shadow-black/20 bg-[#f5f1ea]/35 backdrop-blur-md text-shadow-[0_1px_3px_rgba(245,241,234,0.85)] p-8 sm:p-12">
              <p className="text-xs font-bold uppercase tracking-widest text-[#c9a34a] mb-6">
                Narrazione e il danno
              </p>

              <RevealBlock>
                <p className="guida-drop-cap text-[#2a2a1f] text-[1.08rem] leading-[1.9] mb-6">
                  <RichText text={primoParagrafo} />
                </p>
              </RevealBlock>

              {paragrafiCentrali.length > 0 && (
                <div className="space-y-5">
                  {paragrafiCentrali.map((p, i) => (
                    <RevealBlock key={i} delay={i * 60}>
                      <p className="text-[#2a2a1f] text-[1rem] leading-[1.8]">
                        <RichText text={p} />
                      </p>
                    </RevealBlock>
                  ))}
                </div>
              )}

              {/* Pull-quote */}
              {citazione && (
                <RevealBlock delay={140}>
                  <blockquote className="my-8 border-l-4 border-[#c9a34a] pl-5 py-1">
                    <p
                      className="text-[1.5rem] sm:text-[1.8rem] leading-[1.25] text-[#8a6d1f]"
                      style={{ fontFamily: 'var(--font-playfair), Georgia, serif' }}
                    >
                      &ldquo;{citazione}&rdquo;
                    </p>
                  </blockquote>
                </RevealBlock>
              )}

              {ultimoParagrafo && (
                <RevealBlock delay={200}>
                  <p className="pl-5 border-l-2 border-[#c9a34a]/70 text-[#2a2a1f] text-[1rem] leading-[1.8] italic mt-2">
                    <RichText text={ultimoParagrafo} />
                  </p>
                </RevealBlock>
              )}
            </div>
          </div>

          {/* Il caso pratico — stessa storia, stessa illustrazione di sfondo */}
          <div className="min-h-screen flex items-end justify-center px-5 sm:px-10 pb-14 sm:pb-20">
            <div className="max-w-xl sm:max-w-2xl w-full rounded-2xl border border-[#c9a34a]/30 shadow-xl shadow-black/20 bg-[#f5f1ea]/35 backdrop-blur-md text-shadow-[0_1px_3px_rgba(245,241,234,0.85)] p-8 sm:p-12">
              <RevealBlock>
                <span className="inline-flex items-center gap-2 mb-6 px-3 py-1.5 rounded-full bg-[#dcc9a0]/70">
                  <span className="block w-1.5 h-1.5 rounded-full bg-[#8a6d1f]" />
                  <span className="text-xs font-bold uppercase tracking-widest text-[#5c4a1f]">
                    Il caso pratico
                  </span>
                </span>
              </RevealBlock>
              <div className="space-y-5">
                {casoPratico.map((p, i) => (
                  <RevealBlock key={i} delay={i * 60}>
                    <p className="text-[#2a2a1f] text-[0.98rem] leading-[1.8]">
                      <RichText text={p} />
                    </p>
                  </RevealBlock>
                ))}
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* ── WORKBOOK — sfondo fisso (sticky) con la seconda illustrazione, fino
          alla barra di risposta ancorata in fondo ── */}
      <div className="relative min-h-[150vh] bg-[#1a1a0f]">
        {/* Layer immagine agganciato */}
        <div className="sticky top-0 h-screen w-full overflow-hidden">
          <Image
            src={`/guida/errore-${numeroPad}-workbook.png`}
            alt={`Illustrazione esercizio pratico errore ${numero}: ${titolo}`}
            fill
            className="object-cover"
            sizes="100vw"
          />
          <div className="absolute inset-0 bg-[#1a1a0f]/45 sm:bg-[#1a1a0f]/40" />
          <div className="absolute inset-0 bg-gradient-to-t from-[#1a1a0f]/90 via-[#1a1a0f]/50 to-transparent" />
        </div>

        {/* Layer di testo — card scura, coerente con lo stile della barra risposta */}
        <div className="relative z-10 -mt-[100vh]">
          <div className="min-h-screen flex items-end justify-center px-5 sm:px-10 pb-14 sm:pb-20">
            <div className="max-w-xl sm:max-w-2xl w-full rounded-2xl border border-[#c9a34a]/30 shadow-xl shadow-black/40 bg-[#14140b]/35 backdrop-blur-md text-shadow-[0_1px_3px_rgba(0,0,0,0.7)] p-8 sm:p-12">
              <RevealBlock>
                <p className="text-xs font-bold uppercase tracking-widest text-[#c9a34a] mb-2">
                  L&apos;esercizio pratico — da domani
                </p>
                <h3 className="text-[#f5f1ea] text-xl sm:text-2xl font-bold mb-6" style={{ fontFamily: 'var(--font-playfair), Georgia, serif' }}>
                  {esercizioLabel}
                </h3>
              </RevealBlock>

              <div className="space-y-5">
                {esercizio.map((p, i) => (
                  <RevealBlock key={i} delay={80 + i * 60}>
                    <p className="text-[#cfc6b0] text-[0.98rem] leading-[1.8]">
                      <RichText text={p} />
                    </p>
                  </RevealBlock>
                ))}
              </div>
            </div>
          </div>
        </div>

        {/* Pannello ancorato: resta visibile finche' non si passa al capitolo successivo */}
        <div className="sticky bottom-0 z-30 border-t-2 border-[#c9a34a] bg-[#14140b]/97 backdrop-blur-md shadow-[0_-12px_30px_rgba(0,0,0,0.4)]">
          <div className="max-w-3xl mx-auto px-6 py-4 sm:py-5">
            <label className="block text-[#e8c874] text-sm font-semibold mb-2">
              {esercizioPrompt}
            </label>
            <textarea
              value={value}
              onChange={(e) => update(e.target.value)}
              rows={3}
              placeholder="Scrivi qui la tua risposta — resta salvata in questo browser..."
              className="w-full rounded-xl border-2 border-[#c9a34a]/50 bg-[#242417] text-[#f5f1ea] placeholder-[#7a7566] p-3 text-[0.95rem] leading-relaxed outline-none focus:border-[#c9a34a] transition-colors resize-y"
            />
            <div className="flex items-center justify-between gap-3 mt-3 flex-wrap">
              <span className={`text-xs transition-opacity ${value ? (saved ? 'opacity-100 text-[#c9a34a]' : 'opacity-60 text-[#cfc6b0]') : 'opacity-0'}`}>
                ✓ Salvato in locale
              </span>
              <button
                type="button"
                onClick={vaiAlProssimo}
                disabled={!sbloccato}
                aria-disabled={!sbloccato}
                className={`px-5 py-2.5 rounded-xl text-sm font-bold transition-colors whitespace-nowrap ${
                  sbloccato
                    ? 'bg-[#c9a34a] hover:bg-[#e8c874] text-[#1a1a0f] cursor-pointer'
                    : 'bg-[#3a3a2c] text-[#7a7566] cursor-not-allowed'
                }`}
              >
                {ultimoCapitolo ? 'Vai alla conclusione →' : 'Capitolo successivo →'}
              </button>
            </div>
            {!sbloccato && (
              <p className="text-xs text-[#a08e5e] mt-2">
                Scrivi almeno qualche parola qui sopra per sbloccare {ultimoCapitolo ? 'la conclusione' : 'il capitolo successivo'}.
              </p>
            )}
          </div>
        </div>
      </div>
    </section>
  )
}
