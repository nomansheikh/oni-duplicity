import { expect, test } from 'vite-plus/test'
import { applyEdit } from '../src/worker/model.ts'
import { applyWithRestore } from '../src/worker/snapshot.ts'
import { sameBytes } from './helpers.ts'
import { body, find, load, names } from './geyser-type-helpers.ts'

test('a name the player chose is left alone', () => {
  const save = load()
  const geyser = find(save, 'GeyserGeneric_hot_water')
  applyEdit(save, { type: 'setGeyserName', id: geyser.id, name: 'Old Faithful' })
  applyEdit(save, { type: 'setGeyserType', id: geyser.id, typeId: 'slush_water' })
  expect(find(save, 'GeyserGeneric_slush_water').name).toBe('Old Faithful')
}, 120_000)
test('lists only same-shape types the save has the DLC for', () => {
  const save = load()
  const targets = (prefab: string) => find(save, prefab).swapTargets.map((t) => t.id)
  const gas = targets('GeyserGeneric_hot_po2')
  expect(gas).toContain('methane')
  expect(gas).not.toContain('hot_po2')
  expect(gas).not.toContain('hot_water')
  expect(gas).not.toContain('molten_gold')
  // Every DLC is active in this save.
  expect(targets('GeyserGeneric_hot_water')).toEqual(
    expect.arrayContaining(['liquid_sulfur', 'murky_brine', 'oil_drip']),
  )

  const plain = load()
  plain.header.gameInfo.dlcIds = ['DLC2_ID']
  const liquid = find(plain, 'GeyserGeneric_hot_water').swapTargets.map((t) => t.id)
  expect(liquid).not.toContain('liquid_sulfur')
  expect(liquid).not.toContain('murky_brine')
  expect(liquid).toContain('salt_water')
  plain.header.gameInfo.dlcIds = ['EXPANSION1_ID', 'DLC5_ID']
  const both = find(plain, 'GeyserGeneric_hot_water').swapTargets.map((t) => t.id)
  expect(both).toEqual(expect.arrayContaining(['liquid_sulfur', 'murky_brine']))
}, 120_000)
test('the worker refuses what the list would not offer, and leaves the save untouched', () => {
  const save = load()
  const before = body(save)
  const steam = find(save, 'GeyserGeneric_hot_po2')
  const water = find(save, 'GeyserGeneric_hot_water')
  const bad = (id: string, typeId: string, message: RegExp) =>
    expect(() => applyWithRestore(save, { type: 'setGeyserType', id, typeId })).toThrow(message)

  bad(steam.id, 'hot_water', /footprints differ/)
  bad(steam.id, 'molten_gold', /footprints differ/)
  bad(steam.id, 'hot_po2', /already/)
  bad(steam.id, 'nonsense', /Unknown geyser type/)

  save.header.gameInfo.dlcIds = []
  bad(water.id, 'liquid_sulfur', /EXPANSION1_ID/)
  bad(water.id, 'murky_brine', /DLC5_ID/)
  save.header.gameInfo.dlcIds = ['EXPANSION1_ID', 'DLC2_ID', 'DLC3_ID', 'DLC4_ID', 'DLC5_ID']

  // A prefab that doesn't match its type (the deprecated NiobiumGeyser, or a mod's) is skipped.
  const group = save.gameObjects.find((g) => g.name === 'GeyserGeneric_hot_water')!
  group.name = 'NiobiumGeyser'
  bad('NiobiumGeyser:0', 'salt_water', /generic geysers/)
  expect(find(save, 'NiobiumGeyser').swapTargets).toEqual([])
  group.name = 'GeyserGeneric_hot_water'

  bad('Minion:0', 'salt_water', /not a geyser|No object/)
  expect(sameBytes(body(save), before)).toBe(true)
}, 120_000)
test('undo puts the groups, the object and every field back byte for byte', () => {
  const save = load()
  const before = body(save)
  const groupsBefore = names(save)
  const geyser = find(save, 'GeyserGeneric_hot_po2')

  const undo = applyWithRestore(save, { type: 'setGeyserType', id: geyser.id, typeId: 'methane' })
  expect(sameBytes(body(save), before)).toBe(false)
  expect(names(save)).not.toEqual(groupsBefore)
  undo()
  expect(names(save)).toEqual(groupsBefore)
  expect(sameBytes(body(save), before)).toBe(true)

  // Moving into an existing group, which also empties the source.
  const filthy = find(save, 'GeyserGeneric_filthy_water')
  const undoMove = applyWithRestore(save, {
    type: 'setGeyserType',
    id: filthy.id,
    typeId: 'salt_water',
  })
  expect(sameBytes(body(save), before)).toBe(false)
  undoMove()
  expect(names(save)).toEqual(groupsBefore)
  expect(sameBytes(body(save), before)).toBe(true)
}, 120_000)
