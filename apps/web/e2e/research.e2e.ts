import { expect, test } from '@playwright/test'
import { techs as techCatalog } from '@oni-duplicity/game-data'
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

test('researches everything', async ({ page }) => {
  const before = techsOf(original(GALAXY))
  const known = new Set(before.map((t) => t.techId))
  const added = techCatalog.filter((t) => !known.has(t.id))
  expect(before.some((t) => !t.complete)).toBe(true)

  await openSave(page)
  await goTo(page, 'Research')
  await page.getByRole('button', { name: 'Research everything' }).click()
  await expect(page.getByRole('button', { name: 'Research everything' })).toBeDisabled()

  const { save } = await downloadSave(page)
  const after = techsOf(save)
  // Every tech in the game is complete, and techs the save never listed are appended.
  expect(after.every((t) => t.complete)).toBe(true)
  expect(after.map((t) => t.techId)).toEqual([
    ...before.map((t) => t.techId),
    ...added.map((t) => t.id),
  ])

  const flipped = before.flatMap((t, i) => (t.complete ? [] : [i]))
  const appended = added.map((_, n) => before.length + n)
  expectOnlyChanged(original(GALAXY), save, [
    new RegExp(
      `^objects/SaveGame/0/Research/templateData/saveData/techs/(${flipped.join('|')})/complete$`,
    ),
    ...(added.length
      ? [
          new RegExp(
            `^objects/SaveGame/0/Research/templateData/saveData/techs/(length|${appended.join('|')})$`,
          ),
        ]
      : []),
  ])
})
