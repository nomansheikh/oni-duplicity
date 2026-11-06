import { findElementByHash, humanize } from '@oni-duplicity/game-data'
import type { SaveGame } from '@oni-duplicity/save-parser'
import { behavior, data, objectsWith, saveGameObject } from '../save-helpers.ts'
import { destinationState } from '../space-edits.ts'
import type { DestinationView, WorldView } from '../view-types.ts'

export function listWorlds(save: SaveGame): WorldView[] {
  return objectsWith(save, 'WorldContainer').map(({ id, obj }) => {
    const world = data(obj, 'WorldContainer')
    const asteroid = behavior(obj, 'AsteroidGridEntity')?.templateData
    const size = world.worldSize as { x: number; y: number }
    const worldName = typeof world.worldName === 'string' ? world.worldName : ''
    return {
      id,
      name: typeof asteroid?.m_name === 'string' ? asteroid.m_name : worldName,
      worldType: humanize(worldName.replace(/^.*\//, '')),
      width: size.x,
      height: size.y,
      discovered: world.isDiscovered === true,
      startWorld: world.isStartWorld === true,
      visited: world.isDupeVisited === true,
    }
  })
}

export function listDestinations(save: SaveGame): DestinationView[] {
  const obj = saveGameObject(save)
  const manager = obj ? behavior(obj, 'SpacecraftManager')?.templateData : undefined
  const destinations = (manager?.destinations ?? []) as {
    id: number
    type: string
    distance: number
    recoverableElements?: [number, number][]
    availableMass?: number
  }[]
  return destinations.map((d) => ({
    ...destinationState(save, d),
    id: d.id,
    type: humanize(d.type),
    distance: d.distance,
    resources: (d.recoverableElements ?? []).map(([hash, amount]) => ({
      name: findElementByHash(hash)?.name ?? String(hash),
      amount,
    })),
  }))
}
