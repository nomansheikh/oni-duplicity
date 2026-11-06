import { expect, test } from '@playwright/test'
import {
  behavior,
  downloadSave,
  editCount,
  expectOnlyChanged,
  goTo,
  group,
  hasFixture,
  openSave,
  original,
} from './helpers.ts'
import { MITHRO, openTraitPicker, pick, traitIds } from './traits-helpers.ts'

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
    await expect(page.getByText('No such trait')).toBeVisible()

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
