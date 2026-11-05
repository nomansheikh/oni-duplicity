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

/** Opens the edit sheet of one element, e.g. `Wolframite`. */
async function openElement(page: Page, name: string) {
  await goTo(page, 'Materials')
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

const primary = (prefab: string, index: number) =>
  behavior(group(original(GALAXY), prefab)[index]!, 'PrimaryElement')!.templateData as {
    Units: number
    _Temperature: number
  }

test('sets the mass of one item', async ({ page }) => {
  // Wolframite has a single loose chunk (about 1.2 t), so there is one row to edit.
  expect(group(original(GALAXY), 'Wolframite')).toHaveLength(1)
  await openSave(page)
  const sheet = await openElement(page, 'Wolframite')

  const mass = sheet.getByRole('spinbutton', { name: 'Mass', exact: true })
  await mass.fill('500')
  await mass.press('Enter')
  await expect(sheet.getByText('500 kg', { exact: false }).first()).toBeVisible()

  // The sheet is modal and covers the header's download button.
  await page.keyboard.press('Escape')
  await expect(sheet).toBeHidden()
  const { save } = await downloadSave(page)
  const wolframite = group(save, 'Wolframite')[0]!
  expect(behavior(wolframite, 'PrimaryElement')!.templateData!.Units).toBe(500)
  expectOnlyChanged(original(GALAXY), save, [
    /^objects\/Wolframite\/0\/PrimaryElement\/templateData\/Units$/,
  ])
})

test('sets the temperature of one item', async ({ page }) => {
  expect(group(original(GALAXY), 'Rubber')).toHaveLength(1)
  await openSave(page)
  const sheet = await openElement(page, 'Rubber')

  // The UI shows degrees Celsius; the save stores Kelvin.
  const temperature = sheet.getByRole('spinbutton', { name: 'Temperature', exact: true })
  await temperature.fill('50')
  await temperature.press('Enter')

  // The sheet is modal and covers the header's download button.
  await page.keyboard.press('Escape')
  await expect(sheet).toBeHidden()
  const { save } = await downloadSave(page)
  const rubber = behavior(group(save, 'Rubber')[0]!, 'PrimaryElement')!.templateData!
  expect(rubber._Temperature).toBeCloseTo(323.15, 2)
  // The mass is untouched.
  expect(rubber.Units).toBe(primary('Rubber', 0).Units)
  expectOnlyChanged(original(GALAXY), save, [
    /^objects\/Rubber\/0\/PrimaryElement\/templateData\/_Temperature$/,
  ])
})

test('multiplies every mass of one element', async ({ page }) => {
  // Brine Ice: four loose chunks and nothing stored, so the bulk edit touches exactly four items.
  const before = group(original(GALAXY), 'BrineIce')
  expect(before).toHaveLength(4)
  await openSave(page)
  const sheet = await openElement(page, 'Brine Ice')

  await sheet.getByLabel('Multiply every mass', { exact: true }).fill('2')
  await sheet.getByRole('button', { name: 'Apply' }).last().click()

  // The sheet is modal and covers the header's download button.
  await page.keyboard.press('Escape')
  await expect(sheet).toBeHidden()
  const { save } = await downloadSave(page)
  const after = group(save, 'BrineIce')
  expect(after).toHaveLength(4)
  after.forEach((obj, i) => {
    const units = behavior(obj, 'PrimaryElement')!.templateData!.Units as number
    expect(units).toBeCloseTo(primary('BrineIce', i).Units * 2, 6)
  })
  expectOnlyChanged(original(GALAXY), save, [
    /^objects\/BrineIce\/0\/PrimaryElement\/templateData\/Units$/,
    /^objects\/BrineIce\/1\/PrimaryElement\/templateData\/Units$/,
    /^objects\/BrineIce\/2\/PrimaryElement\/templateData\/Units$/,
    /^objects\/BrineIce\/3\/PrimaryElement\/templateData\/Units$/,
  ])
})

const LOOSE_BRINE = 4

test('deletes one loose item and nothing else', async ({ page }) => {
  // Wolframite has one loose chunk, so removing it only changes that group.
  expect(group(original(GALAXY), 'Wolframite')).toHaveLength(1)
  await openSave(page)
  const sheet = await openElement(page, 'Wolframite')
  await sheet.getByRole('button', { name: 'Delete debris' }).click()
  await expect(sheet.getByRole('button', { name: 'Delete debris' })).toHaveCount(0)

  await page.keyboard.press('Escape')
  await expect(sheet).toBeHidden()
  const { save } = await downloadSave(page)
  expect(group(save, 'Wolframite')).toHaveLength(0)
  expectOnlyChanged(original(GALAXY), save, [/^objects\/Wolframite\/(length|0)$/])
})

test('undoing a delete brings the item back and the save downloads unchanged', async ({ page }) => {
  await openSave(page)
  const sheet = await openElement(page, 'Wolframite')
  await sheet.getByRole('button', { name: 'Delete debris' }).click()
  await expect(sheet.getByRole('button', { name: 'Delete debris' })).toHaveCount(0)
  await page.keyboard.press('Escape')
  await expect(sheet).toBeHidden()

  await expect.poll(() => editCount(page)).toBe(1)
  await page.getByRole('button', { name: 'Undo' }).click()
  await expect.poll(() => editCount(page)).toBe(0)
  // The element is listed again, so the sheet that closed when its last item went reopens.
  await expect(sheet.getByRole('button', { name: 'Delete debris' })).toHaveCount(1)
  await page.keyboard.press('Escape')
  await expect(sheet).toBeHidden()
  const { save } = await downloadSave(page)
  expect(group(save, 'Wolframite')).toHaveLength(1)
  expectOnlyChanged(original(GALAXY), save, [])
})

test('deletes the selected loose items after a confirmation', async ({ page }) => {
  const before = group(original(GALAXY), 'BrineIce')
  expect(before).toHaveLength(LOOSE_BRINE)
  await openSave(page)
  const sheet = await openElement(page, 'Brine Ice')

  // The last two rows are the last two objects, so nothing else shifts.
  const boxes = sheet.getByRole('checkbox', { name: /^Select item at/ })
  await expect(boxes).toHaveCount(LOOSE_BRINE)
  await boxes.nth(2).click()
  await boxes.nth(3).click()
  await sheet.getByRole('button', { name: 'Delete selected (2)' }).click()

  const dialog = page.getByRole('dialog').filter({ hasText: 'Delete 2 loose items?' })
  await expect(dialog).toContainText('Brine Ice')
  await dialog.getByRole('button', { name: 'Delete 2' }).click()
  await expect(sheet.getByRole('checkbox', { name: /^Select item at/ })).toHaveCount(2)

  await page.keyboard.press('Escape')
  await expect(sheet).toBeHidden()
  const { save } = await downloadSave(page)
  expect(group(save, 'BrineIce')).toEqual(before.slice(0, 2))
  expectOnlyChanged(original(GALAXY), save, [/^objects\/BrineIce\/(length|2|3)$/])
})

test('deletes every loose item of an element, and cancel deletes nothing', async ({ page }) => {
  await openSave(page)
  const sheet = await openElement(page, 'Brine Ice')
  await sheet.getByRole('button', { name: `Delete all loose (${LOOSE_BRINE})` }).click()
  const dialog = page.getByRole('dialog').filter({ hasText: `Delete ${LOOSE_BRINE} loose items?` })
  await dialog.getByRole('button', { name: 'Cancel' }).click()
  await expect(dialog).toBeHidden()
  await expect(sheet.getByRole('checkbox', { name: /^Select item at/ })).toHaveCount(LOOSE_BRINE)

  await sheet.getByRole('button', { name: `Delete all loose (${LOOSE_BRINE})` }).click()
  await dialog.getByRole('button', { name: `Delete ${LOOSE_BRINE}` }).click()
  await expect(sheet.getByRole('checkbox', { name: /^Select item at/ })).toHaveCount(0)

  await page.keyboard.press('Escape')
  await expect(sheet).toBeHidden()
  const { save } = await downloadSave(page)
  expect(group(save, 'BrineIce')).toHaveLength(0)
  expectOnlyChanged(original(GALAXY), save, [/^objects\/BrineIce\/(length|[0-3])$/])
})

test.describe('items under a move order', () => {
  const MITHRO = 'mithro-05-most-dupes-59-cycle-1423.sav'
  const required = Boolean(process.env.CI) && process.env.FIXTURE_TIER === 'all'
  test.skip(!required && !hasFixture(MITHRO), `${MITHRO} is not downloaded`)

  test('cannot be deleted', async ({ page }) => {
    expect(hasFixture(MITHRO), `${MITHRO} is missing from the full-tier fixtures`).toBe(true)
    await openSave(page, MITHRO)
    const sheet = await openElement(page, 'Oxylite')
    // Five loose chunks; two of them are marked for a move order in this colony.
    await expect(sheet.getByRole('button', { name: 'Delete debris', disabled: true })).toHaveCount(
      2,
    )
    await expect(sheet.getByRole('button', { name: 'Delete debris', disabled: false })).toHaveCount(
      3,
    )
    await expect(sheet.getByRole('button', { name: 'Delete all loose (3)' })).toBeEnabled()
    await sheet.getByRole('button', { name: 'Delete all loose (3)' }).click()
    const dialog = page.getByRole('dialog').filter({ hasText: 'Delete 3 loose items?' })
    await expect(dialog).toContainText('2 items are skipped')
  })
})
