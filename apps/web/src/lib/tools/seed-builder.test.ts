import { describe, expect, it } from 'vite-plus/test'
import type { SeedPreset } from '@/seed/rules'
import {
  addRule,
  applyPreset,
  blocker,
  changeCluster,
  changeKind,
  clampWeight,
  emptyState,
  fitToDlcs,
  nextRuleId,
  parseState,
  patchRule,
  removeRule,
  runnableRules,
} from './seed-builder'

const preset: SeedPreset = {
  id: 'p',
  name: 'P',
  description: '',
  rules: [
    {
      id: 'a',
      kind: 'geyser',
      geyser: 'hot_water',
      scope: { kind: 'asteroid', asteroid: 'WaterMoonlet' },
      min: 1,
      mode: 'must',
      weight: 1,
    },
    {
      id: 'b',
      kind: 'trait',
      trait: 'traits/MetalRich',
      presence: 'has',
      scope: { kind: 'start' },
      mode: 'nice',
      weight: 3,
    },
  ],
}

describe('rule list edits', () => {
  it('adds blank rules with unique ids', () => {
    let state = emptyState('SNDST-A')
    state = addRule(state)
    state = addRule(state, 'trait')
    state = removeRule(state, state.rules[0]!.id)
    state = addRule(state)
    expect(new Set(state.rules.map((r) => r.id)).size).toBe(state.rules.length)
    expect(nextRuleId(state.rules)).not.toBe(state.rules[0]!.id)
  })

  it('keeps mode and weight when the kind changes, and clears the target', () => {
    let state = applyPreset(emptyState('SNDST-A'), preset)
    state = changeKind(state, 'b', 'geyser')
    const rule = state.rules[1]!
    expect(rule).toMatchObject({ kind: 'geyser', geyser: '', mode: 'nice', weight: 3 })
  })

  it('patches only fields the rule has, and clamps the weight', () => {
    let state = applyPreset(emptyState('SNDST-A'), preset)
    state = patchRule(state, 'b', { weight: 500, min: 4, presence: 'lacks' })
    expect(state.rules[1]).toMatchObject({ weight: 99, presence: 'lacks' })
    expect(state.rules[1]).not.toHaveProperty('min')
    state = patchRule(state, 'a', { max: 3 })
    expect(state.rules[0]).toMatchObject({ max: 3 })
  })

  it('clamps weights to whole points between 1 and 99', () => {
    expect(clampWeight(0)).toBe(1)
    expect(clampWeight(2.6)).toBe(3)
    expect(clampWeight(Number.NaN)).toBe(1)
  })
})

describe('presets and clusters', () => {
  it('copies the preset rules so edits do not touch the preset', () => {
    const state = applyPreset(emptyState('SNDST-A'), preset)
    const edited = patchRule(state, 'a', { min: 5 })
    expect(preset.rules[0]).toMatchObject({ min: 1 })
    expect(edited.presetId).toBe('p')
  })

  it('moves a rule to anywhere when its asteroid is not in the new cluster', () => {
    const state = applyPreset(emptyState('SNDST-C'), preset)
    const kept = changeCluster(state, 'SWMP-C', ['WaterMoonlet', 'SwampMoonlet'])
    expect(kept.rules[0]).toMatchObject({ scope: { kind: 'asteroid', asteroid: 'WaterMoonlet' } })
    const moved = changeCluster(state, 'SNDST-A', ['SandstoneDefault'])
    expect(moved.cluster).toBe('SNDST-A')
    expect(moved.rules[0]).toMatchObject({ scope: { kind: 'anywhere' } })
    expect(moved.rules[1]).toMatchObject({ scope: { kind: 'start' } })
  })
})

describe('running', () => {
  it('blocks an empty list and a list with no targets', () => {
    expect(blocker(emptyState('SNDST-A'))).toMatch(/Add a rule/)
    expect(blocker(addRule(emptyState('SNDST-A')))).toMatch(/target/)
    expect(blocker(applyPreset(emptyState('SNDST-A'), preset))).toBeNull()
  })

  it('runs only rules that have a target', () => {
    const state = addRule(applyPreset(emptyState('SNDST-A'), preset))
    expect(state.rules).toHaveLength(3)
    expect(runnableRules(state).map((r) => r.id)).toEqual(['a', 'b'])
  })
})

describe('parseState', () => {
  it('round-trips through JSON', () => {
    const state = applyPreset(emptyState('SNDST-A'), preset)
    expect(parseState(JSON.parse(JSON.stringify(state)))).toEqual(state)
  })

  it('keeps only whole positive mixing levels', () => {
    const stored = { cluster: 'X', rules: [], mixing: { DLC2_ID: 1, A: 0, B: -1, C: 1.5, D: 'x' } }
    expect(parseState(stored)?.mixing).toEqual({ DLC2_ID: 1 })
    expect(parseState({ cluster: 'X', rules: [] })?.mixing).toEqual({})
  })

  it('rejects malformed data', () => {
    expect(parseState(null)).toBeNull()
    expect(parseState({ cluster: 1, rules: [] })).toBeNull()
    expect(parseState({ cluster: 'X', rules: [{ id: 'a', kind: 'nope' }] })?.rules).toEqual([])
    const dup = { ...preset.rules[0]! }
    expect(parseState({ cluster: 'X', rules: [dup, dup] })).toBeNull()
  })
})

describe('fitToDlcs', () => {
  const base = {
    traits: new Set(['traits/MetalRich', 'traits/Volcanoes']),
    geysers: new Set(['hot_water']),
  }

  it('swaps a trait for its twin and drops rules the DLCs lack', () => {
    const state = {
      ...emptyState('SNDST-A'),
      rules: [
        { ...preset.rules[1]!, trait: 'expansion1::traits/Volcanoes' },
        { ...preset.rules[1]!, id: 'c', trait: 'expansion1::traits/MetalCaves' },
        { ...preset.rules[0]!, id: 'd', geyser: 'molten_aluminum' },
        preset.rules[0]!,
      ],
    }
    const fit = fitToDlcs(state, base)
    expect(fit.rules.map((r) => r.id)).toEqual(['b', 'a'])
    expect(fit.rules[0]).toMatchObject({ trait: 'traits/Volcanoes' })
  })
})
