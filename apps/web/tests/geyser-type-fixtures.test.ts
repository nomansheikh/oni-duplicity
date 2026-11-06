import { readFileSync } from 'node:fs'
import { geyserTypes, hashString } from '@oni-duplicity/game-data'
import { parseSave } from '@oni-duplicity/save-parser'
import { expect, test } from 'vite-plus/test'
import { applyEdit, listGeysers, objectById } from '../src/worker/model.ts'
import { fixtures, roundTrip, sameBytes } from './helpers.ts'
import { behavior, body, find, load, objectChanges } from './geyser-type-helpers.ts'

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
