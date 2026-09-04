'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { useAuth } from '@/contexts/AuthContext'

const TIPI_SOCIETA = ['SRL', 'SRLS', 'SAS', 'SNC', 'SPA', 'SAPA', 'SS', 'Ditta Individuale', 'Altro']
const TIPI_DOCUMENTO = [
  { value: 'carta_identita', label: 'Carta d\'identita' },
  { value: 'passaporto', label: 'Passaporto' },
  { value: 'patente', label: 'Patente di guida' }
]

// =====================================================
// INPUT HELPER — a livello di modulo, NON dentro SignupPage
// =====================================================
// Bug fix (03/09/2026, collaudo Mason — bug #2, il più urgente): prima questo
// componente era definito CON `const InputField = (...) => (...)` DENTRO al
// corpo di SignupPage(). Ogni render di SignupPage (cioè ogni carattere
// digitato, perché onChange chiama setFormData) ricreava una nuova funzione/
// nuovo "tipo" di componente React. React tratta un tipo diverso come un
// elemento diverso: smontava il vecchio <input> DOM e ne montava uno nuovo,
// perdendo il focus ad ogni lettera (bisognava ricliccare col mouse per
// continuare a scrivere). Fix: componente a livello di modulo (identità
// stabile tra i render) che riceve `formData`/`updateField` come prop
// esplicite invece di chiuderli per closure sullo state del componente
// padre — così anche i valori restano sempre aggiornati.
const inputClass = "appearance-none relative block w-full px-3 py-3 border border-gray-300 placeholder-gray-500 text-gray-900 rounded-lg focus:outline-none focus:ring-2 focus:ring-pink-500 focus:border-pink-500 sm:text-sm"
const labelClass = "block text-sm font-medium text-gray-700 mb-1"

function InputField({ id, label, required, type = 'text', placeholder, value, field, maxLength, className = '', formData, updateField }) {
  return (
    <div className={className}>
      <label htmlFor={id} className={labelClass}>
        {label} {required && '*'}
      </label>
      <input
        id={id}
        type={type}
        required={required}
        value={value !== undefined ? value : formData[field]}
        onChange={(e) => updateField(field, e.target.value)}
        maxLength={maxLength}
        className={inputClass}
        placeholder={placeholder}
      />
    </div>
  )
}

