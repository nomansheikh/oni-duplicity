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

type Tech = { techId: string; complete: boolean }

const techsOf = (save: ReturnType<typeof original>) =>
  (
    behavior(group(save, 'SaveGame')[0]!, 'Research')!.templateData as {
      saveData: { techs: Tech[] }
    }
  ).saveData.techs

test('marks one tech as researched', async ({ page }) => {
  const index = techsOf(original(GALAXY)).findIndex((t) => t.techId === 'Bioengineering')
  expect(techsOf(original(GALAXY))[index]!.complete).toBe(false)

  await openSave(page)
  await goTo(page, 'Research')
  await page.getByPlaceholder('Search techs').fill('Bioengineering')
  const tech = page.getByRole('switch', { name: /^Bioengineering/ })
  await expect(tech).not.toBeChecked()
  await tech.click()
  await expect(tech).toBeChecked()

  const { save } = await downloadSave(page)
  expect(techsOf(save)[index]).toMatchObject({ techId: 'Bioengineering', complete: true })
  expectOnlyChanged(original(GALAXY), save, [
    new RegExp(`^objects/SaveGame/0/Research/templateData/saveData/techs/${index}/complete$`),
  ])
})
