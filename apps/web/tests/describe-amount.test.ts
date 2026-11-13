import { readFileSync } from 'node:fs'
import { parseSave } from '@oni-duplicity/save-parser'
import { expect, test } from 'vite-plus/test'
import { describeEdit } from '../src/worker/describe.ts'
import { listCritters, listDuplicants } from '../src/worker/model.ts'
import { galaxy } from './helpers.ts'

const save = parseSave(readFileSync(galaxy).buffer as ArrayBuffer)
const duplicant = listDuplicants(save)[0]!
const critter = listCritters(save).find((c) =>
  c.amounts.some((a) => a.id === 'CritterTemperature'),
)!

test.each([
  ['ImmuneLevel', 91, 'Immune Level to 91 %'],
  ['Calories', 3_025_000, 'Calories to 3,025 kcal'],
  ['Bladder', 17.4, 'Bladder to 17 %'],
])('a duplicant %s edit reads in the editor units', (amountId, value, label) => {
  const edit = { type: 'setAmount', id: duplicant.id, amountId, value } as const
  expect(describeEdit(save, edit)).toBe(`${duplicant.name}: ${label}`)
})

test('a critter temperature edit names the amount and reads in °C', () => {
  const edit = {
    type: 'setAmount',
    id: critter.id,
    amountId: 'CritterTemperature',
    value: 345.45,
  } as const
  expect(describeEdit(save, edit)).toBe(`${critter.name}: Body Temperature to 72.3 °C`)
})
