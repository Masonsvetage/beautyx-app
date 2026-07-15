'use client'

import { useAuth } from '@/contexts/AuthContext'
import { BeautyxProvider } from '@/contexts/BeautyxContext'

export default function BeautyxProviderWrapper({ children }) {
  const { centroId, isHpa, isAdmin, userId, isAuthenticated, loading } = useAuth()

  // Se sta caricando, mostra loader
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

  // Se non autenticato, renderizza solo children (per pagine pubbliche)
  if (!isAuthenticated) {
    return <>{children}</>
  }

  // Utenti senza centro: renderizza children così page.js può fare il redirect
  // a /impostazioni?primo-accesso=1 per creare il primo centro
  if (!centroId && !isHpa && !isAdmin) {
    return <>{children}</>
  }

  // Utente autenticato: renderizza con BeautyxProvider
  // Per admin/HPA senza centro, centroId sarà null ma possono comunque navigare
  return (
    <BeautyxProvider
      centroId={centroId}
      isHpa={isHpa || isAdmin}
      userId={userId}
    >
      {children}
    </BeautyxProvider>
  )
}
