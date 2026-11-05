import { expect, test } from '@playwright/test'
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

// Konove is a small-tier fixture (fetched on every CI run); mithro-06 is full tier.
const KONOVE = 'konove-save-game.sav'
const MITHRO = 'mithro-06-maximum-cycle-4770.sav'

const events = (save: ReturnType<typeof original>) =>
  behavior(group(save, 'SaveGame')[0]!, 'GameplayEventManager')!.templateData as {
    activeEvents: { eventStartTime: number }[]
  }

test.describe('Demolior', () => {
  test.skip(!hasFixture(KONOVE), `${KONOVE} is not downloaded`)

  test('shows the event and its timing', async ({ page }) => {
    await openSave(page, KONOVE)
    await goTo(page, 'DLC')
    const card = page.locator('[data-slot=card]').filter({ hasText: 'Demolior impact' })
    await expect(card).toBeVisible()
    await expect(card.getByText('Cycle 1.1', { exact: true })).toBeVisible()
    await expect(card.getByText('Default', { exact: true })).toBeVisible()
    await expect(card.getByText('Cycle 201.1', { exact: true })).toBeVisible()
    await expect(card.getByText('132.5 cycles')).toBeVisible()
    await expect(card.getByText('960 / 1,000')).toBeVisible()
    await expect(card.getByText('Experimental')).toBeVisible()
  })

  test('postpones the impact and changes only the timing fields', async ({ page }) => {
    const start = events(original(KONOVE)).activeEvents[0]!.eventStartTime
    await openSave(page, KONOVE)
    await goTo(page, 'DLC')
    const input = page.getByRole('spinbutton', { name: 'Impact cycle' })
    await expect(input).toHaveValue('201.1')
    await input.fill('251.1')
    await input.press('Enter')
    await expect(input).toHaveValue('251.1')
    await expect(page.getByText('182.5 cycles')).toBeVisible()

    const { save } = await downloadSave(page)
    expect(events(save).activeEvents[0]!.eventStartTime).toBeCloseTo(start + (251.1 - 201.0834), 2)
    expectOnlyChanged(original(KONOVE), save, [
      /^objects\/SaveGame\/0\/GameplayEventManager\/templateData\/activeEvents\/0\/eventStartTime$/,
      /^objects\/LargeImpactor\/0\/StateMachineController\/extraRaw$/,
    ])
  })

  test('an impact in the past is clamped to one cycle from now', async ({ page }) => {
    await openSave(page, KONOVE)
    await goTo(page, 'DLC')
    const input = page.getByRole('spinbutton', { name: 'Impact cycle' })
    await input.fill('5')
    await input.press('Enter')
    await expect(page.getByText('1 cycles', { exact: true })).toBeVisible()
  })

  test('undo puts the original timing back', async ({ page }) => {
    await openSave(page, KONOVE)
    await goTo(page, 'DLC')
    const input = page.getByRole('spinbutton', { name: 'Impact cycle' })
    await input.fill('300')
    await input.press('Enter')
    await expect(input).toHaveValue('300')
    // The field shows the typed value at once; wait until the edit is really applied.
    await expect(page.getByRole('button', { name: /unsaved edits?$/ })).toBeVisible()
    await expect(page.getByRole('button', { name: 'Undo' })).toBeEnabled()
    await page.getByRole('button', { name: 'Undo' }).click()
    await expect(input).toHaveValue('201.1')

    const { save } = await downloadSave(page)
    expectOnlyChanged(original(KONOVE), save, [])
  })
})

test('lists world mixing as read only', async ({ page }) => {
  await openSave(page, GALAXY)
  await goTo(page, 'DLC')
  const card = page.locator('[data-slot=card]').filter({ hasText: 'World mixing' })
  await expect(card.getByText("can't be changed after the world exists")).toBeVisible()
  const row = (name: string) => card.getByRole('row').filter({ hasText: name })
  await expect(row('Prehistoric Planet Pack')).toContainText('Enabled')
  await expect(row('Aquatic Planet Pack')).toContainText('Disabled')
  await expect(row('Frosty Planet Pack')).toContainText('Enabled')
  await expect(row('Ice Caves')).toContainText('Disabled')
  await expect(card.getByRole('combobox')).toHaveCount(0)
  await expect(card.getByRole('switch')).toHaveCount(0)
})

test.describe('geothermal', () => {
  // The 40 MB save is only fetched by the full tier (main and nightly). There, a missing
  // fixture is a failure; everywhere else the test is skipped.
  const required = Boolean(process.env.CI) && process.env.FIXTURE_TIER === 'all'
  test.skip(!required && !hasFixture(MITHRO), `${MITHRO} is not downloaded`)

  test('shows the controller state and each vent', async ({ page }) => {
    expect(hasFixture(MITHRO), `${MITHRO} is missing from the full-tier fixtures`).toBe(true)
    await openSave(page, MITHRO)
    await goTo(page, 'DLC')
    const card = page.locator('[data-slot=card]').filter({ hasText: 'Geothermal plant' })
    await expect(card.getByText('Complete', { exact: true }).first()).toBeVisible()
    const rows = card.getByRole('row')
    await expect(rows).toHaveCount(4)
    await expect(rows.nth(1)).toContainText('4,412.6 kg')
    await expect(rows.nth(2)).toContainText('4,170.6 kg')
    await expect(rows.nth(3)).toContainText('4,754.8 kg')
    await expect(card.getByRole('spinbutton')).toHaveCount(0)
  })
})
