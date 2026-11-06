import { describe, expect, it } from 'vite-plus/test'
import { describeMap, detailBuffers, geyserRoll } from './extract-detail.ts'
import { geyserStats } from './geyser-stats.ts'
import type { RawDetailMap, RawDetailWorld } from './raw.ts'

function world(overrides: Partial<RawDetailWorld> = {}): RawDetailWorld {
  return {
    name: 'expansion1::worlds/Swamp',
    is_starting: true,
    width: 2,
    height: 2,
    world_traits: ['traits/GeoActive'],
    element_idx: new Uint16Array([0, 1, 1, 0]),
    mass: new Float32Array([1, 2, 3, 4]),
    temperature: new Float32Array([290, 300, 310, 320]),
    zone_idx: new Uint16Array([0, 0, 0xffff, 1]),
    zone_table: ['Sandstone', 'Reef'],
    geysers: [
      {
        type: 'salt_water',
        x: 1,
        y: 0,
        scaled_rate: 3000,
        scaled_iter_len: 600,
        scaled_iter_pct: 0.5,
        scaled_year_len: 60000,
        scaled_year_pct: 0.6,
      },
      { type: 'steam', x: 0, y: 1 },
    ],
    buildings: [
      { tag: 'Headquarters', x: 0, y: 0 },
      { tag: 'Wire', x: 1, y: 1 },
      { tag: 'GeneShuffler', x: 1, y: 1 },
    ],
    other_entities: [
      { tag: 'OilWell', x: 0, y: 1 },
      { tag: 'Oilfloater', x: 1, y: 1 },
      { tag: 'SeaLettuce', x: 1, y: 1 },
    ],
    ...overrides,
  }
}

function map(overrides: Partial<RawDetailMap> = {}): RawDetailMap {
  return {
    coordinate: 'SWMP-C-1-0-0-0',
    element_table: ['Vacuum', 'Oxygen'],
    starmap: [],
    starmap_pois: [],
    vanilla_starmap: [{ type: 'Satellite', distance: 1 }],
    worlds: [world()],
    failure: null,
    ...overrides,
  }
}

describe('geyserRoll', () => {
  it('maps the scaled fields onto the geyser maths names', () => {
    expect(geyserRoll(map().worlds[0]!.geysers[0]!)).toEqual({
      massPerCycle: 3000,
      iterationSeconds: 600,
      iterationPercent: 0.5,
      yearSeconds: 60000,
      yearPercent: 0.6,
    })
  })

  it('is absent unless every field was rolled', () => {
    expect(geyserRoll({ type: 'steam', x: 0, y: 0, scaled_rate: 1 })).toBeUndefined()
  })
})

describe('describeMap', () => {
  const detail = describeMap(map(), '737195')
  const [asteroid] = detail.asteroids

  it('keeps the full cell grids and the id of the asteroid', () => {
    expect(asteroid?.id).toBe('Swamp')
    expect(asteroid?.isStart).toBe(true)
    expect([...asteroid!.cells.mass]).toEqual([1, 2, 3, 4])
    expect([...asteroid!.cells.zone]).toEqual([0, 0, 0xffff, 1])
    expect(detail.elements).toEqual(['Vacuum', 'Oxygen'])
    expect(detail.engineBuild).toBe('737195')
  })

  it('marks geysers, the oil reservoir and notable placements only', () => {
    expect(asteroid?.markers.map((m) => [m.kind, m.tag])).toEqual([
      ['geyser', 'salt_water'],
      ['geyser', 'steam'],
      ['notable', 'Headquarters'],
      ['gravitas', 'GeneShuffler'],
      ['oil', 'OilWell'],
    ])
  })

  it('keeps a geyser without a roll, with no stats', () => {
    expect(asteroid?.geysers[1]).toEqual({ type: 'steam', x: 0, y: 1 })
  })

  it('lists the vanilla destinations of a base-game seed, which also has one hex entry', () => {
    const base = describeMap(map({ starmap: [{ world_index: 0, q: 0, r: 0 }] }), '1')
    expect(base.starmap).toEqual({
      kind: 'base',
      destinations: [{ type: 'Satellite', distance: 1 }],
    })
  })

  it('places each asteroid and POI on the hex starmap', () => {
    const spaced = describeMap(
      map({
        vanilla_starmap: [],
        starmap: [{ world_index: 0, q: 2, r: -1 }],
        starmap_pois: [
          { poi_type: 'TemporalTear', q: -3, r: 1 },
          {
            poi_type: 'HarvestableSpacePOI_HeliumCloud',
            q: 1,
            r: 1,
            total_capacity: 5,
            recharge_time: 9,
          },
        ],
      }),
      '1',
    )
    expect(spaced.starmap).toEqual({
      kind: 'spaced-out',
      asteroids: [{ id: 'Swamp', q: 2, r: -1 }],
      pois: [
        { type: 'TemporalTear', q: -3, r: 1 },
        { type: 'HarvestableSpacePOI_HeliumCloud', q: 1, r: 1, capacity: 5, recharge: 9 },
      ],
    })
  })

  it('lists every grid buffer for transfer', () => {
    expect(detailBuffers(detail)).toHaveLength(4)
  })
})

describe('geyserStats', () => {
  const [salt, steam] = describeMap(map(), '1').asteroids[0]!.geysers

  it('uses the calculator maths on the rolls', () => {
    const stats = geyserStats(salt!)!
    // 3000 kg a cycle over the erupting half of 600 s: 10 kg/s while it erupts.
    expect(stats.peakKgPerSecond).toBeCloseTo(10)
    // 3000 kg a cycle, active 60% of the time, over 600 s a cycle: 3 kg/s.
    expect(stats.averageKgPerSecond).toBeCloseTo(3)
    expect(stats.averageKgPerCycle).toBeCloseTo(1800)
    expect(stats.eruptionSeconds).toBeCloseTo(300)
    expect(stats.eruptionPeriodSeconds).toBe(600)
    // 60000 s is 100 cycles: 60 active, 40 dormant.
    expect(stats.activeCycles).toBeCloseTo(60)
    expect(stats.dormantCycles).toBeCloseTo(40)
    expect(stats.element).toBe('SaltWater')
    expect(stats.outputTemperatureK).toBe(368.15)
  })

  it('has no stats without a roll', () => {
    expect(geyserStats(steam!)).toBeUndefined()
  })
})
