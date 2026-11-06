import { expect, test } from '@playwright/test'
import { GALAXY, goTo, openSave, original } from './helpers.ts'

test('lists the starmap points of interest', async ({ page }) => {
  const save = original(GALAXY)
  const expected = ['HarvestableSpacePOI_', 'ArtifactSpacePOI_'].flatMap((prefix) =>
    save.gameObjects.filter((g) => g.name.startsWith(prefix)).flatMap((g) => g.gameObjects),
  ).length
  expect(expected).toBeGreaterThan(0)

  await openSave(page)
  await goTo(page, 'Space')
  await expect(page.getByText('Points of interest', { exact: true })).toBeVisible()
  const rows = page.locator('tr[data-poi]')
  await expect(rows).toHaveCount(expected)

  // A field with stock, a recharge and an artifact, and one the colony has not found yet.
  const oily = rows.filter({ hasText: 'Oily Asteroid Field' }).first()
  await expect(oily).toContainText(/\d[\d,]* \/ [\d,]+ kg/)
  await expect(oily).toContainText('Crude Oil')
  await expect(oily).toContainText('Hidden')
  await expect(rows.filter({ hasText: 'Peeked' }).first()).toBeVisible()
  // Only the asteroid table has switches; the POI table is read-only.
  await expect(page.locator('tr[data-poi]').getByRole('switch')).toHaveCount(0)
  await expect(page.locator('tr[data-poi]').getByRole('textbox')).toHaveCount(0)
})
