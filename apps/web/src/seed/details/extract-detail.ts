import { worldId } from '../extract.ts'
import { markerKind } from './markers.ts'
import type { RawDetailMap, RawDetailWorld, RawGeyser } from './raw.ts'
import type {
  BaseStarmap,
  DetailAsteroid,
  DetailGeyser,
  DetailMarker,
  GeyserRoll,
  SeedDetail,
  SpacedOutStarmap,
} from './types.ts'

/** A geyser's rolled stats, or undefined when the generator did not roll all of them. */
export function geyserRoll(raw: RawGeyser): GeyserRoll | undefined {
  const { scaled_rate, scaled_iter_len, scaled_iter_pct, scaled_year_len, scaled_year_pct } = raw
  if (
    scaled_rate === undefined ||
    scaled_iter_len === undefined ||
    scaled_iter_pct === undefined ||
    scaled_year_len === undefined ||
    scaled_year_pct === undefined
  ) {
    return undefined
  }
  return {
    massPerCycle: scaled_rate,
    iterationSeconds: scaled_iter_len,
    iterationPercent: scaled_iter_pct,
    yearSeconds: scaled_year_len,
    yearPercent: scaled_year_pct,
  }
}

function markersOf(world: RawDetailWorld, geysers: DetailGeyser[]): DetailMarker[] {
  const markers: DetailMarker[] = geysers.map((g) => ({
    kind: 'geyser',
    tag: g.type,
    x: g.x,
    y: g.y,
  }))
  for (const entity of [...world.buildings, ...world.other_entities]) {
    const kind = markerKind(entity.tag)
    if (kind) markers.push({ kind, tag: entity.tag, x: entity.x, y: entity.y })
  }
  return markers
}

function asteroidOf(world: RawDetailWorld): DetailAsteroid {
  const geysers = world.geysers.map((g): DetailGeyser => {
    const roll = geyserRoll(g)
    return { type: g.type, x: g.x, y: g.y, ...(roll ? { roll } : {}) }
  })
  return {
    id: worldId(world.name),
    path: world.name,
    isStart: world.is_starting,
    width: world.width,
    height: world.height,
    traits: [...world.world_traits],
    zones: [...world.zone_table],
    cells: {
      element: world.element_idx,
      mass: world.mass,
      temperature: world.temperature,
      zone: world.zone_idx,
    },
    geysers,
    markers: markersOf(world, geysers),
  }
}

function starmapOf(map: RawDetailMap, asteroids: DetailAsteroid[]): SpacedOutStarmap | BaseStarmap {
  // A base-game seed lists rocket destinations (and still reports its one asteroid on the
  // hex grid); a Spaced Out seed has none.
  if (map.vanilla_starmap.length > 0) {
    return {
      kind: 'base',
      destinations: map.vanilla_starmap.map(({ type, distance }) => ({ type, distance })),
    }
  }
  return {
    kind: 'spaced-out',
    asteroids: map.starmap.flatMap(({ world_index, q, r }) => {
      const asteroid = asteroids[world_index]
      return asteroid ? [{ id: asteroid.id, q, r }] : []
    }),
    pois: map.starmap_pois.map((poi) => ({
      type: poi.poi_type,
      q: poi.q,
      r: poi.r,
      ...(poi.total_capacity === undefined ? {} : { capacity: poi.total_capacity }),
      ...(poi.recharge_time === undefined ? {} : { recharge: poi.recharge_time }),
    })),
  }
}

/** Everything the details view shows about one generated seed. */
export function describeMap(map: RawDetailMap, engineBuild: string): SeedDetail {
  const asteroids = map.worlds.map(asteroidOf)
  return {
    coordinate: map.coordinate,
    engineBuild,
    elements: [...map.element_table],
    asteroids,
    starmap: starmapOf(map, asteroids),
  }
}

/** The buffers behind a detail's cell grids, to hand over to the main thread. */
export function detailBuffers(detail: SeedDetail): ArrayBuffer[] {
  return detail.asteroids.flatMap((a) => [
    a.cells.element.buffer as ArrayBuffer,
    a.cells.mass.buffer as ArrayBuffer,
    a.cells.temperature.buffer as ArrayBuffer,
    a.cells.zone.buffer as ArrayBuffer,
  ])
}
