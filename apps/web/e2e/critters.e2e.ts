import { expect, test, type Page } from '@playwright/test'
import type { SaveGame } from '@oni-duplicity/save-parser'
import {
  behavior,
  diffSaves,
  downloadSave,
  expectOnlyChanged,
  GALAXY,
  goTo,
  group,
  openSave,
  original,
} from './helpers.ts'

type Obj = SaveGame['gameObjects'][number]['gameObjects'][number]

const WILDNESS = 'Wildness'

/** Opens the critters page filtered to one prefab (the search matches the prefab ID). */
async function openCritters(page: Page, prefab: string) {
  await openSave(page)
  await goTo(page, 'Critters')
  await expect(page.getByText(/\d+ critters across \d+ families/)).toBeVisible()
  await page.getByPlaceholder('Search critters').fill(prefab)
}

/** The table row of the critter shown at this rounded position, e.g. `94, 111`. */
function critterRow(page: Page, position: string) {
  return page
    .getByRole('row')
    .filter({ has: page.getByRole('cell', { name: position, exact: true }) })
}

const amounts = (obj: Obj) =>
  (behavior(obj, 'Klei.AI.Modifiers')!.extraData as { amounts: { name: string; value: unknown }[] })
    .amounts

const wildness = (obj: Obj) =>
  (amounts(obj).find((a) => a.name === WILDNESS)!.value as { value: number }).value

const instanceId = (obj: Obj) => Number(behavior(obj, 'KPrefabID')!.templateData!.InstanceID)

const nextUniqueId = (save: SaveGame) => Number(save.settings.nextUniqueID)

/** The save with one prefab group replaced by `objects`, for diffing everything else. */
function withGroup(save: SaveGame, prefab: string, objects: Obj[]): SaveGame {
  return {
    ...save,
    gameObjects: save.gameObjects.map((g) =>
      g.name === prefab ? { ...g, gameObjects: objects } : g,
    ),
  }
}

/** The save without one prefab group, for asserting that every other group is untouched. */
function withoutGroup(save: SaveGame, prefab: string): SaveGame {
  return { ...save, gameObjects: save.gameObjects.filter((g) => g.name !== prefab) }
}

/** Drops every `InstanceID`, which a clone gets fresh (also on what it stores). */
function stripIds(value: unknown): unknown {
  if (value instanceof Uint8Array) return value
  if (Array.isArray(value)) return value.map(stripIds)
  if (value && typeof value === 'object') {
    return Object.fromEntries(
      Object.entries(value)
        .filter(([key]) => key !== 'InstanceID')
        .map(([key, v]) => [key, stripIds(v)]),
    )
  }
  return value
}

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

const slot = (obj: Obj, id: string) => amounts(obj).findIndex((a) => a.name === id)
const stored = (obj: Obj, id: string) =>
  (amounts(obj).find((a) => a.name === id)!.value as { value: number }).value

test('edits a DLC amount within its maximum and keeps unconfirmed ones read only', async ({
  page,
}) => {
  // The second sea turtle (39, 99) has scale growth, which the game caps at 100.
  const prefab = 'SeaTurtle'
  const index = 1
  const before = original(GALAXY)
  const source = group(before, prefab)[index]!
  const growth = slot(source, 'ScaleGrowth')
  expect(growth).toBeGreaterThanOrEqual(0)
  expect(stored(source, 'ScaleGrowth')).not.toBe(42)

  await openCritters(page, prefab)
  await critterRow(page, '39, 99').getByRole('button', { name: 'Edit stats' }).click()

  // Hit points have two answers in the game data, so they are shown but locked.
  await expect(page.getByLabel('Health', { exact: true })).toBeDisabled()
  await expect(page.getByText(/Read only\./).first()).toBeVisible()

  // Typing past the maximum is held at 100, a value inside the range is kept as typed.
  const field = page.getByLabel('Scale Growth', { exact: true })
  await field.fill('500')
  await field.blur()
  await expect(field).toHaveValue('100')
  await field.fill('42')
  await field.blur()
  await expect(field).toHaveValue('42')

  // The sheet covers the download button until it closes.
  await page.keyboard.press('Escape')
  await expect(field).toBeHidden()

  const { save } = await downloadSave(page)
  expect(stored(group(save, prefab)[index]!, 'ScaleGrowth')).toBe(42)
  expectOnlyChanged(before, save, [
    new RegExp(
      `^objects/${prefab}/${index}/Klei\\.AI\\.Modifiers/extraData/amounts/${growth}/value/value$`,
    ),
  ])
})
