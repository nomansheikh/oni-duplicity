import { describe, expect, it } from 'vite-plus/test'
import { feedLabel, itemName } from './ranching-labels'
import { ranchSpecies } from './ranching-data'

describe('itemName', () => {
  it('uses element and item names, falling back to spaced ids', () => {
    expect(itemName('ToxicSand')).toBe('Polluted Dirt')
    expect(itemName('FishMeat')).toBe('Pacu Fillet')
    expect(itemName('SomethingNew')).toBe('Something New')
  })
})

describe('feedLabel', () => {
  it('turns placeholder strings into readable labels with a tooltip', () => {
    const seeds = feedLabel(['<every plantable seed whose plant is Harvest / Crop>'])
    expect(seeds.label).toBe("Any harvestable plant's seeds")
    expect(seeds.detail).toBeTruthy()
    expect(feedLabel(['<all foods>']).label).toBe('Any food')
  })

  it('lists a long diet in a tooltip', () => {
    const label = feedLabel(['Sand', 'Clay', 'Dirt', 'Shale', 'Coquina'])
    expect(label.label).toBe('Sand, Clay, Dirt and 2 more')
    expect(label.detail).toContain('Coquina')
  })

  it('leaves no raw placeholder in any species diet', () => {
    for (const s of ranchSpecies)
      for (const d of s.diet) {
        const { label, detail } = feedLabel(d.eats)
        expect(label).not.toMatch(/[<>]/)
        expect(detail ?? '').not.toMatch(/[<>]/)
      }
  })
})
