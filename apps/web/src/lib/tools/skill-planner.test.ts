import { describe, expect, it } from 'vite-plus/test'
import {
  addToPlan,
  moraleSurplus,
  cleanPlan,
  nodeState,
  removeFromPlan,
  summarizePlan,
} from './skill-planner'
import { skillsFor } from './skill-data'
import { experienceForPoints, pointsForExperience } from './skill-math'

const base = skillsFor({ model: 'Minion', dlcIds: [] })
const spaced = skillsFor({ model: 'Minion', dlcIds: ['EXPANSION1_ID'] })
const ids = (list: { id: string }[]) => list.map((s) => s.id)

describe('skillsFor', () => {
  it('hides skills of other models and missing DLCs', () => {
    expect(ids(base)).toContain('Mining3')
    expect(ids(base)).not.toContain('Mining4')
    expect(ids(base).some((id) => id.startsWith('Bionic'))).toBe(false)
  })

  it('swaps the base-game-only skills and the ThermalSuits prerequisites for Spaced Out', () => {
    expect(ids(base)).toContain('Astronauting1')
    expect(ids(spaced)).not.toContain('Astronauting1')
    expect(ids(spaced)).toContain('Mining4')
    expect(base.find((s) => s.id === 'ThermalSuits')!.requires).toEqual(['Hauling1'])
    expect(spaced.find((s) => s.id === 'ThermalSuits')!.requires).toEqual([
      'Hauling1',
      'RocketPiloting1',
    ])
  })

  it('offers the bionic tree to bionic duplicants only', () => {
    const bionic = skillsFor({ model: 'BionicMinion', dlcIds: ['DLC3_ID'] })
    expect(bionic.length).toBeGreaterThan(0)
    expect(bionic.every((s) => s.model === 'BionicMinion')).toBe(true)
  })
})

describe('plan editing', () => {
  const none = new Set<string>()

  it('adds missing prerequisites first', () => {
    expect(addToPlan('Mining3', base, none, [])).toEqual(['Mining1', 'Mining2', 'Mining3'])
  })

  it('skips what is mastered or already planned', () => {
    expect(addToPlan('Mining3', base, new Set(['Mining1']), ['Mining2'])).toEqual([
      'Mining2',
      'Mining3',
    ])
  })

  it('removes dependants with the skill', () => {
    expect(removeFromPlan('Mining2', base, ['Mining1', 'Mining2', 'Mining3'])).toEqual(['Mining1'])
  })

  it('cleans out mastered and unknown entries', () => {
    expect(cleanPlan(['Mining1', 'Nope', 'Mining2'], base, new Set(['Mining1']))).toEqual([
      'Mining2',
    ])
  })

  it('classifies nodes', () => {
    const mining2 = base.find((s) => s.id === 'Mining2')!
    expect(nodeState(mining2, new Set(['Mining1']), [])).toBe('available')
    expect(nodeState(mining2, none, [])).toBe('locked')
    expect(nodeState(mining2, none, ['Mining2'])).toBe('planned')
    expect(nodeState(mining2, new Set(['Mining2']), [])).toBe('mastered')
  })
})

describe('summarizePlan', () => {
  const run = (plan: string[], mastered: string[], interests: string[], experience: number) =>
    summarizePlan({
      skills: base,
      mastered: new Set(mastered),
      interests: new Set(interests),
      plan,
      experience,
    })

  it('costs tier + 1 morale expectation per skill', () => {
    const s = run(['Mining2', 'Mining3'], ['Mining1'], [], 0)
    const tiers = ['Mining1', 'Mining2', 'Mining3'].map((id) => base.find((k) => k.id === id)!.tier)
    expect(s.expectationAfter).toBe(tiers.reduce((a, t) => a + t + 1, 0))
    expect(s.expectationBefore).toBe(tiers[0]! + 1)
  })

  it('counts interest skills as morale and subtracts the base +1', () => {
    const s = run(['Mining2'], ['Mining1'], ['Mining'], 0)
    expect(s.interestMoraleAfter).toBe(2)
    expect(s.moraleFromOtherSources).toBe(Math.max(0, s.expectationAfter - 1 - 2))
  })

  it('works out the morale left over from the morale the player enters', () => {
    const s = run(['Mining2'], ['Mining1'], ['Mining'], 0)
    // Mining2 costs (tier + 1) and adds 1 interest morale
    const cost = s.expectationAfter - s.expectationBefore
    expect(moraleSurplus(s, 10)).toBe(10 + 1 - s.expectationBefore - cost)
  })

  it('needs the experience that earns the points', () => {
    const s = run(['Mining2'], ['Mining1'], [], 0)
    expect(s.pointsAfter).toBe(2)
    expect(s.experienceNeeded).toBe(experienceForPoints(2))
    expect(s.experienceMissing).toBe(s.experienceNeeded)
    expect(run(['Mining2'], ['Mining1'], [], 1e9).experienceMissing).toBe(0)
  })

  it('reports points to spend now', () => {
    const xp = experienceForPoints(4)
    expect(run([], ['Mining1'], [], xp).pointsAvailableNow).toBe(pointsForExperience(xp) - 1)
  })
})
