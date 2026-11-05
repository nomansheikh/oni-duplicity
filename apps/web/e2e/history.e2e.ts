import { expect, test } from '@playwright/test'
import {
  downloadSave,
  editCount,
  expectOnlyChanged,
  GALAXY,
  openSave,
  original,
} from './helpers.ts'

async function rename(page: import('@playwright/test').Page, name: string, edits: number) {
  const input = page.getByLabel('Colony name')
  await input.fill(name)
  await input.press('Enter')
  // The input holds what was typed whether or not the edit landed; the edit count only
  // moves once the worker has applied it. `edits` is the total expected afterwards.
  await expect.poll(() => editCount(page)).toBe(edits)
  await expect(input).toHaveValue(name)
}

test('undo and redo walk the edit history, and only the result is saved', async ({ page }) => {
  await openSave(page)
  const undo = page.getByRole('button', { name: 'Undo' })
  const redo = page.getByRole('button', { name: 'Redo' })
  await expect(undo).toBeDisabled()

  await rename(page, 'First', 1)
  await page.getByRole('switch', { name: 'Sandbox mode' }).click()
  await expect.poll(() => editCount(page)).toBe(2)
  await rename(page, 'Second', 3)

  // Undo the rename and the sandbox switch, then redo the switch.
  await undo.click()
  await expect(page.getByLabel('Colony name')).toHaveValue('First')
  await undo.click()
  await expect(page.getByRole('switch', { name: 'Sandbox mode' })).not.toBeChecked()
  await expect.poll(() => editCount(page)).toBe(1)
  await redo.click()
  await expect(page.getByRole('switch', { name: 'Sandbox mode' })).toBeChecked()
  await expect.poll(() => editCount(page)).toBe(2)

  const { save } = await downloadSave(page)
  expect(save.header.gameInfo.baseName).toBe('First')
  expect(save.header.gameInfo.sandboxEnabled).toBe(true)
  expectOnlyChanged(original(GALAXY), save, [
    /^header\/gameInfo\/baseName$/,
    /^header\/gameInfo\/sandboxEnabled$/,
    /^objects\/SaveGame\/0\/SaveGame\/templateData\/sandboxEnabled$/,
    /^gameData\/customGameSettings\/CurrentQualityLevelsBySetting\/\d+\/1$/,
  ])
})

test('undoing every edit downloads the save unchanged', async ({ page }) => {
  await openSave(page)
  await rename(page, 'Gone', 1)
  await page.getByRole('switch', { name: 'Debug mode was used' }).click()
  await page.keyboard.press('ControlOrMeta+z')
  await page.keyboard.press('ControlOrMeta+z')
  await expect(page.getByLabel('Colony name')).toHaveValue(
    original(GALAXY).header.gameInfo.baseName,
  )
  await expect.poll(() => editCount(page)).toBe(0)

  const { save } = await downloadSave(page)
  expectOnlyChanged(original(GALAXY), save, [])
})

test('lists unsaved changes newest first', async ({ page }) => {
  await openSave(page)
  await rename(page, 'Listed', 1)
  await page.getByRole('switch', { name: 'Sandbox mode' }).click()

  await page.getByRole('button', { name: '2 unsaved edits' }).click()
  const items = page.getByRole('listitem').filter({ hasText: /^\d/ })
  await expect(page.getByText('Unsaved changes')).toBeVisible()
  await expect(items).toHaveText([
    /^2\s*Turn sandbox mode on$/,
    /^1\s*Rename the colony to “Listed”$/,
  ])

  // Undo removes the newest entry from the list.
  await page.keyboard.press('Escape')
  await page.getByRole('button', { name: 'Undo' }).click()
  await page.getByRole('button', { name: '1 unsaved edit' }).click()
  await expect(items).toHaveText([/^1\s*Rename the colony to “Listed”$/])
})
