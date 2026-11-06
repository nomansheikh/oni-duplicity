import { findWorldgenWorld, geyserTypes, worldgenTraits } from '@oni-duplicity/game-data'
import { humanize } from '@/lib/format'
import { geyserName } from '@/lib/seed-draw/geyser-marks'
import { SEED_CLUSTERS } from '@/seed/clusters'
import { remixWorlds, type MixingLevels } from '@/seed/mixing'

/** One pickable thing in a rule row: a geyser type, a world trait or an asteroid. */
export interface SeedOption {
  /** What the rule stores. */
  id: string
  label: string
  /** A second line for search and display, e.g. the element a geyser emits. */
  hint?: string
}

export const OIL_WELL = 'OilWell'

const allIn = (needed: readonly string[], dlcs: readonly string[]) =>
  needed.every((id) => dlcs.includes(id))

/** Geyser types the DLCs in play can generate, plus the oil reservoir. */
export function geyserOptions(dlcs: readonly string[]): SeedOption[] {
  const types = geyserTypes
    .filter((type) => allIn(type.requiredDlcIds, dlcs))
    .map((type) => ({ id: type.id, label: geyserName(type.id), hint: humanize(type.element) }))
  return [{ id: OIL_WELL, label: 'Oil reservoir', hint: 'Crude oil' }, ...types]
}

/** A trait id without its DLC folder: `expansion1::traits/Volcanoes` gives `traits/Volcanoes`. */
const traitPath = (id: string) => id.replace(/^\w+::/, '')

/**
 * World traits as the generator reports them for the DLCs in play. A DLC folder can hold its own
 * copy of a base trait (Spaced Out's Volcanoes, Irregular oil, Subsurface ocean), and the
 * generator then reports that copy, so the base one is left out.
 */
export function traitOptions(dlcs: readonly string[]): SeedOption[] {
  const usable = worldgenTraits.filter((trait) => allIn(trait.requiredDlcIds, dlcs))
  return usable
    .filter(
      (trait) =>
        trait.requiredDlcIds.length > 0 ||
        !usable.some((other) => other !== trait && traitPath(other.id) === trait.id),
    )
    .map((trait) => ({ id: trait.id, label: trait.name }))
}

/**
 * The asteroids of a cluster for the scope picker, the start asteroid first, then the asteroids
 * an asteroid remix may swap in.
 */
export function asteroidOptions(prefix: string, mixing: MixingLevels = {}): SeedOption[] {
  const cluster = SEED_CLUSTERS.find((c) => c.prefix === prefix)
  if (!cluster) return []
  const seen = new Set<string>()
  const placed = [...cluster.worlds]
    .sort((a, b) => Number(b.start) - Number(a.start))
    .filter((world) => !seen.has(world.id) && seen.add(world.id))
    .map((world) => ({
      id: world.id,
      label: findWorldgenWorld(world.world)?.name ?? world.id,
      hint: world.start ? 'Start' : undefined,
    }))
  const remixed = remixWorlds(cluster, mixing).map((path) => {
    const world = findWorldgenWorld(path)
    return { id: world?.id ?? path, label: world?.name ?? path, hint: 'Asteroid remix' }
  })
  return [...placed, ...remixed]
}

export function labelOf(options: SeedOption[], id: string): string {
  return options.find((option) => option.id === id)?.label ?? id
}

/** The ids the DLCs in play can report, for fitting a rule list to them. */
export function availableIds(dlcs: readonly string[]) {
  return {
    traits: new Set(traitOptions(dlcs).map((option) => option.id)),
    geysers: new Set(geyserOptions(dlcs).map((option) => option.id)),
  }
}
