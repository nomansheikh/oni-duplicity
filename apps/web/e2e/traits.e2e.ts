import { expect, test } from '@playwright/test'
import {
  behavior,
  downloadSave,
  editCount,
  expectOnlyChanged,
  GALAXY,
  goTo,
  group,
  openSave,
  original,
} from './helpers.ts'
import { listed, openTraitPicker, pick, traitIds } from './traits-helpers.ts'

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
    // On the card a positive trait is its green name badge, with no separate category label.
    await expect(added.locator('[data-slot=badge][data-variant=good]')).toHaveText('Twinkletoes')

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
    // Digger has the Mining interest, which the game names Digger; Can't Dig excludes it.
    await pick(page, 'Digger')
    await openTraitPicker(page, 'CantDig')
    const option = page.getByRole('option').first()
    await expect(option).toHaveAttribute('aria-disabled', 'true')
    await expect(option).toContainText("Can't be combined with the Digger interest.")
    await option.click({ force: true })
    await expect(page.locator('[data-trait="CantDig"]')).toHaveCount(0)
    expect(await editCount(page)).toBe(0)
  })

  test('blocks a trait that clashes with a trait and says why', async ({ page }) => {
    // Farmer has Simple Tastes (Shrivelled Tastebuds in game); Foodie excludes it.
    await pick(page, 'Farmer')
    await openTraitPicker(page, 'Foodie')
    const option = page.getByRole('option').first()
    await expect(option).toHaveAttribute('aria-disabled', 'true')
    await expect(option).toContainText("Can't be combined with the trait Shrivelled Tastebuds.")
    await option.click({ force: true })
    await expect(page.locator('[data-trait="Foodie"]')).toHaveCount(0)
    expect(await editCount(page)).toBe(0)
  })

  test('does not offer bionic traits to a standard duplicant', async ({ page }) => {
    await pick(page, 'Cook')
    await openTraitPicker(page, 'BionicBug')
    await expect(page.getByText('No such trait')).toBeVisible()
    await page.locator('[cmdk-input]').fill('StartWithBooster')
    await expect(page.getByText('No such trait')).toBeVisible()
  })

  test('searches the duplicant list by name, trait and interest', async ({ page }) => {
    const search = page.getByLabel('Search duplicants')
    const names = listed(page)
    await expect(names).toHaveCount(9)

    await search.fill('supplier')
    await expect(names).toHaveText(['Supplier'])
    // Artist matches by name and, through the Balloon Artist trait, three more.
    await search.fill('artist')
    await expect(names).toHaveText(['Farmer', 'Cook', 'Operator', 'Artist'])
    // Binge Eater: Digger, Operator and Artist.
    await search.fill('binge eater')
    await expect(names).toHaveText(['Digger', 'Operator', 'Artist'])
    // The Hauling interest: Supplier.
    await search.fill('hauling')
    await expect(names).toHaveText(['Supplier'])
    await search.fill('no such thing')
    await expect(page.getByText('Nobody matches that search. Try another name.')).toBeVisible()
  })

  test('sorts the duplicant list', async ({ page }) => {
    const names = listed(page)
    const sortBy = async (label: string) => {
      await page.getByRole('combobox', { name: 'Sort duplicants' }).click()
      await page.getByRole('option', { name: `Sort: ${label}` }).click()
    }
    const saveOrder = [
      'Digger',
      'Researcher',
      'Farmer',
      'Cook',
      'Supplier',
      'Rancher',
      'Builder',
      'Operator',
      'Artist',
    ]
    await expect(names).toHaveText(saveOrder)

    const byName = [...saveOrder].sort((a, b) => a.localeCompare(b))
    await sortBy('Name')
    await expect(names).toHaveText(byName)
    await page.getByRole('button', { name: 'Ascending order' }).click()
    await expect(names).toHaveText([...byName].reverse())

    // Oldest arrival first: the starters (cycle 0) in save order, then Farmer (3), Cook (6),
    // Supplier (9), Rancher (13), Operator (26) and Artist (57).
    await sortBy('Arrival')
    await expect(names).toHaveText([
      'Digger',
      'Researcher',
      'Builder',
      'Farmer',
      'Cook',
      'Supplier',
      'Rancher',
      'Operator',
      'Artist',
    ])
    await page.getByRole('button', { name: 'Ascending order' }).click()
    await expect(names.first()).toHaveText('Artist')

    // Most stressed first: Builder (9%), then Digger (8%).
    await sortBy('Stress')
    await expect(names.first()).toHaveText('Builder')
    await expect(names.nth(1)).toHaveText('Digger')

    // Save order starts ascending again, whichever direction the last sort left.
    await sortBy('Save order')
    await expect(page.getByRole('button', { name: 'Ascending order' })).toBeVisible()
    await expect(names).toHaveText(saveOrder)
  })
})
