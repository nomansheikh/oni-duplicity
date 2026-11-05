import { expect, test, type Page } from '@playwright/test'
import {
  behavior,
  downloadSave,
  expectOnlyChanged,
  GALAXY,
  goTo,
  group,
  hasFixture,
  openSave,
  original,
} from './helpers.ts'

const MITHRO = 'mithro-06-maximum-cycle-4770.sav'

type Amount = { name: string; value: { value: number } }
type Level = { attributeId: string; level: number }
type Effect = { id: string; timeRemaining: number; saved?: boolean }

/** Duplicant `index` of a prefab group in the untouched fixture, with its decoded behaviors. */
function fixtureDupe(file: string, prefab: string, index: number) {
  const obj = group(original(file), prefab)[index]!
  const data = (name: string) => behavior(obj, name)!.templateData!
  return {
    traitIds: data('Klei.AI.Traits').TraitIds as string[],
    levels: data('Klei.AI.AttributeLevels').saveLoadLevels as Level[],
    effects: data('Klei.AI.Effects').saveLoadEffects as Effect[],
    mastery: data('MinionResume').MasteryBySkillID as [string, boolean][],
    amounts: (behavior(obj, 'MinionModifiers')!.extraData as { amounts: Amount[] }).amounts,
  }
}

/** The position of a named entry, failing loudly when the fixture does not have it. */
function indexOf<T>(list: T[], match: (item: T) => boolean): number {
  const index = list.findIndex(match)
  expect(index, 'fixture entry').toBeGreaterThanOrEqual(0)
  return index
}

/** Picks a duplicant in the list on the left of the Duplicants page. */
async function pick(page: Page, name: string): Promise<void> {
  await page
    .locator('button')
    .filter({ has: page.getByText(name, { exact: true }) })
    .click()
  await expect(page.getByLabel('Name', { exact: true })).toHaveValue(name)
}

/** Opens a SearchPicker (`Add trait`, `Add effect`) and chooses the entry by its game id. */
async function addFromPicker(page: Page, button: string, id: string): Promise<void> {
  await page.getByRole('button', { name: button }).click()
  await page.locator('[cmdk-input]').fill(id)
  await page.getByRole('option').first().click()
}

/** Types into a number input and commits it with Enter. */
async function setNumber(page: Page, label: string, value: number): Promise<void> {
  const input = page.getByRole('spinbutton', { name: label, exact: true })
  await input.fill(String(value))
  await input.press('Enter')
}

