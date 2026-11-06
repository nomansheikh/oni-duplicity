import { type GameObject, type SaveGame, writeSaveParts } from '@oni-duplicity/save-parser'

export const find = (obj: GameObject, name: string) => obj.behaviors.find((b) => b.name === name)
export const group = (save: SaveGame, name: string) =>
  save.gameObjects.find((g) => g.name === name)?.gameObjects ?? []
export const idOf = (obj: GameObject) => Number(find(obj, 'KPrefabID')!.templateData!.InstanceID)
export const body = (save: SaveGame) => writeSaveParts(save).body.slice()

/** Items in a duplicant's storages. */
export function storedCount(obj: GameObject): number {
  return obj.behaviors.reduce(
    (n, b) => n + (b.name === 'Storage' && Array.isArray(b.extraData) ? b.extraData.length : 0),
    0,
  )
}

/** Every KPrefabID instance ID in the save, including stored items. */
export function allInstanceIds(save: SaveGame): number[] {
  const ids: number[] = []
  const visit = (obj: GameObject) => {
    const kp = find(obj, 'KPrefabID')?.templateData?.InstanceID
    if (typeof kp === 'number') ids.push(kp)
    for (const b of obj.behaviors) {
      if (b.name === 'Storage' && Array.isArray(b.extraData)) {
        ;(b.extraData as GameObject[]).forEach(visit)
      }
    }
  }
  for (const g of save.gameObjects) g.gameObjects.forEach(visit)
  return ids
}

/** The `masterTarget` instance IDs a duplicant's state machine blob holds. */
export function masterTargets(obj: GameObject): number[] {
  const raw = find(obj, 'StateMachineController')!.extraRaw
  const buf = Buffer.from(raw.buffer, raw.byteOffset, raw.byteLength)
  const out: number[] = []
  let at = -1
  while ((at = buf.indexOf('masterTarget', at + 1)) >= 0) out.push(buf.readInt32LE(at + 12))
  return out
}

/**
 * Every instance-id reference in the decoded data: a `{ id }` ref object (`Ref<T>`) or a
 * `target_instance_id`. A negative id means "none" and is skipped.
 */
export function references(save: SaveGame): number[] {
  const refs: number[] = []
  const walk = (value: unknown, key?: string) => {
    if (typeof value === 'number') {
      if (key === 'target_instance_id' && value >= 0) refs.push(value)
    } else if (Array.isArray(value)) {
      for (const v of value) walk(v)
    } else if (value && typeof value === 'object' && !(value instanceof Uint8Array)) {
      const entries = Object.entries(value)
      const only = entries[0]
      if (entries.length === 1 && only![0] === 'id' && typeof only![1] === 'number') {
        if (only![1] >= 0) refs.push(only![1])
        return
      }
      for (const [k, v] of entries) walk(v, k)
    }
  }
  for (const g of save.gameObjects) {
    for (const o of g.gameObjects) {
      for (const b of o.behaviors) {
        walk(b.templateData)
        walk(b.extraData)
      }
    }
  }
  return refs
}

/** References that point at no object in the save. */
export function dangling(save: SaveGame): number[] {
  const known = new Set(allInstanceIds(save))
  return references(save).filter((id) => !known.has(id))
}
