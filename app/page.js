'use client'

import { useState, useEffect, useRef } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { useAuth } from '@/contexts/AuthContext'

const CAT_COLORS = {
  novita: 'bg-teal-500/20 text-teal-300 border-teal-500/30',
  aggiornamento: 'bg-blue-500/20 text-blue-300 border-blue-500/30',
  evento: 'bg-purple-500/20 text-purple-300 border-purple-500/30',
  offerta: 'bg-amber-500/20 text-amber-300 border-amber-500/30'
}
const CAT_LABELS = { novita: 'Novità', aggiornamento: 'Aggiornamento', evento: 'Evento', offerta: 'Offerta' }
const CAT_COLORS_LIGHT = {
  novita: 'bg-teal-50 text-teal-700 border-teal-200',
  aggiornamento: 'bg-blue-50 text-blue-700 border-blue-200',
  evento: 'bg-purple-50 text-purple-700 border-purple-200',
  offerta: 'bg-amber-50 text-amber-700 border-amber-200',
}

function AnimatedCounter({ target, suffix = '', duration = 1800 }) {
  const [value, setValue] = useState(0)
  const ref = useRef(null)
  const animated = useRef(false)

  useEffect(() => {
    const observer = new IntersectionObserver(([entry]) => {
      if (entry.isIntersecting && !animated.current) {
        animated.current = true
        const num = parseFloat(target)
        const isDecimal = target.toString().includes('.')
        const steps = 60
        const increment = num / steps
        let current = 0
        const timer = setInterval(() => {
          current += increment
          if (current >= num) { current = num; clearInterval(timer) }
          setValue(isDecimal ? parseFloat(current.toFixed(1)) : Math.floor(current))
        }, duration / steps)
      }
    }, { threshold: 0.3 })
    if (ref.current) observer.observe(ref.current)
    return () => observer.disconnect()
  }, [target, duration])

  return <span ref={ref}>{value}{suffix}</span>
}

function ReviewGrid({ reviews }) {
  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
      {reviews.map(r => (
        <div key={r.id} className="bg-slate-800/60 rounded-xl p-6 border border-slate-700/50 flex flex-col gap-3">
          <StarDisplay rating={r.rating} />
          <p className="text-slate-300 text-sm leading-relaxed italic flex-1">&ldquo;{r.review}&rdquo;</p>
          <div className="flex items-center justify-between pt-2 border-t border-slate-700/50">
            <div className="flex items-center gap-2">
              <div className={`w-7 h-7 rounded-full flex items-center justify-center text-xs font-bold ${r.target_type === 'hpa' ? 'bg-purple-500/20 text-purple-400' : 'bg-teal-500/20 text-teal-400'}`}>
                {r.target_type === 'hpa' ? '👤' : '✨'}
              </div>
              <span className="text-xs text-slate-500">
                {r.target_type === 'hpa' ? `Consulente ${r.target_name || 'HPA'}` : 'Beautyx AI'}
              </span>
            </div>
            {r.approved_at && (
              <span className="text-xs text-slate-600">
                {new Date(r.approved_at).toLocaleDateString('it-IT', { month: 'short', year: 'numeric' })}
              </span>
            )}
          </div>
        </div>
      ))}
    </div>
  )
}

function StarDisplay({ rating }) {
  return (
    <div className="flex gap-0.5">
      {[1, 2, 3, 4, 5].map(s => (
        <svg key={s} className={`w-4 h-4 ${s <= rating ? 'text-amber-400' : 'text-slate-600'}`} fill="currentColor" viewBox="0 0 24 24">
          <path d="M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z" />
        </svg>
      ))}
    </div>
  )
}

