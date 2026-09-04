'use client'

import { useState, useEffect, Suspense } from 'react'
import { useSearchParams } from 'next/navigation'
import { useAuth } from '@/contexts/AuthContext'
import { tokensToChars, formatTokens, formatChars } from '@/lib/token-utils'
import HelpTooltip from '@/components/common/HelpTooltip'

function formatTokensPage(n) {
  if (n === 0) return 'Illimitati'
  if (n < 0) return 'Illimitati'
  return formatTokens(n)
}

function formatCharsPage(n) {
  if (n === 0) return 'Illimitati'
  if (n < 0) return 'Illimitati'
  return formatChars(n)
}

const PLAN_FEATURES = {
  dashboard: 'Dashboard',
  movimenti: 'Movimenti',
  analytics_base: 'Analytics Base',
  analytics_avanzate: 'Analytics Avanzate',
  pianificazione: 'Pianificazione',
  obiettivi: 'Obiettivi',
  budget: 'Budget',
  report_pdf: 'Report PDF',
  piani_ottimizzazione: 'Piani Ottimizzazione',
  benchmark: 'Benchmark'
}

const STATO_BADGES = {
  attivo: { label: 'Attivo', color: 'bg-teal-500/20 text-teal-300 border-teal-500/30' },
  trial: { label: 'Trial', color: 'bg-amber-500/20 text-amber-300 border-amber-500/30' },
  scaduto: { label: 'Scaduto', color: 'bg-red-500/20 text-red-300 border-red-500/30' },
  sospeso: { label: 'Sospeso', color: 'bg-slate-500/20 text-slate-300 border-slate-500/30' },
  cancellato: { label: 'Cancellato', color: 'bg-red-500/20 text-red-400 border-red-500/30' }
}

