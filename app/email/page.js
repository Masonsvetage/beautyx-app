'use client'

import { useState, useEffect, useCallback } from 'react'
import Link from 'next/link'

// Provider preset comuni
const PRESETS = {
  gmail: { label: 'Gmail', imap_host: 'imap.gmail.com', imap_port: 993, imap_secure: true, smtp_host: 'smtp.gmail.com', smtp_port: 587, smtp_secure: false },
  outlook: { label: 'Outlook / Office 365', imap_host: 'outlook.office365.com', imap_port: 993, imap_secure: true, smtp_host: 'smtp-mail.outlook.com', smtp_port: 587, smtp_secure: false },
  aruba: { label: 'Aruba', imap_host: 'imaps.aruba.it', imap_port: 993, imap_secure: true, smtp_host: 'smtps.aruba.it', smtp_port: 465, smtp_secure: true },
  libero: { label: 'Libero', imap_host: 'imap.libero.it', imap_port: 993, imap_secure: true, smtp_host: 'smtp.libero.it', smtp_port: 465, smtp_secure: true },
  tim: { label: 'TIM / Alice', imap_host: 'imap.tim.it', imap_port: 993, imap_secure: true, smtp_host: 'smtp.tim.it', smtp_port: 587, smtp_secure: false },
  custom: { label: 'Personalizzato', imap_host: '', imap_port: 993, imap_secure: true, smtp_host: '', smtp_port: 587, smtp_secure: false }
}

const CATEGORY_LABELS = { gestionale: 'Gestionale', engagement: 'Clienti', altro: 'Altro' }
const CATEGORY_COLORS = { gestionale: 'blue', engagement: 'emerald', altro: 'slate' }
const SENTIMENT_ICONS = { positivo: '😊', neutro: '😐', negativo: '😟' }

