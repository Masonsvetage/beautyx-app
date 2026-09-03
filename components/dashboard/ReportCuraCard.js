'use client'

// Entry-point verso /questionario per gli utenti col piano report_profiling
// (assegnato gratis in automatico da app/api/onboarding/create-centro/route.js).
// Necessario perché il redirect automatico post-signup (in app/impostazioni/page.js)
// copre solo la PRIMA volta: chi torna più tardi, o ha lasciato il
// questionario a metà in una sessione precedente, deve poter ritrovare il
// punto d'ingresso dalla dashboard. Il click porta sempre a /questionario,
// che da solo capisce se riprendere il quiz, la narrazione libera, o se
// mandare direttamente al report già generato (stato in profiling_sessions/
// profiling_reports, mai deciso qui).
//
// Fetch dedicato (non useBeautyx().tokenUsage) perché quel valore si carica
// solo quando la chat viene aperta (lazy init) — qui serve fin dal primo
// render della dashboard.

import { useState, useEffect } from 'react'
import Link from 'next/link'

export default function ReportCuraCard() {
  const [visible, setVisible] = useState(false)

  useEffect(() => {
    let cancelled = false
    fetch('/api/subscriptions/balance')
      .then((r) => (r.ok ? r.json() : null))
      .then((data) => {
        if (!cancelled && data?.plan?.codice === 'report_profiling') {
          setVisible(true)
        }
      })
      .catch(() => {})
    return () => { cancelled = true }
  }, [])

  if (!visible) return null

  return (
    <Link
      href="/questionario"
      className="block bg-gradient-to-r from-[#241d10] to-[#2f2412] border border-[#c9a34a]/40 rounded-2xl p-4 hover:border-[#c9a34a] transition-colors"
    >
      <div className="flex items-center justify-between gap-3">
        <div>
          <p className="text-[0.68rem] font-bold tracking-widest uppercase text-[#c9a34a] mb-1">Report CURA</p>
          <p className="text-white text-sm font-medium">Scopri come guidi davvero il tuo centro</p>
          <p className="text-slate-400 text-xs mt-1">Rispondi al questionario e ricevi il tuo profilo — gratis per i primi 90 giorni.</p>
        </div>
        <span className="text-[#e8c874] text-lg shrink-0">→</span>
      </div>
    </Link>
  )
}
