import { expect, test } from 'vite-plus/test'
import data from '../src/generated/game-data.json' with { type: 'json' }
import { geyserTypes, resample, unresample } from '../src/index.ts'

test('resample maps rolls 0 and 1 onto the ends of the range', () => {
  const range = { min: 70, max: 140 }
  expect(resample(0, range)).toBeCloseTo(70, 3)
  expect(resample(1, range)).toBeCloseTo(140, 3)
  expect(resample(0.5, range)).toBeCloseTo(105, 6)
})

test('unresample inverts resample and clamps to the range', () => {
  const range = { min: 60, max: 1140 }
  for (const roll of [0, 0.1, 0.37, 0.5, 0.92, 1]) {
    expect(unresample(resample(roll, range), range)).toBeCloseTo(roll, 9)
  }
  expect(unresample(10, range)).toBe(0)
  expect(unresample(5000, range)).toBe(1)
  expect(unresample(600, { min: 600, max: 600 })).toBe(0)
})

test('type ids are unique', () => {
  expect(new Set(geyserTypes.map((t) => t.id)).size).toBe(geyserTypes.length)
})

test('every type has DLCs in the extracted GeyserGenericConfig list', () => {
  const extracted = new Set(data.geyserDlcs.map((g) => g.id))
  for (const type of geyserTypes) expect(extracted.has(type.id), type.id).toBe(true)
  expect(geyserTypes.find((t) => t.id === 'molten_aluminum')?.requiredDlcIds).toEqual([
    'EXPANSION1_ID',
  ])
  expect(geyserTypes.find((t) => t.id === 'murky_brine')?.requiredDlcIds).toEqual(['DLC5_ID'])
  expect(geyserTypes.find((t) => t.id === 'steam')?.requiredDlcIds).toEqual([])
})
