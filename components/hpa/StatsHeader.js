'use client'

import { useState, useEffect } from 'react'

export default function StatsHeader({ stats, loading }) {
  const statCards = [
    {
      label: 'Centri Gestiti',
      value: stats?.centri_gestiti || 0,
      icon: (
        <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4" />
        </svg>
      ),
      color: 'purple'
    },
    {
      label: 'Appuntamenti Oggi',
      value: stats?.appuntamenti_oggi || 0,
      icon: (
        <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
        </svg>
      ),
      color: 'teal'
    },
    {
      label: 'Minuti Call (Mese)',
      value: stats?.minuti_call_mese || 0,
      icon: (
        <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
        </svg>
      ),
      color: 'blue'
    },
    {
      label: 'Obiettivi Attivi',
      value: stats?.obiettivi_attivi || 0,
      icon: (
        <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
        </svg>
      ),
      color: 'emerald'
    },
    {
      label: 'Messaggi Non Letti',
      value: stats?.messaggi_non_letti || 0,
      icon: (
        <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
        </svg>
      ),
      color: 'amber',
      alert: stats?.messaggi_non_letti > 0
    },
    {
      label: 'Richieste Urgenti',
      value: stats?.richieste_urgenti || 0,
      icon: (
        <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
        </svg>
      ),
      color: 'red',
      alert: stats?.richieste_urgenti > 0
    }
  ]

  const colorClasses = {
    purple: 'bg-purple-500/20 text-purple-400 border-purple-500/30',
    teal: 'bg-teal-500/20 text-teal-400 border-teal-500/30',
    blue: 'bg-blue-500/20 text-blue-400 border-blue-500/30',
    emerald: 'bg-emerald-500/20 text-emerald-400 border-emerald-500/30',
    amber: 'bg-amber-500/20 text-amber-400 border-amber-500/30',
    red: 'bg-red-500/20 text-red-400 border-red-500/30'
  }

  if (loading) {
    return (
      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-3">
        {[...Array(6)].map((_, i) => (
          <div key={i} className="bg-slate-800/50 rounded-xl p-4 animate-pulse">
            <div className="h-10 w-10 bg-slate-700 rounded-lg mb-2"></div>
            <div className="h-4 w-16 bg-slate-700 rounded mb-1"></div>
            <div className="h-6 w-12 bg-slate-700 rounded"></div>
          </div>
        ))}
      </div>
    )
  }

  return (
    <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-3">
      {statCards.map((stat, index) => (
        <div
          key={index}
          className={`bg-slate-800/50 backdrop-blur-sm rounded-xl p-4 border ${
            stat.alert ? 'border-red-500/50 animate-pulse' : 'border-slate-700/50'
          }`}
        >
          <div className={`w-10 h-10 rounded-lg flex items-center justify-center mb-2 ${colorClasses[stat.color]}`}>
            {stat.icon}
          </div>
          <p className="text-xs text-slate-400 mb-1">{stat.label}</p>
          <p className={`text-2xl font-bold ${stat.alert ? 'text-red-400' : 'text-white'}`}>
            {stat.value}
          </p>
        </div>
      ))}
    </div>
  )
}
