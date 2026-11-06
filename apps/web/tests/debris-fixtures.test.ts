import { existsSync } from 'node:fs'
import { expect, test } from 'vite-plus/test'
import { applyEdit, type Edit, type MaterialItemView } from '../src/worker/model.ts'
import { applyWithRestore } from '../src/worker/snapshot.ts'
import { changedPaths, fixtures, roundTrip, sameBytes } from './helpers.ts'
import { body, groupOf, hasPrimary, indexOf, load, looseItems } from './debris-helpers.ts'

for (const path of fixtures) {
  const name = path.slice(path.lastIndexOf('/') + 1)

  test(`${name}: deleting debris changes nothing else and undo is byte exact`, () => {
    const save = load(path)
    const loose = looseItems(save).filter((i) => !i.protected)
    // Delete edits are addressed by instance ID, so every loose chunk needs a unique one.
    const all = looseItems(save)
    expect(all.every((i) => i.instanceId !== null)).toBe(true)
    expect(new Set(all.map((i) => i.instanceId)).size).toBe(all.length)
    if (loose.length === 0) return
    // Several items of the busiest element: the first, last and a middle one move indexes.
    const counts = new Map<string, MaterialItemView[]>()
    for (const item of loose) {
      counts.set(groupOf(item.ref), [...(counts.get(groupOf(item.ref)) ?? []), item])
    }
    const picked = [...counts.values()].sort((a, b) => b.length - a.length)[0]!
    const chosen = [picked[0]!, picked[Math.floor(picked.length / 2)]!, picked.at(-1)!]
    const unique = [...new Map(chosen.map((i) => [i.ref, i])).values()]
    const ids = unique.map((i) => i.instanceId!)
    const prefab = groupOf(unique[0]!.ref)
    const doomed = new Set(unique.map((i) => indexOf(i.ref)))

    // Expected: the same save with just those objects spliced out of the raw tree.
    const expected = load(path)
    const expectedGroup = expected.gameObjects.find((g) => g.name === prefab)!
    expectedGroup.gameObjects = expectedGroup.gameObjects.filter((_, i) => !doomed.has(i))
    for (const i of doomed) {
      const obj = save.gameObjects.find((g) => g.name === prefab)!.gameObjects[i]!
      expect(hasPrimary(obj)).toBe(true)
    }

    const bytes = body(save)
    const undo = applyWithRestore(save, { type: 'deleteDebris', ids } satisfies Edit)
    expect(save.gameObjects.find((g) => g.name === prefab)!.gameObjects).toHaveLength(
      expectedGroup.gameObjects.length,
    )

    // Written and read back, everything but those objects is identical, including settings.
    const reread = roundTrip(save)
    expect(changedPaths(expected.gameObjects, reread.gameObjects)).toEqual([])
    expect(changedPaths(expected.settings, reread.settings)).toEqual([])
    expect(changedPaths(expected.gameData, reread.gameData)).toEqual([])

    undo()
    expect(sameBytes(body(save), bytes)).toBe(true)
  }, 600_000)
}

// A move order ("Move here") saves the IDs of the items it targets; the game's
// CancellableMove.OnCancel does not null-check them, so those items must stay.
const moveOrders: [string, string[]][] = [
  ['mithro-05-most-dupes-59-cycle-1423.sav', ['OxyRock', 'OxyRock']],
  ['mithro-06-maximum-cycle-4770.sav', ['LiquidSulfur']],
]

for (const [file, elementsMoved] of moveOrders) {
  const path = fixtures.find((p) => p.endsWith(file))
  test.skipIf(!path || !existsSync(path))(
    `${file}: items under a move order are refused`,
    () => {
      const save = load(path!)
      const protectedItems = looseItems(save).filter((i) => i.protected)
      expect(protectedItems.map((i) => groupOf(i.ref)).sort()).toEqual([...elementsMoved].sort())

      const bytes = body(save)
      for (const item of protectedItems) {
        expect(() => applyEdit(save, { type: 'deleteDebris', ids: [item.instanceId!] })).toThrow(
          /move/,
        )
        expect(() => applyEdit(save, { type: 'deleteObject', id: item.ref })).toThrow(/move/)
      }
      // Mixed with deletable items, the refusal leaves everything in place.
      const free = looseItems(save).find((i) => !i.protected)!
      expect(() =>
        applyEdit(save, {
          type: 'deleteDebris',
          ids: [free.instanceId!, protectedItems[0]!.instanceId!],
        }),
      ).toThrow(/move/)
      expect(sameBytes(body(save), bytes)).toBe(true)

      // Everything unprotected can still go.
      const rest = looseItems(save).filter((i) => !i.protected)
      applyEdit(save, { type: 'deleteDebris', ids: rest.map((i) => i.instanceId!) })
      expect(looseItems(save).map((i) => i.protected)).toEqual(protectedItems.map(() => true))
    },
    600_000,
  )
}
