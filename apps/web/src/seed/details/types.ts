/** What one regenerated seed holds. The search keeps only a light slice of this per result. */

/** The geyser's rolled stats; the field names match `GeyserTiming` in the geyser maths. */
export interface GeyserRoll {
  /** Kilograms per cycle while active (`scaled_rate`). */
  massPerCycle: number
  /** Seconds per eruption cycle (`scaled_iter_len`). */
  iterationSeconds: number
  /** Share of the eruption cycle spent erupting (`scaled_iter_pct`). */
  iterationPercent: number
  /** Seconds per activity cycle (`scaled_year_len`). */
  yearSeconds: number
  /** Share of the activity cycle spent active (`scaled_year_pct`). */
  yearPercent: number
}

export interface DetailGeyser {
  /** A game-data geyser type id, e.g. `salt_water`. */
  type: string
  /** Cell position inside the asteroid; the origin is the bottom-left corner. */
  x: number
  y: number
  /** Absent for a geyser the generator did not roll. */
  roll?: GeyserRoll
}

/** `geyser` and `oil` are the resource vents; the rest are placed buildings and creatures. */
export type MarkerKind = 'geyser' | 'oil' | 'gravitas' | 'notable'

export interface DetailMarker {
  kind: MarkerKind
  /** The geyser type id, or the game prefab name for everything else. */
  tag: string
  x: number
  y: number
}

/** Every cell of an asteroid, row-major from the bottom row. */
export interface DetailCells {
  /** Index into `SeedDetail.elements`. */
  element: Uint16Array
  /** Kilograms. */
  mass: Float32Array
  /** Kelvin. */
  temperature: Float32Array
  /** Index into the asteroid's `zones`; `0xffff` is the border ring outside any biome. */
  zone: Uint16Array
}

export interface DetailAsteroid {
  /** World id: the last segment of the world path, e.g. `WaterMoonlet`. */
  id: string
  path: string
  isStart: boolean
  width: number
  height: number
  traits: string[]
  /** Biome (zone type) names, indexed by `cells.zone`. */
  zones: string[]
  cells: DetailCells
  geysers: DetailGeyser[]
  markers: DetailMarker[]
}

export interface DetailPoi {
  /** The generator's type, e.g. `HarvestableSpacePOI_OrganicMassField` or `TemporalTear`. */
  type: string
  q: number
  r: number
  /** Kilograms the POI holds when full; only harvestable POIs roll one. */
  capacity?: number
  /** Seconds the POI takes to refill from empty. */
  recharge?: number
}

export interface SpacedOutStarmap {
  kind: 'spaced-out'
  /** Axial hex position of each asteroid, by `DetailAsteroid.id`. */
  asteroids: { id: string; q: number; r: number }[]
  pois: DetailPoi[]
}

export interface BaseStarmap {
  kind: 'base'
  /** Rocket destinations, nearest first. `type` is a game destination type id. */
  destinations: { type: string; distance: number }[]
}

export interface SeedDetail {
  coordinate: string
  /** The worldgen build the detail came from. */
  engineBuild: string
  /** Element ids, indexed by `cells.element`. */
  elements: string[]
  asteroids: DetailAsteroid[]
  starmap: SpacedOutStarmap | BaseStarmap
}
