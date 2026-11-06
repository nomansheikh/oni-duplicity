import { expect, type Page } from '@playwright/test'
import type { SaveGame } from '@oni-duplicity/save-parser'
import { behavior, goTo, openSave } from './helpers.ts'

export type Obj = SaveGame['gameObjects'][number]['gameObjects'][number]

export const WILDNESS = 'Wildness'

/** Opens the critters page filtered to one prefab (the search matches the prefab ID). */
export async function openCritters(page: Page, prefab: string) {
  await openSave(page)
  await goTo(page, 'Critters')
  await expect(page.getByText(/\d+ critters across \d+ families/)).toBeVisible()
  await page.getByPlaceholder('Search critters').fill(prefab)
}

/** The table row of the critter shown at this rounded position, e.g. `94, 111`. */
export function critterRow(page: Page, position: string) {
  return page
    .getByRole('row')
    .filter({ has: page.getByRole('cell', { name: position, exact: true }) })
}

export const amounts = (obj: Obj) =>
  (behavior(obj, 'Klei.AI.Modifiers')!.extraData as { amounts: { name: string; value: unknown }[] })
    .amounts

export const wildness = (obj: Obj) =>
  (amounts(obj).find((a) => a.name === WILDNESS)!.value as { value: number }).value

export const instanceId = (obj: Obj) => Number(behavior(obj, 'KPrefabID')!.templateData!.InstanceID)

export const nextUniqueId = (save: SaveGame) => Number(save.settings.nextUniqueID)

/** The save with one prefab group replaced by `objects`, for diffing everything else. */
export function withGroup(save: SaveGame, prefab: string, objects: Obj[]): SaveGame {
  return {
    ...save,
    gameObjects: save.gameObjects.map((g) =>
      g.name === prefab ? { ...g, gameObjects: objects } : g,
    ),
  }
}

/** The save without one prefab group, for asserting that every other group is untouched. */
export function withoutGroup(save: SaveGame, prefab: string): SaveGame {
  return { ...save, gameObjects: save.gameObjects.filter((g) => g.name !== prefab) }
}

/** Drops every `InstanceID`, which a clone gets fresh (also on what it stores). */
export function stripIds(value: unknown): unknown {
  if (value instanceof Uint8Array) return value
  if (Array.isArray(value)) return value.map(stripIds)
  if (value && typeof value === 'object') {
    return Object.fromEntries(
      Object.entries(value)
        .filter(([key]) => key !== 'InstanceID')
        .map(([key, v]) => [key, stripIds(v)]),
    )
  }
  return value
}

export const slot = (obj: Obj, id: string) => amounts(obj).findIndex((a) => a.name === id)
export const stored = (obj: Obj, id: string) =>
  (amounts(obj).find((a) => a.name === id)!.value as { value: number }).value
