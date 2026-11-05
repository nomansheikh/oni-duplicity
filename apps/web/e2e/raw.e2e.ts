import { expect, test, type Page } from '@playwright/test'
import { downloadSave, expectOnlyChanged, GALAXY, goTo, openSave, original } from './helpers.ts'

/** Opens the raw editor and jumps to a path such as `header.gameInfo`. */
async function openRaw(page: Page, path: string) {
  await goTo(page, 'Raw data')
  const goto = page.getByPlaceholder(/^Go to path/)
  await goto.fill(path)
  await goto.press('Enter')
}

const MIXING = 'gameData.customGameSettings.CurrentMixingLevelsBySetting'
const mixing = (save: ReturnType<typeof original>) =>
  (save.gameData.customGameSettings as { CurrentMixingLevelsBySetting: unknown[] })
    .CurrentMixingLevelsBySetting

/** The row whose key button reads `[n]`, so its actions menu can be opened. */
async function openRowActions(page: Page, key: string) {
  const row = page.locator('.group').filter({
    has: page.getByRole('button', { name: key, exact: true }),
  })
  await row.getByRole('button', { name: 'Row actions' }).click()
}

test('edits one primitive value', async ({ page }) => {
  expect(original(GALAXY).header.gameInfo.numberOfCycles).toBe(88)
  await openSave(page)
  await openRaw(page, 'header.gameInfo')

  const cycles = page.getByRole('textbox', { name: 'numberOfCycles' })
  await expect(cycles).toHaveValue('88')
  await cycles.fill('123')
  await cycles.press('Enter')
  await expect(cycles).toHaveValue('123')

  const { save } = await downloadSave(page)
  expect(save.header.gameInfo.numberOfCycles).toBe(123)
  expectOnlyChanged(original(GALAXY), save, [/^header\/gameInfo\/numberOfCycles$/])
})

test('removes an array item', async ({ page }) => {
  const before = mixing(original(GALAXY))
  expect(before).toHaveLength(17)
  await openSave(page)
  await openRaw(page, MIXING)

  await openRowActions(page, '[16]')
  await page.getByRole('menuitem', { name: 'Remove item' }).click()
  await expect(page.getByRole('button', { name: '[16]', exact: true })).toHaveCount(0)

  const { save } = await downloadSave(page)
  // The last item went away; the others kept their order.
  expect(mixing(save)).toEqual(before.slice(0, -1))
  expectOnlyChanged(original(GALAXY), save, [
    /^gameData\/customGameSettings\/CurrentMixingLevelsBySetting\/(length|16)$/,
  ])
})

test('duplicates an array item', async ({ page }) => {
  const before = mixing(original(GALAXY))
  await openSave(page)
  await openRaw(page, MIXING)

  await openRowActions(page, '[16]')
  await page.getByRole('menuitem', { name: 'Duplicate item' }).click()
  await expect(page.getByRole('button', { name: '[17]', exact: true })).toBeVisible()

  const { save } = await downloadSave(page)
  // The copy lands right after the original, which is the last item here.
  expect(mixing(save)).toEqual([...before, before[16]])
  expect(mixing(save)[17]).toEqual(mixing(save)[16])
  expectOnlyChanged(original(GALAXY), save, [
    /^gameData\/customGameSettings\/CurrentMixingLevelsBySetting\/(length|17)$/,
  ])
})
