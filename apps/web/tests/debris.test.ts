import { existsSync, readFileSync } from 'node:fs'
import { elements } from '@oni-duplicity/game-data'
import {
  parseSave,
  writeSaveParts,
  type GameObject,
  type SaveGame,
} from '@oni-duplicity/save-parser'
import { expect, test } from 'vite-plus/test'
import {
  applyEdit,
  listMaterialItems,
  listMaterials,
  type Edit,
  type MaterialItemView,
} from '../src/worker/model.ts'
import { applyWithRestore } from '../src/worker/snapshot.ts'
import { changedPaths, fixtures, galaxy, roundTrip, sameBytes } from './helpers.ts'

const ELEMENT_IDS = new Set(elements.map((e) => e.id))
const load = (path: string) => parseSave(readFileSync(path))
const body = (save: SaveGame) => writeSaveParts(save).body.slice()
const hasPrimary = (o: GameObject) => o.behaviors.some((b) => b.name === 'PrimaryElement')

/** Every loose item of every element, with the views the app shows. */
function looseItems(save: SaveGame): MaterialItemView[] {
  return listMaterials(save).flatMap((m) =>
    listMaterialItems(save, m.id).filter((item) => item.loose),
  )
}

const indexOf = (ref: string) => Number(ref.slice(ref.lastIndexOf(':') + 1))
const groupOf = (ref: string) => ref.slice(0, ref.lastIndexOf(':'))

test('deleting debris removes exactly the chosen items and keeps the order of the rest', () => {
  const save = load(galaxy)
  const group = 'BrineIce'
  const before = [...save.gameObjects.find((g) => g.name === group)!.gameObjects]
  expect(before).toHaveLength(4)

  applyEdit(save, { type: 'deleteDebris', ids: [`${group}:2`, `${group}:0`] })
  const after = save.gameObjects.find((g) => g.name === group)!.gameObjects
  expect(after).toEqual([before[1], before[3]])
  expect(after[0]).toBe(before[1])
})

test('undo puts every deleted item back at its original position', () => {
  const save = load(galaxy)
  const group = save.gameObjects.find((g) => g.name === 'BrineIce')!
  const before = [...group.gameObjects]
  const bytes = body(save)

  const undo = applyWithRestore(save, {
    type: 'deleteDebris',
    ids: ['BrineIce:1', 'BrineIce:3', 'BrineIce:0'],
  })
  expect(group.gameObjects).toHaveLength(1)
  undo()
  expect(group.gameObjects).toHaveLength(4)
  group.gameObjects.forEach((obj, i) => expect(obj).toBe(before[i]))
  expect(sameBytes(body(save), bytes)).toBe(true)
}, 120_000)

test('stored items, buildings and critters are refused, and a refusal changes nothing', () => {
  const save = load(galaxy)
  const stored = listMaterials(save)
    .flatMap((m) => listMaterialItems(save, m.id))
    .find((item) => !item.loose)!
  const building = save.gameObjects.find((g) => !ELEMENT_IDS.has(g.name) && g.gameObjects.length)!
  const bytes = body(save)

  for (const id of [stored.ref, `${building.name}:0`, 'Nope:0', 'BrineIce:99']) {
    expect(() => applyEdit(save, { type: 'deleteDebris', ids: ['BrineIce:0', id] })).toThrow()
  }
  // A valid id listed before the bad one must not have been removed.
  expect(sameBytes(body(save), bytes)).toBe(true)
})

test('only loose chunks show as deletable, never stored copies', () => {
  const save = load(galaxy)
  const all = listMaterials(save).flatMap((m) => listMaterialItems(save, m.id))
  expect(all.some((i) => !i.loose)).toBe(true)
  for (const item of all.filter((i) => i.loose)) {
    expect(item.ref).not.toContain('/')
    expect(ELEMENT_IDS.has(groupOf(item.ref))).toBe(true)
  }
})

for (const path of fixtures) {
  const name = path.slice(path.lastIndexOf('/') + 1)

  test(`${name}: deleting debris changes nothing else and undo is byte exact`, () => {
    const save = load(path)
    const loose = looseItems(save).filter((i) => !i.protected)
    if (loose.length === 0) return
    // Several items of the busiest element: the first, last and a middle one move indexes.
    const counts = new Map<string, MaterialItemView[]>()
    for (const item of loose) {
      counts.set(groupOf(item.ref), [...(counts.get(groupOf(item.ref)) ?? []), item])
    }
    const picked = [...counts.values()].sort((a, b) => b.length - a.length)[0]!
    const chosen = [picked[0]!, picked[Math.floor(picked.length / 2)]!, picked.at(-1)!]
    const ids = [...new Set(chosen.map((i) => i.ref))]
    const prefab = groupOf(ids[0]!)
    const doomed = new Set(ids.map(indexOf))

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
        expect(() => applyEdit(save, { type: 'deleteDebris', ids: [item.ref] })).toThrow(/move/)
        expect(() => applyEdit(save, { type: 'deleteObject', id: item.ref })).toThrow(/move/)
      }
      // Mixed with deletable items, the refusal leaves everything in place.
      const free = looseItems(save).find((i) => !i.protected)!
      expect(() =>
        applyEdit(save, { type: 'deleteDebris', ids: [free.ref, protectedItems[0]!.ref] }),
      ).toThrow(/move/)
      expect(sameBytes(body(save), bytes)).toBe(true)

      // Everything unprotected can still go.
      const rest = looseItems(save).filter((i) => !i.protected)
      applyEdit(save, { type: 'deleteDebris', ids: rest.map((i) => i.ref) })
      expect(looseItems(save).map((i) => i.protected)).toEqual(protectedItems.map(() => true))
    },
    600_000,
  )
}
