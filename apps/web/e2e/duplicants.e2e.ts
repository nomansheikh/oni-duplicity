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
import {
  addFromPicker,
  fixtureDupe,
  indexOf,
  path,
  pick,
  setNumber,
  type Level,
} from './duplicants-helpers.ts'

test.describe('duplicants', () => {
  test.beforeEach(async ({ page }) => {
    await openSave(page)
    await goTo(page, 'Duplicants')
  })

  test('adds a trait', async ({ page }) => {
    await pick(page, 'Researcher')
    await addFromPicker(page, 'Add trait', 'Anemic')
    await expect(page.getByRole('button', { name: 'Remove Anemic' })).toBeVisible()

    const { save } = await downloadSave(page)
    const before = fixtureDupe(GALAXY, 'Minion', 1).traitIds
    const traits = behavior(group(save, 'Minion')[1]!, 'Klei.AI.Traits')!.templateData!
    expect(traits.TraitIds).toEqual([...before, 'Anemic'])
    // The new trait is appended: the list grows by one item.
    expectOnlyChanged(original(GALAXY), save, [
      new RegExp(
        path('Minion', 1, 'Klei.AI.Traits', `templateData/TraitIds/(length|${before.length})`),
      ),
    ])
  })

  test('removes a trait', async ({ page }) => {
    // Digger has five traits; Binge Eater is the fourth.
    await pick(page, 'Digger')
    await page.getByRole('button', { name: 'Remove Binge Eater' }).click()
    await expect(page.getByRole('button', { name: 'Remove Binge Eater' })).toHaveCount(0)

    const { save } = await downloadSave(page)
    const before = fixtureDupe(GALAXY, 'Minion', 0).traitIds
    expect(before).toContain('BingeEater')
    const traits = behavior(group(save, 'Minion')[0]!, 'Klei.AI.Traits')!.templateData!
    expect(traits.TraitIds).toEqual(before.filter((t) => t !== 'BingeEater'))
    // Later traits shift down by one, so the tail positions and the length change.
    const at = before.indexOf('BingeEater')
    const shifted = Array.from({ length: before.length - at - 1 }, (_, n) => at + n)
    expectOnlyChanged(original(GALAXY), save, [
      new RegExp(
        path(
          'Minion',
          0,
          'Klei.AI.Traits',
          `templateData/TraitIds/(${[...shifted, 'length', before.length - 1].join('|')})`,
        ),
      ),
    ])
  })

  test('masters a skill', async ({ page }) => {
    await pick(page, 'Artist')
    await page.getByRole('tab', { name: 'Skills' }).click()
    const skill = page.getByRole('switch', { name: 'Arting 3', exact: true })
    await expect(skill).not.toBeChecked()
    await skill.click()
    await expect(skill).toBeChecked()

    const { save } = await downloadSave(page)
    const before = fixtureDupe(GALAXY, 'Minion', 8).mastery
    expect(before.map(([id]) => id)).not.toContain('Arting3')
    const resume = behavior(group(save, 'Minion')[8]!, 'MinionResume')!.templateData!
    expect(resume.MasteryBySkillID).toEqual([...before, ['Arting3', true]])
    expectOnlyChanged(original(GALAXY), save, [
      new RegExp(
        path(
          'Minion',
          8,
          'MinionResume',
          `templateData/MasteryBySkillID/(length|${before.length})(/[01])?`,
        ),
      ),
    ])
  })

  test('unmasters a skill', async ({ page }) => {
    // Operator has Swimming, Technicals1 and Swimming2; Technicals1 sits in the middle.
    await pick(page, 'Operator')
    await page.getByRole('tab', { name: 'Skills' }).click()
    const skill = page.getByRole('switch', { name: 'Technicals 1', exact: true })
    await expect(skill).toBeChecked()
    await skill.click()
    await expect(skill).not.toBeChecked()

    const { save } = await downloadSave(page)
    const before = fixtureDupe(GALAXY, 'Minion', 7).mastery
    const resume = behavior(group(save, 'Minion')[7]!, 'MinionResume')!.templateData!
    expect(resume.MasteryBySkillID).toEqual(before.filter(([id]) => id !== 'Technicals1'))
    const at = indexOf(before, ([id]) => id === 'Technicals1')
    const shifted = Array.from({ length: before.length - at - 1 }, (_, n) => at + n)
    expectOnlyChanged(original(GALAXY), save, [
      new RegExp(
        path(
          'Minion',
          7,
          'MinionResume',
          `templateData/MasteryBySkillID/(${[...shifted, 'length', before.length - 1].join('|')})(/[01])?`,
        ),
      ),
    ])
  })

  test('changes an attribute level', async ({ page }) => {
    await pick(page, 'Digger')
    await page.getByRole('tab', { name: 'Attributes' }).click()
    await setNumber(page, 'Excavation', 12)

    const { save } = await downloadSave(page)
    const before = fixtureDupe(GALAXY, 'Minion', 0).levels
    const at = indexOf(before, (l) => l.attributeId === 'Digging')
    expect(before[at]!.level).toBe(50)
    const levels = behavior(group(save, 'Minion')[0]!, 'Klei.AI.AttributeLevels')!.templateData!
      .saveLoadLevels as Level[]
    expect(levels[at]).toEqual({ ...before[at], level: 12 })
    expectOnlyChanged(original(GALAXY), save, [
      new RegExp(
        path('Minion', 0, 'Klei.AI.AttributeLevels', `templateData/saveLoadLevels/${at}/level`),
      ),
    ])
  })
})
