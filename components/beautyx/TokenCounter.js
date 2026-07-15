'use client'

import { useState, useEffect, useRef } from 'react'
import Link from 'next/link'
import { tokensToChars, formatTokens, formatChars } from '@/lib/token-utils'

const PAID_PLANS = ['base', 'pro', 'advanced']

/**
 * TokenCounter - Contatore caratteri/token AI + ore HPA in tempo reale
 *
 * compact=true  → pill piccola per footer/header fullscreen
 * compact=false → pill per sidebar (popover a destra)
 * popoverPosition → 'up' | 'down' | 'right' (override automatico)
 */
export default function TokenCounter({ tokenUsage, compact = true, popoverPosition = null }) {
  const [isOpen, setIsOpen] = useState(false)
  const [addons, setAddons] = useState([])
  const [loadingAddons, setLoadingAddons] = useState(false)
  const [buyingId, setBuyingId] = useState(null)
  const [buyError, setBuyError] = useState(null)
  const [todayUsage, setTodayUsage] = useState(null)
  const [loadingToday, setLoadingToday] = useState(false)
  const todayLoadedRef = useRef(false)
  const containerRef = useRef(null)

  // Chiudi popover cliccando fuori
  useEffect(() => {
    if (!isOpen) return
    const handler = (e) => {
      if (containerRef.current && !containerRef.current.contains(e.target)) {
        setIsOpen(false)
      }
    }
    document.addEventListener('mousedown', handler)
    return () => document.removeEventListener('mousedown', handler)
  }, [isOpen])

  // Carica addon e consumo odierno quando si apre il popover
  useEffect(() => {
    if (!isOpen || !tokenUsage) return

    // Addon (solo piani pagati, solo se non già caricati)
    if (PAID_PLANS.includes(tokenUsage.piano) && addons.length === 0 && !loadingAddons) {
      setLoadingAddons(true)
      fetch('/api/subscriptions/addons')
        .then(r => r.json())
        .then(d => { if (d.addons) setAddons(d.addons) })
        .catch(() => {})
        .finally(() => setLoadingAddons(false))
    }

    // Consumo odierno (carica una sola volta per sessione)
    if (!todayLoadedRef.current) {
      todayLoadedRef.current = true
      setLoadingToday(true)
      fetch('/api/subscriptions/today-usage')
        .then(r => r.json())
        .then(d => setTodayUsage(d))
        .catch(() => {})
        .finally(() => setLoadingToday(false))
    }
  }, [isOpen, tokenUsage, addons.length, loadingAddons])

  if (!tokenUsage) return null

  const {
    token_ai_usati   = 0,
    token_ai_mensili = 0,
    token_percentage = 0,
    piano            = 'free',
    hpa_usate        = 0,
    hpa_mensili      = 0,
    hpa_percentage   = 0,
    limit_reached    = false,
  } = tokenUsage

  const isUnlimited = token_ai_mensili === 0
  const isPaid = PAID_PLANS.includes(piano)

  const chars_usati   = tokensToChars(token_ai_usati)
  const chars_mensili = tokensToChars(token_ai_mensili)
  const chars_restanti = Math.max(0, chars_mensili - chars_usati)

  // Colore in base alla percentuale
  const tokenColor =
    limit_reached || token_percentage >= 100 ? 'text-red-400' :
    token_percentage >= 90                   ? 'text-red-400' :
    token_percentage >= 70                   ? 'text-amber-400' :
                                               'text-teal-400'
  const shouldPulse = token_percentage >= 70

  // Data reset: 1° del mese prossimo
  const now = new Date()
  const resetDate = new Date(now.getFullYear(), now.getMonth() + 1, 1)
  const resetStr = resetDate.toLocaleDateString('it-IT', { day: 'numeric', month: 'short' })

  // Posizione popover
  const popoverClass =
    popoverPosition === 'down'  ? 'top-full mt-2 right-0' :
    popoverPosition === 'up'    ? 'bottom-full mb-2 left-0' :
    popoverPosition === 'right' ? 'top-0 left-full ml-2' :
    compact                     ? 'bottom-full mb-2 left-0' :
                                  'top-0 left-full ml-2'

  const handleBuy = async (addonId) => {
    setBuyingId(addonId)
    setBuyError(null)
    try {
      const res = await fetch('/api/subscriptions/checkout', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ package_id: addonId, tipo: 'addon' })
      })
      const data = await res.json()
      if (data.url) {
        window.location.href = data.url
      } else {
        setBuyError(data.error || 'Errore durante il checkout')
      }
    } catch {
      setBuyError('Errore di connessione')
    } finally {
      setBuyingId(null)
    }
  }

  return (
    <div ref={containerRef} className="relative inline-flex items-center">
      {/* ── Pill ── */}
      <button
        onClick={() => setIsOpen(prev => !prev)}
        className={`flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-mono
          ${tokenColor} ${shouldPulse ? 'animate-pulse' : ''}
          bg-slate-800/70 hover:bg-slate-700/70 transition-all
          border border-slate-600/30 cursor-pointer`}
        title={hpa_mensili > 0 ? 'Caratteri AI e Ore HPA' : 'Caratteri AI disponibili'}
      >
        <span>⚡</span>
        <span>
          {isUnlimited
            ? '∞ car.'
            : `${formatChars(chars_usati)} / ${formatChars(chars_mensili)} car.`
          }
          {!isUnlimited && ` · ${token_percentage}%`}
        </span>
        {hpa_mensili > 0 && (
          <span className="text-purple-400 ml-1">
            · 👤 {hpa_usate}h/{hpa_mensili}h
          </span>
        )}
      </button>

      {/* ── Popover ── */}
      {isOpen && (
        <div
          className={`absolute ${popoverClass} z-[300] w-80 rounded-xl shadow-2xl border border-slate-600/50 overflow-hidden`}
          style={{
            background: 'linear-gradient(135deg, rgba(15,23,42,0.99), rgba(30,41,59,0.99))',
            boxShadow: '0 0 50px rgba(0,0,0,0.7), 0 0 20px rgba(20,184,166,0.1)'
          }}
        >
          {/* Header */}
          <div className="px-4 py-3 border-b border-slate-700/50">
            <div className="flex items-center justify-between">
              <span className="text-sm font-bold text-white capitalize">Piano {piano}</span>
              <span className="text-xs text-slate-400">↻ reset {resetStr}</span>
            </div>
          </div>

          <div className="px-4 py-3 space-y-4">

            {/* ── Consumo odierno ── */}
            <div className="flex items-center justify-between bg-slate-800/50 rounded-lg px-3 py-2">
              <span className="text-xs text-slate-400">📅 Oggi hai usato</span>
              {loadingToday ? (
                <span className="text-xs text-slate-500">...</span>
              ) : todayUsage ? (
                <span className="text-xs font-semibold text-white">
                  {formatChars(todayUsage.chars_today)} car.
                  <span className="text-slate-500 font-normal ml-1">
                    ({formatTokens(todayUsage.tokens_today)} tok.)
                  </span>
                </span>
              ) : (
                <span className="text-xs text-slate-500">N/D</span>
              )}
            </div>

            {/* ── Token AI / Caratteri mensili ── */}
            <div>
              <div className="flex justify-between text-xs mb-1">
                <span className="text-slate-400 font-semibold">⚡ Credito mensile</span>
                <span className={tokenColor}>
                  {isUnlimited ? '∞' : `${formatChars(chars_usati)} / ${formatChars(chars_mensili)} car.`}
                </span>
              </div>
              {!isUnlimited && (
                <>
                  <div className="h-2 bg-slate-700 rounded-full overflow-hidden">
                    <div
                      className={`h-full rounded-full transition-all ${
                        token_percentage >= 90 ? 'bg-red-500' :
                        token_percentage >= 70 ? 'bg-amber-500' : 'bg-teal-500'
                      }`}
                      style={{ width: `${Math.min(token_percentage, 100)}%` }}
                    />
                  </div>
                  <div className="flex justify-between mt-1">
                    <p className="text-xs text-slate-500">
                      {limit_reached
                        ? '⚠️ Limite raggiunto'
                        : `${formatChars(chars_restanti)} car. rimanenti`}
                    </p>
                    <p className="text-xs text-slate-600">
                      {formatTokens(token_ai_usati)}/{formatTokens(token_ai_mensili)} tok.
                    </p>
                  </div>
                </>
              )}
              {isUnlimited && (
                <p className="text-xs text-teal-400 mt-0.5">Caratteri illimitati ✓</p>
              )}
            </div>

            {/* ── Ore HPA ── */}
            {hpa_mensili > 0 && (
              <div>
                <div className="flex justify-between text-xs mb-1">
                  <span className="text-slate-400 font-semibold">👤 Ore HPA</span>
                  <span className="text-purple-400">{hpa_usate}h / {hpa_mensili}h</span>
                </div>
                <div className="h-2 bg-slate-700 rounded-full overflow-hidden">
                  <div
                    className="h-full bg-purple-500 rounded-full transition-all"
                    style={{ width: `${Math.min(hpa_percentage, 100)}%` }}
                  />
                </div>
                <p className="text-xs text-slate-500 mt-1">
                  {Math.max(0, hpa_mensili - hpa_usate)}h rimanenti
                </p>
              </div>
            )}

            {/* ── Acquisto addon ── */}
            {isPaid ? (
              <div className="border-t border-slate-700/50 pt-3">
                <p className="text-xs text-teal-300 font-semibold mb-2">⚡ Acquista caratteri extra</p>

                {loadingAddons && (
                  <p className="text-xs text-slate-500">Caricamento pacchetti...</p>
                )}

                {!loadingAddons && addons.length === 0 && (
                  <p className="text-xs text-slate-500">
                    Nessun pacchetto disponibile.{' '}
                    <Link
                      href="/impostazioni/abbonamento"
                      className="text-teal-400 hover:text-teal-300 underline"
                      onClick={() => setIsOpen(false)}
                    >
                      Vai all'abbonamento
                    </Link>
                  </p>
                )}

                {buyError && (
                  <p className="text-xs text-red-400 mb-2">{buyError}</p>
                )}

                <div className="space-y-2">
                  {addons.map(addon => (
                    <div
                      key={addon.id}
                      className="flex items-center justify-between gap-2 p-2 rounded-lg bg-slate-800/50 border border-slate-700/30"
                    >
                      <div>
                        <p className="text-xs text-white font-semibold">
                          {formatChars(tokensToChars(addon.token_ai_bonus))} car.
                          <span className="text-slate-500 font-normal ml-1">
                            ({formatTokens(addon.token_ai_bonus)} tok.)
                          </span>
                        </p>
                        {addon.descrizione && (
                          <p className="text-xs text-slate-400">{addon.descrizione}</p>
                        )}
                        <p className="text-xs text-teal-400 font-bold">
                          €{Number(addon.prezzo).toFixed(2)}
                          {addon.prezzo_originale && Number(addon.prezzo_originale) > Number(addon.prezzo) && (
                            <span className="text-slate-500 line-through ml-1">
                              €{Number(addon.prezzo_originale).toFixed(2)}
                            </span>
                          )}
                        </p>
                      </div>
                      <button
                        onClick={() => handleBuy(addon.id)}
                        disabled={buyingId === addon.id}
                        className="px-3 py-1.5 bg-teal-600 hover:bg-teal-500 disabled:opacity-50 text-white text-xs font-bold rounded-lg transition-all flex-shrink-0"
                      >
                        {buyingId === addon.id ? '...' : 'Acquista'}
                      </button>
                    </div>
                  ))}
                </div>
              </div>
            ) : (
              <div className="border-t border-slate-700/50 pt-3">
                <p className="text-xs text-slate-400 mb-1.5">
                  I pacchetti extra sono disponibili dal piano Starter.
                </p>
                <Link
                  href="/impostazioni/abbonamento"
                  className="text-xs text-teal-400 hover:text-teal-300 underline"
                  onClick={() => setIsOpen(false)}
                >
                  Scopri i piani disponibili →
                </Link>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  )
}
