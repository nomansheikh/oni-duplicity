import { existsSync, readFileSync } from 'node:fs'
import { fileURLToPath } from 'node:url'
import { parseSave, writeSave, type SaveGame } from '@oni-duplicity/save-parser'

const testData = fileURLToPath(new URL('../../../test-data/', import.meta.url))

export const galaxy = `${testData}saves/beautiful-galaxy.sav`

export const fixtures = (
  JSON.parse(readFileSync(`${testData}fixtures.json`, 'utf8')) as {
    fixtures: { file: string; committed: boolean }[]
  }
).fixtures
  .map((f) => `${testData}${f.committed ? 'saves' : 'fetched'}/${f.file}`)
  .filter((path) => existsSync(path))

/** Writes a save and parses the result, as a download followed by a reload would. */
export function roundTrip(save: SaveGame): SaveGame {
  return parseSave(writeSave(save))
}

/** Every path where two parsed values differ, e.g. "gameObjects.3.gameObjects.0.behaviors.2". */
export function changedPaths(a: unknown, b: unknown, path = '', out: string[] = []): string[] {
  if (Object.is(a, b)) return out
  if (
    typeof a !== 'object' ||
    typeof b !== 'object' ||
    a === null ||
    b === null ||
    Array.isArray(a) !== Array.isArray(b)
  ) {
    out.push(path)
    return out
  }
  if (ArrayBuffer.isView(a) || ArrayBuffer.isView(b)) {
    const x = a as unknown as Uint8Array
    const y = b as unknown as Uint8Array
    if (x.length !== y.length || x.some((v, i) => v !== y[i])) out.push(path)
    return out
  }
  const keys = new Set([...Object.keys(a), ...Object.keys(b)])
  for (const key of keys) {
    const next = path ? `${path}.${key}` : key
    if (!(key in a) || !(key in b)) out.push(next)
    else changedPaths((a as never)[key], (b as never)[key], next, out)
  }
  return out
}

/** Byte equality that stays cheap on 100 MB bodies, unlike `toEqual`. */
export function sameBytes(a: Uint8Array, b: Uint8Array): boolean {
  return a.length === b.length && Buffer.compare(a, b) === 0
}
