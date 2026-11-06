import { cn } from '@/lib/utils'
import type { SpacedOutStarmap } from '@/seed/details/types'
import { hexCentre, hexDisc, hexPoints, ringsFor } from './hex-geometry'
import { FILL, SIZE, starmapSize, tilesOf } from './starmap-tiles'
import { wrapLabel } from './wrap-label'

/** The hex grid with every asteroid and POI on it. `zoom` scales it from its readable size. */
export function HexSvg({
  starmap,
  startId,
  zoom,
}: {
  starmap: SpacedOutStarmap
  startId: string | undefined
  zoom: number
}) {
  const tiles = tilesOf(starmap, startId)
  const rings = ringsFor(tiles)
  const { width, height } = starmapSize(starmap)
  return (
    <svg
      role="img"
      aria-label="Starmap"
      viewBox={`${-width / 2} ${-height / 2} ${width} ${height}`}
      width={width * zoom}
      height={height * zoom}
      className="block max-w-none"
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
            <polygon points={hexPoints(c, SIZE - 1)} className={cn('stroke-2', FILL[tile.style])} />
            <text textAnchor="middle" className="fill-foreground text-[11px]">
              {lines.map((line, j) => (
                <tspan key={j} x={c.x} y={c.y + (j - (lines.length - 1) / 2) * 12 + 4}>
                  {line}
                </tspan>
              ))}
            </text>
          </g>
        )
      })}
    </svg>
  )
}
