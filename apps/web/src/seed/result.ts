/** A geyser or oil reservoir. `type` is a game-data geyser type id, or `OilWell`. */
export interface SeedGeyser {
  type: string
  /** Cell position inside its asteroid; the origin is the bottom-left corner. */
  x: number
  y: number
}

/**
 * The biomes of one asteroid, downsampled for drawing. `cells` holds `columns * rows` indexes into
 * `palette`, row 0 at the top (screen order). A cell outside any biome (the border ring) is
 * `255`.
 */
export interface SeedBiomeGrid {
  columns: number
  rows: number
  /** Biome (zone type) names, e.g. `Sandstone`, `Reef`, `Space`. */
  palette: string[]
  cells: Uint8Array
}

export interface SeedAsteroid {
  /** World id: the last segment of the world path, e.g. `WaterMoonlet`. */
  id: string
  /** The full world path, e.g. `expansion1::worlds/WaterMoonlet`. */
  path: string
  isStart: boolean
  /** Size in cells. */
  width: number
  height: number
  traits: string[]
  geysers: SeedGeyser[]
  biomes: SeedBiomeGrid
}

export interface SeedResult {
  /** The full settings coordinate, ready to paste into the game. */
  coordinate: string
  seed: number
  /** The cluster's coordinate prefix. */
  prefix: string
  /** Sum of the weights of the matched `nice` rules; every `must` rule matched. */
  score: number
  /** The most a seed could score for this rule list: the sum of all `nice` weights. */
  maxScore: number
  /** Ids of the rules that matched, and of the `nice` rules that did not. */
  matched: string[]
  missed: string[]
  asteroids: SeedAsteroid[]
  /** The worldgen build the result came from, e.g. `737195`. */
  engineBuild: string
  /** Fixed text the UI can show beside results. */
  notice: string
}

/** Shown wherever results are listed. */
export function engineNotice(build: string): string {
  return `Generated with worldgen build ${build}; maps may differ slightly from your game build.`
}
