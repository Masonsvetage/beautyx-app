'use client'

import { useState, useRef, useEffect, useCallback } from 'react'

function getDaysRemaining(scadenza) {
  if (!scadenza) return null
  const now = new Date()
  const deadline = new Date(scadenza)
  const diff = deadline - now
  return Math.ceil(diff / (1000 * 60 * 60 * 24))
}

export default function LegalAcceptanceWall({ documents, onAccepted, onDismiss }) {
  const [currentDocIndex, setCurrentDocIndex] = useState(0)
  const [acceptances, setAcceptances] = useState({})
  const [submitting, setSubmitting] = useState(false)
  const [scrolledToBottom, setScrolledToBottom] = useState({})
  const scrollRef = useRef(null)

  const currentDoc = documents[currentDocIndex]

  // Calcola giorni rimanenti dalla scadenza piu' vicina tra tutti i documenti
  const minDaysRemaining = documents.reduce((min, doc) => {
    const days = getDaysRemaining(doc.scadenza_accettazione)
    if (days === null) return min
    return min === null ? days : Math.min(min, days)
  }, null)

  // Chiudibile solo se ci sono ancora giorni rimanenti (> 0)
  const canDismiss = minDaysRemaining !== null && minDaysRemaining > 0

  // Controlla se il contenuto e' gia' tutto visibile (non serve scrollare)
  const checkIfAlreadyAtBottom = useCallback(() => {
    if (!currentDoc) return
    const el = scrollRef.current
    if (!el) return
    if (el.scrollHeight - el.clientHeight < 50) {
      setScrolledToBottom(prev => ({ ...prev, [currentDoc.document_id]: true }))
    }
  }, [currentDoc])

  useEffect(() => {
    const timer = setTimeout(checkIfAlreadyAtBottom, 100)
    return () => clearTimeout(timer)
  }, [checkIfAlreadyAtBottom, currentDocIndex])

  if (!currentDoc) return null

  const tipoLabel = currentDoc.tipo === 'condizioni_contrattuali' ? 'Condizioni Contrattuali' : 'Informativa Privacy'
  const clausole = currentDoc.clausole || []
  const vessatorie = clausole.filter(c => c.richiede_accettazione_singola)
  const docDaysRemaining = getDaysRemaining(currentDoc.scadenza_accettazione)

  const docAcceptance = acceptances[currentDoc.document_id] || { general: false, clauses: {} }

  const allVessatorieAccepted = vessatorie.length === 0 || vessatorie.every(c => docAcceptance.clauses[c.id])
  const canAcceptDoc = docAcceptance.general && allVessatorieAccepted && scrolledToBottom[currentDoc.document_id]

  const handleScroll = (e) => {
    const { scrollTop, scrollHeight, clientHeight } = e.target
    if (scrollHeight - scrollTop - clientHeight < 50) {
      setScrolledToBottom(prev => ({ ...prev, [currentDoc.document_id]: true }))
    }
  }

  const toggleGeneral = () => {
    setAcceptances(prev => ({
      ...prev,
      [currentDoc.document_id]: {
        ...docAcceptance,
        general: !docAcceptance.general
      }
    }))
  }

  const toggleClause = (clauseId) => {
    setAcceptances(prev => ({
      ...prev,
      [currentDoc.document_id]: {
        ...docAcceptance,
        clauses: {
          ...docAcceptance.clauses,
          [clauseId]: !docAcceptance.clauses[clauseId]
        }
      }
    }))
  }

  const handleAcceptDocument = async () => {
    setSubmitting(true)
    try {
      const clauseIds = [
        ...vessatorie.filter(c => docAcceptance.clauses[c.id]).map(c => c.id),
        ...clausole.filter(c => !c.richiede_accettazione_singola).map(c => c.id)
      ]

      const res = await fetch('/api/user/legal', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          document_id: currentDoc.document_id,
          clause_ids: clauseIds
        })
      })

      if (!res.ok) {
        const err = await res.json()
        throw new Error(err.error || 'Errore')
      }

      if (currentDocIndex < documents.length - 1) {
        setCurrentDocIndex(currentDocIndex + 1)
      } else {
        onAccepted?.()
      }
    } catch (err) {
      alert('Errore durante l\'accettazione: ' + err.message)
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <div className="fixed inset-0 z-[100] bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900 flex items-center justify-center p-4">
      <div className="max-w-3xl w-full bg-slate-800/90 backdrop-blur-xl rounded-2xl border border-slate-600/50 shadow-2xl max-h-[90vh] flex flex-col">
        {/* Header */}
        <div className="p-6 border-b border-slate-700">
          <div className="flex items-center justify-between mb-2">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-full bg-indigo-500/20 flex items-center justify-center">
                <svg className="w-5 h-5 text-indigo-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                </svg>
              </div>
              <div>
                <h2 className="text-xl font-bold text-white">{tipoLabel}</h2>
                <p className="text-sm text-slate-400">
                  Documento {currentDocIndex + 1} di {documents.length} - Versione {currentDoc.versione}
                </p>
              </div>
            </div>
            {/* Bottone chiudi (solo se entro scadenza) */}
            {canDismiss && (
              <button
                onClick={() => onDismiss?.()}
                className="text-slate-400 hover:text-white transition-colors p-2 rounded-lg hover:bg-slate-700/50"
                title="Accetta in seguito"
              >
                <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            )}
          </div>

          {/* Contatore giorni rimanenti */}
          {docDaysRemaining !== null && (
            <div className={`rounded-lg px-4 py-2.5 mt-3 flex items-center gap-3 ${
              docDaysRemaining <= 0
                ? 'bg-red-500/15 border border-red-500/40'
                : docDaysRemaining <= 3
                  ? 'bg-red-500/10 border border-red-500/30'
                  : docDaysRemaining <= 7
                    ? 'bg-amber-500/10 border border-amber-500/30'
                    : 'bg-blue-500/10 border border-blue-500/30'
            }`}>
              <div className={`text-2xl font-bold ${
                docDaysRemaining <= 0 ? 'text-red-400' : docDaysRemaining <= 3 ? 'text-red-400' : docDaysRemaining <= 7 ? 'text-amber-400' : 'text-blue-400'
              }`}>
                {docDaysRemaining <= 0 ? '!' : docDaysRemaining}
              </div>
              <div>
                {docDaysRemaining <= 0 ? (
                  <p className="text-sm text-red-300 font-medium">Scadenza superata - accettazione obbligatoria per continuare a utilizzare il servizio</p>
                ) : docDaysRemaining === 1 ? (
                  <p className="text-sm text-red-300 font-medium">Ultimo giorno per accettare prima della sospensione dell'account</p>
                ) : (
                  <p className={`text-sm font-medium ${docDaysRemaining <= 3 ? 'text-red-300' : docDaysRemaining <= 7 ? 'text-amber-300' : 'text-blue-300'}`}>
                    {docDaysRemaining} giorni rimanenti per accettare prima della sospensione dell'account
                  </p>
                )}
                <p className="text-xs text-slate-500 mt-0.5">
                  Scadenza: {new Date(currentDoc.scadenza_accettazione).toLocaleDateString('it-IT')}
                </p>
              </div>
            </div>
          )}

          {currentDoc.note_modifica && (
            <div className="bg-amber-500/10 border border-amber-500/30 rounded-lg px-3 py-2 mt-3">
              <p className="text-sm text-amber-400">Modifiche: {currentDoc.note_modifica}</p>
            </div>
          )}
        </div>

        {/* Contenuto documento (scrollabile) */}
        <div
          ref={scrollRef}
          className="flex-1 overflow-y-auto p-6"
          onScroll={handleScroll}
        >
          <div className="prose prose-invert prose-sm max-w-none">
            <div className="whitespace-pre-wrap text-slate-300 leading-relaxed">
              {currentDoc.contenuto}
            </div>
          </div>

          {/* Clausole */}
          {clausole.length > 0 && (
            <div className="mt-6 space-y-3">
              <h3 className="text-sm font-semibold text-slate-300 uppercase tracking-wider">Clausole</h3>
              {clausole.map(c => (
                <div key={c.id} className={`rounded-lg p-4 ${
                  c.richiede_accettazione_singola
                    ? 'bg-red-500/10 border border-red-500/30'
                    : 'bg-slate-700/30 border border-slate-600/30'
                }`}>
                  <div className="flex items-start gap-3">
                    <div className="flex-1">
                      <p className="text-sm font-medium text-white">{c.titolo}</p>
                      <p className="text-xs text-slate-400 mt-1">{c.contenuto}</p>
                    </div>
                    {c.richiede_accettazione_singola && (
                      <span className="px-2 py-0.5 rounded text-xs bg-red-500/20 text-red-400 border border-red-500/30 whitespace-nowrap">
                        Art. 1341-1342 c.c.
                      </span>
                    )}
                  </div>
                  {c.richiede_accettazione_singola && (
                    <div className="mt-3 flex items-center gap-2">
                      <input
                        type="checkbox"
                        id={`clause-${c.id}`}
                        checked={!!docAcceptance.clauses[c.id]}
                        onChange={() => toggleClause(c.id)}
                        className="h-4 w-4 rounded border-red-400 text-red-500 focus:ring-red-500"
                      />
                      <label htmlFor={`clause-${c.id}`} className="text-sm text-red-300">
                        Accetto specificamente questa clausola ai sensi degli artt. 1341 e 1342 c.c.
                      </label>
                    </div>
                  )}
                </div>
              ))}
            </div>
          )}

          {!scrolledToBottom[currentDoc.document_id] && (
            <div className="mt-4 text-center">
              <p className="text-xs text-slate-500 animate-pulse">Scorri fino in fondo per poter accettare</p>
            </div>
          )}
        </div>

        {/* Footer con accettazione */}
        <div className="p-6 border-t border-slate-700 bg-slate-900/50">
          <div className="flex items-start gap-3 mb-4">
            <input
              type="checkbox"
              id="accept-general"
              checked={docAcceptance.general}
              onChange={toggleGeneral}
              disabled={!scrolledToBottom[currentDoc.document_id]}
              className="h-5 w-5 mt-0.5 rounded border-slate-500 text-indigo-500 focus:ring-indigo-500 disabled:opacity-50"
            />
            <label htmlFor="accept-general" className={`text-sm ${scrolledToBottom[currentDoc.document_id] ? 'text-white' : 'text-slate-500'}`}>
              Dichiaro di aver letto integralmente e di accettare le {tipoLabel}
              {currentDoc.versione > 1 ? ` (versione ${currentDoc.versione})` : ''}
            </label>
          </div>

          <div className="flex gap-3">
            <button
              onClick={handleAcceptDocument}
              disabled={!canAcceptDoc || submitting}
              className="flex-1 py-3 bg-indigo-500 text-white font-medium rounded-lg hover:bg-indigo-600 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
            >
              {submitting ? 'Registrazione accettazione...' : (
                currentDocIndex < documents.length - 1 ? 'Accetto e prosegui' : 'Accetto e continua'
              )}
            </button>
            {canDismiss && (
              <button
                onClick={() => onDismiss?.()}
                className="px-6 py-3 bg-slate-700 text-slate-300 font-medium rounded-lg hover:bg-slate-600 transition-colors"
              >
                Dopo
              </button>
            )}
          </div>

          {!canAcceptDoc && scrolledToBottom[currentDoc.document_id] && (
            <p className="text-xs text-amber-400 mt-2 text-center">
              {!docAcceptance.general && 'Devi accettare le condizioni generali'}
              {docAcceptance.general && !allVessatorieAccepted && 'Devi accettare tutte le clausole vessatorie singolarmente'}
            </p>
          )}
        </div>
      </div>
    </div>
  )
}
