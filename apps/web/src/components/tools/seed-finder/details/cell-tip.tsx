import { humanize } from '@oni-duplicity/game-data'
import { fmt, fmtMass, toCelsius } from '@/lib/format'
import type { DetailAsteroid, DetailMarker } from '@/seed/details/types'
import type { WorldMap } from '@/worker/map'
import { markerName } from './labels'

const OUTSIDE = 0xffff

/** What the cursor is over, in a tip beside it. */
export function CellTip({
  cell,
  at,
  boxWidth,
  map,
  asteroid,
  markers,
}: {
  cell: { x: number; y: number }
  /** The cursor in viewport pixels. */
  at: { x: number; y: number }
  boxWidth: number
  map: WorldMap
  asteroid: DetailAsteroid
  markers: DetailMarker[]
}) {
  const i = cell.y * map.width + cell.x
  const element = map.elements[map.cells[i]!]
  const zone = asteroid.cells.zone[i]!
  const biome = zone === OUTSIDE ? 'Border' : humanize(asteroid.zones[zone] ?? 'Unknown')
  const vacuum = element?.state === 'Vacuum'
  // A geyser covers several cells and the marker sits on one of them.
  const here = markers.filter((m) => Math.abs(m.x - cell.x) <= 2 && Math.abs(m.y - cell.y) <= 2)
  return (
    <div
      className="type-caption pointer-events-none absolute z-10 flex min-w-40 flex-col gap-0.5 border border-ink bg-tip px-2 py-1"
      style={
        at.x > boxWidth - 200
          ? { right: boxWidth - at.x + 14, top: at.y + 14 }
          : { left: at.x + 14, top: at.y + 14 }
      }
    >
      <span className="text-foreground">
        {element?.name ?? 'Unknown'}
        {element && <span className="text-muted-foreground"> · {element.state}</span>}
      </span>
      {!vacuum && (
        <span className="tabular-nums">
          {fmtMass(map.mass[i]!)} · {fmt(toCelsius(map.temperature[i]!), 1)} °C
        </span>
      )}
      <span className="text-muted-foreground">{biome}</span>
      <span className="text-muted-foreground tabular-nums">
        Cell {cell.x}, {cell.y}
      </span>
      {here.map((m, index) => (
        <span key={index} className="text-gold">
          {markerName(m)}
        </span>
      ))}
    </div>
  )
}
