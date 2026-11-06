import type { SpacedOutStarmap } from '@/seed/details/types'
import { asteroidLabel } from '../../results/labels'
import { poiKind, poiName } from '../labels'
import { hexCentre, ringsFor } from './hex-geometry'

export const SIZE = 38

export const FILL = {
  asteroid: 'fill-primary/30 stroke-primary',
  start: 'fill-gold/30 stroke-gold',
  harvestable: 'fill-inset stroke-ink',
  artifact: 'fill-warn/20 stroke-warn',
  other: 'fill-destructive/20 stroke-destructive',
} as const

export interface Tile {
  q: number
  r: number
  name: string
  style: keyof typeof FILL
}

/** The tiles of a starmap: its asteroids and POIs, each with the game's name. */
export function tilesOf(starmap: SpacedOutStarmap, startId: string | undefined): Tile[] {
  return [
    ...starmap.asteroids.map((a): Tile => ({
      q: a.q,
      r: a.r,
      name: asteroidLabel(a.id),
      style: a.id === startId ? 'start' : 'asteroid',
    })),
    ...starmap.pois.map((p): Tile => ({
      q: p.q,
      r: p.r,
      name: poiName(p.type),
      style: poiKind(p.type),
    })),
  ]
}

/** The size the starmap draws at one pixel per unit: big enough to read the labels. */
export function starmapSize(starmap: SpacedOutStarmap): { width: number; height: number } {
  const rings = ringsFor(tilesOf(starmap, undefined))
  return {
    width: 2 * (hexCentre({ q: 0, r: rings }, SIZE).x + SIZE * 2),
    height: 2 * (rings * SIZE * 1.5 + SIZE * 2),
  }
}
