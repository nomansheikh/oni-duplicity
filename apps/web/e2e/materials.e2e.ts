import { expect, test } from '@playwright/test'
import {
  behavior,
  downloadSave,
  expectOnlyChanged,
  GALAXY,
  group,
  openSave,
  original,
} from './helpers.ts'
import { openElement } from './materials-helpers.ts'

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
