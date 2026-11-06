/** Ranching data read from the decompiled game by scripts/extract-game-data.ts. */

export interface RanchDietEntry {
  /** Prefab, element or tag id of the thing eaten. */
  id: string
  name: string
  /**
   * What the game feeds the critter: `solid` is kg of an item or element, `plant` is the plant
   * growing in place (calories per cycle of growth), `plantStorage` is a plant's stored output,
   * `prey` is a butchered critter.
   */
  kind: 'solid' | 'plant' | 'plantStorage' | 'prey'
  /** Calories per kg for `solid` and `prey`; per cycle of plant growth for `plant`. */
  calories: number
  produces?: {
    id: string
    name: string
    /** kg produced per kg eaten (per growth cycle for `plant`). */
    ratio: number
  }
  disease?: string
  dlcIds?: string[]
  forbiddenDlcIds?: string[]
}

export interface RanchProductEntry {
  kind: 'shear' | 'milk'
  item?: string
  name?: string
  /** `shear`: kg dropped per harvest. */
  kg?: number
  /** `shear`: cycles for the scales to regrow fully. */
  cycles?: number
  /** `milk`: calories per cycle the critter must eat to fill the tank, and the tank's size in kg. */
  caloriesPerCycle?: number
  capacityKg?: number
}

export interface RanchSpecies {
  /** Adult prefab id, as in a save. */
  id: string
  /** Species key, e.g. HATCH for every Hatch morph. */
  family: string
  familyName: string
  name: string
  dlcIds: string[]
  forbiddenDlcIds: string[]
  babyId?: string
  /** Tagged Swimmer: lives in a pond and is skipped by the grooming station. */
  swims: boolean
  spacePerCritter: number
  lifespanCycles: number
  caloriesPerCycle: number
  stomachCalories: number
  egg?: {
    id: string
    name: string
    massKg: number
    shellRatio: number
    fertilityCycles: number
    incubationCycles: number
    /** Morph odds when this species lays: `weight` out of the sum of weights. */
    chances: { speciesId: string; name: string; weight: number }[]
  }
  diet: RanchDietEntry[]
  deathDrops: { id: string; name: string; kg: number }[]
  products: RanchProductEntry[]
}

export interface RanchingData {
  /** Room limits of a Stable (RoomTypes.CreaturePen). */
  stable: { minCells: number; maxCells: number }
  /** Grooming station: work seconds per critter, the Ranched effect, and the skill's effect on it. */
  rancher: { workSeconds: number; ranchedEffectSeconds: number; durationPerRanchingPoint: number }
  /** Calorie factor of a wild critter against a tame one, from the metabolism modifier. */
  wild: { metabolismModifier: number; metabolismBase: number; scaleGrowthMultiplier: number }
  species: RanchSpecies[]
  /** Values the extractor could not read, by species or topic. */
  gaps: string[]
}

import data from './generated/game-data.json' with { type: 'json' }

export const ranching = data.ranching as unknown as RanchingData

export function findRanchSpecies(id: string): RanchSpecies | undefined {
  return ranching.species.find((s) => s.id === id)
}
