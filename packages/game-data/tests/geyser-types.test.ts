import { expect, test } from 'vite-plus/test'
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
