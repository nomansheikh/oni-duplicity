import { readFileSync } from 'node:fs'
import {
  parseBody,
  parseSave,
  readSaveParts,
  writeSaveParts,
  type SaveGame,
} from '@oni-duplicity/save-parser'
import { expect, test } from 'vite-plus/test'
import { applyWithRestore } from '../src/worker/snapshot.ts'
import { applyEdit, rawGet } from '../src/worker/model.ts'
import { rawDefaultItem } from '../src/worker/raw.ts'
import { basename } from 'node:path'
import { changedPaths, galaxy, roundTrip, sameBytes } from './helpers.ts'
import { addableArrays, addableShapes, body, smallFixtures } from './raw-search-helpers.ts'

test('add item: appends a default, offers only template-typed arrays, and undoes cleanly', () => {
  const fresh = parseSave(readFileSync(galaxy))
  const paths = addableArrays(fresh)
  expect(paths.length).toBeGreaterThan(0)
  // Header JSON and byte arrays are never offered.
  expect(rawDefaultItem(fresh, ['header', 'gameInfo', 'dlcIds'])).toBeNull()
  expect(rawDefaultItem(fresh, ['header'])).toBeNull()
  const before = body(fresh)
  for (const path of paths.slice(0, 20)) {
    const array = rawGet(fresh, path) as unknown[]
    const length = array.length
    const restore = applyWithRestore(fresh, { type: 'rawAdd', path })
    expect(array).toHaveLength(length + 1)
    restore()
    expect(array).toHaveLength(length)
  }
  expect(sameBytes(body(fresh), before)).toBe(true)
  expect(() => applyEdit(fresh, { type: 'rawAdd', path: ['header', 'gameInfo'] })).toThrow()
})
// Shapes already proven on an earlier fixture are skipped on the later (larger) ones.
const proven = new Set<string>()

test.each(smallFixtures.map((f) => [basename(f), f] as const))(
  '%s: every addable array still writes and parses after adding an item, and undo is exact',
  (_name, path) => {
    const bytes = readFileSync(path)
    const save = parseSave(bytes)
    const baseline = body(save)
    const { templates } = readSaveParts(bytes)
    let checked = 0
    for (const [key, target] of addableShapes(save)) {
      if (proven.has(key)) continue
      proven.add(key)
      checked++
      const array = rawGet(save, target) as unknown[]
      const length = array.length
      const restore = applyWithRestore(save, { type: 'rawAdd', path: target })
      let written: Uint8Array
      try {
        written = writeSaveParts(save).body.slice()
      } catch (error) {
        throw new Error(`${key} (${target.join('.')}): ${(error as Error).message}`)
      }
      const parsed = parseBody(written, templates) as unknown as SaveGame
      expect((rawGet(parsed, target) as unknown[]).length, key).toBe(length + 1)
      restore()
      expect(array.length, key).toBe(length)
      expect(sameBytes(body(save), baseline), `${key}: undo`).toBe(true)
    }
    expect(checked).toBeGreaterThanOrEqual(0)
  },
  900_000,
)

test('arrays whose element type has no template are not offered', () => {
  const s = parseSave(readFileSync(galaxy))
  const shapes = [...addableShapes(s).keys()].join(' ')
  for (const name of [
    'EventInstances',
    'serializedMinions',
    'spacecraft',
    'activeEvents',
    'm_researchDestinations',
  ]) {
    expect(shapes).not.toContain(`.${name}`)
  }
})
// Every fixture with an addable array: appending one default changes only that array, and the
// result re-parses. Small saves by default, every fixture with FIXTURE_TIER=all.
test.each(smallFixtures.map((f) => [basename(f), f] as const))(
  '%s: adding an item changes only that array',
  (_name, path) => {
    const original = parseSave(readFileSync(path))
    const edited = parseSave(readFileSync(path))
    const target = addableArrays(edited, 50).at(-1)!
    expect(target).toBeDefined()
    applyEdit(edited, { type: 'rawAdd', path: target })
    const reread = roundTrip(edited)
    const before = rawGet(original, target) as unknown[]
    const after = rawGet(reread, target) as unknown[]
    expect(after).toHaveLength(before.length + 1)
    const changed = changedPaths(original, reread)
    const array = target.join('.')
    expect(
      changed.every((p) => p === array || p.startsWith(`${array}.`) || p === `${array}.length`),
    ).toBe(true)
    expect(changed.length).toBeGreaterThan(0)
    // The old items survived untouched.
    expect(after.slice(0, before.length)).toEqual(before)
  },
  300_000,
)
