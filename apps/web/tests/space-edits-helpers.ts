import { existsSync, readFileSync } from 'node:fs'
import { parseSave, writeSaveParts, type SaveGame } from '@oni-duplicity/save-parser'
import { expect, test } from 'vite-plus/test'
import { listPoiOverview } from '../src/worker/pois.ts'
import { fixtures } from './helpers.ts'

export const body = (save: SaveGame) => writeSaveParts(save).body.slice()

export const base = fixtures.find((f) => f.endsWith('mithro-02-mid-game-cycle-148.sav'))
export const load = (path: string) => parseSave(readFileSync(path))

/** Positions where two byte arrays of the same length differ. */
export function differing(a: Uint8Array, b: Uint8Array): number[] {
  expect(b.length).toBe(a.length)
  const at: number[] = []
  for (let i = 0; i < a.length; i++) if (a[i] !== b[i]) at.push(i)
  return at
}

export function poiController(save: SaveGame, id: string) {
  const split = id.lastIndexOf(':')
  const obj = save.gameObjects.find((g) => g.name === id.slice(0, split))!.gameObjects[
    Number(id.slice(split + 1))
  ]!
  return obj.behaviors.find((b) => b.name === 'StateMachineController')!
}

export const destinationTest = base && existsSync(base) ? test : test.skip

export function partlyEmpty(save: SaveGame) {
  const poi = listPoiOverview(save).pois.find(
    (p) => p.harvest && p.harvest.current < p.harvest.max - 100,
  )
  expect(poi, 'a POI that is not full').toBeDefined()
  return poi!
}

/** A copy of the bytes with one little-endian int changed. */
export function withInt(bytes: Uint8Array, at: number, value: number): Uint8Array {
  const copy = bytes.slice()
  new DataView(copy.buffer).setInt32(at, value, true)
  return copy
}
