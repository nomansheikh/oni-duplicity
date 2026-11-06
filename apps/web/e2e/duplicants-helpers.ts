import { expect, type Page } from '@playwright/test'
import { behavior, group, original } from './helpers.ts'

export const MITHRO = 'mithro-06-maximum-cycle-4770.sav'

export type Amount = { name: string; value: { value: number } }
export type Level = { attributeId: string; level: number }
export type Effect = { id: string; timeRemaining: number; saved?: boolean }

/** Duplicant `index` of a prefab group in the untouched fixture, with its decoded behaviors. */
export function fixtureDupe(file: string, prefab: string, index: number) {
  const obj = group(original(file), prefab)[index]!
  const data = (name: string) => behavior(obj, name)!.templateData!
  return {
    traitIds: data('Klei.AI.Traits').TraitIds as string[],
    levels: data('Klei.AI.AttributeLevels').saveLoadLevels as Level[],
    effects: data('Klei.AI.Effects').saveLoadEffects as Effect[],
    mastery: data('MinionResume').MasteryBySkillID as [string, boolean][],
    amounts: (behavior(obj, 'MinionModifiers')!.extraData as { amounts: Amount[] }).amounts,
  }
}

/** The position of a named entry, failing loudly when the fixture does not have it. */
export function indexOf<T>(list: T[], match: (item: T) => boolean): number {
  const index = list.findIndex(match)
  expect(index, 'fixture entry').toBeGreaterThanOrEqual(0)
  return index
}

/** Picks a duplicant in the list on the left of the Duplicants page. */
export async function pick(page: Page, name: string): Promise<void> {
  await page
    .locator('button')
    .filter({ has: page.getByText(name, { exact: true }) })
    .click()
  await expect(page.getByLabel('Name', { exact: true })).toHaveValue(name)
}

/** Opens a SearchPicker (`Add trait`, `Add effect`) and chooses the entry by its game id. */
export async function addFromPicker(page: Page, button: string, id: string): Promise<void> {
  await page.getByRole('button', { name: button }).click()
  await page.locator('[cmdk-input]').fill(id)
  await page.getByRole('option').first().click()
}

/** Types into a number input and commits it with Enter. */
export async function setNumber(page: Page, label: string, value: number): Promise<void> {
  const input = page.getByRole('spinbutton', { name: label, exact: true })
  await input.fill(String(value))
  await input.press('Enter')
}

export const path = (prefab: string, index: number, behaviorName: string, rest: string) =>
  `^objects/${prefab}/${index}/${behaviorName.replace(/\./g, '\\.')}/${rest}$`
