'use client'

import Link from 'next/link'
import { useAuth } from '@/contexts/AuthContext'

export default function UnauthorizedPage() {
  const { profile, ruoloLivello } = useAuth()

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900 flex items-center justify-center p-6">
      <div className="max-w-md w-full text-center">
        <div className="bg-slate-800/50 backdrop-blur-sm rounded-2xl border border-slate-700/50 p-8">
          {/* Icon */}
          <div className="w-20 h-20 mx-auto mb-6 bg-red-500/20 rounded-full flex items-center justify-center">
            <svg className="w-10 h-10 text-red-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
            </svg>
          </div>

          <h1 className="text-2xl font-bold text-white mb-2">Accesso Non Autorizzato</h1>

          <p className="text-slate-400 mb-6">
            Non hai i permessi necessari per accedere a questa funzionalità.
          </p>

          {profile && (
            <div className="bg-slate-900/50 rounded-lg p-4 mb-6 text-left">
              <p className="text-sm text-slate-500 mb-1">Il tuo profilo:</p>
              <p className="text-white">{profile.nome || profile.email}</p>
              <p className="text-sm text-slate-400">
                Ruolo: <span className="text-teal-400 capitalize">{ruoloLivello}</span>
              </p>
            </div>
          )}

          <p className="text-sm text-slate-500 mb-6">
            Se ritieni di dover avere accesso, contatta il tuo amministratore o il consulente HPA assegnato.
          </p>

          <div className="flex gap-3 justify-center">
            <Link
              href="/"
              className="px-4 py-2 bg-slate-700 text-white rounded-lg hover:bg-slate-600 transition-colors"
            >
              Torna alla Dashboard
            </Link>
            <Link
              href="/impostazioni"
              className="px-4 py-2 bg-teal-500 text-white rounded-lg hover:bg-teal-600 transition-colors"
            >
              Le mie impostazioni
            </Link>
          </div>
        </div>
      </div>
    </div>
  )
}
