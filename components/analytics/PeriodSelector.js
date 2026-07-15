'use client'

import { useState } from 'react'
import { format, subDays, subMonths, startOfMonth, endOfMonth, startOfYear, endOfYear } from 'date-fns'

export default function PeriodSelector({ onPeriodChange }) {
  const [preset, setPreset] = useState('month')
  const [customStart, setCustomStart] = useState('')
  const [customEnd, setCustomEnd] = useState('')

  const currentYear = new Date().getFullYear()
  const previousYear = currentYear - 1

  const presets = {
    week: {
      label: 'Ultima Settimana',
      start: format(subDays(new Date(), 7), 'yyyy-MM-dd'),
      end: format(new Date(), 'yyyy-MM-dd')
    },
    month: {
      label: 'Ultimo Mese',
      start: format(subMonths(new Date(), 1), 'yyyy-MM-dd'),
      end: format(new Date(), 'yyyy-MM-dd')
    },
    currentMonth: {
      label: 'Mese Corrente',
      start: format(startOfMonth(new Date()), 'yyyy-MM-dd'),
      end: format(endOfMonth(new Date()), 'yyyy-MM-dd')
    },
    quarter: {
      label: 'Ultimi 3 Mesi',
      start: format(subMonths(new Date(), 3), 'yyyy-MM-dd'),
      end: format(new Date(), 'yyyy-MM-dd')
    },
    year: {
      label: 'Anno Corrente',
      start: format(startOfYear(new Date()), 'yyyy-MM-dd'),
      end: format(endOfYear(new Date()), 'yyyy-MM-dd')
    },
    previousYear: {
      label: `Anno Precedente (${previousYear})`,
      start: `${previousYear}-01-01`,
      end: `${previousYear}-12-31`
    },
    custom: {
      label: 'Personalizzato'
    }
  }

  function handlePresetChange(newPreset) {
    setPreset(newPreset)
    if (newPreset !== 'custom') {
      const period = presets[newPreset]
      onPeriodChange({
        startDate: period.start,
        endDate: period.end,
        label: period.label
      })
    }
  }

  function handleCustomChange() {
    if (customStart && customEnd) {
      onPeriodChange({
        startDate: customStart,
        endDate: customEnd,
        label: 'Periodo Personalizzato'
      })
    }
  }

  const shortLabels = {
    week: '7gg',
    month: '30gg',
    currentMonth: 'Mese',
    quarter: '3M',
    year: 'Anno',
    previousYear: previousYear.toString(),
    custom: '...'
  }

  return (
    <div className="bg-white rounded border border-gray-200 p-1.5">
      <div className="flex items-center gap-2">
        {/* Preset buttons */}
        <div className="flex items-center gap-1 flex-1">
          <span className="text-xs font-semibold text-gray-700">Periodo:</span>
          {Object.entries(presets).filter(([key]) => key !== 'custom').map(([key, value]) => (
            <button
              key={key}
              onClick={() => handlePresetChange(key)}
              className={`px-2 py-0.5 rounded text-xs font-semibold ${
                preset === key
                  ? 'bg-teal-600 text-white'
                  : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
              }`}
            >
              {shortLabels[key]}
            </button>
          ))}
        </div>

        {/* Custom Date Range sempre visibile */}
        <div className="flex items-center gap-1 border-l border-gray-300 pl-2">
          <span className="text-xs text-gray-600">Da:</span>
          <input
            type="date"
            value={customStart}
            onChange={(e) => {
              setCustomStart(e.target.value)
              setPreset('custom')
            }}
            className="px-1.5 py-0.5 border border-gray-300 rounded text-xs w-24"
          />
          <span className="text-xs text-gray-600">A:</span>
          <input
            type="date"
            value={customEnd}
            onChange={(e) => {
              setCustomEnd(e.target.value)
              setPreset('custom')
            }}
            className="px-1.5 py-0.5 border border-gray-300 rounded text-xs w-24"
          />
          <button
            onClick={handleCustomChange}
            disabled={!customStart || !customEnd}
            className="px-2 py-0.5 bg-teal-600 text-white rounded text-xs font-semibold hover:bg-teal-700 disabled:opacity-50"
          >
            OK
          </button>
        </div>
      </div>
    </div>
  )
}
