import { expect, test, type Page } from '@playwright/test'
import { skillGroups } from '@oni-duplicity/game-data'
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

test.describe('bionic duplicants', () => {
  // The 40 MB save is only fetched by the full tier (main and nightly). There, a missing
  // fixture is a failure; everywhere else the test is skipped.
  const required = Boolean(process.env.CI) && process.env.FIXTURE_TIER === 'all'
  test.skip(!required && !hasFixture(MITHRO), `${MITHRO} is not downloaded`)

  test('sets power bank charge and gear oil', async ({ page }) => {
    expect(hasFixture(MITHRO), `${MITHRO} is missing from the full-tier fixtures`).toBe(true)
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

  test('keeps bionic amounts within the game maximums', async ({ page }) => {
    expect(hasFixture(MITHRO), `${MITHRO} is missing from the full-tier fixtures`).toBe(true)
    await openSave(page, MITHRO)
    await goTo(page, 'Duplicants')
    await pick(page, 'Sonyar')
    await page.getByRole('tab', { name: 'Health & systems' }).click()
    // Typed far past the maximum; Sonyar has the BionicsC3 skill, so the battery holds 720 kJ.
    await setNumber(page, 'Power Banks', 5000)
    await setNumber(page, 'Gear Oil', 5000)
    await setNumber(page, 'Gunk', 5000)
    await setNumber(page, 'Oxygen Tank', 5000)
    await expect(page.getByRole('spinbutton', { name: 'Power Banks', exact: true })).toHaveValue(
      '720',
    )
    await expect(page.getByRole('spinbutton', { name: 'Gunk', exact: true })).toHaveValue('80')

    const { save } = await downloadSave(page)
    const before = fixtureDupe(MITHRO, 'BionicMinion', 0).amounts
    const idx = (name: string) => indexOf(before, (a) => a.name === name)
    const amounts = (
      behavior(group(save, 'BionicMinion')[0]!, 'MinionModifiers')!.extraData as {
        amounts: Amount[]
      }
    ).amounts
    expect(amounts[idx('BionicInternalBattery')]!.value.value).toBeCloseTo(720_000, 0)
    expect(amounts[idx('BionicOil')]!.value.value).toBeCloseTo(200, 4)
    expect(amounts[idx('BionicGunk')]!.value.value).toBeCloseTo(80, 4)
    expect(amounts[idx('BionicOxygenTank')]!.value.value).toBeCloseTo(240, 3)
    expectOnlyChanged(
      original(MITHRO),
      save,
      ['BionicInternalBattery', 'BionicOil', 'BionicGunk', 'BionicOxygenTank'].map(
        (name) =>
          new RegExp(
            path(
              'BionicMinion',
              0,
              'MinionModifiers',
              `extraData/amounts/${idx(name)}/value/value`,
            ),
          ),
      ),
    )
  })
})
