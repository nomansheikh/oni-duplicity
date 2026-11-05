import { existsSync, readFileSync } from 'node:fs'
import { fileURLToPath } from 'node:url'
import { parseSave, writeSave, writeSaveParts, type SaveGame } from '@oni-duplicity/save-parser'
import { expect, test } from 'vite-plus/test'
import { applyEdit, listGeysers, objectById } from '../src/worker/model.ts'

const testData = fileURLToPath(new URL('../../../test-data/', import.meta.url))
const manifest = (
  JSON.parse(readFileSync(`${testData}fixtures.json`, 'utf8')) as {
    fixtures: { file: string; committed: boolean }[]
  }
).fixtures
const fixtures = manifest
  .map((f) => `${testData}${f.committed ? 'saves' : 'fetched'}/${f.file}`)
  .filter((path) => existsSync(path))

const galaxy = `${testData}saves/beautiful-galaxy.sav`

function config(save: SaveGame, id: string): Record<string, number> {
  const geyser = objectById(save, id).behaviors.find((b) => b.name === 'Geyser')!
  return geyser.templateData!.configuration as Record<string, number>
}

/** Positions where two byte arrays differ. */
function diff(a: Uint8Array, b: Uint8Array): number[] {
  expect(a.length).toBe(b.length)
  const at: number[] = []
  for (let i = 0; i < a.length; i++) if (a[i] !== b[i]) at.push(i)
  return at
}

// Every geyser the game rolled itself saves the values its rolls give, so this checks the
// transcribed ranges. A mismatch means a wrong range, or a geyser changed outside the game.
test('the type ranges reproduce the saved values of every fixture geyser', () => {
  let matched = 0
  const mismatched: string[] = []
  for (const path of fixtures) {
    for (const g of listGeysers(parseSave(readFileSync(path)))) {
      expect(g.ranges, `${g.prefab} in ${path}`).toBeDefined()
      if (g.matchesRolls) matched++
      else mismatched.push(`${path.split('/').pop()}: ${g.prefab}`)
    }
  }
  // The committed saves alone hold few geysers; the fetched ones bring the count well past 20.
  const fetchedPresent = fixtures.length > manifest.filter((f) => f.committed).length
  expect(matched).toBeGreaterThan(fetchedPresent ? 20 : 5)
  // The owner's colony has four geysers at their type maximums whatever their rolls; the same
  // colony is committed twice.
  expect(
    mismatched.every((m) => m.startsWith('beautiful-galaxy')),
    mismatched.join('\n'),
  ).toBe(true)
  expect(mismatched).toHaveLength(8)
}, 300_000)

test('an edit sets the roll and the value it gives, and nothing else', () => {
  const save = parseSave(readFileSync(galaxy))
  const before = writeSaveParts(save).body.slice()
  const geyser = listGeysers(save).find((g) => g.matchesRolls && g.ranges)!
  const range = geyser.ranges!.scaledRate
  const wanted = range.min + (range.max - range.min) * 0.7

  applyEdit(save, { type: 'setGeyserValue', id: geyser.id, field: 'scaledRate', value: wanted })

  const edited = config(save, geyser.id)
  expect(edited.scaledRate).toBeCloseTo(wanted, 1)
  expect(listGeysers(save).find((g) => g.id === geyser.id)!.matchesRolls).toBe(true)
  // Two single-precision floats: the roll and the value.
  expect(diff(before, writeSaveParts(save).body).length).toBeLessThanOrEqual(8)

  const reparsed = config(parseSave(writeSave(save)), geyser.id)
  expect(reparsed.rateRoll).toBe(edited.rateRoll)
  expect(reparsed.scaledRate).toBe(edited.scaledRate)
})

test('values outside the type range are clamped to it', () => {
  const save = parseSave(readFileSync(galaxy))
  const geyser = listGeysers(save).find((g) => g.ranges)!
  const { min, max } = geyser.ranges!.scaledIterationPercent

  applyEdit(save, {
    type: 'setGeyserValue',
    id: geyser.id,
    field: 'scaledIterationPercent',
    value: 5,
  })
  expect(config(save, geyser.id).iterationPercentRoll).toBe(1)
  expect(config(save, geyser.id).scaledIterationPercent).toBeCloseTo(max, 3)

  applyEdit(save, {
    type: 'setGeyserValue',
    id: geyser.id,
    field: 'scaledIterationPercent',
    value: 0,
  })
  expect(config(save, geyser.id).iterationPercentRoll).toBe(0)
  expect(config(save, geyser.id).scaledIterationPercent).toBeCloseTo(min, 3)
})

test('rejects values that are not numbers', () => {
  const save = parseSave(readFileSync(galaxy))
  const id = listGeysers(save)[0]!.id
  expect(() =>
    applyEdit(save, { type: 'setGeyserValue', id, field: 'scaledRate', value: Number.NaN }),
  ).toThrow(/number/)
})
