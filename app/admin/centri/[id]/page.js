'use client'

import { useState, useEffect, use } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { useAuth } from '@/contexts/AuthContext'
import { supabase } from '@/lib/supabase'

const TABS = [
  { id: 'info', label: 'Informazioni', icon: '🏢' },
  { id: 'utenti', label: 'Utenti', icon: '👥' },
  { id: 'movimenti', label: 'Movimenti', icon: '💰' },
  { id: 'obiettivi', label: 'Obiettivi', icon: '🎯' },
  { id: 'organizzazione', label: 'Organizzazione', icon: '🏛️' }
]

export default function CentroDetailPage({ params }) {
  const { id } = use(params)
  const router = useRouter()
  const { isAdmin } = useAuth()

  const [centro, setCentro] = useState(null)
  const [users, setUsers] = useState([])
  const [organizations, setOrganizations] = useState([])
  const [centroOrg, setCentroOrg] = useState(null)
  const [stats, setStats] = useState({ movimenti: 0, obiettivi: 0, fatturato: 0 })
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [activeTab, setActiveTab] = useState('info')

  const [formData, setFormData] = useState({})

  useEffect(() => {
    loadData()
  }, [id])

  const loadData = async () => {
    try {
      // Carica centro
      const { data: centroData, error: centroError } = await supabase
        .from('beauty_centers')
        .select('*')
        .eq('id', id)
        .single()

      if (centroError) throw centroError
      setCentro(centroData)
      setFormData(centroData || {})

      // Carica utenti associati al centro
      const { data: usersData } = await supabase
        .from('user_profiles')
        .select('id, email, nome, cognome, ruolo, ruolo_livello, attivo, piano')
        .eq('centro_id', id)
        .order('cognome')

      setUsers(usersData || [])

      // Carica organizzazioni
      const { data: orgsData } = await supabase
        .from('organizations')
        .select('id, nome')
        .order('nome')

      setOrganizations(orgsData || [])

      // Verifica se il centro è in un'organizzazione
      const { data: linkData } = await supabase
        .from('centro_organization_links')
        .select('*, organization:organizations(id, nome)')
        .eq('centro_id', id)
        .single()

      setCentroOrg(linkData)

      // Carica statistiche
      await loadStats()
    } catch (error) {
      console.error('Errore caricamento:', error)
    } finally {
      setLoading(false)
    }
  }

  const loadStats = async () => {
    try {
      // Conta movimenti
      const { count: movCount } = await supabase
        .from('movements')
        .select('*', { count: 'exact', head: true })
        .eq('centro_id', id)

      // Conta obiettivi
      const { count: objCount } = await supabase
        .from('obiettivi')
        .select('*', { count: 'exact', head: true })
        .eq('centro_id', id)

      // Somma fatturato (entrate)
      const { data: fattData } = await supabase
        .from('movements')
        .select('importo')
        .eq('centro_id', id)
        .eq('tipo', 'entrata')

      const fatturato = (fattData || []).reduce((sum, m) => sum + (m.importo || 0), 0)

      setStats({
        movimenti: movCount || 0,
        obiettivi: objCount || 0,
        fatturato
      })
    } catch (error) {
      console.error('Errore caricamento stats:', error)
    }
  }

  const handleChange = (field, value) => {
    setFormData(prev => ({ ...prev, [field]: value }))
  }

  const handleSave = async () => {
    setSaving(true)
    try {
      const { id: _, created_at, ...updateData } = formData

      const { error } = await supabase
        .from('beauty_centers')
        .update({
          ...updateData,
          updated_at: new Date().toISOString()
        })
        .eq('id', id)

      if (error) throw error

      alert('Salvato con successo!')
      setCentro(formData)
    } catch (error) {
      console.error('Errore salvataggio:', error)
      alert('Errore: ' + error.message)
    } finally {
      setSaving(false)
    }
  }

  const handleLinkToOrg = async (orgId) => {
    try {
      if (centroOrg) {
        // Rimuovi link esistente
        await supabase
          .from('centro_organization_links')
          .delete()
          .eq('centro_id', id)
      }

      if (orgId) {
        // Crea nuovo link
        await supabase
          .from('centro_organization_links')
          .insert({
            organization_id: orgId,
            centro_id: id,
            is_sede_principale: false
          })
      }

      await loadData()
    } catch (error) {
      console.error('Errore:', error)
      alert('Errore: ' + error.message)
    }
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900 p-6 flex items-center justify-center">
        <div className="text-center">
          <div className="w-12 h-12 border-4 border-teal-500 border-t-transparent rounded-full animate-spin mx-auto"></div>
          <p className="mt-4 text-slate-400">Caricamento centro...</p>
        </div>
      </div>
    )
  }

  if (!centro) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900 p-6 flex items-center justify-center">
        <div className="text-center">
          <p className="text-red-400">Centro non trovato</p>
          <Link href="/admin/centri" className="text-teal-400 hover:underline mt-2 block">
            Torna alla lista
          </Link>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900 p-6">
      {/* Header */}
      <div className="max-w-5xl mx-auto mb-6">
        <div className="bg-slate-950/60 backdrop-blur-md rounded-xl border border-slate-700/50 p-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              <Link href="/admin/centri" className="text-slate-400 hover:text-white transition-colors">
                <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
                </svg>
              </Link>
              <div className="w-16 h-16 bg-gradient-to-br from-pink-500 to-purple-600 rounded-xl flex items-center justify-center text-white text-2xl font-bold">
                {(formData.nome?.[0] || '?').toUpperCase()}
              </div>
              <div>
                <h1 className="text-2xl font-bold text-white">{formData.nome}</h1>
                <p className="text-sm text-slate-400">{formData.citta || 'Nessuna città'}</p>
                {centroOrg && (
                  <span className="inline-block mt-1 px-2 py-0.5 rounded text-xs bg-amber-500/20 text-amber-400">
                    {centroOrg.organization?.nome}
                  </span>
                )}
              </div>
            </div>
            <button
              onClick={handleSave}
              disabled={saving}
              className="px-6 py-2 bg-teal-500 text-white rounded-lg hover:bg-teal-600 transition-colors disabled:opacity-50"
            >
              {saving ? 'Salvataggio...' : 'Salva Modifiche'}
            </button>
          </div>
        </div>
      </div>

      {/* Stats Cards */}
      <div className="max-w-5xl mx-auto mb-6 grid grid-cols-3 gap-4">
        <div className="bg-slate-800/50 backdrop-blur-sm rounded-xl p-4 border border-slate-700/50">
          <p className="text-slate-400 text-sm">Movimenti</p>
          <p className="text-2xl font-bold text-white">{stats.movimenti}</p>
        </div>
        <div className="bg-slate-800/50 backdrop-blur-sm rounded-xl p-4 border border-slate-700/50">
          <p className="text-slate-400 text-sm">Obiettivi</p>
          <p className="text-2xl font-bold text-teal-400">{stats.obiettivi}</p>
        </div>
        <div className="bg-slate-800/50 backdrop-blur-sm rounded-xl p-4 border border-slate-700/50">
          <p className="text-slate-400 text-sm">Fatturato Totale</p>
          <p className="text-2xl font-bold text-emerald-400">
            {new Intl.NumberFormat('it-IT', { style: 'currency', currency: 'EUR' }).format(stats.fatturato)}
          </p>
        </div>
      </div>

      {/* Tabs */}
      <div className="max-w-5xl mx-auto mb-6">
        <div className="flex gap-2 overflow-x-auto pb-2">
          {TABS.map(tab => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium whitespace-nowrap transition-all ${
                activeTab === tab.id
                  ? 'bg-teal-500 text-white'
                  : 'bg-slate-800/50 text-slate-400 hover:text-white hover:bg-slate-700/50'
              }`}
            >
              <span>{tab.icon}</span>
              {tab.label}
            </button>
          ))}
        </div>
      </div>

      {/* Content */}
      <div className="max-w-5xl mx-auto">
        <div className="bg-slate-800/30 backdrop-blur-sm rounded-xl border border-slate-700/50 p-6">

          {/* Tab: Info */}
          {activeTab === 'info' && (
            <div className="space-y-6">
              <h3 className="text-lg font-semibold text-white mb-4">Informazioni Centro</h3>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <InputField label="Nome Centro" value={formData.nome} onChange={(v) => handleChange('nome', v)} />
                <InputField label="Email" type="email" value={formData.email} onChange={(v) => handleChange('email', v)} />
                <InputField label="Telefono" type="tel" value={formData.telefono} onChange={(v) => handleChange('telefono', v)} />
                <InputField label="PEC" type="email" value={formData.pec} onChange={(v) => handleChange('pec', v)} />
                <InputField label="Partita IVA" value={formData.partita_iva} onChange={(v) => handleChange('partita_iva', v)} maxLength={11} />
                <InputField label="Codice Fiscale" value={formData.codice_fiscale} onChange={(v) => handleChange('codice_fiscale', v?.toUpperCase())} />
              </div>

              <div className="border-t border-slate-700 pt-6">
                <h4 className="text-md font-semibold text-white mb-4">Indirizzo</h4>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <div className="md:col-span-2">
                    <InputField label="Indirizzo" value={formData.indirizzo} onChange={(v) => handleChange('indirizzo', v)} />
                  </div>
                  <InputField label="CAP" value={formData.cap} onChange={(v) => handleChange('cap', v)} maxLength={5} />
                  <InputField label="Città" value={formData.citta} onChange={(v) => handleChange('citta', v)} />
                  <InputField label="Provincia" value={formData.provincia} onChange={(v) => handleChange('provincia', v?.toUpperCase())} maxLength={2} />
                  <InputField label="Nazione" value={formData.nazione || 'Italia'} onChange={(v) => handleChange('nazione', v)} />
                </div>
              </div>

              <div className="border-t border-slate-700 pt-6">
                <h4 className="text-md font-semibold text-white mb-4">Altro</h4>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <InputField label="Sito Web" type="url" value={formData.sito_web} onChange={(v) => handleChange('sito_web', v)} />
                  <InputField label="Social" value={formData.social} onChange={(v) => handleChange('social', v)} placeholder="@instagram" />
                </div>
                <div className="mt-4">
                  <label className="block text-sm font-medium text-slate-300 mb-1">Note</label>
                  <textarea
                    value={formData.note || ''}
                    onChange={(e) => handleChange('note', e.target.value)}
                    rows={3}
                    className="w-full px-3 py-2 bg-slate-900 border border-slate-600 rounded-lg text-white resize-none"
                  />
                </div>
              </div>

            </div>
          )}

          {/* Tab: Utenti */}
          {activeTab === 'utenti' && (
            <div className="space-y-6">
              <div className="flex items-center justify-between">
                <h3 className="text-lg font-semibold text-white">Utenti del Centro</h3>
                <span className="text-sm text-slate-400">{users.length} utenti</span>
              </div>

              {users.length > 0 ? (
                <div className="space-y-3">
                  {users.map(user => (
                    <Link
                      key={user.id}
                      href={`/admin/users/${user.id}`}
                      className="flex items-center justify-between p-4 bg-slate-900/50 rounded-lg hover:bg-slate-700/50 transition-colors"
                    >
                      <div className="flex items-center gap-3">
                        <div className="w-10 h-10 bg-gradient-to-br from-teal-500 to-cyan-500 rounded-full flex items-center justify-center text-white font-bold">
                          {(user.nome?.[0] || user.email?.[0] || '?').toUpperCase()}
                        </div>
                        <div>
                          <p className="text-white font-medium">
                            {user.nome && user.cognome ? `${user.nome} ${user.cognome}` : user.email}
                          </p>
                          <p className="text-sm text-slate-400">{user.email}</p>
                        </div>
                      </div>
                      <div className="flex items-center gap-2">
                        <span className={`px-2 py-0.5 rounded text-xs ${
                          user.attivo ? 'bg-emerald-500/20 text-emerald-400' : 'bg-red-500/20 text-red-400'
                        }`}>
                          {user.attivo ? 'Attivo' : 'Disabilitato'}
                        </span>
                        <span className="px-2 py-0.5 rounded text-xs bg-cyan-500/20 text-cyan-400">
                          {user.ruolo_livello || user.ruolo}
                        </span>
                        <svg className="w-5 h-5 text-slate-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                        </svg>
                      </div>
                    </Link>
                  ))}
                </div>
              ) : (
                <div className="text-center py-8 text-slate-400">
                  <p>Nessun utente associato a questo centro</p>
                </div>
              )}
            </div>
          )}

          {/* Tab: Movimenti */}
          {activeTab === 'movimenti' && (
            <div className="space-y-6">
              <h3 className="text-lg font-semibold text-white">Movimenti</h3>
              <div className="text-center py-8">
                <p className="text-slate-400 mb-4">Visualizza i movimenti del centro</p>
                <Link
                  href={`/movimenti?centro=${id}`}
                  className="px-4 py-2 bg-teal-500 text-white rounded-lg hover:bg-teal-600 inline-block"
                >
                  Vai ai Movimenti
                </Link>
              </div>
            </div>
          )}

          {/* Tab: Obiettivi */}
          {activeTab === 'obiettivi' && (
            <div className="space-y-6">
              <h3 className="text-lg font-semibold text-white">Obiettivi</h3>
              <div className="text-center py-8">
                <p className="text-slate-400 mb-4">Visualizza gli obiettivi del centro</p>
                <Link
                  href={`/obiettivi?centro=${id}`}
                  className="px-4 py-2 bg-teal-500 text-white rounded-lg hover:bg-teal-600 inline-block"
                >
                  Vai agli Obiettivi
                </Link>
              </div>
            </div>
          )}

          {/* Tab: Organizzazione */}
          {activeTab === 'organizzazione' && (
            <div className="space-y-6">
              <h3 className="text-lg font-semibold text-white">Collegamento Organizzazione</h3>

              <div className="bg-blue-500/10 border border-blue-500/30 rounded-lg p-4 mb-4">
                <p className="text-sm text-blue-300">
                  Collega questo centro a un'organizzazione per gestire più sedi insieme.
                  Le organizzazioni permettono di condividere dati tra le sedi.
                </p>
              </div>

              {centroOrg ? (
                <div className="bg-amber-500/10 border border-amber-500/30 rounded-lg p-4">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-white font-medium">
                        Parte di: <span className="text-amber-400">{centroOrg.organization?.nome}</span>
                      </p>
                      {centroOrg.is_sede_principale && (
                        <span className="text-xs text-amber-400">Sede Principale</span>
                      )}
                    </div>
                    <button
                      onClick={() => handleLinkToOrg(null)}
                      className="px-3 py-1 text-sm text-red-400 hover:bg-red-500/20 rounded"
                    >
                      Rimuovi
                    </button>
                  </div>
                </div>
              ) : (
                <div>
                  <label className="block text-sm font-medium text-slate-300 mb-2">
                    Collega a Organizzazione
                  </label>
                  <select
                    onChange={(e) => handleLinkToOrg(e.target.value)}
                    className="w-full px-3 py-2 bg-slate-900 border border-slate-600 rounded-lg text-white"
                  >
                    <option value="">Seleziona organizzazione...</option>
                    {organizations.map(org => (
                      <option key={org.id} value={org.id}>{org.nome}</option>
                    ))}
                  </select>
                </div>
              )}

              <div className="border-t border-slate-700 pt-6">
                <Link
                  href="/admin/organizzazioni"
                  className="text-teal-400 hover:text-teal-300"
                >
                  Gestisci Organizzazioni &rarr;
                </Link>
              </div>
            </div>
          )}

        </div>
      </div>
    </div>
  )
}

// Componente helper
function InputField({ label, value, onChange, type = 'text', disabled = false, placeholder = '', maxLength }) {
  return (
    <div>
      <label className="block text-sm font-medium text-slate-300 mb-1">{label}</label>
      <input
        type={type}
        value={value || ''}
        onChange={(e) => onChange(e.target.value)}
        disabled={disabled}
        placeholder={placeholder}
        maxLength={maxLength}
        className="w-full px-3 py-2 bg-slate-900 border border-slate-600 rounded-lg text-white focus:ring-2 focus:ring-teal-500 focus:border-transparent disabled:opacity-50"
      />
    </div>
  )
}
