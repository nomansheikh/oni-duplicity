import { expect, test, type Page } from '@playwright/test'
import { findGeyser, geyserTypes, unresample } from '@oni-duplicity/game-data'
import {
  behavior,
  downloadSave,
  editCount,
  expectOnlyChanged,
  GALAXY,
  goTo,
  group,
  openSave,
  original,
} from './helpers.ts'

// The carbon dioxide geyser: its rolls match its saved values, and its output ranges 100-200 kg.
const PREFAB = 'GeyserGeneric_liquid_co2'
const RATE = geyserTypes.find((t) => t.id === 'liquid_co2')!.rate
const CONFIG = `^objects/${PREFAB}/0/Geyser/templateData/configuration`

const configOf = (save: Parameters<typeof group>[0]) =>
  behavior(group(save, PREFAB)[0]!, 'Geyser')!.templateData!.configuration as Record<string, number>

const row = (page: Page) => page.getByRole('row').filter({ hasText: 'Carbon Dioxide Geyser' })

/** Opens the geysers page and the edit sheet of the carbon dioxide geyser. */
async function openSheet(page: Page) {
  await openSave(page)
  await goTo(page, 'Geysers')
  await row(page).getByRole('button', { name: 'Edit' }).click()
  return page.getByRole('dialog')
}

test('sets a geyser output through both its roll and its value', async ({ page }) => {
  const before = original(GALAXY)
  expect(RATE).toEqual({ min: 100, max: 200 })

  const sheet = await openSheet(page)
  const output = sheet.getByRole('spinbutton', { name: 'Output per active cycle' })
  await output.fill('150')
  await output.press('Enter')
  await expect(output).toHaveValue('150')
  // The modal sheet blocks the header's download button.
  await page.keyboard.press('Escape')
  await expect(sheet).toBeHidden()

  const { save } = await downloadSave(page)
  const config = configOf(save)
  // The roll is the one that gives 150, and the value is what that roll gives, inside the range.
  expect(config.rateRoll).toBe(Math.fround(unresample(150, RATE)))
  expect(config.rateRoll).toBeGreaterThan(0)
  expect(config.rateRoll).toBeLessThan(1)
  expect(config.scaledRate).toBeCloseTo(150, 2)
  expect(config.scaledRate).toBeGreaterThanOrEqual(RATE.min)
  expect(config.scaledRate).toBeLessThanOrEqual(RATE.max)
  expect(config.rateRoll).not.toBe(configOf(before).rateRoll)
  expectOnlyChanged(before, save, [
    new RegExp(`${CONFIG}/rateRoll$`),
    new RegExp(`${CONFIG}/scaledRate$`),
  ])
})

test('clamps a value above the type range to its maximum', async ({ page }) => {
  const before = original(GALAXY)

  const sheet = await openSheet(page)
  const output = sheet.getByRole('spinbutton', { name: 'Output per active cycle' })
  await output.fill('99999')
  await output.press('Enter')
  await expect(output).toHaveValue('200')
  await page.keyboard.press('Escape')
  await expect(sheet).toBeHidden()

  const { save } = await downloadSave(page)
  const config = configOf(save)
  expect(config.rateRoll).toBe(1)
  expect(config.scaledRate).toBeCloseTo(RATE.max, 3)
  expect(config.scaledRate).toBeLessThanOrEqual(RATE.max)
  expectOnlyChanged(before, save, [
    new RegExp(`${CONFIG}/rateRoll$`),
    new RegExp(`${CONFIG}/scaledRate$`),
  ])
})

test('renames a geyser', async ({ page }) => {
  const before = original(GALAXY)
  await openSave(page)
  await goTo(page, 'Geysers')
  const name = row(page).getByRole('textbox', { name: 'Geyser name' })
  await name.fill('Duplicity Test Vent')
  await name.press('Enter')
  await expect(name).toHaveValue('Duplicity Test Vent')

  const { save } = await downloadSave(page)
  expect(behavior(group(save, PREFAB)[0]!, 'UserNameable')!.templateData!.savedName).toBe(
    'Duplicity Test Vent',
  )
  expectOnlyChanged(before, save, [
    new RegExp(`^objects/${PREFAB}/0/UserNameable/templateData/savedName$`),
  ])
})

const typeName = (id: string) => findGeyser(id)!.name

