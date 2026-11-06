/** A cluster the seed search can generate. */
export interface SeedCluster {
  /** The coordinate prefix (`ClusterLayout.GetCoordinatePrefix`), e.g. `SNDST-C`. */
  prefix: string
  /** The cluster layout path the game uses, e.g. `expansion1::clusters/SandstoneStartCluster`. */
  layout: string
  /** Display name derived from the layout id; the UI may relabel. */
  label: string
  /** `base`: the base game (no Spaced Out), `spaced-out`: needs the Spaced Out DLC. */
  edition: 'base' | 'spaced-out'
}

const base = (prefix: string, id: string, label: string): SeedCluster => ({
  prefix,
  layout: `clusters/${id}`,
  label,
  edition: 'base',
})
const spaced = (prefix: string, id: string, label: string): SeedCluster => ({
  prefix,
  layout: `expansion1::clusters/${id}`,
  label,
  edition: 'spaced-out',
})

/** Every cluster verified to generate with the bundled worldgen. */
export const SEED_CLUSTERS: SeedCluster[] = [
  base('SNDST-A', 'SandstoneDefault', 'Sandstone'),
  base('FRST-A', 'ForestDefault', 'Forest'),
  base('HTFST-A', 'ForestHot', 'Hot forest'),
  base('LUSH-A', 'ForestLush', 'Lush forest'),
  base('OASIS-A', 'Oasis', 'Oasis'),
  base('OCAN-A', 'Oceania', 'Oceania'),
  base('BAD-A', 'Badlands', 'Badlands'),
  base('S-FRZ', 'SandstoneFrozen', 'Frozen sandstone'),
  base('VOLCA', 'Volcanic', 'Volcanic'),
  spaced('SNDST-C', 'SandstoneStartCluster', 'Sandstone start'),
  spaced('SWMP-C', 'SwampStartCluster', 'Swamp start'),
  spaced('FRST-C', 'ForestStartCluster', 'Forest start'),
  spaced('V-SNDST-C', 'VanillaSandstoneCluster', 'Classic sandstone'),
  spaced('V-FRST-C', 'VanillaArboriaCluster', 'Classic forest'),
  spaced('V-HTFST-C', 'VanillaAridioCluster', 'Classic hot forest'),
  spaced('V-LUSH-C', 'VanillaForestCluster', 'Classic lush forest'),
  spaced('V-OASIS-C', 'VanillaOasisCluster', 'Classic oasis'),
  spaced('V-OCAN-C', 'VanillaOceaniaCluster', 'Classic oceania'),
  spaced('V-BAD-C', 'VanillaBadlandsCluster', 'Classic badlands'),
  spaced('V-SFRZ-C', 'VanillaSandstoneFrozenCluster', 'Classic frozen sandstone'),
  spaced('V-SWMP-C', 'VanillaSwampCluster', 'Classic swamp'),
  spaced('V-VOLCA-C', 'VanillaVolcanicCluster', 'Classic volcanic'),
]

export function clusterByPrefix(prefix: string): SeedCluster | undefined {
  return SEED_CLUSTERS.find((cluster) => cluster.prefix === prefix)
}
