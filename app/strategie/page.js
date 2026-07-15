'use client'
import Link from 'next/link'

export default function StrategiePage() {
  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900 p-4 md:p-6">
      <div className="max-w-4xl mx-auto">
        <div className="mb-6">
          <h1 className="text-2xl font-bold text-white mb-1">Strategie</h1>
          <p className="text-slate-400 text-sm">Pianifica obiettivi, accantonamenti, ottimizzazioni e listino prezzi</p>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {[
            { icon: '🎯', title: 'Sfide & Obiettivi', desc: "Imposta obiettivi di performance e segui l'andamento", href: '/obiettivi' },
            { icon: '💎', title: 'Accantonamenti', desc: 'Gestisci fondi obiettivo e accantonamenti periodici', href: '/pianificazione' },
            { icon: '📈', title: 'Piani di Ottimizzazione', desc: 'Strategie AI per aumentare la redditività', href: '/analytics' },
            { icon: '💰', title: 'Listino Prezzi', desc: 'Gestisci servizi, pacchetti, IVA e costi', href: '/centro' },
          ].map(s => (
            <Link key={s.title} href={s.href}
              className="bg-slate-800/40 rounded-2xl border border-slate-700/50 p-5 hover:border-teal-500/40 hover:bg-slate-800/60 transition-all group">
              <div className="flex items-start gap-3">
                <span className="text-2xl">{s.icon}</span>
                <div className="flex-1">
                  <div className="flex items-center gap-2">
                    <p className="font-semibold text-white">{s.title}</p>
                    {s.wip && <span className="text-[10px] px-1.5 py-0.5 rounded-full bg-amber-500/15 text-amber-400 border border-amber-500/20">In arrivo</span>}
                  </div>
                  <p className="text-sm text-slate-400 mt-0.5">{s.desc}</p>
                </div>
                <svg className="w-4 h-4 text-slate-600 group-hover:text-teal-400 transition-colors mt-0.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                </svg>
              </div>
            </Link>
          ))}
        </div>
      </div>
    </div>
  )
}
