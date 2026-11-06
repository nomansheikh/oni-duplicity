import { hashString, resample } from '@oni-duplicity/game-data'
import type { SaveGame } from '@oni-duplicity/save-parser'
import { expect, test } from 'vite-plus/test'
import { applyEdit, listGeysers, objectById } from '../src/worker/model.ts'
import { changedPaths, roundTrip } from './helpers.ts'
import { behavior, find, load, names, objectChanges, typeOf } from './geyser-type-helpers.ts'

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
