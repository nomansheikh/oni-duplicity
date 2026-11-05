import { existsSync, readFileSync } from 'node:fs'
import { fileURLToPath } from 'node:url'
import { parseSave, writeSave, writeSaveParts } from '@oni-duplicity/save-parser'
import { describe, expect, test } from 'vite-plus/test'
import { applyEdit, bionicAmountMax, listDuplicants } from '../src/worker/model.ts'

describe('bionicAmountMax', () => {
  test('uses the game constants for the fixed amounts', () => {
    expect(bionicAmountMax('BionicOil', [])).toBe(200)
    expect(bionicAmountMax('BionicGunk', [])).toBe(80)
    expect(bionicAmountMax('BionicOxygenTank', [])).toBe(240)
  })

  test('battery is 480,000 J, plus 240,000 J with the BionicsC3 skill', () => {
    expect(bionicAmountMax('BionicInternalBattery', [])).toBe(480_000)
    expect(bionicAmountMax('BionicInternalBattery', ['BionicsA1', 'BionicsC2'])).toBe(480_000)
    expect(bionicAmountMax('BionicInternalBattery', ['BionicsC3'])).toBe(720_000)
  })

  test('other amounts have no bionic cap', () => {
    expect(bionicAmountMax('Stress', ['BionicsC3'])).toBeUndefined()
  })
})

const testData = fileURLToPath(new URL('../../../test-data/', import.meta.url))
const MITHRO = `${testData}fetched/mithro-06-maximum-cycle-4770.sav`
const AMOUNTS = ['BionicOil', 'BionicGunk', 'BionicOxygenTank', 'BionicInternalBattery']

// The 40 MB save is only fetched by the full tier; there a missing fixture is a failure.
const required = Boolean(process.env.CI) && process.env.FIXTURE_TIER === 'all'
const maybe = required || existsSync(MITHRO) ? describe : describe.skip

maybe('bionic amounts in mithro-06', () => {
  const bytes = () => readFileSync(MITHRO)

  test('the view carries each duplicant maximums', () => {
    const bionic = listDuplicants(parseSave(bytes())).filter((d) => d.isBionic)
    expect(bionic).toHaveLength(3)
    for (const d of bionic) {
      const max = Object.fromEntries(d.amounts.map((a) => [a.id, a.max]))
      // All three have mastered BionicsC3.
      expect(max).toMatchObject({
        BionicOil: 200,
        BionicGunk: 80,
        BionicOxygenTank: 240,
        BionicInternalBattery: 720_000,
      })
      // The saved values sit inside the real maximums.
      for (const a of d.amounts.filter((a) => AMOUNTS.includes(a.id))) {
        expect(a.value).toBeLessThanOrEqual(a.max!)
      }
    }
  }, 120_000)

  test.each(AMOUNTS)(
    'setting %s to its maximum writes only that value',
    (amountId) => {
      const before = parseSave(bytes())
      const original = writeSaveParts(before).body.slice()
      const save = parseSave(bytes())
      const dupe = listDuplicants(save).find((d) => d.isBionic)!
      const max = dupe.amounts.find((a) => a.id === amountId)!.max!
      applyEdit(save, { type: 'setAmount', id: dupe.id, amountId, value: max })
      const edited = writeSaveParts(save).body
      expect(edited.length).toBe(original.length)
      let changed = 0
      for (let i = 0; i < edited.length; i++) if (edited[i] !== original[i]) changed++
      // A float32 changes at most its four bytes.
      expect(changed).toBeGreaterThan(0)
      expect(changed).toBeLessThanOrEqual(4)
      const again = listDuplicants(parseSave(writeSave(save))).find((d) => d.id === dupe.id)!
      expect(again.amounts.find((a) => a.id === amountId)!.value).toBeCloseTo(max, 0)
    },
    300_000,
  )

  test.each(AMOUNTS)(
    '%s is clamped to the maximum and to zero',
    (amountId) => {
      const save = parseSave(bytes())
      const dupe = listDuplicants(save).find((d) => d.isBionic)!
      const max = dupe.amounts.find((a) => a.id === amountId)!.max!
      const value = () =>
        listDuplicants(save)
          .find((d) => d.id === dupe.id)!
          .amounts.find((a) => a.id === amountId)!.value
      applyEdit(save, { type: 'setAmount', id: dupe.id, amountId, value: max * 10 })
      expect(value()).toBe(max)
      applyEdit(save, { type: 'setAmount', id: dupe.id, amountId, value: -5 })
      expect(value()).toBe(0)
    },
    300_000,
  )
})
