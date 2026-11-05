import { expect, test, type Page } from '@playwright/test'
import {
  behavior,
  downloadSave,
  editCount,
  expectOnlyChanged,
  GALAXY,
  goTo,
  group,
  hasFixture,
  openSave,
  original,
} from './helpers.ts'

const MITHRO = 'mithro-06-maximum-cycle-4770.sav'

const traitIds = (file: string, prefab: string, index: number) =>
  behavior(group(original(file), prefab)[index]!, 'Klei.AI.Traits')!.templateData!
    .TraitIds as string[]

async function pick(page: Page, name: string): Promise<void> {
  await page
    .locator('button')
    .filter({ has: page.getByText(name, { exact: true }) })
    .click()
  await expect(page.getByLabel('Name', { exact: true })).toHaveValue(name)
}

/** The names in the duplicant list, top to bottom. */
const listed = (page: Page) =>
  page.locator('button[data-slot="item"] [data-slot="item-title"]').allTextContents()

async function openTraitPicker(page: Page, search: string): Promise<void> {
  await page.getByRole('button', { name: 'Add trait' }).click()
  await page.locator('[cmdk-input]').fill(search)
}

test.describe('traits', () => {
  test.beforeEach(async ({ page }) => {
    await openSave(page)
    await goTo(page, 'Duplicants')
  })

  test('adds an allowed trait and labels it by category', async ({ page }) => {
    await pick(page, 'Researcher')
    await openTraitPicker(page, 'Twinkletoes')
    const option = page.getByRole('option').first()
    await expect(option).toContainText('Positive')
    await expect(option).not.toHaveAttribute('aria-disabled', 'true')
    await option.click()

    const added = page.locator('[data-trait="Twinkletoes"]')
    await expect(added).toBeVisible()
    await expect(added.locator('[data-category="positive"]')).toHaveText('Positive')

    const { save } = await downloadSave(page)
    const before = traitIds(GALAXY, 'Minion', 1)
    const traits = behavior(group(save, 'Minion')[1]!, 'Klei.AI.Traits')!.templateData!
    expect(traits.TraitIds).toEqual([...before, 'Twinkletoes'])
    expectOnlyChanged(original(GALAXY), save, [
      new RegExp(
        `^objects/Minion/1/Klei\\.AI\\.Traits/templateData/TraitIds/(length|${before.length})$`,
      ),
    ])
  })

  test('blocks a trait that clashes with an interest and says why', async ({ page }) => {
    // Digger has the Mining interest; Can't Dig excludes it.
    await pick(page, 'Digger')
    await openTraitPicker(page, 'CantDig')
    const option = page.getByRole('option').first()
    await expect(option).toHaveAttribute('aria-disabled', 'true')
    await expect(option).toContainText("Can't be combined with the Mining interest.")
    await option.click({ force: true })
    await expect(page.locator('[data-trait="CantDig"]')).toHaveCount(0)
    expect(await editCount(page)).toBe(0)
  })

  test('blocks a trait that clashes with a trait and says why', async ({ page }) => {
    // Farmer has Simple Tastes; Foodie excludes it.
    await pick(page, 'Farmer')
    await openTraitPicker(page, 'Foodie')
    const option = page.getByRole('option').first()
    await expect(option).toHaveAttribute('aria-disabled', 'true')
    await expect(option).toContainText("Can't be combined with the trait Simple Tastes.")
    await option.click({ force: true })
    await expect(page.locator('[data-trait="Foodie"]')).toHaveCount(0)
    expect(await editCount(page)).toBe(0)
  })

  test('does not offer bionic traits to a standard duplicant', async ({ page }) => {
    await pick(page, 'Cook')
    await openTraitPicker(page, 'BionicBug')
    await expect(page.getByText('Nothing found.')).toBeVisible()
    await page.locator('[cmdk-input]').fill('StartWithBooster')
    await expect(page.getByText('Nothing found.')).toBeVisible()
  })

  test('searches the duplicant list by name, trait and interest', async ({ page }) => {
    const search = page.getByLabel('Search duplicants')
    await search.fill('artist')
    expect(await listed(page)).toEqual(['Artist'])
    // Binge Eater: Digger, Operator and Artist.
    await search.fill('binge eater')
    expect((await listed(page)).sort()).toEqual(['Artist', 'Digger', 'Operator'])
    // The Ranching interest: Rancher.
    await search.fill('ranching')
    expect(await listed(page)).toContain('Rancher')
    await search.fill('no such thing')
    await expect(page.getByText('No duplicants match.')).toBeVisible()
  })

  test('sorts the duplicant list', async ({ page }) => {
    const sortBy = async (label: string) => {
      await page.getByRole('combobox', { name: 'Sort duplicants' }).click()
      await page.getByRole('option', { name: `Sort: ${label}` }).click()
    }
    const saveOrder = await listed(page)
    expect(saveOrder).toHaveLength(9)

    await sortBy('Name')
    const byName = await listed(page)
    expect(byName).toEqual([...saveOrder].sort((a, b) => a.localeCompare(b)))

    await page.getByRole('button', { name: 'Ascending order' }).click()
    expect(await listed(page)).toEqual([...byName].reverse())

    // Arrival runs oldest first: the three starters, then later arrivals; Artist came last.
    await sortBy('Arrival')
    const byArrival = await listed(page)
    expect(byArrival.at(-1)).toBe('Artist')
    await page.getByRole('button', { name: 'Ascending order' }).click()
    expect((await listed(page))[0]).toBe('Artist')

    // Stress starts with the most stressed: Builder (9%), then Digger (8%).
    await sortBy('Stress')
    expect((await listed(page)).slice(0, 2)).toEqual(['Builder', 'Digger'])

    await sortBy('Save order')
    await page.getByRole('button', { name: 'Ascending order' }).click()
    expect(await listed(page)).toEqual(saveOrder)
  })
})

