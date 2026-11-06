import { Badge } from '@/components/ui/badge'
import { fmt, fmtMass, toCelsius } from '@/lib/format'
import {
  cssColor,
  MASS_STOPS,
  massColor,
  temperatureColor,
  TEMPERATURE_STOPS,
} from '@/lib/map-colors'
import { ToggleGroup, ToggleGroupItem } from '@/components/ui/toggle-group'
import type { MapMarker, WorldMap } from '@/worker/map'

export function CellInfo({
  map,
  hover,
}: {
  map: WorldMap | null
  hover: { x: number; y: number } | null
}) {
  if (!map || !hover) {
    return (
      <div className="well px-3 py-4 type-small text-muted-foreground">
        Hover the map to inspect a cell.
      </div>
    )
  }
  const i = hover.y * map.width + hover.x
  const element = map.elements[map.cells[i]!]!
  const here = map.markers.filter(
    (m) => m.x === hover.x && hover.y - m.y >= 0 && hover.y - m.y <= 1,
  )
  return (
    <div className="well flex flex-col gap-1.5">
      <div className="flex items-center justify-between gap-2">
        <span className="truncate font-heading font-semibold">{element.name}</span>
        <Badge variant="secondary">{element.state}</Badge>
      </div>
      {element.state !== 'Vacuum' && (
        <div className="grid grid-cols-2 gap-x-3 type-small tabular-nums">
          <span className="text-muted-foreground">Mass</span>
          <span className="text-right">{fmtMass(map.mass[i]!)}</span>
          <span className="text-muted-foreground">Temperature</span>
          <span className="text-right">{fmt(toCelsius(map.temperature[i]!), 1)} °C</span>
        </div>
      )}
      <span className="type-caption text-muted-foreground tabular-nums">
        Cell {hover.x}, {hover.y}
      </span>
      {here.map((m, index) => (
        <span key={index} className="type-small">
          {m.name} <span className="text-muted-foreground">· {m.kind}</span>
        </span>
      ))}
    </div>
  )
}

export function RampLegend({ mode }: { mode: 'temperature' | 'mass' }) {
  const stops = mode === 'temperature' ? TEMPERATURE_STOPS : MASS_STOPS
  const label = (value: number) => (mode === 'temperature' ? `${value} °C` : fmtMass(10 ** value))
  const colorAt = (value: number) =>
    cssColor(mode === 'temperature' ? temperatureColor(value) : massColor(10 ** value))
  return (
    <div className="flex flex-col gap-2">
      <span className="type-label text-muted-foreground">
        {mode === 'temperature' ? 'Temperature' : 'Mass per cell (log scale)'}
      </span>
      <div className="flex flex-col border border-ink bg-legend">
        {stops.map(([value]) => (
          <div key={value} className="flex items-center gap-2 px-2 py-1 type-small tabular-nums">
            <span className="size-4 ring-1 ring-ink" style={{ background: colorAt(value) }} />
            {label(value)}
          </div>
        ))}
      </div>
    </div>
  )
}

export type MarkerKind = MapMarker['kind']

export function MarkerToggle({
  shown,
  onChange,
}: {
  shown: MarkerKind[]
  onChange: (shown: MarkerKind[]) => void
}) {
  return (
    <div className="flex flex-col gap-2">
      <span className="type-label text-muted-foreground">Markers</span>
      <ToggleGroup
        type="multiple"
        variant="outline"
        size="sm"
        value={shown}
        onValueChange={(v) => onChange(v as MarkerKind[])}
        className="w-full *:flex-1"
      >
        <ToggleGroupItem value="duplicant">Duplicants</ToggleGroupItem>
        <ToggleGroupItem value="geyser">Geysers</ToggleGroupItem>
        <ToggleGroupItem value="critter">Critters</ToggleGroupItem>
      </ToggleGroup>
    </div>
  )
}
