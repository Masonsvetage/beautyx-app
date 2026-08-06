'use client'

// Placeholder per le immagini stile fumetto/illustrazione in produzione dal Designer.
// Facilmente sostituibile: quando l'immagine finale e' pronta basta rimpiazzare
// questo componente con un <img src="..."> senza toccare la logica della pagina.
// kind: 'narrazione' | 'workbook'
export default function ImagePlaceholder({ numero, kind = 'narrazione', className = '' }) {
  const label = kind === 'workbook'
    ? `IMMAGINE FUMETTO ERRORE ${numero} — workbook`
    : `IMMAGINE FUMETTO ERRORE ${numero} — narrazione`

  return (
    <div
      className={`flex items-center justify-center border-2 border-dashed border-[#c9a34a] bg-[#f5f1ea] rounded-2xl text-center px-6 py-14 ${className}`}
      role="img"
      aria-label={label}
    >
      <div>
        <div className="text-3xl mb-3">🎨</div>
        <p className="text-[#8a6d1f] font-semibold text-sm tracking-wide uppercase">{label}</p>
        <p className="text-[#b0a58f] text-xs mt-2">Placeholder — sostituire con asset finale del Designer</p>
      </div>
    </div>
  )
}
