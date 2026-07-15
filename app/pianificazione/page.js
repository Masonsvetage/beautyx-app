'use client'

import { useState } from 'react'
import BudgetPlanner from '@/components/pianificazione/BudgetPlanner'
import AccantonamentiDashboard from '@/components/pianificazione/AccantonamentiDashboard'
import EmployeeList from '@/components/pianificazione/EmployeeList'
import { useAuth } from '@/contexts/AuthContext'
import HelpTooltip from '@/components/common/HelpTooltip'

export default function PianificazionePage() {
  const { currentCentro, profile } = useAuth()
  const [activeTab, setActiveTab] = useState('budget') // budget, accantonamenti, dipendenti
  const centroId = currentCentro?.centro_id || profile?.centro_id

  if (!centroId) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-800 via-slate-900 to-slate-800 flex items-center justify-center">
        <div className="text-center max-w-md mx-auto p-8">
          <div className="text-5xl mb-4">📊</div>
          <h2 className="text-xl font-bold text-white mb-2">Nessun centro selezionato</h2>
          <p className="text-slate-400">Seleziona un centro dalla navbar per accedere alla pianificazione.</p>
        </div>
      </div>
    )
  }

  return (
    <div className="relative min-h-screen bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900">
      {/* Filigrana AI Background - Design Unico Sfumato */}
      <div className="fixed inset-0 pointer-events-none opacity-30 z-0">
        <svg width="100%" height="100%" xmlns="http://www.w3.org/2000/svg" className="absolute inset-0" preserveAspectRatio="none">
          <defs>
            <filter id="blur-pia">
              <feGaussianBlur in="SourceGraphic" stdDeviation="4" />
            </filter>
            <linearGradient id="grad-pia1" x1="50%" y1="0%" x2="50%" y2="100%">
              <stop offset="0%" style={{stopColor:'#14b8a6', stopOpacity:0.3}} />
              <stop offset="100%" style={{stopColor:'#06b6d4', stopOpacity:0.1}} />
            </linearGradient>
            <linearGradient id="grad-pia2" x1="0%" y1="50%" x2="100%" y2="50%">
              <stop offset="0%" style={{stopColor:'#06b6d4', stopOpacity:0.3}} />
              <stop offset="100%" style={{stopColor:'#14b8a6', stopOpacity:0.1}} />
            </linearGradient>
          </defs>

          {/* Onde fluide */}
          <path d="M 0,180 Q 600,80 1200,180 T 2400,180 L 2400,380 L 0,380 Z"
                fill="url(#grad-pia1)" filter="url(#blur-pia)" opacity="0.35"/>

          <path d="M 0,550 Q 500,420 1000,550 T 2000,550 L 2000,750 L 0,750 Z"
                fill="url(#grad-pia2)" filter="url(#blur-pia)" opacity="0.35"/>

          {/* Curve */}
          <path d="M 250,100 Q 650,280 1050,100 T 1850,100"
                stroke="#14b8a6" strokeWidth="2" fill="none"
                filter="url(#blur-pia)" opacity="0.5"/>

          <path d="M 50,750 Q 550,600 1050,750 T 2050,750"
                stroke="#06b6d4" strokeWidth="2" fill="none"
                filter="url(#blur-pia)" opacity="0.4"/>

          {/* Cerchi */}
          <circle cx="18%" cy="28%" r="210" fill="url(#grad-pia1)" filter="url(#blur-pia)" opacity="0.2"/>
          <circle cx="82%" cy="72%" r="270" fill="url(#grad-pia2)" filter="url(#blur-pia)" opacity="0.2"/>
        </svg>
      </div>

      <div className="relative z-10 container mx-auto px-2 py-2 max-w-7xl">
        {/* Header e Tab Navigation */}
        <div className="bg-slate-800/50 backdrop-blur-xl rounded border border-slate-600/40 p-3 mb-2" style={{
          boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.7), 0 10px 25px -5px rgba(0, 0, 0, 0.5), 0 0 0 1px rgba(148, 163, 184, 0.1)'
        }}>
          <div className="flex items-center gap-2 mb-3">
            <h1 className="text-xl font-bold text-slate-100">📊 Pianificazione Finanziaria</h1>
            <HelpTooltip
              title="Pianificazione Finanziaria"
              content="Budget Planning: imposta obiettivi di fatturato mensile e monitora il raggiungimento. Accantonamenti: metti da parte quote dai ricavi per IVA, tasse, fondo emergenza. Dipendenti: gestisci lo staff e i costi orari usati nei calcoli del listino. Crea almeno un obiettivo per attivare il monitoraggio automatico di BeautyX."
            />
          </div>

          <div className="flex gap-1 bg-slate-700/50 p-0.5 rounded">
            <button
              onClick={() => setActiveTab('budget')}
              className={`flex-1 px-4 py-2 rounded text-sm font-semibold transition-all ${
                activeTab === 'budget'
                  ? 'bg-gradient-to-r from-teal-600 to-cyan-600 text-white shadow-lg'
                  : 'text-slate-300 hover:bg-slate-700'
              }`}
            >
              💰 Budget Planning
            </button>
            <button
              onClick={() => setActiveTab('accantonamenti')}
              className={`flex-1 px-4 py-2 rounded text-sm font-semibold transition-all ${
                activeTab === 'accantonamenti'
                  ? 'bg-gradient-to-r from-teal-600 to-cyan-600 text-white shadow-lg'
                  : 'text-slate-300 hover:bg-slate-700'
              }`}
            >
              🏦 Accantonamenti
            </button>
            <button
              onClick={() => setActiveTab('dipendenti')}
              className={`flex-1 px-4 py-2 rounded text-sm font-semibold transition-all ${
                activeTab === 'dipendenti'
                  ? 'bg-gradient-to-r from-teal-600 to-cyan-600 text-white shadow-lg'
                  : 'text-slate-300 hover:bg-slate-700'
              }`}
            >
              👥 Dipendenti
            </button>
          </div>
        </div>

        {/* Tab Content */}
        <div className="mt-2">
          {activeTab === 'budget' && <BudgetPlanner centroId={centroId} />}
          {activeTab === 'accantonamenti' && <AccantonamentiDashboard centroId={centroId} />}
          {activeTab === 'dipendenti' && <EmployeeList centroId={centroId} />}
        </div>
      </div>
    </div>
  )
}
