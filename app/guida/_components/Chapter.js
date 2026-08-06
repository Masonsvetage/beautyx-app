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

      {/* ── NARRAZIONE + IMMAGINE STICKY (due colonne da tablet in su) ── */}
      <div className="max-w-5xl mx-auto px-6 py-16">
        <RevealBlock>
          <p className="text-xs font-bold uppercase tracking-widest text-[#c9a34a] mb-6">
            Narrazione e il danno
          </p>
        </RevealBlock>

        <div className="grid md:grid-cols-2 md:gap-10 items-start">

          {/* Colonna immagine — sticky solo da md in su */}
          <div className="mb-10 md:mb-0">
            <div className="md:sticky md:top-24">
              <RevealBlock direction="up">
                <div className="relative rounded-2xl overflow-hidden border border-[#e3d9c2] bg-[#f5f1ea]">
                  <Image
                    src={`/guida/errore-${numeroPad}-narrazione.png`}
                    alt={`Illustrazione errore ${numero}: ${titolo}`}
                    width={800}
                    height={450}
                    className="w-full h-auto"
                    sizes="(max-width: 768px) 100vw, 50vw"
                  />
                  {/* Badge N/10 con barra segmenti */}
                  <div className="absolute bottom-3 left-3 flex items-center gap-2 rounded-full bg-[#1a1a0f]/80 backdrop-blur-sm pl-3 pr-2.5 py-1.5">
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
              </RevealBlock>
            </div>
          </div>

          {/* Colonna testo — scorre normalmente */}
          <div>
            <div className="max-w-2xl">
              <RevealBlock delay={80}>
                <p className="guida-drop-cap text-[#2a2a1f] text-[1.12rem] leading-[1.95] mb-6">
                  <RichText text={primoParagrafo} />
                </p>
              </RevealBlock>

              {paragrafiCentrali.length > 0 && (
                <div className="space-y-6">
                  {paragrafiCentrali.map((p, i) => (
                    <RevealBlock key={i} delay={i * 60}>
                      <p className="text-[#2a2a1f] text-[1.05rem] leading-[1.85]">
                        <RichText text={p} />
                      </p>
                    </RevealBlock>
                  ))}
                </div>
              )}
            </div>

            {/* Pull-quote — rompe la larghezza della colonna standard */}
            {citazione && (
              <RevealBlock delay={140}>
                <blockquote className="my-10 border-l-4 border-[#c9a34a] pl-6 py-1">
                  <p
                    className="text-[1.8rem] sm:text-[2.1rem] leading-[1.2] text-[#8a6d1f]"
                    style={{ fontFamily: 'var(--font-playfair), Georgia, serif' }}
                  >
                    &ldquo;{citazione}&rdquo;
                  </p>
                </blockquote>
              </RevealBlock>
            )}

            {ultimoParagrafo && (
              <div className="max-w-2xl">
                <RevealBlock delay={200}>
                  <p className="pl-5 border-l-2 border-[#c9a34a]/70 text-[#2a2a1f] text-[1.05rem] leading-[1.85] italic">
                    <RichText text={ultimoParagrafo} />
                  </p>
                </RevealBlock>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* ── IL CASO PRATICO — cambio di registro edge-to-edge ── */}
      <div className="bg-[#efe6d2]">
        <div className="max-w-3xl mx-auto px-6 py-16">
          <RevealBlock>
            <span className="inline-flex items-center gap-2 mb-6 px-3 py-1.5 rounded-full bg-[#dcc9a0]/70">
              <span className="block w-1.5 h-1.5 rounded-full bg-[#8a6d1f]" />
              <span className="text-xs font-bold uppercase tracking-widest text-[#5c4a1f]">
                Il caso pratico
              </span>
            </span>
          </RevealBlock>
          <div className="space-y-6">
            {casoPratico.map((p, i) => (
              <RevealBlock key={i} delay={i * 60}>
                <p className="text-[#2a2a1f] text-[1.02rem] leading-[1.8]">
                  <RichText text={p} />
                </p>
              </RevealBlock>
            ))}
          </div>
        </div>
      </div>

      {/* ── WORKBOOK — istruzioni (scorrono) + pannello esercizio ancorato ── */}
      <div className="bg-[#1a1a0f]">
        <div className="max-w-3xl mx-auto px-6 pt-16 pb-8">
          <RevealBlock>
            <p className="text-xs font-bold uppercase tracking-widest text-[#c9a34a] mb-2">
              L&apos;esercizio pratico — da domani
            </p>
            <h3 className="text-[#f5f1ea] text-xl sm:text-2xl font-bold mb-6" style={{ fontFamily: 'var(--font-playfair), Georgia, serif' }}>
              {esercizioLabel}
            </h3>
          </RevealBlock>

          <RevealBlock delay={60}>
            <div className="mb-8 rounded-2xl overflow-hidden border border-[#c9a34a]/70 bg-[#242417]">
              <Image
                src={`/guida/errore-${numeroPad}-workbook.png`}
                alt={`Illustrazione esercizio pratico errore ${numero}: ${titolo}`}
                width={800}
                height={450}
                className="w-full h-auto"
                sizes="(max-width: 768px) 100vw, 768px"
              />
            </div>
          </RevealBlock>

          <div className="space-y-5">
            {esercizio.map((p, i) => (
              <RevealBlock key={i} delay={80 + i * 60}>
                <p className="text-[#cfc6b0] text-[1rem] leading-[1.8]">
                  <RichText text={p} />
                </p>
              </RevealBlock>
            ))}
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
