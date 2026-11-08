import { expect, type Page } from '@playwright/test'
import { behavior, group, original } from './helpers.ts'

export const MITHRO = 'mithro-06-maximum-cycle-4770.sav'

export const traitIds = (file: string, prefab: string, index: number) =>
  behavior(group(original(file), prefab)[index]!, 'Klei.AI.Traits')!.templateData!
    .TraitIds as string[]

export async function pick(page: Page, name: string): Promise<void> {
  await page
    .locator('button')
    .filter({ has: page.getByText(name, { exact: true }) })
    .click()
  await expect(page.getByLabel('Name', { exact: true })).toHaveValue(name)
}

/** The names in the duplicant list, top to bottom; assert on it with `toHaveText`. */
export const listed = (page: Page) =>
  page.locator('button[data-slot="item"] [data-slot="duplicant-name"]')

export async function openTraitPicker(page: Page, search: string): Promise<void> {
  await page.getByRole('button', { name: 'Add trait' }).click()
  await page.locator('[cmdk-input]').fill(search)
}
