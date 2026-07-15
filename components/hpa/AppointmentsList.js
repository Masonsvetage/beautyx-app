'use client'

import { useState, useEffect } from 'react'

export default function AppointmentsList({ view = 'upcoming' }) {
  const [appointments, setAppointments] = useState([])
  const [loading, setLoading] = useState(true)
  const [filter, setFilter] = useState(view === 'upcoming' ? 'confermato' : '')

  useEffect(() => {
    loadAppointments()
  }, [filter])

  const loadAppointments = async () => {
    setLoading(true)
    try {
      const params = new URLSearchParams()
      if (filter) params.append('stato', filter)

      // Per appuntamenti futuri, filtra da oggi
      if (view === 'upcoming') {
        params.append('from', new Date().toISOString().split('T')[0])
      }

      const res = await fetch(`/api/hpa/appointments?${params}`)
      const data = await res.json()
      if (data.appointments) {
        setAppointments(data.appointments)
      }
    } catch (error) {
      console.error('Errore caricamento appuntamenti:', error)
    } finally {
      setLoading(false)
    }
  }

  const updateStatus = async (appointmentId, newStatus, reason = null) => {
    try {
      const res = await fetch('/api/hpa/appointments', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          appointment_id: appointmentId,
          stato: newStatus,
          cancellation_reason: reason
        })
      })

      if (res.ok) {
        loadAppointments()
      }
    } catch (error) {
      console.error('Errore aggiornamento stato:', error)
    }
  }

  const formatDate = (dateStr) => {
    const date = new Date(dateStr)
    const today = new Date()
    const tomorrow = new Date(today)
    tomorrow.setDate(tomorrow.getDate() + 1)

    if (date.toDateString() === today.toDateString()) return 'Oggi'
    if (date.toDateString() === tomorrow.toDateString()) return 'Domani'
    return date.toLocaleDateString('it-IT', { weekday: 'short', day: '2-digit', month: 'short' })
  }

  const formatTime = (timeStr) => {
    return timeStr?.slice(0, 5) || ''
  }

  const statusColors = {
    confermato: 'bg-blue-500/20 text-blue-300 border-blue-500/30',
    in_corso: 'bg-amber-500/20 text-amber-300 border-amber-500/30',
    completato: 'bg-emerald-500/20 text-emerald-300 border-emerald-500/30',
    cancellato: 'bg-red-500/20 text-red-300 border-red-500/30'
  }

  const statusLabels = {
    confermato: 'Confermato',
    in_corso: 'In corso',
    completato: 'Completato',
    cancellato: 'Cancellato'
  }

  return (
    <div className="bg-slate-800/50 rounded-xl border border-slate-700/50 overflow-hidden">
      {/* Header */}
      <div className="p-4 border-b border-slate-700/50 flex items-center justify-between">
        <h3 className="font-semibold text-white">
          {view === 'upcoming' ? 'Prossimi Appuntamenti' : 'Storico Appuntamenti'}
        </h3>
        <select
          value={filter}
          onChange={(e) => setFilter(e.target.value)}
          className="px-3 py-1.5 bg-slate-700/50 border border-slate-600 rounded-lg text-sm text-white focus:outline-none"
        >
          <option value="">Tutti</option>
          <option value="confermato">Confermati</option>
          <option value="completato">Completati</option>
          <option value="cancellato">Cancellati</option>
        </select>
      </div>

      {/* Lista */}
      {loading ? (
        <div className="p-4 space-y-3">
          {[...Array(3)].map((_, i) => (
            <div key={i} className="animate-pulse p-4 bg-slate-700/30 rounded-lg">
              <div className="h-4 w-32 bg-slate-600 rounded mb-2"></div>
              <div className="h-3 w-24 bg-slate-600 rounded"></div>
            </div>
          ))}
        </div>
      ) : appointments.length === 0 ? (
        <div className="p-8 text-center text-slate-400">
          Nessun appuntamento
        </div>
      ) : (
        <div className="divide-y divide-slate-700/30 max-h-[400px] overflow-y-auto">
          {appointments.map(apt => (
            <div key={apt.id} className="p-4 hover:bg-slate-700/20 transition-colors">
              <div className="flex items-start justify-between gap-4">
                <div className="flex-1">
                  <div className="flex items-center gap-2 mb-1">
                    <span className="font-medium text-white">
                      {formatDate(apt.data_appuntamento)}
                    </span>
                    <span className="text-slate-400">
                      {formatTime(apt.ora_inizio)} - {formatTime(apt.ora_fine)}
                    </span>
                    <span className="text-sm text-slate-500">
                      ({apt.durata_minuti} min)
                    </span>
                  </div>
                  <p className="text-sm text-purple-300">{apt.centro?.nome || 'Centro'}</p>
                  {apt.note && (
                    <p className="text-xs text-slate-400 mt-1">{apt.note}</p>
                  )}
                </div>

                <div className="flex items-center gap-2">
                  <span className={`px-2 py-1 text-xs rounded-lg border ${statusColors[apt.stato]}`}>
                    {statusLabels[apt.stato]}
                  </span>

                  {apt.stato === 'confermato' && (
                    <div className="flex gap-1">
                      <button
                        onClick={() => updateStatus(apt.id, 'in_corso')}
                        className="p-1.5 bg-amber-500/20 hover:bg-amber-500/30 text-amber-300 rounded-lg transition-colors"
                        title="Inizia call"
                      >
                        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M14.752 11.168l-3.197-2.132A1 1 0 0010 9.87v4.263a1 1 0 001.555.832l3.197-2.132a1 1 0 000-1.664z" />
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                        </svg>
                      </button>
                      <button
                        onClick={() => {
                          if (confirm('Cancellare questo appuntamento?')) {
                            updateStatus(apt.id, 'cancellato')
                          }
                        }}
                        className="p-1.5 bg-red-500/20 hover:bg-red-500/30 text-red-300 rounded-lg transition-colors"
                        title="Cancella"
                      >
                        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                        </svg>
                      </button>
                    </div>
                  )}

                  {apt.stato === 'in_corso' && (
                    <button
                      onClick={() => updateStatus(apt.id, 'completato')}
                      className="p-1.5 bg-emerald-500/20 hover:bg-emerald-500/30 text-emerald-300 rounded-lg transition-colors"
                      title="Completa"
                    >
                      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                      </svg>
                    </button>
                  )}
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
