'use client'

import Link from 'next/link'
import Image from 'next/image'
import { usePathname } from 'next/navigation'
import { useState, useRef, useEffect } from 'react'
import { useAuth } from '@/contexts/AuthContext'
import CentroSearchDropdown from '@/components/admin/CentroSearchDropdown'
import TokenCounter from '@/components/beautyx/TokenCounter'
import HpaWidget from '@/components/dashboard/HpaWidget'

const PLAN_BADGE_STYLES = {
  demo:         'bg-slate-700/60 text-slate-300 border-slate-600/50',
  starter:      'bg-blue-500/20 text-blue-300 border-blue-500/30',
  professional: 'bg-purple-500/20 text-purple-300 border-purple-500/30',
  enterprise:   'bg-amber-500/20 text-amber-300 border-amber-500/30',
}

export default function Navbar() {
  const pathname = usePathname()
  const {
    profile,
    ruoloLivello,
    isAdmin,
    isHpa,
    isTitolare,
    isDirettore,
    isAmministrativo,
    centriAccess,
    currentCentro,
    switchCentro,
    enterCentro,
    exitCentro,
    isGlobalView,
    hasPermission,
    signOut,
    allRoles,
    activeRole,
    switchRole,
    hasMultipleRoles
  } = useAuth()

  const [showCentroSwitcher, setShowCentroSwitcher] = useState(false)
  const [showUserMenu, setShowUserMenu] = useState(false)
  const [showRoleSwitcher, setShowRoleSwitcher] = useState(false)
  const [showHpaPanel, setShowHpaPanel] = useState(false)
  const [userPlan, setUserPlan] = useState(null)    // { codice, nome }
  const [navTokenUsage, setNavTokenUsage] = useState(null)
  const centroSwitcherRef = useRef(null)
  const userMenuRef = useRef(null)
  const roleSwitcherRef = useRef(null)
  const hpaPanelRef = useRef(null)

  // Chiudi dropdown quando si clicca fuori
  useEffect(() => {
    const handleClickOutside = (event) => {
      if (centroSwitcherRef.current && !centroSwitcherRef.current.contains(event.target)) {
        setShowCentroSwitcher(false)
      }
      if (userMenuRef.current && !userMenuRef.current.contains(event.target)) {
        setShowUserMenu(false)
      }
      if (roleSwitcherRef.current && !roleSwitcherRef.current.contains(event.target)) {
        setShowRoleSwitcher(false)
      }
      if (hpaPanelRef.current && !hpaPanelRef.current.contains(event.target)) {
        setShowHpaPanel(false)
      }
    }
    document.addEventListener('mousedown', handleClickOutside)
    return () => document.removeEventListener('mousedown', handleClickOutside)
  }, [])

  // Carica piano abbonamento e token usage per utenti non-admin e non-HPA
  useEffect(() => {
    if (!isAdmin && !isHpa && profile) {
      fetch('/api/subscriptions/balance')
        .then(r => r.json())
        .then(d => {
          if (d?.plan) setUserPlan({ codice: d.plan.codice, nome: d.plan.nome })
          if (d?.subscription && d?.plan) {
            const sub  = d.subscription
            const plan = d.plan
            const used  = sub.token_ai_usati  ?? 0
            const total = plan.token_ai_mensili ?? 0
            const pct   = total > 0 ? Math.round((used / total) * 100) : 0
            const hpaUsate   = sub.ore_hpa_usate    ?? 0
            const hpaMensili = plan.ore_hpa_mensili ?? 0
            setNavTokenUsage({
              token_ai_usati:   used,
              token_ai_mensili: total,
              token_percentage: pct,
              token_remaining:  Math.max(0, total - used),
              hpa_usate:        hpaUsate,
              hpa_mensili:      hpaMensili,
              hpa_percentage:   hpaMensili > 0 ? Math.round((hpaUsate / hpaMensili) * 100) : 0,
              piano:            plan.codice ?? 'free',
              limit_reached:    total > 0 && used >= total,
            })
          }
        })
        .catch(() => {})
    }
  }, [isAdmin, isHpa, profile])

  // Costruisci nav items in base ai permessi e ruolo
  const navItems = []

  // Admin: mostra voci centro SOLO se ha un centro selezionato
  const hasCentro = !!currentCentro

  if (isAdmin) {
    // Admin ha sempre la sua dashboard
    navItems.push({ href: '/admin', label: 'Admin', icon: '⚙️' })

    // Voci centro solo se ha selezionato un centro
    if (hasCentro) {
      navItems.push({ href: '/dashboard', label: 'Dashboard', icon: '🏠' })
      navItems.push({ href: '/movimenti', label: 'Movimenti', icon: '💰' })
      navItems.push({ href: '/analytics', label: 'Analytics', icon: '📊' })
    }
  } else {
    // Non-admin: mostra voci in base ai permessi
    if (hasPermission('dashboard.visualizza')) {
      navItems.push({ href: '/dashboard', label: 'Dashboard', icon: '🏠' })
    }
    if (hasPermission('movimenti.visualizza')) {
      navItems.push({ href: '/movimenti', label: 'Movimenti', icon: '💰' })
    }
    if (hasPermission('analytics.visualizza')) {
      navItems.push({ href: '/analytics', label: 'Analytics', icon: '📊' })
    }
    if (hasPermission('obiettivi.visualizza')) {
      navItems.push({ href: '/obiettivi', label: 'Obiettivi', icon: '🎯' })
    }
    if (hasPermission('pianificazione.visualizza')) {
      navItems.push({ href: '/pianificazione', label: 'Pianificazione', icon: '📋' })
    }
    if (hasCentro) {
      navItems.push({ href: '/centro', label: 'Centro', icon: '🏢' })
    }
    if (hasCentro && !isHpa) {
      navItems.push({ href: '/strategie', label: 'Strategie', icon: '🚀' })
    }
    if (isHpa) {
      navItems.push({ href: '/hpa', label: 'HPA', icon: '🎓' })
    }
    if (!isHpa) {
      navItems.push({ href: '/', label: 'Novità', icon: '📣' })
    }
  }

  const handleLogout = async () => {
    await signOut()
  }

  const getRoleIcon = (ruolo) => {
    switch (ruolo) {
      case 'admin': return '👑'
      case 'hpa': return '🎓'
      case 'titolare':
      case 'centro_owner': return '🏢'
      case 'direttore':
      case 'centro_staff': return '🏪'
      case 'amministrativo': return '📊'
      default: return '👤'
    }
  }

  const getRoleLabel = (ruolo) => {
    switch (ruolo) {
      case 'admin': return 'Amministratore'
      case 'hpa': return 'Consulente HPA'
      case 'titolare':
      case 'centro_owner': return 'Titolare'
      case 'direttore':
      case 'centro_staff': return 'Staff Centro'
      case 'amministrativo': return 'Amministrativo'
      default: return ruolo
    }
  }

  const getRoleBadge = () => {
    switch (ruoloLivello) {
      case 'admin': return { label: 'Admin', color: 'bg-emerald-500' }
      case 'hpa': return { label: 'HPA', color: 'bg-purple-500' }
      case 'titolare': return { label: 'Titolare', color: 'bg-cyan-500' }
      case 'direttore': return { label: 'Direttore', color: 'bg-blue-500' }
      case 'amministrativo': return { label: 'Admin.vo', color: 'bg-amber-500' }
      default: return { label: 'Utente', color: 'bg-slate-500' }
    }
  }

  const badge = getRoleBadge()
  const hasMultipleCentri = centriAccess.length > 1

  return (
    <nav className="sticky top-0 z-50 text-white border-b border-blue-800/60 overflow-visible" style={{
      background: 'linear-gradient(135deg, #0a1628 0%, #0d2045 50%, #0a1628 100%)',
      boxShadow: '0 4px 32px rgba(10, 22, 60, 0.8), 0 1px 0 rgba(59,130,246,0.15)'
    }}>
      {/* Filigrana */}
      <div className="absolute inset-0 pointer-events-none opacity-30 overflow-hidden">
        <svg width="100%" height="100%" xmlns="http://www.w3.org/2000/svg" className="absolute inset-0" preserveAspectRatio="none">
          <defs>
            <filter id="blur-nav">
              <feGaussianBlur in="SourceGraphic" stdDeviation="3" />
            </filter>
            <linearGradient id="grad-nav1" x1="0%" y1="0%" x2="100%" y2="0%">
              <stop offset="0%" style={{stopColor:'#3b82f6', stopOpacity:0.4}} />
              <stop offset="100%" style={{stopColor:'#1d4ed8', stopOpacity:0.1}} />
            </linearGradient>
            <linearGradient id="grad-nav2" x1="100%" y1="0%" x2="0%" y2="0%">
              <stop offset="0%" style={{stopColor:'#1d4ed8', stopOpacity:0.4}} />
              <stop offset="100%" style={{stopColor:'#3b82f6', stopOpacity:0.1}} />
            </linearGradient>
          </defs>
          <path d="M 0,30 Q 200,15 400,30 T 800,30 L 800,80 L 0,80 Z" fill="url(#grad-nav1)" filter="url(#blur-nav)" opacity="0.4"/>
          <path d="M 0,50 Q 250,35 500,50 T 1000,50 L 1000,80 L 0,80 Z" fill="url(#grad-nav2)" filter="url(#blur-nav)" opacity="0.3"/>
        </svg>
      </div>

      <div className="w-full px-4 relative z-10">
        <div className="flex items-center justify-between h-14 overflow-visible">
          {/* Logo + Brand */}
          <Link href={isAdmin ? '/admin' : '/dashboard'} className="flex items-center gap-2 group flex-shrink-0">
            <Image
              src="/logo_beautyx-oro.png"
              alt="Beautyx"
              width={88}
              height={88}
              className="w-22 h-22 object-contain drop-shadow-lg"
              style={{ width: 88, height: 88 }}
              priority
            />
            <span style={{
              fontFamily: "'Courier New', Courier, monospace",
              fontSize: '1.55rem',
              fontWeight: '800',
              letterSpacing: '0.06em',
              color: '#39ff14',
              textShadow: [
                '0 0 6px #39ff14',
                '0 0 14px rgba(57,255,20,0.7)',
                '0 0 28px rgba(57,255,20,0.3)',
                '-1px -1px 0 rgba(180,255,120,0.35)',
                '2px 2px 5px rgba(0,0,0,0.85)',
                '1px 1px 0 rgba(0,0,0,0.6)',
              ].join(', '),
            }}>
              Beautyx
            </span>
          </Link>

          {/* Nav Links */}
          <div className="flex gap-1">
            {navItems.map((item) => (
              <Link
                key={item.href}
                href={item.href}
                className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-sm font-medium transition-all ${
                  pathname === item.href
                    ? 'bg-teal-600 text-white'
                    : 'text-slate-300 hover:bg-slate-700 hover:text-white'
                }`}
              >
                <span>{item.icon}</span>
                <span className="hidden md:inline">{item.label}</span>
              </Link>
            ))}
          </div>

          {/* Right side: Role Switcher + Centro Switcher + User menu + Logout */}
          <div className="flex items-center gap-2">
            {/* Role Switcher - se ha ruoli multipli */}
            {hasMultipleRoles && (
              <div className="relative" ref={roleSwitcherRef}>
                <button
                  onClick={() => setShowRoleSwitcher(!showRoleSwitcher)}
                  className="flex items-center gap-1.5 px-2.5 py-1.5 bg-purple-800/30 border border-purple-600/40 rounded-lg text-sm hover:bg-purple-700/30 transition-colors"
                >
                  <span className="text-sm">{getRoleIcon(activeRole?.role_type || ruoloLivello)}</span>
                  <span className="text-white text-xs hidden md:inline">
                    {getRoleLabel(activeRole?.role_type || ruoloLivello)}
                  </span>
                  <svg className={`w-3.5 h-3.5 text-slate-400 transition-transform ${showRoleSwitcher ? 'rotate-180' : ''}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                  </svg>
                </button>

                {showRoleSwitcher && (
                  <div className="absolute right-0 mt-2 w-72 bg-slate-800 border border-slate-700 rounded-lg shadow-xl z-50">
                    <div className="p-2 border-b border-slate-700">
                      <p className="text-xs text-slate-400 px-2">I tuoi ruoli ({allRoles.length})</p>
                    </div>
                    <div className="py-1">
                      {allRoles.map((role) => {
                        const isActive = activeRole?.role_id === role.role_id
                        return (
                          <button
                            key={role.role_id}
                            onClick={async () => {
                              await switchRole(role.role_id)
                              setShowRoleSwitcher(false)
                            }}
                            className={`w-full text-left px-4 py-2.5 text-sm hover:bg-slate-700 transition-colors flex items-center justify-between ${
                              isActive ? 'text-purple-400 bg-slate-700/50' : 'text-white'
                            }`}
                          >
                            <span className="flex flex-col">
                              <span className="flex items-center gap-2">
                                <span>{getRoleIcon(role.role_type)}</span>
                                {getRoleLabel(role.role_type)}
                              </span>
                              {role.centro_nome && (
                                <span className="text-xs text-slate-500 ml-6">{role.centro_nome}</span>
                              )}
                              {role.organization_nome && (
                                <span className="text-xs text-amber-500/70 ml-6">{role.organization_nome}</span>
                              )}
                            </span>
                            {isActive && (
                              <svg className="w-4 h-4 text-purple-400 flex-shrink-0" fill="currentColor" viewBox="0 0 20 20">
                                <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                              </svg>
                            )}
                          </button>
                        )
                      })}
                    </div>
                  </div>
                )}
              </div>
            )}

            {/* Admin/HPA: Vista Globale + Ricerca Centro */}
            {isAdmin && (
              <div className="relative" ref={centroSwitcherRef}>
                {isGlobalView ? (
                  <button
                    onClick={() => setShowCentroSwitcher(!showCentroSwitcher)}
                    className="flex items-center gap-2 px-3 py-1.5 bg-emerald-800/30 border border-emerald-600/40 rounded-lg text-sm hover:bg-emerald-700/30 transition-colors"
                  >
                    <svg className="w-4 h-4 text-emerald-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3.055 11H5a2 2 0 012 2v1a2 2 0 002 2 2 2 0 012 2v2.945M8 3.935V5.5A2.5 2.5 0 0010.5 8h.5a2 2 0 012 2 2 2 0 104 0 2 2 0 012-2h1.064M15 20.488V18a2 2 0 012-2h3.064M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                    </svg>
                    <span className="text-emerald-300 hidden md:inline">Vista Globale</span>
                    <svg className={`w-3 h-3 text-emerald-400 transition-transform ${showCentroSwitcher ? 'rotate-180' : ''}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                    </svg>
                  </button>
                ) : (
                  <div className="flex items-center gap-1">
                    <button
                      onClick={() => setShowCentroSwitcher(!showCentroSwitcher)}
                      className="flex items-center gap-2 px-3 py-1.5 bg-slate-800/50 border border-slate-600/50 rounded-lg text-sm hover:bg-slate-700/50 transition-colors"
                    >
                      <span className="text-teal-400 text-xs">🏢</span>
                      <span className="text-white max-w-[120px] truncate">{currentCentro?.centro_nome}</span>
                    </button>
                    <button
                      onClick={exitCentro}
                      className="px-2 py-1.5 text-red-400 hover:text-red-300 hover:bg-red-500/10 rounded-lg transition-colors"
                      title="Torna a Vista Globale"
                    >
                      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                      </svg>
                    </button>
                  </div>
                )}
                {showCentroSwitcher && (
                  <CentroSearchDropdown
                    onSelect={(centro) => enterCentro(centro.centro_id, centro.centro_nome)}
                    onClose={() => setShowCentroSwitcher(false)}
                  />
                )}
              </div>
            )}

            {/* Centro Switcher per non-admin con più centri */}
            {!isAdmin && hasMultipleCentri && (
              <div className="relative" ref={centroSwitcherRef}>
                <button
                  onClick={() => setShowCentroSwitcher(!showCentroSwitcher)}
                  className="flex items-center gap-2 px-3 py-1.5 bg-slate-800/50 border border-slate-600/50 rounded-lg text-sm hover:bg-slate-700/50 transition-colors"
                >
                  <span>🏢</span>
                  <span className="text-white max-w-[150px] truncate">
                    {currentCentro?.centro_nome || 'Seleziona centro'}
                  </span>
                  <svg className={`w-4 h-4 text-slate-400 transition-transform ${showCentroSwitcher ? 'rotate-180' : ''}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                  </svg>
                </button>

                {showCentroSwitcher && (
                  <div className="absolute right-0 mt-2 w-72 bg-slate-800 border border-slate-700 rounded-lg shadow-xl z-[100] max-h-96 overflow-y-auto">
                    <div className="p-2 border-b border-slate-700">
                      <p className="text-xs text-slate-400 px-2">I tuoi centri ({centriAccess.length})</p>
                    </div>
                    <div className="py-1">
                      {centriAccess.map((centro) => {
                        const isActive = currentCentro?.centro_id === centro.centro_id
                        return (
                          <button
                            key={centro.centro_id}
                            onClick={() => {
                              switchCentro(centro.centro_id)
                              setShowCentroSwitcher(false)
                            }}
                            className={`w-full text-left px-4 py-2 text-sm hover:bg-slate-700 transition-colors flex items-center justify-between ${
                              isActive ? 'text-teal-400 bg-slate-700/50' : 'text-white'
                            }`}
                          >
                            <span className="flex flex-col">
                              <span className="flex items-center gap-2">
                                {centro.is_sede_principale && <span className="text-yellow-400">★</span>}
                                {centro.centro_nome}
                              </span>
                              <span className="text-xs text-slate-500 capitalize">{centro.tipo_accesso}</span>
                            </span>
                            {isActive && (
                              <svg className="w-4 h-4 text-teal-400" fill="currentColor" viewBox="0 0 20 20">
                                <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                              </svg>
                            )}
                          </button>
                        )
                      })}
                    </div>
                  </div>
                )}
              </div>
            )}

            {/* Centro name - per non-admin con un solo centro */}
            {!isAdmin && !hasMultipleCentri && currentCentro && (
              <div className="hidden md:flex items-center gap-2 px-3 py-1.5 bg-slate-800/30 rounded-lg">
                <span className="text-teal-400 text-xs">🏢</span>
                <span className="text-slate-300 text-sm max-w-[120px] truncate">{currentCentro.centro_nome}</span>
              </div>
            )}

            {/* Bottone HPA - pannello consulente */}
            {!isAdmin && !isHpa && hasCentro && (
              <div className="relative" ref={hpaPanelRef}>
                <button
                  onClick={() => setShowHpaPanel(v => !v)}
                  className={`flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg border text-sm transition-colors ${
                    showHpaPanel
                      ? 'bg-purple-500/30 border-purple-400/50 text-purple-200'
                      : 'bg-purple-500/10 hover:bg-purple-500/20 border-purple-500/25 text-purple-300'
                  }`}
                  title="Il tuo consulente HPA"
                >
                  <span>🎓</span>
                  <span className="hidden md:inline text-xs font-medium">HPA</span>
                </button>
                {showHpaPanel && (
                  <div className="absolute right-0 mt-2 w-96 max-h-[80vh] overflow-y-auto rounded-xl shadow-2xl z-[200] bg-slate-900 border border-slate-700/60"
                    style={{ boxShadow: '0 25px 50px -12px rgba(0,0,0,0.9)' }}>
                    <HpaWidget centroId={currentCentro?.centro_id} />
                  </div>
                )}
              </div>
            )}

            {/* Token AI counter - sempre visibile per non-admin/non-hpa */}
            {navTokenUsage && !isAdmin && !isHpa && (
              <TokenCounter
                tokenUsage={navTokenUsage}
                compact={true}
                popoverPosition="down"
              />
            )}

            {/* Badge piano abbonamento */}
            {userPlan && !isAdmin && !isHpa && (
              <Link
                href="/impostazioni/abbonamento"
                className={`hidden md:flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-xs font-medium border transition-all hover:brightness-125 ${
                  PLAN_BADGE_STYLES[userPlan.codice] || PLAN_BADGE_STYLES.demo
                }`}
                title="Gestisci il tuo abbonamento"
              >
                <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 3v4M3 5h4M6 17v4m-2-2h4m5-16l2.286 6.857L21 12l-5.714 2.143L13 21l-2.286-6.857L5 12l5.714-2.143L13 3z" />
                </svg>
                <span>{userPlan.nome}</span>
                {userPlan.codice === 'demo' && (
                  <span className="text-amber-400 text-[10px] font-bold">↑</span>
                )}
              </Link>
            )}

            {/* User Menu */}
            <div className="relative" ref={userMenuRef}>
              <button
                onClick={() => setShowUserMenu(!showUserMenu)}
                className="flex items-center gap-2 px-2 py-1 rounded-lg hover:bg-slate-700/50 transition-colors"
              >
                <div className="w-7 h-7 bg-gradient-to-br from-purple-500 to-pink-500 rounded-full flex items-center justify-center">
                  <span className="text-white text-xs font-medium">
                    {profile?.nome?.[0]?.toUpperCase() || profile?.email?.[0]?.toUpperCase() || '?'}
                  </span>
                </div>
                <span className={`${badge.color} text-white text-xs px-1.5 py-0.5 rounded hidden md:block`}>
                  {badge.label}
                </span>
              </button>

              {showUserMenu && (
                <div className="absolute right-0 mt-2 w-64 bg-slate-800 border border-slate-700 rounded-lg shadow-xl z-50">
                  <div className="p-3 border-b border-slate-700">
                    <p className="text-sm font-medium text-white">
                      {profile?.nome && profile?.cognome
                        ? `${profile.nome} ${profile.cognome}`
                        : profile?.email}
                    </p>
                    <p className="text-xs text-slate-400">{profile?.email}</p>
                    <div className="flex items-center gap-2 mt-2">
                      <span className={`${badge.color} text-white text-xs px-2 py-0.5 rounded`}>
                        {getRoleIcon(ruoloLivello)} {getRoleLabel(ruoloLivello)}
                      </span>
                    </div>
                  </div>

                  {/* Centro corrente */}
                  {currentCentro && (
                    <div className="px-3 py-2 border-b border-slate-700 bg-slate-900/50">
                      <p className="text-xs text-slate-500 mb-1">Centro attivo</p>
                      <p className="text-sm text-white flex items-center gap-2">
                        <span>🏢</span>
                        {currentCentro.centro_nome}
                      </p>
                    </div>
                  )}

                  <div className="py-1">
                    {userPlan && !isAdmin && !isHpa && (
                      <Link
                        href="/impostazioni/abbonamento"
                        className="flex items-center justify-between px-4 py-2 text-sm hover:bg-slate-700 transition-colors group"
                        onClick={() => setShowUserMenu(false)}
                      >
                        <span className="text-slate-300">Piano abbonamento</span>
                        <span className={`text-xs px-2 py-0.5 rounded border ${
                          PLAN_BADGE_STYLES[userPlan.codice] || PLAN_BADGE_STYLES.demo
                        }`}>
                          {userPlan.nome}
                        </span>
                      </Link>
                    )}
                    <Link
                      href="/impostazioni"
                      className="block px-4 py-2 text-sm text-slate-300 hover:bg-slate-700 transition-colors"
                      onClick={() => setShowUserMenu(false)}
                    >
                      Impostazioni profilo
                    </Link>
                    {!isAdmin && !isHpa && hasCentro && (
                      <Link
                        href="/centro?tab=integrazioni"
                        className="block px-4 py-2 text-sm text-slate-300 hover:bg-slate-700 transition-colors"
                        onClick={() => setShowUserMenu(false)}
                      >
                        🔌 Integrazioni centro
                      </Link>
                    )}
                    <button
                      onClick={handleLogout}
                      className="w-full text-left px-4 py-2 text-sm text-red-400 hover:bg-slate-700 transition-colors flex items-center gap-2"
                    >
                      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" />
                      </svg>
                      Esci
                    </button>
                  </div>
                </div>
              )}
            </div>

            {/* Logout - sempre visibile */}
            <button
              onClick={handleLogout}
              className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg text-sm text-red-400 hover:bg-red-500/20 hover:text-red-300 transition-colors"
              title="Esci"
            >
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" />
              </svg>
              <span className="hidden md:inline">Esci</span>
            </button>
          </div>
        </div>
      </div>
    </nav>
  )
}
