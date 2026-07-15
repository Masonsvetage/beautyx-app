'use client'
import { useState, useEffect } from 'react'

const CACHE_KEY = 'beautyx_announcements'
const DISMISSED_KEY = 'beautyx_announcements_dismissed'
const CACHE_TTL = 10 * 60 * 1000 // 10 minutes

const TIPO_COLORS = {
  informazione: 'bg-blue-600/90 text-white',
  avviso: 'bg-yellow-600/90 text-white',
  promozione: 'bg-green-600/90 text-white',
  urgente: 'bg-red-600/90 text-white',
  manutenzione: 'bg-orange-600/90 text-white',
}

const TIPO_ICONS = {
  informazione: 'ℹ️',
  avviso: '⚠️',
  promozione: '🎉',
  urgente: '🚨',
  manutenzione: '🔧',
}

function getCachedAnnouncements() {
  try {
    const raw = sessionStorage.getItem(CACHE_KEY)
    if (!raw) return null
    const cached = JSON.parse(raw)
    if (Date.now() - cached.timestamp > CACHE_TTL) {
      sessionStorage.removeItem(CACHE_KEY)
      return null
    }
    return cached.data
  } catch {
    return null
  }
}

function setCachedAnnouncements(data) {
  try {
    sessionStorage.setItem(CACHE_KEY, JSON.stringify({ data, timestamp: Date.now() }))
  } catch {
    // sessionStorage full or unavailable
  }
}

function getDismissedIds() {
  try {
    const raw = sessionStorage.getItem(DISMISSED_KEY)
    return raw ? JSON.parse(raw) : []
  } catch {
    return []
  }
}

function addDismissedId(id) {
  try {
    const dismissed = getDismissedIds()
    if (!dismissed.includes(id)) {
      dismissed.push(id)
      sessionStorage.setItem(DISMISSED_KEY, JSON.stringify(dismissed))
    }
  } catch {
    // sessionStorage full or unavailable
  }
}

function BannerAnnouncement({ announcement, onDismiss }) {
  const colors = TIPO_COLORS[announcement.tipo] || TIPO_COLORS.informazione
  const icon = TIPO_ICONS[announcement.tipo] || TIPO_ICONS.informazione
  const truncatedContent =
    announcement.contenuto && announcement.contenuto.length > 100
      ? announcement.contenuto.slice(0, 100) + '...'
      : announcement.contenuto

  return (
    <div className={`mx-4 mt-2 mb-0 rounded-xl px-4 py-3 flex items-center gap-3 ${colors}`}>
      <span className="text-lg flex-shrink-0">{icon}</span>
      <div className="flex-1">
        <span className="font-semibold">{announcement.titolo}</span>
        {truncatedContent && (
          <span className="text-sm opacity-80 ml-2">{truncatedContent}</span>
        )}
      </div>
      <button onClick={() => onDismiss(announcement.id)} className="opacity-60 hover:opacity-100 transition-opacity">
        ✕
      </button>
    </div>
  )
}

function NotificationAnnouncement({ announcement, onDismiss }) {
  const colors = TIPO_COLORS[announcement.tipo] || TIPO_COLORS.informazione
  const icon = TIPO_ICONS[announcement.tipo] || TIPO_ICONS.informazione
  const [visible, setVisible] = useState(false)

  useEffect(() => {
    const showTimer = setTimeout(() => setVisible(true), 50)
    const autoDismissTimer = setTimeout(() => {
      setVisible(false)
      setTimeout(() => onDismiss(announcement.id), 300)
    }, 8000)

    return () => {
      clearTimeout(showTimer)
      clearTimeout(autoDismissTimer)
    }
  }, [announcement.id, onDismiss])

  const truncatedContent =
    announcement.contenuto && announcement.contenuto.length > 100
      ? announcement.contenuto.slice(0, 100) + '...'
      : announcement.contenuto

  return (
    <div
      className={`fixed top-4 right-4 z-50 max-w-sm rounded-xl px-4 py-3 shadow-lg transition-transform duration-300 ease-out ${colors} ${
        visible ? 'translate-x-0' : 'translate-x-[120%]'
      }`}
    >
      <div className="flex items-start gap-3">
        <span className="text-lg flex-shrink-0">{icon}</span>
        <div className="flex-1 min-w-0">
          <p className="font-semibold">{announcement.titolo}</p>
          {truncatedContent && (
            <p className="text-sm opacity-80 mt-1">{truncatedContent}</p>
          )}
        </div>
        <button
          onClick={() => {
            setVisible(false)
            setTimeout(() => onDismiss(announcement.id), 300)
          }}
          className="opacity-60 hover:opacity-100 transition-opacity flex-shrink-0"
        >
          ✕
        </button>
      </div>
    </div>
  )
}

