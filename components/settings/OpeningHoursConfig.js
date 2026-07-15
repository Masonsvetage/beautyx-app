'use client'

import { useState, useEffect } from 'react'

const GIORNI = ['Lun', 'Mar', 'Mer', 'Gio', 'Ven', 'Sab', 'Dom']
const GIORNI_FULL = ['Lunedì', 'Martedì', 'Mercoledì', 'Giovedì', 'Venerdì', 'Sabato', 'Domenica']
const GIORNI_SETTIMANA = ['Dom', 'Lun', 'Mar', 'Mer', 'Gio', 'Ven', 'Sab']

// Festività italiane fisse
const FESTIVITA_FISSE = [
  { giorno: 1, mese: 1, nome: 'Capodanno' },
  { giorno: 6, mese: 1, nome: 'Epifania' },
  { giorno: 25, mese: 4, nome: 'Liberazione' },
  { giorno: 1, mese: 5, nome: 'Festa del Lavoro' },
  { giorno: 2, mese: 6, nome: 'Festa della Repubblica' },
  { giorno: 15, mese: 8, nome: 'Ferragosto' },
  { giorno: 1, mese: 11, nome: 'Tutti i Santi' },
  { giorno: 8, mese: 12, nome: 'Immacolata' },
  { giorno: 25, mese: 12, nome: 'Natale' },
  { giorno: 26, mese: 12, nome: 'Santo Stefano' },
]

// Helper per ottenere il giorno della settimana
function getGiornoSettimana(data) {
  const d = new Date(data)
  return GIORNI_SETTIMANA[d.getDay()]
}

// Calcola Pasqua (algoritmo di Gauss)
function calcolaPasqua(anno) {
  const a = anno % 19
  const b = Math.floor(anno / 100)
  const c = anno % 100
  const d = Math.floor(b / 4)
  const e = b % 4
  const f = Math.floor((b + 8) / 25)
  const g = Math.floor((b - f + 1) / 3)
  const h = (19 * a + b - d - g + 15) % 30
  const i = Math.floor(c / 4)
  const k = c % 4
  const l = (32 + 2 * e + 2 * i - h - k) % 7
  const m = Math.floor((a + 11 * h + 22 * l) / 451)
  const mese = Math.floor((h + l - 7 * m + 114) / 31)
  const giorno = ((h + l - 7 * m + 114) % 31) + 1
  return new Date(anno, mese - 1, giorno)
}

// Helper per formattare data senza problemi di timezone
function formatDataLocale(anno, mese, giorno) {
  return `${anno}-${String(mese).padStart(2, '0')}-${String(giorno).padStart(2, '0')}`
}

// Genera festività per un anno specifico
function generaFestivitaAnno(anno) {
  const festivita = []

  // Festività fisse
  FESTIVITA_FISSE.forEach(f => {
    const data = new Date(anno, f.mese - 1, f.giorno)
    const giornoSettimana = data.getDay()
    festivita.push({
      data: formatDataLocale(anno, f.mese, f.giorno),
      nome: f.nome,
      giornoSettimana: GIORNI_SETTIMANA[giornoSettimana],
      anno: anno,
      infrasettimanale: giornoSettimana >= 1 && giornoSettimana <= 5, // Lun-Ven
      isWeekend: giornoSettimana === 0 || giornoSettimana === 6 // Dom o Sab
    })
  })

  // Pasqua e Pasquetta
  const pasqua = calcolaPasqua(anno)
  const pasquetta = new Date(pasqua)
  pasquetta.setDate(pasquetta.getDate() + 1)

  festivita.push({
    data: formatDataLocale(pasquetta.getFullYear(), pasquetta.getMonth() + 1, pasquetta.getDate()),
    nome: 'Pasquetta',
    giornoSettimana: GIORNI_SETTIMANA[pasquetta.getDay()],
    anno: anno,
    infrasettimanale: pasquetta.getDay() >= 1 && pasquetta.getDay() <= 5,
    isWeekend: pasquetta.getDay() === 0 || pasquetta.getDay() === 6
  })

  return festivita.sort((a, b) => a.data.localeCompare(b.data))
}

