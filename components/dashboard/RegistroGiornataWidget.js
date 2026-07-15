'use client'
import { useState, useEffect } from 'react'
import { useBeautyx } from '@/contexts/BeautyxContext'

const METODO_LABEL = { pos: 'POS', contanti: 'Contanti', satispay: 'Satispay', bonifico: 'Bonifico', altro: 'Altro' }
const METODO_COLOR = { pos: 'text-blue-400', contanti: 'text-teal-400', satispay: 'text-purple-400', bonifico: 'text-amber-400', altro: 'text-slate-400' }

export default function RegistroGiornataWidget({ centroId }) {
  const [data, setData] = useState(null)
  const [loading, setLoading] = useState(true)
  const { openSidebar, sendMessage } = useBeautyx()

  const fetchData = () => {
    if (!centroId) return
    fetch(`/api/registro/giornata?centro_id=${centroId}`)
      .then(r => r.json())
      .then(d => setData(d))
      .catch(() => {})
      .finally(() => setLoading(false))
  }

  useEffect(() => {
    fetchData()
  }, [centroId])

  useEffect(() => {
    window.addEventListener('registro:updated', fetchData)
    return () => window.removeEventListener('registro:updated', fetchData)
  }, [centroId])

  const openChat = (prompt) => {
    openSidebar()
    setTimeout(() => sendMessage(prompt), 300)
  }

  const giornata      = data?.giornata
  const creditiAperti = data?.crediti_aperti || []
  const pagamenti     = data?.pagamenti || []

  // Raggruppa pagamenti per metodo
  const perMetodo = {}
  pagamenti.forEach(p => { perMetodo[p.metodo] = (perMetodo[p.metodo] || 0) + Number(p.importo) })

  const incasso = Number(giornata?.incasso_effettivo || 0)
  const spese   = Number(giornata?.spese_totali || 0)
  const netti   = incasso - spese

  if (loading) return (
    <div className="bg-slate-800/50 backdrop-blur-xl rounded border border-slate-600/40 p-4 animate-pulse h-32" />
  )

  return (
    <div className="bg-slate-800/50 backdrop-blur-xl rounded border border-slate-600/40 p-4" style={{
      boxShadow: '0 10px 30px -5px rgba(0,0,0,0.5), 0 0 0 1px rgba(148,163,184,0.1)'
    }}>
      {/* Header */}
      <div className="flex items-center justify-between mb-3">
        <div className="flex items-center gap-2">
          <span className="text-base">📓</span>
          <h3 className="text-sm font-bold text-slate-100">Registro Oggi</h3>
          {creditiAperti.length > 0 && (
            <span className="px-1.5 py-0.5 bg-amber-500/20 text-amber-300 text-[10px] rounded border border-amber-500/30 font-medium">
              {creditiAperti.length} crediti aperti
            </span>
          )}
        </div>
        <span className="text-[10px] text-slate-500">
          {new Date().toLocaleDateString('it-IT', { weekday: 'short', day: 'numeric', month: 'short' })}
        </span>
      </div>

      {!giornata ? (
        /* Stato vuoto */
        <div className="text-center py-3">
          <p className="text-slate-400 text-xs mb-3">Nessun dato registrato oggi.</p>
          <button
            onClick={() => openChat('Voglio registrare il primo incasso di oggi')}
            className="px-3 py-1.5 bg-teal-600/80 hover:bg-teal-600 text-white text-xs rounded font-medium transition-all"
          >
            🎤 Registra con BeautyX
          </button>
        </div>
      ) : (
        <>
          {/* KPI row */}
          <div className="grid grid-cols-3 gap-2 mb-3">
            <div className="bg-slate-900/40 rounded p-2 text-center">
              <div className="text-teal-400 font-bold text-base">€{incasso.toFixed(0)}</div>
              <div className="text-slate-500 text-[10px]">Incassato</div>
            </div>
            <div className="bg-slate-900/40 rounded p-2 text-center">
              <div className={`font-bold text-base ${spese > 0 ? 'text-red-400' : 'text-slate-400'}`}>€{spese.toFixed(0)}</div>
              <div className="text-slate-500 text-[10px]">Spese</div>
            </div>
            <div className="bg-slate-900/40 rounded p-2 text-center">
              <div className={`font-bold text-base ${netti >= 0 ? 'text-emerald-400' : 'text-red-400'}`}>€{netti.toFixed(0)}</div>
              <div className="text-slate-500 text-[10px]">Netto</div>
            </div>
          </div>

          {/* Clienti + metodi pagamento */}
          <div className="flex items-center justify-between mb-3">
            <div className="flex items-center gap-3 text-xs text-slate-400">
              {giornata.n_clienti > 0 && <span>👥 {giornata.n_clienti} clienti</span>}
              {giornata.n_servizi > 0 && <span>✂️ {giornata.n_servizi} servizi</span>}
            </div>
            <div className="flex gap-1.5">
              {Object.entries(perMetodo).map(([metodo, importo]) => (
                <span key={metodo} className={`text-[10px] font-medium ${METODO_COLOR[metodo] || 'text-slate-400'}`}>
                  {METODO_LABEL[metodo]}: €{Number(importo).toFixed(0)}
                </span>
              ))}
            </div>
          </div>

          {/* Crediti in scadenza */}
          {creditiAperti.length > 0 && (
            <div className="border-t border-slate-700/50 pt-2 mb-2">
              <div className="text-[10px] text-amber-400 font-medium mb-1">Crediti aperti:</div>
              {creditiAperti.slice(0, 2).map(c => (
                <div key={c.id} className="flex items-center justify-between text-[10px] text-slate-400 mb-0.5">
                  <span>{c.nome_cliente}{c.servizio ? ` (${c.servizio})` : ''}</span>
                  <span className="text-amber-300 font-medium">€{Number(c.residuo).toFixed(0)}</span>
                </div>
              ))}
              {creditiAperti.length > 2 && <div className="text-[10px] text-slate-500">+{creditiAperti.length - 2} altri</div>}
            </div>
          )}

          {/* Azioni rapide */}
          <div className="flex gap-1.5 flex-wrap">
            <button
              onClick={() => openChat('Segna un nuovo incasso di oggi')}
              className="px-2 py-1 bg-teal-700/40 hover:bg-teal-600/60 text-teal-300 text-[10px] rounded transition-all"
            >
              + Incasso
            </button>
            <button
              onClick={() => openChat('Registra una spesa di oggi')}
              className="px-2 py-1 bg-slate-700/40 hover:bg-slate-600/60 text-slate-300 text-[10px] rounded transition-all"
            >
              + Spesa
            </button>
            {creditiAperti.length > 0 && (
              <button
                onClick={() => openChat('Mostrami tutti i crediti aperti')}
                className="px-2 py-1 bg-amber-700/30 hover:bg-amber-600/40 text-amber-300 text-[10px] rounded transition-all"
              >
                Crediti aperti
              </button>
            )}
            <button
              onClick={() => openChat('Com\'è andata oggi? Analizza la giornata')}
              className="px-2 py-1 bg-slate-700/40 hover:bg-slate-600/60 text-slate-300 text-[10px] rounded transition-all"
            >
              📊 Analisi
            </button>
          </div>
        </>
      )}
    </div>
  )
}
