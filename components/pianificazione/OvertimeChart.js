'use client'

import { useState, useEffect } from 'react'
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from 'recharts'
import { getItalianMonthAbbr } from '@/lib/pianificazione-utils'

export default function OvertimeChart({ employeeId }) {
  const [data, setData] = useState([])
  const [loading, setLoading] = useState(true)
  const [selectedYear, setSelectedYear] = useState(new Date().getFullYear())

  useEffect(() => {
    loadOvertimeData()
  }, [selectedYear])

  async function loadOvertimeData() {
    setLoading(true)
    try {
      const promises = Array.from({ length: 12 }, (_, i) => i + 1).map(async mese => {
        const res = await fetch(
          `/api/employees/overtime?employee_id=${employeeId}&mese=${mese}&anno=${selectedYear}`
        )
        const data = await res.json()
        return {
          mese: getItalianMonthAbbr(mese),
          contrattuale: data.contractedHours || 0,
          effettivo: data.actualHours || 0,
          straordinari: data.overtime || 0
        }
      })

      const results = await Promise.all(promises)
      setData(results)
    } catch (error) {
      console.error('Errore caricamento straordinari:', error)
    }
    setLoading(false)
  }

  const CustomTooltip = ({ active, payload }) => {
    if (!active || !payload || !payload.length) return null

    const data = payload[0].payload

    return (
      <div className="bg-white border border-gray-300 rounded-lg shadow-lg p-3">
        <div className="font-bold text-gray-800 mb-2">{data.mese}</div>
        <div className="space-y-1 text-sm">
          <div className="flex items-center gap-2">
            <div className="w-3 h-3 rounded bg-blue-500"></div>
            <span className="text-gray-600">Contrattuale:</span>
            <span className="font-semibold">{data.contrattuale.toFixed(1)}h</span>
          </div>
          <div className="flex items-center gap-2">
            <div className="w-3 h-3 rounded bg-green-500"></div>
            <span className="text-gray-600">Effettivo:</span>
            <span className="font-semibold">{data.effettivo.toFixed(1)}h</span>
          </div>
          {data.straordinari > 0 && (
            <div className="flex items-center gap-2">
              <div className="w-3 h-3 rounded bg-yellow-500"></div>
              <span className="text-gray-600">Straordinari:</span>
              <span className="font-semibold text-yellow-600">{data.straordinari.toFixed(1)}h</span>
            </div>
          )}
        </div>
      </div>
    )
  }

  if (loading) {
    return (
      <div className="bg-white rounded-xl border border-gray-200 p-6">
        <div className="text-center py-6 text-gray-500">Caricamento dati straordinari...</div>
      </div>
    )
  }

  const totalOvertime = data.reduce((sum, d) => sum + d.straordinari, 0)

  return (
    <div className="bg-white rounded-xl border border-gray-200 p-6">
      <div className="flex items-center justify-between mb-4">
        <div>
          <h3 className="text-lg font-bold text-gray-800">Ore Lavorate vs Contrattuale</h3>
          <p className="text-sm text-gray-500">
            Totale straordinari {selectedYear}: {totalOvertime.toFixed(1)}h
          </p>
        </div>

        <select
          value={selectedYear}
          onChange={(e) => setSelectedYear(parseInt(e.target.value))}
          className="px-3 py-1.5 border border-gray-300 rounded-lg font-semibold"
        >
          {[2024, 2025, 2026].map(year => (
            <option key={year} value={year}>{year}</option>
          ))}
        </select>
      </div>

      <ResponsiveContainer width="100%" height={300}>
        <BarChart data={data}>
          <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
          <XAxis dataKey="mese" tick={{ fontSize: 12 }} />
          <YAxis tick={{ fontSize: 12 }} label={{ value: 'Ore', angle: -90, position: 'insideLeft' }} />
          <Tooltip content={<CustomTooltip />} />
          <Legend iconType="circle" />
          <Bar dataKey="contrattuale" fill="#3b82f6" name="Ore Contrattuali" radius={[8, 8, 0, 0]} />
          <Bar dataKey="effettivo" fill="#10b981" name="Ore Effettive" radius={[8, 8, 0, 0]} />
        </BarChart>
      </ResponsiveContainer>
    </div>
  )
}
