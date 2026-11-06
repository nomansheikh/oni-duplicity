import { describe, expect, it } from 'vite-plus/test'
import {
  critterCapacity,
  defaultFeed,
  findSpecies,
  planRanch,
  ranchedEffectSeconds,
  wildCalorieFactor,
} from './ranching-calc'

const hatch = findSpecies('Hatch')!
const base = { tame: true, rancherSkill: 0, secondsPerRancher: 600 }

describe('space', () => {
  it('fits floor(cells / space) critters, and none when space is not required', () => {
    expect(critterCapacity(96, hatch)).toBe(8)
    expect(critterCapacity(11, hatch)).toBe(0)
    expect(critterCapacity(50, findSpecies('Mole')!)).toBe(Infinity)
  })

  it('solves the critter count from the available cells', () => {
    expect(planRanch(hatch, { ...base, cells: 100, feed: [] }).critters).toBe(8)
  })

  it('keeps a stable at the room minimum and splits past the maximum', () => {
    expect(planRanch(hatch, { ...base, critters: 1, feed: [] }).space.roomCells).toBe(12)
    expect(planRanch(hatch, { ...base, critters: 8, feed: [] }).space.fitsOneStable).toBe(true)
    expect(planRanch(hatch, { ...base, critters: 9, feed: [] }).space).toMatchObject({
      fitsOneStable: false,
      stables: 2,
      perStable: 8,
    })
  })
})

describe('feed', () => {
  it('splits calories between foods by share and works out kg from each food', () => {
    const plan = planRanch(hatch, {
      ...base,
      critters: 2,
      feed: [
        { id: 'Sand', share: 3 },
        { id: 'Clay', share: 1 },
      ],
    })
    const sand = plan.feed.find((f) => f.food.id === 'Sand')!
    // 700,000 cal per critter per cycle, 3/4 of it from sand at 5,000 cal per kg, two critters.
    expect(sand.amountPerCycle).toBeCloseTo((700000 * 2 * 0.75) / 5000, 6)
    expect(sand.produces).toMatchObject({ id: 'Carbon' })
    expect(sand.produces!.kgPerCycle).toBeCloseTo(sand.amountPerCycle * 0.5, 6)
    expect(plan.feed.reduce((s, f) => s + f.fraction, 0)).toBeCloseTo(1, 9)
  })

  it('drops foods the species cannot eat and flags an empty feed', () => {
    const plan = planRanch(hatch, { ...base, critters: 2, feed: [{ id: 'Kelp', share: 1 }] })
    expect(plan.noFeed).toBe(true)
  })

  it('counts plants in cycles of growth', () => {
    const drecko = findSpecies('Drecko')!
    const plan = planRanch(drecko, { ...base, critters: 1, feed: defaultFeed(drecko) })
    expect(plan.feed[0]!.unit).toBe('growth')
  })

  it('burns the wild rate of the tame calories when wild', () => {
    expect(wildCalorieFactor()).toBeCloseTo(0.25, 9)
    const tame = planRanch(hatch, { ...base, critters: 1, feed: defaultFeed(hatch) })
    const wild = planRanch(hatch, { ...base, tame: false, critters: 1, feed: defaultFeed(hatch) })
    expect(wild.caloriesPerCritter).toBeCloseTo(tame.caloriesPerCritter * 0.25, 6)
  })
})

describe('output', () => {
  it('lays one egg per fertility period and splits them by morph odds', () => {
    const plan = planRanch(hatch, { ...base, critters: 6, feed: [] })
    expect(plan.eggsPerCycle).toBeCloseTo(6 / 60.000004, 6)
    expect(plan.morphs.map((m) => m.speciesId)).toEqual(['Hatch', 'HatchHard', 'HatchVeggie'])
    expect(plan.morphs.reduce((s, m) => s + m.eggsPerCycle, 0)).toBeCloseTo(plan.eggsPerCycle!, 9)
    expect(plan.morphs[0]!.eggsPerCycle / plan.morphs[1]!.eggsPerCycle).toBeCloseTo(0.98 / 0.02, 6)
  })

  it('scales shear output with the herd and slows it for wild critters', () => {
    const drecko = findSpecies('Drecko')!
    const tame = planRanch(drecko, { ...base, critters: 4, feed: [] })
    expect(tame.shear).toMatchObject({ item: 'BasicFabric', cycles: 8 })
    expect(tame.shear!.kgPerCycle).toBeCloseTo((4 * 2) / 8, 9)
    const wild = planRanch(drecko, { ...base, tame: false, critters: 4, feed: [] })
    expect(wild.shear!.cycles).toBeCloseTo(32, 9)
  })
})

describe('rancher', () => {
  it('lengthens the Ranched effect with the Ranching skill', () => {
    expect(ranchedEffectSeconds(0)).toBe(600)
    expect(ranchedEffectSeconds(10)).toBe(1200)
  })

  it('needs one 12 s visit per critter per effect, and skips fish', () => {
    const plan = planRanch(hatch, { ...base, critters: 10, feed: [] })
    expect(plan.rancherSeconds).toBeCloseTo(120, 9)
    expect(plan.ranchers).toBe(1)
    expect(planRanch(findSpecies('Pacu')!, { ...base, critters: 10, feed: [] }).ranchers).toBe(0)
  })

  it('adds ranchers when the available seconds run out', () => {
    const plan = planRanch(hatch, { ...base, critters: 100, secondsPerRancher: 600, feed: [] })
    expect(plan.rancherSeconds).toBeCloseTo(1200, 9)
    expect(plan.ranchers).toBe(2)
  })
})