// Bug fix (03/09/2026, collaudo Mason): useSearchParams() in un componente
// non avvolto da <Suspense> fa scattare "missing-suspense-with-csr-bailout"
// nel build/runtime di Next.js App Router (stesso pattern già corretto in
// app/login/page.js e app/centro/page.js) — a valle di un login da /report
// il flusso passa proprio da qui (via /impostazioni), quindi è un candidato
// concreto per la pagina di errore generico segnalata da Mason.
function AbbonamentoContent() {
  const searchParams = useSearchParams()
  const { profile } = useAuth()
  const [subscription, setSubscription] = useState(null)
  const [plans, setPlans] = useState([])
  const [addons, setAddons] = useState([])
  const [campaigns, setCampaigns] = useState([])
  const [purchases, setPurchases] = useState([])
  const [loading, setLoading] = useState(true)
  const [purchasing, setPurchasing] = useState(null)

  const success = searchParams.get('success')
  const canceled = searchParams.get('canceled')

  useEffect(() => {
    loadData()
  }, [])

  async function loadData() {
    try {
      const [subRes, plansRes, purchasesRes, addonsRes] = await Promise.all([
        fetch('/api/subscriptions/balance'),
        fetch('/api/subscriptions/plans'),
        fetch('/api/purchases').catch(() => ({ json: () => ({ purchases: [] }) })),
        fetch('/api/subscriptions/addons').catch(() => ({ json: () => ({ addons: [] }) }))
      ])

      const subData = await subRes.json()
      const plansData = await plansRes.json()
      const purchasesData = await purchasesRes.json()
      const addonsData = await addonsRes.json()

      if (subData && !subData.error) setSubscription(subData)
      if (plansData.plans) setPlans(plansData.plans)
      if (plansData.campaigns) setCampaigns(plansData.campaigns)
      if (purchasesData.purchases) setPurchases(purchasesData.purchases)
      if (addonsData.addons) setAddons(addonsData.addons)
    } catch (error) {
      console.error('Errore caricamento dati abbonamento:', error)
    } finally {
      setLoading(false)
    }
  }

  async function handleCheckout(planId, periodo = 'mensile') {
    setPurchasing(planId)
    try {
      const res = await fetch('/api/subscriptions/checkout', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ plan_id: planId, periodo })
      })
      const data = await res.json()
      if (data.url) {
        window.location.href = data.url
      } else {
        alert(data.error || 'Errore nel checkout')
      }
    } catch (error) {
      console.error('Errore checkout:', error)
      alert('Errore nel processo di acquisto')
    } finally {
      setPurchasing(null)
    }
  }

  async function handleAddonPurchase(addonId) {
    setPurchasing(addonId)
    try {
      const res = await fetch('/api/subscriptions/checkout', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ addon_id: addonId })
      })
      const data = await res.json()
      if (data.url) {
        window.location.href = data.url
      } else {
        alert(data.error || 'Errore nel checkout')
      }
    } catch (error) {
      console.error('Errore checkout addon:', error)
    } finally {
      setPurchasing(null)
    }
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-800 via-slate-900 to-slate-800 p-4 flex items-center justify-center">
        <div className="w-8 h-8 border-4 border-teal-500 border-t-transparent rounded-full animate-spin"></div>
      </div>
    )
  }

  const sub = subscription?.subscription
  const plan = subscription?.plan
  const usage = subscription?.usage

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-800 via-slate-900 to-slate-800 p-4">
      <div className="max-w-5xl mx-auto">
        {/* Header */}
        <div className="mb-6">
          <div className="flex items-center gap-3 mb-2">
            <a href="/impostazioni" className="text-slate-400 hover:text-white transition-colors">
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" /></svg>
            </a>
            <h1 className="text-2xl font-bold text-white">Gestione Abbonamento</h1>
            <HelpTooltip
              title="Gestione Abbonamento"
              content="Qui trovi il tuo piano attivo, i token AI consumati questo mese e le ore di consulenza HPA disponibili. I token si resettano ogni mese. Puoi acquistare pacchetti aggiuntivi di token che non scadono. Il piano si aggiorna automaticamente dopo l'acquisto tramite Stripe."
            />
          </div>
          <p className="text-slate-400 ml-8">Gestisci il tuo piano, monitora i consumi e acquista pacchetti aggiuntivi</p>
        </div>

        {/* Success/Error Messages */}
        {success && (
          <div className="mb-6 p-4 bg-teal-500/20 border border-teal-500/30 rounded-xl text-teal-300 flex items-center gap-3">
            <svg className="w-6 h-6 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" /></svg>
            <div>
              <p className="font-medium">Acquisto completato con successo!</p>
              <p className="text-sm text-teal-400">Il tuo abbonamento e stato aggiornato.</p>
            </div>
          </div>
        )}
        {canceled && (
          <div className="mb-6 p-4 bg-amber-500/20 border border-amber-500/30 rounded-xl text-amber-300 flex items-center gap-3">
            <svg className="w-6 h-6 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01" /></svg>
            <p className="font-medium">Acquisto annullato</p>
          </div>
        )}

        {/* Sezione 1: Piano Attuale */}
        <div className="mb-6 bg-slate-800/60 rounded-xl p-6 border border-slate-700/50">
          <h2 className="text-lg font-bold text-white mb-4 flex items-center gap-2">
            <span className="text-xl">📋</span> Piano Attuale
          </h2>

          {plan ? (
            <div>
              <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-4">
                <div className="bg-slate-900/40 rounded-lg p-4">
                  <p className="text-xs text-slate-400 mb-1">Piano</p>
                  <p className="text-lg font-bold text-teal-400">{plan.nome}</p>
                  {sub?.assegnato_da_admin && (
                    <span className="text-xs text-slate-500">Assegnato da admin</span>
                  )}
                </div>
                <div className="bg-slate-900/40 rounded-lg p-4">
                  <p className="text-xs text-slate-400 mb-1">Stato</p>
                  <span className={`inline-block px-2 py-1 rounded-lg text-sm font-medium border ${STATO_BADGES[sub?.stato]?.color || STATO_BADGES.attivo.color}`}>
                    {STATO_BADGES[sub?.stato]?.label || sub?.stato}
                  </span>
                </div>
                <div className="bg-slate-900/40 rounded-lg p-4">
                  <p className="text-xs text-slate-400 mb-1">Periodo</p>
                  <p className="text-lg font-semibold text-white capitalize">{sub?.periodo || 'Mensile'}</p>
                </div>
                <div className="bg-slate-900/40 rounded-lg p-4">
                  <p className="text-xs text-slate-400 mb-1">Scadenza</p>
                  <p className="text-lg font-semibold text-white">
                    {sub?.data_fine ? new Date(sub.data_fine).toLocaleDateString('it-IT') : 'Illimitato'}
                  </p>
                </div>
              </div>

              {/* Prezzo */}
              {!plan.is_free && (
                <div className="text-sm text-slate-400">
                  Prezzo: <span className="text-white font-medium">
                    {sub?.periodo === 'annuale'
                      ? `${plan.prezzo_annuale}€/anno`
                      : `${plan.prezzo_mensile}€/mese`
                    }
                  </span>
                </div>
              )}
            </div>
          ) : (
            <div className="text-center py-6">
              <p className="text-slate-400">Nessun abbonamento attivo</p>
              <p className="text-sm text-slate-500 mt-1">Scegli un piano per iniziare</p>
            </div>
          )}
        </div>

        {/* Sezione 2: Consumo */}
        {usage && plan && (
          <div className="mb-6 bg-slate-800/60 rounded-xl p-6 border border-slate-700/50">
            <h2 className="text-lg font-bold text-white mb-4 flex items-center gap-2">
              <span className="text-xl">📊</span> Consumo Mese Corrente
            </h2>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {/* Token AI / Caratteri */}
              <div>
                <div className="flex items-center justify-between mb-1">
                  <span className="text-sm text-slate-400">⚡ Caratteri AI</span>
                  <span className="text-sm font-medium text-white">
                    {formatCharsPage(tokensToChars(sub?.token_ai_usati || 0))} / {formatCharsPage(tokensToChars(plan.token_ai_mensili))}
                  </span>
                </div>
                <div className="h-3 bg-slate-700/50 rounded-full overflow-hidden">
                  <div
                    className={`h-full rounded-full transition-all ${
                      usage.token_percentage > 90 ? 'bg-red-500' :
                      usage.token_percentage > 70 ? 'bg-amber-500' :
                      'bg-teal-500'
                    }`}
                    style={{ width: `${Math.min(usage.token_percentage, 100)}%` }}
                  />
                </div>
                <p className="text-xs text-slate-500 mt-1">
                  {formatTokensPage(sub?.token_ai_usati || 0)} / {formatTokensPage(plan.token_ai_mensili)} token · {usage.token_percentage}%
                </p>
                {usage.token_percentage > 80 && plan.token_ai_mensili > 0 && (
                  <p className="text-xs text-amber-400 mt-0.5">
                    {usage.token_percentage >= 100 ? '⚠️ Limite raggiunto!' : '⚠️ Stai per raggiungere il limite'}
                  </p>
                )}
              </div>

              {/* Ore HPA */}
              <div>
                <div className="flex items-center justify-between mb-2">
                  <span className="text-sm text-slate-400">Ore HPA</span>
                  <span className="text-sm font-medium text-white">
                    {sub?.ore_hpa_usate || 0}h / {plan.ore_hpa_mensili > 0 ? `${plan.ore_hpa_mensili}h` : 'N/A'}
                  </span>
                </div>
                {plan.ore_hpa_mensili > 0 ? (
                  <div className="h-3 bg-slate-700/50 rounded-full overflow-hidden">
                    <div
                      className={`h-full rounded-full transition-all ${
                        usage.hpa_percentage > 90 ? 'bg-red-500' :
                        usage.hpa_percentage > 70 ? 'bg-amber-500' :
                        'bg-purple-500'
                      }`}
                      style={{ width: `${Math.min(usage.hpa_percentage, 100)}%` }}
                    />
                  </div>
                ) : (
                  <div className="h-3 bg-slate-700/50 rounded-full" />
                )}
              </div>
            </div>

            {/* Limiti piano */}
            <div className="mt-4 pt-4 border-t border-slate-700/50 grid grid-cols-2 md:grid-cols-4 gap-3">
              <div className="text-center">
                <p className="text-xs text-slate-500">Centri Max</p>
                <p className="text-sm font-semibold text-white">{plan.centri_max === 0 ? 'Illimitati' : plan.centri_max}</p>
              </div>
              <div className="text-center">
                <p className="text-xs text-slate-500">Utenti Max</p>
                <p className="text-sm font-semibold text-white">{plan.utenti_max === 0 ? 'Illimitati' : plan.utenti_max}</p>
              </div>
              <div className="text-center">
                <p className="text-xs text-slate-500">Caratteri AI/Mese</p>
                <p className="text-sm font-semibold text-white">{formatCharsPage(tokensToChars(plan.token_ai_mensili))}</p>
                <p className="text-xs text-slate-600">{formatTokensPage(plan.token_ai_mensili)} tok.</p>
              </div>
              <div className="text-center">
                <p className="text-xs text-slate-500">Ore HPA/Mese</p>
                <p className="text-sm font-semibold text-white">{plan.ore_hpa_mensili > 0 ? `${plan.ore_hpa_mensili}h` : 'N/A'}</p>
              </div>
            </div>
          </div>
        )}

        {/* Sezione 3: Confronto Piani */}
        <div className="mb-6">
          <h2 className="text-lg font-bold text-white mb-4 flex items-center gap-2">
            <span className="text-xl">🔄</span> Piani Disponibili
          </h2>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {plans.filter(p => !p.is_free).map(p => {
              const isCurrentPlan = plan?.codice === p.codice
              const isUpgrade = plan && p.ordine > (plans.find(pp => pp.codice === plan.codice)?.ordine || 0)

              return (
                <div
                  key={p.id}
                  className={`relative bg-slate-800/60 rounded-xl p-5 border transition-all ${
                    isCurrentPlan
                      ? 'border-teal-500/50 ring-1 ring-teal-500/20'
                      : 'border-slate-700/50 hover:border-slate-600/50'
                  }`}
                >
                  {isCurrentPlan && (
                    <div className="absolute -top-3 left-4 px-3 py-0.5 bg-teal-500 text-white text-xs font-medium rounded-full">
                      Piano Attuale
                    </div>
                  )}
                  {p.is_trial && (
                    <div className="absolute -top-3 right-4 px-3 py-0.5 bg-amber-500 text-white text-xs font-medium rounded-full">
                      Trial {p.durata_trial_giorni}gg
                    </div>
                  )}

                  <h3 className="text-xl font-bold text-white mt-1">{p.nome}</h3>
                  <p className="text-sm text-slate-400 mt-1 mb-4">{p.descrizione}</p>

                  <div className="mb-4">
                    {p.prezzo_mensile > 0 ? (
                      <>
                        <span className="text-3xl font-bold text-white">{p.prezzo_mensile}€</span>
                        <span className="text-slate-400">/mese</span>
                        {p.prezzo_annuale > 0 && (
                          <p className="text-xs text-teal-400 mt-1">
                            oppure {p.prezzo_annuale}€/anno (risparmi {Math.round(((p.prezzo_mensile * 12 - p.prezzo_annuale) / (p.prezzo_mensile * 12)) * 100)}%)
                          </p>
                        )}
                      </>
                    ) : (
                      <>
                        <span className="text-3xl font-bold text-white">Gratis</span>
                        {p.is_trial && <span className="text-slate-400 ml-2">per {p.durata_trial_giorni} giorni</span>}
                      </>
                    )}
                  </div>

                  {/* Limiti */}
                  <div className="space-y-2 mb-4">
                    <div className="flex justify-between text-sm">
                      <span className="text-slate-400">⚡ Caratteri AI</span>
                      <div className="text-right">
                        <span className="text-white font-medium">{formatCharsPage(tokensToChars(p.token_ai_mensili))}/mese</span>
                        <p className="text-xs text-slate-500">{formatTokensPage(p.token_ai_mensili)} token</p>
                      </div>
                    </div>
                    <div className="flex justify-between text-sm">
                      <span className="text-slate-400">Ore HPA</span>
                      <span className="text-white font-medium">{p.ore_hpa_mensili > 0 ? `${p.ore_hpa_mensili}h/mese` : '-'}</span>
                    </div>
                    <div className="flex justify-between text-sm">
                      <span className="text-slate-400">Centri</span>
                      <span className="text-white font-medium">{p.centri_max === 0 ? 'Illimitati' : p.centri_max}</span>
                    </div>
                    <div className="flex justify-between text-sm">
                      <span className="text-slate-400">Utenti</span>
                      <span className="text-white font-medium">{p.utenti_max === 0 ? 'Illimitati' : p.utenti_max}</span>
                    </div>
                  </div>

                  {/* Funzionalita */}
                  <div className="mb-4">
                    <p className="text-xs text-slate-500 mb-2">Funzionalita incluse:</p>
                    <div className="flex flex-wrap gap-1">
                      {(p.funzionalita || []).map(f => (
                        <span key={f} className="px-2 py-0.5 bg-slate-700/50 text-slate-300 rounded text-xs">
                          {PLAN_FEATURES[f] || f}
                        </span>
                      ))}
                    </div>
                  </div>

                  {!isCurrentPlan && (
                    <button
                      onClick={() => handleCheckout(p.id)}
                      disabled={purchasing === p.id}
                      className={`w-full py-2.5 rounded-lg font-medium text-sm transition-all disabled:opacity-50 ${
                        isUpgrade
                          ? 'bg-teal-600 hover:bg-teal-500 text-white'
                          : 'bg-slate-700 hover:bg-slate-600 text-white'
                      }`}
                    >
                      {purchasing === p.id ? (
                        <span className="flex items-center justify-center gap-2">
                          <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                          Elaborazione...
                        </span>
                      ) : (
                        isUpgrade ? 'Upgrade' : p.is_trial ? 'Prova Gratis' : 'Cambia Piano'
                      )}
                    </button>
                  )}
                </div>
              )
            })}
          </div>
        </div>

        {/* Sezione 4: Pacchetti Caratteri Extra */}
        {plan && ['base', 'pro', 'advanced'].includes(plan.codice) && (
          <AddonSection addons={addons} onPurchase={handleAddonPurchase} purchasing={purchasing} />
        )}

        {/* Sezione 5: Campagne */}
        {campaigns.length > 0 && (
          <div className="mb-6">
            <h2 className="text-lg font-bold text-white mb-4 flex items-center gap-2">
              <span className="text-xl">🎁</span> Offerte Attive
            </h2>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {campaigns.map(c => (
                <div key={c.id} className="bg-gradient-to-br from-teal-900/30 to-cyan-900/20 rounded-xl p-5 border border-teal-500/30">
                  <h3 className="font-bold text-white">{c.nome}</h3>
                  <p className="text-sm text-slate-400 mt-1">{c.descrizione}</p>
                  <div className="mt-3 flex items-center gap-2">
                    <span className="px-2 py-1 bg-teal-500/20 text-teal-300 rounded-lg text-sm font-medium">
                      {c.tipo_sconto === 'percentuale' ? `-${c.valore_sconto}%` :
                       c.tipo_sconto === 'fisso' ? `-${c.valore_sconto}€` :
                       `${c.valore_sconto}€`}
                    </span>
                    {c.codice_promo && (
                      <span className="px-2 py-1 bg-slate-700/50 text-slate-300 rounded-lg text-xs font-mono">
                        {c.codice_promo}
                      </span>
                    )}
                    {c.data_fine && (
                      <span className="text-xs text-slate-500">
                        Scade il {new Date(c.data_fine).toLocaleDateString('it-IT')}
                      </span>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Sezione 6: Storico Acquisti */}
        {purchases.length > 0 && (
          <div className="mb-6">
            <h2 className="text-lg font-bold text-white mb-4 flex items-center gap-2">
              <span className="text-xl">🧾</span> Storico Acquisti
            </h2>
            <div className="bg-slate-800/60 rounded-xl border border-slate-700/50 overflow-hidden">
              <table className="w-full">
                <thead>
                  <tr className="border-b border-slate-700/50">
                    <th className="text-left px-4 py-3 text-xs font-medium text-slate-400">Data</th>
                    <th className="text-left px-4 py-3 text-xs font-medium text-slate-400">Tipo</th>
                    <th className="text-left px-4 py-3 text-xs font-medium text-slate-400">Importo</th>
                    <th className="text-left px-4 py-3 text-xs font-medium text-slate-400">Stato</th>
                  </tr>
                </thead>
                <tbody>
                  {purchases.map(p => (
                    <tr key={p.id} className="border-b border-slate-700/30 hover:bg-slate-700/20">
                      <td className="px-4 py-3 text-sm text-slate-300">
                        {new Date(p.created_at).toLocaleDateString('it-IT')}
                      </td>
                      <td className="px-4 py-3 text-sm text-slate-300 capitalize">{p.tipo}</td>
                      <td className="px-4 py-3 text-sm text-white font-medium">
                        {p.importo}€
                        {p.sconto_applicato > 0 && (
                          <span className="text-xs text-teal-400 ml-1">(-{p.sconto_applicato}€)</span>
                        )}
                      </td>
                      <td className="px-4 py-3">
                        <span className={`px-2 py-0.5 rounded text-xs font-medium ${
                          p.stato === 'completato' ? 'bg-teal-500/20 text-teal-300' :
                          p.stato === 'pending' ? 'bg-amber-500/20 text-amber-300' :
                          p.stato === 'rimborsato' ? 'bg-blue-500/20 text-blue-300' :
                          'bg-red-500/20 text-red-300'
                        }`}>
                          {p.stato}
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* FAQ */}
        <div className="mb-8">
          <h2 className="text-lg font-bold text-white mb-4 flex items-center gap-2">
            <span className="text-xl">❓</span> Domande Frequenti
          </h2>
          <div className="space-y-3">
            <div className="bg-slate-800/40 rounded-xl p-4 border border-slate-700/50">
              <h3 className="font-medium text-white mb-1">Come funzionano i caratteri AI?</h3>
              <p className="text-sm text-slate-400">
                Ogni conversazione con Beautyx consuma caratteri. 1 token ≈ 4 caratteri (modelli Claude).
                Il contatore si resetta ogni mese. Puoi vedere il consumo odierno cliccando ⚡ nella barra in alto.
              </p>
            </div>
            <div className="bg-slate-800/40 rounded-xl p-4 border border-slate-700/50">
              <h3 className="font-medium text-white mb-1">Posso cambiare piano?</h3>
              <p className="text-sm text-slate-400">
                Si, puoi fare upgrade o downgrade in qualsiasi momento. Il cambio sara effettivo immediatamente.
              </p>
            </div>
            <div className="bg-slate-800/40 rounded-xl p-4 border border-slate-700/50">
              <h3 className="font-medium text-white mb-1">Cosa succede quando finiscono i caratteri?</h3>
              <p className="text-sm text-slate-400">
                Quando raggiungi il limite mensile, Beautyx non potrà rispondere fino al reset del mese successivo.
                Con i piani Starter, Professional ed Enterprise puoi acquistare pacchetti extra di caratteri per continuare subito.
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}

function AddonSection({ addons = [], onPurchase, purchasing }) {
  if (addons.length === 0) return null

  return (
    <div className="mb-6">
      <h2 className="text-lg font-bold text-white mb-1 flex items-center gap-2">
        <span className="text-xl">⚡</span> Pacchetti Caratteri Extra
      </h2>
      <p className="text-sm text-slate-400 mb-4">
        Aggiungi caratteri al tuo piano senza aspettare il reset mensile. Disponibili immediatamente dopo l'acquisto.
      </p>
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {addons.map(addon => (
          <div
            key={addon.id}
            className="bg-slate-800/60 rounded-xl p-5 border border-slate-700/50 hover:border-teal-600/40 transition-all flex flex-col"
          >
            <div className="flex items-start justify-between mb-3">
              <div>
                <p className="text-lg font-bold text-white">
                  {formatCharsPage(tokensToChars(addon.token_ai_bonus))} car.
                </p>
                <p className="text-xs text-slate-500">{formatTokensPage(addon.token_ai_bonus)} token</p>
              </div>
              <div className="text-right">
                <p className="text-xl font-bold text-teal-400">€{Number(addon.prezzo).toFixed(2)}</p>
                {addon.prezzo_originale && Number(addon.prezzo_originale) > Number(addon.prezzo) && (
                  <p className="text-xs text-slate-500 line-through">€{Number(addon.prezzo_originale).toFixed(2)}</p>
                )}
              </div>
            </div>
            {addon.descrizione && (
              <p className="text-sm text-slate-400 mb-4 flex-1">{addon.descrizione}</p>
            )}
            <button
              onClick={() => onPurchase(addon.id)}
              disabled={purchasing === addon.id}
              className="w-full py-2.5 bg-teal-600 hover:bg-teal-500 disabled:opacity-50 text-white text-sm font-bold rounded-lg transition-all flex items-center justify-center gap-2"
            >
              {purchasing === addon.id ? (
                <>
                  <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                  Elaborazione...
                </>
              ) : (
                '⚡ Acquista ora'
              )}
            </button>
          </div>
        ))}
      </div>
    </div>
  )
}

export default function AbbonamentoPage() {
  return (
    <Suspense fallback={null}>
      <AbbonamentoContent />
    </Suspense>
  )
}
