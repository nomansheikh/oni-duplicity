import { readFileSync, writeFileSync } from 'node:fs'
import { expect, test } from '@playwright/test'
import { parseSave, writeSave } from '@oni-duplicity/save-parser'
import { downloadSave, editCount, fixturePath, GALAXY, goTo, openSave } from './helpers.ts'

async function rename(page: import('@playwright/test').Page, name: string) {
  const input = page.getByLabel('Colony name')
  await input.fill(name)
  await input.press('Enter')
  await expect(input).toHaveValue(name)
}

test('the download waits for the confirm dialog', async ({ page }) => {
  await openSave(page)
  await rename(page, 'Polished')
  await page.getByRole('switch', { name: 'Sandbox mode' }).click()
  await expect.poll(() => editCount(page)).toBe(2)

  let downloads = 0
  page.on('download', () => downloads++)
  await page.getByRole('button', { name: 'Download save' }).click()
  const dialog = page.getByRole('dialog')
  await expect(dialog).toContainText('Back up your original save first')
  // Two edits, one colony: counted by target.
  await expect(dialog).toContainText('You changed colony settings.')
  await expect(dialog.getByRole('list', { name: 'Edits' }).getByRole('listitem')).toHaveCount(2)

  await dialog.getByRole('button', { name: 'Cancel' }).click()
  await expect(dialog).toBeHidden()
  await page.waitForTimeout(500)
  expect(downloads).toBe(0)

  const { save, fileName } = await downloadSave(page)
  expect(downloads).toBe(1)
  expect(fileName).toBe('Polished.sav')
  expect(save.header.gameInfo.baseName).toBe('Polished')
})

test('the dialog groups edits by what they changed', async ({ page }) => {
  await openSave(page)
  await rename(page, 'Grouped')
  await goTo(page, 'Geysers')
  await page.getByRole('textbox', { name: /name/i }).first().fill('Old Faithful')
  await page.getByRole('textbox', { name: /name/i }).first().press('Enter')
  await expect.poll(() => editCount(page)).toBe(2)
  await page.getByRole('button', { name: 'Download save' }).click()
  await expect(page.getByRole('dialog')).toContainText('You changed colony settings, 1 geyser.')
})

test('the tab title carries a bullet while there are unsaved edits', async ({ page }) => {
  await openSave(page)
  await expect(page).toHaveTitle(/^Duplicity/)
  await rename(page, 'Dirty')
  await expect(page).toHaveTitle(/^• Duplicity/)
  await page.getByRole('button', { name: 'Undo' }).click()
  await expect(page).toHaveTitle(/^Duplicity/)
})

test('an autosave is flagged, and the note names the save it came from', async ({
  page,
}, testInfo) => {
  // No fixture is an autosave, so mark one in the header.
  const save = parseSave(readFileSync(fixturePath(GALAXY)))
  save.header.gameInfo.isAutoSave = true
  save.header.gameInfo.originalSaveName = 'Beautiful Galaxy.sav'
  const path = testInfo.outputPath('autosave.sav')
  writeFileSync(path, writeSave(save))

  await page.goto('/')
  await page.locator('input[type=file]').setInputFiles(path)
  await expect(page.getByText('Autosave', { exact: true })).toBeVisible({ timeout: 60_000 })
  await expect(page.getByText(/autosave rotation may overwrite/)).toContainText(
    'Beautiful Galaxy.sav',
  )
  await rename(page, 'Edited autosave')
  await page.getByRole('button', { name: 'Download save' }).click()
  await expect(page.getByRole('dialog')).toContainText('autosave rotation may overwrite')
})

test('a normal save shows no autosave badge', async ({ page }) => {
  await openSave(page)
  await expect(page.getByText('Autosave', { exact: true })).toHaveCount(0)
})

test('a truncated save explains itself, with details to copy', async ({ page, context }) => {
  await context.grantPermissions(['clipboard-read', 'clipboard-write'])
  await page.goto('/')
  const bytes = readFileSync(fixturePath(GALAXY)).subarray(0, 50_000)
  await page.locator('input[type=file]').setInputFiles({
    name: 'cut.sav',
    mimeType: 'application/octet-stream',
    buffer: Buffer.from(bytes),
  })
  await expect(page.getByText('File is truncated or corrupted')).toBeVisible({ timeout: 60_000 })
  const details = page.getByLabel('Error details')
  await expect(details).toBeHidden()
  await page.getByRole('button', { name: 'Details' }).click()
  await expect(details).toContainText(/Unexpected end of data|decompress/)
  await page.getByRole('button', { name: 'Copy details' }).click()
  await expect(page.getByRole('button', { name: 'Copied' })).toBeVisible()
  expect(await page.evaluate('navigator.clipboard.readText()')).toMatch(/truncated/)
})

test('a file that is not a save says so', async ({ page }) => {
  await page.goto('/')
  await page.locator('input[type=file]').setInputFiles({
    name: 'notes.sav',
    mimeType: 'text/plain',
    buffer: Buffer.from(
      'hello, this is not an oxygen not included save, just some text '.repeat(8),
    ),
  })
  await expect(page.getByText("This doesn't look like an ONI save")).toBeVisible()
})
