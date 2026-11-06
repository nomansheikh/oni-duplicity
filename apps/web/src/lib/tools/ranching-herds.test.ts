import { describe, expect, it } from 'vite-plus/test'
import { adultId, herdsFromSave } from './ranching-herds'

describe('herdsFromSave', () => {
  it('groups adults and babies and skips critters without data', () => {
    expect(adultId('HatchBaby')).toBe('Hatch')
    const herds = herdsFromSave([
      { prefab: 'Hatch', baby: false },
      { prefab: 'HatchBaby', baby: true },
      { prefab: 'Squirrel', baby: false },
      { prefab: 'Nonsense', baby: false },
    ])
    expect(herds.map((h) => [h.species.id, h.count, h.babies])).toEqual([
      ['Hatch', 2, 1],
      ['Squirrel', 1, 0],
    ])
  })
})
