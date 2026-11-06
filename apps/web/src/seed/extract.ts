import type { SeedAsteroid, SeedBiomeGrid, SeedGeyser } from './result.ts'

/** The slice of the generator's `MapData` the search reads. */
export interface RawWorld {
  name: string
  is_starting: boolean
  width: number
  height: number
  world_traits: string[]
  geysers: { type: string; x: number; y: number }[]
  other_entities: { tag: string; x: number; y: number }[]
  zone_idx: Uint16Array
  zone_table: string[]
}

export interface RawMap {
  coordinate: string
  worlds: RawWorld[]
  failure: unknown
}

const MAX_COLUMNS = 64
export const OUTSIDE = 255

/** Samples the zone grid down to at most `MAX_COLUMNS` columns, top row first. */
export function biomeGrid(world: RawWorld): SeedBiomeGrid {
  const step = Math.max(1, Math.ceil(world.width / MAX_COLUMNS))
  const columns = Math.ceil(world.width / step)
  const rows = Math.ceil(world.height / step)
  const cells = new Uint8Array(columns * rows)
  for (let row = 0; row < rows; row++) {
    const y = Math.max(0, world.height - 1 - Math.min(row * step + (step >> 1), world.height - 1))
    for (let column = 0; column < columns; column++) {
      const x = Math.min(column * step + (step >> 1), world.width - 1)
      const zone = world.zone_idx[y * world.width + x]
      cells[row * columns + column] = zone === undefined || zone === 0xffff ? OUTSIDE : zone
    }
  }
  return { columns, rows, palette: [...world.zone_table], cells }
}

/** World id from a world path: `expansion1::worlds/WaterMoonlet` gives `WaterMoonlet`. */
export function worldId(path: string): string {
  return path.slice(path.lastIndexOf('/') + 1)
}

export function toAsteroids(map: RawMap): SeedAsteroid[] {
  return map.worlds.map((world) => {
    const geysers: SeedGeyser[] = world.geysers.map(({ type, x, y }) => ({ type, x, y }))
    // Oil reservoirs are entities, not geysers; the exact tag skips the `Oilfloater` critters.
    for (const entity of world.other_entities) {
      if (entity.tag === 'OilWell') geysers.push({ type: 'OilWell', x: entity.x, y: entity.y })
    }
    return {
      id: worldId(world.name),
      path: world.name,
      isStart: world.is_starting,
      width: world.width,
      height: world.height,
      traits: [...world.world_traits],
      geysers,
      biomes: biomeGrid(world),
    }
  })
}
