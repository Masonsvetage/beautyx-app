'use client'

import { useState, useEffect } from 'react'
import { useAuth } from '@/contexts/AuthContext'
import Link from 'next/link'

export default function SubscriptionCountdownBanner() {
  const { profile, isAuthenticated } = useAuth()
  const [subData, setSubData] = useState(null)
  const [dismissed, setDismissed] = useState(false)
  const [loaded, setLoaded] = useState(false)

  useEffect(() => {
    if (!isAuthenticated || !profile || profile.ruolo_livello === 'admin') return

    fetch('/api/subscriptions/balance')
      .then(res => res.ok ? res.json() : null)
      .then(data => {
        if (data && !data.error) setSubData(data)
      })
      .catch(() => {})
      .finally(() => setLoaded(true))
  }, [isAuthenticated, profile])

  if (!loaded || !subData || dismissed) return null

  const sub = subData.subscription
  const plan = subData.plan
  if (!sub || !plan) return null

  // Non mostrare per admin o piani senza scadenza
  if (!sub.data_fine) return null

  const now = new Date()
  const dataFine = new Date(sub.data_fine)
  const diffMs = dataFine - now
  const daysRemaining = Math.ceil(diffMs / (1000 * 60 * 60 * 24))

  // Mostra solo se mancano meno di 30 giorni
  if (daysRemaining > 30) return null

  const isExpired = daysRemaining <= 0
  const isTrial = sub.stato === 'trial' || plan.is_trial
  const planLabel = isTrial ? 'prova gratuita' : `piano ${plan.nome}`

  let bgClass, textClass, iconColor
  if (isExpired) {
    bgClass = 'bg-red-500/15 border-red-500/40'
    textClass = 'text-red-300'
    iconColor = 'text-red-400'
  } else if (daysRemaining <= 3) {
    bgClass = 'bg-red-500/10 border-red-500/30'
    textClass = 'text-red-300'
    iconColor = 'text-red-400'
  } else if (daysRemaining <= 7) {
    bgClass = 'bg-amber-500/10 border-amber-500/30'
    textClass = 'text-amber-300'
    iconColor = 'text-amber-400'
  } else {
    bgClass = 'bg-blue-500/10 border-blue-500/30'
    textClass = 'text-blue-300'
    iconColor = 'text-blue-400'
  }

  return (
    <div className={`mx-4 mt-2 rounded-lg border px-4 py-2.5 flex items-center justify-between ${bgClass}`}>
      <div className="flex items-center gap-3">
        <svg className={`w-5 h-5 flex-shrink-0 ${iconColor}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
        </svg>
        <p className={`text-sm ${textClass}`}>
          {isExpired ? (
            <>{isTrial ? 'La tua' : 'Il tuo'} {planLabel} è scadut{isTrial ? 'a' : 'o'}. </>
          ) : daysRemaining === 1 ? (
            <>{isTrial ? 'La tua' : 'Il tuo'} {planLabel} scade <strong>domani</strong>. </>
          ) : (
            <>{isTrial ? 'La tua' : 'Il tuo'} {planLabel} scade tra <strong>{daysRemaining} giorni</strong> ({dataFine.toLocaleDateString('it-IT')}). </>
          )}
          <Link href="/impostazioni/abbonamento" className="underline hover:no-underline font-medium">
            {isExpired ? 'Rinnova ora' : 'Gestisci abbonamento'}
          </Link>
        </p>
      </div>
      <button
        onClick={() => setDismissed(true)}
        className="text-slate-400 hover:text-white transition-colors p-1 ml-2 flex-shrink-0"
      >
        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
        </svg>
      </button>
    </div>
  )
}
