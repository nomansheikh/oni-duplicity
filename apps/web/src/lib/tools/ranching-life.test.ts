import { describe, expect, it } from 'vite-plus/test'
import { lifeTimeline } from './ranching-life'
import { findSpecies } from './ranching-calc'

describe('lifeTimeline', () => {
  it('puts one egg per fertility period inside the lifespan', () => {
    const life = lifeTimeline(findSpecies('Hatch')!)
    expect(life.lifespanCycles).toBe(100)
    expect(life.incubationCycles).toBe(20)
    expect(life.lifetimeEggs).toBe(1)
    expect(life.eggAt).toHaveLength(1)
    expect(life.eggAt[0]).toBeCloseTo(60, 3)
  })

  it('counts several lifetime eggs for a short laying period', () => {
    const life = lifeTimeline(findSpecies('Pacu')!)
    expect(life.lifetimeEggs).toBe(Math.floor(25 / 15.000001))
  })

  it('has no eggs for species that lay none', () => {
    const life = lifeTimeline(findSpecies('Moo')!)
    expect(life.eggAt).toEqual([])
    expect(life.lifetimeEggs).toBe(0)
    expect(life.eggEvery).toBeUndefined()
  })
})
