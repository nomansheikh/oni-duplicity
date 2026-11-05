import { readFileSync } from 'node:fs'
import { parseSave, writeSaveParts } from '@oni-duplicity/save-parser'
import { describe, expect, test } from 'vite-plus/test'
import {
  applyEdit,
  duplicantAmountLimit,
  listDuplicants,
  objectById,
  type DuplicantView,
} from '../src/worker/model.ts'
import { applyWithRestore } from '../src/worker/snapshot.ts'
import { fixtures, galaxy, sameBytes } from './helpers.ts'

describe('duplicantAmountLimit', () => {
  test.each([
    ['Stress', 0, 100],
    ['Stamina', 0, 100],
    ['Bladder', 0, 100],
    ['ImmuneLevel', 0, 100],
    ['Toxicity', 0, 100],
    ['HitPoints', 0, 100],
    ['Breath', 0, 100],
    ['Calories', 0, 4_000_000],
    ['RadiationBalance', 0, 10_000],
    ['Decor', -1000, 1000],
    ['Temperature', 0, 10_000],
  ])('%s is %i..%i for a standard duplicant', (id, min, max) => {
    expect(duplicantAmountLimit(id, false, [], [])).toEqual({ min, max })
  })

  test('breath grows with the Minnow trait and the Swimming skill', () => {
    expect(duplicantAmountLimit('Breath', false, ['Minnow'], [])!.max).toBe(500)
    expect(duplicantAmountLimit('Breath', false, [], ['Swimming'])!.max).toBe(200)
    expect(duplicantAmountLimit('Breath', false, ['Minnow'], ['Swimming'])!.max).toBe(600)
    expect(duplicantAmountLimit('Stress', false, ['Minnow'], ['Swimming'])!.max).toBe(100)
  })

  test('a bionic has no calories and keeps its own maximums', () => {
    expect(duplicantAmountLimit('Calories', true, [], [])).toBeUndefined()
    expect(duplicantAmountLimit('BionicOil', true, [], [])).toEqual({ min: 0, max: 200 })
    expect(duplicantAmountLimit('Stress', true, [], [])).toEqual({ min: 0, max: 100 })
  })

  test('an unknown amount has no limit', () => {
    expect(duplicantAmountLimit('Modded', false, [], [])).toBeUndefined()
  })
})

