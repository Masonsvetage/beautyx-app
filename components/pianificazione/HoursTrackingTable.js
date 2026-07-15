'use client'

import { useState, useEffect } from 'react'
import { format, startOfMonth, endOfMonth, eachDayOfInterval, getDay } from 'date-fns'

export default function HoursTrackingTable({ employee }) {
  const [selectedMonth, setSelectedMonth] = useState(new Date())
  const [hours, setHours] = useState([])
  const [editing, setEditing] = useState({})
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    loadHours()
  }, [selectedMonth])

  async function loadHours() {
    setLoading(true)
    try {
      const start = format(startOfMonth(selectedMonth), 'yyyy-MM-dd')
      const end = format(endOfMonth(selectedMonth), 'yyyy-MM-dd')

      const res = await fetch(
        `/api/employees/hours?employee_id=${employee.id}&data_inizio=${start}&data_fine=${end}`
      )
      const data = await res.json()
      setHours(data.hours || [])
    } catch (error) {
      console.error('Errore caricamento ore:', error)
    }
    setLoading(false)
  }

  async function handleSaveHours(date, oreValue) {
    if (!oreValue || parseFloat(oreValue) === 0) return

    try {
      const res = await fetch('/api/employees/hours', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          employee_id: employee.id,
          data: date,
          ore_lavorate: parseFloat(oreValue)
        })
      })

      if (res.ok) loadHours()
    } catch (error) {
      console.error('Errore salvataggio ore:', error)
    }
  }

  function getHoursForDate(date) {
    const dateStr = format(date, 'yyyy-MM-dd')
    const found = hours.find(h => h.data === dateStr)
    return found ? found.ore_lavorate : ''
  }

  const days = eachDayOfInterval({
    start: startOfMonth(selectedMonth),
    end: endOfMonth(selectedMonth)
  })

  const totalHours = hours.reduce((sum, h) => sum + parseFloat(h.ore_lavorate || 0), 0)
  const expectedHours = employee.ore_contrattuali_settimanali * 4.33

  return (
    <div className="bg-white rounded-xl border border-gray-200 p-4">
      {/* Header */}
      <div className="flex items-center justify-between mb-4">
        <h3 className="font-bold text-gray-800">Tracciamento Ore</h3>

        <div className="flex items-center gap-3">
          <button
            onClick={() => setSelectedMonth(new Date(selectedMonth.getFullYear(), selectedMonth.getMonth() - 1))}
            className="px-3 py-1 bg-gray-100 rounded-lg hover:bg-gray-200"
          >
            ←
          </button>
          <span className="font-semibold text-gray-700">
            {format(selectedMonth, 'MMMM yyyy')}
          </span>
          <button
            onClick={() => setSelectedMonth(new Date(selectedMonth.getFullYear(), selectedMonth.getMonth() + 1))}
            className="px-3 py-1 bg-gray-100 rounded-lg hover:bg-gray-200"
          >
            →
          </button>
        </div>
      </div>

      {/* Summary */}
      <div className="grid grid-cols-3 gap-3 mb-4">
        <div className="bg-gray-50 rounded-lg p-3">
          <div className="text-xs text-gray-500 font-semibold mb-1">Ore Lavorate</div>
          <div className="text-xl font-bold text-gray-800">{totalHours.toFixed(1)}h</div>
        </div>
        <div className="bg-gray-50 rounded-lg p-3">
          <div className="text-xs text-gray-500 font-semibold mb-1">Ore Contrattuali</div>
          <div className="text-xl font-bold text-gray-800">{expectedHours.toFixed(1)}h</div>
        </div>
        <div className={`rounded-lg p-3 ${
          totalHours > expectedHours ? 'bg-yellow-50' : 'bg-green-50'
        }`}>
          <div className="text-xs text-gray-500 font-semibold mb-1">Differenza</div>
          <div className={`text-xl font-bold ${
            totalHours > expectedHours ? 'text-yellow-700' : 'text-green-700'
          }`}>
            {totalHours > expectedHours ? '+' : ''}{(totalHours - expectedHours).toFixed(1)}h
          </div>
        </div>
      </div>

      {/* Calendar Grid */}
      {loading ? (
        <div className="text-center py-6 text-gray-500">Caricamento...</div>
      ) : (
        <div className="max-h-96 overflow-y-auto">
          <table className="w-full text-sm">
            <thead className="sticky top-0 bg-gray-50">
              <tr>
                <th className="text-left p-2 font-semibold text-gray-700">Data</th>
                <th className="text-left p-2 font-semibold text-gray-700">Giorno</th>
                <th className="text-right p-2 font-semibold text-gray-700">Ore</th>
              </tr>
            </thead>
            <tbody>
              {days.map(day => {
                const dateStr = format(day, 'yyyy-MM-dd')
                const dayOfWeek = getDay(day)
                const isWeekend = dayOfWeek === 0 || dayOfWeek === 6
                const currentHours = getHoursForDate(day)

                return (
                  <tr
                    key={dateStr}
                    className={`border-t border-gray-100 ${isWeekend ? 'bg-gray-50' : ''}`}
                  >
                    <td className="p-2">{format(day, 'dd/MM/yyyy')}</td>
                    <td className="p-2 text-gray-600">
                      {format(day, 'EEEE')}
                      {isWeekend && <span className="text-xs text-gray-400 ml-2">(weekend)</span>}
                    </td>
                    <td className="p-2 text-right">
                      <input
                        type="number"
                        step="0.5"
                        placeholder={isWeekend ? '-' : '0'}
                        value={editing[dateStr] !== undefined ? editing[dateStr] : currentHours}
                        onChange={(e) => setEditing({ ...editing, [dateStr]: e.target.value })}
                        onBlur={() => {
                          if (editing[dateStr] !== undefined) {
                            handleSaveHours(dateStr, editing[dateStr])
                            delete editing[dateStr]
                            setEditing({ ...editing })
                          }
                        }}
                        className="w-20 px-2 py-1 border border-gray-300 rounded text-right"
                        disabled={isWeekend}
                      />
                    </td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        </div>
      )}
    </div>
  )
}
