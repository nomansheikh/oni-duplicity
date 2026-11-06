/** The slice of the generator's `MapData` the details read. */
export interface RawEntity {
  tag: string
  x: number
  y: number
}

export interface RawGeyser {
  type: string
  x: number
  y: number
  scaled_rate?: number
  scaled_iter_len?: number
  scaled_iter_pct?: number
  scaled_year_len?: number
  scaled_year_pct?: number
}

export interface RawDetailWorld {
  name: string
  is_starting: boolean
  width: number
  height: number
  world_traits: string[]
  element_idx: Uint16Array
  mass: Float32Array
  temperature: Float32Array
  zone_idx: Uint16Array
  zone_table: string[]
  geysers: RawGeyser[]
  buildings: RawEntity[]
  other_entities: RawEntity[]
}

export interface RawPoi {
  poi_type: string
  q: number
  r: number
  total_capacity?: number
  recharge_time?: number
}

export interface RawDetailMap {
  coordinate: string
  element_table: string[]
  starmap: { world_index: number; q: number; r: number }[]
  starmap_pois: RawPoi[]
  vanilla_starmap: { type: string; distance: number }[]
  worlds: RawDetailWorld[]
  failure: unknown
}
