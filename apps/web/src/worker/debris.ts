import type { GameObject, SaveGame } from '@oni-duplicity/save-parser'
import { isLooseChunk } from './material-items.ts'
import { behavior, instanceId } from './save-helpers.ts'

/**
 * KPrefabID instance IDs that a move order (the "Move here" tool) points at. Each order is a
 * MovePickupablePlacer whose CancellableMove behavior saves a list of `Ref<Movable>` IDs, and
 * the game's `CancellableMove.OnCancel` calls `ClearMove()` on whatever the ID resolves to
 * without a null check, so deleting an item that is still listed there can crash the game.
 */
export function markedForMoveIds(save: SaveGame): Set<number> {
  const ids = new Set<number>()
  for (const group of save.gameObjects) {
    for (const obj of group.gameObjects) {
      const movables = behavior(obj, 'CancellableMove')?.templateData?.movables
      if (!Array.isArray(movables)) continue
      for (const ref of movables as { id?: unknown }[]) {
        if (typeof ref?.id === 'number') ids.add(ref.id)
      }
    }
  }
  return ids
}

export function isMarkedForMove(obj: GameObject, moving: Set<number>): boolean {
  if (behavior(obj, 'Movable')?.templateData?.isMarkedForMove === true) return true
  const id = instanceId(obj)
  return id !== undefined && moving.has(id)
}

export function assertNotMarkedForMove(obj: GameObject, moving: Set<number>, id: string): void {
  if (isMarkedForMove(obj, moving)) {
    throw new Error(`${id} is marked for a move order; cancel the move in game first`)
  }
}

/**
 * Removes loose element chunks by KPrefabID instance ID. Positions (`<element>:<index>`) shift
 * after every delete, so a click made on a list that has since changed could hit a different
 * chunk; instance IDs do not. Refuses unknown IDs and anything a move order points at, before
 * changing anything. Stored items, buildings and critters are never loose chunks, so they are
 * never found.
 */
export function deleteDebris(save: SaveGame, ids: number[]): void {
  const wanted = new Set(ids)
  const found = new Map<number, { list: GameObject[]; index: number }>()
  const moving = markedForMoveIds(save)
  for (const group of save.gameObjects) {
    group.gameObjects.forEach((obj, index) => {
      if (!isLooseChunk(group.name, obj)) return
      const id = instanceId(obj)
      if (id === undefined || !wanted.has(id)) return
      if (found.has(id)) throw new Error(`Loose item ${id} is ambiguous`)
      assertNotMarkedForMove(obj, moving, `${group.name}:${index}`)
      found.set(id, { list: group.gameObjects, index })
    })
  }
  for (const id of wanted) {
    if (!found.has(id)) throw new Error(`Loose item ${id} no longer exists`)
  }
  const byList = new Map<GameObject[], number[]>()
  for (const { list, index } of found.values())
    byList.set(list, [...(byList.get(list) ?? []), index])
  for (const [list, indexes] of byList) {
    for (const index of indexes.sort((a, b) => b - a)) list.splice(index, 1)
  }
}
