import { readFileSync } from 'node:fs'
import { geyserTypes, hashString, resample } from '@oni-duplicity/game-data'
import {
  parseSave,
  writeSaveParts,
  type GameObject,
  type SaveGame,
} from '@oni-duplicity/save-parser'
import { expect, test } from 'vite-plus/test'
import { applyEdit, listGeysers, objectById, type GeyserView } from '../src/worker/model.ts'
import { applyWithRestore } from '../src/worker/snapshot.ts'
import { changedPaths, fixtures, galaxy, roundTrip, sameBytes } from './helpers.ts'

const load = () => parseSave(readFileSync(galaxy))
const body = (save: SaveGame) => writeSaveParts(save).body.slice()
const typeOf = (id: string) => geyserTypes.find((t) => t.id === id)!

const find = (save: SaveGame, prefab: string): GeyserView =>
  listGeysers(save).find((g) => g.prefab === prefab)!

function behavior(obj: GameObject, name: string) {
  return obj.behaviors.find((b) => b.name === name)!.templateData!
}

const names = (save: SaveGame) => save.gameObjects.map((g) => g.name)

/** Paths changed on one object between two saves, relative to the object's behaviors. */
function objectChanges(before: GameObject, after: GameObject): string[] {
  const out: string[] = []
  expect(after.behaviors.map((b) => b.name)).toEqual(before.behaviors.map((b) => b.name))
  expect(after.position).toEqual(before.position)
  expect(after.rotation).toEqual(before.rotation)
  expect(after.scale).toEqual(before.scale)
  expect(after.folder).toBe(before.folder)
  before.behaviors.forEach((b, i) => {
    for (const path of changedPaths(b, after.behaviors[i], b.name)) out.push(path)
  })
  return out
}

// A gas geyser to a gas type the save has no group for: the group is created, the old one
// (it held only this geyser) goes, and only the five fields of the proposal change.
test('changing to a type with no group creates the group and drops the emptied one', () => {
  const before = load()
  const save = load()
  const geyser = find(save, 'GeyserGeneric_hot_po2')
  expect(names(save)).not.toContain('GeyserGeneric_methane')
  const original = objectById(before, geyser.id)
  const rolls = { ...(behavior(original, 'Geyser').configuration as Record<string, number>) }

  applyEdit(save, { type: 'setGeyserType', id: geyser.id, typeId: 'methane' })

  expect(names(save)).not.toContain('GeyserGeneric_hot_po2')
  expect(names(save)).toContain('GeyserGeneric_methane')
  // The new group sits where the old one was, among the other geysers.
  expect(names(save).indexOf('GeyserGeneric_methane')).toBe(
    names(before).indexOf('GeyserGeneric_hot_po2'),
  )
  expect(names(save)).toHaveLength(names(before).length)

  const moved = save.gameObjects.find((g) => g.name === 'GeyserGeneric_methane')!.gameObjects
  expect(moved).toHaveLength(1)
  const after = moved[0]!
  const methane = typeOf('methane')
  const config = behavior(after, 'Geyser').configuration as Record<string, number>
  expect((config.typeId as unknown as { hash: number }).hash).toBe(hashString('methane'))
  // The rolls stay; the values follow the new type's ranges.
  expect(config.rateRoll).toBe(rolls.rateRoll)
  expect(config.scaledRate).toBe(Math.fround(resample(config.rateRoll!, methane.rate)))
  expect(behavior(after, 'PrimaryElement')._Temperature).toBe(Math.fround(372.15))

  expect(objectChanges(original, after).sort()).toEqual(
    [
      'Geyser.templateData.configuration.typeId.hash',
      ...[
        'scaledRate',
        'scaledIterationLength',
        'scaledIterationPercent',
        'scaledYearLength',
        'scaledYearPercent',
      ]
        .filter((f) => Math.fround(rolls[f]!) !== config[f])
        .map((f) => `Geyser.templateData.configuration.${f}`),
      'UserNameable.templateData.savedName',
    ].sort(),
  )

  // Nothing else in the save moved.
  const other = (s: SaveGame) => s.gameObjects.filter((g) => !g.name.endsWith('hot_po2'))
  const expected = other(before).filter((g) => g.name !== 'GeyserGeneric_methane')
  const actual = other(save).filter((g) => g.name !== 'GeyserGeneric_methane')
  expect(changedPaths(expected, actual)).toEqual([])
  expect(changedPaths(before.world, save.world)).toEqual([])
  expect(changedPaths(before.gameData, save.gameData)).toEqual([])
}, 120_000)
test('changing to a type that has a group appends to it', () => {
  const save = load()
  const geyser = find(save, 'GeyserGeneric_filthy_water')
  const targetGroup = save.gameObjects.find((g) => g.name === 'GeyserGeneric_salt_water')!
  expect(targetGroup.gameObjects).toHaveLength(1)
  const first = targetGroup.gameObjects[0]!

  applyEdit(save, { type: 'setGeyserType', id: geyser.id, typeId: 'salt_water' })

  expect(names(save)).not.toContain('GeyserGeneric_filthy_water')
  expect(targetGroup.gameObjects).toHaveLength(2)
  expect(targetGroup.gameObjects[0]).toBe(first)
  const reread = listGeysers(roundTrip(save))
  expect(reread.filter((g) => g.prefab === 'GeyserGeneric_salt_water')).toHaveLength(2)
  expect(reread.every((g) => g.typeId !== 'filthy_water')).toBe(true)
}, 120_000)
test('the emptied group is kept when other geysers of the type remain', () => {
  const save = load()
  const group = save.gameObjects.find((g) => g.name === 'GeyserGeneric_salt_water')!
  group.gameObjects.push(structuredClone(group.gameObjects[0]!))
  const geyser = listGeysers(save).find((g) => g.prefab === 'GeyserGeneric_salt_water')!

  applyEdit(save, { type: 'setGeyserType', id: geyser.id, typeId: 'hot_water' })

  expect(group.gameObjects).toHaveLength(1)
  expect(names(save)).toContain('GeyserGeneric_hot_water')
}, 120_000)
test('the object temperature and name follow the new type', () => {
  const save = load()
  const geyser = find(save, 'GeyserGeneric_liquid_co2')
  const obj = objectById(save, geyser.id)
  expect(behavior(obj, 'PrimaryElement')._Temperature).toBe(218)
  applyEdit(save, { type: 'setGeyserName', id: geyser.id, name: 'Carbon Dioxide Geyser 12‑3' })

  applyEdit(save, { type: 'setGeyserType', id: geyser.id, typeId: 'slush_water' })

  const slush = find(save, 'GeyserGeneric_slush_water')
  expect(behavior(obj, 'PrimaryElement')._Temperature).toBe(263)
  // The generated suffix survives; the type name in front is replaced.
  expect(slush.name).toBe(`${slush.typeName} 12‑3`)

  applyEdit(save, { type: 'setGeyserType', id: slush.id, typeId: 'liquid_co2' })
  expect(behavior(obj, 'PrimaryElement')._Temperature).toBe(218)
}, 120_000)
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

