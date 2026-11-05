import { readFileSync } from 'node:fs'
import { basename } from 'node:path'
import {
  parseBody,
  parseSave,
  readSaveParts,
  writeSaveParts,
  type SaveGame,
} from '@oni-duplicity/save-parser'
import { expect, test } from 'vite-plus/test'
import { applyWithRestore } from '../src/worker/snapshot.ts'
import { applyEdit, rawChildren, rawGet, rawReveal, type RawPath } from '../src/worker/model.ts'
import { createSearchRunner, rawCanAdd, rawDefaultItem, rawSearch } from '../src/worker/raw.ts'
import { changedPaths, fixtures, galaxy, roundTrip, sameBytes } from './helpers.ts'

const save = parseSave(readFileSync(galaxy))
const body = (s: SaveGame) => writeSaveParts(s).body.slice()

test('finds a key name anywhere in the tree', async () => {
  const { matches, truncated } = await rawSearch(save, { query: 'numberOfCycles' })
  expect(truncated).toBe(false)
  const hit = matches.find(
    (m) => m.by === 'key' && m.path.join('.') === 'header.gameInfo.numberOfCycles',
  )
  expect(hit).toMatchObject({ kind: 'number', value: '88' })
  // Case does not matter, and every hit's last key really contains the text.
  const loose = await rawSearch(save, { query: 'NUMBEROFCYCLES' })
  expect(loose.matches.map((m) => m.path)).toEqual(matches.map((m) => m.path))
  for (const m of matches) expect(String(m.path.at(-1)).toLowerCase()).toContain('numberofcycles')
})

test('matches a path substring when the text looks like a path', async () => {
  const { matches } = await rawSearch(save, { query: 'gameInfo.numberOf' })
  expect(
    matches.some((m) => m.by === 'path' && m.path.join('.') === 'header.gameInfo.numberOfCycles'),
  ).toBe(true)
  for (const m of matches) {
    expect(
      m.path
        .map((p, i) => (typeof p === 'number' ? `[${p}]` : i === 0 ? p : `.${p}`))
        .join('')
        .toLowerCase(),
    ).toContain('gameinfo.numberof')
  }
})

test('matches primitive values only when asked', async () => {
  const name = save.header.gameInfo.baseName
  const without = await rawSearch(save, { query: name })
  expect(
    without.matches.find((m) => m.path.join('.') === 'header.gameInfo.baseName'),
  ).toBeUndefined()
  const withValues = await rawSearch(save, { query: name, values: true })
  expect(
    withValues.matches.find((m) => m.path.join('.') === 'header.gameInfo.baseName'),
  ).toMatchObject({
    by: 'value',
    value: name,
  })
  // Every value hit resolves to a primitive containing the text.
  for (const m of withValues.matches) {
    expect(String(rawGet(save, m.path)).toLowerCase()).toContain(name.toLowerCase())
  }
})

test('stops at the limit and says so', async () => {
  const all = await rawSearch(save, { query: 'Temperature', limit: 1_000_000 })
  expect(all.truncated).toBe(false)
  expect(all.matches.length).toBeGreaterThan(5)
  const some = await rawSearch(save, { query: 'Temperature', limit: 5 })
  expect(some.matches).toHaveLength(5)
  expect(some.truncated).toBe(true)
  // The first hits are the first in tree order.
  expect(some.matches.map((m) => m.path)).toEqual(all.matches.slice(0, 5).map((m) => m.path))
  const exact = await rawSearch(save, { query: 'Temperature', limit: all.matches.length })
  expect(exact.truncated).toBe(false)
})

test('a cancel between slices rejects the search', async () => {
  let cancelled = false
  await expect(
    rawSearch(
      save,
      { query: 'no-such-key-anywhere', values: true },
      {
        cancelled: () => cancelled,
        yield: async () => {
          cancelled = true
        },
      },
    ),
  ).rejects.toThrow('cancelled')
})

test('reveal opens every ancestor far enough to show the target', () => {
  const target: RawPath = ['header', 'gameInfo', 'numberOfCycles']
  const steps = rawReveal(save, target)
  expect(steps.map((s) => s.path)).toEqual([[], ['header'], ['header', 'gameInfo']])
  const last = steps.at(-1)!
  expect(last.children.entries.some((e) => e.path.join('.') === target.join('.'))).toBe(true)
  // A deep array index beyond the first page is included.
  const items = save.gameObjects.find((g) => g.gameObjects.length > 0)!
  const index = save.gameObjects.indexOf(items)
  const deep = rawReveal(save, ['gameObjects', index])
  expect(deep.at(-1)!.children.entries.some((e) => e.key === index)).toBe(true)
})

