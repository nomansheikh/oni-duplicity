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
  fixtureDupe,
  indexOf,
  path,
  pick,
  setNumber,
  type Amount,
  type Effect,
  type Level,
} from './duplicants-helpers.ts'

test.describe('duplicants', () => {
  test.beforeEach(async ({ page }) => {
    await openSave(page)
    await goTo(page, 'Duplicants')
  })

  test('applies part of a copied profile to another duplicant', async ({ page }) => {
    // Researcher's name, gender and attribute levels go onto Artist; the rest is left alone.
    const source = fixtureDupe(GALAXY, 'Minion', 1)
    const target = fixtureDupe(GALAXY, 'Minion', 8)

    await pick(page, 'Researcher')
    await page.getByRole('button', { name: 'Duplicant actions' }).click()
    await page.getByRole('menuitem', { name: 'Copy profile' }).click()
    await pick(page, 'Artist')
    await page.getByRole('button', { name: 'Duplicant actions' }).click()
    await page.getByRole('menuitem', { name: /^Paste from Researcher/ }).click()

    const dialog = page.getByRole('dialog')
    for (const section of ['Traits', 'Interests', 'Skills and experience', 'Appearance']) {
      await dialog.getByLabel(section, { exact: true }).click()
    }
    await dialog.getByLabel('Name and gender', { exact: true }).click()
    await dialog.getByRole('button', { name: 'Apply' }).click()

    const { save } = await downloadSave(page)
    const obj = group(save, 'Minion')[8]!
    const identity = behavior(obj, 'MinionIdentity')!.templateData!
    expect(identity.name).toBe('Researcher')
    expect(identity.gender).toBe('MALE')
    expect(identity.genderStringKey).toBe('MALE')

    const levels = behavior(obj, 'Klei.AI.AttributeLevels')!.templateData!.saveLoadLevels as Level[]
    const changed: number[] = []
    target.levels.forEach((level, i) => {
      const wanted = source.levels.find((l) => l.attributeId === level.attributeId)!.level
      expect(levels[i]!.level, level.attributeId).toBe(wanted)
      if (wanted !== level.level) changed.push(i)
    })
    expect(changed.length).toBeGreaterThan(0)
    expectOnlyChanged(original(GALAXY), save, [
      new RegExp(path('Minion', 8, 'MinionIdentity', 'templateData/(name|gender|genderStringKey)')),
      new RegExp(
        path(
          'Minion',
          8,
          'Klei.AI.AttributeLevels',
          `templateData/saveLoadLevels/(${changed.join('|')})/level`,
        ),
      ),
    ])
  })

  test('changes the cycles left on an effect', async ({ page }) => {
    const before = fixtureDupe(GALAXY, 'Minion', 7).effects
    const wet = indexOf(before, (e) => e.id === 'SoakingWet')

    await pick(page, 'Operator')
    await page.getByRole('tab', { name: 'Effects' }).click()
    await setNumber(page, 'Sopping Wet cycles left', 2)

    const { save } = await downloadSave(page)
    const effects = behavior(group(save, 'Minion')[7]!, 'Klei.AI.Effects')!.templateData!
      .saveLoadEffects as Effect[]
    // One cycle is 600 seconds.
    expect(effects[wet]).toMatchObject({ id: 'SoakingWet', timeRemaining: 1200 })
    expectOnlyChanged(original(GALAXY), save, [
      new RegExp(
        path('Minion', 7, 'Klei.AI.Effects', `templateData/saveLoadEffects/${wet}/timeRemaining`),
      ),
    ])
  })

  test('heals and fills the needs of everyone', async ({ page }) => {
    const full: Record<string, number> = {
      HitPoints: 100,
      Calories: 4_000_000,
      Stamina: 100,
      Breath: 100,
      Bladder: 0,
      Stress: 0,
    }
    await page.getByRole('button', { name: 'Everyone' }).click()
    await page.getByRole('menuitem', { name: 'Heal and fill needs' }).click()

    const { save } = await downloadSave(page)
    const expected: string[] = []
    group(original(GALAXY), 'Minion').forEach((_, i) => {
      const before = fixtureDupe(GALAXY, 'Minion', i).amounts
      const amounts = (
        behavior(group(save, 'Minion')[i]!, 'MinionModifiers')!.extraData as { amounts: Amount[] }
      ).amounts
      before.forEach((amount, n) => {
        if (!(amount.name in full)) return
        expect(amounts[n]!.value.value, `duplicant ${i} ${amount.name}`).toBe(full[amount.name])
        if (amount.value.value !== full[amount.name]) {
          expected.push(`^objects/Minion/${i}/MinionModifiers/extraData/amounts/${n}/value/value$`)
        }
      })
    })
    expect(expected.length).toBeGreaterThan(0)
    expectOnlyChanged(
      original(GALAXY),
      save,
      expected.map((re) => new RegExp(re)),
    )
  })

  test('masters every skill for everyone', async ({ page }) => {
    await page.getByRole('button', { name: 'Everyone' }).click()
    await page.getByRole('menuitem', { name: 'Master every skill' }).click()

    const { save } = await downloadSave(page)
    const finals: string[][] = []
    group(original(GALAXY), 'Minion').forEach((_, i) => {
      const before = fixtureDupe(GALAXY, 'Minion', i).mastery
      const resume = behavior(group(save, 'Minion')[i]!, 'MinionResume')!.templateData!
      const after = resume.MasteryBySkillID as [string, boolean][]
      const ids = after.map(([id]) => id)
      // Everything already mastered stays mastered, each skill appears once, all are on.
      expect(ids, `duplicant ${i}`).toEqual(expect.arrayContaining(before.map(([id]) => id)))
      expect(new Set(ids).size).toBe(ids.length)
      expect(after.every(([, on]) => on)).toBe(true)
      expect(ids.length).toBeGreaterThan(before.length)
      finals.push([...ids].sort())
    })
    // Every duplicant is a standard one, so all end up with the same skills.
    for (const ids of finals) expect(ids).toEqual(finals[0])
    expect(finals[0]).toEqual(expect.arrayContaining(['Mining3', 'Arting3', 'Researching3']))
    expectOnlyChanged(original(GALAXY), save, [
      /^objects\/Minion\/\d\/MinionResume\/templateData\/MasteryBySkillID\//,
    ])
  })

  test('sets every attribute for everyone', async ({ page }) => {
    await page.getByRole('button', { name: 'Everyone' }).click()
    await page.getByRole('menuitem', { name: /^Set every attribute/ }).click()
    const dialog = page.getByRole('dialog')
    const level = dialog.getByRole('spinbutton', { name: 'Level', exact: true })
    await level.fill('12')
    await level.press('Enter')
    await dialog.getByRole('button', { name: 'Apply to everyone' }).click()

    const { save } = await downloadSave(page)
    const expected: string[] = []
    group(original(GALAXY), 'Minion').forEach((_, i) => {
      const before = fixtureDupe(GALAXY, 'Minion', i).levels
      const levels = behavior(group(save, 'Minion')[i]!, 'Klei.AI.AttributeLevels')!.templateData!
        .saveLoadLevels as Level[]
      before.forEach((entry, n) => {
        expect(levels[n]!.level, `duplicant ${i} ${entry.attributeId}`).toBe(12)
        if (entry.level !== 12) {
          expected.push(
            `^objects/Minion/${i}/Klei\\.AI\\.AttributeLevels/templateData/saveLoadLevels/${n}/level$`,
          )
        }
      })
    })
    expect(expected.length).toBeGreaterThan(0)
    expectOnlyChanged(
      original(GALAXY),
      save,
      expected.map((re) => new RegExp(re)),
    )
  })
})
