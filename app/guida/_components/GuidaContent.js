'use client'

import Image from 'next/image'
import { capitoli, premessa, patto, percorso, conclusione } from '@/lib/data/dieci-errori'
import ProgressBar from './ProgressBar'
import ChapterNav from './ChapterNav'
import RevealBlock from './RevealBlock'
import RichText from './RichText'
import Chapter from './Chapter'
import LockedChapter from './LockedChapter'
import Quiz from './Quiz'
import WorkbookSummary from './WorkbookSummary'
import { useActiveSection } from './useActiveSection'
import { useAllWorkbookAnswers, MIN_UNLOCK_CHARS, workbookKey } from './useWorkbookAnswer'
import { useQuizCompleted, QUIZ_STORAGE_KEY } from './useQuizCompleted'

const CHAPTER_NUMBERS = capitoli.map((c) => c.numero)
const CHAPTER_IDS = CHAPTER_NUMBERS.map((n) => `capitolo-${n}`)
const ALL_NAV_IDS = ['quiz', ...CHAPTER_IDS]

export default function GuidaContent() {
  const activeId = useActiveSection(ALL_NAV_IDS)
  const risposteWorkbook = useAllWorkbookAnswers(CHAPTER_NUMBERS)
  const quizCompletato = useQuizCompleted()

  // Il Capitolo 1 e' raggiungibile solo dopo aver completato il quiz
  // diagnostico (primo vero step del percorso) — vedi useQuizCompleted.
  // Un capitolo N>1 e' raggiungibile solo se l'esercizio del capitolo N-1 e'
  // stato compilato — coerente con il blocco di progressione richiesto in
  // Chapter.js (vedi useWorkbookAnswer.MIN_UNLOCK_CHARS).
  const unlockedNumbers = new Set(
    CHAPTER_NUMBERS.filter((n) => {
      if (n === 1) return quizCompletato
      const prev = (risposteWorkbook[n - 1] || '').trim()
      return prev.length > MIN_UNLOCK_CHARS
    })
  )

  // Strumento SOLO per test (Mason/team): azzera quiz + esercizi salvati in
  // questo browser senza dover usare l'incognito ogni volta. NON tocca il
  // cookie guida_access_token (quello e' l'accesso alla pagina, non va perso).
  const handleResetProgressiTest = () => {
    try {
      CHAPTER_NUMBERS.forEach((n) => window.localStorage.removeItem(workbookKey(n)))
      window.localStorage.removeItem(QUIZ_STORAGE_KEY)
    } catch {
      // localStorage non disponibile — nessun crash
    }
    window.location.reload()
  }

  return (
    <div
      className="min-h-screen bg-[#f5f1ea] text-[#1a1a0f]"
      style={{ fontFamily: 'var(--font-inter), system-ui, sans-serif' }}
    >
      <ProgressBar />

      {/* ── HERO ── */}
      <header className="relative min-h-[85vh] flex flex-col items-center justify-center overflow-hidden bg-[#1a1a0f] px-6 text-center pt-6">
        <div className="absolute inset-0 opacity-40 bg-[radial-gradient(ellipse_at_top,_rgba(201,163,74,0.3)_0%,_transparent_60%)]" />
        <div className="relative flex items-center gap-2 mb-8">
          <Image src="/logo_beautyx-oro.png" alt="Beautyx" width={27} height={30} style={{ borderRadius: 4 }} />
          <span className="text-[#f5f1ea] font-bold text-base tracking-wide">Beautyx</span>
        </div>

        <RevealBlock direction="up">
          <span className="inline-block px-4 py-1.5 rounded-full bg-[#c9a34a] text-[#1a1a0f] text-xs font-bold uppercase tracking-widest mb-6">
            Guida interattiva · gratuita
          </span>
          <h1
            className="text-4xl sm:text-6xl font-black text-[#f5f1ea] leading-[1.05] mb-6"
            style={{ fontFamily: 'var(--font-playfair), Georgia, serif' }}
          >
            Il tuo centro ti somiglia
            <br />
            <span className="italic text-[#e8c874]">(che tu lo voglia o no)</span>
          </h1>
          <p className="text-[#cfc6b0] text-lg max-w-xl mx-auto leading-relaxed mb-10">
            10 cazzate che facciamo (quasi) tutte — e come smettere
          </p>
        </RevealBlock>

        <RevealBlock delay={120}>
          <a
            href="#quiz"
            className="inline-flex items-center gap-2 px-8 py-4 bg-[#c9a34a] hover:bg-[#e8c874] text-[#1a1a0f] rounded-xl text-base font-bold transition-colors"
          >
            Inizia ↓
          </a>
        </RevealBlock>
      </header>

      <ChapterNav numeri={CHAPTER_NUMBERS} activeId={activeId} unlockedNumbers={unlockedNumbers} />

      {/* ── PREMESSA ── */}
      <section className="max-w-2xl mx-auto px-6 py-20">
        <RevealBlock>
          <p className="text-xs font-bold uppercase tracking-widest text-[#c9a34a] mb-4 text-center">Premessa</p>
        </RevealBlock>
        <div className="space-y-6">
          {premessa.map((p, i) => (
            <RevealBlock key={i} delay={i * 60}>
              <p className="text-[1.05rem] leading-[1.85] text-[#2a2a1f]"><RichText text={p} /></p>
            </RevealBlock>
          ))}
        </div>
      </section>

      {/* ── FACCIAMO UN PATTO ── */}
      <section className="bg-white/70 border-y border-[#e3d9c2]">
        <div className="max-w-2xl mx-auto px-6 py-20">
          <RevealBlock>
            <h2
              className="text-2xl sm:text-3xl font-bold text-center mb-8"
              style={{ fontFamily: 'var(--font-playfair), Georgia, serif' }}
            >
              Facciamo un patto
            </h2>
          </RevealBlock>
          <div className="space-y-6">
            {patto.map((p, i) => (
              <RevealBlock key={i} delay={i * 60}>
                <p className="text-[1.05rem] leading-[1.85] text-[#2a2a1f]"><RichText text={p} /></p>
              </RevealBlock>
            ))}
          </div>
        </div>
      </section>

      {/* ── COME FUNZIONA QUESTA GUIDA — testo introduttivo (Parte 3, Federica) ── */}
      <section className="max-w-2xl mx-auto px-6 py-20">
        <RevealBlock>
          <p className="text-xs font-bold uppercase tracking-widest text-[#c9a34a] mb-4 text-center">
            Come funziona da qui in poi
          </p>
        </RevealBlock>
        <RevealBlock delay={60}>
          <h2
            className="text-2xl sm:text-3xl font-bold text-center mb-8"
            style={{ fontFamily: 'var(--font-playfair), Georgia, serif' }}
          >
            {percorso.titolo}
          </h2>
        </RevealBlock>
        <RevealBlock delay={120}>
          <p className="text-[1.05rem] leading-[1.85] text-[#2a2a1f]"><RichText text={percorso.testo} /></p>
        </RevealBlock>
      </section>

      {/* ── QUIZ DIAGNOSTICO — subito prima dei capitoli ── */}
      <section id="quiz" className="scroll-mt-24 bg-white border-y border-[#e3d9c2] py-20">
        <RevealBlock className="text-center mb-4">
          <span className="inline-block px-4 py-1.5 rounded-full bg-[#faf3df] text-[#a97e1f] text-xs font-bold uppercase tracking-widest mb-4">
            Quiz diagnostico
          </span>
        </RevealBlock>
        <Quiz />
      </section>

      {/* ── I 10 CAPITOLI — scrollytelling ──
          Blocco di progressione REALE: un capitolo N viene renderizzato per
          intero solo se e' in unlockedNumbers (stesso criterio di ChapterNav,
          calcolato sopra: Capitolo 1 richiede il quiz completato, N>1 richiede
          l'esercizio del capitolo precedente). Finche' non e' raggiungibile si
          mostra un LockedChapter — un muro vero nel DOM, non solo un pulsante
          disabilitato — cosi' non e' piu' possibile scorrere con la rotellina
          oltre un capitolo senza aver soddisfatto la condizione richiesta. */}
      {capitoli.map((capitolo) =>
        unlockedNumbers.has(capitolo.numero) ? (
          <Chapter key={capitolo.numero} capitolo={capitolo} totaleCapitoli={CHAPTER_NUMBERS.length} />
        ) : (
          <LockedChapter
            key={capitolo.numero}
            numero={capitolo.numero}
            titolo={capitolo.titolo}
            totaleCapitoli={CHAPTER_NUMBERS.length}
            messaggio={
              capitolo.numero === 1
                ? 'Completa il quiz diagnostico qui sopra per continuare.'
                : undefined
            }
          />
        )
      )}

      {/* ── CONCLUSIONE ── */}
      <section id="conclusione" className="scroll-mt-24 max-w-2xl mx-auto px-6 py-20">
        <RevealBlock>
          <p className="text-xs font-bold uppercase tracking-widest text-[#c9a34a] mb-4 text-center">Conclusione</p>
        </RevealBlock>
        <div className="space-y-6">
          {conclusione.map((p, i) => (
            <RevealBlock key={i} delay={i * 60}>
              <p className="text-[1.05rem] leading-[1.85] text-[#2a2a1f]"><RichText text={p} /></p>
            </RevealBlock>
          ))}
        </div>
      </section>

      {/* ── RIEPILOGO WORKBOOK ── */}
      <WorkbookSummary />

      {/* ── FOOTER ── */}
      <footer className="border-t border-[#e3d9c2] py-10 px-6 text-center bg-[#f5f1ea]">
        <p className="text-xs text-[#a29c8a]">
          © {new Date().getFullYear()} Beautyx · Guida interattiva "10 errori" · Le tue risposte restano salvate solo in questo browser.
        </p>
        {/* Strumento SOLO per test interni — non per utenti finali. Azzera
            quiz + esercizi salvati in questo browser (localStorage), lasciando
            intatto l'accesso alla pagina (cookie guida_access_token). */}
        <button
          type="button"
          onClick={handleResetProgressiTest}
          className="mt-3 text-[11px] text-[#c9c2ae] hover:text-[#a29c8a] underline underline-offset-2 transition-colors"
        >
          Reset progressi guida (solo per test)
        </button>
      </footer>
    </div>
  )
}
