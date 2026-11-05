import { expect, test } from '@playwright/test'
import { downloadSave, expectOnlyChanged, GALAXY, goTo, openSave, original } from './helpers.ts'

test('renames the colony and downloads under the new name', async ({ page }) => {
  await openSave(page)
  const name = page.getByLabel('Colony name')
  await name.fill('Duplicity Test')
  await name.press('Enter')

  const { save, fileName } = await downloadSave(page)
  expect(fileName).toBe('Duplicity Test.sav')
  expect(save.header.gameInfo.baseName).toBe('Duplicity Test')
  expectOnlyChanged(original(GALAXY), save, [/^header\/gameInfo\/baseName$/])
})

test('turns sandbox mode on', async ({ page }) => {
  await openSave(page)
  await goTo(page, 'Difficulty')
  await page.getByRole('switch', { name: 'Sandbox mode' }).click()

  const { save } = await downloadSave(page)
  expect(save.header.gameInfo.sandboxEnabled).toBe(true)
  expectOnlyChanged(original(GALAXY), save, [
    /^header\/gameInfo\/sandboxEnabled$/,
    /^objects\/SaveGame\/0\/SaveGame\/templateData\/sandboxEnabled$/,
    /^gameData\/customGameSettings\/CurrentQualityLevelsBySetting\/\d+\/1$/,
  ])
})

test('sets the debug flag that blocks achievements', async ({ page }) => {
  await openSave(page)
  await goTo(page, 'Difficulty')
  await expect(page.getByText('Achievements on')).toBeVisible()
  await page.getByRole('switch', { name: 'Debug mode was used' }).click()
  await expect(page.getByText('Achievements blocked')).toBeVisible()

  const { save } = await downloadSave(page)
  expect(save.gameData.debugWasUsed).toBe(true)
  expectOnlyChanged(original(GALAXY), save, [/^gameData\/debugWasUsed$/])
})
