'use client'

import { useState, useEffect } from 'react'
import { useSearchParams } from 'next/navigation'
import { useAuth } from '@/contexts/AuthContext'
import { supabase } from '@/lib/supabase'
import StarRating from '@/components/common/StarRating'

const TIPI_SOCIETA = [
  { value: 'ditta_individuale', label: 'Ditta Individuale' },
  { value: 'srl', label: 'S.R.L.' },
  { value: 'srls', label: 'S.R.L.S.' },
  { value: 'sas', label: 'S.A.S.' },
  { value: 'snc', label: 'S.N.C.' },
  { value: 'spa', label: 'S.P.A.' },
  { value: 'sapa', label: 'S.A.P.A.' },
  { value: 'ss', label: 'S.S. (Società Semplice)' },
  { value: 'altro', label: 'Altro' }
]

const PROVINCE_ITALIANE = [
  'AG', 'AL', 'AN', 'AO', 'AR', 'AP', 'AT', 'AV', 'BA', 'BT', 'BL', 'BN', 'BG', 'BI', 'BO', 'BZ', 'BS', 'BR',
  'CA', 'CL', 'CB', 'CE', 'CT', 'CZ', 'CH', 'CO', 'CS', 'CR', 'KR', 'CN', 'EN', 'FM', 'FE', 'FI', 'FG', 'FC',
  'FR', 'GE', 'GO', 'GR', 'IM', 'IS', 'SP', 'AQ', 'LT', 'LE', 'LC', 'LI', 'LO', 'LU', 'MC', 'MN', 'MS', 'MT',
  'ME', 'MI', 'MO', 'MB', 'NA', 'NO', 'NU', 'OR', 'PD', 'PA', 'PR', 'PV', 'PG', 'PU', 'PE', 'PC', 'PI', 'PT',
  'PN', 'PZ', 'PO', 'RG', 'RA', 'RC', 'RE', 'RI', 'RN', 'RM', 'RO', 'SA', 'SS', 'SV', 'SI', 'SR', 'SO', 'SU',
  'TA', 'TE', 'TR', 'TO', 'TP', 'TN', 'TV', 'TS', 'UD', 'VA', 'VE', 'VB', 'VC', 'VR', 'VV', 'VI', 'VT'
]