const path = (prefab: string, index: number, behaviorName: string, rest: string) =>
  `^objects/${prefab}/${index}/${behaviorName.replace(/\./g, '\\.')}/${rest}$`

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
    // The new trait is appended, so only the list length differs.
    expectOnlyChanged(original(GALAXY), save, [
      new RegExp(path('Minion', 1, 'Klei.AI.Traits', 'templateData/TraitIds/length')),
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
          `templateData/TraitIds/(${[...shifted, 'length'].join('|')})`,
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
      new RegExp(path('Minion', 8, 'MinionResume', 'templateData/MasteryBySkillID/length')),
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
          `templateData/MasteryBySkillID/(${[...shifted, 'length'].join('|')})(/[01])?`,
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

  test('changes stress and calories', async ({ page }) => {
    await pick(page, 'Digger')
    await page.getByRole('tab', { name: 'Health & needs' }).click()
    await setNumber(page, 'Stress', 55)
    // Calories are shown in kcal and stored in calories.
    await setNumber(page, 'Calories', 1500)

    const { save } = await downloadSave(page)
    const before = fixtureDupe(GALAXY, 'Minion', 0).amounts
    const stress = indexOf(before, (a) => a.name === 'Stress')
    const calories = indexOf(before, (a) => a.name === 'Calories')
    const amounts = (
      behavior(group(save, 'Minion')[0]!, 'MinionModifiers')!.extraData as { amounts: Amount[] }
    ).amounts
    expect(amounts[stress]!.value.value).toBeCloseTo(55, 4)
    expect(amounts[calories]!.value.value).toBeCloseTo(1_500_000, 0)
    expectOnlyChanged(original(GALAXY), save, [
      new RegExp(path('Minion', 0, 'MinionModifiers', `extraData/amounts/${stress}/value/value`)),
      new RegExp(path('Minion', 0, 'MinionModifiers', `extraData/amounts/${calories}/value/value`)),
    ])
  })

  test('adds an effect', async ({ page }) => {
    await pick(page, 'Artist')
    await page.getByRole('tab', { name: 'Effects' }).click()
    await addFromPicker(page, 'Add effect', 'Showered')
    await expect(page.getByRole('button', { name: 'Remove Showered' })).toBeVisible()

    const { save } = await downloadSave(page)
    const before = fixtureDupe(GALAXY, 'Minion', 8).effects
    expect(before.map((e) => e.id)).not.toContain('Showered')
    const effects = behavior(group(save, 'Minion')[8]!, 'Klei.AI.Effects')!.templateData!
      .saveLoadEffects as Effect[]
    // One cycle is 600 seconds; the editor starts new effects at one cycle.
    expect(effects).toEqual([...before, { id: 'Showered', timeRemaining: 600, saved: true }])
    expectOnlyChanged(original(GALAXY), save, [
      new RegExp(path('Minion', 8, 'Klei.AI.Effects', 'templateData/saveLoadEffects/length')),
    ])
  })

  test('removes an effect', async ({ page }) => {
    // Digger's last effect is Sopping Wet, so nothing shifts but the length.
    await pick(page, 'Digger')
    await page.getByRole('tab', { name: 'Effects' }).click()
    await page.getByRole('button', { name: 'Remove Sopping Wet' }).click()
    await expect(page.getByRole('button', { name: 'Remove Sopping Wet' })).toHaveCount(0)

    const { save } = await downloadSave(page)
    const before = fixtureDupe(GALAXY, 'Minion', 0).effects
    expect(before.at(-1)!.id).toBe('SoakingWet')
    const effects = behavior(group(save, 'Minion')[0]!, 'Klei.AI.Effects')!.templateData!
      .saveLoadEffects as Effect[]
    expect(effects).toEqual(before.slice(0, -1))
    expectOnlyChanged(original(GALAXY), save, [
      new RegExp(path('Minion', 0, 'Klei.AI.Effects', 'templateData/saveLoadEffects/length')),
    ])
  })

  test('relieves stress for everyone', async ({ page }) => {
    await page.getByRole('button', { name: 'Everyone' }).click()
    await page.getByRole('menuitem', { name: 'Relieve stress' }).click()

    const { save } = await downloadSave(page)
    const expected: RegExp[] = []
    group(original(GALAXY), 'Minion').forEach((_, i) => {
      const before = fixtureDupe(GALAXY, 'Minion', i).amounts
      const stress = indexOf(before, (a) => a.name === 'Stress')
      const amounts = (
        behavior(group(save, 'Minion')[i]!, 'MinionModifiers')!.extraData as { amounts: Amount[] }
      ).amounts
      expect(amounts[stress]!.value.value, `duplicant ${i} stress`).toBe(0)
      // Duplicants that were already calm are left byte for byte alone.
      if (before[stress]!.value.value !== 0) {
        expected.push(
          new RegExp(
            path('Minion', i, 'MinionModifiers', `extraData/amounts/${stress}/value/value`),
          ),
        )
      }
    })
    expect(expected.length).toBeGreaterThan(0)
    expectOnlyChanged(original(GALAXY), save, expected)
  })
})

test.describe('bionic duplicants', () => {
  test.skip(!hasFixture(MITHRO), `${MITHRO} is not downloaded`)

  test('sets power bank charge and gear oil', async ({ page }) => {
    await openSave(page, MITHRO)
    await goTo(page, 'Duplicants')
    await pick(page, 'Sonyar')
    await page.getByRole('tab', { name: 'Health & systems' }).click()
    // Power is shown in kJ and stored in joules.
    await setNumber(page, 'Power Banks', 300)
    await setNumber(page, 'Gear Oil', 120)

    const { save } = await downloadSave(page)
    const before = fixtureDupe(MITHRO, 'BionicMinion', 0).amounts
    const power = indexOf(before, (a) => a.name === 'BionicInternalBattery')
    const oil = indexOf(before, (a) => a.name === 'BionicOil')
    const amounts = (
      behavior(group(save, 'BionicMinion')[0]!, 'MinionModifiers')!.extraData as {
        amounts: Amount[]
      }
    ).amounts
    expect(amounts[power]!.value.value).toBeCloseTo(300_000, 0)
    expect(amounts[oil]!.value.value).toBeCloseTo(120, 4)
    expectOnlyChanged(original(MITHRO), save, [
      new RegExp(
        path('BionicMinion', 0, 'MinionModifiers', `extraData/amounts/${power}/value/value`),
      ),
      new RegExp(
        path('BionicMinion', 0, 'MinionModifiers', `extraData/amounts/${oil}/value/value`),
      ),
    ])
  })
})