test.describe('traits on a bionic duplicant', () => {
  test('offers bionic traits and hides standard ones', async ({ page }) => {
    expect(hasFixture(MITHRO), `${MITHRO} is missing from the full-tier fixtures`).toBe(true)
    await openSave(page, MITHRO)
    await goTo(page, 'Duplicants')
    await pick(page, 'Sonyar')
    await expect(page.locator('[data-trait="BionicBug7"] [data-category="bionic"]')).toHaveText(
      'Bionic',
    )

    await openTraitPicker(page, 'Anemic')
    await expect(page.getByText('Nothing found.')).toBeVisible()

    await page.locator('[cmdk-input]').fill('BionicBug1')
    const option = page.getByRole('option').first()
    await expect(option).toContainText('Bionic')
    await option.click()

    const { save } = await downloadSave(page)
    const before = traitIds(MITHRO, 'BionicMinion', 0)
    const traits = behavior(group(save, 'BionicMinion')[0]!, 'Klei.AI.Traits')!.templateData!
    expect(traits.TraitIds).toEqual([...before, 'BionicBug1'])
    expectOnlyChanged(original(MITHRO), save, [
      new RegExp(
        `^objects/BionicMinion/0/Klei\\.AI\\.Traits/templateData/TraitIds/(length|${before.length})$`,
      ),
    ])
  })

  test('refuses to paste a standard duplicant onto a bionic one', async ({ page }) => {
    expect(hasFixture(MITHRO), `${MITHRO} is missing from the full-tier fixtures`).toBe(true)
    await openSave(page, MITHRO)
    await goTo(page, 'Duplicants')
    // Copy a standard duplicant, then open the paste dialog on a bionic one.
    await page.getByLabel('Search duplicants').fill('3B')
    await page.locator('button[data-slot="item"]').first().click()
    await page.getByRole('button', { name: 'Duplicant actions' }).click()
    await page.getByRole('menuitem', { name: 'Copy profile' }).click()
    await page.getByLabel('Search duplicants').fill('Sonyar')
    await page.locator('button[data-slot="item"]').first().click()
    await page.getByRole('button', { name: 'Duplicant actions' }).click()
    await page.getByRole('menuitem', { name: /^Paste from/ }).click()

    await expect(page.getByTestId('model-mismatch')).toContainText('is a standard duplicant')
    for (const section of ['Traits', 'Interests', 'Skills and experience', 'Appearance']) {
      await expect(page.getByRole('checkbox', { name: section })).toBeDisabled()
    }
    await expect(page.getByRole('checkbox', { name: 'Attributes' })).toBeEnabled()
    // Apply stays enabled for what can be copied; no edit is made until it is clicked.
    expect(await editCount(page)).toBe(0)
  })
})
