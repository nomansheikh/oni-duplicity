import { existsSync, readFileSync } from 'node:fs'
import { fileURLToPath } from 'node:url'
import { expect, test } from 'vite-plus/test'
import { ParseError, parseSave, readSimGrid } from '../src/index.ts'

const saves = fileURLToPath(new URL('../../../test-data/saves/', import.meta.url))

test('reads the grid size, elements, temperatures and masses', () => {
  const save = parseSave(readFileSync(`${saves}beautiful-galaxy.sav`))
  const grid = readSimGrid(save.simData)
  expect([grid.version, grid.width, grid.height]).toEqual([15, 738, 306])
  // Grid cell (80, 150), game cell (79, 149): oxygen at about 39 °C.
  const i = 150 * grid.width + 80
  expect(grid.element[i]).toBe(-1528777920)
  expect(grid.temperature[i]).toBeCloseTo(312.475, 2)
  expect(grid.mass[i]).toBeCloseTo(0.76, 2)
  expect(grid.temperature.every((t) => Number.isFinite(t) && t >= 0)).toBe(true)
  expect(grid.mass.every((m) => Number.isFinite(m) && m >= 0)).toBe(true)
})

test.skipIf(!existsSync(`${saves}apple-park.sav`))('reads every committed save', () => {
  for (const file of ['apple-park.sav', 'beautiful-galaxy-build-744825.sav']) {
    const grid = readSimGrid(parseSave(readFileSync(`${saves}${file}`)).simData)
    expect(grid.element.length).toBe(grid.width * grid.height)
  }
})

test('rejects sim data that is not a grid', () => {
  expect(() => readSimGrid(new Uint8Array(40))).toThrow(ParseError)
  const truncated = new Uint8Array(40)
  truncated.set(new TextEncoder().encode('SIMSAVE\0'))
  new DataView(truncated.buffer).setInt32(12, 100, true)
  new DataView(truncated.buffer).setInt32(16, 100, true)
  expect(() => readSimGrid(truncated)).toThrow(/does not fit/)
})
