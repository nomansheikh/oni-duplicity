import { describe, expect, it } from 'vite-plus/test'
import type { SeedAsteroid, SeedBiomeGrid } from '@/seed/result'
import { biomeColor } from './biome-colors'
import { countGeysers, geyserMarks, geyserName, markAt } from './geyser-marks'
import { biomeAt, fitScale, gridPixels } from './grid-pixels'

const grid: SeedBiomeGrid = {
  columns: 2,
  rows: 2,
  palette: ['Sandstone', 'Space'],
  cells: new Uint8Array([0, 1, 255, 0]),
}
const asteroid: SeedAsteroid = {
  id: 'Test',
  path: 'worlds/Test',
  isStart: true,
  width: 100,
  height: 50,
  traits: [],
  geysers: [
    { type: 'OilWell', x: 0, y: 0 },
    { type: 'hot_steam', x: 99, y: 49 },
    { type: 'hot_steam', x: 50, y: 25 },
  ],
  biomes: grid,
}

describe('gridPixels', () => {
  it('writes one opaque RGBA pixel per cell using the palette', () => {
    const px = gridPixels(grid)
    expect(px).toHaveLength(16)
    expect([...px.slice(0, 3)]).toEqual(biomeColor('Sandstone'))
    expect([...px.slice(4, 7)]).toEqual(biomeColor('Space'))
    expect(px[3]).toBe(255)
  })

  it('draws a border cell (255) in the border colour, not as palette 0', () => {
    const px = gridPixels(grid)
    expect([...px.slice(8, 11)]).not.toEqual(biomeColor('Sandstone'))
  })
})

describe('fitScale and biomeAt', () => {
  it('floors to a whole scale and never goes below 1', () => {
    expect(fitScale(grid, 7, 9)).toBe(3)
    expect(fitScale(grid, 1, 1)).toBe(1)
  })
  it('finds the biome under a point', () => {
    expect(biomeAt(grid, 1, 1, 20, 20)).toBe('Sandstone')
    expect(biomeAt(grid, 15, 5, 20, 20)).toBe('Space')
    expect(biomeAt(grid, 25, 5, 20, 20)).toBeUndefined()
  })
})

describe('geyser marks', () => {
  it('flips y so the bottom-left cell lands bottom-left', () => {
    const [oil, corner] = geyserMarks(asteroid, 200, 100)
    expect(oil!.px).toBeCloseTo(1)
    expect(oil!.py).toBeCloseTo(99)
    expect(corner!.px).toBeCloseTo(199)
    expect(corner!.py).toBeCloseTo(1)
  })
  it('hits the nearest mark within the radius only', () => {
    const marks = geyserMarks(asteroid, 200, 100)
    expect(markAt(marks, 100, 50, 6)?.geyser.type).toBe('hot_steam')
    expect(markAt(marks, 120, 50, 6)).toBeUndefined()
  })
  it('counts by type, most common first, and names oil', () => {
    expect(countGeysers(asteroid)).toEqual([
      ['hot_steam', 2],
      ['OilWell', 1],
    ])
    expect(geyserName('OilWell')).toBe('Oil Reservoir')
  })
})