export default function OpeningHoursConfig({ centroId, onSave }) {
  const [hours, setHours] = useState([])
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [closures, setClosures] = useState([])
  const [showAddClosure, setShowAddClosure] = useState(false)
  const [closureType, setClosureType] = useState('single') // single, period, recurring
  const [addingFestivita, setAddingFestivita] = useState(false)

  const currentYear = new Date().getFullYear()
  const festivita2025 = generaFestivitaAnno(2025)
  const festivita2026 = generaFestivitaAnno(2026)
  const festivita2027 = generaFestivitaAnno(2027)

  useEffect(() => {
    loadHours()
    loadClosures()
  }, [centroId])

  async function loadHours() {
    try {
      const res = await fetch(`/api/opening-hours?centro_id=${centroId}`)
      const data = await res.json()
      if (!data.hours || data.hours.length === 0) {
        const defaultHours = GIORNI_FULL.map((giorno, idx) => ({
          giorno_settimana: idx,
          giorno,
          aperto: idx < 6,
          orario_apertura: '09:00',
          orario_chiusura: '19:00',
          note: ''
        }))
        setHours(defaultHours)
      } else {
        setHours(data.hours.map(h => ({ ...h, giorno: GIORNI_FULL[h.giorno_settimana] })))
      }
    } catch (error) {
      console.error('Errore caricamento orari:', error)
    }
    setLoading(false)
  }

  async function loadClosures() {
    try {
      const res = await fetch(`/api/closures?centro_id=${centroId}`)
      const data = await res.json()
      setClosures(data.closures || [])
    } catch (error) {
      console.error('Errore caricamento chiusure:', error)
    }
  }

  async function handleSave() {
    setSaving(true)
    try {
      const res = await fetch('/api/opening-hours', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ centro_id: centroId, hours })
      })
      if (res.ok) {
        alert('✅ Orari salvati!')
        if (onSave) onSave()
      }
    } catch (error) {
      console.error('Errore salvataggio:', error)
    }
    setSaving(false)
  }

  async function handleAddClosure(e) {
    e.preventDefault()
    const formData = new FormData(e.target)
    const dataInizio = formData.get('data_inizio')
    const dataFine = closureType === 'period' ? formData.get('data_fine') : dataInizio
    const motivo = formData.get('motivo')
    const ricorrente = closureType === 'recurring'
    const tipoRicorrenza = formData.get('tipo_ricorrenza')

    try {
      const res = await fetch('/api/closures', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          centro_id: centroId,
          data_inizio: dataInizio,
          data_fine: dataFine,
          motivo,
          ricorrente,
          tipo_ricorrenza: ricorrente ? tipoRicorrenza : null
        })
      })
      if (res.ok) {
        loadClosures()
        setShowAddClosure(false)
        e.target.reset()
      }
    } catch (error) {
      console.error('Errore aggiunta chiusura:', error)
    }
  }

  async function handleAddFestivita(festivita) {
    setAddingFestivita(true)
    let aggiunte = 0

    for (const f of festivita) {
      // Verifica se esiste già
      const esiste = closures.some(c => c.data_inizio === f.data)
      if (!esiste) {
        try {
          await fetch('/api/closures', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              centro_id: centroId,
              data_inizio: f.data,
              data_fine: f.data,
              motivo: `🎉 ${f.nome}`,
              ricorrente: true,
              tipo_ricorrenza: 'annuale'
            })
          })
          aggiunte++
        } catch (error) {
          console.error('Errore:', error)
        }
      }
    }

    await loadClosures()
    setAddingFestivita(false)
    if (aggiunte > 0) {
      alert(`✅ Aggiunte ${aggiunte} festività!`)
    } else {
      alert('Tutte le festività sono già presenti')
    }
  }

  async function handleDeleteClosure(id) {
    if (!confirm('Eliminare?')) return
    try {
      await fetch(`/api/closures?id=${id}`, { method: 'DELETE' })
      loadClosures()
    } catch (error) {
      console.error('Errore:', error)
    }
  }

  function updateHour(idx, field, value) {
    const newHours = [...hours]
    newHours[idx][field] = value
    setHours(newHours)
  }

  const totalWeeklyHours = hours.reduce((sum, h) => {
    if (!h.aperto || !h.orario_apertura || !h.orario_chiusura) return sum
    const [openH, openM] = h.orario_apertura.split(':').map(Number)
    const [closeH, closeM] = h.orario_chiusura.split(':').map(Number)
    return sum + (closeH + closeM / 60) - (openH + openM / 60)
  }, 0)

  // Conta giorni chiusura nel periodo
  function contaGiorniPeriodo(dataInizio, dataFine) {
    const start = new Date(dataInizio)
    const end = new Date(dataFine)
    return Math.ceil((end - start) / (1000 * 60 * 60 * 24)) + 1
  }

  if (loading) return <div className="text-center py-4 text-gray-500">Caricamento...</div>

  return (
    <div className="space-y-4">
      {/* Orari Settimanali - Compatto */}
      <div className="bg-white rounded-xl shadow border border-gray-100 p-4">
        <div className="flex items-center justify-between mb-3">
          <div className="flex items-center gap-2">
            <span className="text-xl">🕐</span>
            <div>
              <h3 className="font-bold text-gray-800">Orari Settimanali</h3>
              <p className="text-xs text-gray-500">{totalWeeklyHours.toFixed(0)}h/settimana</p>
            </div>
          </div>
          <button
            onClick={handleSave}
            disabled={saving}
            className="bg-purple-600 text-white px-4 py-1.5 rounded-lg text-sm font-medium hover:bg-purple-700 disabled:opacity-50"
          >
            {saving ? '...' : '💾 Salva'}
          </button>
        </div>

        {/* Griglia compatta */}
        <div className="grid grid-cols-7 gap-1 text-center mb-2">
          {GIORNI.map((g, i) => (
            <div key={i} className="text-xs font-semibold text-gray-500">{g}</div>
          ))}
        </div>
        <div className="grid grid-cols-7 gap-1">
          {hours.map((h, idx) => (
            <div
              key={idx}
              className={`p-2 rounded-lg border text-center cursor-pointer transition-all ${
                h.aperto
                  ? 'bg-green-50 border-green-300 hover:bg-green-100'
                  : 'bg-gray-100 border-gray-200 hover:bg-gray-200'
              }`}
              onClick={() => updateHour(idx, 'aperto', !h.aperto)}
            >
              <div className={`text-xs font-bold ${h.aperto ? 'text-green-700' : 'text-gray-400'}`}>
                {h.aperto ? '✓' : '✗'}
              </div>
              {h.aperto && (
                <div className="text-[10px] text-gray-600 mt-1">
                  {h.orario_apertura?.slice(0,5)}<br/>
                  {h.orario_chiusura?.slice(0,5)}
                </div>
              )}
            </div>
          ))}
        </div>

        {/* Form inline per modificare orari */}
        <div className="mt-3 pt-3 border-t border-gray-100">
          <div className="flex items-center gap-4 flex-wrap">
            <span className="text-xs text-gray-500">Orario predefinito:</span>
            <div className="flex items-center gap-1">
              <input
                type="time"
                value={hours[0]?.orario_apertura || '09:00'}
                onChange={(e) => hours.forEach((_, i) => updateHour(i, 'orario_apertura', e.target.value))}
                className="px-2 py-1 border rounded text-sm w-24"
              />
              <span className="text-gray-400">-</span>
              <input
                type="time"
                value={hours[0]?.orario_chiusura || '19:00'}
                onChange={(e) => hours.forEach((_, i) => updateHour(i, 'orario_chiusura', e.target.value))}
                className="px-2 py-1 border rounded text-sm w-24"
              />
            </div>
          </div>
        </div>
      </div>

      {/* Chiusure - Compatto */}
      <div className="bg-white rounded-xl shadow border border-gray-100 p-4">
        <div className="flex items-center justify-between mb-3">
          <div className="flex items-center gap-2">
            <span className="text-xl">🚫</span>
            <div>
              <h3 className="font-bold text-gray-800">Chiusure</h3>
              <p className="text-xs text-gray-500">{closures.length} programmate</p>
            </div>
          </div>
          <button
            onClick={() => setShowAddClosure(!showAddClosure)}
            className="bg-orange-600 text-white px-3 py-1.5 rounded-lg text-xs font-medium hover:bg-orange-700"
          >
            + Aggiungi
          </button>
        </div>

        {/* Pulsanti Festività per Anno */}
        <div className="mb-3 p-3 bg-amber-50 rounded-lg border border-amber-200">
          <div className="text-xs font-semibold text-amber-700 mb-2">🎉 Aggiungi Festività Italiane:</div>
          <div className="flex flex-wrap gap-2">
            {[
              { anno: 2025, festivita: festivita2025 },
              { anno: 2026, festivita: festivita2026 },
              { anno: 2027, festivita: festivita2027 }
            ].map(({ anno, festivita }) => {
              const nonAggiunte = festivita.filter(f => !f.isWeekend && !closures.some(c => c.data_inizio === f.data)).length
              return (
                <button
                  key={anno}
                  onClick={() => handleAddFestivita(festivita.filter(f => !f.isWeekend))}
                  disabled={addingFestivita || nonAggiunte === 0}
                  className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-all ${
                    nonAggiunte === 0
                      ? 'bg-gray-100 text-gray-400 cursor-not-allowed'
                      : 'bg-amber-500 text-white hover:bg-amber-600'
                  }`}
                  title={`Aggiunge ${nonAggiunte} festività lavorative del ${anno}`}
                >
                  {addingFestivita ? '...' : `${anno} (${nonAggiunte})`}
                </button>
              )
            })}
          </div>
        </div>

        {/* Form aggiunta chiusura */}
        {showAddClosure && (
          <div className="mb-3 p-3 bg-orange-50 rounded-lg border border-orange-200">
            <div className="flex gap-2 mb-2">
              {[
                { id: 'single', label: '📅 Giorno', desc: 'Un giorno' },
                { id: 'period', label: '📆 Periodo', desc: 'Dal - Al' },
                { id: 'recurring', label: '🔁 Ricorrente', desc: 'Ogni anno' }
              ].map(t => (
                <button
                  key={t.id}
                  onClick={() => setClosureType(t.id)}
                  className={`flex-1 px-2 py-1.5 rounded text-xs font-medium transition-all ${
                    closureType === t.id
                      ? 'bg-orange-600 text-white'
                      : 'bg-white text-gray-600 hover:bg-gray-100'
                  }`}
                >
                  {t.label}
                </button>
              ))}
            </div>

            <form onSubmit={handleAddClosure} className="space-y-2">
              <div className="flex gap-2">
                <div className="flex-1">
                  <label className="text-xs text-gray-600 block mb-1">
                    {closureType === 'period' ? 'Dal' : 'Data'}
                  </label>
                  <input
                    type="date"
                    name="data_inizio"
                    required
                    className="w-full px-2 py-1.5 border rounded text-sm"
                  />
                </div>
                {closureType === 'period' && (
                  <div className="flex-1">
                    <label className="text-xs text-gray-600 block mb-1">Al</label>
                    <input
                      type="date"
                      name="data_fine"
                      required
                      className="w-full px-2 py-1.5 border rounded text-sm"
                    />
                  </div>
                )}
                {closureType === 'recurring' && (
                  <div className="flex-1">
                    <label className="text-xs text-gray-600 block mb-1">Ricorrenza</label>
                    <select name="tipo_ricorrenza" className="w-full px-2 py-1.5 border rounded text-sm">
                      <option value="annuale">Annuale</option>
                      <option value="mensile">Mensile</option>
                    </select>
                  </div>
                )}
              </div>
              <div className="flex gap-2">
                <input
                  type="text"
                  name="motivo"
                  placeholder="Motivo (es: Ferie, Festività...)"
                  className="flex-1 px-2 py-1.5 border rounded text-sm"
                />
                <button
                  type="submit"
                  className="bg-orange-600 text-white px-4 py-1.5 rounded text-sm font-medium hover:bg-orange-700"
                >
                  Salva
                </button>
              </div>
            </form>
          </div>
        )}

        {/* Lista chiusure compatta */}
        <div className="space-y-1 max-h-60 overflow-y-auto">
          {closures.length === 0 ? (
            <p className="text-center text-gray-400 text-sm py-4">Nessuna chiusura programmata</p>
          ) : (
            closures.map((c) => {
              const giorni = contaGiorniPeriodo(c.data_inizio, c.data_fine)
              const isPeriodo = giorni > 1
              const dataInizio = new Date(c.data_inizio)
              const dataFine = new Date(c.data_fine)
              const giornoInizio = getGiornoSettimana(c.data_inizio)
              const giornoFine = getGiornoSettimana(c.data_fine)
              const anno = dataInizio.getFullYear()

              return (
                <div
                  key={c.id}
                  className="flex items-center justify-between py-2 px-3 bg-red-50 rounded border border-red-100 hover:bg-red-100"
                >
                  <div className="flex items-center gap-2 flex-1 min-w-0">
                    <span className="text-sm">
                      {c.ricorrente ? '🔁' : isPeriodo ? '📆' : '📅'}
                    </span>
                    <div className="flex-1 min-w-0">
                      <div className="text-sm font-medium text-gray-800 truncate">
                        <span className="text-purple-600 font-semibold">{giornoInizio}</span>
                        {' '}
                        {dataInizio.toLocaleDateString('it-IT', { day: 'numeric', month: 'short' })}
                        {!c.ricorrente && (
                          <span className="text-gray-400 text-xs ml-1">{anno}</span>
                        )}
                        {isPeriodo && !c.ricorrente && (
                          <>
                            <span className="text-gray-400 mx-1">→</span>
                            <span className="text-purple-600 font-semibold">{giornoFine}</span>
                            {' '}
                            {dataFine.toLocaleDateString('it-IT', { day: 'numeric', month: 'short' })}
                            <span className="text-xs text-orange-600 ml-1 font-medium">({giorni}gg)</span>
                          </>
                        )}
                      </div>
                      {c.motivo && (
                        <div className="text-xs text-gray-500 truncate">{c.motivo}</div>
                      )}
                    </div>
                    {c.ricorrente && (
                      <span className="text-[10px] bg-blue-100 text-blue-700 px-1.5 py-0.5 rounded font-medium">
                        {c.tipo_ricorrenza === 'annuale' ? 'ANNUALE' : 'MENSILE'}
                      </span>
                    )}
                  </div>
                  <button
                    onClick={() => handleDeleteClosure(c.id)}
                    className="text-red-500 hover:text-red-700 ml-2"
                  >
                    ✕
                  </button>
                </div>
              )
            })
          )}
        </div>

        {/* Preview festività non aggiunte per anno */}
        {[
          { anno: 2025, festivita: festivita2025 },
          { anno: 2026, festivita: festivita2026 },
          { anno: 2027, festivita: festivita2027 }
        ].map(({ anno, festivita }) => {
          const nonAggiunte = festivita.filter(f => !f.isWeekend && !closures.some(c => c.data_inizio === f.data))
          if (nonAggiunte.length === 0) return null

          return (
            <div key={anno} className="mt-3 pt-3 border-t border-gray-100">
              <div className="text-xs text-amber-600 font-medium mb-2">
                💡 Festività {anno} non ancora aggiunte ({nonAggiunte.length}):
              </div>
              <div className="flex flex-wrap gap-1">
                {nonAggiunte.map((f, i) => (
                  <span key={i} className="text-xs bg-amber-50 text-amber-700 px-2 py-1 rounded border border-amber-200">
                    <span className="font-semibold text-purple-600">{f.giornoSettimana}</span>
                    {' '}
                    {new Date(f.data).toLocaleDateString('it-IT', { day: 'numeric', month: 'short' })}
                    {' - '}
                    {f.nome}
                  </span>
                ))}
              </div>
            </div>
          )
        })}
      </div>
    </div>
  )
}