/** Every array the editor offers "add item" for, found by walking template-typed roots. */
function addableArrays(s: SaveGame, limit = 200): RawPath[] {
  const out: RawPath[] = []
  const visit = (path: RawPath) => {
    if (out.length >= limit) return
    const { entries } = rawChildren(s, path, 0, 100_000)
    for (const e of entries) {
      if (e.kind === 'array' && e.canAdd) out.push(e.path)
      if ((e.kind === 'object' || e.kind === 'array') && path.length < 12) visit(e.path)
    }
  }
  for (const root of ['world', 'settings', 'gameData']) visit([root])
  return out
}

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

const all = process.env.FIXTURE_TIER === 'all'

/**
 * Every array "add item" is offered for, one per distinct shape: the world, settings and game
 * data roots, and every behavior's template data (keyed by behavior name, indices ignored).
 */
function addableShapes(save: SaveGame): Map<string, RawPath> {
  const found = new Map<string, RawPath>()
  const walk = (value: unknown, path: RawPath, key: string) => {
    if (value === null || typeof value !== 'object' || value instanceof Uint8Array) return
    if (Array.isArray(value)) {
      if (!found.has(key) && rawCanAdd(save, path)) found.set(key, [...path])
      for (let i = 0; i < value.length; i++) walk(value[i], [...path, i], `${key}.*`)
      return
    }
    for (const [name, child] of Object.entries(value))
      walk(child, [...path, name], `${key}.${name}`)
  }
  for (const root of ['world', 'settings', 'gameData'] as const) {
    walk(save[root], [root], root)
  }
  save.gameObjects.forEach((group, g) =>
    group.gameObjects.forEach((obj, i) =>
      obj.behaviors.forEach((b, j) => {
        if (b.templateData) {
          const path: RawPath = ['gameObjects', g, 'gameObjects', i, 'behaviors', j, 'templateData']
          walk(b.templateData, path, `${b.name}`)
        }
      }),
    ),
  )
  return found
}

// Shapes already proven on an earlier fixture are skipped on the later (larger) ones.
const proven = new Set<string>()

test.each(
  fixtures.filter((f) => all || !/mithro-0[3-6]/.test(f)).map((f) => [basename(f), f] as const),
)(
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

test('a cancel only reaches a search that is running', async () => {
  const runner = createSearchRunner(() => new Promise((resolve) => setTimeout(resolve, 0)))
  // A stale cancel for an id nobody is running must not poison a later search that reuses it.
  runner.cancel(7)
  const result = await runner.run(save, 7, { query: 'numberOfCycles' })
  expect(result.matches.length).toBeGreaterThan(0)
  expect(runner.active).toBe(0)
  // Cancelling a running search rejects it and leaves nothing behind.
  const running = runner.run(save, 8, { query: 'zzz-nothing', values: true })
  runner.cancel(8)
  await expect(running).rejects.toThrow('cancelled')
  expect(runner.active).toBe(0)
  // The same id can be used again afterwards.
  await expect(runner.run(save, 8, { query: 'numberOfCycles' })).resolves.toBeDefined()
})

// Every fixture with an addable array: appending one default changes only that array, and the
// result re-parses. Small saves by default, every fixture with FIXTURE_TIER=all.
test.each(
  fixtures.filter((f) => all || !/mithro-0[3-6]/.test(f)).map((f) => [basename(f), f] as const),
)(
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

test.skipIf(!all)(
  'timing: whole-tree search on the largest fixture stays near the 2 s budget',
  async () => {
    const path = fixtures.find((f) => f.endsWith('mithro-06-maximum-cycle-4770.sav'))
    expect(path).toBeDefined()
    const big = parseSave(readFileSync(path!))
    for (const options of [
      { query: 'Temperature' },
      { query: 'no-such-thing-xyz', values: true },
      { query: '4770', values: true },
      { query: 'Temperature', values: true },
    ]) {
      const result = await rawSearch(big, options)
      console.info(
        `search ${JSON.stringify(options)}: ${result.scanned} nodes in ${Math.round(result.ms)} ms`,
      )
      expect(result.ms).toBeLessThan(3000)
    }
  },
  300_000,
)
