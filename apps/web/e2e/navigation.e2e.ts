import { expect, test } from '@playwright/test'
import { goTo, openSave } from './helpers.ts'

test('each group remembers its last sub-tab', async ({ page }) => {
  await openSave(page)
  await goTo(page, 'Geysers')
  await goTo(page, 'Overview')
  await page.getByRole('tablist', { name: 'Groups' }).getByRole('tab', { name: 'World' }).click()
  await expect(
    page.getByRole('tablist', { name: 'World pages' }).getByRole('tab', { name: 'Geysers' }),
  ).toHaveAttribute('aria-selected', 'true')
})

test('shows a dirty dot and the edit count where the edit was made', async ({ page }) => {
  await openSave(page)
  await goTo(page, 'Difficulty')
  await page.getByRole('switch', { name: 'Sandbox mode' }).click()

  const groups = page.getByRole('tablist', { name: 'Groups' })
  await expect(
    groups.getByRole('tab', { name: 'Game' }).locator('[data-slot=dirty-dot]'),
  ).toBeVisible()
  await expect(
    groups.getByRole('tab', { name: 'World' }).locator('[data-slot=dirty-dot]'),
  ).toHaveCount(0)
  await expect(page.getByTestId('download-count')).toHaveText('1')
})

test('filters geysers by asteroid', async ({ page }) => {
  await openSave(page)
  await goTo(page, 'Geysers')
  const cards = page.getByRole('row')
  const total = await cards.count()
  expect(total).toBeGreaterThan(0)
  const filter = page.getByRole('combobox', { name: 'Asteroid' })
  await filter.click()
  const options = await page.getByRole('option').count()
  await page.keyboard.press('Escape')

  // Every geyser is on exactly one asteroid, so the per-asteroid counts add up to the total.
  let sum = 0
  for (let i = 1; i < options; i++) {
    await filter.click()
    await page.getByRole('option').nth(i).click()
    sum += await cards.count()
  }
  expect(sum).toBe(total)
})
