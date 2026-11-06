import { geyserTypes } from '@oni-duplicity/game-data'
import {
  parseSave,
  writeSaveParts,
  type GameObject,
  type SaveGame,
} from '@oni-duplicity/save-parser'
import { readFileSync } from 'node:fs'
import { expect } from 'vite-plus/test'
import { listGeysers, type GeyserView } from '../src/worker/model.ts'
import { changedPaths, galaxy } from './helpers.ts'

export const load = () => parseSave(readFileSync(galaxy))
export const body = (save: SaveGame) => writeSaveParts(save).body.slice()
export const typeOf = (id: string) => geyserTypes.find((t) => t.id === id)!

export const find = (save: SaveGame, prefab: string): GeyserView =>
  listGeysers(save).find((g) => g.prefab === prefab)!

export function behavior(obj: GameObject, name: string) {
  return obj.behaviors.find((b) => b.name === name)!.templateData!
}

export const names = (save: SaveGame) => save.gameObjects.map((g) => g.name)

/** Paths changed on one object between two saves, relative to the object's behaviors. */
export function objectChanges(before: GameObject, after: GameObject): string[] {
  const out: string[] = []
  expect(after.behaviors.map((b) => b.name)).toEqual(before.behaviors.map((b) => b.name))
  expect(after.position).toEqual(before.position)
  expect(after.rotation).toEqual(before.rotation)
  expect(after.scale).toEqual(before.scale)
  expect(after.folder).toBe(before.folder)
  before.behaviors.forEach((b, i) => {
    for (const path of changedPaths(b, after.behaviors[i], b.name)) out.push(path)
  })
  return out
}