function ShareButtons({ title }) {
  const [copied, setCopied] = useState(false)
  const url = typeof window !== 'undefined' ? window.location.href : ''
  const waText = encodeURIComponent(`${title} — ${url}`)

  const copyLink = async () => {
    try {
      await navigator.clipboard.writeText(url)
      setCopied(true)
      setTimeout(() => setCopied(false), 2000)
    } catch { /* silently fail */ }
  }

  return (
    <div className="flex items-center gap-2 flex-wrap">
      <span className="text-xs text-gray-400">Condividi</span>
      <a href={`https://wa.me/?text=${waText}`} target="_blank" rel="noopener noreferrer"
        className="flex items-center gap-1.5 px-3 py-1.5 bg-green-50 hover:bg-green-100 text-green-700 rounded-lg text-xs font-medium transition-colors border border-green-200">
        <svg className="w-3.5 h-3.5" fill="currentColor" viewBox="0 0 24 24">
          <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413z"/>
        </svg>
        WhatsApp
      </a>
      <a href={`https://www.linkedin.com/sharing/share-offsite/?url=${encodeURIComponent(url)}`} target="_blank" rel="noopener noreferrer"
        className="flex items-center gap-1.5 px-3 py-1.5 bg-blue-50 hover:bg-blue-100 text-blue-700 rounded-lg text-xs font-medium transition-colors border border-blue-200">
        <svg className="w-3.5 h-3.5" fill="currentColor" viewBox="0 0 24 24">
          <path d="M20.447 20.452h-3.554v-5.569c0-1.328-.027-3.037-1.852-3.037-1.853 0-2.136 1.445-2.136 2.939v5.667H9.351V9h3.414v1.561h.046c.477-.9 1.637-1.85 3.37-1.85 3.601 0 4.267 2.37 4.267 5.455v6.286zM5.337 7.433a2.062 2.062 0 01-2.063-2.065 2.064 2.064 0 112.063 2.065zm1.782 13.019H3.555V9h3.564v11.452zM22.225 0H1.771C.792 0 0 .774 0 1.729v20.542C0 23.227.792 24 1.771 24h20.451C23.2 24 24 23.227 24 22.271V1.729C24 .774 23.2 0 22.222 0h.003z"/>
        </svg>
        LinkedIn
      </a>
      <button onClick={copyLink}
        className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium transition-colors border ${
          copied ? 'bg-teal-50 text-teal-700 border-teal-200' : 'bg-gray-50 hover:bg-gray-100 text-gray-600 border-gray-200'
        }`}>
        {copied ? (
          <>
            <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
            </svg>
            Copiato!
          </>
        ) : (
          <>
            <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z" />
            </svg>
            Copia link
          </>
        )}
      </button>
    </div>
  )
}

// Rende **parola** come testo evidenziato ambra
function RichText({ text }) {
  const parts = text.split(/\*\*(.+?)\*\*/g)
  if (parts.length === 1) return <>{text}</>
  return (
    <>
      {parts.map((part, i) =>
        i % 2 === 1
          ? <strong key={i} className="font-bold text-amber-600 text-[1.12em] tracking-tight">{part}</strong>
          : <span key={i}>{part}</span>
      )}
    </>
  )
}

function ArticleModal({ news, onClose }) {
  useEffect(() => {
    const handler = (e) => { if (e.key === 'Escape') onClose() }
    document.addEventListener('keydown', handler)
    document.body.style.overflow = 'hidden'
    return () => {
      document.removeEventListener('keydown', handler)
      document.body.style.overflow = ''
    }
  }, [onClose])

  const paragraphs = news.contenuto.split('\n').filter(p => p.trim())

  return (
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center"
      onClick={(e) => { if (e.target === e.currentTarget) onClose() }}>
      {/* Backdrop */}
      <div className="absolute inset-0 bg-black/70 backdrop-blur-sm" onClick={onClose} />

      {/* Panel — tema chiaro */}
      <div className="relative bg-white w-full sm:w-[92vw] sm:max-w-5xl rounded-t-3xl sm:rounded-3xl shadow-2xl flex flex-col overflow-hidden max-h-[92vh] sm:max-h-[90vh]">

        {/* Close */}
        <button onClick={onClose}
          className="absolute top-3 right-3 z-20 w-9 h-9 bg-white/90 hover:bg-red-50 text-gray-400 hover:text-red-500 rounded-full flex items-center justify-center transition-colors shadow-md border border-gray-200">
          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
          </svg>
        </button>

        {/* Tutto scrolla insieme */}
        <div className="overflow-y-auto">

          {/* Immagine — scorre con il testo */}
          {news.immagine_url && (
            <img src={news.immagine_url} alt={news.titolo} className="w-full h-auto" />
          )}

          {/* Accent top (se no immagine) */}
          {!news.immagine_url && (
            <div className="w-full h-1 bg-gradient-to-r from-blue-500 via-cyan-400 to-blue-500" />
          )}

          {/* Contenuto */}
          <div className="px-7 sm:px-14 lg:px-20 py-9 sm:py-12">

            {/* Titolo — azzurro elettrico */}
            <h2 className="text-2xl sm:text-[2rem] lg:text-[2.25rem] font-bold text-blue-600 leading-tight mb-5">
              {news.titolo}
            </h2>

            {/* Accent line */}
            <div className="w-14 h-[3px] rounded-full mb-9 bg-gradient-to-r from-blue-500 to-cyan-400" />

            {/* Corpo — grigio con concetti ambra */}
            <div className="space-y-6">
              {paragraphs.map((p, i) => (
                <p key={i} className="text-gray-600 text-[1.05rem] sm:text-lg leading-[1.9] tracking-[0.01em]">
                  <RichText text={p} />
                </p>
              ))}
            </div>

            {/* Footer */}
            <div className="mt-12 pt-6 border-t border-gray-100 flex items-center justify-between gap-4 flex-wrap">
              <ShareButtons title={news.titolo} />
              <button onClick={onClose}
                className="px-5 py-2.5 bg-gray-100 hover:bg-gray-200 text-gray-500 hover:text-gray-700 rounded-xl text-sm font-medium transition-colors">
                Chiudi
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}

export default function LandingPage() {
  const { user, isAdmin, isHpa, loading } = useAuth()
  const router = useRouter()

  // Redirect visitatori non autenticati alla newsletter pubblica
  useEffect(() => {
    if (!loading && !user) {
      router.replace('/newsletter')
    }
  }, [loading, user, router])
  const [stats, setStats] = useState(null)
  const [news, setNews] = useState([])
  const [reviews, setReviews] = useState([])
  const [allReviews, setAllReviews] = useState([])
  const [showAllReviews, setShowAllReviews] = useState(false)
  const [loadingAllReviews, setLoadingAllReviews] = useState(false)
  const [selectedNews, setSelectedNews] = useState(null)
  const [errorParam, setErrorParam] = useState(null)
  const [ivaEnabled, setIvaEnabled] = useState(false)
  const [billingPeriod, setBillingPeriod] = useState('mensile')

  // Lead form
  const [lead, setLead] = useState({ nome: '', email: '', centro: '', citta: '', telefono: '' })
  const [leadSending, setLeadSending] = useState(false)
  const [leadDone, setLeadDone] = useState(false)
  const [leadError, setLeadError] = useState('')

  const submitLead = async (e) => {
    e.preventDefault()
    setLeadSending(true)
    setLeadError('')
    try {
      const res = await fetch('/api/public/lead', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(lead),
      })
      const data = await res.json()
      if (data.error) throw new Error(data.error)
      setLeadDone(true)
      track('lead_submit', { citta: lead.citta })
    } catch (e) {
      setLeadError(e.message)
    } finally {
      setLeadSending(false)
    }
  }

  const track = (event_name, metadata) => {
    fetch('/api/track', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ event_name, page: '/', metadata }),
    }).catch(() => {})
  }

  useEffect(() => {
    if (typeof window !== 'undefined') {
      const p = new URLSearchParams(window.location.search)
      if (p.get('error')) setErrorParam(p.get('error'))
    }
    loadData()
  }, [])

  const loadData = async () => {
    try {
      const [sRes, nRes, rRes] = await Promise.all([
        fetch('/api/public/stats'),
        fetch('/api/public/news?limit=6'),
        fetch('/api/public/reviews?limit=6')
      ])
      const [sData, nData, rData] = await Promise.all([sRes.json(), nRes.json(), rRes.json()])
      setStats(sData)
      setNews(nData.news || [])
      setReviews(rData.reviews || [])
    } catch (e) {}
  }

  const loadAllReviews = async () => {
    setLoadingAllReviews(true)
    try {
      const res = await fetch('/api/public/reviews?limit=200')
      const data = await res.json()
      setAllReviews(data.reviews || [])
      setShowAllReviews(true)
    } catch (e) {}
    finally { setLoadingAllReviews(false) }
  }

  const cfg = stats?.config || {}
  const live = stats?.live || {}

  const freeSpots = parseInt(cfg.early_free_spots?.value) || 10
  const freeTaken = parseInt(cfg.early_free_taken?.value) || 0
  const discountedSpots = parseInt(cfg.early_discounted_spots?.value) || 50
  const discountedTaken = parseInt(cfg.early_discounted_taken?.value) || 0
  const freeAvailable = freeSpots - freeTaken
  const discountedAvailable = discountedSpots - discountedTaken

  const heroHeadline = cfg.hero_headline?.value || 'Gestisci il tuo centro estetico con la potenza dell\'AI'
  const heroSubline = cfg.hero_subline?.value || 'Beautyx analizza i tuoi dati, ottimizza i tuoi ricavi e ti affianca con un consulente HPA dedicato.'

  const benchmarks = [
    { key: 'centri_attivi', value: live.centri_attivi || cfg.centri_attivi?.value || '0', suffix: '', label: cfg.centri_attivi?.label || 'Centri attivi', icona: cfg.centri_attivi?.icona || '🏪' },
    { key: 'incremento_medio_pct', value: cfg.incremento_medio_pct?.value || '34', suffix: '%', label: cfg.incremento_medio_pct?.label || 'Incremento medio ricavi', icona: cfg.incremento_medio_pct?.icona || '📈' },
    { key: 'obiettivi_raggiunti_pct', value: cfg.obiettivi_raggiunti_pct?.value || '89', suffix: '%', label: cfg.obiettivi_raggiunti_pct?.label || 'Obiettivi raggiunti', icona: cfg.obiettivi_raggiunti_pct?.icona || '🎯' },
    { key: 'soddisfazione_media', value: live.avg_rating || cfg.soddisfazione_media?.value || '4.8', suffix: '/5', label: cfg.soddisfazione_media?.label || 'Soddisfazione clienti', icona: cfg.soddisfazione_media?.icona || '⭐' },
    { key: 'risparmio_medio_pct', value: cfg.risparmio_medio_pct?.value || '22', suffix: '%', label: cfg.risparmio_medio_pct?.label || 'Risparmio medio costi', icona: cfg.risparmio_medio_pct?.icona || '💰' }
  ]

  const dashboardHref = isAdmin ? '/admin' : isHpa ? '/hpa' : '/dashboard'

  const PERIOD_DISCOUNTS = { mensile: 0, trimestrale: 0.05, semestrale: 0.10, annuale: 0.15 }
  const PERIOD_LABELS = { mensile: '/mese', trimestrale: '/mese', semestrale: '/mese', annuale: '/mese' }
  const PERIOD_BADGES = { mensile: null, trimestrale: '-5%', semestrale: '-10%', annuale: '-15%' }
  const PERIOD_MULTIPLIERS = { mensile: 1, trimestrale: 3, semestrale: 6, annuale: 12 }

  const calcMonthly = (rawPrice) => {
    const num = parseFloat((rawPrice || '').replace(/[^0-9.]/g, ''))
    if (isNaN(num) || num === 0) return null  // Gratuito
    const discount = PERIOD_DISCOUNTS[billingPeriod] || 0
    const discounted = num * (1 - discount)
    return ivaEnabled ? discounted * 1.22 : discounted
  }

  const calcPrice = (rawPrice) => {
    const monthly = calcMonthly(rawPrice)
    if (monthly === null) return rawPrice
    return `€${Math.round(monthly)}`
  }

  const calcTotal = (rawPrice) => {
    if (billingPeriod === 'mensile') return null
    const monthly = calcMonthly(rawPrice)
    if (monthly === null) return null
    const mult = PERIOD_MULTIPLIERS[billingPeriod]
    return `€${Math.round(monthly * mult)} totale`
  }

  const basePrices = {
    demo: cfg.plan_demo_price?.value || 'Gratuito',
    starter: cfg.plan_starter_price?.value || '€79',
    professional: cfg.plan_professional_price?.value || '€149',
    enterprise: cfg.plan_enterprise_price?.value || '€299'
  }

  const plans = [
    {
      name: 'Demo',
      price: calcPrice(basePrices.demo),
      period: calcPrice(basePrices.demo) === 'Gratuito' ? '' : PERIOD_LABELS[billingPeriod],
      total: null,
      color: 'border-slate-600', badge: null, highlight: false, cta: 'Inizia gratis', note: null,
      features: [
        'Dashboard base',
        'Registrazione incassi',
        '🤖 Beautyx AI — 15.000 caratteri/mese',
        '🎧 HPA incluso — 30 min/mese (chat)',
        '1 utente',
        'Supporto community'
      ]
    },
    {
      name: 'Starter',
      price: calcPrice(basePrices.starter),
      period: PERIOD_LABELS[billingPeriod],
      total: calcTotal(basePrices.starter),
      color: 'border-blue-500', badge: null, highlight: false, cta: 'Inizia ora', note: null,
      features: [
        'Dashboard completa',
        'Analytics avanzate',
        '🤖 Beautyx AI — 50.000 caratteri/mese',
        'Obiettivi & Pianificazione',
        'Gestione accantonamenti',
        '🎧 HPA incluso — 60 min/mese (chat + audio)',
        '📊 Report Awareness mensile — analisi dati, stato di salute attività e costi',
        'Fino a 2 utenti',
        'Supporto email'
      ]
    },
    {
      name: 'Professional',
      price: calcPrice(basePrices.professional),
      period: PERIOD_LABELS[billingPeriod],
      total: calcTotal(basePrices.professional),
      color: 'border-teal-500', badge: 'Più scelto', highlight: true, cta: 'Inizia ora', note: null,
      features: [
        'Tutto Starter incluso',
        '🤖 Beautyx AI — 150.000 caratteri/mese',
        '📹 HPA incluso — 180 min/mese (chat + audio + video)',
        'Integrazioni email AI',
        '📊 Report Awareness + target — obiettivi finali e intermedi, protocollo attuativo, stati di avanzamento mensile',
        'Fino a 5 utenti',
        'Supporto prioritario'
      ]
    },
    {
      name: 'Enterprise',
      price: calcPrice(basePrices.enterprise),
      period: PERIOD_LABELS[billingPeriod],
      total: calcTotal(basePrices.enterprise),
      color: 'border-purple-500', badge: 'Multi-sede', highlight: false, cta: 'Contattaci',
      note: cfg.plan_enterprise_note?.value || '+ €49/mese per ogni centro aggiuntivo oltre il primo',
      features: [
        'Tutto Professional incluso',
        'Multi-centro illimitato',
        '🤖 Beautyx AI — 300.000 caratteri/mese',
        '📹 HPA dedicato — 360 min/mese per centro (HD)',
        '📊 Report di gruppo — stesso report Professional su ogni centro + analisi consolidata di gruppo',
        'API dedicata',
        'SLA garantito 99,9%',
        'Onboarding dedicato',
        'Utenti illimitati',
        'Account manager dedicato'
      ]
    }
  ]

  return (
    <>
      <style>{`
        /* Logo FUORI FLUSSO: position:absolute (mai relative+transform, sennò la navbar
           si allarga per contenerlo — bug bocciato due volte). left/top qui in CSS
           (con variante mobile) cosi' restano responsive; "position:absolute" e' ripetuto
           anche inline sull'elemento <img> per avere certezza che vinca sempre.
           IMPORTANTE: .bx-home-brandlink NON deve avere position:relative — altrimenti
           diventa lui il contenitore di riferimento del logo assoluto (alto quanto il
           wordmark, non quanto la navbar) e il logo finisce tagliato dal bordo della
           pagina. L'unico positioning context deve essere il div navbar (position:relative
           già presente inline, altezza fissa h-14/56px). Con top:0 il bordo superiore del
           logo combacia col bordo superiore della barra e il logo sporge naturalmente
           sotto (150-56=94px overlap desktop, 104-56=48px mobile) — bug bocciato quattro
           volte, causa reale: positioning context sbagliato per colpa di position:relative
           sull'elemento Link/div che avvolge il logo. */
        .bx-home-logo { left: 0; top: 0; width: 137px; height: 150px; border-radius: 4px; object-fit: contain; filter: drop-shadow(0 2px 6px rgba(0,0,0,.35)); }
        .bx-home-brandlink { padding-left: 164px; }
        .bx-home-wordmark-img { height: 54px; width: auto; display: block; }
        @media (max-width: 480px) {
          .bx-home-logo { width: 95px; height: 104px; top: 0; }
          .bx-home-brandlink { padding-left: 118px; }
          .bx-home-wordmark-img { height: 42px; }
        }
      `}</style>
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900 text-white">

      {/* Navbar */}
      <nav className="sticky top-0 z-50 bg-slate-900/80 backdrop-blur-md border-b border-slate-700/50">
        {/* Barra header stretta: h-14 (56px) = altezza reale bottone CTA (36px: py-2=8px*2 + text-sm line-height 20px) + ~9px sopra + ~9px sotto (Tailwind text-sm = 14px/20px line-height). */}
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="relative flex items-center justify-between h-14">
            <div className="flex items-center bx-home-brandlink">
              <img src="/logo_beautyx-oro.png" alt="Beautyx" className="bx-home-logo" style={{ position: 'absolute' }} onError={e => { e.target.style.display='none' }} />
              <img src="/beautyx-wordmark-gold.png" alt="Beautyx" className="bx-home-wordmark-img" />
            </div>
            <div className="hidden md:flex items-center gap-8 text-sm text-slate-400">
              <a href="#funzionalita" className="hover:text-white transition-colors">Funzionalità</a>
              <a href="#risultati" className="hover:text-white transition-colors">Risultati</a>
              {reviews.length > 0 && <a href="#recensioni" className="hover:text-white transition-colors">Recensioni</a>}
              {news.length > 0 && <a href="#news" className="hover:text-white transition-colors">News</a>}
              <a href="#fondatori" className="flex items-center gap-1 text-amber-400 hover:text-amber-300 transition-colors font-medium">
                <span className="w-1.5 h-1.5 rounded-full bg-amber-400 animate-pulse" />
                Offerta
              </a>
              <a href="#piani" className="hover:text-white transition-colors">Piani</a>
            </div>
            <div className="flex items-center gap-3">
              {user ? (
                <Link href={dashboardHref}
                  className="flex items-center gap-2 px-4 py-2 bg-teal-500 hover:bg-teal-600 text-white rounded-lg text-sm font-medium transition-colors"
                >
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-6 0a1 1 0 001-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 001 1m-6 0h6" />
                  </svg>
                  Dashboard
                </Link>
              ) : (
                <>
                  <Link href="/login" className="text-sm text-slate-300 hover:text-white transition-colors px-3 py-2">Accedi</Link>
                  <Link href="/signup" className="px-4 py-2 bg-teal-500 hover:bg-teal-600 text-white rounded-lg text-sm font-medium transition-colors">
                    Inizia gratis
                  </Link>
                </>
              )}
            </div>
          </div>
        </div>
      </nav>

      {/* Error banner */}
      {errorParam === 'unauthorized' && (
        <div className="bg-red-500/10 border-b border-red-500/30 text-red-300 text-sm text-center py-2 px-4">
          Non hai i permessi per accedere a quella sezione.
        </div>
      )}

      {/* Hero */}
      <section className="relative overflow-hidden pt-20 pb-28 px-4">
        <div className="absolute inset-0 overflow-hidden pointer-events-none">
          <div className="absolute -top-40 -right-40 w-96 h-96 bg-teal-500/10 rounded-full blur-3xl" />
          <div className="absolute -bottom-20 -left-20 w-80 h-80 bg-purple-500/10 rounded-full blur-3xl" />
        </div>
        <div className="relative max-w-4xl mx-auto text-center">
          <div className="inline-flex items-center gap-2 px-4 py-1.5 bg-teal-500/10 border border-teal-500/30 rounded-full text-teal-300 text-sm font-medium mb-6">
            <span className="w-2 h-2 bg-teal-400 rounded-full animate-pulse" />
            AI-powered · Gestione completa · Consulente dedicato
          </div>
          <h1 className="text-4xl sm:text-5xl lg:text-6xl font-black leading-tight mb-6">
            {heroHeadline.split(' con ').map((part, i) => (
              i === 0 ? <span key={i}>{part}{' '}con{' '}</span>
                      : <span key={i} className="bg-gradient-to-r from-teal-400 to-cyan-400 bg-clip-text text-transparent">{part}</span>
            ))}
          </h1>
          <p className="text-lg text-slate-400 max-w-2xl mx-auto mb-10 leading-relaxed">
            {heroSubline}
          </p>
          <div className="flex flex-col sm:flex-row gap-4 justify-center">
            {user ? (
              <Link href={dashboardHref}
                className="px-8 py-4 bg-gradient-to-r from-teal-500 to-cyan-500 hover:from-teal-400 hover:to-cyan-400 text-white rounded-xl text-lg font-semibold shadow-lg shadow-teal-500/25 transition-all hover:shadow-teal-500/40 hover:scale-105"
              >
                Vai alla tua dashboard →
              </Link>
            ) : (
              <>
                <Link href="/signup"
                  className="px-8 py-4 bg-gradient-to-r from-teal-500 to-cyan-500 hover:from-teal-400 hover:to-cyan-400 text-white rounded-xl text-lg font-semibold shadow-lg shadow-teal-500/25 transition-all hover:shadow-teal-500/40 hover:scale-105"
                >
                  Inizia gratis — nessuna carta
                </Link>
                <Link href="/login"
                  className="px-8 py-4 bg-slate-800/80 hover:bg-slate-700/80 border border-slate-600/50 text-white rounded-xl text-lg font-medium transition-all"
                >
                  Hai già un account?
                </Link>
              </>
            )}
          </div>
        </div>
      </section>

      {/* Stats / Benchmark */}
      <section id="risultati" className="py-16 px-4 bg-slate-800/30 border-y border-slate-700/30">
        <div className="max-w-6xl mx-auto">
          <div className="text-center mb-10">
            <h2 className="text-2xl font-bold text-white mb-2">I numeri parlano chiaro</h2>
            <p className="text-slate-400">Risultati reali dai centri che usano Beautyx ogni giorno</p>
          </div>
          <div className="grid grid-cols-2 lg:grid-cols-5 gap-4">
            {benchmarks.map(b => (
              <div key={b.key} className="bg-slate-800/60 rounded-xl p-5 border border-slate-700/50 text-center hover:border-teal-500/30 transition-colors">
                <div className="text-3xl mb-2">{b.icona}</div>
                <div className="text-3xl font-black text-white mb-1">
                  <AnimatedCounter target={parseFloat(b.value) || 0} suffix={b.suffix} />
                </div>
                <div className="text-xs text-slate-400 leading-tight">{b.label}</div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Funzionalità */}
      <section id="funzionalita" className="py-20 px-4">
        <div className="max-w-6xl mx-auto">
          <div className="text-center mb-12">
            <h2 className="text-3xl font-bold text-white mb-3">Tutto ciò di cui hai bisogno</h2>
            <p className="text-slate-400 max-w-xl mx-auto">Una piattaforma completa pensata per i professionisti del settore estetico</p>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
            {[
              { icon: '🤖', title: 'Beautyx AI', desc: 'Il tuo assistente intelligente analizza i dati del tuo centro, risponde alle tue domande e suggerisce azioni concrete per migliorare i ricavi.', color: 'teal' },
              { icon: '👤', title: 'Consulente HPA dedicato', desc: 'Ogni centro ha un Human Performance Advisor assegnato. Parla con lui direttamente dalla piattaforma, fissa appuntamenti e ricevi supporto personalizzato.', color: 'purple' },
              { icon: '📊', title: 'Dashboard & Analytics', desc: 'Monitora incassi giornalieri, settimanali e mensili. Visualizza trend, confronta periodi e individua le aree di crescita in tempo reale.', color: 'blue' },
              { icon: '🎯', title: 'Obiettivi & Pianificazione', desc: 'Definisci target di fatturato, tieni traccia dei progressi e ottieni piani di ottimizzazione personalizzati dall\'AI per raggiungerli.', color: 'amber' },
              { icon: '💎', title: 'Accantonamenti smart', desc: 'Gestisci IVA, fondo emergenze e obiettivi di risparmio in modo automatico. Il sistema calcola e accantona le percentuali corrette ad ogni incasso.', color: 'cyan' },
              { icon: '📧', title: 'Integrazione email AI', desc: 'Connetti la tua casella email. Beautyx AI legge, classifica e riassume automaticamente le email gestionali, filtrando spam e pubblicità.', color: 'pink' }
            ].map(f => (
              <div key={f.title} className="bg-slate-800/40 rounded-xl p-6 border border-slate-700/50 hover:border-slate-600 transition-all group">
                <div className="text-3xl mb-3">{f.icon}</div>
                <h3 className="text-white font-semibold text-lg mb-2">{f.title}</h3>
                <p className="text-slate-400 text-sm leading-relaxed">{f.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Recensioni pubbliche — visibile solo quando ci sono recensioni approvate */}
      {reviews.length > 0 && (
        <section id="recensioni" className="py-16 px-4 bg-slate-800/20 border-y border-slate-700/30">
          <div className="max-w-6xl mx-auto">
            <div className="text-center mb-10">
              <h2 className="text-3xl font-bold text-white mb-3">Cosa dicono i nostri clienti</h2>
              <p className="text-slate-400">Recensioni verificate dai titolari che usano Beautyx ogni giorno</p>
            </div>
            <ReviewGrid reviews={showAllReviews ? allReviews : reviews} />
            {/* Pulsante vedi tutte / nascondi */}
            {!showAllReviews ? (
              <div className="text-center mt-8">
                <button
                  onClick={loadAllReviews}
                  disabled={loadingAllReviews}
                  className="inline-flex items-center gap-2 px-6 py-3 bg-slate-700/60 hover:bg-slate-600/60 border border-slate-600 text-white rounded-xl text-sm font-medium transition-all disabled:opacity-50"
                >
                  {loadingAllReviews ? (
                    <><div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" /> Caricamento...</>
                  ) : (
                    <>Vedi tutte le recensioni <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" /></svg></>
                  )}
                </button>
              </div>
            ) : (
              <div className="text-center mt-8">
                <button
                  onClick={() => setShowAllReviews(false)}
                  className="inline-flex items-center gap-2 px-6 py-3 bg-slate-700/60 hover:bg-slate-600/60 border border-slate-600 text-slate-300 rounded-xl text-sm font-medium transition-all"
                >
                  Mostra meno <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 15l7-7 7 7" /></svg>
                </button>
              </div>
            )}
          </div>
        </section>
      )}

      {/* News — sempre visibile */}
      <section id="news" className="py-20 px-4">
          <div className="max-w-6xl mx-auto">
            <div className="text-center mb-10">
              <h2 className="text-3xl font-bold text-white mb-3">Ultime novità</h2>
              <p className="text-slate-400">Aggiornamenti, nuove funzionalità ed eventi</p>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
              {news.map(n => (
                <div key={n.id} className="bg-slate-800/40 rounded-xl border border-slate-700/50 overflow-hidden hover:border-slate-600 transition-all group flex flex-col">
                  {n.immagine_url && (
                    <div className="h-40 overflow-hidden">
                      <img src={n.immagine_url} alt={n.titolo} className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300" />
                    </div>
                  )}
                  <div className="p-5 flex flex-col flex-1">
                    <h3 className="text-white font-semibold mb-2 leading-tight">{n.titolo}</h3>
                    <p className="text-slate-400 text-sm leading-relaxed flex-1">
                      {n.excerpt || n.contenuto.slice(0, 140) + '…'}
                    </p>
                    {(n.contenuto.length > 140 || n.excerpt) && (
                      <button
                        onClick={() => setSelectedNews(n)}
                        className="mt-3 text-xs text-teal-400 hover:text-teal-300 transition-colors text-left"
                      >
                        Leggi tutto →
                      </button>
                    )}
                  </div>
                </div>
              ))}
            </div>

            {news.length === 0 && (
              <div className="text-center py-10 text-slate-500">
                <div className="text-4xl mb-3">📰</div>
                <p className="text-sm">Le novità e gli aggiornamenti appariranno qui non appena pubblicati.</p>
              </div>
            )}
          </div>
        </section>

      {/* Early Adopter Promo */}
      <section id="fondatori" className="py-16 px-4 relative overflow-hidden">
        {/* Sfondo vivace multi-strato */}
        <div className="absolute inset-0 bg-gradient-to-br from-violet-950 via-indigo-900 to-slate-900" />
        <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_top_left,_rgba(251,191,36,0.18)_0%,_transparent_55%)]" />
        <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_bottom_right,_rgba(20,184,166,0.18)_0%,_transparent_55%)]" />
        {/* Glow orbs */}
        <div className="absolute top-10 left-10 w-72 h-72 bg-amber-500/20 rounded-full blur-3xl pointer-events-none animate-pulse" style={{ animationDuration: '4s' }} />
        <div className="absolute bottom-10 right-10 w-72 h-72 bg-teal-400/15 rounded-full blur-3xl pointer-events-none animate-pulse" style={{ animationDuration: '6s' }} />
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-96 h-40 bg-violet-600/10 rounded-full blur-3xl pointer-events-none" />
        {/* Bordi luminosi top/bottom */}
        <div className="absolute top-0 inset-x-0 h-px bg-gradient-to-r from-transparent via-amber-400/60 to-transparent" />
        <div className="absolute bottom-0 inset-x-0 h-px bg-gradient-to-r from-transparent via-teal-400/40 to-transparent" />
        <div className="relative max-w-5xl mx-auto">

          {/* Intestazione */}
          <div className="text-center mb-10">
            <div className="inline-flex items-center gap-2 px-4 py-1.5 bg-amber-500/15 border border-amber-500/30 rounded-full text-amber-300 text-sm font-semibold mb-5">
              <span className="w-2 h-2 bg-amber-400 rounded-full animate-pulse" />
              Offerta Early Adopter — Posti limitati
            </div>
            <h2 className="text-3xl sm:text-4xl font-black text-white mb-3">
              Sei tra i primi? Hai un vantaggio{' '}
              <span className="bg-gradient-to-r from-amber-400 to-yellow-300 bg-clip-text text-transparent">irripetibile.</span>
            </h2>
            <p className="text-slate-400 max-w-xl mx-auto">
              Beautyx è in fase di lancio e vogliamo crescere insieme ai pionieri. Chi entra ora ottiene condizioni esclusive valide per 5 anni.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">

            {/* TIER 1 — Fondatori gratuiti */}
            <div className="relative rounded-2xl border-2 border-amber-400/70 overflow-hidden shadow-2xl shadow-amber-900/40">
              <div className="absolute inset-0 bg-gradient-to-br from-amber-950/80 via-amber-900/40 to-slate-900/90" />
              <div className="absolute top-0 right-0 w-48 h-48 bg-amber-400/10 rounded-full blur-2xl" />
              {freeAvailable === 0 && (
                <div className="absolute inset-0 bg-slate-900/70 flex items-center justify-center z-10 backdrop-blur-sm">
                  <span className="px-4 py-2 bg-slate-800 border border-slate-600 text-slate-400 rounded-xl font-semibold text-sm">Posti esauriti</span>
                </div>
              )}
              <div className="relative p-7">
                <div className="flex items-start justify-between mb-4">
                  <span className="inline-flex items-center gap-1.5 px-3 py-1 bg-amber-500 text-white text-xs font-bold rounded-full">
                    👑 FONDATORI
                  </span>
                  <span className="text-3xl">🏆</span>
                </div>

                <h3 className="text-2xl font-black text-white mb-1">
                  Piano completo <span className="text-amber-400">GRATUITO</span>
                </h3>
                <p className="text-amber-200/70 text-sm mb-1 font-semibold">per 5 anni — nessun costo</p>
                <p className="text-slate-400 text-sm leading-relaxed mb-5">
                  I primi <strong className="text-amber-300">10 clienti</strong> selezionati ottengono accesso illimitato a tutte le funzionalità — AI, HPA, report avanzati — completamente gratuito per 5 anni. In cambio ci dai il tuo feedback prezioso.
                </p>

                {/* Barra progresso */}
                <div className="mb-5">
                  <div className="flex justify-between text-xs mb-1.5">
                    <span className="text-amber-300 font-semibold">{freeTaken} / {freeSpots} posti occupati</span>
                    <span className={`font-bold ${freeAvailable === 0 ? 'text-red-400' : freeAvailable <= 3 ? 'text-amber-300' : 'text-slate-400'}`}>
                      {freeAvailable === 0 ? 'Esaurito' : `${freeAvailable} rimast${freeAvailable === 1 ? 'o' : 'i'}`}
                    </span>
                  </div>
                  <div className="h-2.5 bg-slate-700/80 rounded-full overflow-hidden">
                    <div
                      className="h-full rounded-full bg-gradient-to-r from-amber-500 to-yellow-400 transition-all"
                      style={{ width: `${Math.min(100, (freeTaken / freeSpots) * 100)}%` }}
                    />
                  </div>
                </div>

                <div className="space-y-1.5 mb-6 text-sm text-slate-300">
                  {['Beautyx AI — 150.000 caratteri/mese', 'HPA dedicato — 180 min/mese', 'Report completo mensile', 'Supporto prioritario', 'Validità 5 anni dalla firma'].map(f => (
                    <div key={f} className="flex items-center gap-2">
                      <svg className="w-3.5 h-3.5 text-amber-400 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M5 13l4 4L19 7" />
                      </svg>
                      {f}
                    </div>
                  ))}
                </div>

                <a
                  href={user ? dashboardHref : '/signup?promo=founder'}
                  className={`block w-full py-3.5 rounded-xl font-bold text-center text-sm transition-all ${
                    freeAvailable === 0
                      ? 'bg-slate-700/50 text-slate-500 cursor-not-allowed'
                      : 'bg-amber-500 hover:bg-amber-400 text-white shadow-lg shadow-amber-500/25 hover:scale-[1.02]'
                  }`}
                >
                  {freeAvailable === 0 ? 'Posti esauriti' : user ? 'Vai alla dashboard' : '👑 Richiedi il tuo posto gratuito →'}
                </a>
              </div>
            </div>

            {/* TIER 2 — Early Adopter 50% */}
            <div className="relative rounded-2xl border-2 border-teal-400/60 overflow-hidden shadow-2xl shadow-teal-900/30">
              <div className="absolute inset-0 bg-gradient-to-br from-teal-950/80 via-teal-900/40 to-slate-900/90" />
              <div className="absolute top-0 right-0 w-48 h-48 bg-teal-400/10 rounded-full blur-2xl" />
              {discountedAvailable === 0 && freeAvailable === 0 && (
                <div className="absolute inset-0 bg-slate-900/70 flex items-center justify-center z-10 backdrop-blur-sm">
                  <span className="px-4 py-2 bg-slate-800 border border-slate-600 text-slate-400 rounded-xl font-semibold text-sm">Posti esauriti</span>
                </div>
              )}
              <div className="relative p-7">
                <div className="flex items-start justify-between mb-4">
                  <span className="inline-flex items-center gap-1.5 px-3 py-1 bg-teal-600 text-white text-xs font-bold rounded-full">
                    ⭐ EARLY ADOPTER
                  </span>
                  <span className="text-3xl">🚀</span>
                </div>

                <h3 className="text-2xl font-black text-white mb-1">
                  Tutti i piani a <span className="text-teal-400">-50%</span>
                </h3>
                <p className="text-teal-200/70 text-sm mb-1 font-semibold">per 5 anni — bloccato al tuo piano</p>
                <p className="text-slate-400 text-sm leading-relaxed mb-5">
                  I successivi <strong className="text-teal-300">50 clienti</strong> ottengono il 50% di sconto su qualsiasi piano scelgano, bloccato per 5 anni. Starter, Professional o Enterprise: metà prezzo garantito.
                </p>

                {/* Barra progresso */}
                <div className="mb-5">
                  <div className="flex justify-between text-xs mb-1.5">
                    <span className="text-teal-300 font-semibold">{discountedTaken} / {discountedSpots} posti occupati</span>
                    <span className={`font-bold ${discountedAvailable === 0 ? 'text-red-400' : discountedAvailable <= 10 ? 'text-amber-300' : 'text-slate-400'}`}>
                      {discountedAvailable === 0 ? 'Esaurito' : `${discountedAvailable} rimast${discountedAvailable === 1 ? 'o' : 'i'}`}
                    </span>
                  </div>
                  <div className="h-2.5 bg-slate-700/80 rounded-full overflow-hidden">
                    <div
                      className="h-full rounded-full bg-gradient-to-r from-teal-500 to-cyan-400 transition-all"
                      style={{ width: `${Math.min(100, (discountedTaken / discountedSpots) * 100)}%` }}
                    />
                  </div>
                </div>

                {/* Esempio risparmio */}
                <div className="mb-5 p-3 bg-teal-950/60 rounded-xl border border-teal-800/50">
                  <p className="text-xs text-slate-500 mb-2 font-medium uppercase tracking-wider">Esempio risparmio su 5 anni</p>
                  <div className="grid grid-cols-3 gap-2 text-center">
                    {[
                      { label: 'Starter', base: 79, color: 'text-blue-400' },
                      { label: 'Professional', base: 149, color: 'text-teal-400' },
                      { label: 'Enterprise', base: 299, color: 'text-purple-400' }
                    ].map(p => {
                      const monthly = Math.round(p.base * 0.5)
                      const saved = p.base * 0.5 * 12 * 5
                      return (
                        <div key={p.label}>
                          <p className={`text-xs font-semibold ${p.color}`}>{p.label}</p>
                          <p className="text-white font-bold text-sm">€{monthly}<span className="text-slate-500 text-xs">/mese</span></p>
                          <p className="text-green-400 text-xs">risparmi €{Math.round(saved / 1000)}k</p>
                        </div>
                      )
                    })}
                  </div>
                </div>

                <a
                  href={user ? dashboardHref : '/signup?promo=early'}
                  className={`block w-full py-3.5 rounded-xl font-bold text-center text-sm transition-all ${
                    discountedAvailable === 0
                      ? 'bg-slate-700/50 text-slate-500 cursor-not-allowed'
                      : 'bg-teal-600 hover:bg-teal-500 text-white shadow-lg shadow-teal-500/20 hover:scale-[1.02]'
                  }`}
                >
                  {discountedAvailable === 0 ? 'Posti esauriti' : user ? 'Vai alla dashboard' : '⭐ Approfitta dello sconto 50% →'}
                </a>
              </div>
            </div>
          </div>

          <p className="text-center text-xs text-slate-600 mt-5">
            Offerte soggette a verifica e approvazione da parte del team Beautyx. Le condizioni vengono formalizzate con accordo scritto.
          </p>
        </div>
      </section>

      {/* Piani */}
      <section id="piani" className="py-20 px-4 bg-slate-800/20 border-t border-slate-700/30">
        <div className="max-w-6xl mx-auto">
          <div className="text-center mb-8">
            <h2 className="text-3xl font-bold text-white mb-3">Scegli il piano giusto</h2>
            <p className="text-slate-400">Inizia gratis, scala quando sei pronto. Nessun contratto vincolante.</p>
          </div>

          {/* Controlli prezzo */}
          <div className="flex flex-col sm:flex-row items-center justify-center gap-4 mb-10">
            {/* Periodo fatturazione */}
            <div className="flex items-center bg-slate-800/60 border border-slate-700/50 rounded-xl p-1 gap-1">
              {['mensile', 'trimestrale', 'semestrale', 'annuale'].map(p => (
                <button
                  key={p}
                  onClick={() => setBillingPeriod(p)}
                  className={`relative px-3 py-1.5 rounded-lg text-xs font-medium transition-all capitalize ${
                    billingPeriod === p
                      ? 'bg-teal-500 text-white shadow'
                      : 'text-slate-400 hover:text-white'
                  }`}
                >
                  {p.charAt(0).toUpperCase() + p.slice(1)}
                  {PERIOD_BADGES[p] && (
                    <span className={`absolute -top-1.5 -right-1 text-[9px] font-bold px-1 rounded-full leading-none py-0.5 ${
                      billingPeriod === p ? 'bg-white text-teal-700' : 'bg-green-500 text-white'
                    }`}>
                      {PERIOD_BADGES[p]}
                    </span>
                  )}
                </button>
              ))}
            </div>

            {/* Toggle IVA */}
            <button
              onClick={() => setIvaEnabled(!ivaEnabled)}
              className={`flex items-center gap-2 px-4 py-2 rounded-xl border text-sm font-medium transition-all ${
                ivaEnabled
                  ? 'bg-amber-500/20 border-amber-500/40 text-amber-300'
                  : 'bg-slate-800/60 border-slate-700/50 text-slate-400 hover:text-white'
              }`}
            >
              <div className={`w-8 h-4 rounded-full transition-colors relative ${ivaEnabled ? 'bg-amber-500' : 'bg-slate-600'}`}>
                <div className={`absolute top-0.5 w-3 h-3 bg-white rounded-full shadow transition-transform ${ivaEnabled ? 'translate-x-4' : 'translate-x-0.5'}`} />
              </div>
              IVA 22% {ivaEnabled ? 'inclusa' : 'esclusa'}
            </button>
          </div>

          {billingPeriod !== 'mensile' && (
            <p className="text-center text-xs text-teal-400 mb-6">
              ✓ Sconto {PERIOD_BADGES[billingPeriod]} applicato · pagamento {billingPeriod}
            </p>
          )}

          <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-5">
            {plans.map(plan => (
              <div key={plan.name} className={`relative rounded-2xl p-6 border-2 ${plan.color} ${
                plan.highlight
                  ? 'bg-gradient-to-br from-teal-900/40 to-slate-800/60 shadow-xl shadow-teal-900/30'
                  : 'bg-slate-800/40'
              } flex flex-col`}>
                {plan.badge && (
                  <div className="absolute -top-3 left-1/2 -translate-x-1/2 whitespace-nowrap">
                    <span className={`px-3 py-1 text-white text-xs font-bold rounded-full ${plan.highlight ? 'bg-teal-500' : 'bg-purple-600'}`}>
                      {plan.badge}
                    </span>
                  </div>
                )}
                <div className="mb-5">
                  <h3 className="text-lg font-bold text-white">{plan.name}</h3>
                  <div className="mt-2 flex items-baseline gap-1.5 flex-wrap">
                    <span className="text-3xl font-black text-white">{plan.price}</span>
                    {plan.period && <span className="text-slate-400 text-sm">{plan.period}</span>}
                    {plan.total && (
                      <span className="text-xs text-slate-500 font-medium">· {plan.total}</span>
                    )}
                  </div>
                  {plan.note && (
                    <p className="mt-2 text-xs text-purple-300 leading-snug">{plan.note}</p>
                  )}
                </div>
                <ul className="space-y-2 flex-1 mb-6">
                  {plan.features.map(f => (
                    <li key={f} className="flex items-start gap-2 text-sm">
                      <svg className="w-4 h-4 text-teal-400 flex-shrink-0 mt-0.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                      </svg>
                      <span className="text-slate-300">{f}</span>
                    </li>
                  ))}
                </ul>
                <Link
                  href={user ? dashboardHref : (plan.price === 'Gratuito' ? '/signup' : plan.cta === 'Contattaci' ? '/signup?piano=enterprise' : '/signup?piano=' + plan.name.toLowerCase())}
                  className={`w-full py-3 rounded-xl text-sm font-semibold text-center transition-all block ${
                    plan.highlight
                      ? 'bg-teal-500 hover:bg-teal-400 text-white shadow-lg shadow-teal-500/25'
                      : plan.cta === 'Contattaci'
                        ? 'bg-purple-600/80 hover:bg-purple-500/80 text-white border border-purple-500/50'
                        : 'bg-slate-700/60 hover:bg-slate-600/60 text-white border border-slate-600'
                  }`}
                >
                  {user ? 'Vai alla dashboard' : plan.cta}
                </Link>
              </div>
            ))}
          </div>

          {/* Nota IVA */}
          <p className="text-center text-xs text-slate-600 mt-6">
            {ivaEnabled ? 'Prezzi IVA inclusa (22%).' : 'Prezzi IVA esclusa (22%).'}{' '}
            Cancellabili in qualsiasi momento. Tutti i piani includono consulenza HPA.
          </p>
        </div>
      </section>

      {/* Footer CTA */}
      {!user && (
        <section className="py-20 px-4">
          <div className="max-w-3xl mx-auto text-center">
            <h2 className="text-3xl font-bold text-white mb-4">Pronto a trasformare il tuo centro?</h2>
            <p className="text-slate-400 mb-8">Unisciti ai centri che già usano Beautyx per crescere ogni giorno.</p>
            <Link href="/signup"
              className="inline-flex items-center gap-2 px-10 py-4 bg-gradient-to-r from-teal-500 to-cyan-500 hover:from-teal-400 hover:to-cyan-400 text-white rounded-xl text-lg font-semibold shadow-lg shadow-teal-500/25 transition-all hover:scale-105"
            >
              Inizia gratis oggi
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 8l4 4m0 0l-4 4m4-4H3" />
              </svg>
            </Link>
          </div>
        </section>
      )}

      {/* Lead capture — Parla con noi */}
      {!user && (
        <section className="py-20 px-4 bg-slate-800/30 border-t border-slate-700/30">
          <div className="max-w-2xl mx-auto text-center">
            <div className="inline-flex items-center gap-2 px-4 py-1.5 bg-teal-500/10 border border-teal-500/30 rounded-full text-teal-300 text-sm font-medium mb-6">
              <span className="w-2 h-2 bg-teal-400 rounded-full animate-pulse" />
              Vuoi saperne di più prima di registrarti?
            </div>
            <h2 className="text-3xl font-bold text-white mb-3">Parliamoci direttamente</h2>
            <p className="text-slate-400 mb-10">Lascia i tuoi contatti — ti rispondiamo entro 24 ore per capire insieme come Beautyx può aiutare il tuo centro.</p>

            {leadDone ? (
              <div className="bg-teal-500/10 border border-teal-500/30 rounded-2xl p-8">
                <div className="text-4xl mb-3">🎉</div>
                <p className="text-teal-300 font-semibold text-lg">Messaggio ricevuto!</p>
                <p className="text-slate-400 mt-2">Ti contatteremo entro 24 ore. Nel frattempo puoi provare la demo gratuita.</p>
                <Link href="/signup" className="inline-flex items-center gap-2 mt-5 px-6 py-3 bg-teal-500 hover:bg-teal-400 text-white rounded-xl text-sm font-semibold transition-colors">
                  Prova la demo gratis →
                </Link>
              </div>
            ) : (
              <form onSubmit={submitLead} className="space-y-4 text-left">
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-xs text-slate-400 mb-1.5">Nome e cognome *</label>
                    <input required value={lead.nome} onChange={e => setLead(l => ({ ...l, nome: e.target.value }))}
                      placeholder="Mario Rossi"
                      className="w-full px-4 py-3 bg-slate-900/60 border border-slate-600/50 rounded-xl text-white text-sm placeholder-slate-500 focus:ring-2 focus:ring-teal-500 focus:border-transparent outline-none" />
                  </div>
                  <div>
                    <label className="block text-xs text-slate-400 mb-1.5">Email *</label>
                    <input required type="email" value={lead.email} onChange={e => setLead(l => ({ ...l, email: e.target.value }))}
                      placeholder="mario@centrorossi.it"
                      className="w-full px-4 py-3 bg-slate-900/60 border border-slate-600/50 rounded-xl text-white text-sm placeholder-slate-500 focus:ring-2 focus:ring-teal-500 focus:border-transparent outline-none" />
                  </div>
                  <div>
                    <label className="block text-xs text-slate-400 mb-1.5">Nome del centro</label>
                    <input value={lead.centro} onChange={e => setLead(l => ({ ...l, centro: e.target.value }))}
                      placeholder="Centro Estetico Rossi"
                      className="w-full px-4 py-3 bg-slate-900/60 border border-slate-600/50 rounded-xl text-white text-sm placeholder-slate-500 focus:ring-2 focus:ring-teal-500 focus:border-transparent outline-none" />
                  </div>
                  <div>
                    <label className="block text-xs text-slate-400 mb-1.5">Città</label>
                    <input value={lead.citta} onChange={e => setLead(l => ({ ...l, citta: e.target.value }))}
                      placeholder="Milano"
                      className="w-full px-4 py-3 bg-slate-900/60 border border-slate-600/50 rounded-xl text-white text-sm placeholder-slate-500 focus:ring-2 focus:ring-teal-500 focus:border-transparent outline-none" />
                  </div>
                </div>
                <div>
                  <label className="block text-xs text-slate-400 mb-1.5">Telefono <span className="text-slate-600">(opzionale)</span></label>
                  <input type="tel" value={lead.telefono} onChange={e => setLead(l => ({ ...l, telefono: e.target.value }))}
                    placeholder="+39 333 1234567"
                    className="w-full px-4 py-3 bg-slate-900/60 border border-slate-600/50 rounded-xl text-white text-sm placeholder-slate-500 focus:ring-2 focus:ring-teal-500 focus:border-transparent outline-none" />
                </div>
                {leadError && <p className="text-red-400 text-sm">{leadError}</p>}
                <button type="submit" disabled={leadSending}
                  className="w-full py-3.5 bg-gradient-to-r from-teal-500 to-cyan-500 hover:from-teal-400 hover:to-cyan-400 text-white rounded-xl font-semibold transition-all disabled:opacity-50 disabled:cursor-not-allowed">
                  {leadSending ? 'Invio in corso...' : 'Invia — ti rispondiamo entro 24 ore'}
                </button>
                <p className="text-xs text-slate-600 text-center">Nessuno spam. I tuoi dati sono al sicuro e non vengono condivisi.</p>
              </form>
            )}
          </div>
        </section>
      )}

      {/* Footer */}
      <footer className="border-t border-slate-700/50 py-8 px-4">
        <div className="max-w-6xl mx-auto flex flex-col md:flex-row items-center justify-between gap-4 text-sm text-slate-500">
          <div className="flex items-center gap-2">
            <span className="font-semibold text-slate-400">Beautyx</span>
            <span>© {new Date().getFullYear()} — La piattaforma AI per centri estetici</span>
          </div>
          <div className="flex items-center gap-6">
            <Link href="/login" className="hover:text-slate-300 transition-colors">Accedi</Link>
            <Link href="/signup" className="hover:text-slate-300 transition-colors">Registrati</Link>
          </div>
        </div>
      </footer>

      {/* Article modal */}
      {selectedNews && <ArticleModal news={selectedNews} onClose={() => setSelectedNews(null)} />}
    </div>
    </>
  )
}