export default function SignupPage() {
  const [step, setStep] = useState(1)
  const [formData, setFormData] = useState({
    // Step 1 - Tipo soggetto + dati base
    tipo_soggetto: 'persona_fisica',
    nome: '',
    cognome: '',
    codice_fiscale: '',
    ragione_sociale: '',
    tipo_societa: '',
    partita_iva: '',
    email: '',
    // Step 2 - Residenza/Sede + Domicilio
    residenza_indirizzo: '',
    residenza_civico: '',
    residenza_cap: '',
    residenza_citta: '',
    residenza_provincia: '',
    domicilio_diverso: false,
    domicilio_indirizzo: '',
    domicilio_civico: '',
    domicilio_cap: '',
    domicilio_citta: '',
    domicilio_provincia: '',
    // Step 3 - Documento + Cellulare
    cellulare: '',
    telefono_fisso: '',
    pec: '',
    documento_tipo: '',
    documento_numero: '',
    documento_data_scadenza: '',
    // Step 4 - Password + Termini
    password: '',
    confirmPassword: '',
    acceptTerms: false
  })
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState(null)
  const [legalDocs, setLegalDocs] = useState([])
  const [clauseAcceptances, setClauseAcceptances] = useState({}) // { clauseId: true/false }
  const { signUp } = useAuth()
  const router = useRouter()

  // Carica documenti legali (API pubblica via RPC)
  useEffect(() => {
    fetch('/api/user/legal-public')
      .then(res => res.ok ? res.json() : null)
      .then(json => {
        if (json?.data) setLegalDocs(json.data)
      })
      .catch(() => {})
  }, [])

  const updateField = (field, value) => {
    setFormData(prev => ({ ...prev, [field]: value }))
    setError(null)
  }

  const isPersonaFisica = formData.tipo_soggetto === 'persona_fisica'

  // =====================================================
  // VALIDAZIONI PER STEP
  // =====================================================
  const validateStep1 = () => {
    if (isPersonaFisica) {
      if (!formData.nome.trim()) { setError('Inserisci il nome'); return false }
      if (!formData.cognome.trim()) { setError('Inserisci il cognome'); return false }
      if (!formData.codice_fiscale.trim() && !formData.partita_iva.trim()) {
        setError('Inserisci almeno il codice fiscale o la P.IVA'); return false
      }
    } else {
      if (!formData.ragione_sociale.trim()) { setError('Inserisci la ragione sociale'); return false }
      if (!formData.tipo_societa) { setError('Seleziona il tipo di societa'); return false }
      if (!formData.partita_iva.trim() && !formData.codice_fiscale.trim()) {
        setError('Inserisci almeno la P.IVA o il codice fiscale'); return false
      }
    }
    if (!formData.email.trim() || !formData.email.includes('@')) {
      setError('Inserisci un indirizzo email valido'); return false
    }
    if (formData.codice_fiscale && formData.codice_fiscale.length !== 16 && formData.codice_fiscale.length !== 11) {
      setError('Il codice fiscale deve essere di 16 caratteri (o 11 per societa)'); return false
    }
    if (formData.partita_iva && formData.partita_iva.length !== 11) {
      setError('La P.IVA deve essere di 11 cifre'); return false
    }
    return true
  }

  const validateStep2 = () => {
    if (!formData.residenza_indirizzo.trim()) { setError('Inserisci l\'indirizzo'); return false }
    if (!formData.residenza_civico.trim()) { setError('Inserisci il numero civico'); return false }
    if (!formData.residenza_cap.trim() || formData.residenza_cap.length !== 5) {
      setError('Inserisci un CAP valido (5 cifre)'); return false
    }
    if (!formData.residenza_citta.trim()) { setError('Inserisci la citta'); return false }
    if (!formData.residenza_provincia.trim() || formData.residenza_provincia.length !== 2) {
      setError('Inserisci la sigla provincia (2 lettere)'); return false
    }
    if (formData.domicilio_diverso) {
      if (!formData.domicilio_indirizzo.trim()) { setError('Inserisci l\'indirizzo del domicilio'); return false }
      if (!formData.domicilio_civico.trim()) { setError('Inserisci il civico del domicilio'); return false }
      if (!formData.domicilio_cap.trim() || formData.domicilio_cap.length !== 5) {
        setError('Inserisci un CAP domicilio valido (5 cifre)'); return false
      }
      if (!formData.domicilio_citta.trim()) { setError('Inserisci la citta del domicilio'); return false }
      if (!formData.domicilio_provincia.trim() || formData.domicilio_provincia.length !== 2) {
        setError('Inserisci la sigla provincia domicilio (2 lettere)'); return false
      }
    }
    return true
  }

  const validateStep3 = () => {
    if (!formData.cellulare.trim()) { setError('Il numero di cellulare e obbligatorio'); return false }
    if (!formData.documento_tipo) { setError('Seleziona il tipo di documento'); return false }
    if (!formData.documento_numero.trim()) { setError('Inserisci il numero del documento'); return false }
    if (!formData.documento_data_scadenza) { setError('Inserisci la data di scadenza del documento'); return false }
    // Verifica che il documento non sia scaduto
    if (new Date(formData.documento_data_scadenza) < new Date()) {
      setError('Il documento risulta scaduto'); return false
    }
    return true
  }

  const validateStep4 = () => {
    if (formData.password.length < 8) {
      setError('La password deve essere di almeno 8 caratteri'); return false
    }
    if (formData.password !== formData.confirmPassword) {
      setError('Le password non coincidono'); return false
    }
    // Verifica accettazione documenti legali
    for (const doc of legalDocs) {
      if (!formData[`accept_${doc.tipo}`]) {
        const label = doc.tipo === 'condizioni_contrattuali' ? 'le Condizioni Contrattuali' : "l'Informativa Privacy"
        setError(`Devi accettare ${label}`); return false
      }
      // Verifica clausole vessatorie
      const vessatorie = (doc.clausole || []).filter(c => c.richiede_accettazione_singola)
      for (const c of vessatorie) {
        if (!clauseAcceptances[c.id]) {
          setError(`Devi accettare la clausola "${c.titolo}"`); return false
        }
      }
    }
    if (legalDocs.length === 0 && !formData.acceptTerms) {
      setError('Devi accettare i termini e condizioni'); return false
    }
    return true
  }

  const handleNextStep = () => {
    let valid = false
    if (step === 1) valid = validateStep1()
    else if (step === 2) valid = validateStep2()
    else if (step === 3) valid = validateStep3()
    if (valid) setStep(step + 1)
  }

  const handleSubmit = async (e) => {
    e.preventDefault()
    if (!validateStep4()) return

    setLoading(true)
    setError(null)

    try {
      const { password, confirmPassword, acceptTerms, ...datiExtra } = formData

      // Rimuovi campi accept_* da datiExtra
      const cleanDatiExtra = Object.fromEntries(
        Object.entries(datiExtra).filter(([key]) => !key.startsWith('accept_'))
      )

      const result = await signUp(formData.email, formData.password, cleanDatiExtra)

      if (result.success) {
        // Registra accettazioni legali se ci sono documenti
        if (legalDocs.length > 0 && result.user?.id) {
          const acceptancesPayload = legalDocs.map(doc => {
            const clausole = doc.clausole || []
            const allClauseIds = clausole.map(c => c.id)
            return { document_id: doc.id, clause_ids: allClauseIds }
          })

          await fetch('/api/user/legal-public', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ user_id: result.user.id, acceptances: acceptancesPayload })
          }).catch(() => {}) // Non bloccare la registrazione se fallisce
        }

        router.push('/login?message=check_email')
      } else {
        setError(result.error || 'Errore durante la registrazione')
      }
    } catch (err) {
      setError('Errore di connessione')
    } finally {
      setLoading(false)
    }
  }

  // =====================================================
  // RENDER
  // =====================================================
  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-pink-50 to-purple-50 py-12 px-4 sm:px-6 lg:px-8">
      <div className="max-w-lg w-full space-y-8">
        {/* Logo e titolo */}
        <div className="text-center">
          <div className="mx-auto h-16 w-16 bg-gradient-to-br from-pink-500 to-purple-600 rounded-full flex items-center justify-center">
            <span className="text-2xl font-bold text-white">B</span>
          </div>
          <h2 className="mt-6 text-3xl font-extrabold text-gray-900">
            Registra il tuo centro
          </h2>
          <p className="mt-2 text-sm text-gray-600">
            Crea il tuo account gratuito
          </p>
        </div>

        {/* Progress indicator - 4 step */}
        <div className="flex justify-center items-center space-x-2">
          {[1, 2, 3, 4].map((s, i) => (
            <div key={s} className="flex items-center">
              <div className={`flex items-center justify-center w-8 h-8 rounded-full text-sm font-medium ${
                step >= s ? 'bg-pink-500 text-white' : 'bg-gray-200 text-gray-500'
              }`}>
                {s}
              </div>
              {i < 3 && (
                <div className={`w-8 h-1 mx-1 ${step > s ? 'bg-pink-500' : 'bg-gray-200'}`}></div>
              )}
            </div>
          ))}
        </div>

        {/* Step labels */}
        <div className="grid grid-cols-4 text-center text-xs text-gray-500">
          <span className={step === 1 ? 'text-pink-600 font-medium' : ''}>Dati</span>
          <span className={step === 2 ? 'text-pink-600 font-medium' : ''}>Indirizzo</span>
          <span className={step === 3 ? 'text-pink-600 font-medium' : ''}>Documento</span>
          <span className={step === 4 ? 'text-pink-600 font-medium' : ''}>Account</span>
        </div>

        {/* Errori */}
        {error && (
          <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg text-sm">
            {error}
          </div>
        )}

        {/* ==================== STEP 1: Tipo soggetto + Dati base ==================== */}
        {step === 1 && (
          <form onSubmit={(e) => { e.preventDefault(); handleNextStep() }} className="mt-4 space-y-5">
            {/* Tipo soggetto */}
            <div>
              <label className={labelClass}>Tipo soggetto *</label>
              <div className="grid grid-cols-2 gap-3">
                <button
                  type="button"
                  onClick={() => updateField('tipo_soggetto', 'persona_fisica')}
                  className={`py-3 px-4 rounded-lg border-2 text-sm font-medium transition-all ${
                    isPersonaFisica
                      ? 'border-pink-500 bg-pink-50 text-pink-700'
                      : 'border-gray-300 bg-white text-gray-600 hover:border-pink-300'
                  }`}
                >
                  Persona Fisica
                </button>
                <button
                  type="button"
                  onClick={() => updateField('tipo_soggetto', 'societa')}
                  className={`py-3 px-4 rounded-lg border-2 text-sm font-medium transition-all ${
                    !isPersonaFisica
                      ? 'border-pink-500 bg-pink-50 text-pink-700'
                      : 'border-gray-300 bg-white text-gray-600 hover:border-pink-300'
                  }`}
                >
                  Societa
                </button>
              </div>
            </div>

            {/* Campi persona fisica */}
            {isPersonaFisica && (
              <>
                <div className="grid grid-cols-2 gap-4">
                  <InputField id="nome" label="Nome" required field="nome" placeholder="Mario" formData={formData} updateField={updateField} />
                  <InputField id="cognome" label="Cognome" required field="cognome" placeholder="Rossi" formData={formData} updateField={updateField} />
                </div>
                <InputField id="codice_fiscale" label="Codice Fiscale" field="codice_fiscale" placeholder="RSSMRA80A01H501Z" maxLength={16} formData={formData} updateField={updateField} />
                <InputField id="partita_iva" label="P.IVA" field="partita_iva" placeholder="12345678901" maxLength={11} formData={formData} updateField={updateField} />
                <p className="text-xs text-gray-500 -mt-3">Almeno uno tra Codice Fiscale e P.IVA e obbligatorio</p>
              </>
            )}

            {/* Campi societa */}
            {!isPersonaFisica && (
              <>
                <InputField id="ragione_sociale" label="Ragione Sociale" required field="ragione_sociale" placeholder="Beauty Center SRL" formData={formData} updateField={updateField} />
                <div>
                  <label htmlFor="tipo_societa" className={labelClass}>Tipo Societa *</label>
                  <select
                    id="tipo_societa"
                    value={formData.tipo_societa}
                    onChange={(e) => updateField('tipo_societa', e.target.value)}
                    className={inputClass}
                  >
                    <option value="">Seleziona...</option>
                    {TIPI_SOCIETA.map(t => (
                      <option key={t} value={t}>{t}</option>
                    ))}
                  </select>
                </div>
                <InputField id="partita_iva_soc" label="P.IVA" field="partita_iva" placeholder="12345678901" maxLength={11} formData={formData} updateField={updateField} />
                <InputField id="codice_fiscale_soc" label="Codice Fiscale" field="codice_fiscale" placeholder="12345678901" maxLength={16} formData={formData} updateField={updateField} />
                <p className="text-xs text-gray-500 -mt-3">Almeno uno tra P.IVA e Codice Fiscale e obbligatorio</p>
                <div className="grid grid-cols-2 gap-4">
                  <InputField id="nome_soc" label="Nome referente" field="nome" placeholder="Mario" formData={formData} updateField={updateField} />
                  <InputField id="cognome_soc" label="Cognome referente" field="cognome" placeholder="Rossi" formData={formData} updateField={updateField} />
                </div>
              </>
            )}

            <InputField id="email" label="Email" required type="email" field="email" placeholder="nome@centro.it" formData={formData} updateField={updateField} />

            <button
              type="submit"
              className="w-full flex justify-center py-3 px-4 border border-transparent text-sm font-medium rounded-lg text-white bg-gradient-to-r from-pink-500 to-purple-600 hover:from-pink-600 hover:to-purple-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-pink-500 transition-all"
            >
              Continua
            </button>
          </form>
        )}

        {/* ==================== STEP 2: Residenza/Sede + Domicilio ==================== */}
        {step === 2 && (
          <form onSubmit={(e) => { e.preventDefault(); handleNextStep() }} className="mt-4 space-y-5">
            <h3 className="text-lg font-semibold text-gray-800">
              {isPersonaFisica ? 'Residenza' : 'Sede Legale'}
            </h3>

            <div className="grid grid-cols-3 gap-3">
              <div className="col-span-2">
                <InputField id="res_indirizzo" label="Indirizzo" required field="residenza_indirizzo" placeholder="Via Roma" formData={formData} updateField={updateField} />
              </div>
              <InputField id="res_civico" label="Civico" required field="residenza_civico" placeholder="42" formData={formData} updateField={updateField} />
            </div>

            <div className="grid grid-cols-3 gap-3">
              <InputField id="res_cap" label="CAP" required field="residenza_cap" placeholder="20100" maxLength={5} formData={formData} updateField={updateField} />
              <InputField id="res_citta" label="Citta" required field="residenza_citta" placeholder="Milano" className="col-span-2" formData={formData} updateField={updateField} />
            </div>

            <InputField id="res_provincia" label="Provincia" required field="residenza_provincia" placeholder="MI" maxLength={2} formData={formData} updateField={updateField} />

            {/* Domicilio diverso */}
            <div className="border-t border-gray-200 pt-4">
              <div className="flex items-center gap-2">
                <input
                  id="domicilio_diverso"
                  type="checkbox"
                  checked={formData.domicilio_diverso}
                  onChange={(e) => updateField('domicilio_diverso', e.target.checked)}
                  className="h-4 w-4 text-pink-600 focus:ring-pink-500 border-gray-300 rounded"
                />
                <label htmlFor="domicilio_diverso" className="text-sm text-gray-700">
                  Domicilio diverso dalla {isPersonaFisica ? 'residenza' : 'sede legale'}
                </label>
              </div>
            </div>

            {formData.domicilio_diverso && (
              <div className="space-y-4 pl-2 border-l-2 border-pink-200">
                <h4 className="text-sm font-semibold text-gray-700">Domicilio</h4>
                <div className="grid grid-cols-3 gap-3">
                  <div className="col-span-2">
                    <InputField id="dom_indirizzo" label="Indirizzo" required field="domicilio_indirizzo" placeholder="Via Verdi" formData={formData} updateField={updateField} />
                  </div>
                  <InputField id="dom_civico" label="Civico" required field="domicilio_civico" placeholder="10" formData={formData} updateField={updateField} />
                </div>
                <div className="grid grid-cols-3 gap-3">
                  <InputField id="dom_cap" label="CAP" required field="domicilio_cap" placeholder="20100" maxLength={5} formData={formData} updateField={updateField} />
                  <InputField id="dom_citta" label="Citta" required field="domicilio_citta" placeholder="Milano" className="col-span-2" formData={formData} updateField={updateField} />
                </div>
                <InputField id="dom_provincia" label="Provincia" required field="domicilio_provincia" placeholder="MI" maxLength={2} formData={formData} updateField={updateField} />
              </div>
            )}

            <div className="flex space-x-4">
              <button
                type="button"
                onClick={() => setStep(1)}
                className="flex-1 py-3 px-4 border border-gray-300 text-sm font-medium rounded-lg text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-pink-500 transition-all"
              >
                Indietro
              </button>
              <button
                type="submit"
                className="flex-1 flex justify-center py-3 px-4 border border-transparent text-sm font-medium rounded-lg text-white bg-gradient-to-r from-pink-500 to-purple-600 hover:from-pink-600 hover:to-purple-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-pink-500 transition-all"
              >
                Continua
              </button>
            </div>
          </form>
        )}

        {/* ==================== STEP 3: Documento + Cellulare ==================== */}
        {step === 3 && (
          <form onSubmit={(e) => { e.preventDefault(); handleNextStep() }} className="mt-4 space-y-5">
            <h3 className="text-lg font-semibold text-gray-800">Recapiti</h3>

            <InputField id="cellulare" label="Cellulare" required type="tel" field="cellulare" placeholder="+39 333 1234567" formData={formData} updateField={updateField} />
            <InputField id="telefono_fisso" label="Telefono fisso" type="tel" field="telefono_fisso" placeholder="+39 02 1234567" formData={formData} updateField={updateField} />
            <InputField id="pec" label="PEC" type="email" field="pec" placeholder="nome@pec.it" formData={formData} updateField={updateField} />

            <div className="border-t border-gray-200 pt-4">
              <h3 className="text-lg font-semibold text-gray-800 mb-4">Documento d'identita</h3>
            </div>

            <div>
              <label htmlFor="documento_tipo" className={labelClass}>Tipo documento *</label>
              <select
                id="documento_tipo"
                value={formData.documento_tipo}
                onChange={(e) => updateField('documento_tipo', e.target.value)}
                className={inputClass}
              >
                <option value="">Seleziona...</option>
                {TIPI_DOCUMENTO.map(t => (
                  <option key={t.value} value={t.value}>{t.label}</option>
                ))}
              </select>
            </div>

            <InputField id="documento_numero" label="Numero documento" required field="documento_numero" placeholder="AX1234567" formData={formData} updateField={updateField} />
            <InputField id="documento_scadenza" label="Data scadenza" required type="date" field="documento_data_scadenza" formData={formData} updateField={updateField} />

            <div className="flex space-x-4">
              <button
                type="button"
                onClick={() => setStep(2)}
                className="flex-1 py-3 px-4 border border-gray-300 text-sm font-medium rounded-lg text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-pink-500 transition-all"
              >
                Indietro
              </button>
              <button
                type="submit"
                className="flex-1 flex justify-center py-3 px-4 border border-transparent text-sm font-medium rounded-lg text-white bg-gradient-to-r from-pink-500 to-purple-600 hover:from-pink-600 hover:to-purple-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-pink-500 transition-all"
              >
                Continua
              </button>
            </div>
          </form>
        )}

        {/* ==================== STEP 4: Password + Termini ==================== */}
        {step === 4 && (
          <form onSubmit={handleSubmit} className="mt-4 space-y-5">
            <h3 className="text-lg font-semibold text-gray-800">Crea il tuo account</h3>

            <div>
              <label htmlFor="password" className={labelClass}>Password *</label>
              <input
                id="password"
                type="password"
                required
                value={formData.password}
                onChange={(e) => updateField('password', e.target.value)}
                className={inputClass}
                placeholder="Minimo 8 caratteri"
              />
            </div>

            <div>
              <label htmlFor="confirmPassword" className={labelClass}>Conferma password *</label>
              <input
                id="confirmPassword"
                type="password"
                required
                value={formData.confirmPassword}
                onChange={(e) => updateField('confirmPassword', e.target.value)}
                className={inputClass}
                placeholder="Ripeti la password"
              />
            </div>

            {/* Documenti legali */}
            {legalDocs.length > 0 ? (
              <div className="space-y-6">
                {legalDocs.map(doc => {
                  const tipoLabel = doc.tipo === 'condizioni_contrattuali' ? 'Condizioni Contrattuali' : 'Informativa Privacy'
                  const clausole = doc.clausole || []
                  const vessatorie = clausole.filter(c => c.richiede_accettazione_singola)
                  const fieldKey = `accept_${doc.tipo}`

                  return (
                    <div key={doc.id} className="border border-gray-200 rounded-lg overflow-hidden">
                      <div className="bg-gray-50 px-4 py-2 border-b border-gray-200">
                        <h4 className="text-sm font-semibold text-gray-800">{tipoLabel}</h4>
                        <p className="text-xs text-gray-500">Versione {doc.versione}</p>
                      </div>

                      {/* Contenuto documento scrollabile */}
                      <div className="max-h-40 overflow-y-auto p-4 bg-white text-xs text-gray-600 leading-relaxed whitespace-pre-wrap border-b border-gray-200">
                        {doc.contenuto || 'Contenuto non disponibile'}
                      </div>

                      {/* Clausole vessatorie */}
                      {vessatorie.length > 0 && (
                        <div className="p-3 bg-red-50 border-b border-gray-200 space-y-2">
                          <p className="text-xs font-semibold text-red-700">Clausole ai sensi artt. 1341-1342 c.c.:</p>
                          {vessatorie.map(c => (
                            <div key={c.id} className="flex items-start gap-2">
                              <input
                                id={`clause-${c.id}`}
                                type="checkbox"
                                checked={!!clauseAcceptances[c.id]}
                                onChange={() => setClauseAcceptances(prev => ({ ...prev, [c.id]: !prev[c.id] }))}
                                className="h-4 w-4 text-red-600 focus:ring-red-500 border-red-300 rounded mt-0.5"
                              />
                              <label htmlFor={`clause-${c.id}`} className="text-xs text-red-800">
                                <span className="font-medium">{c.titolo}</span>
                                {c.contenuto && <span className="text-red-600"> - {c.contenuto}</span>}
                              </label>
                            </div>
                          ))}
                        </div>
                      )}

                      {/* Checkbox accettazione generale documento */}
                      <div className="p-3 flex items-start gap-2">
                        <input
                          id={fieldKey}
                          type="checkbox"
                          checked={!!formData[fieldKey]}
                          onChange={(e) => updateField(fieldKey, e.target.checked)}
                          className="h-4 w-4 text-pink-600 focus:ring-pink-500 border-gray-300 rounded mt-0.5"
                        />
                        <label htmlFor={fieldKey} className="text-sm text-gray-700">
                          Dichiaro di aver letto e accetto {doc.tipo === 'condizioni_contrattuali' ? 'le ' : "l'"}{tipoLabel}
                          {' '}(leggibile qui sopra, versione {doc.versione})
                        </label>
                      </div>
                    </div>
                  )
                })}
              </div>
            ) : (
              /* Bug fix (03/09/2026, collaudo Mason — bug #6): la checkbox
                 privacy non aveva link cliccabile — l'utente doveva accettare
                 "al buio". Aggiunto link reale a /privacy. Corretto anche
                 il 04/09/2026 (indicazione di Mason): un'unica pagina legale
                 basta, niente "termini" fantasma — l'etichetta ora nomina solo
                 la Privacy Policy, che è l'unico documento che esiste ed è
                 quello che serve davvero qui. */
              <div className="flex items-start">
                <input
                  id="acceptTerms"
                  type="checkbox"
                  checked={formData.acceptTerms}
                  onChange={(e) => updateField('acceptTerms', e.target.checked)}
                  className="h-4 w-4 text-pink-600 focus:ring-pink-500 border-gray-300 rounded mt-1"
                />
                <label htmlFor="acceptTerms" className="ml-2 block text-sm text-gray-700">
                  Accetto la{' '}
                  <Link href="/privacy" target="_blank" rel="noopener noreferrer" className="text-pink-600 underline hover:text-pink-700">
                    Privacy Policy
                  </Link>
                </label>
              </div>
            )}

            {/* Bug fix (03/09/2026, collaudo Mason — bug #8): questo box
                parlava di "versione demo" e citava funzionalità della
                piattaforma gestionale completa (chat AI, movimenti bancari,
                consulente HPA) non legate a quanto promesso su /report (Report
                CURA gratis nei primi 90 giorni). Corretto qui il minimo
                indispensabile per non essere fuorviante (testo accurato,
                nessuna funzione promessa che non sia garantita); la rifinitura
                di tono/voce resta di competenza di Federica. */}
            <div className="bg-purple-50 border border-purple-200 rounded-lg p-4">
              <h3 className="text-sm font-medium text-purple-800">Il tuo account gratuito</h3>
              <ul className="mt-2 text-xs text-purple-700 space-y-1">
                <li>- Accesso alla dashboard base</li>
                <li>- Report CURA incluso gratis nei primi 90 giorni dal lancio</li>
                <li>- Nessuna carta di credito richiesta</li>
              </ul>
            </div>

            <div className="flex space-x-4">
              <button
                type="button"
                onClick={() => setStep(3)}
                className="flex-1 py-3 px-4 border border-gray-300 text-sm font-medium rounded-lg text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-pink-500 transition-all"
              >
                Indietro
              </button>
              <button
                type="submit"
                disabled={loading}
                className="flex-1 flex justify-center py-3 px-4 border border-transparent text-sm font-medium rounded-lg text-white bg-gradient-to-r from-pink-500 to-purple-600 hover:from-pink-600 hover:to-purple-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-pink-500 disabled:opacity-50 disabled:cursor-not-allowed transition-all"
              >
                {loading ? (
                  <span className="flex items-center">
                    <svg className="animate-spin -ml-1 mr-3 h-5 w-5 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                    </svg>
                    Registrazione...
                  </span>
                ) : (
                  'Registrati'
                )}
              </button>
            </div>
          </form>
        )}

        {/* Link login */}
        <div className="text-center">
          <p className="text-sm text-gray-600">
            Hai gia un account?{' '}
            <Link href="/login" className="font-medium text-pink-600 hover:text-pink-500">
              Accedi
            </Link>
          </p>
        </div>
      </div>
    </div>
  )
}
