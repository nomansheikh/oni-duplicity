import { expect, test } from '@playwright/test'
import { downloadSave, expectOnlyChanged, GALAXY, group, original } from './helpers.ts'
import { critterRow, openCritters, slot, stored } from './critters-helpers.ts'

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
