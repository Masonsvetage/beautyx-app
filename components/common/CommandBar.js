'use client'

import { useState } from 'react'

/**
 * Barra comandi standard per tutte le pagine
 * Fornisce un'interfaccia uniforme per le azioni principali
 *
 * @param {Array} commands - Array di comandi da visualizzare
 *   Ogni comando ha: { id, label, icon, description, active, onClick, color }
 * @param {string} position - 'top' | 'bottom' (default: 'top')
 * @param {boolean} collapsed - Se true mostra solo le icone con tooltip
 */
export default function CommandBar({
  commands = [],
  position = 'top',
  collapsed = false,
  className = ''
}) {
  const [expandedCommand, setExpandedCommand] = useState(null)

  const colorClasses = {
    teal: {
      bg: 'bg-teal-600 hover:bg-teal-700',
      bgActive: 'bg-teal-700',
      border: 'border-teal-500/40',
      text: 'text-teal-200'
    },
    cyan: {
      bg: 'bg-cyan-600 hover:bg-cyan-700',
      bgActive: 'bg-cyan-700',
      border: 'border-cyan-500/40',
      text: 'text-cyan-200'
    },
    emerald: {
      bg: 'bg-emerald-600 hover:bg-emerald-700',
      bgActive: 'bg-emerald-700',
      border: 'border-emerald-500/40',
      text: 'text-emerald-200'
    },
    amber: {
      bg: 'bg-amber-600 hover:bg-amber-700',
      bgActive: 'bg-amber-700',
      border: 'border-amber-500/40',
      text: 'text-amber-200'
    },
    blue: {
      bg: 'bg-blue-600 hover:bg-blue-700',
      bgActive: 'bg-blue-700',
      border: 'border-blue-500/40',
      text: 'text-blue-200'
    },
    indigo: {
      bg: 'bg-indigo-600 hover:bg-indigo-700',
      bgActive: 'bg-indigo-700',
      border: 'border-indigo-500/40',
      text: 'text-indigo-200'
    },
    purple: {
      bg: 'bg-purple-600 hover:bg-purple-700',
      bgActive: 'bg-purple-700',
      border: 'border-purple-500/40',
      text: 'text-purple-200'
    },
    slate: {
      bg: 'bg-slate-600 hover:bg-slate-700',
      bgActive: 'bg-slate-700',
      border: 'border-slate-500/40',
      text: 'text-slate-200'
    }
  }

  const getColors = (color) => colorClasses[color] || colorClasses.slate

  if (collapsed) {
    // Versione compatta con solo icone e tooltip
    return (
      <div className={`bg-slate-800/50 backdrop-blur-xl rounded-lg border border-slate-600/40 p-1.5 ${className}`}
           style={{
             boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.7), 0 10px 25px -5px rgba(0, 0, 0, 0.5)'
           }}>
        <div className="flex gap-1">
          {commands.map((cmd) => {
            const colors = getColors(cmd.color)
            return (
              <div key={cmd.id} className="relative group">
                <button
                  onClick={cmd.onClick}
                  className={`w-8 h-8 rounded-lg text-sm font-semibold flex items-center justify-center transition-all ${
                    cmd.active
                      ? `${colors.bgActive} text-white shadow-lg`
                      : `${colors.bg} text-white`
                  }`}
                >
                  {cmd.active && cmd.activeIcon ? cmd.activeIcon : cmd.icon}
                </button>
                {/* Tooltip */}
                <div className="absolute bottom-full left-1/2 transform -translate-x-1/2 mb-2 px-3 py-2 bg-slate-900 text-white text-xs rounded-lg whitespace-nowrap opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none z-50 shadow-xl">
                  <div className="font-semibold">{cmd.label}</div>
                  {cmd.description && (
                    <div className="text-slate-400 text-xs mt-0.5">{cmd.description}</div>
                  )}
                  <div className="absolute top-full left-1/2 transform -translate-x-1/2 -mt-1 border-4 border-transparent border-t-slate-900"></div>
                </div>
              </div>
            )
          })}
        </div>
      </div>
    )
  }

  // Versione espansa con label e descrizioni
  return (
    <div className={`bg-slate-800/50 backdrop-blur-xl rounded-xl border border-slate-600/40 p-3 ${className}`}
         style={{
           boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.7), 0 10px 25px -5px rgba(0, 0, 0, 0.5)'
         }}>
      <div className="flex flex-wrap gap-2">
        {commands.map((cmd) => {
          const colors = getColors(cmd.color)
          return (
            <button
              key={cmd.id}
              onClick={cmd.onClick}
              className={`flex items-center gap-2 px-4 py-2.5 rounded-lg text-sm font-semibold transition-all ${
                cmd.active
                  ? `${colors.bgActive} text-white shadow-lg ring-2 ring-white/20`
                  : `${colors.bg} text-white`
              }`}
            >
              <span className="text-lg">
                {cmd.active && cmd.activeIcon ? cmd.activeIcon : cmd.icon}
              </span>
              <div className="text-left">
                <div className="font-semibold">{cmd.label}</div>
                {cmd.description && (
                  <div className="text-xs opacity-80">{cmd.description}</div>
                )}
              </div>
            </button>
          )
        })}
      </div>
    </div>
  )
}
