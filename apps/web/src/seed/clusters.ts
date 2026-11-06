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
 * The prefixes of clusters verified to generate with the bundled worldgen, and worth searching.
 * Everything else about a cluster comes from the extracted game data. Left out: the developer test
 * clusters, and the Skewed Asteroid event clusters (`KF23-*`), see `VIEW_ONLY`.
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

/**
 * The Skewed Asteroid event clusters generate with the bundled worldgen (checked on 12 seeds each
 * with the finder's own extraction; the failures are template placements, as for any cluster), but
 * a seed search is meaningless for them: both cluster yamls set `fixedCoordinate: 7`, and
 * `ColonyDestinationSelectScreen` locks the seed to 7 and disables Shuffle for them. So the viewer
 * opens their coordinates (a save made from one can show its map) and the finder does not list them.
 */
const VIEW_ONLY = new Set(['KF23-A', 'KF23-C'])

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

/** Every cluster the viewer can open: the searchable ones and the view-only ones. */
const VIEWABLE_CLUSTERS: SeedCluster[] = worldgenClusters
  .filter((cluster) => GENERATABLE.has(cluster.prefix) || VIEW_ONLY.has(cluster.prefix))
  .map((cluster): SeedCluster => ({
    prefix: cluster.prefix,
    layout: cluster.layout,
    label: cluster.name,
    requiredDlcIds: cluster.requiredDlcIds,
    tags: cluster.tags,
    worlds: cluster.worlds,
  }))

/** The clusters the finder searches, grouped as the picker shows them; within a group, in the game's menu order. */
export const SEED_CLUSTERS: SeedCluster[] = VIEWABLE_CLUSTERS.filter(
  (cluster) => !VIEW_ONLY.has(cluster.prefix),
).sort(
  (a, b) =>
    GROUP_ORDER.indexOf(clusterGroup(a)) - GROUP_ORDER.indexOf(clusterGroup(b)) ||
    Number(isSpacedOut(a)) - Number(isSpacedOut(b)),
)

/** A cluster by coordinate prefix, including the view-only ones that `SEED_CLUSTERS` leaves out. */
export function clusterByPrefix(prefix: string): SeedCluster | undefined {
  return VIEWABLE_CLUSTERS.find((cluster) => cluster.prefix === prefix)
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
