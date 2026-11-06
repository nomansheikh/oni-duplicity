import { cn } from '@/lib/utils'
import type { SpacedOutStarmap } from '@/seed/details/types'
import { asteroidLabel } from '../../results/labels'
import { poiKind, poiName } from '../labels'
import { hexCentre, hexDisc, hexPoints, ringsFor } from './hex-geometry'
import { wrapLabel } from './wrap-label'

const SIZE = 34
const FILL = {
  asteroid: 'fill-primary/30 stroke-primary',
  start: 'fill-gold/30 stroke-gold',
  harvestable: 'fill-inset stroke-ink',
  artifact: 'fill-warn/20 stroke-warn',
  other: 'fill-destructive/20 stroke-destructive',
} as const

const KEY: { style: keyof typeof FILL; label: string }[] = [
  { style: 'start', label: 'Start asteroid' },
  { style: 'asteroid', label: 'Asteroid' },
  { style: 'harvestable', label: 'Harvestable POI' },
  { style: 'artifact', label: 'Artifact POI' },
  { style: 'other', label: 'Other POI' },
]

interface Tile {
  q: number
  r: number
  name: string
  style: keyof typeof FILL
}

/** The Spaced Out starmap: every asteroid and space POI on its hex, labelled by game name. */
export function HexStarmap({
  starmap,
  startId,
}: {
  starmap: SpacedOutStarmap
  startId: string | undefined
}) {
  const tiles: Tile[] = [
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
  const rings = ringsFor(tiles)
  const half = hexCentre({ q: 0, r: rings }, SIZE).x + SIZE * 2
  const high = rings * SIZE * 1.5 + SIZE * 2
  return (
    <div className="flex flex-col gap-2">
      <svg
        role="img"
        aria-label="Starmap"
        viewBox={`${-half} ${-high} ${half * 2} ${high * 2}`}
        className="max-h-[70vh] w-full border border-ink bg-inset"
      >
        {hexDisc(rings).map((hex) => (
          <polygon
            key={`${hex.q},${hex.r}`}
            points={hexPoints(hexCentre(hex, SIZE), SIZE - 1)}
            className="fill-none stroke-ink/40"
          />
        ))}
        {tiles.map((tile, i) => {
          const c = hexCentre(tile, SIZE)
          const lines = wrapLabel(tile.name, 10)
          return (
            <g key={i}>
              <title>{tile.name}</title>
              <polygon
                points={hexPoints(c, SIZE - 1)}
                className={cn('stroke-2', FILL[tile.style])}
              />
              <text textAnchor="middle" className="fill-foreground text-[10px]">
                {lines.map((line, j) => (
                  <tspan key={j} x={c.x} y={c.y + (j - (lines.length - 1) / 2) * 11 + 3}>
                    {line}
                  </tspan>
                ))}
              </text>
            </g>
          )
        })}
      </svg>
      <ul className="flex flex-wrap gap-x-4 gap-y-1">
        {KEY.map(({ style, label }) => (
          <li key={style} className="flex items-center gap-1.5 type-caption text-muted-foreground">
            <svg viewBox="0 0 10 10" className="size-3">
              <rect width="10" height="10" className={cn('stroke-2', FILL[style])} />
            </svg>
            {label}
          </li>
        ))}
      </ul>
    </div>
  )
}
