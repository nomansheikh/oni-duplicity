import type { GameObject, SaveGame, StoredItem } from '@oni-duplicity/save-parser'
import { behavior, splitId } from './save-helpers.ts'

/**
 * Deep copy that keeps Uint8Array views small: a view copies only its own bytes, not the
 * (possibly 400 MB) buffer it points into, unlike structuredClone.
 */
export function cloneValue<T>(value: T): T {
  if (value instanceof Uint8Array) return value.slice() as T
  if (Array.isArray(value)) return value.map(cloneValue) as T
  if (value && typeof value === 'object') {
    const out: Record<string, unknown> = {}
    for (const [k, v] of Object.entries(value)) out[k] = cloneValue(v)
    return out as T
  }
  return value
}

export function locate(save: SaveGame, id: string): { list: GameObject[]; index: number } {
  const { group, index } = splitId(id)
  const list = save.gameObjects.find((g) => g.name === group)?.gameObjects
  if (!list?.[index]) throw new Error(`No object ${id}`)
  return { list, index }
}

/** Give an object (and anything it stores) fresh KPrefabID instance IDs from Game+Settings. */
export function assignNewIds(save: SaveGame, obj: GameObject): void {
  const kpid = behavior(obj, 'KPrefabID')?.templateData
  if (kpid) {
    const next = Number(save.settings.nextUniqueID)
    if (!Number.isFinite(next)) throw new Error('This save has no unique ID counter')
    kpid.InstanceID = next
    save.settings.nextUniqueID = next + 1
  }
  for (const b of obj.behaviors) {
    if (b.name === 'Storage' && Array.isArray(b.extraData)) {
      for (const item of b.extraData as StoredItem[]) assignNewIds(save, item)
    }
  }
}