export default function EmailPage() {
  const [integrations, setIntegrations] = useState([])
  const [selectedIntegration, setSelectedIntegration] = useState(null)
  const [emails, setEmails] = useState([])
  const [selectedEmail, setSelectedEmail] = useState(null)
  const [category, setCategory] = useState('all')
  const [loading, setLoading] = useState(true)
  const [syncing, setSyncing] = useState(false)
  const [syncResult, setSyncResult] = useState(null)
  const [showSetup, setShowSetup] = useState(false)
  const [testing, setTesting] = useState(false)
  const [testResult, setTestResult] = useState(null)
  const [saving, setSaving] = useState(false)

  const [form, setForm] = useState({
    label: '', email_address: '', preset: 'gmail',
    imap_host: 'imap.gmail.com', imap_port: 993, imap_secure: true, imap_user: '', imap_password: '',
    smtp_host: 'smtp.gmail.com', smtp_port: 587, smtp_secure: false, smtp_user: '', smtp_password: '',
    centro_id: ''
  })

  useEffect(() => { loadIntegrations() }, [])

  useEffect(() => {
    if (selectedIntegration) loadEmails(selectedIntegration.id, category)
  }, [selectedIntegration, category])

  const loadIntegrations = async () => {
    setLoading(true)
    try {
      const res = await fetch('/api/user/email-integrations')
      const data = await res.json()
      const list = data.integrations || []
      setIntegrations(list)
      if (list.length > 0 && !selectedIntegration) setSelectedIntegration(list[0])
    } catch (e) {
      console.error(e)
    } finally {
      setLoading(false)
    }
  }

  const loadEmails = async (integrationId, cat) => {
    try {
      const url = cat === 'all'
        ? `/api/user/email-integrations/${integrationId}/emails`
        : `/api/user/email-integrations/${integrationId}/emails?category=${cat}`
      const res = await fetch(url)
      const data = await res.json()
      setEmails(data.emails || [])
    } catch (e) {
      console.error(e)
    }
  }

  const handleSync = async () => {
    if (!selectedIntegration) return
    setSyncing(true)
    setSyncResult(null)
    try {
      const res = await fetch(`/api/user/email-integrations/${selectedIntegration.id}/sync`, { method: 'POST' })
      const data = await res.json()
      setSyncResult(data)
      if (data.success) {
        await loadEmails(selectedIntegration.id, category)
        await loadIntegrations()
      }
    } catch (e) {
      setSyncResult({ error: e.message })
    } finally {
      setSyncing(false)
    }
  }

  const handlePreset = (preset) => {
    const p = PRESETS[preset]
    setForm(prev => ({ ...prev, preset, ...p,
      imap_user: prev.email_address, smtp_user: prev.email_address
    }))
  }

  const handleTest = async () => {
    setTesting(true)
    setTestResult(null)
    try {
      // Test con dati del form (crea temp o usa endpoint diretto)
      // Prima salva provvisoriamente
      const saveRes = await fetch('/api/user/email-integrations', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ...form, imap_user: form.imap_user || form.email_address, smtp_user: form.smtp_user || form.email_address })
      })
      const saveData = await saveRes.json()
      if (!saveRes.ok) throw new Error(saveData.error)

      const testRes = await fetch(`/api/user/email-integrations/${saveData.integration.id}/test`, { method: 'POST' })
      const testData = await testRes.json()
      setTestResult({ ...testData, integration_id: saveData.integration.id })

      if (testData.success) {
        await loadIntegrations()
        setShowSetup(false)
        setSelectedIntegration({ ...saveData.integration })
      } else {
        // Rimuovi l'integrazione fallita
        await fetch(`/api/user/email-integrations/${saveData.integration.id}`, { method: 'DELETE' })
      }
    } catch (e) {
      setTestResult({ error: e.message })
    } finally {
      setTesting(false)
    }
  }

  const handleDelete = async (integrationId) => {
    if (!confirm('Rimuovere questa integrazione email? Verranno eliminate anche le email salvate.')) return
    await fetch(`/api/user/email-integrations/${integrationId}`, { method: 'DELETE' })
    await loadIntegrations()
    if (selectedIntegration?.id === integrationId) {
      setSelectedIntegration(null)
      setEmails([])
    }
  }

  const importantEmails = emails.filter(e => e.important && !e.is_read)
  const gestionale = emails.filter(e => e.category === 'gestionale')
  const engagement = emails.filter(e => e.category === 'engagement')

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900 flex items-center justify-center">
        <div className="w-10 h-10 border-4 border-teal-500 border-t-transparent rounded-full animate-spin" />
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900 p-4 md:p-6">
      <div className="max-w-6xl mx-auto space-y-4">

        {/* Header */}
        <div className="bg-slate-950/60 backdrop-blur-md rounded-xl border border-slate-700/50 p-4">
          <div className="flex items-center justify-between gap-4">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 bg-gradient-to-br from-blue-600 to-indigo-600 rounded-lg flex items-center justify-center">
                <svg className="w-6 h-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
                </svg>
              </div>
              <div>
                <h1 className="text-xl font-bold text-white">Gestione Email</h1>
                <p className="text-xs text-blue-300">Categorizzate da Beautyx AI</p>
              </div>
            </div>
            <button
              onClick={() => { setShowSetup(true); setTestResult(null) }}
              className="flex items-center gap-2 px-4 py-2 bg-blue-600 hover:bg-blue-500 text-white rounded-lg text-sm font-medium transition-colors"
            >
              <span>+</span> Collega email
            </button>
          </div>
        </div>

        {/* Setup Form */}
        {showSetup && (
          <div className="bg-slate-800/80 rounded-xl border border-blue-500/30 p-5 space-y-4">
            <div className="flex items-center justify-between">
              <h3 className="text-white font-semibold">Collega un account email</h3>
              <button onClick={() => setShowSetup(false)} className="text-slate-400 hover:text-white">✕</button>
            </div>

            {/* Provider preset */}
            <div>
              <p className="text-sm text-slate-400 mb-2">Provider email</p>
              <div className="flex flex-wrap gap-2">
                {Object.entries(PRESETS).map(([key, p]) => (
                  <button key={key} onClick={() => handlePreset(key)}
                    className={`px-3 py-1.5 rounded-lg text-sm transition-colors ${form.preset === key ? 'bg-blue-600 text-white' : 'bg-slate-700 text-slate-300 hover:bg-slate-600'}`}>
                    {p.label}
                  </button>
                ))}
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              <div>
                <label className="block text-xs text-slate-400 mb-1">Nome account</label>
                <input value={form.label} onChange={e => setForm(p => ({ ...p, label: e.target.value }))}
                  placeholder="Es: Email Centro" className="w-full px-3 py-2 bg-slate-900 border border-slate-600 rounded-lg text-white text-sm" />
              </div>
              <div>
                <label className="block text-xs text-slate-400 mb-1">Indirizzo email *</label>
                <input value={form.email_address} onChange={e => setForm(p => ({ ...p, email_address: e.target.value, imap_user: e.target.value, smtp_user: e.target.value }))}
                  placeholder="info@tuocentro.it" className="w-full px-3 py-2 bg-slate-900 border border-slate-600 rounded-lg text-white text-sm" />
              </div>
              <div>
                <label className="block text-xs text-slate-400 mb-1">Password IMAP *</label>
                <input type="password" value={form.imap_password} onChange={e => setForm(p => ({ ...p, imap_password: e.target.value }))}
                  placeholder="Password o App Password" className="w-full px-3 py-2 bg-slate-900 border border-slate-600 rounded-lg text-white text-sm" />
              </div>
              <div>
                <label className="block text-xs text-slate-400 mb-1">Password SMTP *</label>
                <input type="password" value={form.smtp_password} onChange={e => setForm(p => ({ ...p, smtp_password: e.target.value }))}
                  placeholder="Stessa password o App Password" className="w-full px-3 py-2 bg-slate-900 border border-slate-600 rounded-lg text-white text-sm" />
              </div>
            </div>

            {form.preset === 'custom' && (
              <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                <div>
                  <label className="block text-xs text-slate-400 mb-1">IMAP Host</label>
                  <input value={form.imap_host} onChange={e => setForm(p => ({ ...p, imap_host: e.target.value }))} className="w-full px-3 py-2 bg-slate-900 border border-slate-600 rounded-lg text-white text-sm" />
                </div>
                <div>
                  <label className="block text-xs text-slate-400 mb-1">IMAP Porta</label>
                  <input type="number" value={form.imap_port} onChange={e => setForm(p => ({ ...p, imap_port: Number(e.target.value) }))} className="w-full px-3 py-2 bg-slate-900 border border-slate-600 rounded-lg text-white text-sm" />
                </div>
                <div>
                  <label className="block text-xs text-slate-400 mb-1">SMTP Host</label>
                  <input value={form.smtp_host} onChange={e => setForm(p => ({ ...p, smtp_host: e.target.value }))} className="w-full px-3 py-2 bg-slate-900 border border-slate-600 rounded-lg text-white text-sm" />
                </div>
                <div>
                  <label className="block text-xs text-slate-400 mb-1">SMTP Porta</label>
                  <input type="number" value={form.smtp_port} onChange={e => setForm(p => ({ ...p, smtp_port: Number(e.target.value) }))} className="w-full px-3 py-2 bg-slate-900 border border-slate-600 rounded-lg text-white text-sm" />
                </div>
              </div>
            )}

            {form.preset === 'gmail' && (
              <div className="bg-amber-900/20 border border-amber-500/30 rounded-lg p-3 text-xs text-amber-300">
                Per Gmail usa una <strong>App Password</strong> (non la password principale). Vai su Account Google → Sicurezza → Verifica in due passaggi → Password per le app.
              </div>
            )}

            {testResult && (
              <div className={`rounded-lg p-3 text-sm ${testResult.success ? 'bg-emerald-900/30 border border-emerald-500/40 text-emerald-300' : 'bg-red-900/30 border border-red-500/40 text-red-300'}`}>
                {testResult.success ? '✓ Connessione riuscita! Account collegato.' : (
                  <div>
                    <p>Connessione fallita:</p>
                    {testResult.errors?.imap && <p>IMAP: {testResult.errors.imap}</p>}
                    {testResult.errors?.smtp && <p>SMTP: {testResult.errors.smtp}</p>}
                    {testResult.error && <p>{testResult.error}</p>}
                  </div>
                )}
              </div>
            )}

            <div className="flex gap-3">
              <button onClick={handleTest} disabled={testing || !form.email_address || !form.imap_password}
                className="px-5 py-2 bg-blue-600 hover:bg-blue-500 text-white rounded-lg text-sm font-medium transition-colors disabled:opacity-50">
                {testing ? 'Test in corso...' : 'Testa e collega'}
              </button>
              <button onClick={() => setShowSetup(false)} className="px-4 py-2 bg-slate-700 hover:bg-slate-600 text-slate-300 rounded-lg text-sm transition-colors">
                Annulla
              </button>
            </div>
          </div>
        )}

        {integrations.length === 0 && !showSetup ? (
          <div className="bg-slate-800/50 rounded-xl border border-dashed border-slate-600 p-12 text-center">
            <div className="w-16 h-16 bg-blue-500/10 rounded-full flex items-center justify-center mx-auto mb-4">
              <svg className="w-8 h-8 text-blue-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
              </svg>
            </div>
            <h3 className="text-white font-semibold mb-2">Collega la tua email</h3>
            <p className="text-slate-400 text-sm mb-4">Beautyx AI analizzerà le tue email e le categorizzerà automaticamente: fatture, pagamenti, feedback clienti e molto altro.</p>
            <button onClick={() => setShowSetup(true)} className="px-6 py-2.5 bg-blue-600 hover:bg-blue-500 text-white rounded-lg text-sm font-medium transition-colors">
              Collega email
            </button>
          </div>
        ) : integrations.length > 0 && (
          <div className="grid grid-cols-1 lg:grid-cols-4 gap-4">

            {/* Sidebar: account + filtri */}
            <div className="space-y-3">
              {/* Account list */}
              <div className="bg-slate-800/50 rounded-xl border border-slate-700/50 p-3 space-y-2">
                <p className="text-xs font-semibold text-slate-400 uppercase tracking-wider px-1">Account</p>
                {integrations.map(int => (
                  <div key={int.id} className={`rounded-lg p-2.5 cursor-pointer transition-colors ${selectedIntegration?.id === int.id ? 'bg-blue-600/20 border border-blue-500/40' : 'hover:bg-slate-700/50'}`}
                    onClick={() => setSelectedIntegration(int)}>
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2 min-w-0">
                        <div className="w-7 h-7 bg-blue-500/20 rounded-full flex items-center justify-center flex-shrink-0">
                          <span className="text-blue-400 text-xs font-bold">{int.label[0]?.toUpperCase()}</span>
                        </div>
                        <div className="min-w-0">
                          <p className="text-white text-xs font-medium truncate">{int.label}</p>
                          <p className="text-slate-500 text-xs truncate">{int.email_address}</p>
                        </div>
                      </div>
                      <button onClick={(e) => { e.stopPropagation(); handleDelete(int.id) }}
                        className="text-slate-600 hover:text-red-400 text-xs ml-1 flex-shrink-0 transition-colors">✕</button>
                    </div>
                    {int.last_synced_at && (
                      <p className="text-slate-600 text-xs mt-1 pl-9">
                        {new Date(int.last_synced_at).toLocaleString('it-IT', { day: '2-digit', month: '2-digit', hour: '2-digit', minute: '2-digit' })}
                      </p>
                    )}
                  </div>
                ))}
              </div>

              {/* Filtri categoria */}
              <div className="bg-slate-800/50 rounded-xl border border-slate-700/50 p-3 space-y-1">
                <p className="text-xs font-semibold text-slate-400 uppercase tracking-wider px-1 mb-2">Categorie</p>
                {[
                  { id: 'all', label: 'Tutte', count: emails.length, color: 'slate' },
                  { id: 'gestionale', label: 'Gestionale', count: gestionale.length, color: 'blue' },
                  { id: 'engagement', label: 'Clienti', count: engagement.length, color: 'emerald' },
                  { id: 'altro', label: 'Altro', count: emails.filter(e => e.category === 'altro').length, color: 'slate' }
                ].map(({ id, label, count, color }) => (
                  <button key={id} onClick={() => setCategory(id)}
                    className={`w-full flex items-center justify-between px-2.5 py-2 rounded-lg text-sm transition-colors ${category === id ? `bg-${color}-600/20 text-${color}-300` : 'text-slate-400 hover:bg-slate-700/50 hover:text-white'}`}>
                    <span>{label}</span>
                    <span className="text-xs bg-slate-700 px-1.5 py-0.5 rounded-full">{count}</span>
                  </button>
                ))}
              </div>

              {/* Sync button */}
              <button onClick={handleSync} disabled={syncing || !selectedIntegration}
                className="w-full flex items-center justify-center gap-2 py-2.5 bg-slate-700 hover:bg-slate-600 text-white rounded-lg text-sm transition-colors disabled:opacity-50">
                <svg className={`w-4 h-4 ${syncing ? 'animate-spin' : ''}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
                </svg>
                {syncing ? 'Sincronizzazione...' : 'Sincronizza'}
              </button>

              {syncResult && (
                <div className={`rounded-lg p-2.5 text-xs ${syncResult.success ? 'bg-emerald-900/30 text-emerald-300' : 'bg-red-900/30 text-red-300'}`}>
                  {syncResult.success
                    ? `+${syncResult.classified} email · ${syncResult.spam_filtered || 0} spam filtrate`
                    : syncResult.error}
                </div>
              )}
            </div>

            {/* Email list + detail */}
            <div className="lg:col-span-3 space-y-3">

              {/* Urgenti in evidenza */}
              {importantEmails.length > 0 && (
                <div className="bg-red-900/20 border border-red-500/30 rounded-xl p-3">
                  <p className="text-red-400 text-xs font-semibold mb-2">⚡ RICHIEDONO ATTENZIONE</p>
                  <div className="space-y-2">
                    {importantEmails.slice(0, 3).map(e => (
                      <button key={e.id} onClick={() => setSelectedEmail(e)}
                        className="w-full text-left bg-slate-800/50 rounded-lg p-3 hover:bg-slate-700/50 transition-colors">
                        <div className="flex items-start gap-2">
                          <span className={`px-2 py-0.5 rounded text-xs font-medium flex-shrink-0 bg-${CATEGORY_COLORS[e.category]}-500/20 text-${CATEGORY_COLORS[e.category]}-300`}>
                            {CATEGORY_LABELS[e.category]}
                          </span>
                          <div className="min-w-0">
                            <p className="text-white text-sm font-medium truncate">{e.subject}</p>
                            <p className="text-slate-400 text-xs truncate">{e.ai_summary || e.body_preview?.slice(0, 100)}</p>
                          </div>
                        </div>
                      </button>
                    ))}
                  </div>
                </div>
              )}

              {/* Lista email */}
              <div className="bg-slate-800/50 rounded-xl border border-slate-700/50 overflow-hidden">
                {emails.length === 0 ? (
                  <div className="text-center py-12 text-slate-500">
                    <p className="text-sm">Nessuna email. Clicca "Sincronizza" per scaricare le email.</p>
                  </div>
                ) : (
                  <div className="divide-y divide-slate-700/50 max-h-[600px] overflow-y-auto">
                    {emails.map(e => (
                      <button key={e.id} onClick={() => setSelectedEmail(selectedEmail?.id === e.id ? null : e)}
                        className={`w-full text-left p-4 hover:bg-slate-700/30 transition-colors ${!e.is_read ? 'border-l-2 border-blue-500' : ''} ${selectedEmail?.id === e.id ? 'bg-slate-700/40' : ''}`}>
                        <div className="flex items-start gap-3">
                          <div className="w-8 h-8 bg-gradient-to-br from-slate-600 to-slate-700 rounded-full flex items-center justify-center flex-shrink-0 text-xs font-bold text-white">
                            {(e.from_name || e.from_email || '?')[0]?.toUpperCase()}
                          </div>
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center gap-2 mb-0.5">
                              <span className="text-white text-sm font-medium truncate">{e.from_name || e.from_email}</span>
                              <div className="flex items-center gap-1 ml-auto flex-shrink-0">
                                {e.important && <span className="text-amber-400 text-xs">⚡</span>}
                                {e.sentiment && <span className="text-xs">{SENTIMENT_ICONS[e.sentiment]}</span>}
                                <span className={`px-1.5 py-0.5 rounded text-xs bg-${CATEGORY_COLORS[e.category] || 'slate'}-500/20 text-${CATEGORY_COLORS[e.category] || 'slate'}-300`}>
                                  {e.subcategory || CATEGORY_LABELS[e.category] || e.category}
                                </span>
                              </div>
                            </div>
                            <p className={`text-sm truncate ${!e.is_read ? 'text-white font-medium' : 'text-slate-300'}`}>{e.subject}</p>
                            <p className="text-xs text-slate-500 truncate mt-0.5">
                              {e.ai_summary || e.body_preview?.slice(0, 80)}
                            </p>
                            <div className="flex items-center justify-between mt-1">
                              <div className="flex gap-1.5">
                                {(e.ai_amounts || []).slice(0, 2).map((a, i) => (
                                  <span key={i} className="text-xs text-amber-400 bg-amber-500/10 px-1.5 py-0.5 rounded">{a}</span>
                                ))}
                              </div>
                              <span className="text-xs text-slate-600">
                                {new Date(e.received_at).toLocaleString('it-IT', { day: '2-digit', month: '2-digit', hour: '2-digit', minute: '2-digit' })}
                              </span>
                            </div>
                          </div>
                        </div>

                        {/* Email detail inline */}
                        {selectedEmail?.id === e.id && (
                          <div className="mt-3 pt-3 border-t border-slate-600/50 text-left space-y-2" onClick={ev => ev.stopPropagation()}>
                            <div className="flex flex-wrap gap-2 text-xs text-slate-400">
                              <span>Da: <span className="text-slate-300">{e.from_name} &lt;{e.from_email}&gt;</span></span>
                              <span>A: <span className="text-slate-300">{e.to_email}</span></span>
                            </div>
                            {e.ai_summary && (
                              <div className="bg-teal-900/20 border border-teal-500/20 rounded-lg p-3">
                                <p className="text-xs text-teal-400 font-medium mb-1">Beautyx AI</p>
                                <p className="text-sm text-slate-200">{e.ai_summary}</p>
                              </div>
                            )}
                            <p className="text-sm text-slate-400 leading-relaxed whitespace-pre-wrap">{e.body_preview}</p>
                            {selectedIntegration && (
                              <ReplyForm integrationId={selectedIntegration.id} to={e.from_email} subject={`Re: ${e.subject}`} />
                            )}
                          </div>
                        )}
                      </button>
                    ))}
                  </div>
                )}
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}

// Form risposta inline
function ReplyForm({ integrationId, to, subject }) {
  const [text, setText] = useState('')
  const [sending, setSending] = useState(false)
  const [sent, setSent] = useState(false)

  const send = async () => {
    if (!text.trim()) return
    setSending(true)
    try {
      const res = await fetch(`/api/user/email-integrations/${integrationId}/send`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ to, subject, text })
      })
      if (res.ok) { setSent(true); setText('') }
    } finally {
      setSending(false)
    }
  }

  if (sent) return <p className="text-emerald-400 text-sm">Email inviata!</p>

  return (
    <div className="space-y-2">
      <textarea value={text} onChange={e => setText(e.target.value)} rows={3}
        placeholder={`Rispondi a ${to}...`}
        className="w-full px-3 py-2 bg-slate-900/50 border border-slate-600 rounded-lg text-white text-sm placeholder-slate-500 resize-none" />
      <button onClick={send} disabled={sending || !text.trim()}
        className="px-4 py-1.5 bg-blue-600 hover:bg-blue-500 text-white rounded-lg text-sm transition-colors disabled:opacity-50">
        {sending ? 'Invio...' : 'Rispondi'}
      </button>
    </div>
  )
}
