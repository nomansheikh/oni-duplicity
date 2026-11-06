import { describe, expect, it } from 'vite-plus/test'
import { asteroidOptions, availableIds, geyserOptions, traitOptions } from './seed-catalog'

const ids = (options: { id: string }[]) => options.map((option) => option.id)

describe('geyserOptions', () => {
  it('leaves out geysers the DLCs in play cannot generate', () => {
    const base = ids(geyserOptions([]))
    expect(base).toContain('steam')
    expect(base).toContain('OilWell')
    expect(base).not.toContain('molten_aluminum')
    expect(base).not.toContain('murky_brine')
  })

  it('adds each DLC geyser once its DLC is in play', () => {
    expect(ids(geyserOptions(['EXPANSION1_ID']))).toContain('molten_aluminum')
    expect(ids(geyserOptions(['EXPANSION1_ID']))).not.toContain('murky_brine')
    expect(ids(geyserOptions(['DLC5_ID']))).toContain('murky_brine')
  })
})

describe('traitOptions', () => {
  it('offers only base traits without Spaced Out', () => {
    const base = ids(traitOptions([]))
    expect(base).toContain('traits/Volcanoes')
    expect(base.every((id) => !id.includes('::'))).toBe(true)
  })

  it('offers the Spaced Out copy of a trait instead of the base one', () => {
    const spaced = ids(traitOptions(['EXPANSION1_ID']))
    expect(spaced).toContain('expansion1::traits/Volcanoes')
    expect(spaced).not.toContain('traits/Volcanoes')
    expect(spaced).toContain('traits/MetalRich')
  })

  it('matches what availableIds reports', () => {
    const dlcs = ['EXPANSION1_ID', 'DLC2_ID']
    expect([...availableIds(dlcs).traits]).toEqual(ids(traitOptions(dlcs)))
    expect([...availableIds(dlcs).geysers]).toEqual(ids(geyserOptions(dlcs)))
  })
})

describe('asteroidOptions', () => {
  it('lists the start asteroid first', () => {
    const options = asteroidOptions('SNDST-C')
    expect(options[0]).toMatchObject({ id: 'TerraMoonlet', hint: 'Start' })
  })

  it('adds the fragment an asteroid remix may swap in', () => {
    const mixed = asteroidOptions('V-SNDST-C', { DLC2_ID: 1, CeresAsteroidMixing: 2 })
    expect(mixed.at(-1)).toMatchObject({ id: 'MixingCeresAsteroid', hint: 'Asteroid remix' })
    expect(ids(asteroidOptions('V-SNDST-C'))).not.toContain('MixingCeresAsteroid')
  })
})
