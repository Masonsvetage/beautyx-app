'use client'

import { useState, useEffect } from 'react'
import { useAuth } from '@/contexts/AuthContext'
import StatsHeader from '@/components/hpa/StatsHeader'
import AlertPanel from '@/components/hpa/AlertPanel'
import ClientList from '@/components/hpa/ClientList'
import MessageThread from '@/components/hpa/MessageThread'
import AppointmentsList from '@/components/hpa/AppointmentsList'
import AvailabilityPlanner from '@/components/hpa/AvailabilityPlanner'
import RankingTable from '@/components/hpa/RankingTable'
import ContactRequests from '@/components/hpa/ContactRequests'

export default function HpaDashboard() {
  const { profile, isHpa, isAdmin, enterCentro } = useAuth()
  const [stats, setStats] = useState(null)
  const [statsLoading, setStatsLoading] = useState(true)
  const [activeTab, setActiveTab] = useState('overview')
  const [selectedClient, setSelectedClient] = useState(null)
  const [showChat, setShowChat] = useState(false)

  useEffect(() => {
    loadStats()
  }, [])

  const loadStats = async () => {
    try {
      const res = await fetch('/api/hpa/dashboard/stats')
      const data = await res.json()
      if (!data.error) {
        setStats(data)
      }
    } catch (error) {
      console.error('Errore caricamento stats:', error)
    } finally {
      setStatsLoading(false)
    }
  }

  const handleSelectClient = (client) => {
    // Set centro context — triggers BeautyxChatFooter auto-open in HPA mode
    enterCentro(client.id, client.nome)
    setSelectedClient(client)
    setShowChat(true)
  }

  const handleOpenChat = (centro) => {
    enterCentro(centro.id, centro.nome)
    setSelectedClient(centro)
    setShowChat(true)
  }

  const tabs = [
    { id: 'overview', label: 'Panoramica', icon: (
      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2H6a2 2 0 01-2-2V6zM14 6a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2h-2a2 2 0 01-2-2V6zM4 16a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2H6a2 2 0 01-2-2v-2zM14 16a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2h-2a2 2 0 01-2-2v-2z" />
      </svg>
    )},
    { id: 'clients', label: 'Clienti', icon: (
      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" />
      </svg>
    )},
    { id: 'appointments', label: 'Appuntamenti', icon: (
      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
      </svg>
    )},
    { id: 'availability', label: 'Disponibilità', icon: (
      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
      </svg>
    )},
    { id: 'ranking', label: 'Classifica', icon: (
      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
      </svg>
    )}
  ]

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900">
      {/* Header */}
      <div className="bg-slate-950/60 backdrop-blur-md border-b border-slate-700/50 sticky top-0 z-40">
        <div className="max-w-7xl mx-auto px-4 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 bg-gradient-to-br from-purple-600 to-pink-600 rounded-lg flex items-center justify-center">
                <svg className="w-6 h-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" />
                </svg>
              </div>
              <div>
                <h1 className="text-xl font-bold text-white">Dashboard HPA</h1>
                <p className="text-sm text-purple-300">
                  Benvenuto, {profile?.nome || profile?.email}
                </p>
              </div>
            </div>

            {/* Tab Navigation */}
            <div className="hidden md:flex items-center gap-1 bg-slate-800/50 rounded-lg p-1">
              {tabs.map(tab => (
                <button
                  key={tab.id}
                  onClick={() => setActiveTab(tab.id)}
                  className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-all ${
                    activeTab === tab.id
                      ? 'bg-purple-500 text-white'
                      : 'text-slate-400 hover:text-white hover:bg-slate-700/50'
                  }`}
                >
                  {tab.icon}
                  <span className="hidden lg:inline">{tab.label}</span>
                </button>
              ))}
            </div>
          </div>

          {/* Mobile Tab Navigation */}
          <div className="flex md:hidden items-center gap-1 mt-4 overflow-x-auto pb-2">
            {tabs.map(tab => (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                className={`flex items-center gap-2 px-3 py-1.5 rounded-lg text-sm font-medium whitespace-nowrap transition-all ${
                  activeTab === tab.id
                    ? 'bg-purple-500 text-white'
                    : 'text-slate-400 hover:text-white bg-slate-700/50'
                }`}
              >
                {tab.icon}
                {tab.label}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* Main Content */}
      <div className="max-w-7xl mx-auto px-4 py-6">
        {/* Stats Header - sempre visibile */}
        <div className="mb-6">
          <StatsHeader stats={stats} loading={statsLoading} />
        </div>

        {/* Tab Content */}
        {activeTab === 'overview' && (
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            {/* Colonna sinistra */}
            <div className="lg:col-span-2 space-y-6">
              {/* Alert */}
              <AlertPanel onViewDetails={(alert) => console.log('Alert:', alert)} />

              {/* Appuntamenti di oggi */}
              <AppointmentsList view="upcoming" />

              {/* Richieste contatto */}
              <ContactRequests onOpenChat={handleOpenChat} />
            </div>

            {/* Colonna destra */}
            <div className="space-y-6">
              {/* Classifica */}
              <RankingTable onSelectCentro={handleSelectClient} />
            </div>
          </div>
        )}

        {activeTab === 'clients' && (
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Lista clienti */}
            <ClientList onSelectClient={handleSelectClient} />

            {/* Chat panel */}
            {showChat && selectedClient ? (
              <div className="h-[600px]">
                <MessageThread
                  centroId={selectedClient.id}
                  centroNome={selectedClient.nome}
                  onClose={() => {
                    setShowChat(false)
                    setSelectedClient(null)
                  }}
                />
              </div>
            ) : (
              <div className="bg-slate-800/50 rounded-xl border border-slate-700/50 flex items-center justify-center h-[600px]">
                <div className="text-center text-slate-400">
                  <svg className="w-12 h-12 mx-auto mb-3 text-slate-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" />
                  </svg>
                  <p>Seleziona un cliente per iniziare una chat</p>
                </div>
              </div>
            )}
          </div>
        )}

        {activeTab === 'appointments' && (
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <AppointmentsList view="upcoming" />
            <AppointmentsList view="history" />
          </div>
        )}

        {activeTab === 'availability' && (
          <div className="max-w-2xl mx-auto">
            <AvailabilityPlanner />
          </div>
        )}

        {activeTab === 'ranking' && (
          <div className="max-w-3xl mx-auto">
            <RankingTable onSelectCentro={handleSelectClient} />
          </div>
        )}
      </div>

      {/* Chat Overlay per mobile */}
      {showChat && selectedClient && (
        <div className="fixed inset-0 z-50 lg:hidden bg-slate-900/95">
          <div className="h-full">
            <MessageThread
              centroId={selectedClient.id}
              centroNome={selectedClient.nome}
              onClose={() => {
                setShowChat(false)
                setSelectedClient(null)
              }}
            />
          </div>
        </div>
      )}
    </div>
  )
}
