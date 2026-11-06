import { zoneTypes } from '@oni-duplicity/game-data'
import { describe, expect, it } from 'vite-plus/test'
import { BIOME_COLORS, biomeColor } from './biome-colors'

describe('biome colours', () => {
  it('has a colour for every zone type the generator can emit', () => {
    expect(zoneTypes.length).toBeGreaterThan(20)
    expect(zoneTypes.filter((id) => !(id in BIOME_COLORS))).toEqual([])
  })

  it('has no colour for a name that is not a zone type', () => {
    expect(Object.keys(BIOME_COLORS).filter((id) => !zoneTypes.includes(id))).toEqual([])
  })

  it('gives every zone type its own colour', () => {
    const colours = zoneTypes.map((id) => biomeColor(id).join(','))
    expect(new Set(colours).size).toBe(zoneTypes.length)
  })

  it('falls back to a stable hashed colour for an unknown name', () => {
    expect(biomeColor('NotAZone')).toEqual(biomeColor('NotAZone'))
    expect(biomeColor('NotAZone')).not.toEqual(biomeColor('AlsoNotAZone'))
  })
})
