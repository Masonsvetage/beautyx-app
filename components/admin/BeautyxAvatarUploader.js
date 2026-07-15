'use client'
import { useState } from 'react'

export default function BeautyxAvatarUploader({ currentAvatarUrl, onUploadSuccess }) {
  const [uploading, setUploading] = useState(false)
  const [previewUrl, setPreviewUrl] = useState(currentAvatarUrl)
  const [error, setError] = useState(null)

  const handleFileSelect = async (e) => {
    const file = e.target.files[0]
    if (!file) return

    const validFormats = ['image/png', 'image/jpeg', 'image/jpg', 'image/svg+xml', 'image/webp']
    if (!validFormats.includes(file.type)) {
      setError('Formato non valido. Usa PNG, JPG, SVG o WebP.')
      return
    }
    if (file.size > 5 * 1024 * 1024) {
      setError('File troppo grande. Massimo 5MB.')
      return
    }

    // Preview locale immediata
    const reader = new FileReader()
    reader.onload = (e) => setPreviewUrl(e.target.result)
    reader.readAsDataURL(file)

    await uploadAvatar(file)
  }

  const uploadAvatar = async (file) => {
    setUploading(true)
    setError(null)
    try {
      const formData = new FormData()
      formData.append('file', file)

      const res = await fetch('/api/admin/beautyx-avatar', {
        method: 'PUT',
        body: formData
      })
      const data = await res.json()

      if (!res.ok) throw new Error(data.error || 'Errore upload')

      setPreviewUrl(data.avatar_url)
      if (onUploadSuccess) onUploadSuccess(data.avatar_url)
    } catch (err) {
      setError(err.message)
      console.error('Errore upload:', err)
    } finally {
      setUploading(false)
    }
  }

  const resetToDefault = async () => {
    if (!confirm('Ripristinare avatar di default?')) return
    setUploading(true)
    try {
      const res = await fetch('/api/admin/beautyx-avatar', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({})
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error)

      setPreviewUrl('/beautyx-avatar.svg')
      if (onUploadSuccess) onUploadSuccess('/beautyx-avatar.svg')
    } catch (err) {
      setError(err.message)
    } finally {
      setUploading(false)
    }
  }

  return (
    <div className="bg-slate-800/50 rounded-xl p-6 border border-slate-700/50">
      <div className="flex items-center gap-3 mb-4">
        <div className="w-10 h-10 bg-gradient-to-br from-teal-500 to-emerald-500 rounded-lg flex items-center justify-center">
          <span className="text-white text-xl">✨</span>
        </div>
        <div>
          <h3 className="text-base font-semibold text-white">Avatar Beautyx AI</h3>
          <p className="text-xs text-slate-400">Visibile a tutti gli utenti (globale)</p>
        </div>
      </div>

      {/* Preview */}
      <div className="flex justify-center mb-5">
        <div className="w-32 h-32 rounded-full bg-gradient-to-br from-teal-500/20 to-emerald-500/20 border-2 border-teal-500/30 overflow-hidden flex items-center justify-center">
          <img
            src={previewUrl || '/beautyx-avatar.svg'}
            alt="Avatar Beautyx"
            className="w-full h-full object-cover"
          />
        </div>
      </div>

      {error && (
        <div className="bg-red-900/30 border border-red-500/40 text-red-400 px-4 py-2 rounded-lg mb-4 text-sm">
          {error}
        </div>
      )}

      <div className="flex gap-3">
        <label className="flex-1">
          <input
            type="file"
            accept="image/png,image/jpeg,image/jpg,image/svg+xml,image/webp"
            onChange={handleFileSelect}
            disabled={uploading}
            className="hidden"
          />
          <span className={`block text-center px-4 py-2 rounded-lg text-sm font-medium text-white transition-colors cursor-pointer ${
            uploading ? 'bg-slate-600 cursor-not-allowed' : 'bg-teal-600 hover:bg-teal-700'
          }`}>
            {uploading ? 'Caricamento...' : 'Carica immagine'}
          </span>
        </label>
        <button
          onClick={resetToDefault}
          disabled={uploading}
          className="px-4 py-2 bg-slate-700 hover:bg-slate-600 text-slate-300 rounded-lg text-sm transition-colors disabled:opacity-50"
        >
          Default
        </button>
      </div>

      <p className="text-xs text-slate-500 mt-3">PNG, JPG, SVG, WebP · max 5MB · consigliato 400×400px</p>
    </div>
  )
}
