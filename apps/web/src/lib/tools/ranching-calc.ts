/**
 * Pure maths for the ranching calculator. Every number comes from `ranching` in game-data,
 * which the extractor reads from the decompiled game. Nothing here reads or writes a save.
 */
import {
  findRanchSpecies,
  ranching,
  type RanchDietEntry,
  type RanchSpecies,
} from '@oni-duplicity/game-data'

export const SECONDS_PER_CYCLE = 600

export const STABLE = ranching.stable
export const RANCHER = ranching.rancher

export { findRanchSpecies as findSpecies }

/** Calories a wild critter burns against a tame one: the Metabolism modifier from the game. */
export function wildCalorieFactor(): number {
  const { metabolismBase, metabolismModifier } = ranching.wild
  return (metabolismBase + metabolismModifier) / metabolismBase
}

/** Whole critters a region of `cells` holds. A species with no space requirement has no limit. */
export function critterCapacity(cells: number, species: Pick<RanchSpecies, 'spacePerCritter'>) {
  if (species.spacePerCritter <= 0) return Infinity
  return Math.max(0, Math.floor(cells / species.spacePerCritter))
}

/** The Ranched effect lasts its base time, lengthened by the rancher's Ranching skill. */
export function ranchedEffectSeconds(ranchingSkill: number): number {
  return (
    RANCHER.ranchedEffectSeconds *
    (1 + Math.max(0, ranchingSkill) * RANCHER.durationPerRanchingPoint)
  )
}

/** Seconds of rancher work per cycle: one visit per critter per effect, ignoring walking. */
export function rancherSecondsPerCycle(critters: number, ranchingSkill: number): number {
  return (critters * RANCHER.workSeconds * SECONDS_PER_CYCLE) / ranchedEffectSeconds(ranchingSkill)
}

export interface FeedChoice {
  /** Id of a diet entry of the species. */
  id: string
  /** Relative weight; only the ratios matter. */
  share: number
}

export interface FeedLine {
  food: RanchDietEntry
  /** Fraction of the critter's calories this food supplies, 0 to 1. */
  fraction: number
  /** Herd total per cycle: kg for solids, cycles of plant growth for plants. */
  amountPerCycle: number
  unit: 'kg' | 'growth'
  produces?: { id: string; name: string; kgPerCycle: number }
}

export interface RanchInputs {
  /** Critters, or leave undefined to solve from `cells`. */
  critters?: number
  /** Cells available, used when `critters` is undefined. */
  cells?: number
  tame: boolean
  rancherSkill: number
  secondsPerRancher: number
  feed: FeedChoice[]
}

export interface RanchPlan {
  critters: number
  /** Calories one critter burns per cycle, after the wild/tame rate. */
  caloriesPerCritter: number
  feed: FeedLine[]
  /** Shares that name no food of this species were dropped; true when nothing usable was left. */
  noFeed: boolean
  space: {
    needed: number
    roomCells: number
    fitsOneStable: boolean
    stables: number
    perStable: number
  }
  eggsPerCycle?: number
  morphs: { speciesId: string; name: string; eggsPerCycle: number }[]
  shellKgPerCycle?: number
  /** Cycles for scales to regrow and the kg per cycle of the herd. */
  shear?: { item: string; name: string; kgPerCycle: number; cycles: number }
  milk?: { capacityKg: number; caloriesPerCycle: number }
  deathDropKg: { id: string; name: string; kg: number }[]
  rancherSeconds: number
  ranchers: number
}

export function planRanch(species: RanchSpecies, inputs: RanchInputs): RanchPlan {
  const perCritter = Math.max(1, species.spacePerCritter)
  const critters =
    inputs.critters !== undefined
      ? Math.max(0, Math.floor(inputs.critters))
      : critterCapacity(Math.max(0, inputs.cells ?? 0), species)
  const n = Number.isFinite(critters) ? critters : 0
  const burn = species.caloriesPerCycle * (inputs.tame ? 1 : wildCalorieFactor())

  const byId = new Map(species.diet.map((d) => [d.id, d]))
  const chosen = inputs.feed.filter((f) => byId.has(f.id) && f.share > 0)
  const total = chosen.reduce((sum, f) => sum + f.share, 0)
  const feed = chosen.map<FeedLine>((f) => {
    const food = byId.get(f.id)!
    const fraction = f.share / total
    const amount = (burn * n * fraction) / food.calories
    return {
      food,
      fraction,
      amountPerCycle: amount,
      unit: food.kind === 'plant' ? 'growth' : 'kg',
      ...(food.produces
        ? {
            produces: {
              id: food.produces.id,
              name: food.produces.name,
              kgPerCycle: amount * food.produces.ratio,
            },
          }
        : {}),
    }
  })

  const needed = n * species.spacePerCritter
  const egg = species.egg
  const eggsPerCycle = egg && egg.fertilityCycles > 0 ? n / egg.fertilityCycles : undefined
  const weightSum = egg?.chances.reduce((s, c) => s + c.weight, 0) ?? 0
  const shearProduct = species.products.find((p) => p.kind === 'shear')
  const milkProduct = species.products.find((p) => p.kind === 'milk')
  const scaleFactor = inputs.tame ? 1 : 1 + ranching.wild.scaleGrowthMultiplier

  return {
    critters: n,
    caloriesPerCritter: burn,
    feed,
    noFeed: feed.length === 0,
    space: {
      needed,
      roomCells: Math.max(STABLE.minCells, needed),
      fitsOneStable: needed <= STABLE.maxCells,
      stables: Math.max(1, Math.ceil(needed / STABLE.maxCells)),
      perStable: Math.floor(STABLE.maxCells / perCritter),
    },
    ...(eggsPerCycle !== undefined ? { eggsPerCycle } : {}),
    morphs:
      eggsPerCycle !== undefined && weightSum > 0
        ? egg!.chances
            .filter((c) => c.weight > 0)
            .map((c) => ({
              speciesId: c.speciesId,
              name: c.name,
              eggsPerCycle: (eggsPerCycle * c.weight) / weightSum,
            }))
        : [],
    ...(eggsPerCycle !== undefined && egg
      ? { shellKgPerCycle: eggsPerCycle * egg.massKg * egg.shellRatio }
      : {}),
    ...(shearProduct?.kg !== undefined && shearProduct.cycles && shearProduct.item
      ? {
          shear: {
            item: shearProduct.item,
            name: shearProduct.name ?? shearProduct.item,
            kgPerCycle: (n * shearProduct.kg) / (shearProduct.cycles / scaleFactor),
            cycles: shearProduct.cycles / scaleFactor,
          },
        }
      : {}),
    ...(milkProduct?.capacityKg !== undefined && milkProduct.caloriesPerCycle !== undefined
      ? {
          milk: {
            capacityKg: milkProduct.capacityKg,
            caloriesPerCycle: milkProduct.caloriesPerCycle,
          },
        }
      : {}),
    deathDropKg: species.deathDrops,
    rancherSeconds: species.swims ? 0 : rancherSecondsPerCycle(n, inputs.rancherSkill),
    ranchers:
      species.swims || n <= 0 || inputs.secondsPerRancher <= 0
        ? 0
        : Math.ceil(rancherSecondsPerCycle(n, inputs.rancherSkill) / inputs.secondsPerRancher),
  }
}

/** Default feed for a species: its first diet entry at a full share. */
export function defaultFeed(species: RanchSpecies): FeedChoice[] {
  const first = species.diet[0]
  return first ? [{ id: first.id, share: 100 }] : []
}
