'use client'

import { useState, useEffect } from 'react'
import { format, parseISO } from 'date-fns'
import { calculateAbsenceHours, calculateVacationBalance } from '@/lib/pianificazione-utils'

export default function AbsenceCalendar({ employee }) {
  const [absences, setAbsences] = useState([])
  const [loading, setLoading] = useState(true)
  const [showAddForm, setShowAddForm] = useState(false)
  const [selectedYear, setSelectedYear] = useState(new Date().getFullYear())
  const [newAbsence, setNewAbsence] = useState({
    tipo: 'ferie',
    data_inizio: '',
    data_fine: '',
    note: ''
  })

  useEffect(() => {
    loadAbsences()
  }, [selectedYear])

  async function loadAbsences() {
    setLoading(true)
    try {
      const res = await fetch(`/api/employees/absences?employee_id=${employee.id}&anno=${selectedYear}`)
      const data = await res.json()
      setAbsences(data.absences || [])
    } catch (error) {
      console.error('Errore caricamento assenze:', error)
    }
    setLoading(false)
  }

  async function handleCreate(e) {
    e.preventDefault()

    const oreTotali = calculateAbsenceHours(
      newAbsence.data_inizio,
      newAbsence.data_fine,
      employee.ore_contrattuali_settimanali / 5
    )

    try {
      const res = await fetch('/api/employees/absences', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          employee_id: employee.id,
          ...newAbsence,
          ore_totali: oreTotali
        })
      })

      if (res.ok) {
        setNewAbsence({
          tipo: 'ferie',
          data_inizio: '',
          data_fine: '',
          note: ''
        })
        setShowAddForm(false)
        loadAbsences()
      }
    } catch (error) {
      console.error('Errore creazione assenza:', error)
    }
  }

  async function handleDelete(id) {
    if (!confirm('Eliminare questa assenza?')) return

    try {
      const res = await fetch(`/api/employees/absences?id=${id}`, { method: 'DELETE' })
      if (res.ok) loadAbsences()
    } catch (error) {
      console.error('Errore eliminazione assenza:', error)
    }
  }

  const vacationBalance = calculateVacationBalance(employee, absences)

  const tipoLabels = {
    ferie: { label: 'Ferie', icon: '🏖️', color: 'blue' },
    malattia: { label: 'Malattia', icon: '🤒', color: 'red' },
    permesso: { label: 'Permesso', icon: '📝', color: 'yellow' },
    altro: { label: 'Altro', icon: '📋', color: 'gray' }
  }

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h3 className="font-bold text-gray-800">Gestione Assenze</h3>
          <p className="text-sm text-gray-500">Anno {selectedYear}</p>
        </div>

        <div className="flex gap-2">
          <select
            value={selectedYear}
            onChange={(e) => setSelectedYear(parseInt(e.target.value))}
            className="px-3 py-1.5 border border-gray-300 rounded-lg font-semibold"
          >
            {[2024, 2025, 2026].map(year => (
              <option key={year} value={year}>{year}</option>
            ))}
          </select>

          <button
            onClick={() => setShowAddForm(!showAddForm)}
            className="bg-green-600 text-white px-4 py-2 rounded-lg font-semibold hover:bg-green-700"
          >
            {showAddForm ? '✕ Annulla' : '+ Nuova Assenza'}
          </button>
        </div>
      </div>

      {/* Vacation Balance */}
      <div className="grid grid-cols-3 gap-3">
        <div className="bg-blue-50 border border-blue-200 rounded-lg p-3">
          <div className="text-xs text-blue-600 font-semibold mb-1">Ferie Totali</div>
          <div className="text-xl font-bold text-blue-700">{vacationBalance.totali.toFixed(0)}h</div>
        </div>
        <div className="bg-red-50 border border-red-200 rounded-lg p-3">
          <div className="text-xs text-red-600 font-semibold mb-1">Ferie Usate</div>
          <div className="text-xl font-bold text-red-700">{vacationBalance.usate.toFixed(0)}h</div>
        </div>
        <div className="bg-green-50 border border-green-200 rounded-lg p-3">
          <div className="text-xs text-green-600 font-semibold mb-1">Ferie Rimanenti</div>
          <div className="text-xl font-bold text-green-700">{vacationBalance.rimanenti.toFixed(0)}h</div>
        </div>
      </div>

      {/* Form Nuova Assenza */}
      {showAddForm && (
        <div className="bg-gray-50 border border-gray-200 rounded-lg p-4">
          <form onSubmit={handleCreate} className="space-y-3">
            <div className="grid grid-cols-3 gap-3">
              <select
                value={newAbsence.tipo}
                onChange={(e) => setNewAbsence({ ...newAbsence, tipo: e.target.value })}
                className="px-3 py-2 border border-gray-300 rounded-lg"
                required
              >
                {Object.entries(tipoLabels).map(([key, val]) => (
                  <option key={key} value={key}>{val.icon} {val.label}</option>
                ))}
              </select>

              <input
                type="date"
                value={newAbsence.data_inizio}
                onChange={(e) => setNewAbsence({ ...newAbsence, data_inizio: e.target.value })}
                className="px-3 py-2 border border-gray-300 rounded-lg"
                required
              />

              <input
                type="date"
                value={newAbsence.data_fine}
                onChange={(e) => setNewAbsence({ ...newAbsence, data_fine: e.target.value })}
                className="px-3 py-2 border border-gray-300 rounded-lg"
                required
              />
            </div>

            <input
              type="text"
              placeholder="Note (opzionale)"
              value={newAbsence.note}
              onChange={(e) => setNewAbsence({ ...newAbsence, note: e.target.value })}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg"
            />

            <div className="flex justify-end">
              <button
                type="submit"
                className="bg-green-600 text-white px-6 py-2 rounded-lg font-semibold hover:bg-green-700"
              >
                Aggiungi Assenza
              </button>
            </div>
          </form>
        </div>
      )}

      {/* Lista Assenze */}
      {loading ? (
        <div className="text-center py-6 text-gray-500">Caricamento...</div>
      ) : absences.length === 0 ? (
        <div className="text-center py-12 text-gray-500">
          <div className="text-4xl mb-2">📅</div>
          <div>Nessuna assenza registrata per {selectedYear}</div>
        </div>
      ) : (
        <div className="space-y-2">
          {absences.map(absence => {
            const tipo = tipoLabels[absence.tipo] || tipoLabels.altro

            return (
              <div
                key={absence.id}
                className={`border-l-4 border-${tipo.color}-500 bg-white border border-gray-200 rounded-lg p-3`}
              >
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <span className="text-2xl">{tipo.icon}</span>
                    <div>
                      <div className="font-semibold text-gray-800">{tipo.label}</div>
                      <div className="text-sm text-gray-600">
                        {format(parseISO(absence.data_inizio), 'dd/MM/yyyy')} -{' '}
                        {format(parseISO(absence.data_fine), 'dd/MM/yyyy')}
                      </div>
                      {absence.note && (
                        <div className="text-xs text-gray-500 mt-1">{absence.note}</div>
                      )}
                    </div>
                  </div>

                  <div className="flex items-center gap-3">
                    <div className="text-right">
                      <div className="text-sm font-semibold text-gray-800">
                        {absence.ore_totali.toFixed(0)}h
                      </div>
                      <div className="text-xs text-gray-500">
                        {absence.approvato ? '✓ Approvato' : '⏳ In attesa'}
                      </div>
                    </div>
                    <button
                      onClick={() => handleDelete(absence.id)}
                      className="text-red-600 hover:bg-red-100 w-8 h-8 rounded-lg flex items-center justify-center"
                    >
                      🗑️
                    </button>
                  </div>
                </div>
              </div>
            )
          })}
        </div>
      )}
    </div>
  )
}
