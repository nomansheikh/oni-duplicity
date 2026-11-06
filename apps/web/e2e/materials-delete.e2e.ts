import { expect, test } from '@playwright/test'
import {
  downloadSave,
  editCount,
  expectOnlyChanged,
  GALAXY,
  group,
  hasFixture,
  openSave,
  original,
} from './helpers.ts'
import { openElement } from './materials-helpers.ts'

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
