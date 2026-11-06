import data from './generated/game-data.json' with { type: 'json' }

/** One placement in a cluster layout. */
export interface ClusterWorld {
  /** The world path as the generator reports it, e.g. `expansion1::worlds/TerraMoonlet`. */
  world: string
  /** The last segment of the path, which is what a seed result calls the asteroid. */
  id: string
  /** The cluster's start asteroid. */
  start: boolean
  /** The placement has a `worldMixing` block, so an asteroid remix can replace its world. */
  mixing: boolean
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
  /** `clusterTags`, e.g. `CeresCluster`; mixing settings forbid some of them. */
  tags: string[]
  menuOrder: number
  worlds: ClusterWorld[]
}

export interface WorldgenWorld {
  path: string
  id: string
  name: string
  /** How many `subworldMixingRules` the world has: the biome remix slots it offers. */
  subworldMixingSlots: number
}

export interface WorldgenTrait {
  /** As the generator reports it, e.g. `traits/MetalRich` or `expansion1::traits/Volcanoes`. */
  id: string
  name: string
  desc?: string
  /** The DLC whose worldgen folder holds the trait; empty for a base-game trait. */
  requiredDlcIds: string[]
}

/** A content DLC, from `DlcManager`. */
export interface WorldgenDlc {
  /** `EXPANSION1_ID`, `DLC2_ID`, ...: the ids clusters, geysers and mixing settings use. */
  id: string
  /** The game's name, e.g. `The Frosty Planet Pack`. */
  name: string
  /** The banner colour the game draws the name in, `#rrggbb`. */
  color: string
  /** Its folder under `StreamingAssets/dlc`. */
  directory: string
}

export type MixingKind = 'dlc' | 'world' | 'subworld'

export interface MixingLevel {
  /** The id the game stores, e.g. `GuranteeMixing` (sic). */
  id: string
  name: string
  /** The game's tooltip for the level. */
  desc?: string
  /** The digit the level adds to the coordinate's mixing code. */
  value: number
}

/** A section of the Mixing tab, with the game's header and the tooltip on it. */
export interface MixingSection {
  kind: MixingKind
  title: string
  desc: string
}

/**
 * One setting of the new-game Mixing tab: a DLC content toggle (`dlc`), an asteroid remix
 * (`world`) or a biome remix (`subworld`), from `CustomMixingSettingsConfigs`.
 */
export interface MixingSetting {
  id: string
  kind: MixingKind
  name: string
  /** The game's description: the DLC's mixing tooltip, or the remix's description. */
  desc?: string
  /** DLCs that must be in play (toggled on, or needed by the cluster) for the setting. */
  requiredDlcIds: string[]
  /** The setting's radix in the mixing code (`coordinate_range`). */
  range: number
  levels: MixingLevel[]
  /** A cluster with any of these tags cannot use the setting. */
  forbiddenClusterTags: string[]
  /** Asteroid remix only: the world it swaps in. */
  world?: string
}

export const worldgenClusters: WorldgenCluster[] = data.worldgen.clusters
export const worldgenWorlds: WorldgenWorld[] = data.worldgen.worlds
export const worldgenTraits: WorldgenTrait[] = data.worldgen.traits
/** The base game's name (`STRINGS.UI.VANILLA.NAME`). */
export const baseGameName: string = data.worldgen.baseGame
export const worldgenDlcs: WorldgenDlc[] = data.worldgen.dlcs
/** Mixing settings in the order the mixing code packs them (`GetMixingSettingsCode`). */
export const mixingSettings = data.worldgen.mixing as MixingSetting[]
/** The Mixing tab's sections in the game's order: DLC content, asteroid remix, biome remix. */
export const mixingSections = data.worldgen.mixingSections as MixingSection[]
/**
 * Every zone type id the generator can emit (`SubWorld.ZoneType`), as a seed result's biome grid
 * names them, e.g. `OilField` and `ToxicJungle`.
 */
export const zoneTypes: string[] = data.worldgen.zoneTypes

export const findWorldgenCluster = (prefix: string): WorldgenCluster | undefined =>
  worldgenClusters.find((cluster) => cluster.prefix === prefix)

/** A world by its path or by its bare id (`WaterMoonlet`); ids repeat across DLCs, paths do not. */
export const findWorldgenWorld = (key: string): WorldgenWorld | undefined =>
  worldgenWorlds.find((world) => world.path === key) ??
  worldgenWorlds.find((world) => world.id === key)

export const findWorldgenTrait = (id: string): WorldgenTrait | undefined =>
  worldgenTraits.find((trait) => trait.id === id)
