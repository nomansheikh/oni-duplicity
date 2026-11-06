import { findWorldgenWorld, geyserTypes, worldgenTraits } from '@oni-duplicity/game-data'
import { humanize } from '@/lib/format'
import { geyserName } from '@/lib/seed-draw/geyser-marks'
import { SEED_CLUSTERS, type SeedCluster } from '@/seed/clusters'

/** One pickable thing in a rule row: a geyser type, a world trait or an asteroid. */
export interface SeedOption {
  /** What the rule stores. */
  id: string
  label: string
  /** A second line for search and display, e.g. the element a geyser emits. */
  hint?: string
}

export const OIL_WELL = 'OilWell'

/** Geyser types the cluster's edition can generate, plus the oil reservoir. */
export function geyserOptions(edition: SeedCluster['edition']): SeedOption[] {
  const types = geyserTypes
    .filter((type) => edition === 'spaced-out' || type.requiredDlcIds.length === 0)
    .map((type) => ({ id: type.id, label: geyserName(type.id), hint: humanize(type.element) }))
  return [{ id: OIL_WELL, label: 'Oil reservoir', hint: 'Crude oil' }, ...types]
}

/**
 * World traits as the generator reports them. Spaced Out reports its own `expansion1::` copies of
 * some base traits (Volcanoes, Irregular oil, Subsurface ocean), so a rule needs the id of the
 * edition it searches.
 */
export function traitOptions(edition: SeedCluster['edition']): SeedOption[] {
  const ids = new Set(worldgenTraits.map((trait) => trait.id))
  return worldgenTraits
    .filter((trait) => {
      if (trait.id.startsWith('traits/')) {
        return edition === 'base' || !ids.has(`expansion1::${trait.id}`)
      }
      return edition === 'spaced-out' && trait.id.startsWith('expansion1::')
    })
    .map((trait) => ({ id: trait.id, label: trait.name }))
}

/** The asteroids of a cluster for the scope picker; the start asteroid comes first. */
export function asteroidOptions(prefix: string): SeedOption[] {
  const cluster = SEED_CLUSTERS.find((c) => c.prefix === prefix)
  if (!cluster) return []
  const seen = new Set<string>()
  return [...cluster.worlds]
    .sort((a, b) => Number(b.start) - Number(a.start))
    .filter((world) => !seen.has(world.id) && seen.add(world.id))
    .map((world) => ({
      id: world.id,
      label: findWorldgenWorld(world.world)?.name ?? world.id,
      hint: world.start ? 'Start' : undefined,
    }))
}

export function labelOf(options: SeedOption[], id: string): string {
  return options.find((option) => option.id === id)?.label ?? id
}

/** The ids an edition's clusters can report, for fitting a rule list to a cluster. */
export function availableIds(edition: SeedCluster['edition']) {
  return {
    traits: new Set(traitOptions(edition).map((option) => option.id)),
    geysers: new Set(geyserOptions(edition).map((option) => option.id)),
  }
}
