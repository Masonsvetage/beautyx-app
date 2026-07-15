'use client'

import { useState, useEffect } from 'react'
import Link from 'next/link'
import { useAuth } from '@/contexts/AuthContext'
import { supabase } from '@/lib/supabase'

const DATA_TYPES = [
  { key: 'movimenti_bancari', label: 'Movimenti Bancari', icon: '💰' },
  { key: 'obiettivi', label: 'Obiettivi', icon: '🎯' },
  { key: 'clienti', label: 'Clienti', icon: '👥' },
  { key: 'servizi', label: 'Servizi', icon: '💆' },
  { key: 'listino', label: 'Listino Prezzi', icon: '📋' },
  { key: 'conversazioni_beautyx', label: 'Conversazioni Beautyx', icon: '💬' },
  { key: 'analytics', label: 'Analytics', icon: '📊' }
]

const SHARING_MODES = [
  { value: 'separated', label: 'Separati', description: 'Ogni sede ha dati propri' },
  { value: 'shared', label: 'Condivisi', description: 'Dati comuni a tutte le sedi' },
  { value: 'aggregated', label: 'Aggregati', description: 'Separati ma visibili insieme' }
]

export default function AdminOrganizzazioniPage() {
  const { isAdmin } = useAuth()
  const [organizations, setOrganizations] = useState([])
  const [centri, setCentri] = useState([])
  const [loading, setLoading] = useState(true)
  const [showCreateModal, setShowCreateModal] = useState(false)
  const [editingOrg, setEditingOrg] = useState(null)
  const [showSharingModal, setShowSharingModal] = useState(null)
  const [saving, setSaving] = useState(false)
  const [newOrg, setNewOrg] = useState({ nome: '', descrizione: '' })

  useEffect(() => {
    loadData()
  }, [])

  const loadData = async () => {
    try {
      // Carica organizzazioni con centri collegati
      const { data: orgs, error: orgsError } = await supabase
        .from('organizations')
        .select(`
          *,
          centro_organization_links(
            id,
            centro_id,
            is_sede_principale,
            centro:beauty_centers(id, nome, citta)
          ),
          data_sharing_settings(*)
        `)
        .order('nome')

      if (orgsError) {
        console.log('Tabella organizations non esiste ancora:', orgsError)
        setOrganizations([])
      } else {
        setOrganizations(orgs || [])
      }

      // Carica tutti i centri
      const { data: centriData } = await supabase
        .from('beauty_centers')
        .select('id, nome, citta')
        .order('nome')

      setCentri(centriData || [])
    } catch (error) {
      console.error('Errore caricamento:', error)
    } finally {
      setLoading(false)
    }
  }

  const handleCreateOrg = async () => {
    if (!newOrg.nome) return
    setSaving(true)

    try {
      const { data, error } = await supabase
        .from('organizations')
        .insert([newOrg])
        .select()
        .single()

      if (error) throw error

      setOrganizations(prev => [...prev, { ...data, centro_organization_links: [], data_sharing_settings: [] }])
      setShowCreateModal(false)
      setNewOrg({ nome: '', descrizione: '' })
    } catch (error) {
      console.error('Errore creazione:', error)
      alert('Errore: ' + error.message)
    } finally {
      setSaving(false)
    }
  }

  const handleAddCentroToOrg = async (orgId, centroId, isSedePrincipale = false) => {
    try {
      const { error } = await supabase
        .from('centro_organization_links')
        .insert({
          organization_id: orgId,
          centro_id: centroId,
          is_sede_principale: isSedePrincipale
        })

      if (error) throw error
      await loadData()
    } catch (error) {
      console.error('Errore:', error)
      alert('Errore: ' + error.message)
    }
  }

  const handleRemoveCentroFromOrg = async (linkId) => {
    if (!confirm('Rimuovere questo centro dall\'organizzazione?')) return

    try {
      const { error } = await supabase
        .from('centro_organization_links')
        .delete()
        .eq('id', linkId)

      if (error) throw error
      await loadData()
    } catch (error) {
      console.error('Errore:', error)
    }
  }

  const handleSaveSharingSettings = async (orgId, settings) => {
    setSaving(true)
    try {
      // Elimina settings esistenti
      await supabase
        .from('data_sharing_settings')
        .delete()
        .eq('organization_id', orgId)

      // Inserisci nuovi settings
      const newSettings = Object.entries(settings).map(([dataType, mode]) => ({
        organization_id: orgId,
        data_type: dataType,
        sharing_mode: mode
      }))

      if (newSettings.length > 0) {
        const { error } = await supabase
          .from('data_sharing_settings')
          .insert(newSettings)

        if (error) throw error
      }

      await loadData()
      setShowSharingModal(null)
    } catch (error) {
      console.error('Errore:', error)
      alert('Errore: ' + error.message)
    } finally {
      setSaving(false)
    }
  }

  const handleDeleteOrg = async (orgId) => {
    if (!confirm('Eliminare questa organizzazione? I centri NON verranno eliminati.')) return

    try {
      const { error } = await supabase
        .from('organizations')
        .delete()
        .eq('id', orgId)

      if (error) throw error
      setOrganizations(prev => prev.filter(o => o.id !== orgId))
    } catch (error) {
      console.error('Errore:', error)
      alert('Errore: ' + error.message)
    }
  }

  // Centri non ancora in nessuna organizzazione
  const unlinkedCentri = centri.filter(c =>
    !organizations.some(o =>
      o.centro_organization_links?.some(link => link.centro_id === c.id)
    )
  )

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900 p-6 flex items-center justify-center">
        <div className="text-center">
          <div className="w-12 h-12 border-4 border-teal-500 border-t-transparent rounded-full animate-spin mx-auto"></div>
          <p className="mt-4 text-slate-400">Caricamento organizzazioni...</p>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900 p-6">
      {/* Header */}
      <div className="max-w-6xl mx-auto mb-6">
        <div className="bg-slate-950/60 backdrop-blur-md rounded-xl border border-slate-700/50 p-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <Link href="/admin" className="text-slate-400 hover:text-white transition-colors">
                <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
                </svg>
              </Link>
              <div>
                <h1 className="text-2xl font-bold text-white">Organizzazioni & Sedi</h1>
                <p className="text-sm text-slate-400">Gestisci gruppi di centri con sedi collegate</p>
              </div>
            </div>
            <button
              onClick={() => setShowCreateModal(true)}
              className="flex items-center gap-2 px-4 py-2 bg-teal-500 text-white rounded-lg hover:bg-teal-600 transition-colors"
            >
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6v6m0 0v6m0-6h6m-6 0H6" />
              </svg>
              Nuova Organizzazione
            </button>
          </div>
        </div>
      </div>

      {/* Info Box */}
      <div className="max-w-6xl mx-auto mb-6">
        <div className="bg-blue-500/10 border border-blue-500/30 rounded-xl p-4">
          <h3 className="text-blue-400 font-medium mb-2">Come funzionano le Organizzazioni?</h3>
          <ul className="text-sm text-slate-400 space-y-1">
            <li>• Raggruppa centri che fanno parte della stessa attività (es. sede principale + filiali)</li>
            <li>• Configura quali dati sono condivisi tra le sedi e quali separati</li>
            <li>• Gli HPA possono vedere dati aggregati di tutta l'organizzazione</li>
          </ul>
        </div>
      </div>

      {/* Lista Organizzazioni */}
      <div className="max-w-6xl mx-auto space-y-4">
        {organizations.map(org => (
          <div key={org.id} className="bg-slate-800/30 backdrop-blur-sm rounded-xl border border-slate-700/50 overflow-hidden">
            {/* Header Org */}
            <div className="p-4 border-b border-slate-700/50 flex items-center justify-between">
              <div>
                <h3 className="text-lg font-semibold text-white flex items-center gap-2">
                  <span>🏢</span> {org.nome}
                </h3>
                {org.descrizione && <p className="text-sm text-slate-400">{org.descrizione}</p>}
              </div>
              <div className="flex gap-2">
                <button
                  onClick={() => setShowSharingModal(org)}
                  className="px-3 py-1.5 text-sm bg-purple-500/20 text-purple-400 rounded-lg hover:bg-purple-500/30"
                >
                  Condivisione Dati
                </button>
                <button
                  onClick={() => handleDeleteOrg(org.id)}
                  className="p-2 text-red-400 hover:bg-red-500/20 rounded-lg"
                >
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                  </svg>
                </button>
              </div>
            </div>

            {/* Centri collegati */}
            <div className="p-4">
              <p className="text-sm text-slate-500 mb-3">Sedi collegate:</p>
              <div className="space-y-2">
                {org.centro_organization_links?.map(link => (
                  <div key={link.id} className="flex items-center justify-between bg-slate-900/50 rounded-lg p-3">
                    <div className="flex items-center gap-3">
                      {link.is_sede_principale && (
                        <span className="text-amber-400" title="Sede principale">⭐</span>
                      )}
                      <div>
                        <span className="text-white">{link.centro?.nome}</span>
                        {link.centro?.citta && (
                          <span className="text-slate-500 text-sm ml-2">({link.centro.citta})</span>
                        )}
                      </div>
                    </div>
                    <button
                      onClick={() => handleRemoveCentroFromOrg(link.id)}
                      className="text-red-400 hover:text-red-300 text-sm"
                    >
                      Rimuovi
                    </button>
                  </div>
                ))}

                {(!org.centro_organization_links || org.centro_organization_links.length === 0) && (
                  <p className="text-slate-500 text-sm italic">Nessuna sede collegata</p>
                )}

                {/* Aggiungi centro */}
                {unlinkedCentri.length > 0 && (
                  <div className="mt-3 pt-3 border-t border-slate-700/50">
                    <select
                      onChange={(e) => {
                        if (e.target.value) {
                          handleAddCentroToOrg(org.id, e.target.value, org.centro_organization_links?.length === 0)
                          e.target.value = ''
                        }
                      }}
                      className="w-full px-3 py-2 bg-slate-900 border border-slate-600 rounded-lg text-white text-sm"
                    >
                      <option value="">+ Aggiungi sede...</option>
                      {unlinkedCentri.map(c => (
                        <option key={c.id} value={c.id}>{c.nome} {c.citta ? `(${c.citta})` : ''}</option>
                      ))}
                    </select>
                  </div>
                )}
              </div>

              {/* Impostazioni condivisione attuali */}
              {org.data_sharing_settings && org.data_sharing_settings.length > 0 && (
                <div className="mt-4 pt-4 border-t border-slate-700/50">
                  <p className="text-sm text-slate-500 mb-2">Configurazione dati:</p>
                  <div className="flex flex-wrap gap-2">
                    {org.data_sharing_settings.map(setting => {
                      const dt = DATA_TYPES.find(d => d.key === setting.data_type)
                      const mode = SHARING_MODES.find(m => m.value === setting.sharing_mode)
                      return (
                        <span
                          key={setting.id}
                          className={`text-xs px-2 py-1 rounded ${
                            setting.sharing_mode === 'shared' ? 'bg-green-500/20 text-green-400' :
                            setting.sharing_mode === 'aggregated' ? 'bg-blue-500/20 text-blue-400' :
                            'bg-slate-500/20 text-slate-400'
                          }`}
                        >
                          {dt?.icon} {dt?.label}: {mode?.label}
                        </span>
                      )
                    })}
                  </div>
                </div>
              )}
            </div>
          </div>
        ))}

        {organizations.length === 0 && (
          <div className="text-center py-12 text-slate-400">
            <p className="mb-4">Nessuna organizzazione creata</p>
            <button
              onClick={() => setShowCreateModal(true)}
              className="text-teal-400 hover:text-teal-300"
            >
              Crea la prima organizzazione
            </button>
          </div>
        )}

        {/* Centri non collegati */}
        {unlinkedCentri.length > 0 && (
          <div className="bg-slate-800/20 rounded-xl border border-dashed border-slate-700/50 p-4">
            <h4 className="text-slate-400 font-medium mb-3">Centri indipendenti (non in organizzazioni)</h4>
            <div className="flex flex-wrap gap-2">
              {unlinkedCentri.map(c => (
                <span key={c.id} className="bg-slate-700/50 text-slate-300 text-sm px-3 py-1 rounded-lg">
                  {c.nome}
                </span>
              ))}
            </div>
          </div>
        )}
      </div>

      {/* Modal Crea Organizzazione */}
      {showCreateModal && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className="bg-slate-800 rounded-xl border border-slate-700 w-full max-w-md">
            <div className="p-6 border-b border-slate-700">
              <h3 className="text-lg font-bold text-white">Nuova Organizzazione</h3>
            </div>

            <div className="p-6 space-y-4">
              <div>
                <label className="block text-sm font-medium text-slate-300 mb-1">Nome *</label>
                <input
                  type="text"
                  value={newOrg.nome}
                  onChange={(e) => setNewOrg(prev => ({ ...prev, nome: e.target.value }))}
                  className="w-full px-3 py-2 bg-slate-900 border border-slate-600 rounded-lg text-white"
                  placeholder="es. Beauty Group Milano"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-300 mb-1">Descrizione</label>
                <textarea
                  value={newOrg.descrizione}
                  onChange={(e) => setNewOrg(prev => ({ ...prev, descrizione: e.target.value }))}
                  className="w-full px-3 py-2 bg-slate-900 border border-slate-600 rounded-lg text-white"
                  rows={3}
                  placeholder="Descrizione opzionale..."
                />
              </div>
            </div>

            <div className="p-6 border-t border-slate-700 flex gap-3 justify-end">
              <button onClick={() => setShowCreateModal(false)} className="px-4 py-2 text-slate-400 hover:text-white">
                Annulla
              </button>
              <button
                onClick={handleCreateOrg}
                disabled={saving || !newOrg.nome}
                className="px-4 py-2 bg-teal-500 text-white rounded-lg hover:bg-teal-600 disabled:opacity-50"
              >
                {saving ? 'Creazione...' : 'Crea'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Modal Condivisione Dati */}
      {showSharingModal && (
        <SharingSettingsModal
          organization={showSharingModal}
          onClose={() => setShowSharingModal(null)}
          onSave={handleSaveSharingSettings}
          saving={saving}
        />
      )}
    </div>
  )
}

