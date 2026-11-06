import { expect, test, type Page } from '@playwright/test'
import { goTo } from './helpers.ts'

/** The seed finder works without a save, so the start screen's Tools card opens it. */
async function openSeedFinder(page: Page): Promise<void> {
  await page.goto('/')
  await page.getByRole('button', { name: /^Seed finder/ }).click()
  await expect(page.getByRole('heading', { name: 'Seed finder' })).toBeVisible()
}

test('the start screen opens the example save', async ({ page }) => {
  await page.goto('/')
  await page.getByRole('button', { name: 'Try an example save' }).click()
  await expect(page.getByRole('button', { name: 'Download save' })).toBeEnabled({
    timeout: 60_000,
  })
  await goTo(page, 'Duplicants')
  await expect(page.getByRole('tab', { name: 'Duplicants', selected: true })).toBeVisible()
})

test('a saveless tool opens without a save', async ({ page }) => {
  await openSeedFinder(page)
  await expect(page.getByRole('button', { name: 'Download save' })).toHaveCount(0)
})

test('a seed search with a 100-seed limit ends with results', async ({ page }) => {
  await openSeedFinder(page)
  await page.getByRole('combobox', { name: 'Preset' }).click()
  await page.getByRole('option', { name: /Easy start/ }).click()
  await page
    .getByRole('radiogroup', { name: 'Seed limit quick picks' })
    .getByRole('radio', { name: '100', exact: true })
    .click()
  await page.getByRole('button', { name: 'Find' }).click()
  await expect(page.getByRole('status').filter({ hasText: /^Done: tried 100 seeds/ })).toBeVisible({
    timeout: 90_000,
  })
  await expect(page.getByRole('button', { name: /in the big view$/ }).first()).toBeVisible()
})

test('a seed link opens the seed viewer', async ({ page }) => {
  const coordinate = 'SNDST-C-1393183751-0-0-0'
  await page.goto(`/#seed=${coordinate}`)
  const viewer = page.getByRole('dialog', { name: 'Seed viewer' })
  await expect(viewer).toBeVisible()
  await expect(viewer).toContainText(coordinate)
})
