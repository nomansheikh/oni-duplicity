import type { SaveGame } from '@oni-duplicity/save-parser'
import { behavior, data, objectsWith } from './save-helpers.ts'

export interface WorldBox {
  id: number
  /** The world's game object id, the same as `WorldView.id`. */
  objectId: string
  name: string
  x: number
  y: number
  width: number
  height: number
}

/** `{ asteroid }` for the world containing the position, or nothing when none does. */
export function asteroidOf(
  boxes: WorldBox[],
  position: { x: number; y: number },
): { asteroid?: string } {
  const box = boxes.find(
    (w) =>
      position.x >= w.x &&
      position.x < w.x + w.width &&
      position.y >= w.y &&
      position.y < w.y + w.height,
  )
  return box ? { asteroid: box.objectId } : {}
}

export function worldBoxes(save: SaveGame): WorldBox[] {
  const boxes: WorldBox[] = []
  for (const { id: objectId, obj } of objectsWith(save, 'WorldContainer')) {
    const world = data(obj, 'WorldContainer')
    const asteroid = behavior(obj, 'AsteroidGridEntity')?.templateData
    const name = typeof asteroid?.m_name === 'string' ? asteroid.m_name : world.worldName
    const offset = world.worldOffset as { x: number; y: number } | undefined
    const size = world.worldSize as { x: number; y: number } | undefined
    if (typeof world.id !== 'number' || typeof name !== 'string' || !offset || !size) continue
    boxes.push({
      id: world.id,
      objectId,
      name,
      x: offset.x,
      y: offset.y,
      width: size.x,
      height: size.y,
    })
  }
  return boxes
}
