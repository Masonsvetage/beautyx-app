'use client'

import { useState } from 'react'
import { formatEmployeeName } from '@/lib/pianificazione-utils'
import HoursTrackingTable from './HoursTrackingTable'
import AbsenceCalendar from './AbsenceCalendar'
import OvertimeChart from './OvertimeChart'

export default function EmployeeDetailModal({ employee, onClose, onSave }) {
  const [activeTab, setActiveTab] = useState('info') // info, hours, absences

  async function handleUpdate(updates) {
    try {
      const res = await fetch('/api/employees', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id: employee.id, ...updates })
      })

      if (res.ok) onSave()
    } catch (error) {
      console.error('Errore aggiornamento dipendente:', error)
    }
  }

  const initials = `${employee.nome.charAt(0)}${employee.cognome.charAt(0)}`.toUpperCase()

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-xl shadow-2xl max-w-5xl w-full max-h-[90vh] overflow-y-auto">
        {/* Header */}
        <div className="sticky top-0 bg-gradient-to-r from-purple-600 to-indigo-600 text-white p-6 rounded-t-xl">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              <div className="w-16 h-16 rounded-full bg-white/20 backdrop-blur-sm flex items-center justify-center text-2xl font-bold">
                {initials}
              </div>
              <div>
                <h2 className="text-2xl font-bold">{formatEmployeeName(employee)}</h2>
                <p className="text-purple-100">{employee.ruolo || 'Dipendente'}</p>
              </div>
            </div>
            <button
              onClick={onClose}
              className="text-white hover:bg-white/20 w-8 h-8 rounded-lg flex items-center justify-center"
            >
              ✕
            </button>
          </div>

          {/* Tabs */}
          <div className="flex gap-2 mt-4">
            <button
              onClick={() => setActiveTab('info')}
              className={`px-4 py-2 rounded-lg font-semibold transition-all ${
                activeTab === 'info'
                  ? 'bg-white text-purple-600'
                  : 'bg-white/10 text-white hover:bg-white/20'
              }`}
            >
              📋 Info
            </button>
            <button
              onClick={() => setActiveTab('hours')}
              className={`px-4 py-2 rounded-lg font-semibold transition-all ${
                activeTab === 'hours'
                  ? 'bg-white text-purple-600'
                  : 'bg-white/10 text-white hover:bg-white/20'
              }`}
            >
              ⏰ Ore Lavorate
            </button>
            <button
              onClick={() => setActiveTab('absences')}
              className={`px-4 py-2 rounded-lg font-semibold transition-all ${
                activeTab === 'absences'
                  ? 'bg-white text-purple-600'
                  : 'bg-white/10 text-white hover:bg-white/20'
              }`}
            >
              📅 Assenze
            </button>
          </div>
        </div>

        {/* Content */}
        <div className="p-6">
          {activeTab === 'info' && (
            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="text-xs text-gray-500 font-semibold mb-1 block">Nome</label>
                  <div className="px-3 py-2 bg-gray-50 rounded-lg font-semibold text-gray-800">
                    {employee.nome}
                  </div>
                </div>
                <div>
                  <label className="text-xs text-gray-500 font-semibold mb-1 block">Cognome</label>
                  <div className="px-3 py-2 bg-gray-50 rounded-lg font-semibold text-gray-800">
                    {employee.cognome}
                  </div>
                </div>
              </div>

              <div className="grid grid-cols-3 gap-4">
                <div>
                  <label className="text-xs text-gray-500 font-semibold mb-1 block">Ore Settimanali</label>
                  <div className="px-3 py-2 bg-gray-50 rounded-lg font-semibold text-gray-800">
                    {employee.ore_contrattuali_settimanali}h
                  </div>
                </div>
                <div>
                  <label className="text-xs text-gray-500 font-semibold mb-1 block">Data Assunzione</label>
                  <div className="px-3 py-2 bg-gray-50 rounded-lg font-semibold text-gray-800">
                    {employee.data_assunzione || '-'}
                  </div>
                </div>
                <div>
                  <label className="text-xs text-gray-500 font-semibold mb-1 block">Ruolo</label>
                  <div className="px-3 py-2 bg-gray-50 rounded-lg font-semibold text-gray-800">
                    {employee.ruolo || '-'}
                  </div>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="text-xs text-gray-500 font-semibold mb-1 block">Email</label>
                  <div className="px-3 py-2 bg-gray-50 rounded-lg text-gray-800">
                    {employee.email || '-'}
                  </div>
                </div>
                <div>
                  <label className="text-xs text-gray-500 font-semibold mb-1 block">Telefono</label>
                  <div className="px-3 py-2 bg-gray-50 rounded-lg text-gray-800">
                    {employee.telefono || '-'}
                  </div>
                </div>
              </div>

              {employee.note && (
                <div>
                  <label className="text-xs text-gray-500 font-semibold mb-1 block">Note</label>
                  <div className="px-3 py-2 bg-gray-50 rounded-lg text-gray-800">
                    {employee.note}
                  </div>
                </div>
              )}

              <div className="pt-4 border-t border-gray-200">
                <div className="flex items-center gap-2">
                  <span className="text-sm font-semibold text-gray-700">Stato:</span>
                  <span className={`px-3 py-1 rounded-lg font-semibold ${
                    employee.attivo
                      ? 'bg-green-100 text-green-700'
                      : 'bg-red-100 text-red-700'
                  }`}>
                    {employee.attivo ? '✓ Attivo' : '✕ Non Attivo'}
                  </span>
                </div>
              </div>
            </div>
          )}

          {activeTab === 'hours' && (
            <div className="space-y-4">
              <OvertimeChart employeeId={employee.id} />
              <HoursTrackingTable employee={employee} />
            </div>
          )}

          {activeTab === 'absences' && (
            <AbsenceCalendar employee={employee} />
          )}
        </div>

        {/* Footer */}
        <div className="sticky bottom-0 bg-gray-50 border-t border-gray-200 p-4 rounded-b-xl flex justify-end">
          <button
            onClick={onClose}
            className="bg-gray-600 text-white px-6 py-2 rounded-lg font-semibold hover:bg-gray-700"
          >
            Chiudi
          </button>
        </div>
      </div>
    </div>
  )
}
