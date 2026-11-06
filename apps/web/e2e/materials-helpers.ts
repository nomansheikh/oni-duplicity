import { expect, type Page } from '@playwright/test'
import { goTo } from './helpers.ts'

/** Opens the edit sheet of one element, e.g. `Wolframite`. */
export async function openElement(page: Page, name: string) {
  await goTo(page, 'Resources')
  await page.getByPlaceholder('Search elements').fill(name)
  await page
    .getByRole('row')
    .filter({ has: page.getByRole('cell', { name, exact: true }) })
    .getByRole('button', { name: 'Edit' })
    .click()
  const sheet = page.getByRole('dialog')
  await expect(sheet.getByText('Loose').first()).toBeVisible()
  return sheet
}
