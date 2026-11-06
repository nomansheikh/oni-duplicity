/**
 * What a seed search looks for. A rule is either `must` (a hard filter: a seed that misses it is
 * dropped) or `nice` (worth `weight` points when it matches). Rules are plain data, so they can be
 * stored, shared and sent to a worker.
 */

export type RuleMode = 'must' | 'nice'

/** Where a rule looks: the start asteroid, one named asteroid, or every asteroid in the cluster. */
export type RuleScope =
  | { kind: 'start' }
  | { kind: 'asteroid'; asteroid: string }
  | { kind: 'anywhere' }

interface RuleBase {
  /** Unique within a rule list; `SeedResult.matched` and `missed` refer to it. */
  id: string
  mode: RuleMode
  /** Points a `nice` rule adds when it matches. Ignored for `must` rules. Positive. */
  weight: number
}

/**
 * Counts geysers of one type. `geyser` is the geyser type id (`hot_steam`, `molten_iron`, ...,
 * the ids in `@oni-duplicity/game-data` `geyserTypes`), or `OilWell` for oil reservoirs, which the
 * generator lists beside the geysers. Matches when the count in `scope` is within `min`..`max`.
 */
export interface GeyserRule extends RuleBase {
  kind: 'geyser'
  geyser: string
  scope: RuleScope
  min: number
  /** Omitted: no upper bound. Use `max: 0` with `min: 0` for "none". */
  max?: number
}

/**
 * Asks whether a world trait is present (`has`) or absent (`lacks`). `trait` is the id as the
 * generator reports it, e.g. `traits/GeoActive` or `expansion1::traits/CrashedSatellites`. For a
 * `scope` that covers several asteroids, `has` needs one of them to have the trait and `lacks`
 * needs none of them to.
 */
export interface TraitRule extends RuleBase {
  kind: 'trait'
  trait: string
  presence: 'has' | 'lacks'
  scope: RuleScope
}

/**
 * The cluster contains an asteroid. `asteroid` is the world id: the last segment of its path,
 * e.g. `WaterMoonlet` for `expansion1::worlds/WaterMoonlet`.
 */
export interface AsteroidRule extends RuleBase {
  kind: 'asteroid'
  asteroid: string
}

export type SeedRule = GeyserRule | TraitRule | AsteroidRule

/** A named, ready-made rule list. */
export interface SeedPreset {
  id: string
  name: string
  description: string
  rules: SeedRule[]
}
