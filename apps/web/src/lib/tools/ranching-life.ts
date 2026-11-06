import type { RanchSpecies } from '@oni-duplicity/game-data'

export interface LifeTimeline {
  /** Cycles the egg takes to hatch, shown before the critter's day 0. */
  incubationCycles: number
  lifespanCycles: number
  /** Cycles between eggs; undefined for species that lay none. */
  eggEvery?: number
  /** Cycle of each egg a critter lays in its lifetime. */
  eggAt: number[]
  /** Eggs one critter lays before it dies: floor(lifespan / eggEvery). */
  lifetimeEggs: number
}

/** The critter's life laid out in cycles: hatch at 0, an egg every N cycles, death at the end. */
export function lifeTimeline(species: RanchSpecies): LifeTimeline {
  const every = species.egg?.fertilityCycles
  const life = species.lifespanCycles
  const count = every && every > 0 ? Math.floor(life / every) : 0
  return {
    incubationCycles: species.egg?.incubationCycles ?? 0,
    lifespanCycles: life,
    ...(every && every > 0 ? { eggEvery: every } : {}),
    eggAt: Array.from({ length: count }, (_, i) => (i + 1) * (every ?? 0)),
    lifetimeEggs: count,
  }
}
