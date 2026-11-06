import { expect, test } from '@playwright/test'
import { skillGroups } from '@oni-duplicity/game-data'
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
import { indexOf, path, pick, setNumber } from './duplicants-helpers.ts'

test.describe('duplicants', () => {
  test.beforeEach(async ({ page }) => {
    await openSave(page)
    await goTo(page, 'Duplicants')
  })

  test('renames a duplicant', async ({ page }) => {
    await pick(page, 'Artist')
    const name = page.getByLabel('Name', { exact: true })
    await name.fill('Rembrandt')
    await name.press('Enter')

    const { save } = await downloadSave(page)
    const identity = behavior(group(save, 'Minion')[8]!, 'MinionIdentity')!.templateData!
    expect(identity.name).toBe('Rembrandt')
    expectOnlyChanged(original(GALAXY), save, [
      new RegExp(path('Minion', 8, 'MinionIdentity', 'templateData/name')),
    ])
  })

  test('changes gender', async ({ page }) => {
    const identity = behavior(group(original(GALAXY), 'Minion')[8]!, 'MinionIdentity')!
    expect(identity.templateData!.gender).toBe('FEMALE')
    await pick(page, 'Artist')
    await page.getByRole('combobox', { name: 'Gender' }).click()
    await page.getByRole('option', { name: 'Male', exact: true }).click()
    await expect(page.getByRole('combobox', { name: 'Gender' })).toHaveText('Male')

    const { save } = await downloadSave(page)
    const after = behavior(group(save, 'Minion')[8]!, 'MinionIdentity')!.templateData!
    expect(after.gender).toBe('MALE')
    expect(after.genderStringKey).toBe('MALE')
    expectOnlyChanged(original(GALAXY), save, [
      new RegExp(path('Minion', 8, 'MinionIdentity', 'templateData/(gender|genderStringKey)')),
    ])
  })

  test('turns an interest on', async ({ page }) => {
    // Artist is interested in Art only; Builder is added after it.
    const builder = skillGroups.find((g) => g.id === 'Building')!
    await pick(page, 'Artist')
    await page.getByRole('tab', { name: 'Interests' }).click()
    const interest = page.getByRole('switch', { name: new RegExp(`^${builder.name}`) })
    await expect(interest).not.toBeChecked()
    await interest.click()
    await expect(interest).toBeChecked()

    const { save } = await downloadSave(page)
    const art = skillGroups.find((g) => g.id === 'Art')!
    const resume = behavior(group(save, 'Minion')[8]!, 'MinionResume')!.templateData!
    expect(resume.AptitudeBySkillGroup).toEqual([
      [{ hash: art.hash }, 1],
      [{ hash: builder.hash }, 1],
    ])
    expectOnlyChanged(original(GALAXY), save, [
      new RegExp(path('Minion', 8, 'MinionResume', 'templateData/AptitudeBySkillGroup/(length|1)')),
    ])
  })

  test('turns an interest off', async ({ page }) => {
    // Digger is interested in Mining only.
    const mining = skillGroups.find((g) => g.hash === 2129168560)!
    await pick(page, 'Digger')
    await page.getByRole('tab', { name: 'Interests' }).click()
    const interest = page.getByRole('switch', { name: new RegExp(`^${mining.name}`) })
    await expect(interest).toBeChecked()
    await interest.click()
    await expect(interest).not.toBeChecked()

    const { save } = await downloadSave(page)
    const resume = behavior(group(save, 'Minion')[0]!, 'MinionResume')!.templateData!
    expect(resume.AptitudeBySkillGroup).toEqual([])
    expectOnlyChanged(original(GALAXY), save, [
      new RegExp(path('Minion', 0, 'MinionResume', 'templateData/AptitudeBySkillGroup/(length|0)')),
    ])
  })

  test('sets total experience', async ({ page }) => {
    await pick(page, 'Artist')
    await page.getByRole('tab', { name: 'Skills' }).click()
    await setNumber(page, 'Total experience', 60000)

    const { save } = await downloadSave(page)
    const resume = behavior(group(save, 'Minion')[8]!, 'MinionResume')!.templateData!
    expect(resume.totalExperienceGained).toBe(60000)
    expectOnlyChanged(original(GALAXY), save, [
      new RegExp(path('Minion', 8, 'MinionResume', 'templateData/totalExperienceGained')),
    ])
  })

  test('changes an appearance style', async ({ page }) => {
    // Hair is stored twice: as hair and as the matching hat hair.
    const accessories = (save: ReturnType<typeof original>) =>
      behavior(group(save, 'Minion')[8]!, 'Accessorizer')!.templateData!.accessories as {
        guid: { Guid: string }
      }[]
    const before = accessories(original(GALAXY))
    const hair = indexOf(before, (a) => a.guid.Guid === 'Root.Accessories.hair_030')
    const hatHair = indexOf(before, (a) => a.guid.Guid === 'Root.Accessories.hat_hair_030')

    await pick(page, 'Artist')
    await page.getByRole('tab', { name: 'Appearance' }).click()
    await page.getByRole('combobox', { name: 'Hair' }).click()
    await page.getByRole('option', { name: 'Style 5', exact: true }).click()
    await expect(page.getByRole('combobox', { name: 'Hair' })).toHaveText('Style 5')

    const { save } = await downloadSave(page)
    const after = accessories(save)
    expect(after[hair]!.guid.Guid).toBe('Root.Accessories.hair_005')
    expect(after[hatHair]!.guid.Guid).toBe('Root.Accessories.hat_hair_005')
    expectOnlyChanged(original(GALAXY), save, [
      new RegExp(
        path(
          'Minion',
          8,
          'Accessorizer',
          `templateData/accessories/(${hair}|${hatHair})/guid/Guid`,
        ),
      ),
    ])
  })
})
