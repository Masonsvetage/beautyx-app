'use client'

import { useState, useEffect, Suspense } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import { useAuth } from '@/contexts/AuthContext'

function UpdatePasswordContent() {
  const [password, setPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState(null)
  const [success, setSuccess] = useState(false)
  const [linkInvalid, setLinkInvalid] = useState(false)
  const { updatePassword, user, loading: authLoading } = useAuth()
  const router = useRouter()
  const searchParams = useSearchParams()

  // Supabase, quando il link di recovery è scaduto/già usato/non valido,
  // reindirizza comunque a questa pagina ma aggiungendo `error` /
  // `error_code` / `error_description` (come query string, o come frammento
  // `#error=...` a seconda del flow) invece di un `code` valido. Prima di
  // questo fix questi parametri non venivano mai letti: l'utente restava
  // semplicemente con `user` null e, dopo 3 secondi, veniva rimandato a
  // `/reset-password` senza alcuna spiegazione — esattamente il sintomo
  // "dopo 3 secondi mi riapre la pagina di inserire email" segnalato da
  // Mason, indistinguibile per lui da un bug di codice. Ora, se troviamo
  // un errore esplicito nell'URL, lo mostriamo subito invece di aspettare
  // il timeout silenzioso.
  useEffect(() => {
    const queryError = searchParams.get('error_description') || searchParams.get('error')
    let hashError = null
    if (typeof window !== 'undefined' && window.location.hash) {
      const hashParams = new URLSearchParams(window.location.hash.slice(1))
      hashError = hashParams.get('error_description') || hashParams.get('error')
    }
    if (queryError || hashError) {
      setLinkInvalid(true)
    }
  }, [searchParams])

  // Se l'utente non è autenticato tramite il recovery link, redirect.
  //
  // Fix (06/09/2026): da quando `resetPassword()` in AuthContext.js manda
  // `redirectTo` su `/auth/callback?next=/reset-password/update`, la
  // sessione viene creata lato server (`exchangeCodeForSession` + cookie
  // HttpOnly) PRIMA che il browser arrivi mai su questa pagina — non c'è
  // più nessun `code`/hash da far rilevare al client, quindi l'evento
  // `PASSWORD_RECOVERY` di onAuthStateChange (gestito sotto in AuthContext)
  // in genere non scatta più: `user` si popola tramite il normale
  // `initAuth()`/`getSession()` al mount, che legge la sessione già scritta
  // nei cookie SSR.
  //
  // Resta comunque una race condition: anche con il cookie già pronto sul
  // server, il provider React (AuthContext) impiega un istante a
  // idratarsi (setState asincrono dopo `getSession()`) — durante quella
  // finestra `loading` è `true` e `user` è ancora `null`. Un timeout fisso
  // di 3s partito subito al mount poteva quindi scattare mentre l'auth
  // stava ancora inizializzando. Ora si aspetta che `loading` diventi
  // `false` (fine inizializzazione auth) prima di far partire il
  // countdown di sicurezza: se a quel punto `user` è ancora assente, il
  // link è davvero scaduto/non valido (o lo diventerà a breve tramite
  // l'evento PASSWORD_RECOVERY, per cui si lascia comunque un margine di
  // 3s prima di rimandare indietro).
  useEffect(() => {
    if (linkInvalid) return
    if (authLoading) return
    if (user) return
    const timeout = setTimeout(() => {
      if (!user) {
        router.push('/reset-password?message=link_expired')
      }
    }, 3000)
    return () => clearTimeout(timeout)
  }, [user, authLoading, router, linkInvalid])

  const handleSubmit = async (e) => {
    e.preventDefault()
    setError(null)

    if (password.length < 6) {
      setError('La password deve essere di almeno 6 caratteri')
      return
    }

    if (password !== confirmPassword) {
      setError('Le password non coincidono')
      return
    }

    setLoading(true)

    try {
      const result = await updatePassword(password)

      if (result.success) {
        setSuccess(true)
        setTimeout(() => {
          router.push('/')
        }, 2000)
      } else {
        setError(result.error || 'Errore durante l\'aggiornamento della password')
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
            Nuova Password
          </h2>
          <p className="mt-2 text-sm text-gray-600">
            Inserisci la tua nuova password
          </p>
        </div>

        {success ? (
          <div className="bg-green-50 border border-green-200 text-green-700 px-4 py-4 rounded-lg text-center">
            <p className="font-medium">Password aggiornata!</p>
            <p className="mt-1 text-sm">Verrai reindirizzato alla home...</p>
          </div>
        ) : linkInvalid ? (
          <div className="space-y-6">
            <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-4 rounded-lg text-center">
              <p className="font-medium">Questo link non è più valido.</p>
              <p className="mt-1 text-sm">
                È scaduto o è già stato usato. Richiedine uno nuovo dalla pagina di recupero password.
              </p>
            </div>
            <div className="text-center">
              <button
                type="button"
                onClick={() => router.push('/reset-password')}
                className="font-medium text-pink-600 hover:text-pink-500 text-sm"
              >
                Richiedi un nuovo link
              </button>
            </div>
          </div>
        ) : (
          <>
            {error && (
              <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg">
                {error}
              </div>
            )}

            <form className="mt-8 space-y-6" onSubmit={handleSubmit}>
              <div className="space-y-4">
                <div>
                  <label htmlFor="password" className="block text-sm font-medium text-gray-700 mb-1">
                    Nuova password
                  </label>
                  <input
                    id="password"
                    name="password"
                    type="password"
                    required
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    className="appearance-none relative block w-full px-3 py-3 border border-gray-300 placeholder-gray-500 text-gray-900 rounded-lg focus:outline-none focus:ring-2 focus:ring-pink-500 focus:border-pink-500 sm:text-sm"
                    placeholder="Minimo 6 caratteri"
                  />
                </div>

                <div>
                  <label htmlFor="confirmPassword" className="block text-sm font-medium text-gray-700 mb-1">
                    Conferma password
                  </label>
                  <input
                    id="confirmPassword"
                    name="confirmPassword"
                    type="password"
                    required
                    value={confirmPassword}
                    onChange={(e) => setConfirmPassword(e.target.value)}
                    className="appearance-none relative block w-full px-3 py-3 border border-gray-300 placeholder-gray-500 text-gray-900 rounded-lg focus:outline-none focus:ring-2 focus:ring-pink-500 focus:border-pink-500 sm:text-sm"
                    placeholder="Ripeti la password"
                  />
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
                      Aggiornamento...
                    </span>
                  ) : (
                    'Aggiorna password'
                  )}
                </button>
              </div>
            </form>
          </>
        )}
      </div>
    </div>
  )
}

export default function UpdatePasswordPage() {
  return (
    <Suspense fallback={
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-pink-50 to-purple-50">
        <div className="text-gray-500 text-sm">Caricamento...</div>
      </div>
    }>
      <UpdatePasswordContent />
    </Suspense>
  )
}
