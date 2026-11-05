/**
 * Pure maths for the ranching calculator. The numbers live in `ranching-data.ts`, each with the
 * decompiled file it came from. Nothing here reads or writes a save.
 */
import { ranchConstants, ranchSpecies, type RanchSpecies } from './ranching-data'

export const SECONDS_PER_CYCLE = 600

export const STABLE = ranchConstants.stable
export const RANCHER = ranchConstants.rancher

export function findSpecies(id: string): RanchSpecies | undefined {
  return ranchSpecies.find((s) => s.id === id)
}

/** Fish tag themselves `Creatures.Swimmer` (BasePacuConfig.cs); they overcrowd by pond size, not stable size. */
export function swims(species: Pick<RanchSpecies, 'family'>): boolean {
  return species.family === 'Pacu'
}

/** `HatchBaby` → `Hatch`. Babies take the space of their adult (`EntityTemplates`). */
export function adultId(prefab: string): string {
  return prefab.replace(/Baby$/, '')
}

/** Critters that fit a room: `OvercrowdingMonitor` counts each one's `spaceRequiredPerCreature`. */
export function maxCritters(cells: number, species: Pick<RanchSpecies, 'spacePerCritter'>): number {
  return Math.max(0, Math.floor(cells / species.spacePerCritter))
}

/** Cells a stable must have for this many critters, within the room type's limits. */
export function cellsNeeded(critters: number, species: Pick<RanchSpecies, 'spacePerCritter'>) {
  const needed = critters * species.spacePerCritter
  return {
    needed,
    /** The room type is only a Stable between its minimum and maximum cell counts. */
    roomCells: Math.max(STABLE.minCells, needed),
    fitsOneStable: needed <= STABLE.maxCells,
    stables: Math.max(1, Math.ceil(needed / STABLE.maxCells)),
  }
}

/** `RanchStationConfig.OnRanchCompleteCb`: the Ranched effect lasts 600 s × (1 + Ranching × 0.1). */
export function ranchedEffectSeconds(ranchingAttribute: number): number {
  return (
    RANCHER.ranchedEffect.baseDurationSeconds *
    (1 + Math.max(0, ranchingAttribute) * RANCHER.durationMultiplierPerRanchingPoint)
  )
}

/**
 * Seconds of rancher work per cycle: each critter needs one visit of `workTime` per effect
 * duration. Ignores walking and the schedule, so it is a lower bound.
 */
export function rancherSecondsPerCycle(critters: number, ranchingAttribute: number): number {
  return (
    (critters * RANCHER.workTimeSecondsPerCritter * SECONDS_PER_CYCLE) /
    ranchedEffectSeconds(ranchingAttribute)
  )
}

export function ranchersNeeded(
  critters: number,
  ranchingAttribute: number,
  secondsAvailablePerRancher: number,
): number {
  if (critters <= 0 || secondsAvailablePerRancher <= 0) return 0
  return Math.ceil(rancherSecondsPerCycle(critters, ranchingAttribute) / secondsAvailablePerRancher)
}

export interface FeedLine {
  eats: string[]
  /** Total kg per cycle for the whole herd, when the game's tuning gives a mass. */
  kgPerCycle?: number
  /** Calories per cycle for the whole herd, always known. */
  caloriesPerCycle: number
  /** What it leaves behind: kg per cycle of the item. */
  produces?: { item: string; kgPerCycle: number }
  note?: string
}

export interface ProductLine {
  item: string
  /** Herd total per cycle, for products that arrive on a schedule. */
  perCycle?: number
  /** Kilograms on death, per critter; arrives once per critter, not per cycle. */
  onDeathKg?: number
  note: string
}

export interface RanchPlan {
  critters: number
  feed: FeedLine[]
  products: ProductLine[]
  /** Eggs per cycle for the herd, and the shell they leave when they hatch. */
  eggsPerCycle?: number
  shellKgPerCycle?: number
  rancherSeconds: number
  ranchers: number
  space: ReturnType<typeof cellsNeeded>
}

export function planRanch(
  species: RanchSpecies,
  critters: number,
  opts: { ranchingAttribute: number; secondsAvailablePerRancher: number },
): RanchPlan {
  const n = Math.max(0, Math.floor(critters))
  const feed = species.diet.map<FeedLine>((d) => {
    const kg = d.kgPerCycle !== undefined ? d.kgPerCycle * n : undefined
    return {
      eats: d.eats,
      ...(kg !== undefined ? { kgPerCycle: kg } : {}),
      caloriesPerCycle: species.caloriesPerCycle * n,
      ...(d.produces?.kgPerCycle !== undefined
        ? { produces: { item: d.produces.item, kgPerCycle: d.produces.kgPerCycle * n } }
        : {}),
      ...(d.note ? { note: d.note } : {}),
    }
  })
  const products = species.products.map<ProductLine>((p) => ({
    item: p.item,
    ...(p.perCycle !== undefined ? { perCycle: p.perCycle * n } : {}),
    ...(p.perCycle === undefined && p.amountKg !== undefined ? { onDeathKg: p.amountKg } : {}),
    note: p.note,
  }))
  const egg = species.egg
  const eggsPerCycle = egg?.fertilityCycles ? n / egg.fertilityCycles : undefined
  const shell =
    egg?.massKg !== undefined && eggsPerCycle !== undefined
      ? eggsPerCycle * egg.massKg * (egg.shellRatio ?? 0.5)
      : undefined
  return {
    critters: n,
    feed,
    products,
    ...(eggsPerCycle !== undefined ? { eggsPerCycle } : {}),
    ...(shell !== undefined ? { shellKgPerCycle: shell } : {}),
    rancherSeconds: rancherSecondsPerCycle(n, opts.ranchingAttribute),
    ranchers: ranchersNeeded(n, opts.ranchingAttribute, opts.secondsAvailablePerRancher),
    space: cellsNeeded(n, species),
  }
}

export interface SaveHerd {
  species: RanchSpecies
  /** Adults and babies, which take the same space. */
  count: number
  babies: number
}

/** Groups the critters in a save by ranchable species; prefabs with no data are skipped. */
export function herdsFromSave(critters: { prefab: string; baby: boolean }[]): SaveHerd[] {
  const byId = new Map<string, SaveHerd>()
  for (const c of critters) {
    const species = findSpecies(adultId(c.prefab))
    if (!species) continue
    const herd = byId.get(species.id) ?? { species, count: 0, babies: 0 }
    herd.count += 1
    if (c.baby) herd.babies += 1
    byId.set(species.id, herd)
  }
  return [...byId.values()].sort((a, b) => b.count - a.count)
}
