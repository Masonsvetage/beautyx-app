'use client'

import { useState, useEffect } from 'react'
import Link from 'next/link'
import { useAuth } from '@/contexts/AuthContext'
import { LineChart, Line, XAxis, YAxis, Tooltip, ResponsiveContainer, BarChart, Bar, Cell, PieChart, Pie } from 'recharts'

export default function AdminPanel() {
  const { profile } = useAuth()
  const [data, setData] = useState(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    loadDashboard()
  }, [])

  const loadDashboard = async () => {
    try {
      const res = await fetch('/api/admin/dashboard')
      const json = await res.json()
      setData(json)
    } catch (error) {
      console.error('Errore caricamento dashboard:', error)
    } finally {
      setLoading(false)
    }
  }

  const stats = data?.stats || {}
  const health = data?.health || {}
  const trend = data?.registrationTrend || []
  const hpas = data?.hpaPerformance || []
  const activityLevels = data?.activityLevels || []
  const recentUsers = data?.recentUsers || []

  // Colori per i livelli di attivita
  const activityColors = {
    molto_attivo: '#10b981',
    attivo: '#3b82f6',
    basso: '#f59e0b',
    inattivo: '#ef4444',
    mai_collegato: '#6b7280'
  }
  const activityLabels = {
    molto_attivo: 'Molto attivo',
    attivo: 'Attivo',
    basso: 'Basso',
    inattivo: 'Inattivo',
    mai_collegato: 'Mai collegato'
  }

  // Conta problemi totali per il badge di salute
  const healthIssues = (health.users_without_centro || 0) + (health.expired_subscriptions || 0) +
    (health.pending_contact_requests || 0) + (health.unassigned_centri || 0)

  const roleColors = { admin: 'emerald', hpa: 'purple', titolare: 'cyan', direttore: 'blue', amministrativo: 'amber' }

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900 flex items-center justify-center">
        <div className="text-center">
          <div className="w-12 h-12 border-4 border-teal-500 border-t-transparent rounded-full animate-spin mx-auto"></div>
          <p className="mt-4 text-slate-400">Caricamento dashboard...</p>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900 p-4 md:p-6">
      <div className="max-w-7xl mx-auto space-y-6">

        {/* Header */}
        <div className="bg-slate-950/60 backdrop-blur-md rounded-xl border border-slate-700/50 p-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 bg-gradient-to-br from-teal-600 to-cyan-600 rounded-lg flex items-center justify-center">
                <svg className="w-6 h-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3.055 11H5a2 2 0 012 2v1a2 2 0 002 2 2 2 0 012 2v2.945M8 3.935V5.5A2.5 2.5 0 0010.5 8h.5a2 2 0 012 2 2 2 0 104 0 2 2 0 012-2h1.064M15 20.488V18a2 2 0 012-2h3.064M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
              </div>
              <div>
                <h1 className="text-2xl font-bold text-white">Pannello di Controllo</h1>
                <p className="text-sm text-teal-300">Vista Globale - Benvenuto, {profile?.nome || profile?.email}</p>
              </div>
            </div>
            {healthIssues > 0 && (
              <div className="bg-amber-500/20 border border-amber-500/40 rounded-lg px-3 py-1.5 text-amber-300 text-sm">
                {healthIssues} problemi da risolvere
              </div>
            )}
          </div>
        </div>

        {/* KPI Cards */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          <div className="bg-slate-800/50 backdrop-blur-sm rounded-xl p-4 border border-slate-700/50">
            <p className="text-slate-400 text-sm">Utenti Totali</p>
            <p className="text-3xl font-bold text-white">{stats.total_users || 0}</p>
            <div className="mt-2 flex gap-2 flex-wrap">
              {stats.users_by_role && typeof stats.users_by_role === 'object' &&
                Object.entries(stats.users_by_role).map(([role, count]) => (
                  <span key={role} className="text-xs text-slate-400">
                    {role}: <span className="text-slate-300">{count}</span>
                  </span>
                ))
              }
            </div>
          </div>
          <div className="bg-slate-800/50 backdrop-blur-sm rounded-xl p-4 border border-slate-700/50">
            <p className="text-slate-400 text-sm">Centri Attivi</p>
            <p className="text-3xl font-bold text-teal-400">{stats.total_centri || 0}</p>
            <p className="mt-2 text-xs text-slate-400">
              Abbonamenti: <span className="text-teal-300">{stats.active_subscriptions || 0}</span>
            </p>
          </div>
          <div className="bg-slate-800/50 backdrop-blur-sm rounded-xl p-4 border border-slate-700/50">
            <p className="text-slate-400 text-sm">Ricavo Mensile</p>
            <p className="text-3xl font-bold text-emerald-400">
              {((stats.total_mrr || 0) / 100).toFixed(0)}€
            </p>
            <p className="mt-2 text-xs text-slate-400">da abbonamenti attivi</p>
          </div>
          <div className="bg-slate-800/50 backdrop-blur-sm rounded-xl p-4 border border-slate-700/50">
            <p className="text-slate-400 text-sm">Utenti Attivi</p>
            <p className="text-3xl font-bold text-blue-400">{stats.active_users_7d || 0}</p>
            <div className="mt-2 text-xs text-slate-400">
              24h: <span className="text-blue-300">{stats.active_users_24h || 0}</span>
              {' | '}30d: <span className="text-blue-300">{stats.active_users_30d || 0}</span>
            </div>
          </div>
        </div>

        {/* Charts Row */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Registration Trend */}
          <div className="bg-slate-800/50 backdrop-blur-sm rounded-xl p-4 border border-slate-700/50">
            <h3 className="text-white font-semibold mb-4">Trend Registrazioni (30 giorni)</h3>
            {trend.length > 0 ? (
              <ResponsiveContainer width="100%" height={200}>
                <LineChart data={trend}>
                  <XAxis dataKey="registration_date" tick={{ fill: '#94a3b8', fontSize: 10 }}
                    tickFormatter={(d) => new Date(d).toLocaleDateString('it-IT', { day: '2-digit', month: '2-digit' })} />
                  <YAxis tick={{ fill: '#94a3b8', fontSize: 10 }} allowDecimals={false} />
                  <Tooltip
                    contentStyle={{ background: '#1e293b', border: '1px solid #475569', borderRadius: 8 }}
                    labelStyle={{ color: '#94a3b8' }}
                    labelFormatter={(d) => new Date(d).toLocaleDateString('it-IT')}
                  />
                  <Line type="monotone" dataKey="user_count" stroke="#14b8a6" strokeWidth={2} dot={false} />
                </LineChart>
              </ResponsiveContainer>
            ) : (
              <p className="text-slate-500 text-sm text-center py-8">Nessun dato disponibile</p>
            )}
          </div>

          {/* Activity Levels */}
          <div className="bg-slate-800/50 backdrop-blur-sm rounded-xl p-4 border border-slate-700/50">
            <h3 className="text-white font-semibold mb-4">Livelli Attivita Utenti</h3>
            {activityLevels.length > 0 ? (
              <div className="flex items-center gap-6">
                <div className="w-40 h-40 flex-shrink-0">
                  <ResponsiveContainer width="100%" height="100%">
                    <PieChart>
                      <Pie data={activityLevels} dataKey="user_count" nameKey="activity_level" cx="50%" cy="50%"
                        innerRadius={30} outerRadius={60} paddingAngle={2}>
                        {activityLevels.map((entry) => (
                          <Cell key={entry.activity_level} fill={activityColors[entry.activity_level] || '#6b7280'} />
                        ))}
                      </Pie>
                      <Tooltip contentStyle={{ background: '#1e293b', border: '1px solid #475569', borderRadius: 8 }}
                        formatter={(value, name) => [value, activityLabels[name] || name]} />
                    </PieChart>
                  </ResponsiveContainer>
                </div>
                <div className="space-y-2 flex-1">
                  {activityLevels.map((level) => (
                    <div key={level.activity_level} className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <div className="w-3 h-3 rounded-full" style={{ backgroundColor: activityColors[level.activity_level] }} />
                        <span className="text-sm text-slate-300">{activityLabels[level.activity_level] || level.activity_level}</span>
                      </div>
                      <span className="text-sm font-medium text-white">{level.user_count}</span>
                    </div>
                  ))}
                </div>
              </div>
            ) : (
              <p className="text-slate-500 text-sm text-center py-8">Nessun dato disponibile</p>
            )}
          </div>
        </div>

        {/* System Health Alerts */}
        {healthIssues > 0 && (
          <div className="bg-slate-800/50 backdrop-blur-sm rounded-xl p-4 border border-amber-500/30">
            <h3 className="text-amber-300 font-semibold mb-3">Problemi da Risolvere</h3>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
              {health.users_without_centro > 0 && (
                <Link href="/admin/users" className="flex items-center gap-3 bg-slate-700/30 rounded-lg p-3 hover:bg-slate-700/50 transition-colors">
                  <div className="w-8 h-8 bg-red-500/20 rounded-lg flex items-center justify-center flex-shrink-0">
                    <span className="text-red-400 text-sm">!</span>
                  </div>
                  <div>
                    <p className="text-white text-sm font-medium">{health.users_without_centro} utenti senza centro</p>
                    <p className="text-slate-400 text-xs">Assegna un centro</p>
                  </div>
                </Link>
              )}
              {health.expired_subscriptions > 0 && (
                <div className="flex items-center gap-3 bg-slate-700/30 rounded-lg p-3">
                  <div className="w-8 h-8 bg-amber-500/20 rounded-lg flex items-center justify-center flex-shrink-0">
                    <span className="text-amber-400 text-sm">!</span>
                  </div>
                  <div>
                    <p className="text-white text-sm font-medium">{health.expired_subscriptions} abbonamenti scaduti</p>
                    <p className="text-slate-400 text-xs">Da rinnovare</p>
                  </div>
                </div>
              )}
              {health.pending_contact_requests > 0 && (
                <div className="flex items-center gap-3 bg-slate-700/30 rounded-lg p-3">
                  <div className="w-8 h-8 bg-orange-500/20 rounded-lg flex items-center justify-center flex-shrink-0">
                    <span className="text-orange-400 text-sm">!</span>
                  </div>
                  <div>
                    <p className="text-white text-sm font-medium">{health.pending_contact_requests} richieste in attesa</p>
                    <p className="text-slate-400 text-xs">Contatti da gestire</p>
                  </div>
                </div>
              )}
              {health.unassigned_centri > 0 && (
                <Link href="/admin/hpa" className="flex items-center gap-3 bg-slate-700/30 rounded-lg p-3 hover:bg-slate-700/50 transition-colors">
                  <div className="w-8 h-8 bg-purple-500/20 rounded-lg flex items-center justify-center flex-shrink-0">
                    <span className="text-purple-400 text-sm">!</span>
                  </div>
                  <div>
                    <p className="text-white text-sm font-medium">{health.unassigned_centri} centri senza HPA</p>
                    <p className="text-slate-400 text-xs">Assegna consulente</p>
                  </div>
                </Link>
              )}
            </div>
          </div>
        )}

        {/* Metriche di attivita utenti (informativo, non problemi) */}
        {(health.users_never_logged_in > 0 || health.users_inactive_30d > 0) && (
          <div className="bg-slate-800/50 backdrop-blur-sm rounded-xl p-4 border border-slate-700/50">
            <h3 className="text-slate-300 font-semibold mb-3">Monitoraggio Attivita</h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              {health.users_never_logged_in > 0 && (
                <Link href="/admin/users" className="flex items-center gap-3 bg-slate-700/30 rounded-lg p-3 hover:bg-slate-700/50 transition-colors">
                  <div className="w-8 h-8 bg-gray-500/20 rounded-lg flex items-center justify-center flex-shrink-0">
                    <span className="text-gray-400 text-sm">i</span>
                  </div>
                  <div>
                    <p className="text-white text-sm font-medium">{health.users_never_logged_in} mai collegati</p>
                    <p className="text-slate-400 text-xs">Utenti registrati ma mai entrati</p>
                  </div>
                </Link>
              )}
              {health.users_inactive_30d > 0 && (
                <Link href="/admin/monitoring" className="flex items-center gap-3 bg-slate-700/30 rounded-lg p-3 hover:bg-slate-700/50 transition-colors">
                  <div className="w-8 h-8 bg-yellow-500/20 rounded-lg flex items-center justify-center flex-shrink-0">
                    <span className="text-yellow-400 text-sm">i</span>
                  </div>
                  <div>
                    <p className="text-white text-sm font-medium">{health.users_inactive_30d} inattivi +30 giorni</p>
                    <p className="text-slate-400 text-xs">Vedi nel monitoraggio</p>
                  </div>
                </Link>
              )}
            </div>
          </div>
        )}

        {/* Quick Actions */}
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
          {[
            { href: '/admin/users', label: 'Gestione Utenti', desc: 'Crea, modifica, assegna', color: 'blue', icon: 'M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197M13 7a4 4 0 11-8 0 4 4 0 018 0z' },
            { href: '/admin/hpa', label: 'Assegnazioni HPA', desc: 'Consulenti e centri', color: 'purple', icon: 'M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z' },
            { href: '/admin/centri', label: 'Centri Estetici', desc: 'Gestisci centri', color: 'teal', icon: 'M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4' },
            { href: '/admin/messaggi', label: 'Console Messaggi', desc: 'Annunci e marketing', color: 'emerald', icon: 'M8 10h.01M12 10h.01M16 10h.01M9 16H5a2 2 0 01-2-2V6a2 2 0 012-2h14a2 2 0 012 2v8a2 2 0 01-2 2h-5l-5 5v-5z' },
            { href: '/admin/monitoring', label: 'Monitoraggio', desc: 'HPA, utenti, sistema', color: 'amber', icon: 'M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z' },
            { href: '/admin/organizzazioni', label: 'Organizzazioni', desc: 'Multi-sede', color: 'orange', icon: 'M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4' },
            { href: '/admin/abbonamenti', label: 'Abbonamenti', desc: 'Piani, pacchetti, campagne', color: 'cyan', icon: 'M3 10h18M7 15h1m4 0h1m-7 4h12a3 3 0 003-3V8a3 3 0 00-3-3H6a3 3 0 00-3 3v8a3 3 0 003 3z' },
            { href: '/admin/permessi', label: 'Permessi', desc: 'Controllo accessi', color: 'rose', icon: 'M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z' },
            { href: '/admin/legal', label: 'Documenti Legali', desc: 'Contratti, privacy, policy', color: 'indigo', icon: 'M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z' },
            { href: '/admin/marketing', label: 'Marketing & Sito', desc: 'News, recensioni, benchmark landing', color: 'pink', icon: 'M21 12a9 9 0 01-9 9m9-9a9 9 0 00-9-9m9 9H3m9 9a9 9 0 01-9-9m9 9c1.657 0 3-4.03 3-9s-1.343-9-3-9m0 18c-1.657 0-3-4.03-3-9s1.343-9 3-9m-9 9a9 9 0 019-9' },
            { href: '/admin/configurazioni', label: 'Configurazioni', desc: 'Avatar Beautyx, impostazioni globali', color: 'teal', icon: 'M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065zM15 12a3 3 0 11-6 0 3 3 0 016 0z' },
            { href: '/admin/koibox', label: 'Import Koibox', desc: 'Importa clienti, casse e servizi', color: 'cyan', icon: 'M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12' },
            { href: '/admin/agenti', label: 'Console Agenti AI', desc: 'System prompt BeautyX, Receptionist, Analista, Marketing', color: 'teal', icon: 'M9.75 17L9 20l-1 1h8l-1-1-.75-3M3 13h18M5 17h14a2 2 0 002-2V5a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z' },
          ].map(({ href, label, desc, color, icon }) => (
            <Link key={href} href={href} className="group">
              <div className={`bg-gradient-to-br from-${color}-600/20 to-${color}-600/10 backdrop-blur-sm rounded-xl p-4 border border-${color}-500/30 hover:border-${color}-400/50 transition-all h-full`}>
                <div className="flex items-center gap-3">
                  <div className={`w-10 h-10 bg-${color}-500/20 rounded-lg flex items-center justify-center flex-shrink-0`}>
                    <svg className={`w-5 h-5 text-${color}-400`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d={icon} />
                    </svg>
                  </div>
                  <div>
                    <h3 className={`text-sm font-semibold text-white group-hover:text-${color}-300 transition-colors`}>{label}</h3>
                    <p className="text-xs text-slate-400">{desc}</p>
                  </div>
                </div>
              </div>
            </Link>
          ))}
        </div>

        {/* Bottom Row: HPA Performance + Recent Users */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* HPA Performance */}
          <div className="bg-slate-800/50 backdrop-blur-sm rounded-xl p-4 border border-slate-700/50">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-white font-semibold">Performance HPA</h3>
              <Link href="/admin/monitoring/hpa" className="text-xs text-teal-400 hover:text-teal-300">Vedi tutto</Link>
            </div>
            {hpas.length > 0 ? (
              <div className="space-y-3">
                {hpas.slice(0, 5).map((hpa) => {
                  const completion = hpa.appuntamenti_mese > 0
                    ? Math.round((hpa.appuntamenti_completati_mese / hpa.appuntamenti_mese) * 100)
                    : 0
                  return (
                    <div key={hpa.hpa_id} className="flex items-center justify-between bg-slate-700/30 rounded-lg p-3">
                      <div>
                        <p className="text-white text-sm font-medium">{hpa.hpa_nome}</p>
                        <p className="text-slate-400 text-xs">{hpa.centri_gestiti} centri | {hpa.messaggi_mese} msg questo mese</p>
                      </div>
                      <div className="text-right">
                        <p className={`text-sm font-bold ${completion >= 70 ? 'text-emerald-400' : completion >= 40 ? 'text-amber-400' : 'text-red-400'}`}>
                          {completion}%
                        </p>
                        <p className="text-slate-500 text-xs">{hpa.appuntamenti_completati_mese}/{hpa.appuntamenti_mese} app.</p>
                      </div>
                    </div>
                  )
                })}
              </div>
            ) : (
              <p className="text-slate-500 text-sm text-center py-4">Nessun HPA configurato</p>
            )}
          </div>

          {/* Recent Users */}
          <div className="bg-slate-800/50 backdrop-blur-sm rounded-xl p-4 border border-slate-700/50">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-white font-semibold">Ultimi Utenti Registrati</h3>
              <Link href="/admin/users" className="text-xs text-teal-400 hover:text-teal-300">Vedi tutto</Link>
            </div>
            {recentUsers.length > 0 ? (
              <div className="space-y-3">
                {recentUsers.map((user) => (
                  <div key={user.id} className="flex items-center justify-between bg-slate-700/30 rounded-lg p-3">
                    <div className="flex items-center gap-3">
                      <div className="w-8 h-8 bg-gradient-to-br from-pink-500 to-purple-600 rounded-full flex items-center justify-center flex-shrink-0">
                        <span className="text-xs font-bold text-white">
                          {(user.nome || user.email)?.[0]?.toUpperCase()}
                        </span>
                      </div>
                      <div>
                        <p className="text-white text-sm">{user.nome ? `${user.nome} ${user.cognome || ''}`.trim() : user.email}</p>
                        <p className="text-slate-400 text-xs">{user.email}</p>
                      </div>
                    </div>
                    <div className="text-right">
                      <span className={`text-xs px-2 py-0.5 rounded-full ${
                        user.ruolo_livello === 'admin' ? 'bg-emerald-500/20 text-emerald-300' :
                        user.ruolo_livello === 'hpa' ? 'bg-purple-500/20 text-purple-300' :
                        'bg-cyan-500/20 text-cyan-300'
                      }`}>
                        {user.ruolo_livello}
                      </span>
                      <p className="text-slate-500 text-xs mt-1">
                        {new Date(user.created_at).toLocaleDateString('it-IT')}
                      </p>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <p className="text-slate-500 text-sm text-center py-4">Nessun utente recente</p>
            )}
          </div>
        </div>

      </div>
    </div>
  )
}
