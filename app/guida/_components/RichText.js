'use client'

// Rende **parola** come testo evidenziato oro. Condiviso tra page.js e Chapter.js.
export default function RichText({ text }) {
  const parts = text.split(/\*\*(.+?)\*\*/g)
  if (parts.length === 1) return <>{text}</>
  return (
    <>
      {parts.map((part, i) =>
        i % 2 === 1 ? (
          <strong key={i} className="font-bold text-[#a97e1f]">{part}</strong>
        ) : (
          <span key={i}>{part}</span>
        )
      )}
    </>
  )
}
