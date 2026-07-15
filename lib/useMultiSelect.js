import { useState } from 'react'

/**
 * Hook riutilizzabile per selezione multipla in elenchi.
 *
 * Uso:
 *   const ms = useMultiSelect()
 *
 *   // in ogni riga:
 *   <input type="checkbox" checked={ms.isSelected(item.id)} onChange={() => ms.toggle(item.id)} />
 *
 *   // select all:
 *   <input type="checkbox" checked={ms.allSelected(ids)} onChange={() => ms.toggleAll(ids)} />
 *
 *   // bulk action bar:
 *   if (ms.hasAny) <BulkActionBar count={ms.count} onClear={ms.clear} actions={[...]} />
 */
export function useMultiSelect() {
  const [selected, setSelected] = useState(new Set())

  function toggle(id) {
    setSelected(prev => {
      const s = new Set(prev)
      s.has(id) ? s.delete(id) : s.add(id)
      return s
    })
  }

  function toggleAll(ids) {
    const idArr = Array.isArray(ids) ? ids : [...ids]
    const allIn = idArr.length > 0 && idArr.every(id => selected.has(id))
    setSelected(allIn ? new Set() : new Set(idArr))
  }

  function clear() {
    setSelected(new Set())
  }

  return {
    selected,
    toggle,
    toggleAll,
    clear,
    isSelected: id => selected.has(id),
    allSelected: ids => {
      const idArr = Array.isArray(ids) ? ids : [...ids]
      return idArr.length > 0 && idArr.every(id => selected.has(id))
    },
    count: selected.size,
    hasAny: selected.size > 0,
    ids: [...selected],
  }
}
