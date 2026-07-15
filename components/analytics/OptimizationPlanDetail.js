'use client'

import { useState, useEffect } from 'react'
import { format } from 'date-fns'
import { it } from 'date-fns/locale'

/**
 * Modal per visualizzare e gestire un piano di ottimizzazione
 * Include: dettagli, log attività, cambio stato, completamento
 */
export default function OptimizationPlanDetail({
  plan: initialPlan,
  onClose,
  onPlanUpdated
}) {
  const [plan, setPlan] = useState(initialPlan)
  const [logs, setLogs] = useState(initialPlan.optimization_logs || [])
  const [saving, setSaving] = useState(false)
  const [activeTab, setActiveTab] = useState('log') // 'log', 'completa'

  // Form nuovo log
  const [newLog, setNewLog] = useState({
    data_attivita: format(new Date(), 'yyyy-MM-dd'),
    descrizione: '',
    esito: ''
  })

  // Form completamento
  const [completamento, setCompletamento] = useState({
    importo_post: plan.importo_post_ottimizzazione || '',
    risparmio: plan.risparmio_effettivo || '',
    note_esito: plan.note_esito || '',
    tipo_riduzione: 'valuta', // 'valuta' o 'percentuale'
    base_temporale: 'mensile' // 'mensile' o 'annuale'
  })

  function formatEuro(val) {
    return new Intl.NumberFormat('it-IT', { style: 'currency', currency: 'EUR' }).format(val || 0)
  }

  function formatDate(dateStr) {
    if (!dateStr) return '-'
    return format(new Date(dateStr), 'dd/MM/yyyy', { locale: it })
  }

  function getPriorityBadge(priorita) {
    switch (priorita) {
      case 1: return <span className="px-2 py-0.5 bg-red-100 text-red-700 rounded text-xs font-semibold">Alta</span>
      case 2: return <span className="px-2 py-0.5 bg-yellow-100 text-yellow-700 rounded text-xs font-semibold">Media</span>
      case 3: return <span className="px-2 py-0.5 bg-green-100 text-green-700 rounded text-xs font-semibold">Bassa</span>
      default: return null
    }
  }

  function getStatoBadge(stato) {
    switch (stato) {
      case 'attivo': return <span className="px-2 py-0.5 bg-blue-100 text-blue-700 rounded text-xs font-semibold">Attivo</span>
      case 'in_corso': return <span className="px-2 py-0.5 bg-purple-100 text-purple-700 rounded text-xs font-semibold">In Corso</span>
      case 'completato': return <span className="px-2 py-0.5 bg-green-100 text-green-700 rounded text-xs font-semibold">Completato</span>
      case 'annullato': return <span className="px-2 py-0.5 bg-gray-100 text-gray-700 rounded text-xs font-semibold">Annullato</span>
      default: return null
    }
  }

  async function handleAddLog() {
    if (!newLog.descrizione.trim()) {
      alert('Inserisci una descrizione per il log')
      return
    }

    setSaving(true)
    try {
      const res = await fetch('/api/optimization-logs', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          plan_id: plan.id,
          data_attivita: newLog.data_attivita,
          descrizione: newLog.descrizione,
          esito: newLog.esito || null
        })
      })

      if (!res.ok) throw new Error('Errore salvataggio log')

      const data = await res.json()

      // Aggiorna lista logs
      setLogs([data.log, ...logs])

      // Reset form
      setNewLog({
        data_attivita: format(new Date(), 'yyyy-MM-dd'),
        descrizione: '',
        esito: ''
      })

      // Se il piano era "attivo", passa a "in_corso"
      if (plan.stato === 'attivo') {
        await updatePlanStatus('in_corso')
      }

    } catch (error) {
      console.error('Errore:', error)
      alert(error.message)
    }
    setSaving(false)
  }

  async function updatePlanStatus(nuovoStato) {
    try {
      const res = await fetch('/api/optimization-plans', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          id: plan.id,
          stato: nuovoStato
        })
      })

      if (!res.ok) throw new Error('Errore aggiornamento stato')

      const data = await res.json()
      setPlan(data.plan)

      if (onPlanUpdated) {
        onPlanUpdated(data.plan)
      }
    } catch (error) {
      console.error('Errore:', error)
    }
  }

  async function handleCompletaPiano() {
    if (!completamento.note_esito.trim()) {
      alert('Inserisci una nota sull\'esito finale')
      return
    }

    setSaving(true)
    try {
      // Calcola il risparmio effettivo in base al tipo e base temporale
      let risparmioCalcolato = null
      if (completamento.risparmio) {
        const valoreRisparmio = parseFloat(completamento.risparmio)
        if (completamento.tipo_riduzione === 'percentuale') {
          // Calcola il risparmio in euro dalla percentuale
          risparmioCalcolato = plan.importo_rilevato * (valoreRisparmio / 100)
        } else {
          risparmioCalcolato = valoreRisparmio
        }
        // Se la base è annuale, converti in mensile per uniformità nel DB
        if (completamento.base_temporale === 'annuale') {
          risparmioCalcolato = risparmioCalcolato / 12
        }
      }

      // Costruisci le note con le info sul tipo di calcolo
      let noteFinali = completamento.note_esito
      if (completamento.risparmio) {
        const tipoInfo = `[Risparmio: ${completamento.risparmio}${completamento.tipo_riduzione === 'percentuale' ? '%' : '€'} ${completamento.base_temporale}]`
        noteFinali = `${tipoInfo}\n${completamento.note_esito}`
      }

      const res = await fetch('/api/optimization-plans', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          id: plan.id,
          stato: 'completato',
          importo_post_ottimizzazione: completamento.importo_post
            ? parseFloat(completamento.importo_post)
            : null,
          risparmio_effettivo: risparmioCalcolato,
          note_esito: noteFinali
        })
      })

      if (!res.ok) throw new Error('Errore completamento piano')

      const data = await res.json()
      setPlan(data.plan)

      if (onPlanUpdated) {
        onPlanUpdated(data.plan)
      }

      alert('Piano completato con successo!')

    } catch (error) {
      console.error('Errore:', error)
      alert(error.message)
    }
    setSaving(false)
  }

  async function handleDeleteLog(logId) {
    if (!confirm('Eliminare questo log?')) return

    try {
      const res = await fetch(`/api/optimization-logs?id=${logId}`, {
        method: 'DELETE'
      })

      if (!res.ok) throw new Error('Errore eliminazione')

      setLogs(logs.filter(l => l.id !== logId))
    } catch (error) {
      console.error('Errore:', error)
    }
  }

  // Recupera un piano annullato riportandolo ad "attivo"
  async function handleRecuperaPiano() {
    if (!confirm('Vuoi recuperare questo piano e riportarlo allo stato attivo?')) return

    setSaving(true)
    try {
      const res = await fetch('/api/optimization-plans', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          id: plan.id,
          stato: 'attivo'
        })
      })

      if (!res.ok) throw new Error('Errore recupero piano')

      const data = await res.json()
      setPlan(data.plan)

      if (onPlanUpdated) {
        onPlanUpdated(data.plan)
      }

      alert('Piano recuperato con successo!')
    } catch (error) {
      console.error('Errore:', error)
      alert(error.message)
    }
    setSaving(false)
  }

  // Elimina definitivamente un piano
  async function handleEliminaDefinitivamente() {
    if (!confirm('ATTENZIONE: Questa operazione eliminerà definitivamente il piano e tutti i log associati. Continuare?')) return
    if (!confirm('Sei davvero sicuro? Questa azione non può essere annullata.')) return

    setSaving(true)
    try {
      const res = await fetch(`/api/optimization-plans?id=${plan.id}`, {
        method: 'DELETE'
      })

      if (!res.ok) throw new Error('Errore eliminazione piano')

      alert('Piano eliminato definitivamente.')

      if (onPlanUpdated) {
        onPlanUpdated({ ...plan, _deleted: true })
      }
      onClose()
    } catch (error) {
      console.error('Errore:', error)
      alert(error.message)
    }
    setSaving(false)
  }

  return (
    <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
      <div className="bg-white rounded-xl shadow-2xl max-w-2xl w-full max-h-[90vh] flex flex-col">
        {/* Header */}
        <div className="bg-gradient-to-r from-indigo-600 to-purple-600 text-white p-6 rounded-t-xl">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="w-12 h-12 bg-white/20 backdrop-blur-sm rounded-xl flex items-center justify-center shadow-lg">
                <span className="text-2xl">📋</span>
              </div>
              <div>
                <h2 className="text-xl font-bold">{plan.titolo}</h2>
                <div className="flex items-center gap-2 mt-1">
                  {getStatoBadge(plan.stato)}
                  {getPriorityBadge(plan.priorita)}
                  <span className="text-sm text-indigo-100">{plan.categoria}</span>
                </div>
              </div>
            </div>
            <button
              onClick={onClose}
              className="w-10 h-10 bg-white/20 hover:bg-white/30 rounded-lg flex items-center justify-center transition-colors"
            >
              <span className="text-xl">x</span>
            </button>
          </div>
        </div>

        {/* Info Cards */}
        <div className="p-4 border-b border-gray-200 bg-gray-50">
          <div className="grid grid-cols-4 gap-3">
            <div className="bg-white rounded-lg p-3 text-center">
              <div className="text-xs text-gray-500 mb-1">Importo Rilevato</div>
              <div className="font-bold text-gray-800">{formatEuro(plan.importo_rilevato)}</div>
            </div>
            <div className="bg-white rounded-lg p-3 text-center">
              <div className="text-xs text-gray-500 mb-1">Obiettivo</div>
              <div className="font-bold text-green-600">
                {plan.obiettivo_risparmio ? formatEuro(plan.obiettivo_risparmio) : '-'}
              </div>
            </div>
            <div className="bg-white rounded-lg p-3 text-center">
              <div className="text-xs text-gray-500 mb-1">Scadenza</div>
              <div className="font-bold text-gray-800">{formatDate(plan.data_scadenza)}</div>
            </div>
            <div className="bg-white rounded-lg p-3 text-center">
              <div className="text-xs text-gray-500 mb-1">Risparmio Ottenuto</div>
              <div className="font-bold text-emerald-600">
                {plan.risparmio_effettivo ? formatEuro(plan.risparmio_effettivo) : '-'}
              </div>
            </div>
          </div>

          {plan.descrizione && (
            <div className="mt-3 p-3 bg-white rounded-lg text-sm text-gray-700">
              <strong className="text-gray-800">Descrizione:</strong> {plan.descrizione}
            </div>
          )}
        </div>

        {/* Tabs */}
        {plan.stato !== 'completato' && plan.stato !== 'annullato' && (
          <div className="border-b border-gray-200">
            <div className="flex">
              <button
                onClick={() => setActiveTab('log')}
                className={`flex-1 px-4 py-3 text-sm font-semibold transition-colors ${
                  activeTab === 'log'
                    ? 'text-indigo-600 border-b-2 border-indigo-600 bg-indigo-50'
                    : 'text-gray-600 hover:bg-gray-50'
                }`}
              >
                📝 Diario Attività
              </button>
              <button
                onClick={() => setActiveTab('completa')}
                className={`flex-1 px-4 py-3 text-sm font-semibold transition-colors ${
                  activeTab === 'completa'
                    ? 'text-green-600 border-b-2 border-green-600 bg-green-50'
                    : 'text-gray-600 hover:bg-gray-50'
                }`}
              >
                ✅ Completa Piano
              </button>
            </div>
          </div>
        )}

        {/* Content */}
        <div className="flex-1 overflow-y-auto p-4">
          {/* Tab: Log Attività */}
          {(activeTab === 'log' || plan.stato === 'completato') && (
            <div>
              {/* Form nuovo log (solo se non completato) */}
              {plan.stato !== 'completato' && plan.stato !== 'annullato' && (
                <div className="mb-4 p-4 bg-indigo-50 rounded-lg border border-indigo-200">
                  <h4 className="font-semibold text-indigo-800 mb-3">Aggiungi nota attività</h4>
                  <div className="grid grid-cols-3 gap-3 mb-3">
                    <div>
                      <label className="block text-xs text-gray-600 mb-1">Data</label>
                      <input
                        type="date"
                        value={newLog.data_attivita}
                        onChange={(e) => setNewLog({ ...newLog, data_attivita: e.target.value })}
                        className="w-full px-3 py-2 border-2 border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent text-sm"
                      />
                    </div>
                    <div className="col-span-2">
                      <label className="block text-xs text-gray-600 mb-1">Esito (opzionale)</label>
                      <input
                        type="text"
                        value={newLog.esito}
                        onChange={(e) => setNewLog({ ...newLog, esito: e.target.value })}
                        placeholder="Es: Offerta ricevuta, in attesa..."
                        className="w-full px-3 py-2 border-2 border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent text-sm"
                      />
                    </div>
                  </div>
                  <div className="mb-3">
                    <label className="block text-xs text-gray-600 mb-1">Descrizione attività *</label>
                    <textarea
                      value={newLog.descrizione}
                      onChange={(e) => setNewLog({ ...newLog, descrizione: e.target.value })}
                      placeholder="Es: Contattata Sorgenia per richiesta preventivo energia..."
                      rows={2}
                      className="w-full px-3 py-2 border-2 border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent text-sm"
                    />
                  </div>
                  <button
                    onClick={handleAddLog}
                    disabled={saving || !newLog.descrizione.trim()}
                    className="w-full px-4 py-2 bg-indigo-600 text-white rounded-lg font-semibold hover:bg-indigo-700 transition-colors disabled:opacity-50"
                  >
                    {saving ? '⏳ Salvando...' : '➕ Aggiungi Nota'}
                  </button>
                </div>
              )}

              {/* Lista log */}
              <div className="space-y-2">
                {logs.length === 0 ? (
                  <div className="text-center py-8 text-gray-500">
                    <div className="text-4xl mb-2">📝</div>
                    <p>Nessuna attività registrata</p>
                    <p className="text-sm">Aggiungi la prima nota per tracciare i progressi</p>
                  </div>
                ) : (
                  logs.map((log) => (
                    <div
                      key={log.id}
                      className="p-3 bg-white rounded-lg border border-gray-200 hover:border-indigo-300 transition-colors"
                    >
                      <div className="flex items-start justify-between">
                        <div className="flex-1">
                          <div className="flex items-center gap-2 mb-1">
                            <span className="font-bold text-indigo-600">
                              {formatDate(log.data_attivita)}
                            </span>
                            {log.esito && (
                              <span className="px-2 py-0.5 bg-gray-100 text-gray-600 rounded text-xs">
                                {log.esito}
                              </span>
                            )}
                          </div>
                          <p className="text-sm text-gray-700">{log.descrizione}</p>
                        </div>
                        {plan.stato !== 'completato' && (
                          <button
                            onClick={() => handleDeleteLog(log.id)}
                            className="text-gray-400 hover:text-red-500 transition-colors ml-2"
                            title="Elimina"
                          >
                            🗑
                          </button>
                        )}
                      </div>
                    </div>
                  ))
                )}
              </div>

              {/* Esito finale se completato */}
              {plan.stato === 'completato' && plan.note_esito && (
                <div className="mt-4 p-4 bg-green-50 rounded-lg border border-green-200">
                  <h4 className="font-semibold text-green-800 mb-2">✅ Esito Finale</h4>
                  <p className="text-gray-700">{plan.note_esito}</p>
                  {plan.risparmio_effettivo && (
                    <p className="mt-2 font-bold text-green-700">
                      Risparmio ottenuto: {formatEuro(plan.risparmio_effettivo)}/mese
                    </p>
                  )}
                </div>
              )}
            </div>
          )}

          {/* Tab: Completa Piano */}
          {activeTab === 'completa' && plan.stato !== 'completato' && (
            <div>
              <div className="p-4 bg-green-50 rounded-lg border border-green-200 mb-4">
                <div className="flex items-start gap-2">
                  <span className="text-lg">💡</span>
                  <div className="text-sm text-gray-700">
                    <strong className="text-green-700">Completa il piano:</strong>
                    <p className="mt-1">
                      Inserisci i risultati ottenuti e la soluzione adottata per chiudere questo piano.
                    </p>
                  </div>
                </div>
              </div>

              <div className="space-y-4">
                {/* Selezione tipo riduzione e base temporale */}
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-sm font-semibold text-gray-700 mb-2">
                      Tipo di riduzione
                    </label>
                    <div className="flex gap-2">
                      <button
                        type="button"
                        onClick={() => setCompletamento({ ...completamento, tipo_riduzione: 'valuta' })}
                        className={`flex-1 px-3 py-2 rounded-lg text-sm font-semibold transition-all ${
                          completamento.tipo_riduzione === 'valuta'
                            ? 'bg-green-600 text-white shadow-md'
                            : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                        }`}
                      >
                        € Valuta
                      </button>
                      <button
                        type="button"
                        onClick={() => setCompletamento({ ...completamento, tipo_riduzione: 'percentuale' })}
                        className={`flex-1 px-3 py-2 rounded-lg text-sm font-semibold transition-all ${
                          completamento.tipo_riduzione === 'percentuale'
                            ? 'bg-green-600 text-white shadow-md'
                            : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                        }`}
                      >
                        % Percentuale
                      </button>
                    </div>
                  </div>
                  <div>
                    <label className="block text-sm font-semibold text-gray-700 mb-2">
                      Base temporale
                    </label>
                    <div className="flex gap-2">
                      <button
                        type="button"
                        onClick={() => setCompletamento({ ...completamento, base_temporale: 'mensile' })}
                        className={`flex-1 px-3 py-2 rounded-lg text-sm font-semibold transition-all ${
                          completamento.base_temporale === 'mensile'
                            ? 'bg-blue-600 text-white shadow-md'
                            : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                        }`}
                      >
                        Mensile
                      </button>
                      <button
                        type="button"
                        onClick={() => setCompletamento({ ...completamento, base_temporale: 'annuale' })}
                        className={`flex-1 px-3 py-2 rounded-lg text-sm font-semibold transition-all ${
                          completamento.base_temporale === 'annuale'
                            ? 'bg-blue-600 text-white shadow-md'
                            : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                        }`}
                      >
                        Annuale
                      </button>
                    </div>
                  </div>
                </div>

                {/* Importo post ottimizzazione */}
                <div>
                  <label className="block text-sm font-semibold text-gray-700 mb-1">
                    Nuovo importo {completamento.base_temporale} (dopo ottimizzazione)
                  </label>
                  <div className="relative">
                    <span className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-500">€</span>
                    <input
                      type="number"
                      step="0.01"
                      min="0"
                      value={completamento.importo_post}
                      onChange={(e) => setCompletamento({ ...completamento, importo_post: e.target.value })}
                      placeholder="0.00"
                      className="w-full pl-8 pr-4 py-3 border-2 border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-green-500 focus:border-transparent"
                    />
                  </div>
                  <p className="text-xs text-gray-500 mt-1">
                    Importo precedente: {formatEuro(plan.importo_rilevato)}
                    {completamento.base_temporale === 'annuale' && ` (${formatEuro(plan.importo_rilevato * 12)}/anno)`}
                  </p>
                </div>

                {/* Risparmio effettivo */}
                <div>
                  <label className="block text-sm font-semibold text-gray-700 mb-1">
                    Risparmio effettivo {completamento.base_temporale}
                  </label>
                  <div className="relative">
                    <span className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-500">
                      {completamento.tipo_riduzione === 'valuta' ? '€' : '%'}
                    </span>
                    <input
                      type="number"
                      step={completamento.tipo_riduzione === 'valuta' ? '0.01' : '0.1'}
                      min="0"
                      max={completamento.tipo_riduzione === 'percentuale' ? '100' : undefined}
                      value={completamento.risparmio}
                      onChange={(e) => setCompletamento({ ...completamento, risparmio: e.target.value })}
                      placeholder={completamento.tipo_riduzione === 'valuta' ? '0.00' : '0'}
                      className="w-full pl-8 pr-4 py-3 border-2 border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-green-500 focus:border-transparent"
                    />
                  </div>
                  {plan.obiettivo_risparmio && (
                    <p className="text-xs text-gray-500 mt-1">
                      Obiettivo: {formatEuro(plan.obiettivo_risparmio)}
                    </p>
                  )}
                  {/* Preview del risparmio calcolato */}
                  {completamento.risparmio && completamento.tipo_riduzione === 'percentuale' && (
                    <p className="text-xs text-green-600 mt-1 font-semibold">
                      = {formatEuro(plan.importo_rilevato * (parseFloat(completamento.risparmio) / 100))}
                      {completamento.base_temporale === 'mensile' ? '/mese' : '/anno'}
                      {completamento.base_temporale === 'mensile' &&
                        ` (${formatEuro(plan.importo_rilevato * (parseFloat(completamento.risparmio) / 100) * 12)}/anno)`
                      }
                    </p>
                  )}
                  {completamento.risparmio && completamento.tipo_riduzione === 'valuta' && completamento.base_temporale === 'mensile' && (
                    <p className="text-xs text-green-600 mt-1 font-semibold">
                      = {formatEuro(parseFloat(completamento.risparmio) * 12)}/anno
                    </p>
                  )}
                </div>

                {/* Note esito */}
                <div>
                  <label className="block text-sm font-semibold text-gray-700 mb-1">
                    Soluzione adottata / Note finali *
                  </label>
                  <textarea
                    value={completamento.note_esito}
                    onChange={(e) => setCompletamento({ ...completamento, note_esito: e.target.value })}
                    placeholder="Es: Stipulato nuovo contratto con Sorgenia, tariffa 0.18€/kWh invece di 0.22€/kWh. Risparmio stimato 15% mensile."
                    rows={4}
                    className="w-full px-4 py-3 border-2 border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-green-500 focus:border-transparent"
                  />
                </div>

                <button
                  onClick={handleCompletaPiano}
                  disabled={saving || !completamento.note_esito.trim()}
                  className="w-full px-4 py-3 bg-gradient-to-r from-green-600 to-emerald-600 text-white rounded-xl font-semibold hover:from-green-700 hover:to-emerald-700 transition-all disabled:opacity-50 shadow-lg"
                >
                  {saving ? '⏳ Salvataggio...' : '✅ Completa Piano'}
                </button>
              </div>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="p-4 border-t border-gray-200 bg-gray-50 rounded-b-xl">
          <div className="flex items-center justify-between">
            <div className="text-xs text-gray-500">
              Creato: {formatDate(plan.created_at)}
              {plan.data_completamento && ` • Completato: ${formatDate(plan.data_completamento)}`}
            </div>
            <div className="flex gap-2">
              {/* Pulsanti per piani attivi/in corso */}
              {plan.stato !== 'completato' && plan.stato !== 'annullato' && (
                <button
                  onClick={() => updatePlanStatus('annullato')}
                  className="px-3 py-2 text-gray-600 hover:text-red-600 text-sm font-semibold transition-colors"
                >
                  Annulla Piano
                </button>
              )}

              {/* Pulsanti per piani annullati */}
              {plan.stato === 'annullato' && (
                <>
                  <button
                    onClick={handleRecuperaPiano}
                    disabled={saving}
                    className="px-4 py-2 bg-blue-600 text-white rounded-lg font-semibold hover:bg-blue-700 transition-colors disabled:opacity-50"
                  >
                    {saving ? '⏳' : '🔄'} Recupera Piano
                  </button>
                  <button
                    onClick={handleEliminaDefinitivamente}
                    disabled={saving}
                    className="px-4 py-2 bg-red-600 text-white rounded-lg font-semibold hover:bg-red-700 transition-colors disabled:opacity-50"
                  >
                    {saving ? '⏳' : '🗑️'} Elimina Definitivamente
                  </button>
                </>
              )}

              <button
                onClick={onClose}
                className="px-4 py-2 bg-gray-200 text-gray-700 rounded-lg font-semibold hover:bg-gray-300 transition-colors"
              >
                Chiudi
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
