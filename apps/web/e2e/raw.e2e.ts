import { expect, test, type Page } from '@playwright/test'
import { downloadSave, expectOnlyChanged, GALAXY, goTo, openSave, original } from './helpers.ts'

/** Opens the raw editor and jumps to a path such as `header.gameInfo`. */
async function openRaw(page: Page, path: string) {
  await goTo(page, 'Raw data')
  const goto = page.getByPlaceholder(/^Go to path/)
  await goto.fill(path)
  await goto.press('Enter')
}

const MIXING = 'gameData.customGameSettings.CurrentMixingLevelsBySetting'
const mixing = (save: ReturnType<typeof original>) =>
  (save.gameData.customGameSettings as { CurrentMixingLevelsBySetting: unknown[] })
    .CurrentMixingLevelsBySetting

/** The row whose key button reads `[n]`, so its actions menu can be opened. */
async function openRowActions(page: Page, key: string) {
  const row = page.locator('.group').filter({
    has: page.getByRole('button', { name: key, exact: true }),
  })
  await row.getByRole('button', { name: 'Row actions' }).click()
}

test('edits one primitive value', async ({ page }) => {
  expect(original(GALAXY).header.gameInfo.numberOfCycles).toBe(88)
  await openSave(page)
  await openRaw(page, 'header.gameInfo')

  const cycles = page.getByRole('textbox', { name: 'numberOfCycles' })
  await expect(cycles).toHaveValue('88')
  await cycles.fill('123')
  await cycles.press('Enter')
  await expect(cycles).toHaveValue('123')

  const { save } = await downloadSave(page)
  expect(save.header.gameInfo.numberOfCycles).toBe(123)
  expectOnlyChanged(original(GALAXY), save, [/^header\/gameInfo\/numberOfCycles$/])
})

test('removes an array item', async ({ page }) => {
  const before = mixing(original(GALAXY))
  expect(before).toHaveLength(17)
  await openSave(page)
  await openRaw(page, MIXING)

  await openRowActions(page, '[16]')
  await page.getByRole('menuitem', { name: 'Remove item' }).click()
  await expect(page.getByRole('button', { name: '[16]', exact: true })).toHaveCount(0)

  const { save } = await downloadSave(page)
  // The last item went away; the others kept their order.
  expect(mixing(save)).toEqual(before.slice(0, -1))
  expectOnlyChanged(original(GALAXY), save, [
    /^gameData\/customGameSettings\/CurrentMixingLevelsBySetting\/(length|16)$/,
  ])
})

test('duplicates an array item', async ({ page }) => {
  const before = mixing(original(GALAXY))
  await openSave(page)
  await openRaw(page, MIXING)

  await openRowActions(page, '[16]')
  await page.getByRole('menuitem', { name: 'Duplicate item' }).click()
  await expect(page.getByRole('button', { name: '[17]', exact: true })).toBeVisible()

  const { save } = await downloadSave(page)
  // The copy lands right after the original, which is the last item here.
  expect(mixing(save)).toEqual([...before, before[16]])
  expect(mixing(save)[17]).toEqual(mixing(save)[16])
  expectOnlyChanged(original(GALAXY), save, [
    /^gameData\/customGameSettings\/CurrentMixingLevelsBySetting\/(length|17)$/,
  ])
})

/** The first array of strings named TraitIds in tree order, as the whole-tree search finds it. */
function firstTraitIds(save: ReturnType<typeof original>) {
  for (const group of save.gameObjects) {
    for (const [index, obj] of group.gameObjects.entries()) {
      for (const b of obj.behaviors) {
        const ids = b.templateData?.TraitIds
        if (Array.isArray(ids) && ids.length > 0)
          return { group: group.name, index, ids: ids as string[] }
      }
    }
  }
  throw new Error('no TraitIds in the fixture')
}

