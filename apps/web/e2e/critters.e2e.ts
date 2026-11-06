import { expect, test } from '@playwright/test'
import { diffSaves, downloadSave, expectOnlyChanged, GALAXY, group, original } from './helpers.ts'
import {
  amounts,
  critterRow,
  instanceId,
  nextUniqueId,
  openCritters,
  stripIds,
  WILDNESS,
  wildness,
  withGroup,
  withoutGroup,
  type Obj,
} from './critters-helpers.ts'

test('tames a wild critter', async ({ page }) => {
  // The first tropical pacu, at 94, 111, is wild.
  const before = original(GALAXY)
  const index = 0
  const source = group(before, 'PacuTropical')[index]!
  expect(wildness(source)).toBe(100)

  await openCritters(page, 'PacuTropical')
  const row = critterRow(page, '94, 111')
  await expect(row).toContainText('Wild 100%')
  await row.getByRole('button', { name: 'Tame', exact: true }).click()
  await expect(row).toContainText('Tame')
  await expect(row.getByRole('button', { name: 'Make wild' })).toBeVisible()

  const { save } = await downloadSave(page)
  expect(wildness(group(save, 'PacuTropical')[index]!)).toBe(0)
  const slot = amounts(source).findIndex((a) => a.name === WILDNESS)
  expectOnlyChanged(before, save, [
    new RegExp(
      `^objects/PacuTropical/${index}/Klei\\.AI\\.Modifiers/extraData/amounts/${slot}/value/value$`,
    ),
  ])
})

test('makes a tame critter wild', async ({ page }) => {
  // The tropical pacu at 117, 106 is tame.
  const before = original(GALAXY)
  const index = 2
  const source = group(before, 'PacuTropical')[index]!
  expect(wildness(source)).toBe(0)

  await openCritters(page, 'PacuTropical')
  const row = critterRow(page, '117, 106')
  await expect(row).toContainText('Tame')
  await row.getByRole('button', { name: 'Make wild' }).click()
  await expect(row).toContainText('Wild 100%')

  const { save } = await downloadSave(page)
  expect(wildness(group(save, 'PacuTropical')[index]!)).toBe(100)
  const slot = amounts(source).findIndex((a) => a.name === WILDNESS)
  expectOnlyChanged(before, save, [
    new RegExp(
      `^objects/PacuTropical/${index}/Klei\\.AI\\.Modifiers/extraData/amounts/${slot}/value/value$`,
    ),
  ])
})

test('clones a critter next to the original with a fresh id', async ({ page }) => {
  // Baby parrotfish: two in the save, so the clone pushes the second one down an index.
  const prefab = 'ParrotFishBaby'
  const before = original(GALAXY)
  const originals = group(before, prefab)
  expect(originals).toHaveLength(2)

  await openCritters(page, prefab)
  await expect(page.getByRole('row').filter({ hasText: 'Beakon Fry' })).toHaveCount(2)
  await critterRow(page, '99, 200').getByRole('button', { name: 'Clone' }).click()
  await expect(page.getByRole('row').filter({ hasText: 'Beakon Fry' })).toHaveCount(3)

  const { save } = await downloadSave(page)
  const after = group(save, prefab)
  expect(after).toHaveLength(3)
  const [source, copy, later] = after as [Obj, Obj, Obj]

  // The copy sits right after its source, so the other original is now last.
  expect(later).toEqual(originals[1])
  expect(source).toEqual(originals[0])

  // Nothing but the id counter changed outside the copy: dropping the copy gives the fixture back.
  expectOnlyChanged(before, withGroup(save, prefab, [source, later]), [/^settings\/nextUniqueID$/])
  expect(diffSaves(withoutGroup(before, prefab), withoutGroup(save, prefab))).toEqual([
    'settings/nextUniqueID',
  ])

  // The copy takes the next unique id and the counter moves one past it (a baby stores nothing).
  const next = nextUniqueId(before)
  expect(instanceId(copy)).toBe(next)
  expect(nextUniqueId(save)).toBe(next + 1)
  expect(instanceId(copy)).not.toBe(instanceId(source))

  // Otherwise the copy equals its source: position, rotation, scale and every behavior.
  expect(copy.position).toEqual(source.position)
  expect(copy.rotation).toEqual(source.rotation)
  expect(copy.scale).toEqual(source.scale)
  expect(copy.behaviors.map((b) => b.name)).toEqual(source.behaviors.map((b) => b.name))
  expect(stripIds(copy.behaviors)).toEqual(stripIds(source.behaviors))
})

test('deletes a critter and leaves the rest alone', async ({ page }) => {
  // Sea turtles: nine in the save; deleting the second moves the later seven up an index.
  const prefab = 'SeaTurtle'
  const before = original(GALAXY)
  const originals = group(before, prefab)
  expect(originals).toHaveLength(9)

  await openCritters(page, prefab)
  await expect(page.getByRole('row')).toHaveCount(10)
  await critterRow(page, '39, 99').getByRole('button', { name: 'Delete' }).click()
  await expect(page.getByRole('row')).toHaveCount(9)

  const { save } = await downloadSave(page)
  // The second turtle is gone and the others kept their order.
  expect(group(save, prefab)).toEqual(originals.filter((_, i) => i !== 1))

  // Every other prefab group, and everything outside the objects, is untouched.
  expect(diffSaves(withoutGroup(before, prefab), withoutGroup(save, prefab))).toEqual([])
  expect(nextUniqueId(save)).toBe(nextUniqueId(before))
})
