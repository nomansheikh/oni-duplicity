import { expect, test } from '@playwright/test'
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

const world = (save: ReturnType<typeof original>, index: number) => group(save, 'Asteroid')[index]!

test('renames an asteroid', async ({ page }) => {
  // The colony starts on asteroid 0; asteroid 1 is another world in the cluster.
  expect(behavior(world(original(GALAXY), 1), 'AsteroidGridEntity')!.templateData!.m_name).toBe(
    'Arboroni',
  )
  await openSave(page)
  await goTo(page, 'Space')
  // Pick the field by position: matching on its value would stop matching once typed into.
  const name = page.getByRole('textbox', { name: 'Asteroid name' }).nth(1)
  await expect(name).toHaveValue('Arboroni')
  await name.fill('Duplicity Prime')
  await name.press('Enter')
  await expect(name).toHaveValue('Duplicity Prime')

  const { save } = await downloadSave(page)
  expect(behavior(world(save, 1), 'AsteroidGridEntity')!.templateData!.m_name).toBe(
    'Duplicity Prime',
  )
  expectOnlyChanged(original(GALAXY), save, [
    /^objects\/Asteroid\/1\/AsteroidGridEntity\/templateData\/m_name$/,
  ])
})

test('marks an undiscovered asteroid as discovered', async ({ page }) => {
  const container = (save: ReturnType<typeof original>) =>
    behavior(world(save, 2), 'WorldContainer')!.templateData!
  expect(container(original(GALAXY)).isDiscovered).toBe(false)
  expect(behavior(world(original(GALAXY), 2), 'AsteroidGridEntity')!.templateData!.m_name).toBe(
    'Phlegmera',
  )

  await openSave(page)
  await goTo(page, 'Space')
  const row = page.getByRole('row').filter({ has: page.locator('input[value="Phlegmera"]') })
  const discovered = row.getByRole('switch', { name: 'Discovered' })
  await expect(discovered).not.toBeChecked()
  await discovered.click()
  await expect(discovered).toBeChecked()

  const { save } = await downloadSave(page)
  expect(container(save).isDiscovered).toBe(true)
  expectOnlyChanged(original(GALAXY), save, [
    /^objects\/Asteroid\/2\/WorldContainer\/templateData\/isDiscovered$/,
  ])
})
