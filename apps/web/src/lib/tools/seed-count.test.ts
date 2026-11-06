import { describe, expect, it } from 'vite-plus/test'
import type { GeyserRule } from '@/seed/rules'
import { countOf, countOp, countRange } from './seed-count'

const rule = (range: Pick<GeyserRule, 'min' | 'max'>): GeyserRule => ({
  id: 'g',
  kind: 'geyser',
  geyser: 'hot_water',
  scope: { kind: 'anywhere' },
  mode: 'must',
  weight: 1,
  ...range,
})

describe('count conditions', () => {
  it('round-trips each condition', () => {
    for (const op of ['atLeast', 'atMost', 'exactly', 'none'] as const) {
      const r = rule(countRange(op, 3))
      expect(countOp(r)).toBe(op)
      if (op !== 'none') expect(countOf(r)).toBe(3)
    }
  })

  it('writes the bounds the engine reads', () => {
    expect(countRange('atLeast', 2)).toEqual({ min: 2, max: undefined })
    expect(countRange('atMost', 2)).toEqual({ min: 0, max: 2 })
    expect(countRange('exactly', 2)).toEqual({ min: 2, max: 2 })
    expect(countRange('none', 5)).toEqual({ min: 0, max: 0 })
  })

  it('keeps the count in range', () => {
    expect(countRange('atLeast', -4).min).toBe(0)
    expect(countRange('atLeast', 400).min).toBe(99)
  })
})
