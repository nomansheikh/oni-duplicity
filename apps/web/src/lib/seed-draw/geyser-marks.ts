import { findGeyser, geyserTypes } from '@oni-duplicity/game-data'
import { elementColor, type Rgb } from '@/lib/map-colors'
import type { SeedAsteroid, SeedGeyser } from '@/seed/result'

export const OIL_WELL = 'OilWell'

const STATE = { gas: 'Gas', liquid: 'Liquid', molten: 'Liquid' } as const

/** A readable name for a geyser type id, e.g. `hot_steam` becomes `Steam Vent`. */
export function geyserName(type: string): string {
  if (type === OIL_WELL) return 'Oil Reservoir'
  return findGeyser(type)?.name ?? type.replaceAll('_', ' ')
}

/** The colour of the element a geyser emits; oil is its own dark amber. */
export function geyserColor(type: string): Rgb {
  if (type === OIL_WELL) return elementColor('CrudeOil', 'Liquid')
  const entry = geyserTypes.find((t) => t.id === type)
  return entry ? elementColor(entry.element, STATE[entry.shape]) : [255, 255, 255]
}

export interface GeyserMark {
  geyser: SeedGeyser
  /** Centre in canvas pixels, y down. */
  px: number
  py: number
}

/**
 * Where a geyser lands on a canvas of `width` by `height` pixels. Geyser cells have their origin
 * at the bottom-left, the canvas at the top-left, so y flips.
 */
export function geyserMarks(asteroid: SeedAsteroid, width: number, height: number): GeyserMark[] {
  return asteroid.geysers.map((geyser) => ({
    geyser,
    px: ((geyser.x + 0.5) / asteroid.width) * width,
    py: height - ((geyser.y + 0.5) / asteroid.height) * height,
  }))
}

/** The mark nearest to a point within `radius` pixels, or undefined. */
export function markAt(
  marks: GeyserMark[],
  x: number,
  y: number,
  radius: number,
): GeyserMark | undefined {
  let best: GeyserMark | undefined
  let bestDistance = radius * radius
  for (const mark of marks) {
    const d = (mark.px - x) ** 2 + (mark.py - y) ** 2
    if (d <= bestDistance) {
      best = mark
      bestDistance = d
    }
  }
  return best
}

/** Geyser counts by type, oil reservoirs included, most common first. */
export function countGeysers(asteroid: SeedAsteroid): [string, number][] {
  const counts = new Map<string, number>()
  for (const g of asteroid.geysers) counts.set(g.type, (counts.get(g.type) ?? 0) + 1)
  return [...counts].sort((a, b) => b[1] - a[1] || a[0].localeCompare(b[0]))
}