// Componente Modal per impostazioni condivisione
function SharingSettingsModal({ organization, onClose, onSave, saving }) {
  const [settings, setSettings] = useState({})

  useEffect(() => {
    // Inizializza con settings esistenti
    const initial = {}
    DATA_TYPES.forEach(dt => {
      const existing = organization.data_sharing_settings?.find(s => s.data_type === dt.key)
      initial[dt.key] = existing?.sharing_mode || 'separated'
    })
    setSettings(initial)
  }, [organization])

  return (
    <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50 p-4">
      <div className="bg-slate-800 rounded-xl border border-slate-700 w-full max-w-lg max-h-[90vh] overflow-y-auto">
        <div className="p-6 border-b border-slate-700">
          <h3 className="text-lg font-bold text-white">Condivisione Dati</h3>
          <p className="text-sm text-slate-400">{organization.nome}</p>
        </div>

        <div className="p-6 space-y-4">
          <p className="text-sm text-slate-400 mb-4">
            Configura come i dati vengono condivisi tra le sedi dell'organizzazione:
          </p>

          {DATA_TYPES.map(dt => (
            <div key={dt.key} className="bg-slate-900/50 rounded-lg p-4">
              <div className="flex items-center gap-2 mb-3">
                <span>{dt.icon}</span>
                <span className="font-medium text-white">{dt.label}</span>
              </div>
              <div className="grid grid-cols-3 gap-2">
                {SHARING_MODES.map(mode => (
                  <button
                    key={mode.value}
                    onClick={() => setSettings(prev => ({ ...prev, [dt.key]: mode.value }))}
                    className={`p-2 rounded-lg text-xs text-center transition-colors ${
                      settings[dt.key] === mode.value
                        ? mode.value === 'shared' ? 'bg-green-500/30 text-green-400 border border-green-500/50' :
                          mode.value === 'aggregated' ? 'bg-blue-500/30 text-blue-400 border border-blue-500/50' :
                          'bg-slate-600/30 text-slate-300 border border-slate-500/50'
                        : 'bg-slate-800 text-slate-400 border border-slate-700 hover:border-slate-600'
                    }`}
                  >
                    <div className="font-medium">{mode.label}</div>
                    <div className="text-[10px] opacity-70 mt-1">{mode.description}</div>
                  </button>
                ))}
              </div>
            </div>
          ))}
        </div>

        <div className="p-6 border-t border-slate-700 flex gap-3 justify-end">
          <button onClick={onClose} className="px-4 py-2 text-slate-400 hover:text-white">
            Annulla
          </button>
          <button
            onClick={() => onSave(organization.id, settings)}
            disabled={saving}
            className="px-4 py-2 bg-teal-500 text-white rounded-lg hover:bg-teal-600 disabled:opacity-50"
          >
            {saving ? 'Salvataggio...' : 'Salva Configurazione'}
          </button>
        </div>
      </div>
    </div>
  )
}
