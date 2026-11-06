import { useEffect, useState } from 'react'
import { saveClient } from '@/lib/save-client'
import type { Edit, MaterialItemView, MaterialView } from '@/worker/model'

export function useMaterialItems(
  material: MaterialView | null,
  revision: number,
  onEdit: (edit: Edit) => Promise<void>,
) {
  const [items, setItems] = useState<MaterialItemView[]>([])
  const [selected, setSelected] = useState<Set<string>>(new Set())
  const [confirm, setConfirm] = useState<'selected' | 'all' | null>(null)
  const [deleting, setDeleting] = useState(false)
  const [loadedRevision, setLoadedRevision] = useState(revision)

  useEffect(() => {
    if (!material) return
    let cancelled = false
    void saveClient.materialItems(material.id).then((list) => {
      if (cancelled) return
      setItems(list)
      setLoadedRevision(revision)
      // Deleting shifts item references, so a selection never outlives the list it was made on.
      setSelected(new Set())
    })
    return () => {
      cancelled = true
    }
  }, [material, revision])

  // Until the list for the latest revision has landed, the rows may describe a save that has
  // already changed, so nothing can be deleted from them.
  const stale = deleting || loadedRevision !== revision
  const loose = items.filter((i) => i.loose)
  const deletable = loose.filter((i) => !i.protected && i.instanceId !== null)
  const targets = confirm === 'selected' ? deletable.filter((i) => selected.has(i.ref)) : deletable
  const skipped = confirm === 'all' ? loose.length - deletable.length : 0
  const targetMass = targets.reduce((sum, i) => sum + i.mass, 0)
  const deleteItems = async (chosen: MaterialItemView[]) => {
    setDeleting(true)
    try {
      await onEdit({ type: 'deleteDebris', ids: chosen.map((i) => i.instanceId!) })
    } finally {
      setDeleting(false)
    }
  }
  const toggle = (ref: string, on: boolean) =>
    setSelected((prev) => {
      const next = new Set(prev)
      if (on) next.add(ref)
      else next.delete(ref)
      return next
    })

  return {
    items,
    selected,
    setSelected,
    confirm,
    setConfirm,
    stale,
    loose,
    deletable,
    targets,
    skipped,
    targetMass,
    deleteItems,
    toggle,
  }
}
