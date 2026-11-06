import { describe, expect, it } from 'vite-plus/test'
import { biomeGrid, OUTSIDE, toAsteroids, worldId, type RawMap } from './extract.ts'

describe('worldId', () => {
  it('keeps the last path segment', () => {
    expect(worldId('expansion1::worlds/WaterMoonlet')).toBe('WaterMoonlet')
    expect(worldId('Plain')).toBe('Plain')
  })
})

describe('toAsteroids', () => {
  const map: RawMap = {
    coordinate: 'X',
    failure: null,
    worlds: [
      {
        name: 'expansion1::worlds/Swamp',
        is_starting: true,
        width: 2,
        height: 2,
        world_traits: ['traits/GeoActive'],
        geysers: [{ type: 'steam', x: 1, y: 1 }],
        other_entities: [
          { tag: 'OilWell', x: 0, y: 0 },
          { tag: 'OilFloater', x: 1, y: 0 },
          { tag: 'Oilfloater', x: 1, y: 1 },
        ],
        zone_idx: new Uint16Array([0, 1, 0xffff, 1]),
        zone_table: ['Sandstone', 'Reef'],
      },
    ],
  }

  it('counts oil wells as geysers and skips the critters', () => {
    const [asteroid] = toAsteroids(map)
    expect(asteroid?.id).toBe('Swamp')
    expect(asteroid?.geysers.map((g) => g.type)).toEqual(['steam', 'OilWell'])
  })

  it('draws the biome grid top row first, with the border marked', () => {
    const grid = biomeGrid(map.worlds[0]!)
    expect([grid.columns, grid.rows]).toEqual([2, 2])
    // zone_idx row 0 is the bottom row, so the top row of the grid is [0xffff, 1].
    expect([...grid.cells]).toEqual([OUTSIDE, 1, 0, 1])
  })
})
