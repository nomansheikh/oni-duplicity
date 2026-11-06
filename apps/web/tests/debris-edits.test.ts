import { expect, test } from 'vite-plus/test'
import { applyEdit, itemByRef, listMaterialItems, listMaterials } from '../src/worker/model.ts'
import { applyWithRestore } from '../src/worker/snapshot.ts'
import { galaxy, sameBytes } from './helpers.ts'
import { ELEMENT_IDS, body, groupOf, indexOf, instanceOf, itemsOf, load } from './debris-helpers.ts'

test('deleting debris removes exactly the chosen items and keeps the order of the rest', () => {
  const save = load(galaxy)
  const group = 'BrineIce'
  const before = [...save.gameObjects.find((g) => g.name === group)!.gameObjects]
  expect(before).toHaveLength(4)
  const items = itemsOf(save, group)

  applyEdit(save, { type: 'deleteDebris', ids: [items[2]!.instanceId!, items[0]!.instanceId!] })
  const after = save.gameObjects.find((g) => g.name === group)!.gameObjects
  expect(after).toEqual([before[1], before[3]])
  expect(after[0]).toBe(before[1])
})

test('two deletes from one stale list remove exactly the two intended items', () => {
  const save = load(galaxy)
  const group = save.gameObjects.find((g) => g.name === 'BrineIce')!
  const before = [...group.gameObjects]
  // The list the page showed before either click landed.
  const stale = itemsOf(save, 'BrineIce')
  expect(stale.map((i) => indexOf(i.ref))).toEqual([0, 1, 2, 3])

  applyEdit(save, { type: 'deleteDebris', ids: [stale[0]!.instanceId!] })
  // By position, stale[2] would now be the old fourth item.
  applyEdit(save, { type: 'deleteDebris', ids: [stale[2]!.instanceId!] })
  expect(group.gameObjects).toEqual([before[1], before[3]])
  expect(group.gameObjects.map(instanceOf)).toEqual([stale[1]!.instanceId, stale[3]!.instanceId])
})

test('an item that is already gone is refused and nothing else changes', () => {
  const save = load(galaxy)
  const stale = itemsOf(save, 'BrineIce')
  applyEdit(save, { type: 'deleteDebris', ids: [stale[0]!.instanceId!] })
  const bytes = body(save)

  expect(() =>
    applyEdit(save, { type: 'deleteDebris', ids: [stale[1]!.instanceId!, stale[0]!.instanceId!] }),
  ).toThrow(/no longer exists/)
  expect(sameBytes(body(save), bytes)).toBe(true)
})

test('undo puts every deleted item back at its original position', () => {
  const save = load(galaxy)
  const group = save.gameObjects.find((g) => g.name === 'BrineIce')!
  const before = [...group.gameObjects]
  const bytes = body(save)
  const items = itemsOf(save, 'BrineIce')

  const undo = applyWithRestore(save, {
    type: 'deleteDebris',
    ids: [1, 3, 0].map((i) => items[i]!.instanceId!),
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
  const first = itemsOf(save, 'BrineIce')[0]!.instanceId!
  const bytes = body(save)

  expect(stored.instanceId).toBeNull()
  const ids = [
    instanceOf(itemByRef(save, stored.ref)),
    instanceOf(building.gameObjects[0]!),
    2_000_000_000,
  ]
  for (const id of ids) {
    expect(() => applyEdit(save, { type: 'deleteDebris', ids: [first, id] })).toThrow()
  }
  // A valid id listed before the bad one must not have been removed.
  expect(sameBytes(body(save), bytes)).toBe(true)
})

test('only loose chunks show as deletable, never stored copies', () => {
  const save = load(galaxy)
  const all = listMaterials(save).flatMap((m) => listMaterialItems(save, m.id))
  expect(all.some((i) => !i.loose)).toBe(true)
  for (const item of all.filter((i) => !i.loose)) expect(item.instanceId).toBeNull()
  for (const item of all.filter((i) => i.loose)) {
    expect(item.ref).not.toContain('/')
    expect(ELEMENT_IDS.has(groupOf(item.ref))).toBe(true)
  }
})
