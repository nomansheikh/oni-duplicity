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
import { destinationCapacity } from '../src/lib/space-destinations.ts'
import { readFog, readHarvestState } from '../src/worker/pois.ts'

// The base-game fixture with starmap destinations, in the small tier.
const BASE = 'mithro-02-mid-game-cycle-148.sav'

const manager = (save: ReturnType<typeof original>) =>
  behavior(group(save, 'SaveGame')[0]!, 'SpacecraftManager')!.templateData!

type Destination = { id: number; type: string; availableMass: number }
const destinations = (save: ReturnType<typeof original>) =>
  manager(save).destinations as Destination[]

test.describe('starmap destinations', () => {
  test('sets the recoverable mass of a destination', async ({ page }) => {
    const before = destinations(original(BASE)).find((d) => d.id === 0)!
    const capacity = destinationCapacity(before.type)!
    expect(capacity).toBeGreaterThan(0)

    await openSave(page, BASE)
    await goTo(page, 'Space')
    const row = page.locator('tr[data-destination="0"]')
    const mass = row.getByLabel('Recoverable mass of destination 0')
    await mass.fill('5000')
    await mass.press('Enter')
    await expect(mass).toHaveValue('5000')
    await expect.poll(() => editCount(page)).toBe(1)

    const { save } = await downloadSave(page)
    expect(destinations(save).find((d) => d.id === 0)!.availableMass).toBe(5000)
    expectOnlyChanged(original(BASE), save, [
      /^objects\/SaveGame\/0\/SpacecraftManager\/templateData\/destinations\/\d+\/availableMass$/,
    ])

    // Fill restores the full amount, and undo goes back to the saved value.
    await row.getByRole('button', { name: 'Fill' }).click()
    await expect(mass).toHaveValue(String(capacity))
    await page.keyboard.press('ControlOrMeta+z')
    await page.keyboard.press('ControlOrMeta+z')
    await expect.poll(() => editCount(page)).toBe(0)
    const undone = await downloadSave(page)
    expectOnlyChanged(original(BASE), undone.save, [])
  })

  test('marks a hidden destination discovered and then analyzed', async ({ page }) => {
    const scores = (manager(original(BASE)).destinationAnalysisScores ?? []) as [number, number][]
    expect(scores.find(([id]) => id === 0)?.[1] ?? 0).toBeLessThan(50)
    expect(manager(original(BASE)).analyzeDestinationID).not.toBe(0)

    await openSave(page, BASE)
    await goTo(page, 'Space')
    const row = page.locator('tr[data-destination="0"]')
    await expect(row).toContainText('Hidden')
    await row.getByRole('button', { name: 'Discover' }).click()
    await expect(row).toContainText('Discovered')
    await row.getByRole('button', { name: 'Analyze' }).click()
    await expect(row).toContainText('Analyzed')
    await expect(row.getByRole('button', { name: 'Analyze' })).toHaveCount(0)

    const { save } = await downloadSave(page)
    const score = (manager(save).destinationAnalysisScores as [number, number][]).find(
      ([id]) => id === 0,
    )
    expect(score?.[1]).toBe(100)
    expectOnlyChanged(original(BASE), save, [
      /^objects\/SaveGame\/0\/SpacecraftManager\/templateData\/destinationAnalysisScores\/(length|\d+)(\/\d+)?$/,
    ])
  })
})

test.describe('points of interest', () => {
  const controller = (save: ReturnType<typeof original>, prefab: string, index: number) =>
    behavior(group(save, prefab)[index]!, 'StateMachineController')!

  test('reveals the known starmap cells', async ({ page }) => {
    const known = readFog(
      behavior(group(original(GALAXY), 'SaveGame')[0]!, 'StateMachineController')!.extraRaw,
    )!
    const pending = [...known.points.values()].filter((v) => v < 100).length
    expect(pending).toBeGreaterThan(0)

    await openSave(page)
    await goTo(page, 'Space')
    const reveal = page.getByRole('button', { name: `Reveal known cells (${pending})` })
    await reveal.click()
    await expect(page.getByRole('button', { name: 'Known cells revealed' })).toBeDisabled()
    await expect(page.locator('tr[data-poi]').filter({ hasText: 'Revealed' })).not.toHaveCount(0)

    const { save } = await downloadSave(page)
    const after = readFog(
      behavior(group(save, 'SaveGame')[0]!, 'StateMachineController')!.extraRaw,
    )!
    expect(after.count).toBe(known.count)
    expect([...after.points.values()].every((v) => v >= 100)).toBe(true)
    expectOnlyChanged(original(GALAXY), save, [
      /^objects\/SaveGame\/0\/StateMachineController\/extraRaw$/,
    ])

    await page.keyboard.press('ControlOrMeta+z')
    await expect(
      page.getByRole('button', { name: `Reveal known cells (${pending})` }),
    ).toBeVisible()
  })

  test('refills a POI stock (experimental)', async ({ page }) => {
    await openSave(page)
    await goTo(page, 'Space')
    await expect(page.getByText('Experimental').first()).toBeVisible()
    // The first POI whose Fill button is enabled is one that is not full.
    const first = page
      .locator('tr[data-poi]')
      .filter({ has: page.getByRole('button', { name: 'Fill' }).and(page.locator(':enabled')) })
      .first()
    const id = (await first.getAttribute('data-poi-id'))!
    const [prefab, index] = [
      id.slice(0, id.lastIndexOf(':')),
      Number(id.slice(id.lastIndexOf(':') + 1)),
    ]
    const row = page.locator(`tr[data-poi-id="${id}"]`)
    await row.getByRole('button', { name: 'Fill' }).click()
    await expect(row.getByRole('button', { name: 'Fill' })).toBeDisabled()
    await expect(row.getByText('Full')).toBeVisible()

    const { save } = await downloadSave(page)
    expectOnlyChanged(original(GALAXY), save, [
      new RegExp(`^objects\\/${prefab}\\/${index}\\/StateMachineController\\/extraRaw$`),
    ])
    const stock = (s: ReturnType<typeof original>) =>
      readHarvestState(controller(s, prefab, index).extraRaw)!.capacity
    expect(stock(save)).toBeGreaterThan(stock(original(GALAXY)))

    await page.keyboard.press('ControlOrMeta+z')
    await expect.poll(() => editCount(page)).toBe(0)
  })

  test('sets a POI stock by hand', async ({ page }) => {
    await openSave(page)
    await goTo(page, 'Space')
    const row = page.locator('tr[data-poi="OilyAsteroidField"]').first()
    const stock = row.getByLabel(/^Stock of /)
    await stock.fill('1000')
    await stock.press('Enter')
    await expect(row).toContainText('1,000 /')

    const { save } = await downloadSave(page)
    expectOnlyChanged(original(GALAXY), save, [
      /^objects\/HarvestableSpacePOI_OilyAsteroidField\/\d+\/StateMachineController\/extraRaw$/,
    ])
    const values = group(save, 'HarvestableSpacePOI_OilyAsteroidField').map(
      (_, i) =>
        readHarvestState(controller(save, 'HarvestableSpacePOI_OilyAsteroidField', i).extraRaw)!
          .capacity,
    )
    expect(values).toContain(1000)
  })
})
