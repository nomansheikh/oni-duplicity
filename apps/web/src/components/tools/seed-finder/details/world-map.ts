import { findElement } from '@oni-duplicity/game-data'
import type { MapElement, WorldMap } from '@/worker/map'
import type { DetailAsteroid, SeedDetail } from '@/seed/details/types'

/** An asteroid as the save map renderer reads it, so the same painter and legend draw it. */
export function toWorldMap(detail: SeedDetail, asteroid: DetailAsteroid): WorldMap {
  const { element, mass, temperature } = asteroid.cells
  const elements: MapElement[] = detail.elements.map((id) => {
    const known = findElement(id)
    return { id, name: known?.name ?? id, state: known?.state ?? 'Unknown', cells: 0, mass: 0 }
  })
  for (let i = 0; i < element.length; i++) {
    const entry = elements[element[i]!]
    if (!entry) continue
    entry.cells++
    entry.mass += mass[i]!
  }
  return {
    width: asteroid.width,
    height: asteroid.height,
    elements,
    cells: element,
    temperature,
    mass,
    markers: [],
  }
}

/** The elements that occur, most cells first, as the legend lists them. */
export function legendOf(map: WorldMap) {
  return map.elements
    .map((e, index) => ({ ...e, index }))
    .filter((e) => e.cells > 0)
    .sort((a, b) => b.cells - a.cells)
}
