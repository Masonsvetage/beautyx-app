'use client'

import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from 'recharts'
import { formatEuro } from '@/lib/formatters'

export default function BudgetComparisonChart({ comparisons }) {
  // Raggruppa per categoria
  const byCategory = comparisons.reduce((acc, comp) => {
    if (!acc[comp.categoria]) {
      acc[comp.categoria] = { categoria: comp.categoria, budgeted: 0, actual: 0 }
    }
    acc[comp.categoria].budgeted += comp.budgeted
    acc[comp.categoria].actual += comp.actual
    return acc
  }, {})

  const chartData = Object.values(byCategory)

  const CustomTooltip = ({ active, payload }) => {
    if (!active || !payload || !payload.length) return null

    const data = payload[0].payload
    const percentage = data.budgeted > 0 ? ((data.actual / data.budgeted) * 100).toFixed(1) : 0
    const status = percentage >= 100 ? 'Sopra budget' : percentage >= 80 ? 'Vicino al budget' : 'Sotto budget'

    return (
      <div className="bg-white border border-gray-300 rounded-lg shadow-lg p-3">
        <div className="font-bold text-gray-800 mb-2">{data.categoria}</div>
        <div className="space-y-1 text-sm">
          <div className="flex items-center gap-2">
            <div className="w-3 h-3 rounded bg-blue-500"></div>
            <span className="text-gray-600">Budget:</span>
            <span className="font-semibold">{formatEuro(data.budgeted)}</span>
          </div>
          <div className="flex items-center gap-2">
            <div className="w-3 h-3 rounded bg-green-500"></div>
            <span className="text-gray-600">Speso:</span>
            <span className="font-semibold">{formatEuro(data.actual)}</span>
          </div>
          <div className="pt-1 border-t border-gray-200">
            <span className="text-gray-600">Utilizzo:</span>
            <span className={`ml-2 font-bold ${
              percentage >= 100 ? 'text-red-600' :
              percentage >= 80 ? 'text-yellow-600' : 'text-green-600'
            }`}>
              {percentage}% - {status}
            </span>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="bg-white border border-gray-200 rounded-xl p-6">
      <h3 className="text-lg font-bold text-gray-800 mb-4">📊 Confronto Budget vs Spese Effettive</h3>

      <ResponsiveContainer width="100%" height={400}>
        <BarChart data={chartData} margin={{ top: 20, right: 30, left: 20, bottom: 80 }}>
          <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
          <XAxis
            dataKey="categoria"
            angle={-45}
            textAnchor="end"
            height={100}
            tick={{ fontSize: 12 }}
          />
          <YAxis
            tick={{ fontSize: 12 }}
            tickFormatter={(value) => `€${(value / 1000).toFixed(0)}k`}
          />
          <Tooltip content={<CustomTooltip />} />
          <Legend
            wrapperStyle={{ paddingTop: '20px' }}
            iconType="circle"
          />
          <Bar
            dataKey="budgeted"
            fill="#3b82f6"
            name="Budget Pianificato"
            radius={[8, 8, 0, 0]}
          />
          <Bar
            dataKey="actual"
            fill="#10b981"
            name="Spesa Effettiva"
            radius={[8, 8, 0, 0]}
          />
        </BarChart>
      </ResponsiveContainer>

      {/* Legend Status */}
      <div className="mt-6 flex items-center justify-center gap-6 text-sm">
        <div className="flex items-center gap-2">
          <div className="w-4 h-4 rounded bg-green-500"></div>
          <span className="text-gray-600">Sotto budget (&lt;80%)</span>
        </div>
        <div className="flex items-center gap-2">
          <div className="w-4 h-4 rounded bg-yellow-500"></div>
          <span className="text-gray-600">Vicino al budget (80-100%)</span>
        </div>
        <div className="flex items-center gap-2">
          <div className="w-4 h-4 rounded bg-red-500"></div>
          <span className="text-gray-600">Sopra budget (&gt;100%)</span>
        </div>
      </div>
    </div>
  )
}
