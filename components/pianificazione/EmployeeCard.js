'use client'

import { formatEmployeeName } from '@/lib/pianificazione-utils'
import { format, parseISO } from 'date-fns'

export default function EmployeeCard({ employee, onClick }) {
  const initials = `${employee.nome.charAt(0)}${employee.cognome.charAt(0)}`.toUpperCase()

  return (
    <div
      onClick={onClick}
      className="bg-white border border-gray-200 rounded-xl p-4 cursor-pointer hover:shadow-lg transition-all"
    >
      {/* Header */}
      <div className="flex items-start gap-3 mb-3">
        <div className="w-12 h-12 rounded-full bg-gradient-to-br from-purple-500 to-indigo-500 flex items-center justify-center text-white font-bold text-lg">
          {initials}
        </div>

        <div className="flex-1">
          <h3 className="font-bold text-gray-800">
            {formatEmployeeName(employee, 'full')}
          </h3>
          {employee.ruolo && (
            <p className="text-sm text-gray-500">{employee.ruolo}</p>
          )}
          {!employee.attivo && (
            <span className="inline-block text-xs bg-red-100 text-red-700 px-2 py-0.5 rounded mt-1">
              Non attivo
            </span>
          )}
        </div>
      </div>

      {/* Info */}
      <div className="space-y-2">
        <div className="flex items-center justify-between text-sm">
          <span className="text-gray-600">Ore contrattuali:</span>
          <span className="font-semibold text-gray-800">
            {employee.ore_contrattuali_settimanali}h/sett
          </span>
        </div>

        {employee.data_assunzione && (
          <div className="flex items-center justify-between text-sm">
            <span className="text-gray-600">Assunto dal:</span>
            <span className="font-semibold text-gray-800">
              {format(parseISO(employee.data_assunzione), 'dd/MM/yyyy')}
            </span>
          </div>
        )}

        {employee.email && (
          <div className="text-xs text-gray-500 truncate">
            📧 {employee.email}
          </div>
        )}

        {employee.telefono && (
          <div className="text-xs text-gray-500">
            📱 {employee.telefono}
          </div>
        )}
      </div>
    </div>
  )
}
