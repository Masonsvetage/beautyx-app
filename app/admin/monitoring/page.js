'use client'

import Link from 'next/link'

export default function MonitoringIndexPage() {
  const sections = [
    {
      href: '/admin/monitoring/hpa',
      label: 'Performance HPA',
      desc: 'Analisi performance consulenti, appuntamenti e completamento obiettivi',
      color: 'teal',
      icon: (
        <svg className="w-6 h-6 text-teal-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
        </svg>
      ),
      bgFrom: 'from-teal-600/20',
      bgTo: 'to-teal-600/10',
      border: 'border-teal-500/30',
      hoverBorder: 'hover:border-teal-400/50',
      iconBg: 'bg-teal-500/20',
      textHover: 'group-hover:text-teal-300'
    },
    {
      href: '/admin/monitoring/utenti',
      label: 'Attivita Utenti',
      desc: 'Livelli di attivita, utenti attivi, nuove registrazioni e engagement',
      color: 'blue',
      icon: (
        <svg className="w-6 h-6 text-blue-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197M13 7a4 4 0 11-8 0 4 4 0 018 0z" />
        </svg>
      ),
      bgFrom: 'from-blue-600/20',
      bgTo: 'to-blue-600/10',
      border: 'border-blue-500/30',
      hoverBorder: 'hover:border-blue-400/50',
      iconBg: 'bg-blue-500/20',
      textHover: 'group-hover:text-blue-300'
    },
    {
      href: '/admin/monitoring/sistema',
      label: 'Salute Sistema',
      desc: 'Stato generale del sistema, problemi aperti e health score dei centri',
      color: 'green',
      icon: (
        <svg className="w-6 h-6 text-green-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" />
        </svg>
      ),
      bgFrom: 'from-green-600/20',
      bgTo: 'to-green-600/10',
      border: 'border-green-500/30',
      hoverBorder: 'hover:border-green-400/50',
      iconBg: 'bg-green-500/20',
      textHover: 'group-hover:text-green-300'
    },
    {
      href: '/admin/monitoring/valutazioni',
      label: 'Valutazioni & Feedback',
      desc: 'Rating degli utenti su Beautyx AI e consulenti HPA, recensioni e classifica',
      color: 'amber',
      icon: (
        <svg className="w-6 h-6 text-amber-400" fill="currentColor" viewBox="0 0 24 24">
          <path d="M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z" />
        </svg>
      ),
      bgFrom: 'from-amber-600/20',
      bgTo: 'to-orange-600/10',
      border: 'border-amber-500/30',
      hoverBorder: 'hover:border-amber-400/50',
      iconBg: 'bg-amber-500/20',
      textHover: 'group-hover:text-amber-300'
    }
  ]

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-800 via-slate-900 to-slate-800 p-4 md:p-6">
      <div className="max-w-4xl mx-auto space-y-6">

        {/* Header */}
        <div className="bg-slate-950/60 backdrop-blur-md rounded-xl border border-slate-700/50 p-4">
          <div className="flex items-center gap-3">
            <Link href="/admin" className="text-slate-400 hover:text-white transition-colors">
              <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
              </svg>
            </Link>
            <div className="w-10 h-10 bg-gradient-to-br from-amber-600 to-orange-600 rounded-lg flex items-center justify-center">
              <svg className="w-6 h-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
              </svg>
            </div>
            <div>
              <h1 className="text-2xl font-bold text-white">Monitoraggio</h1>
              <p className="text-sm text-slate-400">Controlla performance, attivita utenti e salute del sistema</p>
            </div>
          </div>
        </div>

        {/* Section Cards */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {sections.map(({ href, label, desc, icon, bgFrom, bgTo, border, hoverBorder, iconBg, textHover }) => (
            <Link key={href} href={href} className="group">
              <div className={`bg-gradient-to-br ${bgFrom} ${bgTo} backdrop-blur-sm rounded-xl p-6 border ${border} ${hoverBorder} transition-all h-full`}>
                <div className={`w-12 h-12 ${iconBg} rounded-lg flex items-center justify-center mb-4`}>
                  {icon}
                </div>
                <h3 className={`text-lg font-semibold text-white ${textHover} transition-colors mb-2`}>{label}</h3>
                <p className="text-sm text-slate-400">{desc}</p>
              </div>
            </Link>
          ))}
        </div>

      </div>
    </div>
  )
}
