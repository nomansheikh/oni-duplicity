import { expect, test, type Page } from '@playwright/test'
import { geyserTypes, unresample } from '@oni-duplicity/game-data'
import {
  behavior,
  downloadSave,
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
