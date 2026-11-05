import { expect, test } from '@playwright/test'
import { downloadSave, expectOnlyChanged, GALAXY, goTo, openSave, original } from './helpers.ts'

const levels = (save: ReturnType<typeof original>) =>
  (save.gameData.customGameSettings as { CurrentQualityLevelsBySetting: [string, string][] })
    .CurrentQualityLevelsBySetting

test('changes the disease difficulty setting', async ({ page }) => {
  const index = levels(original(GALAXY)).findIndex(([id]) => id === 'ImmuneSystem')
  expect(levels(original(GALAXY))[index]).toEqual(['ImmuneSystem', 'Default'])

  await openSave(page)
  await goTo(page, 'Difficulty')
  const select = page.getByRole('combobox', { name: 'Disease' })
  await select.click()
  await page.getByRole('option', { name: 'Total Immunity' }).click()
  await expect(select).toHaveText('Total Immunity')

  const { save } = await downloadSave(page)
  expect(levels(save)[index]).toEqual(['ImmuneSystem', 'Invincible'])
  expectOnlyChanged(original(GALAXY), save, [
    new RegExp(`^gameData/customGameSettings/CurrentQualityLevelsBySetting/${index}/1$`),
  ])
})
