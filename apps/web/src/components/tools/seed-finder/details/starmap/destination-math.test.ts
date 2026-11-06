import { describe, expect, it } from 'vite-plus/test'
import { destinationKm, destinationMass } from './destination-math.ts'

describe('destinationKm', () => {
  it('is the one-based tier times 10,000 km', () => {
    expect(destinationKm(0)).toBe(10000)
    expect(destinationKm(17)).toBe(180000)
  })
})

describe('destinationMass', () => {
  it('splits the full mass from what can be recovered', () => {
    expect(destinationMass('Satellite')).toEqual({ total: 64000000, recoverable: 6000 })
    expect(destinationMass('RockyAsteroid')).toEqual({ total: 128000000, recoverable: 12000 })
  })

  it('has none for a type with no mass, or an unknown one', () => {
    expect(destinationMass('Wormhole')).toEqual({ total: 0, recoverable: 0 })
    expect(destinationMass('Nope')).toBeUndefined()
  })
})
