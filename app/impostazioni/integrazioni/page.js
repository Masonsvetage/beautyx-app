'use client'

import { useState, useEffect } from 'react'
import Link from 'next/link'

// ─── Definizione integrazioni disponibili ─────────────────────────────────────
const INTEGRATIONS = [
  {
    id: 'koibox',
    nome: 'Koibox',
    icon: '🔗',
    desc: 'Importa clienti, appuntamenti, casse e servizi dal tuo gestionale Koibox.',
    tipo: 'gestionale',
    attiva: true,
    href: '/impostazioni/integrazioni/koibox',
    color: 'teal',
  },
  {
    id: 'mindbody',
    nome: 'Mindbody',
    icon: '📅',
    desc: 'Connetti il gestionale Mindbody per sincronizzare i tuoi dati.',
    tipo: 'gestionale',
    attiva: false,
    href: null,
    color: 'slate',
  },
  {
    id: 'fresha',
    nome: 'Fresha',
    icon: '✂️',
    desc: 'Importa i dati dal gestionale Fresha (ex Shedul).',
    tipo: 'gestionale',
    attiva: false,
    href: null,
    color: 'slate',
  },
  {
    id: 'email',
    nome: 'Email',
    icon: '✉️',
    desc: 'Collega Gmail o Outlook per gestire le comunicazioni con i clienti.',
    tipo: 'comunicazione',
    attiva: false,
    href: null,
    color: 'slate',
  },
]

const COLOR_ACTIVE = {
  teal: {
    card:   'bg-teal-500/8 border-teal-500/30 hover:border-teal-400/50',
    icon:   'bg-gradient-to-br from-teal-500/20 to-cyan-500/20 border border-teal-500/30',
    text:   'text-teal-400',
    badge:  'bg-teal-500/15 text-teal-400 border-teal-500/30',
    btn:    'bg-teal-500 hover:bg-teal-400 text-slate-900',
  },
}

// ─── Helpers ─────────────────────────────────────────────────────────────────

function formatLastImport(isoString) {
  if (!isoString) return null
  const d = new Date(isoString)
  const now = new Date()
  const diff = Math.floor((now - d) / 86400000)
  if (diff === 0) return 'oggi'
  if (diff === 1) return 'ieri'
  if (diff < 30) return `${diff} giorni fa`
  if (diff < 365) return `${Math.floor(diff / 30)} mesi fa`
  return d.toLocaleDateString('it-IT', { day: '2-digit', month: 'short', year: 'numeric' })
}

// ─── Card integrazione ────────────────────────────────────────────────────────
function IntegrationCard({ integration, koiboxStatus }) {
  const { attiva, color, icon, nome, desc, href } = integration
  const c = attiva ? COLOR_ACTIVE[color] : null

  // Calcola status Koibox
  let statusLine = null
  if (integration.id === 'koibox' && koiboxStatus) {
    const tablesImported = Object.values(koiboxStatus).filter(s => s.total > 0).length
    const lastDates = Object.values(koiboxStatus).map(s => s.last_import).filter(Boolean)
    const latestDate = lastDates.length > 0 ? lastDates.sort().at(-1) : null

    if (tablesImported === 0) {
      statusLine = { dot: 'bg-slate-500', text: 'Mai importato', sub: null }
    } else {
      statusLine = {
        dot: 'bg-teal-400',
        text: `${tablesImported} categor${tablesImported === 1 ? 'ia' : 'ie'} importat${tablesImported === 1 ? 'a' : 'e'}`,
        sub: latestDate ? `Ultima sync: ${formatLastImport(latestDate)}` : null,
      }
    }
  }

  if (!attiva) {
    return (
      <div className="rounded-2xl border border-slate-700/40 bg-slate-800/20 p-5 flex flex-col gap-4 opacity-60">
        <div className="flex items-center gap-3">
          <div className="w-11 h-11 rounded-xl bg-slate-700/40 border border-slate-600/30 flex items-center justify-center text-2xl">
            {icon}
          </div>
          <div>
            <p className="font-semibold text-slate-300">{nome}</p>
            <p className="text-xs text-slate-500">{desc}</p>
          </div>
        </div>
        <div className="flex items-center justify-between">
          <span className="text-xs px-2.5 py-1 rounded-full bg-slate-700/50 text-slate-500 border border-slate-600/30">
            Prossimamente
          </span>
        </div>
      </div>
    )
  }

  return (
    <div className={`rounded-2xl border p-5 flex flex-col gap-4 transition-all ${c.card}`}>
      <div className="flex items-center gap-3">
        <div className={`w-11 h-11 rounded-xl flex items-center justify-center text-2xl ${c.icon}`}>
          {icon}
        </div>
        <div className="flex-1 min-w-0">
          <p className={`font-semibold ${c.text}`}>{nome}</p>
          <p className="text-xs text-slate-400 mt-0.5">{desc}</p>
        </div>
      </div>

      {statusLine && (
        <div className="flex items-center gap-2">
          <div className={`w-2 h-2 rounded-full flex-shrink-0 ${statusLine.dot}`} />
          <div>
            <p className="text-xs text-slate-300">{statusLine.text}</p>
            {statusLine.sub && <p className="text-xs text-slate-500">{statusLine.sub}</p>}
          </div>
        </div>
      )}

      <div className="flex items-center justify-between mt-auto pt-1">
        <span className={`text-xs px-2.5 py-1 rounded-full border ${c.badge}`}>
          Attivo
        </span>
        {href && (
          <Link href={href}
            className={`text-sm font-medium px-4 py-1.5 rounded-xl transition-colors ${c.btn}`}>
            Gestisci →
          </Link>
        )}
      </div>
    </div>
  )
}

