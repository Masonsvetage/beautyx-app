'use client'

import { useEffect, useState } from 'react'

// Progress bar sottile sticky in alto — oro su crema, palette Beautyx.
export default function ProgressBar() {
  const [pct, setPct] = useState(0)

  useEffect(() => {
    const onScroll = () => {
      const doc = document.documentElement
      const scrollTop = doc.scrollTop || document.body.scrollTop
      const scrollHeight = (doc.scrollHeight || document.body.scrollHeight) - doc.clientHeight
      const value = scrollHeight > 0 ? (scrollTop / scrollHeight) * 100 : 0
      setPct(Math.min(100, Math.max(0, value)))
    }
    onScroll()
    window.addEventListener('scroll', onScroll, { passive: true })
    window.addEventListener('resize', onScroll)
    return () => {
      window.removeEventListener('scroll', onScroll)
      window.removeEventListener('resize', onScroll)
    }
  }, [])

  return (
    <div className="fixed top-0 left-0 right-0 z-[60] h-1.5 bg-[#f5f1ea]">
      <div
        className="h-full bg-gradient-to-r from-[#c9a34a] to-[#e8c874] transition-[width] duration-150 ease-out"
        style={{ width: `${pct}%` }}
      />
    </div>
  )
}
