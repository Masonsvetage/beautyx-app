'use client'

import { useState, Suspense } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import Link from 'next/link'
import { useAuth } from '@/contexts/AuthContext'
import { supabase } from '@/lib/supabase'

function LoginContent() {
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState(null)
  const { signIn } = useAuth()
  const router = useRouter()
  const searchParams = useSearchParams()

  const redirect = searchParams.get('redirect') || '/dashboard'
  const errorParam = searchParams.get('error')
  const messageParam = searchParams.get('message')

  const handleSubmit = async (e) => {
    e.preventDefault()
    setError(null)
    setLoading(true)

    try {
      const result = await signIn(email, password)

      if (result.success) {
        // Controlla se l'utente deve cambiare la password provvisoria
        const { data: { user: authUser } } = await supabase.auth.getUser()
        if (authUser) {
          const { data: prof } = await supabase
            .from('user_profiles')
            .select('deve_cambiare_password')
            .eq('id', authUser.id)
            .single()

          if (prof?.deve_cambiare_password) {
            router.push('/cambia-password')
            return
          }
        }

        // Forza il refresh per aggiornare i cookie della sessione
        router.refresh()
        // Piccolo delay per assicurare che i cookie siano impostati
        await new Promise(resolve => setTimeout(resolve, 100))
        router.push(redirect)
      } else {
        setError(result.error || 'Errore durante il login')
      }
    } catch (err) {
      setError('Errore di connessione')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-pink-50 to-purple-50 py-12 px-4 sm:px-6 lg:px-8">
      <div className="max-w-md w-full space-y-8">
        {/* Logo e titolo */}
        <div className="text-center">
          <div className="mx-auto h-16 w-16 bg-gradient-to-br from-pink-500 to-purple-600 rounded-full flex items-center justify-center">
            <span className="text-2xl font-bold text-white">B</span>
          </div>
          <h2 className="mt-6 text-3xl font-extrabold text-gray-900">
            Accedi a Beautyx
          </h2>
          <p className="mt-2 text-sm text-gray-600">
            La tua piattaforma di gestione per centri estetici
          </p>
        </div>

        {/* Messaggi di errore */}
        {errorParam === 'account_disabled' && (
          <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg">
            Il tuo account è stato disabilitato. Contatta l&apos;amministratore.
          </div>
        )}

        {errorParam === 'account_deleted' && (
          <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg">
            Il tuo account è stato eliminato. Se ritieni si tratti di un errore, contatta l&apos;assistenza.
          </div>
        )}

        {errorParam === 'session_expired' && (
          <div className="bg-amber-50 border border-amber-200 text-amber-700 px-4 py-3 rounded-lg">
            Sessione scaduta per inattività. Effettua nuovamente il login.
          </div>
        )}

        {errorParam === 'confirm_failed' && (
          <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg">
            Il link di conferma non è valido o è scaduto. Prova ad accedere con email e password, oppure registrati di nuovo.
          </div>
        )}

        {/* Bug fix (03/09/2026, collaudo Mason): dopo la registrazione il
            form faceva router.push('/login?message=check_email') ma questa
            pagina non leggeva mai il parametro `message` — l'utente restava
            su un form di login vuoto, senza nessuna indicazione di dover
            controllare la posta per confermare l'account. */}
        {/* Fix anti account-enumeration (05/09/2026, segnalazione Mason):
            Supabase risponde 200 alla signup anche se l'email esiste già
            (logga internamente `user_repeated_signup`, non manda email, non
            tocca l'account) — comportamento voluto per non rivelare quali
            email sono registrate. Questo messaggio quindi va mostrato SEMPRE
            uguale, sia per email nuova sia già esistente: NON deve mai
            confermare né negare l'esistenza dell'account. Per chi ha già un
            account, offre subito le due vie d'uscita (login / reset
            password) senza dirglielo esplicitamente. */}
        {messageParam === 'check_email' && (
          <div className="bg-teal-50 border border-teal-200 text-teal-700 px-4 py-3 rounded-lg text-sm">
            Controlla la tua email per confermare l&apos;account. Hai già un account con questa email? Nessun problema: prova ad accedere subito con la tua password qui sotto, oppure clicca su «Password dimenticata?» se ti serve una mano a recuperarla.
          </div>
        )}

        {error && (
          <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg">
            {error}
          </div>
        )}

        {/* Form login */}
        <form className="mt-8 space-y-6" onSubmit={handleSubmit}>
          <div className="rounded-md shadow-sm space-y-4">
            <div>
              <label htmlFor="email" className="block text-sm font-medium text-gray-700 mb-1">
                Email
              </label>
              <input
                id="email"
                name="email"
                type="email"
                autoComplete="email"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="appearance-none relative block w-full px-3 py-3 border border-gray-300 placeholder-gray-500 text-gray-900 rounded-lg focus:outline-none focus:ring-2 focus:ring-pink-500 focus:border-pink-500 focus:z-10 sm:text-sm"
                placeholder="nome@centro.it"
              />
            </div>

            <div>
              <label htmlFor="password" className="block text-sm font-medium text-gray-700 mb-1">
                Password
              </label>
              <input
                id="password"
                name="password"
                type="password"
                autoComplete="current-password"
                required
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="appearance-none relative block w-full px-3 py-3 border border-gray-300 placeholder-gray-500 text-gray-900 rounded-lg focus:outline-none focus:ring-2 focus:ring-pink-500 focus:border-pink-500 focus:z-10 sm:text-sm"
                placeholder="La tua password"
              />
            </div>
          </div>

          <div className="flex items-center justify-between">
            <div className="text-sm">
              <Link href="/reset-password" className="font-medium text-pink-600 hover:text-pink-500">
                Password dimenticata?
              </Link>
            </div>
          </div>

          <div>
            <button
              type="submit"
              disabled={loading}
              className="group relative w-full flex justify-center py-3 px-4 border border-transparent text-sm font-medium rounded-lg text-white bg-gradient-to-r from-pink-500 to-purple-600 hover:from-pink-600 hover:to-purple-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-pink-500 disabled:opacity-50 disabled:cursor-not-allowed transition-all"
            >
              {loading ? (
                <span className="flex items-center">
                  <svg className="animate-spin -ml-1 mr-3 h-5 w-5 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                  </svg>
                  Accesso in corso...
                </span>
              ) : (
                'Accedi'
              )}
            </button>
          </div>
        </form>

        {/* Link registrazione */}
        <div className="text-center">
          <p className="text-sm text-gray-600">
            Non hai un account?{' '}
            <Link href="/signup" className="font-medium text-pink-600 hover:text-pink-500">
              Registra il tuo centro
            </Link>
          </p>
          <p className="mt-2 text-xs text-gray-500">
            Prova gratuita con funzionalità demo
          </p>
        </div>
      </div>
    </div>
  )
}

export default function LoginPage() {
  return (
    <Suspense fallback={
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-pink-50 to-purple-50">
        <div className="animate-spin h-8 w-8 border-4 border-pink-500 border-t-transparent rounded-full"></div>
      </div>
    }>
      <LoginContent />
    </Suspense>
  )
}
