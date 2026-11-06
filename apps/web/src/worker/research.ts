import { findTech, techs as techCatalog } from '@oni-duplicity/game-data'
import type { SaveGame } from '@oni-duplicity/save-parser'
import { behavior, named, saveGameObject } from './save-helpers.ts'
import type { TechView } from './view-types.ts'

interface SavedTech {
  techId: string
  complete: boolean
  [key: string]: unknown
}

function researchData(save: SaveGame): { techs: SavedTech[] } | undefined {
  const obj = saveGameObject(save)
  const research = obj ? behavior(obj, 'Research')?.templateData : undefined
  return research?.saveData as { techs: SavedTech[] } | undefined
}

export function setTech(save: SaveGame, techId: string, complete: boolean): void {
  const saveData = researchData(save)
  if (!saveData) throw new Error('This save has no research data')
  saveData.techs ??= []
  const existing = saveData.techs.find((t) => t.techId === techId)
  if (existing) {
    existing.complete = complete
    return
  }
  if (!complete) return
  // Copy the shape of an existing entry (inventory IDs differ between base game and DLC).
  const template = saveData.techs[0]
  const inventoryIDs = (template?.inventoryIDs as string[] | undefined) ?? [
    'basic',
    'advanced',
    'space',
  ]
  saveData.techs.push({
    techId,
    complete: true,
    inventoryIDs: [...inventoryIDs],
    inventoryValues: inventoryIDs.map(() => 0),
    ...(template && 'unlockedPOIIDs' in template ? { unlockedPOIIDs: [] } : {}),
  })
}

export function listTechs(save: SaveGame): TechView[] {
  const saved = new Map((researchData(save)?.techs ?? []).map((t) => [t.techId, t.complete]))
  const ids = new Set([...techCatalog.map((t) => t.id), ...saved.keys()])
  return [...ids]
    .map((id) => ({ ...named(id, findTech(id)), complete: saved.get(id) === true }))
    .sort((a, b) => a.name.localeCompare(b.name))
}
