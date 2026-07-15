'use client'

import { useState, useEffect } from 'react'

const DAYS = [
  { value: 0, label: 'Domenica', short: 'Dom' },
  { value: 1, label: 'Lunedì', short: 'Lun' },
  { value: 2, label: 'Martedì', short: 'Mar' },
  { value: 3, label: 'Mercoledì', short: 'Mer' },
  { value: 4, label: 'Giovedì', short: 'Gio' },
  { value: 5, label: 'Venerdì', short: 'Ven' },
  { value: 6, label: 'Sabato', short: 'Sab' }
]

const DEFAULT_DURATIONS = [15, 30, 45, 60]

export default function AvailabilityPlanner() {
  const [slots, setSlots] = useState([])
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [editMode, setEditMode] = useState(false)

  useEffect(() => {
    loadAvailability()
  }, [])

  const loadAvailability = async () => {
    try {
      const res = await fetch('/api/hpa/availability')
      const data = await res.json()
      if (data.slots) {
        // Merge con tutti i giorni
        const mergedSlots = DAYS.map(day => {
          const existing = data.slots.find(s => s.giorno_settimana === day.value)
          return existing || {
            giorno_settimana: day.value,
            ora_inizio: '09:00',
            ora_fine: '18:00',
            durate_disponibili: DEFAULT_DURATIONS,
            attivo: false
          }
        })
        setSlots(mergedSlots)
      }
    } catch (error) {
      console.error('Errore caricamento disponibilità:', error)
    } finally {
      setLoading(false)
    }
  }

  const updateSlot = (dayIndex, field, value) => {
    setSlots(prev => prev.map((slot, i) =>
      i === dayIndex ? { ...slot, [field]: value } : slot
    ))
  }

  const toggleDuration = (dayIndex, duration) => {
    setSlots(prev => prev.map((slot, i) => {
      if (i !== dayIndex) return slot
      const durations = slot.durate_disponibili || []
      const newDurations = durations.includes(duration)
        ? durations.filter(d => d !== duration)
        : [...durations, duration].sort((a, b) => a - b)
      return { ...slot, durate_disponibili: newDurations }
    }))
  }

  const saveAvailability = async () => {
    setSaving(true)
    try {
      const res = await fetch('/api/hpa/availability', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ slots: slots.filter(s => s.attivo) })
      })

      if (res.ok) {
        setEditMode(false)
        loadAvailability()
      }
    } catch (error) {
      console.error('Errore salvataggio:', error)
    } finally {
      setSaving(false)
    }
  }

  if (loading) {
    return (
      <div className="bg-slate-800/50 rounded-xl p-4 border border-slate-700/50">
        <div className="animate-pulse space-y-3">
          <div className="h-5 w-32 bg-slate-700 rounded"></div>
          {[...Array(7)].map((_, i) => (
            <div key={i} className="h-10 bg-slate-700 rounded"></div>
          ))}
        </div>
      </div>
    )
  }

  return (
    <div className="bg-slate-800/50 rounded-xl border border-slate-700/50 overflow-hidden">
      {/* Header */}
      <div className="p-4 border-b border-slate-700/50 flex items-center justify-between">
        <h3 className="font-semibold text-white">Disponibilità Settimanale</h3>
        {editMode ? (
          <div className="flex gap-2">
            <button
              onClick={() => {
                setEditMode(false)
                loadAvailability()
              }}
              className="px-3 py-1.5 text-sm text-slate-400 hover:text-white"
              disabled={saving}
            >
              Annulla
            </button>
            <button
              onClick={saveAvailability}
              disabled={saving}
              className="px-3 py-1.5 bg-purple-500 hover:bg-purple-600 text-white text-sm rounded-lg disabled:opacity-50"
            >
              {saving ? 'Salvataggio...' : 'Salva'}
            </button>
          </div>
        ) : (
          <button
            onClick={() => setEditMode(true)}
            className="px-3 py-1.5 bg-slate-700 hover:bg-slate-600 text-white text-sm rounded-lg"
          >
            Modifica
          </button>
        )}
      </div>

      {/* Griglia giorni */}
      <div className="p-4 space-y-2">
        {slots.map((slot, index) => (
          <div
            key={slot.giorno_settimana}
            className={`p-3 rounded-lg border transition-colors ${
              slot.attivo
                ? 'bg-purple-500/10 border-purple-500/30'
                : 'bg-slate-700/20 border-slate-700/50'
            }`}
          >
            <div className="flex items-center gap-4">
              {/* Toggle attivo */}
              <button
                onClick={() => editMode && updateSlot(index, 'attivo', !slot.attivo)}
                disabled={!editMode}
                className={`w-12 h-6 rounded-full relative transition-colors ${
                  slot.attivo ? 'bg-purple-500' : 'bg-slate-600'
                } ${editMode ? 'cursor-pointer' : 'cursor-default'}`}
              >
                <span className={`absolute top-1 w-4 h-4 bg-white rounded-full transition-transform ${
                  slot.attivo ? 'left-7' : 'left-1'
                }`}></span>
              </button>

              {/* Giorno */}
              <span className={`w-20 font-medium ${slot.attivo ? 'text-white' : 'text-slate-500'}`}>
                {DAYS[index].label}
              </span>

              {slot.attivo && (
                <>
                  {/* Orari */}
                  <div className="flex items-center gap-2">
                    {editMode ? (
                      <>
                        <input
                          type="time"
                          value={slot.ora_inizio}
                          onChange={(e) => updateSlot(index, 'ora_inizio', e.target.value)}
                          className="px-2 py-1 bg-slate-700 border border-slate-600 rounded text-white text-sm"
                        />
                        <span className="text-slate-400">-</span>
                        <input
                          type="time"
                          value={slot.ora_fine}
                          onChange={(e) => updateSlot(index, 'ora_fine', e.target.value)}
                          className="px-2 py-1 bg-slate-700 border border-slate-600 rounded text-white text-sm"
                        />
                      </>
                    ) : (
                      <span className="text-slate-300 text-sm">
                        {slot.ora_inizio?.slice(0, 5)} - {slot.ora_fine?.slice(0, 5)}
                      </span>
                    )}
                  </div>

                  {/* Durate */}
                  <div className="flex gap-1 ml-auto">
                    {DEFAULT_DURATIONS.map(dur => (
                      <button
                        key={dur}
                        onClick={() => editMode && toggleDuration(index, dur)}
                        disabled={!editMode}
                        className={`px-2 py-0.5 text-xs rounded ${
                          slot.durate_disponibili?.includes(dur)
                            ? 'bg-purple-500/40 text-purple-200'
                            : 'bg-slate-700/50 text-slate-500'
                        } ${editMode ? 'hover:opacity-80' : ''}`}
                      >
                        {dur}m
                      </button>
                    ))}
                  </div>
                </>
              )}
            </div>
          </div>
        ))}
      </div>

      {/* Legenda */}
      <div className="p-4 border-t border-slate-700/50 text-xs text-slate-400">
        Durate disponibili: seleziona quali slot temporali (15/30/45/60 minuti) vuoi offrire per ogni giorno
      </div>
    </div>
  )
}
