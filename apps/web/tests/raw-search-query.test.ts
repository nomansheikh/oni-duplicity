import { readFileSync } from 'node:fs'
import { parseSave } from '@oni-duplicity/save-parser'
import { expect, test } from 'vite-plus/test'
import { rawGet, rawReveal, type RawPath } from '../src/worker/model.ts'
import { createSearchRunner, rawSearch } from '../src/worker/raw.ts'
import { fixtures } from './helpers.ts'
import { all, save } from './raw-search-helpers.ts'

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
test.skipIf(!all)(
  'whole-tree search on the largest fixture finishes and scans the whole tree',
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
      // Correctness only. A wall-clock budget is unreliable in a parallel suite on a shared
      // runner (one run took 20 s for the same search). The "raw search" phase of
      // `vp run bench` checks the speed instead, calibrated against a baseline.
      const result = await rawSearch(big, options)
      expect(result.scanned).toBeGreaterThan(1_000_000)
    }
  },
  300_000,
)
