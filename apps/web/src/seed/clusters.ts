import {
  findWorldgenWorld,
  worldgenClusters,
  worldgenDlcs,
  type ClusterWorld,
} from '@oni-duplicity/game-data'

export const SPACED_OUT = 'EXPANSION1_ID'

/** The game's name for a DLC id, e.g. `The Frosty Planet Pack` for `DLC2_ID`. */
export const dlcName = (id: string) => worldgenDlcs.find((dlc) => dlc.id === id)?.name ?? id

/** A cluster the seed search can generate. */
export interface SeedCluster {
  /** The coordinate prefix (`ClusterLayout.GetCoordinatePrefix`), e.g. `SNDST-C`. */
  prefix: string
  /** The cluster layout path the game uses, e.g. `expansion1::clusters/SandstoneStartCluster`. */
  layout: string
  /** The game's display name for the cluster. */
  label: string
  /** DLCs the layout needs (`requiredDlcIds`); empty for a base-game cluster. */
  requiredDlcIds: string[]
  /** `clusterTags`; mixing settings forbid some of them. */
  tags: string[]
  /** Every asteroid the layout places, in layout order. */
  worlds: ClusterWorld[]
}

/**
 * The prefixes of clusters verified to generate with the bundled worldgen and to match
 * Mapsnotincluded. Everything else about a cluster comes from the extracted game data. Left out:
 * the Skewed Asteroid event clusters (`KF23-*`) and the developer test clusters.
 */
const GENERATABLE = new Set([
  ...['SNDST-A', 'FRST-A', 'HTFST-A', 'LUSH-A', 'OASIS-A', 'OCAN-A', 'BAD-A', 'S-FRZ', 'VOLCA'],
  ...['SNDST-C', 'SWMP-C', 'FRST-C'],
  ...['V-SNDST-C', 'V-FRST-C', 'V-HTFST-C', 'V-LUSH-C', 'V-OASIS-C', 'V-OCAN-C', 'V-BAD-C'],
  ...['V-SFRZ-C', 'V-SWMP-C', 'V-VOLCA-C'],
  ...['M-SWMP-C', 'M-BAD-C', 'M-FRZ-C', 'M-FLIP-C', 'M-RAD-C'],
  ...['CER-A', 'CER-C', 'V-CER-C', 'CERS-A', 'V-CERS-C', 'M-CERS-C'],
  ...['PRE-A', 'PRE-C', 'V-PRE-C', 'PRES-A', 'V-PRES-C'],
  ...['AQU-A', 'AQU-C', 'V-AQU-C'],
])

export const isSpacedOut = (cluster: SeedCluster) => cluster.requiredDlcIds.includes(SPACED_OUT)

/**
 * The content a cluster is listed under in the picker: the planet pack it comes from, else Spaced
 * Out, else the base game (`''`, the game's `VANILLA_ID`).
 */
export function clusterGroup(cluster: SeedCluster): string {
  return (
    cluster.requiredDlcIds.find((id) => id !== SPACED_OUT) ??
    (isSpacedOut(cluster) ? SPACED_OUT : '')
  )
}

/** Group order: the base game, then the DLCs in the game's order. */
const GROUP_ORDER = ['', ...worldgenDlcs.map((dlc) => dlc.id)]

/** Grouped as the picker shows them; within a group, in the game's menu order. */
export const SEED_CLUSTERS: SeedCluster[] = worldgenClusters
  .filter((cluster) => GENERATABLE.has(cluster.prefix))
  .map((cluster): SeedCluster => ({
    prefix: cluster.prefix,
    layout: cluster.layout,
    label: cluster.name,
    requiredDlcIds: cluster.requiredDlcIds,
    tags: cluster.tags,
    worlds: cluster.worlds,
  }))
  .sort(
    (a, b) =>
      GROUP_ORDER.indexOf(clusterGroup(a)) - GROUP_ORDER.indexOf(clusterGroup(b)) ||
      Number(isSpacedOut(a)) - Number(isSpacedOut(b)),
  )

export function clusterByPrefix(prefix: string): SeedCluster | undefined {
  return SEED_CLUSTERS.find((cluster) => cluster.prefix === prefix)
}

/** How many placements an asteroid remix can replace (`GetMaxNumOfGuaranteedWorldMixings`). */
export function asteroidRemixSlots(cluster: SeedCluster): number {
  return cluster.worlds.filter((world) => world.mixing).length
}

/** How many biome remixes the cluster's worlds take (`GetMaxNumOfGuaranteedSubworldMixings`). */
export function biomeRemixSlots(cluster: SeedCluster): number {
  return cluster.worlds.reduce(
    (sum, world) => sum + (findWorldgenWorld(world.world)?.subworldMixingSlots ?? 0),
    0,
  )
}
