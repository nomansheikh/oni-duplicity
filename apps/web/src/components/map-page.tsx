import { useEffect, useMemo, useRef, useState, type MouseEvent } from 'react'
import { Minus, Plus, Scan } from 'lucide-react'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { ButtonGroup } from '@/components/ui/button-group'
import {
  Card,
  CardAction,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card'
import { ScrollArea } from '@/components/ui/scroll-area'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { Skeleton } from '@/components/ui/skeleton'
import { ToggleGroup, ToggleGroupItem } from '@/components/ui/toggle-group'
import { fmt, fmtMass, toCelsius } from '@/lib/format'
import {
  cssColor,
  elementColor,
  MASS_STOPS,
  massColor,
  temperatureColor,
  TEMPERATURE_STOPS,
  vacuumColor,
  type Rgb,
} from '@/lib/map-colors'
import { saveClient } from '@/lib/save-client'
import { cn } from '@/lib/utils'
import type { MapMarker, WorldMap } from '@/worker/map'
import type { WorldView } from '@/worker/model'

type Mode = 'element' | 'temperature' | 'mass'
type MarkerKind = MapMarker['kind']

const ZOOMS = [1, 2, 3, 4, 6, 8, 12]

const MARKER_STYLES: Record<MarkerKind, string> = {
  duplicant: 'size-2.5 rounded-full bg-white ring-2 ring-primary',
  geyser: 'size-2.5 rotate-45 bg-amber-400 ring-2 ring-amber-900',
  critter: 'size-1.5 rounded-full bg-lime-300 ring-1 ring-lime-900',
}

export function MapPage({ worlds, revision }: { worlds: WorldView[]; revision: number }) {
  const ordered = useMemo(
    () => [...worlds].sort((a, b) => Number(b.startWorld) - Number(a.startWorld)),
    [worlds],
  )
  const [worldId, setWorldId] = useState(ordered[0]?.id ?? '')
  const [map, setMap] = useState<WorldMap | null>(null)
  // Which world `map` shows; it lags `worldId` until the new map arrives.
  const [mapWorld, setMapWorld] = useState<string | null>(null)
  const [mode, setMode] = useState<Mode>('element')
  const [zoom, setZoom] = useState(4)
  const [highlight, setHighlight] = useState<number | null>(null)
  const [shown, setShown] = useState<MarkerKind[]>(['duplicant', 'geyser'])
  const [hover, setHover] = useState<{ x: number; y: number } | null>(null)
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const scrollRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    let cancelled = false
    void saveClient.worldMap(worldId).then((next) => {
      if (cancelled) return
      setMap(next)
      setMapWorld(worldId)
      setHighlight(null)
    })
    return () => {
      cancelled = true
    }
  }, [worldId, revision])

  // Fit each world into view the first time it shows, then keep the user's zoom.
  const fittedFor = useRef<string | null>(null)
  useEffect(() => {
    const scroller = scrollRef.current
    if (!map || !scroller || !mapWorld || fittedFor.current === mapWorld) return
    fittedFor.current = mapWorld
    const fits = (z: number) =>
      z * map.width <= scroller.clientWidth - 2 && z * map.height <= scroller.clientHeight - 2
    setZoom(ZOOMS.filter(fits).pop() ?? 1)
    scroller.scrollTo(0, 0)
  }, [map, mapWorld])

  useEffect(() => {
    const canvas = canvasRef.current
    if (!map || !canvas) return
    canvas.width = map.width
    canvas.height = map.height
    const context = canvas.getContext('2d')
    if (!context) return
    const image = context.createImageData(map.width, map.height)
    const palette = map.elements.map((e) => elementColor(e.id, e.state))
    const vacuum = map.elements.map((e) => e.state === 'Vacuum')
    for (let y = 0; y < map.height; y++) {
      const row = (map.height - 1 - y) * map.width
      for (let x = 0; x < map.width; x++) {
        const i = y * map.width + x
        const element = map.cells[i]!
        let color: Rgb = vacuum[element]
          ? vacuumColor
          : mode === 'element'
            ? palette[element]!
            : mode === 'temperature'
              ? temperatureColor(toCelsius(map.temperature[i]!))
              : massColor(map.mass[i]!)
        if (highlight !== null && element !== highlight) {
          color = [color[0] * 0.2, color[1] * 0.2, color[2] * 0.2]
        }
        const p = (row + x) * 4
        image.data[p] = color[0]
        image.data[p + 1] = color[1]
        image.data[p + 2] = color[2]
        image.data[p + 3] = 255
      }
    }
    context.putImageData(image, 0, 0)
  }, [map, mode, highlight])

  const onMove = (e: MouseEvent<HTMLCanvasElement>) => {
    if (!map) return
    const rect = e.currentTarget.getBoundingClientRect()
    const x = Math.floor((e.clientX - rect.left) / zoom)
    const y = map.height - 1 - Math.floor((e.clientY - rect.top) / zoom)
    setHover(x >= 0 && y >= 0 && x < map.width && y < map.height ? { x, y } : null)
  }

  const changeZoom = (direction: 1 | -1) =>
    setZoom((z) => ZOOMS[Math.min(ZOOMS.length - 1, Math.max(0, ZOOMS.indexOf(z) + direction))]!)

  const world = ordered.find((w) => w.id === worldId)
  const totalCells = map ? map.width * map.height : 0
  const legend = map
    ? map.elements.map((e, index) => ({ ...e, index })).sort((a, b) => b.cells - a.cells)
    : []

  return (
    <Card className="gap-4">
      <CardHeader>
        <CardTitle>World map</CardTitle>
        <CardDescription>
          Every cell of the saved simulation. Read-only; hover a cell for details, click an element
          to highlight it.
        </CardDescription>
        <CardAction className="flex flex-wrap items-center gap-2">
          {ordered.length > 1 && (
            <Select value={worldId} onValueChange={setWorldId}>
              <SelectTrigger size="sm" className="w-56">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {ordered.map((w) => (
                  <SelectItem key={w.id} value={w.id}>
                    {w.name}
                    {!w.discovered && <span className="text-muted-foreground">(undiscovered)</span>}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          )}
          <ToggleGroup
            type="single"
            variant="outline"
            size="sm"
            value={mode}
            onValueChange={(v) => v && setMode(v as Mode)}
          >
            <ToggleGroupItem value="element">Elements</ToggleGroupItem>
            <ToggleGroupItem value="temperature">Temperature</ToggleGroupItem>
            <ToggleGroupItem value="mass">Mass</ToggleGroupItem>
          </ToggleGroup>
          <ButtonGroup>
            <Button
              variant="outline"
              size="icon-sm"
              aria-label="Zoom out"
              onClick={() => changeZoom(-1)}
            >
              <Minus />
            </Button>
            <Button variant="outline" size="sm" className="w-12 tabular-nums" disabled>
              {zoom}×
            </Button>
            <Button
              variant="outline"
              size="icon-sm"
              aria-label="Zoom in"
              onClick={() => changeZoom(1)}
            >
              <Plus />
            </Button>
          </ButtonGroup>
        </CardAction>
      </CardHeader>
      <CardContent className="grid gap-4 lg:grid-cols-[minmax(0,1fr)_18rem]">
        <div
          ref={scrollRef}
          className="h-[calc(100svh-15rem)] min-h-96 overflow-auto rounded-md border"
          style={{ background: cssColor(vacuumColor) }}
        >
          {map ? (
            <div
              className="relative"
              style={{ width: map.width * zoom, height: map.height * zoom }}
            >
              <canvas
                ref={canvasRef}
                className="block cursor-crosshair"
                style={{
                  width: map.width * zoom,
                  height: map.height * zoom,
                  imageRendering: 'pixelated',
                }}
                onMouseMove={onMove}
                onMouseLeave={() => setHover(null)}
              />
              {map.markers
                .filter((m) => shown.includes(m.kind))
                .map((m, i) => (
                  <span
                    key={i}
                    className={cn(
                      'pointer-events-none absolute -translate-1/2',
                      MARKER_STYLES[m.kind],
                    )}
                    style={{ left: (m.x + 0.5) * zoom, top: (map.height - m.y - 0.5) * zoom }}
                  />
                ))}
            </div>
          ) : (
            <Skeleton className="size-full" />
          )}
        </div>
        <div className="flex min-w-0 flex-col gap-4">
          <CellInfo map={map} hover={hover} />
          <div className="flex flex-col gap-2">
            <span className="text-xs font-medium text-muted-foreground">Markers</span>
            <ToggleGroup
              type="multiple"
              variant="outline"
              size="sm"
              value={shown}
              onValueChange={(v) => setShown(v as MarkerKind[])}
              className="w-full *:flex-1"
            >
              <ToggleGroupItem value="duplicant">Duplicants</ToggleGroupItem>
              <ToggleGroupItem value="geyser">Geysers</ToggleGroupItem>
              <ToggleGroupItem value="critter">Critters</ToggleGroupItem>
            </ToggleGroup>
          </div>
          {mode === 'element' ? (
            <div className="flex min-h-0 flex-col gap-2">
              <div className="flex items-center justify-between text-xs font-medium text-muted-foreground">
                <span>
                  {world?.name ?? 'World'} · {legend.length} elements
                </span>
                {highlight !== null && (
                  <Button variant="link" size="xs" onClick={() => setHighlight(null)}>
                    <Scan /> Show all
                  </Button>
                )}
              </div>
              <ScrollArea className="h-[calc(100svh-30rem)] min-h-48 rounded-md border">
                <div className="flex flex-col p-1">
                  {legend.map((e) => (
                    <button
                      key={e.index}
                      type="button"
                      onClick={() => setHighlight((h) => (h === e.index ? null : e.index))}
                      className={cn(
                        'flex items-center gap-2 rounded-md px-2 py-1.5 text-left text-sm hover:bg-muted',
                        highlight === e.index && 'bg-muted',
                      )}
                    >
                      <span
                        className="size-3 shrink-0 rounded-sm ring-1 ring-foreground/20"
                        style={{
                          background: cssColor(
                            e.state === 'Vacuum' ? vacuumColor : elementColor(e.id, e.state),
                          ),
                        }}
                      />
                      <span className="min-w-0 flex-1 truncate">{e.name}</span>
                      <span className="text-xs text-muted-foreground tabular-nums">
                        {fmt((e.cells / totalCells) * 100, 1)}%
                      </span>
                    </button>
                  ))}
                </div>
              </ScrollArea>
            </div>
          ) : (
            <RampLegend mode={mode} />
          )}
        </div>
      </CardContent>
    </Card>
  )
}

function CellInfo({
  map,
  hover,
}: {
  map: WorldMap | null
  hover: { x: number; y: number } | null
}) {
  if (!map || !hover) {
    return (
      <div className="rounded-lg border border-dashed px-3 py-4 text-sm text-muted-foreground">
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
    <div className="flex flex-col gap-1.5 rounded-lg border bg-muted/30 px-3 py-2.5">
      <div className="flex items-center justify-between gap-2">
        <span className="truncate font-heading font-semibold">{element.name}</span>
        <Badge variant="secondary">{element.state}</Badge>
      </div>
      {element.state !== 'Vacuum' && (
        <div className="grid grid-cols-2 gap-x-3 text-sm tabular-nums">
          <span className="text-muted-foreground">Mass</span>
          <span className="text-right">{fmtMass(map.mass[i]!)}</span>
          <span className="text-muted-foreground">Temperature</span>
          <span className="text-right">{fmt(toCelsius(map.temperature[i]!), 1)} °C</span>
        </div>
      )}
      <span className="text-xs text-muted-foreground tabular-nums">
        Cell {hover.x}, {hover.y}
      </span>
      {here.map((m, index) => (
        <span key={index} className="text-sm">
          {m.name} <span className="text-muted-foreground">· {m.kind}</span>
        </span>
      ))}
    </div>
  )
}

function RampLegend({ mode }: { mode: 'temperature' | 'mass' }) {
  const stops = mode === 'temperature' ? TEMPERATURE_STOPS : MASS_STOPS
  const label = (value: number) => (mode === 'temperature' ? `${value} °C` : fmtMass(10 ** value))
  const colorAt = (value: number) =>
    cssColor(mode === 'temperature' ? temperatureColor(value) : massColor(10 ** value))
  return (
    <div className="flex flex-col gap-2">
      <span className="text-xs font-medium text-muted-foreground">
        {mode === 'temperature' ? 'Temperature' : 'Mass per cell (log scale)'}
      </span>
      <div className="flex flex-col overflow-hidden rounded-md border">
        {stops.map(([value]) => (
          <div key={value} className="flex items-center gap-2 px-2 py-1 text-sm tabular-nums">
            <span className="size-3 rounded-sm" style={{ background: colorAt(value) }} />
            {label(value)}
          </div>
        ))}
      </div>
    </div>
  )
}