function ModalAnnouncement({ announcement, onDismiss }) {
  const colors = TIPO_COLORS[announcement.tipo] || TIPO_COLORS.informazione
  const icon = TIPO_ICONS[announcement.tipo] || TIPO_ICONS.informazione

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm">
      <div className={`mx-4 max-w-lg w-full rounded-2xl p-6 shadow-2xl ${colors}`}>
        <div className="flex items-center gap-3 mb-4">
          <span className="text-2xl">{icon}</span>
          <h2 className="text-xl font-bold">{announcement.titolo}</h2>
        </div>
        {announcement.contenuto && (
          <p className="text-sm opacity-90 leading-relaxed mb-6">{announcement.contenuto}</p>
        )}
        <div className="flex justify-end">
          <button
            onClick={() => onDismiss(announcement.id)}
            className="bg-white/20 hover:bg-white/30 transition-colors rounded-lg px-5 py-2 font-semibold"
          >
            Ho capito
          </button>
        </div>
      </div>
    </div>
  )
}

export default function AnnouncementBanner() {
  const [announcements, setAnnouncements] = useState([])
  const [readIds, setReadIds] = useState(new Set())

  useEffect(() => {
    async function fetchAnnouncements() {
      const cached = getCachedAnnouncements()
      if (cached) {
        const dismissedIds = getDismissedIds()
        setAnnouncements(cached.filter((a) => !dismissedIds.includes(a.id)))
        return
      }

      try {
        const res = await fetch('/api/announcements')
        if (!res.ok) return
        const data = await res.json()
        const list = Array.isArray(data) ? data : data.announcements || []
        setCachedAnnouncements(list)

        const dismissedIds = getDismissedIds()
        setAnnouncements(list.filter((a) => !dismissedIds.includes(a.id)))
      } catch {
        // Network error, silently fail
      }
    }

    fetchAnnouncements()
  }, [])

  // Mark announcements as read when they become visible
  useEffect(() => {
    announcements.forEach((a) => {
      if (!readIds.has(a.id)) {
        setReadIds((prev) => new Set(prev).add(a.id))
        fetch('/api/announcements', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ announcement_id: a.id, action: 'read' }),
        }).catch(() => {})
      }
    })
  }, [announcements, readIds])

  const handleDismiss = async (id) => {
    setAnnouncements((prev) => prev.filter((a) => a.id !== id))
    addDismissedId(id)

    try {
      await fetch('/api/announcements', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ announcement_id: id, action: 'dismiss' }),
      })
    } catch {
      // Network error, dismissal is already cached locally
    }
  }

  if (announcements.length === 0) return null

  const banners = announcements.filter((a) => a.display_mode === 'banner')
  const notifications = announcements.filter((a) => a.display_mode === 'notification')
  const modals = announcements.filter(
    (a) => a.display_mode === 'modal' && (a.tipo === 'urgente' || a.tipo === 'manutenzione')
  )

  return (
    <>
      {banners.map((a) => (
        <BannerAnnouncement key={a.id} announcement={a} onDismiss={handleDismiss} />
      ))}

      {notifications.map((a) => (
        <NotificationAnnouncement key={a.id} announcement={a} onDismiss={handleDismiss} />
      ))}

      {modals.map((a) => (
        <ModalAnnouncement key={a.id} announcement={a} onDismiss={handleDismiss} />
      ))}
    </>
  )
}
