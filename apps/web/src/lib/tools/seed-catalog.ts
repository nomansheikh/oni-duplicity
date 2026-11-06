import { geyserTypes } from '@oni-duplicity/game-data'
import { humanize } from '@/lib/format'
import { SEED_CLUSTERS, type SeedCluster } from '@/seed/clusters'

/** One pickable thing in a rule row: a geyser type, a world trait or an asteroid. */
export interface SeedOption {
  /** What the rule stores. */
  id: string
  label: string
  /** A second line for search and display, e.g. the element a geyser emits. */
  hint?: string
}

/** `MetalRich` -> `Metal rich`. */
function words(id: string): string {
  const spaced = id.replace(/([a-z0-9])([A-Z])/g, '$1 $2').replace(/_/g, ' ')
  return spaced.charAt(0).toUpperCase() + spaced.slice(1).toLowerCase()
}

export const OIL_WELL = 'OilWell'

/** Geyser types the cluster's edition can generate, plus the oil reservoir. */
export function geyserOptions(edition: SeedCluster['edition']): SeedOption[] {
  const types = geyserTypes
    .filter((type) => edition === 'spaced-out' || type.requiredDlcIds.length === 0)
    .map((type) => ({ id: type.id, label: words(type.id), hint: humanize(type.element) }))
  return [{ id: OIL_WELL, label: 'Oil reservoir', hint: 'Crude oil' }, ...types]
}

/**
 * World traits as the generator reports them, collected by generating seeds of each edition's
 * clusters. Spaced Out reports its own `expansion1::` copies of Volcanoes, Irregular oil and
 * Subsurface ocean, so a rule needs the id of the edition it searches.
 */
const SHARED_TRAITS = [
  'traits/BouldersLarge',
  'traits/BouldersMedium',
  'traits/BouldersMixed',
  'traits/BouldersSmall',
  'traits/DeepOil',
  'traits/FrozenCore',
  'traits/GeoActive',
  'traits/GeoDormant',
  'traits/Geodes',
  'traits/GlaciersLarge',
  'traits/MagmaVents',
  'traits/MetalPoor',
  'traits/MetalRich',
  'traits/MisalignedStart',
  'traits/SlimeSplats',
]

const BASE_ONLY_TRAITS = ['traits/IrregularOil', 'traits/SubsurfaceOcean', 'traits/Volcanoes']

const SPACED_TRAITS = [
  'expansion1::traits/CrashedSatellites',
  'expansion1::traits/DistressSignal',
  'expansion1::traits/IrregularOil',
  'expansion1::traits/LushCore',
  'expansion1::traits/MetalCaves',
  'expansion1::traits/RadioactiveCrust',
  'expansion1::traits/SubsurfaceOcean',
  'expansion1::traits/Volcanoes',
]

const traitOption = (id: string): SeedOption => ({
  id,
  label: words(id.slice(id.lastIndexOf('/') + 1)),
})

export function traitOptions(edition: SeedCluster['edition']): SeedOption[] {
  return (
    edition === 'spaced-out'
      ? [...SHARED_TRAITS, ...SPACED_TRAITS]
      : [...SHARED_TRAITS, ...BASE_ONLY_TRAITS]
  ).map(traitOption)
}

/**
 * The asteroids each cluster generates, start first, from generated samples. Where a cluster
 * picks between several asteroids for a slot, only the ones seen are listed.
 */
const ASTEROIDS: Record<string, string[]> = {
  'SNDST-C': [
    'TerraMoonlet',
    'IdealLandingSite',
    'WarpOilySwamp',
    'TundraMoonlet',
    'MarshyMoonlet',
    'MooMoonlet',
    'WaterMoonlet',
    'NiobiumMoonlet',
    'RegolithMoonlet',
  ],
  'SWMP-C': [
    'SwampMoonlet',
    'MetalHeavyLandingSite',
    'OilRichWarpTarget',
    'TundraMoonlet',
    'MarshyMoonlet',
    'MooMoonlet',
    'WaterMoonlet',
    'NiobiumMoonlet',
    'RegolithMoonlet',
  ],
  'FRST-C': [
    'ForestMoonlet',
    'SwampyLandingSite',
    'OilRichWarpTarget',
    'TundraMoonlet',
    'MarshyMoonlet',
    'MooMoonlet',
    'WaterMoonlet',
    'NiobiumMoonlet',
    'RegolithMoonlet',
  ],
}

const CLASSIC_MOONS = [
  'TundraMoonlet',
  'MarshyMoonlet',
  'NiobiumMoonlet',
  'MooMoonlet',
  'WaterMoonlet',
  'MiniRegolithMoonlet',
]
const CLASSIC: Record<string, string[]> = {
  'V-SNDST-C': ['VanillaSandstoneDefault', 'MediumRadioactiveVanillaWarpPlanet'],
  'V-FRST-C': ['VanillaArboria', 'MediumSandyRadioactiveVanillaWarpPlanet'],
  'V-HTFST-C': ['VanillaAridio', 'MediumSandySwamp'],
  'V-LUSH-C': ['VanillaForestDefault', 'MediumSandyRadioactiveVanillaWarpPlanet'],
  'V-OASIS-C': ['VanillaOasis', 'MediumRadioactiveVanillaWarpPlanet'],
  'V-OCAN-C': ['VanillaOceania', 'MediumForestyWasteland'],
  'V-BAD-C': ['VanillaBadlands', 'MediumRadioactiveVanillaWarpPlanet'],
  'V-SFRZ-C': ['VanillaSandstoneFrozen', 'MediumSwampy'],
  'V-SWMP-C': ['VanillaSwampDefault', 'MediumForestyRadioactiveVanillaWarpPlanet'],
  'V-VOLCA-C': ['VanillaVolcanic', 'MediumRadioactiveVanillaWarpPlanet'],
}

/** A base-game cluster is one asteroid, named by its layout id. */
function asteroidIds(cluster: SeedCluster): string[] {
  const known = ASTEROIDS[cluster.prefix]
  if (known) return known
  const classic = CLASSIC[cluster.prefix]
  if (classic) return [...classic, ...CLASSIC_MOONS]
  return [cluster.layout.slice(cluster.layout.lastIndexOf('/') + 1)]
}

/** The asteroids of a cluster for the scope picker; the first is the start asteroid. */
export function asteroidOptions(prefix: string): SeedOption[] {
  const cluster = SEED_CLUSTERS.find((c) => c.prefix === prefix)
  if (!cluster) return []
  return asteroidIds(cluster).map((id, index) => ({
    id,
    label: words(id),
    hint: index === 0 ? 'Start' : undefined,
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
