/**
 * Componente riutilizzabile per selezionare l'ordinamento degli elenchi
 *
 * Pattern standard per tutti gli elenchi in BeautyX:
 * - Ogni elenco deve avere la possibilità di ordinamento
 * - Posizionare in alto a destra o vicino ai filtri
 * - Mantenere lo stato locale nel componente che usa il selettore
 *
 * @param {Array} options - Array di opzioni {value: string, label: string, icon?: string}
 * @param {string} value - Valore corrente selezionato
 * @param {function} onChange - Callback quando cambia selezione
 * @param {string} variant - Stile: 'light' (sfondo bianco), 'dark' (sfondo trasparente su header colorato)
 * @param {string} size - Dimensione: 'sm', 'md', 'lg'
 */
export default function SortSelector({
  options,
  value,
  onChange,
  variant = 'light',
  size = 'md',
  label = 'Ordina per:'
}) {
  const sizeClasses = {
    sm: 'px-2 py-1 text-xs',
    md: 'px-3 py-1.5 text-sm',
    lg: 'px-4 py-2 text-base'
  }

  const variantClasses = {
    light: 'bg-gradient-to-r from-teal-50 to-cyan-50 text-teal-700 border-teal-200 hover:border-teal-300',
    dark: 'bg-white/20 text-white border-white/30 hover:bg-white/30'
  }

  const labelClasses = {
    light: 'text-gray-600',
    dark: 'text-white/90'
  }

  return (
    <div className="flex items-center gap-2">
      {label && (
        <span className={`text-xs font-medium ${labelClasses[variant]}`}>
          {label}
        </span>
      )}
      <select
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className={`
          ${sizeClasses[size]}
          ${variantClasses[variant]}
          rounded-lg font-semibold border transition-all
          focus:outline-none focus:ring-2 focus:ring-teal-500 cursor-pointer
        `}
      >
        {options.map(option => (
          <option key={option.value} value={option.value} className="text-gray-900">
            {option.icon ? `${option.icon} ` : ''}{option.label}
          </option>
        ))}
      </select>
    </div>
  )
}
