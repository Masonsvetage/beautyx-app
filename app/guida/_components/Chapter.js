'use client'

import Image from 'next/image'
import RevealBlock from './RevealBlock'
import RichText from './RichText'
import { useWorkbookAnswer } from './useWorkbookAnswer'

export default function Chapter({ capitolo }) {
  const { numero, titolo, narrazione, casoPratico, esercizio, esercizioLabel, esercizioPrompt } = capitolo
  const { value, update, saved } = useWorkbookAnswer(numero)
  const numeroPad = String(numero).padStart(2, '0')

  return (
    <section id={`capitolo-${numero}`} className="scroll-mt-24">

      {/* ── SCENA DI APERTURA — titolo a schermo pieno con dissolvenza ── */}
      <div className="relative min-h-[70vh] md:min-h-[85vh] flex items-center justify-center overflow-hidden bg-[#1a1a0f]">
        <div className="absolute inset-0 opacity-30 bg-[radial-gradient(ellipse_at_center,_rgba(201,163,74,0.35)_0%,_transparent_65%)]" />
        <RevealBlock direction="up" className="relative text-center px-6 max-w-3xl">
          <span className="block text-[#c9a34a] font-semibold text-sm tracking-[0.25em] uppercase mb-4">
            Errore {numeroPad} / 10
          </span>
          <h2
            className="text-3xl sm:text-5xl font-black text-[#f5f1ea] leading-tight"
            style={{ fontFamily: 'var(--font-playfair), Georgia, serif' }}
          >
            {titolo}
          </h2>
        </RevealBlock>
      </div>

      {/* ── NARRAZIONE + IL DANNO ── */}
      <div className="max-w-3xl mx-auto px-6 py-16">
        <RevealBlock direction="up">
          <div className="mb-10 rounded-2xl overflow-hidden border border-[#e3d9c2] bg-[#f5f1ea]">
            <Image
              src={`/guida/errore-${numeroPad}-narrazione.png`}
              alt={`Illustrazione errore ${numero}: ${titolo}`}
              width={800}
              height={450}
              className="w-full h-auto"
              sizes="(max-width: 768px) 100vw, 768px"
            />
          </div>
        </RevealBlock>

        <RevealBlock delay={80}>
          <p className="text-xs font-bold uppercase tracking-widest text-[#c9a34a] mb-4">
            Narrazione e il danno
          </p>
        </RevealBlock>

        <div className="space-y-6">
          {narrazione.map((p, i) => (
            <RevealBlock key={i} delay={i * 60}>
              <p className="text-[#2a2a1f] text-[1.05rem] leading-[1.85]">
                <RichText text={p} />
              </p>
            </RevealBlock>
          ))}
        </div>
      </div>

      {/* ── IL CASO PRATICO ── */}
      <div className="max-w-3xl mx-auto px-6 pb-16">
        <RevealBlock>
          <p className="text-xs font-bold uppercase tracking-widest text-[#c9a34a] mb-4">
            Il caso pratico
          </p>
        </RevealBlock>
        <div className="space-y-6 bg-white/60 border border-[#e3d9c2] rounded-2xl p-6 sm:p-8">
          {casoPratico.map((p, i) => (
            <RevealBlock key={i} delay={i * 60}>
              <p className="text-[#2a2a1f] text-[1.02rem] leading-[1.8]">
                <RichText text={p} />
              </p>
            </RevealBlock>
          ))}
        </div>
      </div>

      {/* ── WORKBOOK — esercizio compilabile + immagine dedicata ── */}
      <div className="bg-[#1a1a0f] py-16 px-6">
        <div className="max-w-3xl mx-auto">
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

          <div className="space-y-5 mb-8">
            {esercizio.map((p, i) => (
              <RevealBlock key={i} delay={80 + i * 60}>
                <p className="text-[#cfc6b0] text-[1rem] leading-[1.8]">
                  <RichText text={p} />
                </p>
              </RevealBlock>
            ))}
          </div>

          <RevealBlock delay={140}>
            <label className="block text-[#e8c874] text-sm font-semibold mb-2">
              {esercizioPrompt}
            </label>
            <textarea
              value={value}
              onChange={(e) => update(e.target.value)}
              rows={6}
              placeholder="Scrivi qui la tua risposta — resta salvata in questo browser..."
              className="w-full rounded-xl border-2 border-[#c9a34a]/50 bg-[#242417] text-[#f5f1ea] placeholder-[#7a7566] p-4 text-[0.95rem] leading-relaxed outline-none focus:border-[#c9a34a] transition-colors resize-y"
            />
            <div className="flex items-center gap-2 mt-2 h-4">
              {value && (
                <span className={`text-xs transition-opacity ${saved ? 'opacity-100 text-[#c9a34a]' : 'opacity-0'}`}>
                  ✓ Salvato in locale
                </span>
              )}
            </div>
          </RevealBlock>
        </div>
      </div>
    </section>
  )
}
