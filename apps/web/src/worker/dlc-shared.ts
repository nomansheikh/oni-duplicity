import type { GameObject, SaveGame } from '@oni-duplicity/save-parser'

export const SECONDS_PER_CYCLE = 600

export function behaviorOf(obj: GameObject, name: string) {
  return obj.behaviors.find((b) => b.name === name)
}

export function groupObjects(save: SaveGame, prefab: string): GameObject[] {
  return save.gameObjects.find((g) => g.name === prefab)?.gameObjects ?? []
}

export function dlcIdsOf(save: SaveGame): string[] {
  const info = save.header.gameInfo
  if (Array.isArray(info.dlcIds)) return info.dlcIds.filter((id) => id !== '')
  return info.dlcId ? [info.dlcId] : []
}

export const asNumber = (value: unknown): number | undefined =>
  typeof value === 'number' && Number.isFinite(value) ? value : undefined
