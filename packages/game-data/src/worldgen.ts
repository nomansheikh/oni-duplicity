import data from './generated/game-data.json' with { type: 'json' }

/** One placement in a cluster layout. */
export interface ClusterWorld {
  /** The world path as the generator reports it, e.g. `expansion1::worlds/TerraMoonlet`. */
  world: string
  /** The last segment of the path, which is what a seed result calls the asteroid. */
  id: string
  /** The cluster's start asteroid. */
  start: boolean
}

export interface WorldgenCluster {
  /** The layout path, e.g. `expansion1::clusters/SandstoneStartCluster`. */
  layout: string
  /** The coordinate prefix, e.g. `SNDST-C`. */
  prefix: string
  /** The English display name. */
  name: string
  requiredDlcIds: string[]
  forbiddenDlcIds: string[]
  menuOrder: number
  worlds: ClusterWorld[]
}

export interface WorldgenWorld {
  path: string
  id: string
  name: string
}

export interface WorldgenTrait {
  /** As the generator reports it, e.g. `traits/MetalRich` or `expansion1::traits/Volcanoes`. */
  id: string
  name: string
  desc?: string
}

export const worldgenClusters: WorldgenCluster[] = data.worldgen.clusters
export const worldgenWorlds: WorldgenWorld[] = data.worldgen.worlds
export const worldgenTraits: WorldgenTrait[] = data.worldgen.traits

export const findWorldgenCluster = (prefix: string): WorldgenCluster | undefined =>
  worldgenClusters.find((cluster) => cluster.prefix === prefix)

/** A world by its path or by its bare id (`WaterMoonlet`); ids repeat across DLCs, paths do not. */
export const findWorldgenWorld = (key: string): WorldgenWorld | undefined =>
  worldgenWorlds.find((world) => world.path === key) ??
  worldgenWorlds.find((world) => world.id === key)

export const findWorldgenTrait = (id: string): WorldgenTrait | undefined =>
  worldgenTraits.find((trait) => trait.id === id)
