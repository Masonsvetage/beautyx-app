'use client'

import { useState, useEffect } from 'react'
import { useBeautyx } from '@/contexts/BeautyxContext'
import { useAuth } from '@/contexts/AuthContext'

export default function FloatingBeautyxButton() {
  const ctx = useBeautyx()
  const { currentCentro, profile } = useAuth()
  const [avatarUrl, setAvatarUrl] = useState('/beautyx-avatar.svg')
  const [showPulse, setShowPulse] = useState(true)

  const { toggleSidebar, isOpen = false, insights = [] } = ctx || {}
  const centroId = currentCentro?.centro_id || profile?.centro_id

  // Carica avatar personalizzato
  useEffect(() => {
    if (centroId) loadAvatar()
  }, [centroId])

  async function loadAvatar() {
    try {
      const res = await fetch(`/api/admin/beautyx-avatar?centro_id=${centroId}`)
      const data = await res.json()
      if (data.avatar_url) {
        setAvatarUrl(data.avatar_url)
      }
    } catch (error) {
      console.error('Errore caricamento avatar:', error)
    }
  }

  // Stop pulse dopo qualche secondo o quando aperto
  useEffect(() => {
    if (isOpen) {
      setShowPulse(false)
    }
  }, [isOpen])

  // Utente senza centro: bottone chat non disponibile
  if (!ctx) return null

  // Conta insights attivi con priorità alta
  const urgentInsights = insights.filter(i => i.priorita <= 2).length

  return (
    <div className="fixed bottom-6 right-6 z-50">
      {/* Badge notifiche insights urgenti */}
      {urgentInsights > 0 && (
        <div className="absolute -top-2 -right-2 w-7 h-7 bg-gradient-to-br from-red-500 to-orange-500 rounded-full flex items-center justify-center text-white text-xs font-bold shadow-lg z-10 animate-bounce">
          {urgentInsights}
        </div>
      )}

      {/* FAB Button - EXTRA LARGE 100px */}
      <button
        onClick={toggleSidebar}
        className="group relative w-[100px] h-[100px] rounded-full overflow-hidden transition-all duration-300 hover:scale-110 active:scale-95"
        style={{
          boxShadow: isOpen
            ? '0 25px 50px -12px rgba(20, 184, 166, 0.6), 0 10px 25px -5px rgba(20, 184, 166, 0.4), 0 0 0 3px rgba(20, 184, 166, 0.3)'
            : '0 20px 25px -5px rgba(0, 0, 0, 0.5), 0 10px 10px -5px rgba(0, 0, 0, 0.3)'
        }}
      >
        {/* Pulse Animation Ring */}
        {showPulse && !isOpen && (
          <div className="absolute inset-0 rounded-full bg-gradient-to-br from-teal-500 to-cyan-500 animate-ping opacity-75"></div>
        )}

        {/* Glow Background */}
        <div className="absolute inset-0 bg-gradient-to-br from-teal-600 via-cyan-600 to-teal-700 group-hover:from-teal-500 group-hover:via-cyan-500 group-hover:to-teal-600 transition-all duration-300"></div>

        {/* Avatar Beautyx */}
        <div className="relative w-full h-full flex items-center justify-center p-1">
          <div className="w-full h-full rounded-full bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900 flex items-center justify-center overflow-hidden border-2 border-teal-400/30">
            <img
              src={avatarUrl}
              alt="Beautyx AI"
              className="w-full h-full object-cover"
            />
          </div>
        </div>

        {/* Online Indicator */}
        <div className="absolute bottom-1 right-1 w-4 h-4 bg-emerald-500 rounded-full border-2 border-white shadow-lg">
          <div className="w-full h-full rounded-full bg-emerald-400 animate-pulse"></div>
        </div>
      </button>

      {/* Tooltip Hover */}
      {!isOpen && (
        <div className="absolute bottom-full right-0 mb-3 px-4 py-2 bg-slate-900 text-white text-sm rounded-lg whitespace-nowrap opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none shadow-xl">
          Parla con Beautyx AI
          <div className="absolute top-full right-4 -mt-1 border-4 border-transparent border-t-slate-900"></div>
        </div>
      )}
    </div>
  )
}