export default function ImpostazioniPage() {
  const { profile, user, loading: authLoading, centroId, signOut } = useAuth()
  const searchParams = useSearchParams()
  const primoAccesso = searchParams.get('primo-accesso') === '1'
  const [activeTab, setActiveTab] = useState(primoAccesso ? 'centro' : 'personali')
  const [saving, setSaving] = useState(false)
  const [message, setMessage] = useState(null)
  const [avatarUploading, setAvatarUploading] = useState(false)

  // Valutazioni
  const [myRatings, setMyRatings] = useState({ beautyx: null, hpa: null })
  const [ratingDraft, setRatingDraft] = useState({ beautyx: { rating: 0, review: '' }, hpa: { rating: 0, review: '' } })
  const [ratingSaving, setRatingSaving] = useState({ beautyx: false, hpa: false })
  const [ratingMsg, setRatingMsg] = useState({ beautyx: null, hpa: null })
  const [hpaInfo, setHpaInfo] = useState(null)

  // Stato form creazione centro
  const [centroDraft, setCentroDraft] = useState({ nome: '', email: '', telefono: '', indirizzo: '', citta: '', cap: '', partita_iva: '' })
  const [centroSaving, setCentroSaving] = useState(false)
  const [centroMessage, setCentroMessage] = useState(null)
  const [formData, setFormData] = useState({
    // Tipo soggetto
    tipo_soggetto: 'persona_fisica',
    ragione_sociale: '',
    tipo_societa: '',
    // Dati personali
    nome: '',
    cognome: '',
    data_nascita: '',
    luogo_nascita: '',
    codice_fiscale: '',
    partita_iva: '',
    // Recapiti
    email: '',
    cellulare: '',
    telefono_fisso: '',
    pec: '',
    // Residenza
    residenza_indirizzo: '',
    residenza_civico: '',
    residenza_cap: '',
    residenza_citta: '',
    residenza_provincia: '',
    residenza_nazione: 'Italia',
    // Domicilio
    domicilio_diverso: false,
    domicilio_indirizzo: '',
    domicilio_civico: '',
    domicilio_cap: '',
    domicilio_citta: '',
    domicilio_provincia: '',
    domicilio_nazione: 'Italia',
    // Professionale
    professione: '',
    azienda: '',
    sito_web: ''
  })

  const [deleteRequesting, setDeleteRequesting] = useState(false)
  const [deleteCancelling, setDeleteCancelling] = useState(false)
  const [deleteMotivo, setDeleteMotivo] = useState('')
  const [legalDocs, setLegalDocs] = useState(null)
  const [legalLoading, setLegalLoading] = useState(false)
  const [legalHistory, setLegalHistory] = useState(false)

  useEffect(() => {
    if (profile) {
      setFormData({
        tipo_soggetto: profile.tipo_soggetto || 'persona_fisica',
        ragione_sociale: profile.ragione_sociale || '',
        tipo_societa: profile.tipo_societa || '',
        nome: profile.nome || '',
        cognome: profile.cognome || '',
        data_nascita: profile.data_nascita || '',
        luogo_nascita: profile.luogo_nascita || '',
        codice_fiscale: profile.codice_fiscale || '',
        partita_iva: profile.partita_iva || '',
        email: profile.email || '',
        cellulare: profile.cellulare || '',
        telefono_fisso: profile.telefono_fisso || '',
        pec: profile.pec || '',
        residenza_indirizzo: profile.residenza_indirizzo || '',
        residenza_civico: profile.residenza_civico || '',
        residenza_cap: profile.residenza_cap || '',
        residenza_citta: profile.residenza_citta || '',
        residenza_provincia: profile.residenza_provincia || '',
        residenza_nazione: profile.residenza_nazione || 'Italia',
        domicilio_diverso: profile.domicilio_diverso || false,
        domicilio_indirizzo: profile.domicilio_indirizzo || '',
        domicilio_civico: profile.domicilio_civico || '',
        domicilio_cap: profile.domicilio_cap || '',
        domicilio_citta: profile.domicilio_citta || '',
        domicilio_provincia: profile.domicilio_provincia || '',
        domicilio_nazione: profile.domicilio_nazione || 'Italia',
        professione: profile.professione || '',
        azienda: profile.azienda || '',
        sito_web: profile.sito_web || '',
        avatar_url: profile.avatar_url || null
      })
    }
  }, [profile])

  // Carica documenti legali quando si accede al tab
  useEffect(() => {
    if (activeTab === 'legale' && !legalDocs) {
      setLegalLoading(true)
      fetch('/api/user/legal')
        .then(res => res.ok ? res.json() : null)
        .then(json => { if (json) setLegalDocs(json.data) })
        .catch(() => {})
        .finally(() => setLegalLoading(false))
    }
  }, [activeTab, legalDocs])

  // Carica valutazioni e info HPA quando si accede al tab
  useEffect(() => {
    if (activeTab !== 'valutazioni') return
    // Carica le mie valutazioni esistenti
    fetch('/api/user/ratings')
      .then(r => r.json())
      .then(d => {
        const bRating = (d.ratings || []).find(r => r.target_type === 'beautyx')
        const hRating = (d.ratings || []).find(r => r.target_type === 'hpa')
        setMyRatings({ beautyx: bRating || null, hpa: hRating || null })
        setRatingDraft({
          beautyx: { rating: bRating?.rating || 0, review: bRating?.review || '' },
          hpa: { rating: hRating?.rating || 0, review: hRating?.review || '' }
        })
      })
      .catch(() => {})
    // Carica info HPA assegnato
    fetch('/api/hpa/mio-hpa')
      .then(r => r.json())
      .then(d => { if (d.hpa) setHpaInfo(d.hpa) })
      .catch(() => {})
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [activeTab])

  function handleChange(field, value) {
    setFormData(prev => ({ ...prev, [field]: value }))
  }

  async function handleSaveRating(type) {
    const draft = ratingDraft[type]
    if (!draft.rating) return
    setRatingSaving(prev => ({ ...prev, [type]: true }))
    setRatingMsg(prev => ({ ...prev, [type]: null }))
    try {
      const body = {
        target_type: type,
        rating: draft.rating,
        review: draft.review,
        centro_id: centroId || null
      }
      if (type === 'hpa' && hpaInfo) {
        body.target_id = hpaInfo.id
        body.target_name = hpaInfo.nome ? `${hpaInfo.nome} ${hpaInfo.cognome || ''}`.trim() : hpaInfo.email
      }
      const res = await fetch('/api/user/ratings', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body)
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error)
      setMyRatings(prev => ({ ...prev, [type]: data.rating }))
      setRatingMsg(prev => ({ ...prev, [type]: { type: 'success', text: 'Valutazione salvata!' } }))
      setTimeout(() => setRatingMsg(prev => ({ ...prev, [type]: null })), 3000)
    } catch (err) {
      setRatingMsg(prev => ({ ...prev, [type]: { type: 'error', text: err.message } }))
    } finally {
      setRatingSaving(prev => ({ ...prev, [type]: false }))
    }
  }

  async function handleSave(e) {
    e.preventDefault()
    setSaving(true)
    setMessage(null)

    try {
      const updateData = { ...formData }
      delete updateData.email // Non modificabile

      const { error } = await supabase
        .from('user_profiles')
        .update(updateData)
        .eq('id', user.id)

      if (error) throw error

      setMessage({ type: 'success', text: 'Profilo aggiornato con successo!' })
    } catch (error) {
      console.error('Errore salvataggio:', error)
      setMessage({ type: 'error', text: `Errore: ${error.message}` })
    } finally {
      setSaving(false)
    }
  }

  const deleteInfo = profile?.cancellazione_richiesta_il ? {
    richiesta_il: profile.cancellazione_richiesta_il,
    effettiva_il: profile.cancellazione_effettiva_il,
    motivo: profile.cancellazione_motivo
  } : null

  const handleRequestDeletion = async () => {
    if (!confirm('Sei sicuro di voler richiedere l\'eliminazione del tuo account?')) return
    setDeleteRequesting(true)
    try {
      const res = await fetch('/api/user/delete-account', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ motivo: deleteMotivo || 'Richiesta dall\'utente' })
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error)
      setMessage({ type: 'success', text: `Richiesta registrata. Il tuo account verrà eliminato il ${new Date(data.cancellazione_effettiva_il).toLocaleDateString('it-IT')}. Hai ancora ${data.giorni_rimanenti} giorni di accesso.` })
      // Ricarica profilo per mostrare stato aggiornato
      window.location.reload()
    } catch (error) {
      setMessage({ type: 'error', text: error.message })
    } finally {
      setDeleteRequesting(false)
    }
  }

  const handleCancelDeletion = async () => {
    setDeleteCancelling(true)
    try {
      const res = await fetch('/api/user/delete-account', { method: 'DELETE' })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error)
      setMessage({ type: 'success', text: 'Richiesta di eliminazione annullata.' })
      window.location.reload()
    } catch (error) {
      setMessage({ type: 'error', text: error.message })
    } finally {
      setDeleteCancelling(false)
    }
  }

  const tabs = [
    { id: 'centro', label: 'Il mio centro', icon: '🏢', highlight: primoAccesso && !centroId },
    { id: 'personali', label: 'Dati Personali', icon: '👤' },
    { id: 'recapiti', label: 'Recapiti', icon: '📞' },
    { id: 'residenza', label: 'Residenza', icon: '🏠' },
    { id: 'professionale', label: 'Professionale', icon: '💼' },
    { id: 'abbonamento', label: 'Abbonamento', icon: '💎', isLink: true, href: '/impostazioni/abbonamento' },
    { id: 'legale', label: 'Documenti Legali', icon: '📜' },
    { id: 'valutazioni', label: 'Valutazioni', icon: '⭐' },
    { id: 'elimina', label: 'Elimina Account', icon: '🗑️' }
  ]

  const handleCreaCentro = async () => {
    if (!centroDraft.nome.trim()) {
      setCentroMessage({ type: 'error', text: 'Il nome del centro è obbligatorio' })
      return
    }
    setCentroSaving(true)
    setCentroMessage(null)
    try {
      const res = await fetch('/api/onboarding/create-centro', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(centroDraft)
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error)
      setCentroMessage({ type: 'success', text: 'Centro creato! La pagina si aggiornerà.' })
      // Ricarica per aggiornare centroId nel context
      setTimeout(() => window.location.href = '/', 1500)
    } catch (err) {
      setCentroMessage({ type: 'error', text: err.message })
    } finally {
      setCentroSaving(false)
    }
  }

  if (authLoading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-800 via-slate-900 to-slate-800 flex items-center justify-center">
        <div className="text-center">
          <div className="w-12 h-12 border-4 border-teal-500 border-t-transparent rounded-full animate-spin mx-auto"></div>
          <p className="mt-4 text-slate-400">Caricamento...</p>
        </div>
      </div>
    )
  }

  // Se profilo bloccato
  if (profile?.profilo_bloccato) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-800 via-slate-900 to-slate-800 flex items-center justify-center p-4">
        <div className="max-w-lg w-full bg-red-900/30 border border-red-500/50 rounded-xl p-8 text-center">
          <div className="text-6xl mb-4">🔒</div>
          <h1 className="text-2xl font-bold text-red-400 mb-4">Profilo Bloccato</h1>
          <p className="text-slate-300 mb-4">
            Il tuo profilo è stato bloccato per il seguente motivo:
          </p>
          <p className="text-red-300 font-medium bg-red-950/50 rounded-lg p-3 mb-6">
            {profile.profilo_bloccato_motivo === 'documento_scaduto'
              ? 'Documento d\'identità scaduto'
              : profile.profilo_bloccato_motivo || 'Motivo non specificato'}
          </p>
          <p className="text-slate-400 text-sm">
            Contatta l'amministratore di sistema per richiedere lo sblocco del profilo.
          </p>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-800 via-slate-900 to-slate-800">
      <div className="max-w-4xl mx-auto px-4 py-8">
        <h1 className="text-2xl font-bold text-white mb-2">Impostazioni Profilo</h1>
        <p className="text-slate-400 mb-6">Gestisci i tuoi dati personali e le informazioni del tuo account</p>

        {/* Tabs */}
        <div className="flex gap-2 mb-6 overflow-x-auto pb-2">
          {tabs.map(tab => tab.isLink ? (
            <a
              key={tab.id}
              href={tab.href}
              className="flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium whitespace-nowrap transition-all bg-slate-700/50 text-slate-400 hover:text-white hover:bg-slate-600/50"
            >
              <span>{tab.icon}</span>
              {tab.label}
              <svg className="w-3.5 h-3.5 opacity-50" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" /></svg>
            </a>
          ) : (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium whitespace-nowrap transition-all relative ${
                activeTab === tab.id
                  ? 'bg-teal-600 text-white'
                  : 'bg-slate-700/50 text-slate-400 hover:text-white hover:bg-slate-600/50'
              }`}
            >
              <span>{tab.icon}</span>
              {tab.label}
              {tab.alert && (
                <span className="absolute -top-1 -right-1 w-3 h-3 bg-amber-500 rounded-full animate-pulse"></span>
              )}
              {tab.highlight && (
                <span className="absolute -top-1 -right-1 w-3 h-3 bg-teal-400 rounded-full animate-pulse"></span>
              )}
            </button>
          ))}
        </div>

        {/* Form */}
        <form onSubmit={handleSave}>
          <div className="bg-slate-800/60 rounded-xl p-6 border border-slate-700/50">

            {/* TAB: Il mio centro */}
            {activeTab === 'centro' && (
              <div className="space-y-6">
                {centroId ? (
                  <div className="text-center py-8">
                    <div className="text-4xl mb-3">🏢</div>
                    <p className="text-white font-medium mb-1">Centro già configurato</p>
                    <p className="text-slate-400 text-sm">Il tuo centro è attivo. Per modificare i dati del centro usa il pannello impostazioni del centro.</p>
                  </div>
                ) : (
                  <div>
                    {primoAccesso && (
                      <div className="bg-teal-500/10 border border-teal-500/30 rounded-lg p-4 mb-6">
                        <p className="text-teal-300 font-medium mb-1">Benvenuto in BeautyX!</p>
                        <p className="text-slate-400 text-sm">Per iniziare, crea il tuo primo centro estetico. Potrai configurare tutti i dettagli in seguito.</p>
                      </div>
                    )}
                    <h3 className="text-white font-semibold mb-4">Crea il tuo centro estetico</h3>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <div className="md:col-span-2">
                        <label className="block text-sm font-medium text-slate-300 mb-1">Nome centro <span className="text-red-400">*</span></label>
                        <input
                          type="text"
                          value={centroDraft.nome}
                          onChange={e => setCentroDraft(p => ({ ...p, nome: e.target.value }))}
                          placeholder="Es: Centro Estetico Bella"
                          className="w-full bg-slate-700 border border-slate-600 rounded-lg px-3 py-2 text-white placeholder-slate-500 focus:outline-none focus:border-teal-500"
                        />
                      </div>
                      <div>
                        <label className="block text-sm font-medium text-slate-300 mb-1">Email</label>
                        <input
                          type="email"
                          value={centroDraft.email}
                          onChange={e => setCentroDraft(p => ({ ...p, email: e.target.value }))}
                          placeholder="info@centrobeauty.it"
                          className="w-full bg-slate-700 border border-slate-600 rounded-lg px-3 py-2 text-white placeholder-slate-500 focus:outline-none focus:border-teal-500"
                        />
                      </div>
                      <div>
                        <label className="block text-sm font-medium text-slate-300 mb-1">Telefono</label>
                        <input
                          type="tel"
                          value={centroDraft.telefono}
                          onChange={e => setCentroDraft(p => ({ ...p, telefono: e.target.value }))}
                          placeholder="02 1234567"
                          className="w-full bg-slate-700 border border-slate-600 rounded-lg px-3 py-2 text-white placeholder-slate-500 focus:outline-none focus:border-teal-500"
                        />
                      </div>
                      <div className="md:col-span-2">
                        <label className="block text-sm font-medium text-slate-300 mb-1">Indirizzo</label>
                        <input
                          type="text"
                          value={centroDraft.indirizzo}
                          onChange={e => setCentroDraft(p => ({ ...p, indirizzo: e.target.value }))}
                          placeholder="Via Roma 1"
                          className="w-full bg-slate-700 border border-slate-600 rounded-lg px-3 py-2 text-white placeholder-slate-500 focus:outline-none focus:border-teal-500"
                        />
                      </div>
                      <div>
                        <label className="block text-sm font-medium text-slate-300 mb-1">Città</label>
                        <input
                          type="text"
                          value={centroDraft.citta}
                          onChange={e => setCentroDraft(p => ({ ...p, citta: e.target.value }))}
                          placeholder="Milano"
                          className="w-full bg-slate-700 border border-slate-600 rounded-lg px-3 py-2 text-white placeholder-slate-500 focus:outline-none focus:border-teal-500"
                        />
                      </div>
                      <div>
                        <label className="block text-sm font-medium text-slate-300 mb-1">CAP</label>
                        <input
                          type="text"
                          value={centroDraft.cap}
                          onChange={e => setCentroDraft(p => ({ ...p, cap: e.target.value }))}
                          placeholder="20100"
                          className="w-full bg-slate-700 border border-slate-600 rounded-lg px-3 py-2 text-white placeholder-slate-500 focus:outline-none focus:border-teal-500"
                        />
                      </div>
                      <div>
                        <label className="block text-sm font-medium text-slate-300 mb-1">Partita IVA</label>
                        <input
                          type="text"
                          value={centroDraft.partita_iva}
                          onChange={e => setCentroDraft(p => ({ ...p, partita_iva: e.target.value }))}
                          placeholder="IT12345678901"
                          className="w-full bg-slate-700 border border-slate-600 rounded-lg px-3 py-2 text-white placeholder-slate-500 focus:outline-none focus:border-teal-500"
                        />
                      </div>
                    </div>

                    {centroMessage && (
                      <div className={`mt-4 p-3 rounded-lg text-sm ${centroMessage.type === 'success' ? 'bg-teal-500/20 text-teal-300' : 'bg-red-500/20 text-red-300'}`}>
                        {centroMessage.text}
                      </div>
                    )}

                    <div className="flex items-center gap-3 mt-6">
                      <button
                        type="button"
                        onClick={handleCreaCentro}
                        disabled={centroSaving}
                        className="px-6 py-2.5 bg-teal-600 hover:bg-teal-500 disabled:opacity-50 text-white rounded-lg font-medium transition-colors"
                      >
                        {centroSaving ? 'Creazione...' : 'Crea centro'}
                      </button>
                      <button
                        type="button"
                        onClick={signOut}
                        className="px-4 py-2.5 bg-slate-700 hover:bg-slate-600 text-slate-300 rounded-lg text-sm transition-colors"
                      >
                        Esci e cambia account
                      </button>
                    </div>
                  </div>
                )}
              </div>
            )}

            {/* TAB: Dati Personali */}
            {activeTab === 'personali' && (
              <div className="space-y-6">
                {/* Tipo soggetto */}
                <div>
                  <label className="block text-sm font-medium text-slate-300 mb-2">Tipo Soggetto</label>
                  <div className="flex gap-4">
                    <label className="flex items-center gap-2 cursor-pointer">
                      <input
                        type="radio"
                        name="tipo_soggetto"
                        value="persona_fisica"
                        checked={formData.tipo_soggetto === 'persona_fisica'}
                        onChange={(e) => handleChange('tipo_soggetto', e.target.value)}
                        className="text-teal-500 focus:ring-teal-500"
                      />
                      <span className="text-slate-300">Persona Fisica</span>
                    </label>
                    <label className="flex items-center gap-2 cursor-pointer">
                      <input
                        type="radio"
                        name="tipo_soggetto"
                        value="societa"
                        checked={formData.tipo_soggetto === 'societa'}
                        onChange={(e) => handleChange('tipo_soggetto', e.target.value)}
                        className="text-teal-500 focus:ring-teal-500"
                      />
                      <span className="text-slate-300">Società</span>
                    </label>
                  </div>
                </div>

                {/* Campi società */}
                {formData.tipo_soggetto === 'societa' && (
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4 p-4 bg-slate-900/50 rounded-lg border border-slate-600/50">
                    <div className="md:col-span-2">
                      <label className="block text-sm font-medium text-slate-300 mb-1">Ragione Sociale *</label>
                      <input
                        type="text"
                        value={formData.ragione_sociale}
                        onChange={(e) => handleChange('ragione_sociale', e.target.value)}
                        className="w-full px-3 py-2 bg-slate-700/50 border border-slate-600 rounded-lg text-white focus:ring-2 focus:ring-teal-500"
                        required={formData.tipo_soggetto === 'societa'}
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-slate-300 mb-1">Tipo Società</label>
                      <select
                        value={formData.tipo_societa}
                        onChange={(e) => handleChange('tipo_societa', e.target.value)}
                        className="w-full px-3 py-2 bg-slate-700/50 border border-slate-600 rounded-lg text-white focus:ring-2 focus:ring-teal-500"
                      >
                        <option value="">Seleziona...</option>
                        {TIPI_SOCIETA.map(t => (
                          <option key={t.value} value={t.value}>{t.label}</option>
                        ))}
                      </select>
                    </div>
                  </div>
                )}

                {/* Dati anagrafici */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-slate-300 mb-1">Nome *</label>
                    <input
                      type="text"
                      value={formData.nome}
                      onChange={(e) => handleChange('nome', e.target.value)}
                      className="w-full px-3 py-2 bg-slate-700/50 border border-slate-600 rounded-lg text-white focus:ring-2 focus:ring-teal-500"
                      required
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-slate-300 mb-1">Cognome *</label>
                    <input
                      type="text"
                      value={formData.cognome}
                      onChange={(e) => handleChange('cognome', e.target.value)}
                      className="w-full px-3 py-2 bg-slate-700/50 border border-slate-600 rounded-lg text-white focus:ring-2 focus:ring-teal-500"
                      required
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-slate-300 mb-1">Data di Nascita</label>
                    <input
                      type="date"
                      value={formData.data_nascita}
                      onChange={(e) => handleChange('data_nascita', e.target.value)}
                      className="w-full px-3 py-2 bg-slate-700/50 border border-slate-600 rounded-lg text-white focus:ring-2 focus:ring-teal-500"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-slate-300 mb-1">Luogo di Nascita</label>
                    <input
                      type="text"
                      value={formData.luogo_nascita}
                      onChange={(e) => handleChange('luogo_nascita', e.target.value)}
                      className="w-full px-3 py-2 bg-slate-700/50 border border-slate-600 rounded-lg text-white focus:ring-2 focus:ring-teal-500"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-slate-300 mb-1">Codice Fiscale</label>
                    <input
                      type="text"
                      value={formData.codice_fiscale}
                      onChange={(e) => handleChange('codice_fiscale', e.target.value.toUpperCase())}
                      maxLength={16}
                      className="w-full px-3 py-2 bg-slate-700/50 border border-slate-600 rounded-lg text-white uppercase focus:ring-2 focus:ring-teal-500"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-slate-300 mb-1">Partita IVA</label>
                    <input
                      type="text"
                      value={formData.partita_iva}
                      onChange={(e) => handleChange('partita_iva', e.target.value.replace(/\D/g, ''))}
                      maxLength={11}
                      className="w-full px-3 py-2 bg-slate-700/50 border border-slate-600 rounded-lg text-white focus:ring-2 focus:ring-teal-500"
                    />
                  </div>
                </div>
              </div>
            )}

            {/* TAB: Recapiti */}
            {activeTab === 'recapiti' && (
              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-slate-300 mb-1">Email</label>
                  <input
                    type="email"
                    value={formData.email}
                    disabled
                    className="w-full px-3 py-2 bg-slate-900/50 border border-slate-700 rounded-lg text-slate-400 cursor-not-allowed"
                  />
                  <p className="text-xs text-slate-500 mt-1">L'email non può essere modificata</p>
                </div>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-slate-300 mb-1">Cellulare</label>
                    <input
                      type="tel"
                      value={formData.cellulare}
                      onChange={(e) => handleChange('cellulare', e.target.value)}
                      placeholder="+39 333 1234567"
                      className="w-full px-3 py-2 bg-slate-700/50 border border-slate-600 rounded-lg text-white focus:ring-2 focus:ring-teal-500"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-slate-300 mb-1">Telefono Fisso</label>
                    <input
                      type="tel"
                      value={formData.telefono_fisso}
                      onChange={(e) => handleChange('telefono_fisso', e.target.value)}
                      placeholder="06 12345678"
                      className="w-full px-3 py-2 bg-slate-700/50 border border-slate-600 rounded-lg text-white focus:ring-2 focus:ring-teal-500"
                    />
                  </div>
                </div>
                <div>
                  <label className="block text-sm font-medium text-slate-300 mb-1">PEC</label>
                  <input
                    type="email"
                    value={formData.pec}
                    onChange={(e) => handleChange('pec', e.target.value)}
                    placeholder="tuaemail@pec.it"
                    className="w-full px-3 py-2 bg-slate-700/50 border border-slate-600 rounded-lg text-white focus:ring-2 focus:ring-teal-500"
                  />
                </div>
              </div>
            )}

            {/* TAB: Residenza */}
            {activeTab === 'residenza' && (
              <div className="space-y-6">
                {/* Residenza */}
                <div>
                  <h3 className="text-lg font-semibold text-white mb-4">Residenza</h3>
                  <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                    <div className="md:col-span-3">
                      <label className="block text-sm font-medium text-slate-300 mb-1">Indirizzo</label>
                      <input
                        type="text"
                        value={formData.residenza_indirizzo}
                        onChange={(e) => handleChange('residenza_indirizzo', e.target.value)}
                        placeholder="Via Roma"
                        className="w-full px-3 py-2 bg-slate-700/50 border border-slate-600 rounded-lg text-white focus:ring-2 focus:ring-teal-500"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-slate-300 mb-1">Civico</label>
                      <input
                        type="text"
                        value={formData.residenza_civico}
                        onChange={(e) => handleChange('residenza_civico', e.target.value)}
                        placeholder="1/A"
                        className="w-full px-3 py-2 bg-slate-700/50 border border-slate-600 rounded-lg text-white focus:ring-2 focus:ring-teal-500"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-slate-300 mb-1">CAP</label>
                      <input
                        type="text"
                        value={formData.residenza_cap}
                        onChange={(e) => handleChange('residenza_cap', e.target.value.replace(/\D/g, ''))}
                        maxLength={5}
                        placeholder="00100"
                        className="w-full px-3 py-2 bg-slate-700/50 border border-slate-600 rounded-lg text-white focus:ring-2 focus:ring-teal-500"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-slate-300 mb-1">Città</label>
                      <input
                        type="text"
                        value={formData.residenza_citta}
                        onChange={(e) => handleChange('residenza_citta', e.target.value)}
                        placeholder="Roma"
                        className="w-full px-3 py-2 bg-slate-700/50 border border-slate-600 rounded-lg text-white focus:ring-2 focus:ring-teal-500"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-slate-300 mb-1">Provincia</label>
                      <select
                        value={formData.residenza_provincia}
                        onChange={(e) => handleChange('residenza_provincia', e.target.value)}
                        className="w-full px-3 py-2 bg-slate-700/50 border border-slate-600 rounded-lg text-white focus:ring-2 focus:ring-teal-500"
                      >
                        <option value="">--</option>
                        {PROVINCE_ITALIANE.map(p => (
                          <option key={p} value={p}>{p}</option>
                        ))}
                      </select>
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-slate-300 mb-1">Nazione</label>
                      <input
                        type="text"
                        value={formData.residenza_nazione}
                        onChange={(e) => handleChange('residenza_nazione', e.target.value)}
                        className="w-full px-3 py-2 bg-slate-700/50 border border-slate-600 rounded-lg text-white focus:ring-2 focus:ring-teal-500"
                      />
                    </div>
                  </div>
                </div>

                {/* Domicilio */}
                <div>
                  <label className="flex items-center gap-2 cursor-pointer mb-4">
                    <input
                      type="checkbox"
                      checked={formData.domicilio_diverso}
                      onChange={(e) => handleChange('domicilio_diverso', e.target.checked)}
                      className="text-teal-500 focus:ring-teal-500 rounded"
                    />
                    <span className="text-slate-300">Il domicilio è diverso dalla residenza</span>
                  </label>

                  {formData.domicilio_diverso && (
                    <div className="p-4 bg-slate-900/50 rounded-lg border border-slate-600/50">
                      <h3 className="text-lg font-semibold text-white mb-4">Domicilio</h3>
                      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                        <div className="md:col-span-3">
                          <label className="block text-sm font-medium text-slate-300 mb-1">Indirizzo</label>
                          <input
                            type="text"
                            value={formData.domicilio_indirizzo}
                            onChange={(e) => handleChange('domicilio_indirizzo', e.target.value)}
                            className="w-full px-3 py-2 bg-slate-700/50 border border-slate-600 rounded-lg text-white focus:ring-2 focus:ring-teal-500"
                          />
                        </div>
                        <div>
                          <label className="block text-sm font-medium text-slate-300 mb-1">Civico</label>
                          <input
                            type="text"
                            value={formData.domicilio_civico}
                            onChange={(e) => handleChange('domicilio_civico', e.target.value)}
                            className="w-full px-3 py-2 bg-slate-700/50 border border-slate-600 rounded-lg text-white focus:ring-2 focus:ring-teal-500"
                          />
                        </div>
                        <div>
                          <label className="block text-sm font-medium text-slate-300 mb-1">CAP</label>
                          <input
                            type="text"
                            value={formData.domicilio_cap}
                            onChange={(e) => handleChange('domicilio_cap', e.target.value.replace(/\D/g, ''))}
                            maxLength={5}
                            className="w-full px-3 py-2 bg-slate-700/50 border border-slate-600 rounded-lg text-white focus:ring-2 focus:ring-teal-500"
                          />
                        </div>
                        <div>
                          <label className="block text-sm font-medium text-slate-300 mb-1">Città</label>
                          <input
                            type="text"
                            value={formData.domicilio_citta}
                            onChange={(e) => handleChange('domicilio_citta', e.target.value)}
                            className="w-full px-3 py-2 bg-slate-700/50 border border-slate-600 rounded-lg text-white focus:ring-2 focus:ring-teal-500"
                          />
                        </div>
                        <div>
                          <label className="block text-sm font-medium text-slate-300 mb-1">Provincia</label>
                          <select
                            value={formData.domicilio_provincia}
                            onChange={(e) => handleChange('domicilio_provincia', e.target.value)}
                            className="w-full px-3 py-2 bg-slate-700/50 border border-slate-600 rounded-lg text-white focus:ring-2 focus:ring-teal-500"
                          >
                            <option value="">--</option>
                            {PROVINCE_ITALIANE.map(p => (
                              <option key={p} value={p}>{p}</option>
                            ))}
                          </select>
                        </div>
                        <div>
                          <label className="block text-sm font-medium text-slate-300 mb-1">Nazione</label>
                          <input
                            type="text"
                            value={formData.domicilio_nazione}
                            onChange={(e) => handleChange('domicilio_nazione', e.target.value)}
                            className="w-full px-3 py-2 bg-slate-700/50 border border-slate-600 rounded-lg text-white focus:ring-2 focus:ring-teal-500"
                          />
                        </div>
                      </div>
                    </div>
                  )}
                </div>
              </div>
            )}

            {/* TAB: Professionale */}
            {activeTab === 'professionale' && (
              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-slate-300 mb-1">Professione</label>
                  <input
                    type="text"
                    value={formData.professione}
                    onChange={(e) => handleChange('professione', e.target.value)}
                    placeholder="Es: Estetista, Titolare Centro Estetico"
                    className="w-full px-3 py-2 bg-slate-700/50 border border-slate-600 rounded-lg text-white focus:ring-2 focus:ring-teal-500"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-slate-300 mb-1">Azienda / Centro</label>
                  <input
                    type="text"
                    value={formData.azienda}
                    onChange={(e) => handleChange('azienda', e.target.value)}
                    className="w-full px-3 py-2 bg-slate-700/50 border border-slate-600 rounded-lg text-white focus:ring-2 focus:ring-teal-500"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-slate-300 mb-1">Sito Web</label>
                  <input
                    type="url"
                    value={formData.sito_web}
                    onChange={(e) => handleChange('sito_web', e.target.value)}
                    placeholder="https://www.tuosito.it"
                    className="w-full px-3 py-2 bg-slate-700/50 border border-slate-600 rounded-lg text-white focus:ring-2 focus:ring-teal-500"
                  />
                </div>

                {/* Sezione foto profilo - solo per HPA */}
                {profile?.ruolo_livello === 'hpa' && (
                  <div className="pt-4 border-t border-slate-700">
                    <h3 className="text-sm font-medium text-slate-300 mb-1">Foto Profilo HPA</h3>
                    <p className="text-xs text-slate-500 mb-4">
                      Questa foto apparirà nell&apos;icona della chat quando i clienti comunicano con te.
                    </p>
                    <div className="flex items-center gap-6">
                      {/* Anteprima */}
                      <div className="w-24 h-24 rounded-full overflow-hidden bg-gradient-to-br from-purple-500 to-pink-500 flex items-center justify-center flex-shrink-0">
                        {formData.avatar_url ? (
                          <img src={formData.avatar_url} alt="Foto profilo" className="w-full h-full object-cover" />
                        ) : (
                          <span className="text-4xl">👤</span>
                        )}
                      </div>
                      <div className="flex flex-col gap-2">
                        <label className="cursor-pointer">
                          <input
                            type="file"
                            accept="image/png,image/jpeg,image/jpg,image/webp"
                            className="hidden"
                            disabled={avatarUploading}
                            onChange={async (e) => {
                              const file = e.target.files[0]
                              if (!file) return
                              setAvatarUploading(true)
                              setMessage(null)
                              try {
                                const fd = new FormData()
                                fd.append('file', file)
                                const res = await fetch('/api/user/upload-avatar', { method: 'PUT', body: fd })
                                const data = await res.json()
                                if (!res.ok) throw new Error(data.error)
                                handleChange('avatar_url', data.avatar_url)
                                setMessage({ type: 'success', text: 'Foto profilo aggiornata!' })
                              } catch (err) {
                                setMessage({ type: 'error', text: err.message })
                              } finally {
                                setAvatarUploading(false)
                              }
                            }}
                          />
                          <span className={`inline-block px-4 py-2 rounded-lg text-sm font-medium text-white transition-colors ${
                            avatarUploading
                              ? 'bg-slate-600 cursor-not-allowed'
                              : 'bg-purple-600 hover:bg-purple-700 cursor-pointer'
                          }`}>
                            {avatarUploading ? 'Caricamento...' : 'Carica foto'}
                          </span>
                        </label>
                        {formData.avatar_url && (
                          <button
                            onClick={async () => {
                              setAvatarUploading(true)
                              try {
                                await fetch('/api/user/upload-avatar', { method: 'DELETE' })
                                handleChange('avatar_url', null)
                                setMessage({ type: 'success', text: 'Foto rimossa.' })
                              } catch {
                                setMessage({ type: 'error', text: 'Errore rimozione foto.' })
                              } finally {
                                setAvatarUploading(false)
                              }
                            }}
                            disabled={avatarUploading}
                            className="text-xs text-red-400 hover:text-red-300 transition-colors disabled:opacity-50"
                          >
                            Rimuovi foto
                          </button>
                        )}
                        <p className="text-xs text-slate-500">PNG, JPG, WebP — max 5MB</p>
                      </div>
                    </div>
                  </div>
                )}

                {/* Info ruolo */}
                <div className="pt-4 border-t border-slate-700">
                  <h3 className="text-sm font-medium text-slate-300 mb-3">Informazioni Account</h3>
                  <div className="grid grid-cols-2 gap-4 text-sm">
                    <div>
                      <span className="text-slate-400">Ruolo:</span>
                      <span className="ml-2 px-2 py-1 bg-teal-500/20 text-teal-400 rounded text-xs font-medium">
                        {profile?.ruolo_livello || profile?.ruolo || 'Utente'}
                      </span>
                    </div>
                    <div>
                      <span className="text-slate-400">Piano:</span>
                      <span className="ml-2 px-2 py-1 bg-purple-500/20 text-purple-400 rounded text-xs font-medium">
                        {profile?.piano || 'Demo'}
                      </span>
                    </div>
                  </div>
                </div>
              </div>
            )}

            {/* Message */}
            {message && (
              <div className={`mt-6 p-3 rounded-lg text-sm ${
                message.type === 'success'
                  ? 'bg-green-500/20 text-green-400 border border-green-500/30'
                  : 'bg-red-500/20 text-red-400 border border-red-500/30'
              }`}>
                {message.text}
              </div>
            )}

            {/* TAB: Documenti Legali */}
            {activeTab === 'legale' && (
              <div className="space-y-6">
                <h3 className="text-lg font-semibold text-white">Documenti Legali</h3>
                {legalLoading ? (
                  <div className="text-center py-8">
                    <div className="w-8 h-8 border-4 border-teal-500 border-t-transparent rounded-full animate-spin mx-auto" />
                  </div>
                ) : legalDocs?.documents?.length > 0 ? (
                  <div className="space-y-4">
                    {legalDocs.documents.map(doc => (
                      <div key={doc.document_id} className="bg-slate-800/50 rounded-xl border border-slate-700/50 p-5">
                        <div className="flex items-center justify-between mb-3">
                          <div>
                            <h4 className="text-white font-medium">{doc.titolo}</h4>
                            <p className="text-xs text-slate-400">
                              Versione {doc.versione} - Pubblicato il {new Date(doc.pubblicato_il).toLocaleDateString('it-IT')}
                            </p>
                          </div>
                          {doc.stato === 'accettato' ? (
                            <span className="flex items-center gap-1.5 px-3 py-1 rounded-full text-xs bg-green-500/20 text-green-400 border border-green-500/40">
                              <span className="w-2 h-2 rounded-full bg-green-400" />
                              Accettato il {new Date(doc.accettato_il).toLocaleDateString('it-IT')}
                            </span>
                          ) : doc.stato === 'scaduto' ? (
                            <span className="flex items-center gap-1.5 px-3 py-1 rounded-full text-xs bg-red-500/20 text-red-400 border border-red-500/40">
                              <span className="w-2 h-2 rounded-full bg-red-400" />
                              Scaduto
                            </span>
                          ) : (
                            <span className="flex items-center gap-1.5 px-3 py-1 rounded-full text-xs bg-amber-500/20 text-amber-400 border border-amber-500/40">
                              <span className="w-2 h-2 rounded-full bg-amber-400 animate-pulse" />
                              Da accettare entro il {new Date(doc.scadenza_accettazione).toLocaleDateString('it-IT')}
                            </span>
                          )}
                        </div>
                        <div className="bg-slate-900/50 rounded-lg p-4 max-h-48 overflow-y-auto text-sm text-slate-300 whitespace-pre-wrap">
                          {doc.contenuto}
                        </div>
                        {doc.note_modifica && (
                          <p className="mt-2 text-xs text-slate-500">Modifiche: {doc.note_modifica}</p>
                        )}
                      </div>
                    ))}
                  </div>
                ) : (
                  <p className="text-slate-400 text-center py-8">Nessun documento legale pubblicato</p>
                )}
              </div>
            )}

            {/* TAB: Valutazioni */}
            {activeTab === 'valutazioni' && (
              <div className="space-y-6">
                <div>
                  <h3 className="text-lg font-semibold text-white">Le tue Valutazioni</h3>
                  <p className="text-sm text-slate-400 mt-1">
                    Il tuo feedback è anonimo e aiuta a migliorare il servizio.
                  </p>
                </div>

                {/* Card Beautyx AI */}
                <div className="bg-gradient-to-br from-teal-900/20 to-slate-800/40 rounded-xl border border-teal-500/20 p-5 space-y-4">
                  <div className="flex items-center gap-3">
                    <div className="w-12 h-12 rounded-full bg-gradient-to-br from-teal-500/20 to-emerald-500/20 border-2 border-teal-500/30 overflow-hidden flex items-center justify-center flex-shrink-0">
                      <img src="/beautyx-avatar.svg" alt="Beautyx" className="w-10 h-10 object-cover" />
                    </div>
                    <div>
                      <p className="text-white font-semibold">Beautyx AI</p>
                      <p className="text-xs text-slate-400">Il tuo assistente virtuale</p>
                    </div>
                    {myRatings.beautyx && (
                      <span className="ml-auto text-xs text-teal-400 bg-teal-500/10 px-2 py-1 rounded-full">
                        Già valutato
                      </span>
                    )}
                  </div>

                  <div>
                    <p className="text-sm text-slate-300 mb-2">Come valuti Beautyx AI?</p>
                    <StarRating
                      value={ratingDraft.beautyx.rating}
                      onChange={(v) => setRatingDraft(prev => ({ ...prev, beautyx: { ...prev.beautyx, rating: v } }))}
                      size="xl"
                      showLabel
                    />
                  </div>

                  <div>
                    <label className="block text-sm text-slate-300 mb-1">Commento (facoltativo)</label>
                    <textarea
                      value={ratingDraft.beautyx.review}
                      onChange={(e) => setRatingDraft(prev => ({ ...prev, beautyx: { ...prev.beautyx, review: e.target.value } }))}
                      rows={3}
                      maxLength={500}
                      placeholder="Raccontaci la tua esperienza con Beautyx AI..."
                      className="w-full px-3 py-2 bg-slate-900/50 border border-slate-600 rounded-lg text-white placeholder-slate-500 text-sm resize-none focus:ring-2 focus:ring-teal-500 focus:border-transparent"
                    />
                    <p className="text-xs text-slate-500 text-right mt-1">{ratingDraft.beautyx.review.length}/500</p>
                  </div>

                  {ratingMsg.beautyx && (
                    <p className={`text-sm ${ratingMsg.beautyx.type === 'success' ? 'text-emerald-400' : 'text-red-400'}`}>
                      {ratingMsg.beautyx.text}
                    </p>
                  )}

                  <button
                    type="button"
                    onClick={() => handleSaveRating('beautyx')}
                    disabled={ratingSaving.beautyx || !ratingDraft.beautyx.rating}
                    className="px-5 py-2 bg-teal-600 hover:bg-teal-500 text-white rounded-lg text-sm font-medium transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    {ratingSaving.beautyx ? 'Salvataggio...' : myRatings.beautyx ? 'Aggiorna valutazione' : 'Invia valutazione'}
                  </button>
                </div>

                {/* Card HPA */}
                {hpaInfo ? (
                  <div className="bg-gradient-to-br from-purple-900/20 to-slate-800/40 rounded-xl border border-purple-500/20 p-5 space-y-4">
                    <div className="flex items-center gap-3">
                      <div className="w-12 h-12 rounded-full bg-gradient-to-br from-purple-500 to-indigo-600 flex items-center justify-center flex-shrink-0 text-white text-lg font-bold">
                        {(hpaInfo.nome || hpaInfo.email || '?')[0]?.toUpperCase()}
                      </div>
                      <div>
                        <p className="text-white font-semibold">
                          {hpaInfo.nome ? `${hpaInfo.nome} ${hpaInfo.cognome || ''}`.trim() : hpaInfo.email}
                        </p>
                        <p className="text-xs text-slate-400">Il tuo consulente HPA</p>
                      </div>
                      {myRatings.hpa && (
                        <span className="ml-auto text-xs text-purple-400 bg-purple-500/10 px-2 py-1 rounded-full">
                          Già valutato
                        </span>
                      )}
                    </div>

                    <div>
                      <p className="text-sm text-slate-300 mb-2">Come valuti il tuo consulente?</p>
                      <StarRating
                        value={ratingDraft.hpa.rating}
                        onChange={(v) => setRatingDraft(prev => ({ ...prev, hpa: { ...prev.hpa, rating: v } }))}
                        size="xl"
                        showLabel
                      />
                    </div>

                    <div>
                      <label className="block text-sm text-slate-300 mb-1">Commento (facoltativo)</label>
                      <textarea
                        value={ratingDraft.hpa.review}
                        onChange={(e) => setRatingDraft(prev => ({ ...prev, hpa: { ...prev.hpa, review: e.target.value } }))}
                        rows={3}
                        maxLength={500}
                        placeholder="Come ti ha aiutato il tuo consulente?"
                        className="w-full px-3 py-2 bg-slate-900/50 border border-slate-600 rounded-lg text-white placeholder-slate-500 text-sm resize-none focus:ring-2 focus:ring-purple-500 focus:border-transparent"
                      />
                      <p className="text-xs text-slate-500 text-right mt-1">{ratingDraft.hpa.review.length}/500</p>
                    </div>

                    {ratingMsg.hpa && (
                      <p className={`text-sm ${ratingMsg.hpa.type === 'success' ? 'text-emerald-400' : 'text-red-400'}`}>
                        {ratingMsg.hpa.text}
                      </p>
                    )}

                    <button
                      type="button"
                      onClick={() => handleSaveRating('hpa')}
                      disabled={ratingSaving.hpa || !ratingDraft.hpa.rating}
                      className="px-5 py-2 bg-purple-600 hover:bg-purple-500 text-white rounded-lg text-sm font-medium transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                      {ratingSaving.hpa ? 'Salvataggio...' : myRatings.hpa ? 'Aggiorna valutazione' : 'Invia valutazione'}
                    </button>
                  </div>
                ) : (
                  <div className="bg-slate-800/30 border border-dashed border-slate-700 rounded-xl p-6 text-center">
                    <p className="text-slate-500 text-sm">Non hai ancora un consulente HPA assegnato</p>
                  </div>
                )}
              </div>
            )}

            {/* TAB: Elimina Account */}
            {activeTab === 'elimina' && (
              <div className="space-y-6">
                <h3 className="text-lg font-semibold text-red-400">Eliminazione Account</h3>

                {deleteInfo ? (
                  <div className="bg-red-900/20 border border-red-500/30 rounded-xl p-6 space-y-4">
                    <p className="text-slate-300">
                      Hai richiesto l&apos;eliminazione del tuo account il{' '}
                      <span className="text-white font-medium">
                        {new Date(deleteInfo.richiesta_il).toLocaleDateString('it-IT')}
                      </span>
                    </p>
                    <p className="text-slate-300">
                      Il tuo account verrà eliminato il{' '}
                      <span className="text-red-400 font-medium">
                        {new Date(deleteInfo.effettiva_il).toLocaleDateString('it-IT')}
                      </span>
                    </p>
                    {deleteInfo.motivo && (
                      <p className="text-sm text-slate-400">
                        Motivo: {deleteInfo.motivo}
                      </p>
                    )}
                    <p className="text-sm text-slate-400">
                      Fino a quella data potrai continuare ad utilizzare il servizio.
                      Puoi annullare la richiesta in qualsiasi momento prima della data di eliminazione.
                    </p>
                    <button
                      type="button"
                      onClick={handleCancelDeletion}
                      disabled={deleteCancelling}
                      className="px-4 py-2 bg-teal-500 text-white rounded-lg hover:bg-teal-600 transition-colors disabled:opacity-50"
                    >
                      {deleteCancelling ? 'Annullamento...' : 'Annulla Richiesta di Eliminazione'}
                    </button>
                  </div>
                ) : (
                  <div className="space-y-6">
                    <div className="bg-amber-900/20 border border-amber-500/30 rounded-xl p-4">
                      <p className="text-amber-300 text-sm">
                        Attenzione: questa azione è irreversibile. Se hai un abbonamento attivo,
                        il tuo account resterà accessibile fino alla scadenza dell&apos;abbonamento.
                        Dopo la data di eliminazione, tutti i tuoi dati verranno rimossi permanentemente.
                      </p>
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-slate-300 mb-1">
                        Motivo (facoltativo)
                      </label>
                      <textarea
                        value={deleteMotivo}
                        onChange={(e) => setDeleteMotivo(e.target.value)}
                        rows={3}
                        placeholder="Dicci perché vuoi eliminare il tuo account..."
                        className="w-full px-3 py-2 bg-slate-700/50 border border-slate-600 rounded-lg text-white placeholder-slate-500 focus:ring-2 focus:ring-red-500 focus:border-transparent"
                      />
                    </div>

                    <button
                      type="button"
                      onClick={handleRequestDeletion}
                      disabled={deleteRequesting}
                      className="px-6 py-2 bg-red-500 text-white rounded-lg hover:bg-red-600 transition-colors disabled:opacity-50"
                    >
                      {deleteRequesting ? 'Elaborazione...' : 'Richiedi Eliminazione Account'}
                    </button>
                  </div>
                )}
              </div>
            )}

            {/* Submit (solo per tab di modifica dati) */}
            {activeTab !== 'elimina' && activeTab !== 'valutazioni' && (
              <div className="flex justify-end pt-6 mt-6 border-t border-slate-700">
                <button
                  type="submit"
                  disabled={saving}
                  className="px-6 py-2 bg-gradient-to-r from-teal-600 to-cyan-600 hover:from-teal-500 hover:to-cyan-500 text-white rounded-lg font-medium disabled:opacity-50 disabled:cursor-not-allowed transition-all"
                >
                  {saving ? 'Salvataggio...' : 'Salva Modifiche'}
                </button>
              </div>
            )}
          </div>
        </form>
      </div>
    </div>
  )
}
