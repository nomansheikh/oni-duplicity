import { describe, expect, it } from 'vite-plus/test'
import { SEED_PRESETS } from './presets.ts'
import { TopList } from './rank.ts'
import type { SeedAsteroid, SeedResult } from './result.ts'
import type { SeedRule } from './rules.ts'
import { evaluate } from './score.ts'
import { geyserTypes } from '@oni-duplicity/game-data'

const grid = { columns: 0, rows: 0, palette: [], cells: new Uint8Array() }
const world = (
  id: string,
  isStart: boolean,
  traits: string[],
  geysers: string[],
): SeedAsteroid => ({
  id,
  path: `worlds/${id}`,
  isStart,
  width: 1,
  height: 1,
  traits,
  geysers: geysers.map((type) => ({ type, x: 0, y: 0 })),
  biomes: grid,
})

const cluster = [
  world('Start', true, ['traits/MetalRich'], ['hot_water', 'steam']),
  world('Moon', false, ['traits/GeoActive'], ['hot_water', 'molten_iron', 'OilWell']),
]

const geyserRule = (over: Partial<Extract<SeedRule, { kind: 'geyser' }>> = {}): SeedRule => ({
  id: 'g',
  kind: 'geyser',
  geyser: 'hot_water',
  scope: { kind: 'anywhere' },
  min: 1,
  mode: 'must',
  weight: 1,
  ...over,
})

describe('evaluate', () => {
  it('drops a seed that misses a must rule', () => {
    expect(evaluate([geyserRule({ min: 3 })], cluster).passed).toBe(false)
  })

  it('counts geysers per scope', () => {
    const start = evaluate([geyserRule({ scope: { kind: 'start' }, min: 2 })], cluster)
    expect(start.passed).toBe(false)
    expect(evaluate([geyserRule({ min: 2 })], cluster).passed).toBe(true)
    const moon = { kind: 'asteroid', asteroid: 'Moon' } as const
    expect(evaluate([geyserRule({ scope: moon, geyser: 'OilWell' })], cluster).passed).toBe(true)
    expect(evaluate([geyserRule({ scope: moon, geyser: 'steam' })], cluster).passed).toBe(false)
  })

  it('respects max, including none', () => {
    expect(evaluate([geyserRule({ geyser: 'steam', min: 0, max: 0 })], cluster).passed).toBe(false)
    expect(evaluate([geyserRule({ geyser: 'slush_water', min: 0, max: 0 })], cluster).passed).toBe(
      true,
    )
  })

  it('adds the weight of matched nice rules and lists the missed ones', () => {
    const rules: SeedRule[] = [
      geyserRule({ id: 'a', mode: 'nice', weight: 5 }),
      geyserRule({ id: 'b', mode: 'nice', weight: 2, geyser: 'slush_water' }),
      geyserRule({ id: 'c', mode: 'must' }),
    ]
    expect(evaluate(rules, cluster)).toEqual({
      passed: true,
      score: 5,
      maxScore: 7,
      matched: ['a', 'c'],
      missed: ['b'],
    })
  })

  it('handles trait has/lacks across scopes', () => {
    const has = (
      scope: 'start' | 'anywhere',
      presence: 'has' | 'lacks',
      name: string,
    ): SeedRule => ({
      id: 't',
      kind: 'trait',
      trait: name,
      presence,
      scope: { kind: scope },
      mode: 'must',
      weight: 1,
    })
    expect(evaluate([has('start', 'has', 'traits/MetalRich')], cluster).passed).toBe(true)
    expect(evaluate([has('start', 'has', 'traits/GeoActive')], cluster).passed).toBe(false)
    expect(evaluate([has('anywhere', 'has', 'traits/GeoActive')], cluster).passed).toBe(true)
    expect(evaluate([has('anywhere', 'lacks', 'traits/GeoActive')], cluster).passed).toBe(false)
  })

  it('matches asteroid presence', () => {
    const rule = (asteroid: string): SeedRule => ({
      id: 'x',
      kind: 'asteroid',
      asteroid,
      mode: 'must',
      weight: 1,
    })
    expect(evaluate([rule('Moon')], cluster).passed).toBe(true)
    expect(evaluate([rule('Ghost')], cluster).passed).toBe(false)
  })
})

describe('TopList', () => {
  const result = (coordinate: string, score: number): SeedResult =>
    ({ coordinate, score }) as SeedResult

  it('ranks by score, keeps ties in arrival order, and caps at N', () => {
    const top = new TopList(3)
    for (const [c, s] of [
      ['a', 1],
      ['b', 5],
      ['c', 3],
      ['d', 3],
      ['e', 9],
    ] as const)
      top.insert(result(c, s))
    expect(top.list().map((r) => r.coordinate)).toEqual(['e', 'b', 'c'])
  })

  it('rejects results that do not beat a full list, and duplicates', () => {
    const top = new TopList(2)
    expect(top.insert(result('a', 4))).toBe(true)
    expect(top.insert(result('a', 9))).toBe(false)
    expect(top.insert(result('b', 4))).toBe(true)
    expect(top.insert(result('c', 4))).toBe(false)
    expect(top.insert(result('d', 5))).toBe(true)
    expect(top.list().map((r) => r.coordinate)).toEqual(['d', 'a'])
  })
})

describe('presets', () => {
  const known = new Set([...geyserTypes.map((t) => t.id), 'OilWell'])

  it('use real geyser ids and unique rule ids', () => {
    for (const preset of SEED_PRESETS) {
      const ids = preset.rules.map((rule) => rule.id)
      expect(new Set(ids).size).toBe(ids.length)
      for (const rule of preset.rules)
        if (rule.kind === 'geyser') expect(known).toContain(rule.geyser)
    }
  })
})