describe('standard duplicant amounts in the Galaxy save', () => {
  const load = () => parseSave(readFileSync(galaxy))
  const standard = (save: ReturnType<typeof load>) =>
    listDuplicants(save).filter((d) => !d.isBionic)
  const amount = (d: DuplicantView, id: string) => d.amounts.find((a) => a.id === id)!

  test('every amount the game knows carries its maximum, and saved values sit inside it', () => {
    for (const d of listDuplicants(load())) {
      for (const a of d.amounts) {
        if (a.max === undefined) continue
        expect(a.value).toBeGreaterThanOrEqual(a.min ?? 0)
        expect(a.value).toBeLessThanOrEqual(a.max + 1e-3)
      }
    }
  }, 120_000)

  test('setAmount clamps to the range, and undo is byte-identical', () => {
    const save = load()
    const dupe = standard(save).find((d) => amount(d, 'Stress') && amount(d, 'Calories'))!
    const before = writeSaveParts(save).body.slice()
    const view = () => standard(save).find((d) => d.id === dupe.id)!
    const undoHigh = applyWithRestore(save, {
      type: 'setAmount',
      id: dupe.id,
      amountId: 'Stress',
      value: 9999,
    })
    expect(amount(view(), 'Stress').value).toBe(100)
    const undoCalories = applyWithRestore(save, {
      type: 'setAmount',
      id: dupe.id,
      amountId: 'Calories',
      value: 99_000_000,
    })
    expect(amount(view(), 'Calories').value).toBe(4_000_000)
    applyEdit(save, { type: 'setAmount', id: dupe.id, amountId: 'Stress', value: -50 })
    expect(amount(view(), 'Stress').value).toBe(0)
    undoCalories()
    undoHigh()
    // The low edit above was not undone separately, so restore it via the first snapshot.
    expect(sameBytes(writeSaveParts(save).body, before)).toBe(true)
  }, 120_000)

  test('losing Minnow lowers breath to the new maximum and undo restores it', () => {
    const save = load()
    const dupe = standard(save).find((d) => amount(d, 'Breath').max === 100)!
    const obj = objectById(save, dupe.id)
    const traits = obj.behaviors.find((b) => b.name === 'Klei.AI.Traits')!.templateData!
    const ids = traits.TraitIds as string[]
    traits.TraitIds = [...ids, 'Minnow']
    const view = () => standard(save).find((d) => d.id === dupe.id)!
    expect(amount(view(), 'Breath').max).toBe(500)
    applyEdit(save, { type: 'setAmount', id: dupe.id, amountId: 'Breath', value: 450 })
    expect(amount(view(), 'Breath').value).toBe(450)

    const before = writeSaveParts(save).body.slice()
    const undo = applyWithRestore(save, { type: 'removeTrait', id: dupe.id, traitId: 'Minnow' })
    expect(amount(view(), 'Breath').max).toBe(100)
    expect(amount(view(), 'Breath').value).toBe(100)
    undo()
    expect(amount(view(), 'Breath').value).toBe(450)
    expect(sameBytes(writeSaveParts(save).body, before)).toBe(true)
  }, 120_000)

  test("fill needs tops up breath to a Minnow duplicant's own maximum", () => {
    const save = load()
    const dupe = standard(save).find((d) => amount(d, 'Breath').max === 100)!
    const obj = objectById(save, dupe.id)
    const traits = obj.behaviors.find((b) => b.name === 'Klei.AI.Traits')!.templateData!
    traits.TraitIds = [...(traits.TraitIds as string[]), 'Minnow']
    const view = () => standard(save).find((d) => d.id === dupe.id)!
    applyEdit(save, { type: 'setAmount', id: dupe.id, amountId: 'Breath', value: 30 })
    const before = writeSaveParts(save).body.slice()
    const undo = applyWithRestore(save, { type: 'bulkDuplicants', action: 'fillNeeds' })
    expect(amount(view(), 'Breath').value).toBe(500)
    undo()
    expect(sameBytes(writeSaveParts(save).body, before)).toBe(true)
    // A value already above the old flat 100 is never lowered.
    applyEdit(save, { type: 'setAmount', id: dupe.id, amountId: 'Breath', value: 450 })
    applyEdit(save, { type: 'bulkDuplicants', action: 'fillNeeds' })
    expect(amount(view(), 'Breath').value).toBe(500)
  }, 120_000)

  test('a non-finite value is rejected and changes nothing', () => {
    const save = load()
    const dupe = standard(save)[0]!
    const before = writeSaveParts(save).body.slice()
    for (const value of [Number.NaN, Infinity, -Infinity]) {
      expect(() =>
        applyEdit(save, { type: 'setAmount', id: dupe.id, amountId: 'Stress', value }),
      ).toThrow(/finite/)
    }
    expect(sameBytes(writeSaveParts(save).body, before)).toBe(true)
  }, 120_000)
})

// Every fixture's saved amounts must sit inside the derived maximums, which is the check that the
// derivation is not too low. Small saves always; the rest with FIXTURE_TIER=all.
const all = process.env.FIXTURE_TIER === 'all'
describe.each(fixtures.filter((f) => all || !/\/fetched\//.test(f)))(
  'saved amounts in %s',
  (file) => {
    test('stay within the derived range', () => {
      const outside: string[] = []
      for (const d of listDuplicants(parseSave(readFileSync(file)))) {
        for (const a of d.amounts) {
          if (a.max === undefined) continue
          // Float32 storage and the game's own rounding: allow a hair.
          if (a.value > a.max * 1.0001 + 1e-3 || a.value < (a.min ?? 0) - 1e-3) {
            outside.push(`${d.name} ${a.id}=${a.value} max=${a.max}`)
          }
        }
      }
      expect(outside).toEqual([])
    }, 300_000)
  },
)
