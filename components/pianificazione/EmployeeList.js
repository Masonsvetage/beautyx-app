'use client'

import { useState, useEffect } from 'react'
import EmployeeCard from './EmployeeCard'
import EmployeeDetailModal from './EmployeeDetailModal'
import { formatEmployeeName } from '@/lib/pianificazione-utils'

export default function EmployeeList({ centroId }) {
  const [employees, setEmployees] = useState([])
  const [loading, setLoading] = useState(true)
  const [showDetailModal, setShowDetailModal] = useState(null)
  const [showAddForm, setShowAddForm] = useState(false)
  const [filterAttivo, setFilterAttivo] = useState(true)
  const [newEmployee, setNewEmployee] = useState({
    nome: '',
    cognome: '',
    ore_contrattuali_settimanali: '40',
    data_assunzione: '',
    ruolo: '',
    email: '',
    telefono: ''
  })

  useEffect(() => {
    if (centroId) loadEmployees()
  }, [centroId, filterAttivo])

  async function loadEmployees() {
    if (!centroId) return
    setLoading(true)
    try {
      const res = await fetch(`/api/employees?centro_id=${centroId}&attivo=${filterAttivo}`)
      const data = await res.json()
      setEmployees(data.employees || [])
    } catch (error) {
      console.error('Errore caricamento dipendenti:', error)
    }
    setLoading(false)
  }

  async function handleCreate(e) {
    e.preventDefault()
    try {
      const res = await fetch('/api/employees', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          centro_id: centroId,
          ...newEmployee,
          ore_contrattuali_settimanali: parseFloat(newEmployee.ore_contrattuali_settimanali)
        })
      })

      if (res.ok) {
        setNewEmployee({
          nome: '',
          cognome: '',
          ore_contrattuali_settimanali: '40',
          data_assunzione: '',
          ruolo: '',
          email: '',
          telefono: ''
        })
        setShowAddForm(false)
        loadEmployees()
      }
    } catch (error) {
      console.error('Errore creazione dipendente:', error)
    }
  }

  const totalContractedHours = employees.reduce(
    (sum, emp) => sum + parseFloat(emp.ore_contrattuali_settimanali || 0),
    0
  )

  if (loading) {
    return (
      <div className="text-center py-12">
        <div className="text-4xl mb-4">⏳</div>
        <div className="text-lg font-semibold text-gray-600">Caricamento dipendenti...</div>
      </div>
    )
  }

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-xl font-bold text-gray-800">Gestione Dipendenti</h2>
          <p className="text-sm text-gray-500">
            {employees.length} dipendenti • {totalContractedHours.toFixed(0)}h contrattuali/sett
          </p>
        </div>

        <div className="flex gap-2">
          <div className="flex gap-1 bg-gray-100 p-0.5 rounded-lg">
            <button
              onClick={() => setFilterAttivo(true)}
              className={`px-3 py-1.5 rounded text-sm font-semibold ${
                filterAttivo
                  ? 'bg-white text-purple-600 shadow'
                  : 'text-gray-600'
              }`}
            >
              Attivi
            </button>
            <button
              onClick={() => setFilterAttivo(false)}
              className={`px-3 py-1.5 rounded text-sm font-semibold ${
                !filterAttivo
                  ? 'bg-white text-purple-600 shadow'
                  : 'text-gray-600'
              }`}
            >
              Non Attivi
            </button>
          </div>

          <button
            onClick={() => setShowAddForm(!showAddForm)}
            className="bg-gradient-to-r from-purple-600 to-indigo-600 text-white px-4 py-2 rounded-lg font-semibold hover:from-purple-700 hover:to-indigo-700 shadow-lg"
          >
            {showAddForm ? '✕ Annulla' : '+ Nuovo Dipendente'}
          </button>
        </div>
      </div>

      {/* Form Nuovo Dipendente */}
      {showAddForm && (
        <div className="bg-white border border-purple-200 rounded-xl p-4">
          <form onSubmit={handleCreate} className="space-y-3">
            <div className="grid grid-cols-2 gap-3">
              <input
                type="text"
                placeholder="Nome"
                value={newEmployee.nome}
                onChange={(e) => setNewEmployee({ ...newEmployee, nome: e.target.value })}
                className="px-3 py-2 border border-gray-300 rounded-lg"
                required
              />

              <input
                type="text"
                placeholder="Cognome"
                value={newEmployee.cognome}
                onChange={(e) => setNewEmployee({ ...newEmployee, cognome: e.target.value })}
                className="px-3 py-2 border border-gray-300 rounded-lg"
                required
              />
            </div>

            <div className="grid grid-cols-3 gap-3">
              <input
                type="number"
                step="0.5"
                placeholder="Ore settimanali"
                value={newEmployee.ore_contrattuali_settimanali}
                onChange={(e) => setNewEmployee({ ...newEmployee, ore_contrattuali_settimanali: e.target.value })}
                className="px-3 py-2 border border-gray-300 rounded-lg"
                required
              />

              <input
                type="date"
                placeholder="Data assunzione"
                value={newEmployee.data_assunzione}
                onChange={(e) => setNewEmployee({ ...newEmployee, data_assunzione: e.target.value })}
                className="px-3 py-2 border border-gray-300 rounded-lg"
              />

              <input
                type="text"
                placeholder="Ruolo"
                value={newEmployee.ruolo}
                onChange={(e) => setNewEmployee({ ...newEmployee, ruolo: e.target.value })}
                className="px-3 py-2 border border-gray-300 rounded-lg"
              />
            </div>

            <div className="grid grid-cols-2 gap-3">
              <input
                type="email"
                placeholder="Email"
                value={newEmployee.email}
                onChange={(e) => setNewEmployee({ ...newEmployee, email: e.target.value })}
                className="px-3 py-2 border border-gray-300 rounded-lg"
              />

              <input
                type="tel"
                placeholder="Telefono"
                value={newEmployee.telefono}
                onChange={(e) => setNewEmployee({ ...newEmployee, telefono: e.target.value })}
                className="px-3 py-2 border border-gray-300 rounded-lg"
              />
            </div>

            <div className="flex justify-end">
              <button
                type="submit"
                className="bg-green-600 text-white px-6 py-2 rounded-lg font-semibold hover:bg-green-700"
              >
                Crea Dipendente
              </button>
            </div>
          </form>
        </div>
      )}

      {/* Lista Dipendenti */}
      {employees.length === 0 ? (
        <div className="bg-white rounded-xl border border-gray-200 p-12 text-center">
          <div className="text-6xl mb-4">👥</div>
          <h3 className="text-xl font-bold text-gray-700 mb-2">
            Nessun dipendente {filterAttivo ? 'attivo' : 'non attivo'}
          </h3>
          <p className="text-gray-500">Aggiungi il primo dipendente per iniziare il tracking</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {employees.map(emp => (
            <EmployeeCard
              key={emp.id}
              employee={emp}
              onClick={() => setShowDetailModal(emp)}
            />
          ))}
        </div>
      )}

      {/* Detail Modal */}
      {showDetailModal && (
        <EmployeeDetailModal
          employee={showDetailModal}
          onClose={() => setShowDetailModal(null)}
          onSave={loadEmployees}
        />
      )}
    </div>
  )
}
