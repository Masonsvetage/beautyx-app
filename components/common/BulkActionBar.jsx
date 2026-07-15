'use client'

/**
 * BulkActionBar — barra azioni collettive per selezioni multiple.
 *
 * Props:
 *   count        {number}   quanti elementi sono selezionati
 *   totalCount   {number}   quanti elementi ci sono in tutto
 *   onClear      {fn}       deseleziona tutto
 *   onSelectAll  {fn}       seleziona tutto
 *   actions      {Array}    [{ label, onClick, danger?, color?, icon?, loading? }]
 *
 * Rimane nascosta se count === 0.
 */
export default function BulkActionBar({ count, totalCount, onClear, onSelectAll, actions = [] }) {
  if (count === 0) return null

  const allSelected = totalCount > 0 && count >= totalCount

  return (
    <div className="flex items-center gap-3 bg-slate-800 border border-teal-500/40 rounded-xl px-4 py-2.5 mb-3 shadow-lg shadow-teal-900/20">
      {/* Checkbox select-all / deselect-all */}
      <label className="flex items-center gap-2 cursor-pointer select-none">
        <input
          type="checkbox"
          checked={allSelected}
          onChange={() => allSelected ? onClear() : onSelectAll?.()}
          className="w-4 h-4 accent-teal-500 cursor-pointer"
        />
        <span className="text-sm text-teal-300 font-semibold">
          {count}{totalCount ? ` / ${totalCount}` : ''} selezionat{count === 1 ? 'o' : 'i'}
        </span>
      </label>

      <button
        onClick={onClear}
        className="text-xs text-slate-500 hover:text-slate-300 transition-colors ml-0.5"
        title="Deseleziona tutto"
      >
        ✕
      </button>

      <div className="flex-1" />

      {/* Azioni bulk */}
      {actions.map((a, i) => (
        <button
          key={i}
          onClick={a.onClick}
          disabled={a.loading}
          title={a.title}
          className={[
            'text-xs px-3 py-1.5 rounded-lg font-semibold transition-all disabled:opacity-50 text-white whitespace-nowrap',
            a.danger
              ? 'bg-red-600 hover:bg-red-500'
              : a.color === 'indigo'
                ? 'bg-indigo-600 hover:bg-indigo-500'
                : a.color === 'amber'
                  ? 'bg-amber-600 hover:bg-amber-500'
                  : a.color === 'slate'
                    ? 'bg-slate-600 hover:bg-slate-500'
                    : 'bg-teal-600 hover:bg-teal-500',
          ].join(' ')}
        >
          {a.loading
            ? 'Attendere...'
            : a.icon ? `${a.icon} ${a.label}` : a.label
          }
        </button>
      ))}
    </div>
  )
}
