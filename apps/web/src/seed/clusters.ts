import { worldgenClusters, type ClusterWorld } from '@oni-duplicity/game-data'

/** A cluster the seed search can generate. */
export interface SeedCluster {
  /** The coordinate prefix (`ClusterLayout.GetCoordinatePrefix`), e.g. `SNDST-C`. */
  prefix: string
  /** The cluster layout path the game uses, e.g. `expansion1::clusters/SandstoneStartCluster`. */
  layout: string
  /** The game's display name for the cluster. */
  label: string
  /** `base`: the base game (no Spaced Out), `spaced-out`: needs the Spaced Out DLC. */
  edition: 'base' | 'spaced-out'
  /** Every asteroid the layout places, in layout order. */
  worlds: ClusterWorld[]
}

/**
 * The prefixes of clusters verified to generate with the bundled worldgen. Everything else about
 * a cluster comes from the extracted game data.
 */
const GENERATABLE = new Set([
  'SNDST-A',
  'FRST-A',
  'HTFST-A',
  'LUSH-A',
  'OASIS-A',
  'OCAN-A',
  'BAD-A',
  'S-FRZ',
  'VOLCA',
  'SNDST-C',
  'SWMP-C',
  'FRST-C',
  'V-SNDST-C',
  'V-FRST-C',
  'V-HTFST-C',
  'V-LUSH-C',
  'V-OASIS-C',
  'V-OCAN-C',
  'V-BAD-C',
  'V-SFRZ-C',
  'V-SWMP-C',
  'V-VOLCA-C',
])

/** Base-game clusters first, then Spaced Out ones, each in the game's menu order. */
export const SEED_CLUSTERS: SeedCluster[] = worldgenClusters
  .filter((cluster) => GENERATABLE.has(cluster.prefix))
  .map((cluster): SeedCluster => ({
    prefix: cluster.prefix,
    layout: cluster.layout,
    label: cluster.name,
    edition: cluster.requiredDlcIds.includes('EXPANSION1_ID') ? 'spaced-out' : 'base',
    worlds: cluster.worlds,
  }))
  .sort((a, b) => Number(a.edition === 'spaced-out') - Number(b.edition === 'spaced-out'))

export function clusterByPrefix(prefix: string): SeedCluster | undefined {
  return SEED_CLUSTERS.find((cluster) => cluster.prefix === prefix)
}
