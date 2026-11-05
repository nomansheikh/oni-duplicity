import { readFileSync } from 'node:fs'
import { basename } from 'node:path'
import { parseSave, writeSaveParts, type SaveGame } from '@oni-duplicity/save-parser'
import { expect, test } from 'vite-plus/test'
import { applyWithRestore } from '../src/worker/snapshot.ts'
import { applyEdit, rawChildren, rawGet, rawReveal, type RawPath } from '../src/worker/model.ts'
import { rawDefaultItem, rawSearch } from '../src/worker/raw.ts'
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