/** Opens the edit sheet of the geyser with this type and picks a new type for it. */
async function changeType(page: Page, from: string, to: string) {
  await openSave(page)
  await goTo(page, 'Geysers')
  await page
    .getByRole('row')
    .filter({ has: page.getByRole('cell', { name: typeName(from), exact: true }) })
    .getByRole('button', { name: 'Edit' })
    .click()
  const sheet = page.getByRole('dialog')
  await expect(sheet.getByText('Experimental', { exact: true })).toBeVisible()
  // The test colony runs the Geyser Control mod.
  await expect(sheet.getByText(/uses the Geyser Control mod/)).toBeVisible()
  await sheet.getByRole('combobox', { name: 'New type' }).click()
  await page.getByRole('option', { name: typeName(to), exact: true }).click()
  await sheet.getByRole('button', { name: 'Change type' }).click()
  await expect(sheet).toBeHidden()
}

/** The original save with a geyser group renamed, which is where the edit puts the geyser. */
function withGroupRenamed(from: string, to: string) {
  const before = original(GALAXY)
  return {
    ...before,
    gameObjects: before.gameObjects.map((g) => (g.name === from ? { ...g, name: to } : g)),
  }
}

const NAME = (prefab: string) =>
  new RegExp(`^objects/${prefab}/0/UserNameable/templateData/savedName$`)
const CONFIGURATION = (prefab: string, field: string) =>
  new RegExp(`^objects/${prefab}/0/Geyser/templateData/configuration/${field}$`)

test('changes a geyser to a type with no group yet', async ({ page }) => {
  await changeType(page, 'hot_po2', 'methane')
  await expect.poll(() => editCount(page)).toBe(1)
  await expect(
    page
      .getByRole('row')
      .filter({ hasText: typeName('methane') })
      .first(),
  ).toBeVisible()

  const { save } = await downloadSave(page)
  expect(save.gameObjects.some((g) => g.name === 'GeyserGeneric_hot_po2')).toBe(false)
  const moved = group(save, 'GeyserGeneric_methane')
  expect(moved).toHaveLength(1)
  expect(behavior(moved[0]!, 'UserNameable')!.templateData!.savedName).toMatch(
    new RegExp(`^${typeName('methane')} `),
  )
  // Hot polluted oxygen and methane roll in the same ranges, so only the type and name change.
  expectOnlyChanged(withGroupRenamed('GeyserGeneric_hot_po2', 'GeyserGeneric_methane'), save, [
    CONFIGURATION('GeyserGeneric_methane', 'typeId/hash'),
    NAME('GeyserGeneric_methane'),
  ])
})

test('changing type moves the output range and the geyser temperature with it', async ({
  page,
}) => {
  await changeType(page, 'hot_water', 'slush_water')

  const { save } = await downloadSave(page)
  const prefab = 'GeyserGeneric_slush_water'
  const config = behavior(group(save, prefab)[0]!, 'Geyser')!.templateData!.configuration as Record<
    string,
    number
  >
  const range = geyserTypes.find((t) => t.id === 'slush_water')!.rate
  expect(config.scaledRate).toBeGreaterThanOrEqual(range.min)
  expect(config.scaledRate).toBeLessThanOrEqual(range.max)
  expect(behavior(group(save, prefab)[0]!, 'PrimaryElement')!.templateData!._Temperature).toBe(
    Math.fround(263),
  )
  expectOnlyChanged(withGroupRenamed('GeyserGeneric_hot_water', prefab), save, [
    CONFIGURATION(prefab, 'typeId/hash'),
    CONFIGURATION(prefab, 'scaledRate'),
    // The game stored this one a few bits off what its roll gives in double precision.
    CONFIGURATION(prefab, 'scaledIterationPercent'),
    new RegExp(`^objects/${prefab}/0/PrimaryElement/templateData/_Temperature$`),
    NAME(prefab),
  ])
})

test('undoing a type change downloads the save unchanged', async ({ page }) => {
  await changeType(page, 'filthy_water', 'salt_water')
  await expect.poll(() => editCount(page)).toBe(1)
  await page.getByRole('button', { name: 'Undo' }).click()
  await expect.poll(() => editCount(page)).toBe(0)

  const { save } = await downloadSave(page)
  expectOnlyChanged(original(GALAXY), save, [])
})