test('searches the whole save for a deep key, jumps to it and edits it', async ({ page }) => {
  const { group, index, ids } = firstTraitIds(original(GALAXY))
  await openSave(page)
  await goTo(page, 'Raw data')

  // Nothing is expanded, so only a search of the whole save can reach this row.
  await page
    .getByRole('textbox', { name: 'Search the whole save' })
    .fill('templateData.TraitIds[0]')
  const results = page.getByRole('list', { name: 'Search results' })
  const hit = results.getByRole('button').first()
  await expect(hit).toContainText('templateData.TraitIds[0]')
  await expect(hit).toContainText(ids[0]!)
  await hit.click()

  // The tree opened down to the row and the row is the highlighted one.
  const field = page.getByRole('textbox', { name: '0', exact: true })
  await expect(field).toHaveValue(ids[0]!)
  await expect(page.locator('.group.ring-primary')).toHaveCount(1)
  await field.fill('Anemic')
  await field.press('Enter')
  await expect(field).toHaveValue('Anemic')

  const { save } = await downloadSave(page)
  expect(firstTraitIds(save).ids[0]).toBe('Anemic')
  const escaped = group.replaceAll(/[.*+?^${}()|[\]\\]/g, '\\$&')
  expectOnlyChanged(original(GALAXY), save, [
    new RegExp(`^objects/${escaped}/${index}/[^/]+/templateData/TraitIds/0$`),
  ])
})

test('says when a search finds nothing', async ({ page }) => {
  await openSave(page)
  await goTo(page, 'Raw data')
  await page.getByRole('textbox', { name: 'Search the whole save' }).fill('no_such_key_anywhere')
  await expect(page.getByText('No matches in the whole save')).toBeVisible()
})

test('adds an item to an array of objects', async ({ page }) => {
  const before = (original(GALAXY).world as { active_mods: unknown[] }).active_mods
  expect(before.length).toBeGreaterThan(0)
  await openSave(page)
  await openRaw(page, 'world')

  await openRowActions(page, 'active_mods')
  await page.getByRole('menuitem', { name: 'Add item', exact: true }).click()
  await expect(page.getByText(`[ ${before.length + 1} ]`).first()).toBeVisible()

  const { save } = await downloadSave(page)
  const after = (save.world as { active_mods: Record<string, unknown>[] }).active_mods
  expect(after).toHaveLength(before.length + 1)
  expect(after.slice(0, -1)).toEqual(before)
  // Every field of the new item exists, with the zero value of its type.
  expect(Object.keys(after.at(-1)!)).toEqual(Object.keys(before[0] as object))
  expectOnlyChanged(original(GALAXY), save, [
    new RegExp(`^world/active_mods/(length|${before.length})(/.*)?$`),
  ])
})

test('adds an item to an array of strings, and only where the type is known', async ({ page }) => {
  const { group, index, ids } = firstTraitIds(original(GALAXY))
  await openSave(page)
  // The header JSON has no type definitions, so its arrays offer no "Add item".
  await openRaw(page, 'header.gameInfo')
  await openRowActions(page, 'dlcIds')
  await expect(page.getByRole('menuitem', { name: 'Add item', exact: true })).toBeDisabled()
  await page.keyboard.press('Escape')

  await page
    .getByRole('textbox', { name: 'Search the whole save' })
    .fill('templateData.TraitIds[0]')
  await page.getByRole('list', { name: 'Search results' }).getByRole('button').first().click()
  // From an item of the array, "Add item to this array" appends at the end.
  await page.locator('.group.ring-primary').getByRole('button', { name: 'Row actions' }).click()
  await page.getByRole('menuitem', { name: 'Add item to this array' }).click()
  await expect(page.getByRole('textbox', { name: String(ids.length), exact: true })).toHaveValue('')

  const { save } = await downloadSave(page)
  const traits = firstTraitIds(save).ids
  expect(traits).toEqual([...ids, ''])
  const escaped = group.replaceAll(/[.*+?^${}()|[\]\\]/g, '\\$&')
  expectOnlyChanged(original(GALAXY), save, [
    new RegExp(`^objects/${escaped}/${index}/[^/]+/templateData/TraitIds/(length|${ids.length})$`),
  ])
})
