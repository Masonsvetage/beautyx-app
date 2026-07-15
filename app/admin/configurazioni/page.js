'use client'

import { useState, useEffect } from 'react'
import BeautyxAvatarUploader from '@/components/admin/BeautyxAvatarUploader'

export default function ConfigurazioniPage() {
  const [avatarUrl, setAvatarUrl] = useState('/beautyx-avatar.svg')
  const [saved, setSaved] = useState(false)

  useEffect(() => {
    fetch('/api/admin/beautyx-avatar')
      .then(r => r.json())
      .then(d => { if (d.avatar_url) setAvatarUrl(d.avatar_url) })
      .catch(() => {})
  }, [])

  const handleAvatarSuccess = (url) => {
    setAvatarUrl(url)
    setSaved(true)
    setTimeout(() => setSaved(false), 3000)
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900 p-4 md:p-6">
      <div className="max-w-3xl mx-auto space-y-6">

        {/* Header */}
        <div className="bg-slate-950/60 backdrop-blur-md rounded-xl border border-slate-700/50 p-4">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-gradient-to-br from-teal-600 to-cyan-600 rounded-lg flex items-center justify-center">
              <svg className="w-6 h-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" />
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
              </svg>
            </div>
            <div>
              <h1 className="text-2xl font-bold text-white">Configurazioni Globali</h1>
              <p className="text-sm text-teal-300">Impostazioni visibili a tutti gli utenti della piattaforma</p>
            </div>
          </div>
        </div>

        {/* Toast successo */}
        {saved && (
          <div className="bg-emerald-900/40 border border-emerald-500/40 text-emerald-300 px-4 py-3 rounded-xl text-sm">
            Impostazioni salvate con successo! Le modifiche sono visibili immediatamente a tutti gli utenti.
          </div>
        )}

        {/* Sezione Avatar Beautyx AI */}
        <div>
          <h2 className="text-sm font-semibold text-slate-400 uppercase tracking-wider mb-3 px-1">
            Identita Visiva
          </h2>
          <BeautyxAvatarUploader
            currentAvatarUrl={avatarUrl}
            onUploadSuccess={handleAvatarSuccess}
          />
        </div>

        {/* Placeholder per future impostazioni */}
        <div className="bg-slate-800/30 border border-dashed border-slate-700/50 rounded-xl p-6 text-center">
          <p className="text-slate-500 text-sm">Altre impostazioni globali verranno aggiunte qui</p>
        </div>

      </div>
    </div>
  )
}