// ─── Pagina Hub ───────────────────────────────────────────────────────────────
export default function IntegrazioniPage() {
  const [koiboxStatus, setKoiboxStatus] = useState(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    fetch('/api/user/koibox/status')
      .then(r => r.json())
      .then(d => { if (d.status) setKoiboxStatus(d.status) })
      .catch(() => {})
      .finally(() => setLoading(false))
  }, [])

  const gestionali = INTEGRATIONS.filter(i => i.tipo === 'gestionale')
  const comunicazione = INTEGRATIONS.filter(i => i.tipo === 'comunicazione')

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900 p-4 md:p-6">
      <div className="max-w-4xl mx-auto space-y-8">

        {/* Header */}
        <div>
          <div className="flex items-center gap-2 text-xs text-slate-500 mb-4">
            <Link href="/impostazioni" className="hover:text-slate-300 transition-colors">Impostazioni</Link>
            <span>/</span>
            <span className="text-slate-300">Integrazioni</span>
          </div>
          <h1 className="text-2xl font-bold text-white">Integrazioni</h1>
          <p className="text-slate-400 text-sm mt-1">
            Connetti il tuo gestionale e altri strumenti per potenziare le analisi AI di BeautyX.
          </p>
        </div>

        {/* Gestionali */}
        <section className="space-y-4">
          <div className="flex items-center gap-2">
            <h2 className="text-sm font-semibold text-slate-300 uppercase tracking-wider">Gestionali</h2>
            <div className="flex-1 h-px bg-slate-700/50" />
          </div>
          <div className={`grid gap-4 ${gestionali.length > 1 ? 'grid-cols-1 md:grid-cols-2 lg:grid-cols-3' : 'grid-cols-1 sm:grid-cols-2'}`}>
            {gestionali.map(i => (
              <IntegrationCard key={i.id} integration={i}
                koiboxStatus={!loading && i.id === 'koibox' ? koiboxStatus : undefined} />
            ))}
          </div>
        </section>

        {/* Comunicazione */}
        <section className="space-y-4">
          <div className="flex items-center gap-2">
            <h2 className="text-sm font-semibold text-slate-300 uppercase tracking-wider">Comunicazione</h2>
            <div className="flex-1 h-px bg-slate-700/50" />
          </div>
          <div className="grid gap-4 grid-cols-1 sm:grid-cols-2">
            {comunicazione.map(i => (
              <IntegrationCard key={i.id} integration={i} />
            ))}
          </div>
        </section>

        {/* Footer info */}
        <div className="bg-slate-800/30 border border-slate-700/40 rounded-xl p-4 flex gap-3 items-start">
          <span className="text-slate-500 text-lg flex-shrink-0">💡</span>
          <div>
            <p className="text-sm text-slate-300 font-medium">Hai un gestionale non in elenco?</p>
            <p className="text-xs text-slate-500 mt-0.5">
              Contatta il tuo HPA di riferimento o scrivi a{' '}
              <span className="text-teal-400">supporto@beautyx.it</span> per richiedere l&apos;integrazione.
            </p>
          </div>
        </div>

      </div>
    </div>
  )
}
