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
  type Amount,
  type Effect,
} from './duplicants-helpers.ts'

test.describe('duplicants', () => {
  test.beforeEach(async ({ page }) => {
    await openSave(page)
    await goTo(page, 'Duplicants')
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

  test('clamps amounts to the real maximums', async ({ page }) => {
    await pick(page, 'Digger')
    await page.getByRole('tab', { name: 'Health & needs' }).click()
    await setNumber(page, 'Stress', 500)
    // 9,999 kcal is well past the 4,000 kcal stomach.
    await setNumber(page, 'Calories', 9999)

    const { save } = await downloadSave(page)
    const before = fixtureDupe(GALAXY, 'Minion', 0).amounts
    const stress = indexOf(before, (a) => a.name === 'Stress')
    const calories = indexOf(before, (a) => a.name === 'Calories')
    const amounts = (
      behavior(group(save, 'Minion')[0]!, 'MinionModifiers')!.extraData as { amounts: Amount[] }
    ).amounts
    expect(amounts[stress]!.value.value).toBeCloseTo(100, 4)
    expect(amounts[calories]!.value.value).toBeCloseTo(4_000_000, 0)
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
      new RegExp(
        path(
          'Minion',
          8,
          'Klei.AI.Effects',
          `templateData/saveLoadEffects/(length|${before.length})(/.+)?`,
        ),
      ),
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
      new RegExp(
        path(
          'Minion',
          0,
          'Klei.AI.Effects',
          `templateData/saveLoadEffects/(length|${before.length - 1})`,
        ),
      ),
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
