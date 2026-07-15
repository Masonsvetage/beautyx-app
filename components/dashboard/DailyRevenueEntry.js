'use client'

import { useState } from 'react'

export default function DailyRevenueEntry({ onSave, currentTotal = 0 }) {
  const [isExpanded, setIsExpanded] = useState(false)
  const [payments, setPayments] = useState({
    pos: '',
    contanti: '',
    bonifici: '',
    altro: ''
  })
  const [saving, setSaving] = useState(false)

  const handlePaymentChange = (type, value) => {
    setPayments(prev => ({
      ...prev,
      [type]: value
    }))
  }

  const calculateTotal = () => {
    return Object.values(payments).reduce((sum, val) => {
      const num = parseFloat(val) || 0
      return sum + num
    }, 0)
  }

  const handleSave = async () => {
    const total = calculateTotal()
    if (total === 0) return

    setSaving(true)
    try {
      await onSave({
        pos: parseFloat(payments.pos) || 0,
        contanti: parseFloat(payments.contanti) || 0,
        bonifici: parseFloat(payments.bonifici) || 0,
        altro: parseFloat(payments.altro) || 0,
        totale: total
      })

      // Reset form
      setPayments({ pos: '', contanti: '', bonifici: '', altro: '' })
      setIsExpanded(false)
    } catch (error) {
      console.error('Errore salvataggio incasso:', error)
    } finally {
      setSaving(false)
    }
  }

  const total = calculateTotal()

  return (
    <div className="bg-gradient-to-br from-emerald-600/30 to-teal-600/30 backdrop-blur-xl rounded-xl p-4 border border-emerald-500/40" style={{
      boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.7), 0 10px 25px -5px rgba(16, 185, 129, 0.3), 0 0 0 1px rgba(16, 185, 129, 0.15)'
    }}>
      {/* Header */}
      <div className="flex items-center justify-between mb-3">
        <div>
          <h3 className="text-lg font-bold text-white">💰 Incasso Oggi</h3>
          <p className="text-xs text-emerald-200">Registra i pagamenti ricevuti</p>
        </div>
        <div className="text-right">
          <div className="text-3xl font-bold text-white">{currentTotal.toFixed(2)}€</div>
          <div className="text-xs text-emerald-200">Totale giornata</div>
        </div>
      </div>

      {/* Quick Add Button o Form Espanso */}
      {!isExpanded ? (
        <button
          onClick={() => setIsExpanded(true)}
          className="w-full py-3 bg-gradient-to-r from-emerald-500 to-teal-500 hover:from-emerald-600 hover:to-teal-600 text-white rounded-lg font-semibold transition-all shadow-lg hover:shadow-xl flex items-center justify-center gap-2"
        >
          <span className="text-xl">+</span>
          <span>Aggiungi Incasso</span>
        </button>
      ) : (
        <div className="space-y-3">
          {/* Split Pagamenti */}
          <div className="grid grid-cols-2 gap-2">
            {/* POS */}
            <div>
              <label className="text-xs text-emerald-200 font-semibold mb-1 block">
                💳 POS/Carte
              </label>
              <input
                type="number"
                step="0.01"
                value={payments.pos}
                onChange={(e) => handlePaymentChange('pos', e.target.value)}
                placeholder="0.00"
                className="w-full px-3 py-2 bg-slate-900/50 border border-emerald-500/40 rounded-lg text-white text-center font-semibold focus:outline-none focus:border-emerald-400 focus:ring-2 focus:ring-emerald-400/30"
              />
            </div>

            {/* Contanti */}
            <div>
              <label className="text-xs text-emerald-200 font-semibold mb-1 block">
                💵 Contanti
              </label>
              <input
                type="number"
                step="0.01"
                value={payments.contanti}
                onChange={(e) => handlePaymentChange('contanti', e.target.value)}
                placeholder="0.00"
                className="w-full px-3 py-2 bg-slate-900/50 border border-emerald-500/40 rounded-lg text-white text-center font-semibold focus:outline-none focus:border-emerald-400 focus:ring-2 focus:ring-emerald-400/30"
              />
            </div>

            {/* Bonifici */}
            <div>
              <label className="text-xs text-emerald-200 font-semibold mb-1 block">
                🏦 Bonifici
              </label>
              <input
                type="number"
                step="0.01"
                value={payments.bonifici}
                onChange={(e) => handlePaymentChange('bonifici', e.target.value)}
                placeholder="0.00"
                className="w-full px-3 py-2 bg-slate-900/50 border border-emerald-500/40 rounded-lg text-white text-center font-semibold focus:outline-none focus:border-emerald-400 focus:ring-2 focus:ring-emerald-400/30"
              />
            </div>

            {/* Altro */}
            <div>
              <label className="text-xs text-emerald-200 font-semibold mb-1 block">
                🎫 Altro
              </label>
              <input
                type="number"
                step="0.01"
                value={payments.altro}
                onChange={(e) => handlePaymentChange('altro', e.target.value)}
                placeholder="0.00"
                className="w-full px-3 py-2 bg-slate-900/50 border border-emerald-500/40 rounded-lg text-white text-center font-semibold focus:outline-none focus:border-emerald-400 focus:ring-2 focus:ring-emerald-400/30"
              />
            </div>
          </div>

          {/* Totale Calcolato */}
          {total > 0 && (
            <div className="bg-slate-900/50 rounded-lg p-3 border border-emerald-400/40">
              <div className="flex items-center justify-between">
                <span className="text-sm text-emerald-200 font-semibold">Totale da registrare:</span>
                <span className="text-2xl font-bold text-white">{total.toFixed(2)}€</span>
              </div>
            </div>
          )}

          {/* Bottoni Azione */}
          <div className="flex gap-2">
            <button
              onClick={() => setIsExpanded(false)}
              className="flex-1 py-2 bg-slate-700/50 hover:bg-slate-700/70 text-slate-200 rounded-lg font-semibold transition-all"
            >
              Annulla
            </button>
            <button
              onClick={handleSave}
              disabled={total === 0 || saving}
              className="flex-1 py-2 bg-gradient-to-r from-emerald-500 to-teal-500 hover:from-emerald-600 hover:to-teal-600 text-white rounded-lg font-semibold transition-all shadow-lg hover:shadow-xl disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {saving ? 'Salvataggio...' : `Registra ${total.toFixed(2)}€`}
            </button>
          </div>
        </div>
      )}
    </div>
  )
}
