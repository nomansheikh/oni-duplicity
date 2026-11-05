import { describe, expect, it } from 'vite-plus/test'
import {
  adultId,
  cellsNeeded,
  findSpecies,
  herdsFromSave,
  maxCritters,
  planRanch,
  ranchedEffectSeconds,
  ranchersNeeded,
} from './ranching-calc'

const hatch = findSpecies('Hatch')!

describe('space', () => {
  it('fits floor(cells / space) critters', () => {
    expect(hatch.spacePerCritter).toBe(12)
    expect(maxCritters(96, hatch)).toBe(8)
    expect(maxCritters(11, hatch)).toBe(0)
  })

  it('keeps a stable at the room type minimum and splits past the maximum', () => {
    expect(cellsNeeded(1, hatch).roomCells).toBe(12)
    expect(cellsNeeded(8, hatch).fitsOneStable).toBe(true)
    expect(cellsNeeded(9, hatch)).toMatchObject({ fitsOneStable: false, stables: 2 })
  })
})

describe('ranchers', () => {
  it('lengthens the Ranched effect with the Ranching attribute', () => {
    expect(ranchedEffectSeconds(0)).toBe(600)
    expect(ranchedEffectSeconds(10)).toBe(1200)
  })

  it('needs a rancher per full cycle of visits', () => {
    // 50 critters x 12 s = 600 s of work per cycle
    expect(ranchersNeeded(50, 0, 600)).toBe(1)
    expect(ranchersNeeded(51, 0, 600)).toBe(2)
    expect(ranchersNeeded(51, 10, 600)).toBe(1)
    expect(ranchersNeeded(0, 0, 600)).toBe(0)
  })
})

describe('planRanch', () => {
  it('scales feed, eggs and shells by herd size', () => {
    const plan = planRanch(hatch, 8, { ranchingAttribute: 0, secondsAvailablePerRancher: 600 })
    expect(plan.feed[0]!.kgPerCycle).toBe(140 * 8)
    expect(plan.eggsPerCycle).toBeCloseTo(8 / 60)
    // 2 kg egg, half of it shell
    expect(plan.shellKgPerCycle).toBeCloseTo((8 / 60) * 2 * 0.5)
    expect(plan.ranchers).toBe(1)
  })

  it('reports meat as a one-off on death, not per cycle', () => {
    const plan = planRanch(hatch, 2, { ranchingAttribute: 0, secondsAvailablePerRancher: 600 })
    const meat = plan.products.find((p) => p.item === 'Meat')!
    expect(meat.onDeathKg).toBe(2)
    expect(meat.perCycle).toBeUndefined()
  })
})

describe('save grouping', () => {
  it('groups by species, counting babies in the herd', () => {
    expect(adultId('HatchBaby')).toBe('Hatch')
    const herds = herdsFromSave([
      { prefab: 'Hatch', baby: false },
      { prefab: 'HatchBaby', baby: true },
      { prefab: 'Puft', baby: false },
      { prefab: 'NotACritter', baby: false },
    ])
    expect(herds.map((h) => [h.species.id, h.count, h.babies])).toEqual([
      ['Hatch', 2, 1],
      ['Puft', 1, 0],
    ])
  })
})