test('the edited save round-trips and reads back as the new type', () => {
  const save = load()
  const geyser = find(save, 'GeyserGeneric_hot_hydrogen')
  applyEdit(save, { type: 'setGeyserType', id: geyser.id, typeId: 'chlorine_gas_cool' })
  const reread = roundTrip(save)
  const moved = find(reread, 'GeyserGeneric_chlorine_gas_cool')
  expect(moved.typeId).toBe('chlorine_gas_cool')
  expect(moved.matchesRolls).toBe(true)
  expect(sameBytes(body(reread), body(save))).toBe(true)
}, 120_000)
test('the Geyser Control mod is flagged on the geysers that carry it', () => {
  const save = load()
  expect(listGeysers(save).every((g) => g.hasGeyserControl)).toBe(true)
})

// The saved temperature of every geyser the game made is its type's `geyserTemperature`; this
// checks the transcribed value, and that every geyser's prefab names its saved type.
test('every fixture geyser has its type’s temperature and a prefab that names its type', () => {
  let checked = 0
  for (const path of fixtures) {
    const save = parseSave(readFileSync(path))
    for (const g of save.gameObjects) {
      for (const obj of g.gameObjects) {
        const geyser = obj.behaviors.find((b) => b.name === 'Geyser')?.templateData
        if (!geyser) continue
        const config = geyser.configuration as { typeId: { hash: number } }
        const type = geyserTypes.find((t) => hashString(t.id) === config.typeId.hash)
        expect(type, `${g.name} in ${path}`).toBeDefined()
        expect(g.name).toBe(`GeyserGeneric_${type!.id}`)
        expect(behavior(obj, 'PrimaryElement')._Temperature, g.name).toBe(
          Math.fround(type!.geyserTemperature),
        )
        checked++
      }
    }
  }
  expect(checked).toBeGreaterThan(8)
}, 600_000)

// A real unmodded geyser in every fixture: change its type, write, read back, and see that the
// only differences are the ones the edit promises.
test('changing a type on every fixture changes only the promised fields', () => {
  let tried = 0
  for (const path of fixtures) {
    const save = parseSave(readFileSync(path))
    const geyser = listGeysers(save).find((g) => g.typeId && g.swapTargets.length > 0)
    if (!geyser) continue
    const target = geyser.swapTargets[0]!.id
    const before = objectById(save, geyser.id)
    const snapshot = structuredClone(before)
    const sourceCount = save.gameObjects.find((g) => g.name === geyser.prefab)!.gameObjects.length

    applyEdit(save, { type: 'setGeyserType', id: geyser.id, typeId: target })

    const reread = roundTrip(save)
    const moved = listGeysers(reread).filter((g) => g.typeId === target)
    expect(moved.length, path).toBeGreaterThan(0)
    const group = reread.gameObjects.find((g) => g.name === `GeyserGeneric_${target}`)!
    const after = group.gameObjects[group.gameObjects.length - 1]!
    const changes = objectChanges(snapshot, after)
    expect(
      changes.every(
        (c) =>
          c.startsWith('Geyser.templateData.configuration.') ||
          c === 'PrimaryElement.templateData._Temperature' ||
          c === 'UserNameable.templateData.savedName',
      ),
      `${path}: ${changes.join(', ')}`,
    ).toBe(true)
    const stillThere = reread.gameObjects.find((g) => g.name === geyser.prefab)
    expect(stillThere?.gameObjects.length ?? 0).toBe(sourceCount - 1)
    expect(listGeysers(reread)).toHaveLength(listGeysers(save).length)
    tried++
  }
  expect(tried).toBeGreaterThan(0)
}, 900_000)
