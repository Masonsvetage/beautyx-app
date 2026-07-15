'use client'

import { useState, useEffect, useCallback } from 'react'
import { usePathname } from 'next/navigation'
import { useAuth } from '@/contexts/AuthContext'
import Navbar from '@/components/Navbar'
import BeautyxChatFooter from '@/components/beautyx/BeautyxChatFooter'
import BeautyxProviderWrapper from './BeautyxProviderWrapper'
import AnnouncementBanner from '@/components/common/AnnouncementBanner'
import LegalAcceptanceWall from '@/components/legal/LegalAcceptanceWall'
import SubscriptionCountdownBanner from '@/components/common/SubscriptionCountdownBanner'

// Route che non mostrano navbar e chat
const publicRoutes = ['/login', '/signup', '/reset-password']

export default function ClientLayout({ children }) {
  const pathname = usePathname()
  const { isAuthenticated, loading, profile } = useAuth()
  const [pendingLegalDocs, setPendingLegalDocs] = useState(null)
  const [legalChecked, setLegalChecked] = useState(false)
  const [legalDismissed, setLegalDismissed] = useState(false)

  const checkLegalStatus = useCallback(async () => {
    if (!isAuthenticated || profile?.ruolo_livello === 'admin') {
      setPendingLegalDocs([])
      setLegalChecked(true)
      return
    }
    try {
      const res = await fetch('/api/user/legal')
      if (res.ok) {
        const json = await res.json()
        setPendingLegalDocs(json.data?.pending || [])
      }
    } catch {
      // Silently fail - non bloccare l'app se l'API non esiste ancora
    }
    setLegalChecked(true)
  }, [isAuthenticated, profile?.ruolo_livello])

  useEffect(() => {
    if (isAuthenticated && !loading) {
      checkLegalStatus()
    }
  }, [isAuthenticated, loading, checkLegalStatus])

  const isPublicRoute = publicRoutes.some(route => pathname.startsWith(route))

  // Pagine pubbliche: niente navbar/chat
  if (isPublicRoute) {
    return <>{children}</>
  }

  // Loading state
  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-pink-50 to-purple-50">
        <div className="text-center">
          <div className="mx-auto h-12 w-12 bg-gradient-to-br from-pink-500 to-purple-600 rounded-full flex items-center justify-center animate-pulse">
            <span className="text-xl font-bold text-white">B</span>
          </div>
          <p className="mt-4 text-gray-600">Caricamento...</p>
        </div>
      </div>
    )
  }

  // Pagine autenticate: con navbar e chat
  if (isAuthenticated) {
    // Se profilo bloccato dall'admin (non per documento), mostra schermata di blocco
    if (profile?.profilo_bloccato && pathname !== '/impostazioni') {
      return (
        <div className="min-h-screen bg-gradient-to-br from-slate-800 via-slate-900 to-slate-800 flex items-center justify-center p-4">
          <div className="max-w-lg w-full bg-red-900/30 border border-red-500/50 rounded-xl p-8 text-center">
            <div className="text-6xl mb-4">🔒</div>
            <h1 className="text-2xl font-bold text-red-400 mb-4">Profilo Bloccato</h1>
            <p className="text-slate-300 mb-4">
              Il tuo profilo è stato bloccato per il seguente motivo:
            </p>
            <p className="text-red-300 font-medium bg-red-950/50 rounded-lg p-3 mb-6">
              {profile.profilo_bloccato_motivo || 'Motivo non specificato'}
            </p>
            <p className="text-slate-400 text-sm mb-6">
              Contatta l'amministratore di sistema per richiedere lo sblocco del profilo.
            </p>
            <a
              href="/impostazioni"
              className="inline-block px-4 py-2 bg-slate-700 hover:bg-slate-600 text-white rounded-lg text-sm transition-colors"
            >
              Vedi dettagli profilo
            </a>
          </div>
        </div>
      )
    }

    // Se ci sono documenti legali da accettare e non sono stati rimandati in questa sessione
    if (legalChecked && pendingLegalDocs && pendingLegalDocs.length > 0 && !legalDismissed) {
      return (
        <LegalAcceptanceWall
          documents={pendingLegalDocs}
          onAccepted={() => {
            setPendingLegalDocs([])
            setLegalDismissed(false)
            checkLegalStatus()
          }}
          onDismiss={() => setLegalDismissed(true)}
        />
      )
    }

    return (
      <BeautyxProviderWrapper>
        <div className="pb-[140px]">
          <Navbar />
          <AnnouncementBanner />
          <SubscriptionCountdownBanner />
          {children}
          <BeautyxChatFooter />
        </div>
      </BeautyxProviderWrapper>
    )
  }

  // Non autenticato su route protetta: middleware gestira redirect
  return <>{children}</>
}
