import { readFileSync } from 'node:fs'
import { parseSave, writeSaveParts } from '@oni-duplicity/save-parser'
import { describe, expect, test } from 'vite-plus/test'
import { applyEdit, listDuplicants, objectById } from '../src/worker/model.ts'
import { galaxy, sameBytes } from './helpers.ts'

describe('setAmount guards', () => {
  test('an amount with no known maximum is not clamped and carries a warning', () => {
    const save = parseSave(readFileSync(galaxy))
    const dupe = listDuplicants(save).find((d) => !d.isBionic)!
    const modifiers = objectById(save, dupe.id).behaviors.find((b) => b.name === 'MinionModifiers')!
    const amounts = (
      modifiers.extraData as { amounts: { name: string; value: { value: number } }[] }
    ).amounts
    amounts[0]!.name = 'ModdedAmount'
    const view = () =>
      listDuplicants(save)
        .find((d) => d.id === dupe.id)!
        .amounts.find((a) => a.id === 'ModdedAmount')!
    expect(view().max).toBeUndefined()
    expect(view().warning).toMatch(/not clamped/)
    applyEdit(save, { type: 'setAmount', id: dupe.id, amountId: 'ModdedAmount', value: 5000 })
    expect(view().value).toBe(5000)
  }, 120_000)

  test.each([Number.NaN, Infinity, -Infinity])(
    '%s is rejected and changes nothing',
    (value) => {
      const save = parseSave(readFileSync(galaxy))
      const dupe = listDuplicants(save).find((d) => d.amounts.some((a) => a.id === 'Stress'))!
      const before = writeSaveParts(save).body.slice()
      expect(() =>
        applyEdit(save, { type: 'setAmount', id: dupe.id, amountId: 'Stress', value }),
      ).toThrow(/finite/)
      expect(sameBytes(writeSaveParts(save).body, before)).toBe(true)
    },
    120_000,
  )
})
