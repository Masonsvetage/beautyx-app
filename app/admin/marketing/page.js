'use client'

import { useState, useEffect } from 'react'
import Link from 'next/link'

const CAT_LABELS = { novita: 'Novità', aggiornamento: 'Aggiornamento', evento: 'Evento', offerta: 'Offerta' }
const STAR_LABELS = { 1: 'Pessimo', 2: 'Scarso', 3: 'Nella norma', 4: 'Buono', 5: 'Eccellente' }

function Stars({ value }) {
  return (
    <div className="flex gap-0.5">
      {[1,2,3,4,5].map(s => (
        <svg key={s} className={`w-4 h-4 ${s <= value ? 'text-amber-400' : 'text-slate-600'}`} fill="currentColor" viewBox="0 0 24 24">
          <path d="M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z" />
        </svg>
      ))}
    </div>
  )
}

export default function MarketingPage() {
  const [tab, setTab] = useState('news')
  const [news, setNews] = useState([])
  const [reviews, setReviews] = useState([])
  const [config, setConfig] = useState([])
  const [leads, setLeads] = useState([])
  const [loading, setLoading] = useState(true)

  // Form nuova news
  const [showForm, setShowForm] = useState(false)
  const [editingNews, setEditingNews] = useState(null)
  const [form, setForm] = useState({ titolo: '', contenuto: '', excerpt: '', immagine_url: '', categoria: 'novita', pubblicato: false, in_evidenza: false, ordine: 0 })
  const [saving, setSaving] = useState(false)
  const [msg, setMsg] = useState('')

  // AI generation
  const [aiOpen, setAiOpen] = useState(false)
  const [aiLoading, setAiLoading] = useState(false)
  const [aiInput, setAiInput] = useState({ argomento: '', keywords: '', tono: 'informativo' })

  // Image upload
  const [imgUploading, setImgUploading] = useState(false)

  const uploadImage = async (file) => {
    if (!file) return
    const validTypes = ['image/png', 'image/jpeg', 'image/jpg', 'image/webp']
    if (!validTypes.includes(file.type)) { flash('Formato non valido. Usa JPG, PNG o WebP.'); return }
    if (file.size > 5 * 1024 * 1024) { flash('File troppo grande. Massimo 5MB.'); return }
    setImgUploading(true)
    try {
      const fd = new FormData()
      fd.append('file', file)
      const res = await fetch('/api/admin/marketing', { method: 'PUT', body: fd })
      const data = await res.json()
      if (data.error) throw new Error(data.error)
      setForm(f => ({ ...f, immagine_url: data.url }))
    } catch (e) {
      flash('Errore upload immagine: ' + e.message)
    } finally {
      setImgUploading(false)
    }
  }

  useEffect(() => { loadAll() }, [])

  const loadAll = async () => {
    setLoading(true)
    try {
      const [nRes, rRes, cRes, lRes] = await Promise.all([
        fetch('/api/admin/marketing?section=news'),
        fetch('/api/admin/marketing?section=reviews'),
        fetch('/api/admin/marketing?section=config'),
        fetch('/api/admin/marketing?section=leads')
      ])
      const [nData, rData, cData, lData] = await Promise.all([nRes.json(), rRes.json(), cRes.json(), lRes.json()])
      setNews(nData.news || [])
      setReviews(rData.reviews || [])
      setConfig(cData.config || [])
      setLeads(lData.leads || [])
    } catch (e) {}
    finally { setLoading(false) }
  }

  const flash = (m) => { setMsg(m); setTimeout(() => setMsg(''), 3000) }

  const openNewForm = () => {
    setEditingNews(null)
    setForm({ titolo: '', contenuto: '', excerpt: '', immagine_url: '', categoria: 'novita', pubblicato: false, in_evidenza: false, ordine: 0 })
    setAiInput({ argomento: '', keywords: '', tono: 'informativo' })
    setAiOpen(false)
    setShowForm(true)
  }

  const generateWithAI = async () => {
    if (!aiInput.argomento.trim()) { flash('Inserisci l\'argomento del post'); return }
    setAiLoading(true)
    try {
      const res = await fetch('/api/admin/ai-generate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ argomento: aiInput.argomento, keywords: aiInput.keywords, tono: aiInput.tono, categoria: form.categoria })
      })
      const data = await res.json()
      if (data.error) throw new Error(data.error)
      setForm(f => ({ ...f, titolo: data.titolo || f.titolo, contenuto: data.contenuto || f.contenuto, excerpt: data.excerpt || f.excerpt }))
      setAiOpen(false)
      flash('Contenuto generato — rivedilo prima di pubblicare')
    } catch (e) {
      flash('Errore generazione: ' + e.message)
    } finally {
      setAiLoading(false)
    }
  }

  const openEditForm = (n) => {
    setEditingNews(n.id)
    setForm({ titolo: n.titolo, contenuto: n.contenuto, excerpt: n.excerpt || '', immagine_url: n.immagine_url || '', categoria: n.categoria, pubblicato: n.pubblicato, in_evidenza: n.in_evidenza, ordine: n.ordine })
    setShowForm(true)
  }

  const saveNews = async () => {
    if (!form.titolo.trim() || !form.contenuto.trim()) { flash('Titolo e contenuto obbligatori'); return }
    setSaving(true)
    try {
      if (editingNews) {
        await fetch('/api/admin/marketing', { method: 'PATCH', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ id: editingNews, ...form }) })
      } else {
        await fetch('/api/admin/marketing', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ action: 'create_news', ...form }) })
      }
      setShowForm(false)
      flash(editingNews ? 'News aggiornata' : 'News creata')
      loadAll()
    } catch (e) { flash('Errore: ' + e.message) }
    finally { setSaving(false) }
  }

  const deleteNews = async (id) => {
    if (!confirm('Eliminare questa news?')) return
    await fetch('/api/admin/marketing', { method: 'DELETE', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ id }) })
    flash('News eliminata')
    loadAll()
  }

  const togglePublish = async (n) => {
    await fetch('/api/admin/marketing', { method: 'PATCH', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ id: n.id, pubblicato: !n.pubblicato }) })
    loadAll()
  }

  const approveReview = async (reviewId, approve) => {
    await fetch('/api/admin/marketing', {
      method: 'POST', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ action: 'approve_review', review_id: reviewId, approve })
    })
    flash(approve ? 'Recensione approvata e pubblicata' : 'Recensione rimossa dalla landing')
    loadAll()
  }

  const updateConfig = async (key, value) => {
    await fetch('/api/admin/marketing', {
      method: 'POST', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ action: 'update_config', key, value })
    })
    flash('Configurazione salvata')
    loadAll()
  }

  const markLead = async (leadId, contattato) => {
    await fetch('/api/admin/marketing', {
      method: 'POST', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ action: 'mark_lead', lead_id: leadId, contattato })
    })
    setLeads(prev => prev.map(l => l.id === leadId ? { ...l, contattato } : l))
  }

  const tabs = [
    { id: 'news', label: 'News', icon: '📰', count: news.length },
    { id: 'reviews', label: 'Recensioni', icon: '⭐', count: reviews.filter(r => !r.is_public).length },
    { id: 'leads', label: 'Lead', icon: '📬', count: leads.filter(l => !l.contattato).length },
    { id: 'config', label: 'Statistiche', icon: '📊', count: null }
  ]

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900 p-4 md:p-6">
      <div className="max-w-6xl mx-auto space-y-6">

        {/* Header */}
        <div className="bg-slate-950/60 rounded-xl border border-slate-700/50 p-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <Link href="/admin" className="text-slate-400 hover:text-white transition-colors">
                <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
                </svg>
              </Link>
              <div className="w-10 h-10 bg-gradient-to-br from-teal-500 to-cyan-500 rounded-lg flex items-center justify-center">
                <span className="text-xl">🌐</span>
              </div>
              <div>
                <h1 className="text-2xl font-bold text-white">Marketing & Landing Page</h1>
                <p className="text-sm text-slate-400">Gestisci news, recensioni pubbliche e statistiche</p>
              </div>
            </div>
            <div className="flex items-center gap-3">
              {msg && <span className={`text-sm font-medium ${msg.startsWith('Errore') ? 'text-red-400' : 'text-teal-400'}`}>{msg}</span>}
              <a href="/" target="_blank" className="flex items-center gap-2 px-4 py-2 bg-slate-700/60 hover:bg-slate-600 text-slate-300 rounded-lg text-sm transition-colors">
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" />
                </svg>
                Vedi sito
              </a>
            </div>
          </div>
        </div>

        {/* Tabs */}
        <div className="flex gap-2">
          {tabs.map(t => (
            <button key={t.id} onClick={() => setTab(t.id)}
              className={`flex items-center gap-2 px-4 py-2.5 rounded-xl text-sm font-medium transition-all ${
                tab === t.id ? 'bg-teal-500/20 text-teal-300 border border-teal-500/40' : 'bg-slate-800/50 text-slate-400 hover:text-white border border-slate-700/50'
              }`}
            >
              <span>{t.icon}</span>
              {t.label}
              {t.count !== null && t.count > 0 && (
                <span className={`text-xs px-1.5 py-0.5 rounded-full ${tab === t.id ? 'bg-teal-500/30' : 'bg-slate-700'}`}>{t.count}</span>
              )}
            </button>
          ))}
        </div>

        {loading ? (
          <div className="flex items-center justify-center py-20">
            <div className="w-8 h-8 border-3 border-teal-500 border-t-transparent rounded-full animate-spin" />
          </div>
        ) : (
          <>
            {/* NEWS TAB */}
            {tab === 'news' && (
              <div className="space-y-4">
                <div className="flex justify-between items-center">
                  <p className="text-slate-400 text-sm">{news.length} post · {news.filter(n => n.pubblicato).length} pubblicati</p>
                  <button onClick={openNewForm}
                    className="flex items-center gap-2 px-4 py-2 bg-teal-500 hover:bg-teal-600 text-white rounded-lg text-sm font-medium transition-colors"
                  >
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
                    </svg>
                    Nuovo post
                  </button>
                </div>

                {/* Form */}
                {showForm && (
                  <div className="bg-slate-800/60 rounded-xl border border-teal-500/30 p-5 space-y-4">
                    <div className="flex items-center justify-between">
                      <h3 className="text-white font-semibold">{editingNews ? 'Modifica news' : 'Nuovo post'}</h3>
                      {!editingNews && (
                        <button onClick={() => setAiOpen(o => !o)}
                          className={`flex items-center gap-2 px-3 py-1.5 rounded-lg text-xs font-medium transition-all border ${
                            aiOpen
                              ? 'bg-violet-500/20 text-violet-300 border-violet-500/40'
                              : 'bg-slate-700/60 hover:bg-slate-700 text-slate-300 border-slate-600/50'
                          }`}
                        >
                          <span>✨</span>
                          Genera con AI
                        </button>
                      )}
                    </div>

                    {/* Pannello generazione AI */}
                    {aiOpen && (
                      <div className="bg-violet-500/10 border border-violet-500/30 rounded-xl p-4 space-y-3">
                        <div className="flex items-center gap-2 mb-1">
                          <span className="text-sm font-medium text-violet-300">✨ Generatore AI</span>
                          <span className="text-xs text-slate-500">powered by Claude Haiku</span>
                        </div>
                        <div>
                          <label className="block text-xs text-slate-400 mb-1">Argomento del post *</label>
                          <input
                            value={aiInput.argomento}
                            onChange={e => setAiInput(a => ({ ...a, argomento: e.target.value }))}
                            placeholder="es. Come aumentare le prenotazioni online nel 2026"
                            className="w-full px-3 py-2 bg-slate-900/60 border border-slate-600/50 rounded-lg text-white text-sm focus:ring-1 focus:ring-violet-500 focus:border-transparent"
                          />
                        </div>
                        <div>
                          <label className="block text-xs text-slate-400 mb-1">Keyword SEO <span className="text-slate-600">(opzionale, separate da virgola)</span></label>
                          <input
                            value={aiInput.keywords}
                            onChange={e => setAiInput(a => ({ ...a, keywords: e.target.value }))}
                            placeholder="es. gestione centro estetico, software beauty, prenotazioni online"
                            className="w-full px-3 py-2 bg-slate-900/60 border border-slate-600/50 rounded-lg text-white text-sm focus:ring-1 focus:ring-violet-500 focus:border-transparent"
                          />
                        </div>
                        <div>
                          <label className="block text-xs text-slate-400 mb-2">Tono</label>
                          <div className="flex flex-wrap gap-2">
                            {[
                              { value: 'informativo', label: 'Informativo' },
                              { value: 'coinvolgente', label: 'Coinvolgente' },
                              { value: 'promozionale', label: 'Promozionale' },
                              { value: 'educativo', label: 'Educativo' },
                            ].map(t => (
                              <button key={t.value} onClick={() => setAiInput(a => ({ ...a, tono: t.value }))}
                                className={`px-3 py-1 rounded-full text-xs font-medium transition-all border ${
                                  aiInput.tono === t.value
                                    ? 'bg-violet-500/30 text-violet-200 border-violet-500/50'
                                    : 'bg-slate-800 text-slate-400 border-slate-700 hover:border-slate-500'
                                }`}
                              >{t.label}</button>
                            ))}
                          </div>
                        </div>
                        <div className="flex items-center gap-3 pt-1">
                          <button onClick={generateWithAI} disabled={aiLoading}
                            className="flex items-center gap-2 px-4 py-2 bg-violet-600 hover:bg-violet-500 text-white rounded-lg text-sm font-medium transition-colors disabled:opacity-50"
                          >
                            {aiLoading ? (
                              <>
                                <span className="w-3.5 h-3.5 border-2 border-white border-t-transparent rounded-full animate-spin" />
                                Genero...
                              </>
                            ) : (
                              <><span>✨</span> Genera contenuto</>
                            )}
                          </button>
                          <p className="text-xs text-slate-500">Il testo verrà pre-compilato nei campi qui sotto per la tua revisione.</p>
                        </div>
                      </div>
                    )}

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <div className="md:col-span-2">
                        <label className="block text-xs text-slate-400 mb-1">Titolo *</label>
                        <input value={form.titolo} onChange={e => setForm(f => ({...f, titolo: e.target.value}))}
                          className="w-full px-3 py-2 bg-slate-900/60 border border-slate-600/50 rounded-lg text-white text-sm focus:ring-1 focus:ring-teal-500 focus:border-transparent" />
                      </div>
                      <div>
                        <label className="block text-xs text-slate-400 mb-1">Categoria</label>
                        <select value={form.categoria} onChange={e => setForm(f => ({...f, categoria: e.target.value}))}
                          className="w-full px-3 py-2 bg-slate-900/60 border border-slate-600/50 rounded-lg text-white text-sm focus:ring-1 focus:ring-teal-500">
                          {Object.entries(CAT_LABELS).map(([k, v]) => <option key={k} value={k}>{v}</option>)}
                        </select>
                      </div>
                      <div>
                        <label className="block text-xs text-slate-400 mb-1">Immagine (opzionale)</label>
                        {form.immagine_url ? (
                          <div className="relative rounded-lg overflow-hidden bg-slate-900/60 border border-slate-600/50">
                            <img src={form.immagine_url} alt="" className="w-full h-32 object-cover" />
                            <button onClick={() => setForm(f => ({ ...f, immagine_url: '' }))}
                              className="absolute top-2 right-2 w-6 h-6 bg-slate-900/80 hover:bg-red-500/80 text-white rounded-full text-xs flex items-center justify-center transition-colors"
                            >✕</button>
                          </div>
                        ) : (
                          <div className="flex gap-2">
                            <label className="flex-shrink-0">
                              <input type="file" accept="image/png,image/jpeg,image/jpg,image/webp"
                                onChange={e => uploadImage(e.target.files[0])} disabled={imgUploading} className="hidden" />
                              <span className={`flex items-center gap-1.5 px-3 py-2 rounded-lg text-xs font-medium cursor-pointer transition-colors border ${
                                imgUploading ? 'bg-slate-700 text-slate-500 border-slate-600 cursor-not-allowed' : 'bg-slate-700 hover:bg-slate-600 text-slate-300 border-slate-600'
                              }`}>
                                {imgUploading ? <><span className="w-3 h-3 border-2 border-slate-400 border-t-transparent rounded-full animate-spin" />Carico...</> : <>⬆ Carica</>}
                              </span>
                            </label>
                            <input value={form.immagine_url} onChange={e => setForm(f => ({...f, immagine_url: e.target.value}))}
                              placeholder="oppure incolla un URL..."
                              className="flex-1 px-3 py-2 bg-slate-900/60 border border-slate-600/50 rounded-lg text-white text-xs focus:ring-1 focus:ring-teal-500" />
                          </div>
                        )}
                        <p className="mt-1.5 text-xs text-slate-500">
                          JPG · PNG · WebP &nbsp;·&nbsp; max 5 MB &nbsp;·&nbsp; formato consigliato <span className="text-slate-400">16:9</span> (es. 1280×720 px)
                        </p>
                      </div>
                      <div className="md:col-span-2">
                        <label className="block text-xs text-slate-400 mb-1">Excerpt (anteprima breve)</label>
                        <input value={form.excerpt} onChange={e => setForm(f => ({...f, excerpt: e.target.value}))} placeholder="Breve descrizione visibile in lista..."
                          className="w-full px-3 py-2 bg-slate-900/60 border border-slate-600/50 rounded-lg text-white text-sm focus:ring-1 focus:ring-teal-500" />
                      </div>
                      <div className="md:col-span-2">
                        <label className="block text-xs text-slate-400 mb-1">Contenuto completo *</label>
                        <textarea value={form.contenuto} onChange={e => setForm(f => ({...f, contenuto: e.target.value}))} rows={5}
                          className="w-full px-3 py-2 bg-slate-900/60 border border-slate-600/50 rounded-lg text-white text-sm focus:ring-1 focus:ring-teal-500 resize-none" />
                        <div className="mt-2 px-3 py-2.5 bg-slate-900/40 border border-slate-700/40 rounded-lg">
                          <p className="text-xs text-slate-400 font-medium mb-1.5">Formattazione testo</p>
                          <p className="text-xs text-slate-500 leading-relaxed">
                            Usa <code className="px-1 py-0.5 bg-slate-800 text-amber-400 rounded text-[11px]">**parola**</code> o <code className="px-1 py-0.5 bg-slate-800 text-amber-400 rounded text-[11px]">**frase chiave**</code> per evidenziare i concetti importanti in ambra nel testo pubblicato.
                            Separa i paragrafi con una riga vuota.
                          </p>
                          <p className="text-xs text-slate-600 mt-1.5 italic">
                            Es: &ldquo;Il <span className="text-amber-500/80">**fatturato medio**</span> cresce del 34% nel primo anno di utilizzo.&rdquo;
                          </p>
                        </div>
                      </div>
                      <div className="flex items-center gap-6">
                        <label className="flex items-center gap-2 cursor-pointer">
                          <input type="checkbox" checked={form.pubblicato} onChange={e => setForm(f => ({...f, pubblicato: e.target.checked}))} className="rounded" />
                          <span className="text-sm text-slate-300">Pubblicato</span>
                        </label>
                        <label className="flex items-center gap-2 cursor-pointer">
                          <input type="checkbox" checked={form.in_evidenza} onChange={e => setForm(f => ({...f, in_evidenza: e.target.checked}))} className="rounded" />
                          <span className="text-sm text-slate-300">In evidenza</span>
                        </label>
                      </div>
                    </div>
                    <div className="flex gap-3 justify-end">
                      <button onClick={() => setShowForm(false)} className="px-4 py-2 text-slate-400 hover:text-white text-sm transition-colors">Annulla</button>
                      <button onClick={saveNews} disabled={saving}
                        className="px-5 py-2 bg-teal-500 hover:bg-teal-600 text-white rounded-lg text-sm font-medium transition-colors disabled:opacity-50"
                      >{saving ? 'Salvo...' : editingNews ? 'Aggiorna' : 'Pubblica'}</button>
                    </div>
                  </div>
                )}

                {/* Lista news */}
                {news.length === 0 ? (
                  <div className="text-center py-12 text-slate-400">
                    <div className="text-4xl mb-3">📰</div>
                    <p>Nessuna news ancora. Crea il primo post!</p>
                  </div>
                ) : (
                  <div className="space-y-3">
                    {news.map(n => (
                      <div key={n.id} className="bg-slate-800/40 rounded-xl border border-slate-700/50 p-4 flex items-start gap-4">
                        {n.immagine_url && (
                          <img src={n.immagine_url} alt="" className="w-16 h-16 rounded-lg object-cover flex-shrink-0" />
                        )}
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2 mb-1 flex-wrap">
                            <span className="text-white font-medium text-sm truncate">{n.titolo}</span>
                            {n.in_evidenza && <span className="text-xs text-amber-400">★ Evidenza</span>}
                            <span className={`text-xs px-2 py-0.5 rounded-full ${n.pubblicato ? 'bg-teal-500/20 text-teal-300' : 'bg-slate-700 text-slate-400'}`}>
                              {n.pubblicato ? 'Pubblicato' : 'Bozza'}
                            </span>
                            <span className="text-xs text-slate-500">{CAT_LABELS[n.categoria]}</span>
                          </div>
                          <p className="text-slate-400 text-xs line-clamp-2">{n.excerpt || n.contenuto.slice(0, 100)}</p>
                        </div>
                        <div className="flex items-center gap-2 flex-shrink-0">
                          <button onClick={() => togglePublish(n)}
                            className={`text-xs px-3 py-1.5 rounded-lg transition-colors ${n.pubblicato ? 'bg-slate-700 hover:bg-slate-600 text-slate-300' : 'bg-teal-600 hover:bg-teal-500 text-white'}`}
                          >{n.pubblicato ? 'Archivia' : 'Pubblica'}</button>
                          <button onClick={() => openEditForm(n)} className="text-xs px-3 py-1.5 bg-slate-700 hover:bg-slate-600 text-slate-300 rounded-lg transition-colors">Modifica</button>
                          <button onClick={() => deleteNews(n.id)} className="text-xs px-3 py-1.5 bg-red-500/20 hover:bg-red-500/30 text-red-400 rounded-lg transition-colors">Elimina</button>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            )}

            {/* REVIEWS TAB */}
            {tab === 'reviews' && (
              <div className="space-y-4">
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-2">
                  <div className="bg-slate-800/40 rounded-xl p-4 border border-slate-700/50 text-center">
                    <div className="text-2xl font-bold text-white">{reviews.length}</div>
                    <div className="text-xs text-slate-400">Totali con testo</div>
                  </div>
                  <div className="bg-teal-500/10 rounded-xl p-4 border border-teal-500/30 text-center">
                    <div className="text-2xl font-bold text-teal-400">{reviews.filter(r => r.is_public).length}</div>
                    <div className="text-xs text-slate-400">Pubblicate in landing</div>
                  </div>
                  <div className="bg-amber-500/10 rounded-xl p-4 border border-amber-500/30 text-center">
                    <div className="text-2xl font-bold text-amber-400">{reviews.filter(r => !r.is_public).length}</div>
                    <div className="text-xs text-slate-400">In attesa di approvazione</div>
                  </div>
                </div>

                {reviews.length === 0 ? (
                  <div className="text-center py-12 text-slate-400">
                    <div className="text-4xl mb-3">⭐</div>
                    <p>Nessuna recensione con testo ancora</p>
                  </div>
                ) : (
                  <div className="space-y-3">
                    {reviews.map(r => (
                      <div key={r.id} className={`rounded-xl border p-4 ${r.is_public ? 'bg-teal-500/5 border-teal-500/30' : 'bg-slate-800/40 border-slate-700/50'}`}>
                        <div className="flex items-start justify-between gap-4">
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center gap-3 mb-2 flex-wrap">
                              <Stars value={r.rating} />
                              <span className="text-xs text-slate-500 font-medium">{STAR_LABELS[r.rating]}</span>
                              <span className={`text-xs px-2 py-0.5 rounded-full ${r.target_type === 'hpa' ? 'bg-purple-500/20 text-purple-300' : 'bg-teal-500/20 text-teal-300'}`}>
                                {r.target_type === 'hpa' ? `HPA: ${r.target_name || '?'}` : 'Beautyx AI'}
                              </span>
                              {r.is_public && <span className="text-xs text-teal-400 font-medium">✓ In landing</span>}
                            </div>
                            <p className="text-slate-300 text-sm italic">&ldquo;{r.review}&rdquo;</p>
                            <p className="text-xs text-slate-600 mt-1">
                              {new Date(r.updated_at || r.created_at).toLocaleDateString('it-IT')}
                              {r.approved_at && ` · Approvata: ${new Date(r.approved_at).toLocaleDateString('it-IT')}`}
                            </p>
                          </div>
                          <div className="flex gap-2 flex-shrink-0">
                            {r.is_public ? (
                              <button onClick={() => approveReview(r.id, false)}
                                className="text-xs px-3 py-1.5 bg-slate-700 hover:bg-slate-600 text-slate-300 rounded-lg transition-colors"
                              >Rimuovi</button>
                            ) : (
                              <button onClick={() => approveReview(r.id, true)}
                                className="text-xs px-3 py-1.5 bg-teal-600 hover:bg-teal-500 text-white rounded-lg transition-colors"
                              >Pubblica</button>
                            )}
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            )}

            {/* LEAD TAB */}
            {tab === 'leads' && (
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <p className="text-slate-400 text-sm">
                    {leads.length} lead totali · <span className="text-teal-400">{leads.filter(l => !l.contattato).length} da contattare</span>
                  </p>
                  <span className="text-xs text-slate-500">Lead raccolti dalla landing page</span>
                </div>

                {leads.length === 0 ? (
                  <div className="bg-slate-800/40 rounded-xl border border-slate-700/50 p-10 text-center">
                    <div className="text-4xl mb-3">📭</div>
                    <p className="text-slate-400 text-sm">Nessun lead ancora. Esegui ESEGUI_marketing_leads.sql se non l&apos;hai fatto.</p>
                  </div>
                ) : (
                  <div className="space-y-2">
                    {leads.map(l => (
                      <div key={l.id}
                        className={`bg-slate-800/50 rounded-xl border p-4 flex flex-col sm:flex-row sm:items-center gap-3 transition-colors ${
                          l.contattato ? 'border-slate-700/30 opacity-60' : 'border-teal-500/20'
                        }`}>
                        <div className="flex-1 min-w-0 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-2 text-sm">
                          <div>
                            <span className="text-xs text-slate-500 block">Nome</span>
                            <span className="text-white font-medium truncate">{l.nome}</span>
                          </div>
                          <div>
                            <span className="text-xs text-slate-500 block">Email</span>
                            <a href={`mailto:${l.email}`} className="text-teal-400 hover:text-teal-300 truncate block">{l.email}</a>
                          </div>
                          <div>
                            <span className="text-xs text-slate-500 block">Centro / Città</span>
                            <span className="text-slate-300 truncate">{[l.centro, l.citta].filter(Boolean).join(' — ') || '—'}</span>
                          </div>
                          <div>
                            <span className="text-xs text-slate-500 block">Telefono</span>
                            {l.telefono
                              ? <a href={`tel:${l.telefono}`} className="text-slate-300 hover:text-white">{l.telefono}</a>
                              : <span className="text-slate-600">—</span>}
                          </div>
                        </div>
                        <div className="flex items-center gap-3 flex-shrink-0">
                          <span className="text-xs text-slate-600">
                            {new Date(l.created_at).toLocaleDateString('it-IT', { day: '2-digit', month: 'short', year: 'numeric' })}
                          </span>
                          <button onClick={() => markLead(l.id, !l.contattato)}
                            className={`text-xs px-3 py-1.5 rounded-lg font-medium transition-colors border flex-shrink-0 ${
                              l.contattato
                                ? 'bg-slate-700/60 text-slate-400 border-slate-600/50 hover:bg-slate-700'
                                : 'bg-teal-500/20 text-teal-300 border-teal-500/40 hover:bg-teal-500/30'
                            }`}>
                            {l.contattato ? '↩ Riapri' : '✓ Contattato'}
                          </button>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            )}

            {/* CONFIG TAB */}
            {tab === 'config' && (
              <div className="space-y-6">
                {/* Testi hero */}
                <div>
                  <h3 className="text-sm font-semibold text-slate-300 uppercase tracking-wider mb-3">Testi hero</h3>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    {config.filter(c => c.key.includes('headline') || c.key.includes('subline')).map(c => (
                      <ConfigRow key={c.key} item={c} onSave={updateConfig} />
                    ))}
                  </div>
                </div>

                {/* Early Adopter promo */}
                <div>
                  <h3 className="text-sm font-semibold text-amber-400 uppercase tracking-wider mb-1">👑 Promo Early Adopter</h3>
                  <p className="text-xs text-slate-500 mb-3">
                    Aggiorna i contatori man mano che i posti vengono assegnati — la landing page riflette i valori in tempo reale.
                  </p>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    {config.filter(c => c.key.startsWith('early_')).map(c => (
                      <ConfigRow key={c.key} item={c} onSave={updateConfig} />
                    ))}
                  </div>
                  {config.filter(c => c.key.startsWith('early_')).length === 0 && (
                    <p className="text-xs text-slate-600 italic">Esegui ESEGUI_early_adopter_promo.sql per attivare questa sezione.</p>
                  )}
                </div>

                {/* Benchmark */}
                <div>
                  <h3 className="text-sm font-semibold text-slate-300 uppercase tracking-wider mb-3">Benchmark & statistiche</h3>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    {config.filter(c => !c.key.includes('headline') && !c.key.includes('subline') && !c.key.startsWith('plan_') && !c.key.startsWith('early_')).map(c => (
                      <ConfigRow key={c.key} item={c} onSave={updateConfig} />
                    ))}
                  </div>
                </div>

                {/* Prezzi piani */}
                <div>
                  <h3 className="text-sm font-semibold text-slate-300 uppercase tracking-wider mb-1">Prezzi piani abbonamento</h3>
                  <p className="text-xs text-slate-500 mb-3">Modifica qui i prezzi e la nota Enterprise — si aggiornano automaticamente nella landing page.</p>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    {config.filter(c => c.key.startsWith('plan_')).map(c => (
                      <ConfigRow key={c.key} item={c} onSave={updateConfig} />
                    ))}
                  </div>
                </div>
              </div>
            )}
          </>
        )}
      </div>
    </div>
  )
}

function ConfigRow({ item, onSave }) {
  const [value, setValue] = useState(item.value)
  const [saved, setSaved] = useState(false)

  const handleSave = async () => {
    await onSave(item.key, value)
    setSaved(true)
    setTimeout(() => setSaved(false), 2000)
  }

  const isLong = item.key.includes('headline') || item.key.includes('subline')

  return (
    <div className={`bg-slate-800/40 rounded-xl border border-slate-700/50 p-4 ${isLong ? 'md:col-span-2' : ''}`}>
      <div className="flex items-center gap-2 mb-2">
        {item.icona && <span className="text-lg">{item.icona}</span>}
        <label className="text-sm font-medium text-white">{item.label || item.key}</label>
      </div>
      {isLong ? (
        <textarea value={value} onChange={e => setValue(e.target.value)} rows={2}
          className="w-full px-3 py-2 bg-slate-900/60 border border-slate-600/50 rounded-lg text-white text-sm focus:ring-1 focus:ring-teal-500 resize-none mb-2" />
      ) : (
        <input value={value} onChange={e => setValue(e.target.value)}
          className="w-full px-3 py-2 bg-slate-900/60 border border-slate-600/50 rounded-lg text-white text-sm focus:ring-1 focus:ring-teal-500 mb-2" />
      )}
      <div className="flex items-center justify-between">
        <span className="text-xs text-slate-500">{item.key}</span>
        <button onClick={handleSave}
          className={`text-xs px-3 py-1 rounded-lg transition-colors ${saved ? 'bg-teal-500/20 text-teal-400' : 'bg-teal-600 hover:bg-teal-500 text-white'}`}
        >{saved ? '✓ Salvato' : 'Salva'}</button>
      </div>
    </div>
  )
}
