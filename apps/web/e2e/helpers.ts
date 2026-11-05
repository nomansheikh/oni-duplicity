import { existsSync, readFileSync } from 'node:fs'
import { fileURLToPath } from 'node:url'
import { expect, type Page } from '@playwright/test'
import { parseSave, type SaveGame } from '@oni-duplicity/save-parser'

const testData = fileURLToPath(new URL('../../../test-data/', import.meta.url))
const manifest = JSON.parse(readFileSync(`${testData}fixtures.json`, 'utf8')) as {
  fixtures: { file: string; committed: boolean }[]
}

/** Absolute path of a fixture, committed or fetched. */
export function fixturePath(file: string): string {
  const entry = manifest.fixtures.find((f) => f.file === file)
  if (!entry) throw new Error(`${file} is not in fixtures.json`)
  return `${testData}${entry.committed ? 'saves' : 'fetched'}/${file}`
}

export const hasFixture = (file: string) => existsSync(fixturePath(file))

/** The colony most tests edit: 7.38, every DLC, nine duplicants, geysers and critters. */
export const GALAXY = 'beautiful-galaxy.sav'

const parsed = new Map<string, SaveGame>()

/** The fixture as the parser reads it, for comparing against a download. */
export function original(file: string): SaveGame {
  let save = parsed.get(file)
  if (!save) {
    save = parseSave(readFileSync(fixturePath(file)))
    parsed.set(file, save)
  }
  return save
}

/** Opens the app and loads a fixture through the file picker. */
export async function openSave(page: Page, file: string = GALAXY): Promise<void> {
  await page.goto('/')
  await page.locator('input[type=file]').setInputFiles(fixturePath(file))
  await expect(page.getByRole('button', { name: 'Download save' })).toBeEnabled({
    timeout: 60_000,
  })
}

/** Opens a page from the top tab strip, e.g. `Geysers` or `Raw data`. */
export async function goTo(page: Page, title: string): Promise<void> {
  await page.getByRole('tab', { name: title }).first().click()
}

/** The number of unsaved edits shown in the header (0 when the button is hidden). */
export async function editCount(page: Page): Promise<number> {
  const button = page.getByRole('button', { name: /unsaved edits?$/ })
  if (!(await button.isVisible())) return 0
  return Number((await button.textContent())?.match(/\d+/)?.[0] ?? 0)
}

/** Opens the pre-save dialog and confirms it. */
async function confirmDownload(page: Page): Promise<void> {
  await page.getByRole('button', { name: 'Download save' }).click()
  await page.getByRole('button', { name: 'Confirm download' }).click()
}

/** Downloads the edited save and parses it with the repo's own parser. */
export async function downloadSave(page: Page): Promise<{ save: SaveGame; fileName: string }> {
  const [download] = await Promise.all([
    page.waitForEvent('download', { timeout: 90_000 }),
    confirmDownload(page),
  ])
  const path = await download.path()
  return { save: parseSave(readFileSync(path)), fileName: download.suggestedFilename() }
}

// --- Diffing ---------------------------------------------------------------

/**
 * Every leaf that differs between two saves, as readable paths such as
 * `objects/Minion/0/MinionIdentity/templateData/name` or `header/gameInfo/baseName`.
 * Arrays of different lengths report their `length` and every added or removed index
 * (`path/<i>`), so a test expecting a length change must also account for the items.
 */
export function diffSaves(before: SaveGame, after: SaveGame): string[] {
  const out: string[] = []
  diff(before.header, after.header, 'header', out)
  diff(before.templates, after.templates, 'templates', out)
  diff(before.world, after.world, 'world', out)
  diff(before.settings, after.settings, 'settings', out)
  diff(before.gameData, after.gameData, 'gameData', out)
  diff(before.simData, after.simData, 'simData', out)
  diff(groups(before), groups(after), 'objects', out)
  return out
}

/** Game objects keyed by prefab, with behaviors keyed by name (`Storage#1` for repeats). */
function groups(save: SaveGame): Record<string, unknown> {
  const out: Record<string, unknown> = {}
  for (const group of save.gameObjects) {
    out[group.name] = group.gameObjects.map((obj) => {
      const behaviors: Record<string, unknown> = {}
      for (const b of obj.behaviors) {
        let key = b.name
        for (let n = 1; key in behaviors; n++) key = `${b.name}#${n}`
        behaviors[key] = b
      }
      return { position: obj.position, rotation: obj.rotation, scale: obj.scale, ...behaviors }
    })
  }
  return out
}

function diff(a: unknown, b: unknown, path: string, out: string[]): void {
  if (Object.is(a, b)) return
  if (a instanceof Uint8Array && b instanceof Uint8Array) {
    if (a.length !== b.length || a.some((v, i) => v !== b[i])) out.push(path)
    return
  }
  if (Array.isArray(a) && Array.isArray(b)) {
    if (a.length !== b.length) {
      out.push(`${path}/length`)
      for (let i = Math.min(a.length, b.length); i < Math.max(a.length, b.length); i++) {
        out.push(`${path}/${i}`)
      }
    }
    for (let i = 0; i < Math.min(a.length, b.length); i++) diff(a[i], b[i], `${path}/${i}`, out)
    return
  }
  if (a && b && typeof a === 'object' && typeof b === 'object') {
    const keys = new Set([...Object.keys(a), ...Object.keys(b)])
    for (const key of keys) {
      diff(
        (a as Record<string, unknown>)[key],
        (b as Record<string, unknown>)[key],
        `${path}/${key}`,
        out,
      )
    }
    return
  }
  out.push(path)
}

/**
 * Asserts that the download differs from the fixture exactly where expected: every changed
 * path matches one of `expected`, and every pattern matches at least one changed path.
 */
export function expectOnlyChanged(before: SaveGame, after: SaveGame, expected: RegExp[]): void {
  const changed = diffSaves(before, after)
  const unexpected = changed.filter((path) => !expected.some((re) => re.test(path)))
  const missing = expected.filter((re) => !changed.some((path) => re.test(path)))
  expect(unexpected, 'changed but not expected').toEqual([])
  expect(
    missing.map((re) => re.source),
    'expected but unchanged',
  ).toEqual([])
}

// --- Lookups ---------------------------------------------------------------

export function group(save: SaveGame, prefab: string) {
  return save.gameObjects.find((g) => g.name === prefab)?.gameObjects ?? []
}

export function behavior(
  obj: SaveGame['gameObjects'][number]['gameObjects'][number],
  name: string,
) {
  return obj.behaviors.find((b) => b.name === name)
}
