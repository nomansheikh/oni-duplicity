import { useEffect, useMemo, useRef, useState, type MouseEvent } from 'react'
import { Card, CardContent } from '@/components/ui/card'
import { cn } from '@/lib/utils'
import type { WorldMap } from '@/worker/map'
import type { WorldView } from '@/worker/model'
import { LoadingOverlay } from './load-states'
import { PageHeader } from './page-header'
import { MapControls } from './map/MapControls'
import { ElementLegend } from './map/ElementLegend'
import { CellInfo, RampLegend, MarkerToggle, type MarkerKind } from './map/MapPanels'
import { useMapCanvas, type Mode } from './map/useMapCanvas'
import { useWorldMap } from './map/useWorldMap'

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
  const { map, mapWorld, error, fetching } = useWorldMap(worldId, revision)
  const [mode, setMode] = useState<Mode>('element')
  const [zoom, setZoom] = useState(1)
  // The element picked in the legend, for the map it was picked on (indexes differ per map).
  const [picked, setPicked] = useState<{ map: WorldMap; index: number } | null>(null)
  const highlight = picked && picked.map === map ? picked.index : null
  const [shown, setShown] = useState<MarkerKind[]>(['duplicant', 'geyser'])
  const [hover, setHover] = useState<{ x: number; y: number } | null>(null)
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const scrollRef = useRef<HTMLDivElement>(null)

  // The zoom that fits the whole map in the pane. It is the lowest zoom, so the map can never
  // shrink into an empty pane, and it follows the pane when the window resizes.
  const [fit, setFit] = useState(1)
  const fittedFor = useRef<string | null>(null)
  useEffect(() => {
    const scroller = scrollRef.current
    if (!map || !scroller || !mapWorld) return
    const measure = () => {
      const next =
        Math.floor(
          Math.min(scroller.clientWidth / map.width, scroller.clientHeight / map.height) * 100,
        ) / 100
      if (next <= 0) return
      setFit(next)
      // Fit each world the first time it shows, then keep the user's zoom (never below the fit).
      if (fittedFor.current !== mapWorld) {
        fittedFor.current = mapWorld
        setZoom(next)
      } else {
        setZoom((z) => Math.max(z, next))
      }
    }
    measure()
    const observer = new ResizeObserver(measure)
    observer.observe(scroller)
    return () => observer.disconnect()
  }, [map, mapWorld])

  const painted = useMapCanvas(canvasRef, map, mode, highlight)
  // From the request until the canvas holds the new map: while the worker reads the world, and
  // the paint after it. The previous map, if any, stays underneath so the pane never jumps.
  const loading = fetching || (map !== null && painted !== map)

  const onMove = (e: MouseEvent<HTMLCanvasElement>) => {
    if (!map) return
    const rect = e.currentTarget.getBoundingClientRect()
    const x = Math.floor((e.clientX - rect.left) / zoom)
    const y = map.height - 1 - Math.floor((e.clientY - rect.top) / zoom)
    setHover(x >= 0 && y >= 0 && x < map.width && y < map.height ? { x, y } : null)
  }

  // Zoom steps: the fit, then every preset above it.
  const levels = useMemo(() => [fit, ...ZOOMS.filter((z) => z > fit)], [fit])
  const changeZoom = (direction: 1 | -1) =>
    setZoom((z) => {
      const here = levels.findLastIndex((level) => level <= z + 0.001)
      return levels[Math.min(levels.length - 1, Math.max(0, here + direction))]!
    })

  const world = ordered.find((w) => w.id === worldId)
  // The legend names the world it describes, which lags `world` while the next map loads.
  const shownWorld = ordered.find((w) => w.id === mapWorld)
  const totalCells = map ? map.width * map.height : 0
  const legend = map
    ? map.elements.map((e, index) => ({ ...e, index })).sort((a, b) => b.cells - a.cells)
    : []

  return (
    <>
      <PageHeader
        status="read-only"
        title="Map"
        description="Every cell of the saved simulation. Read-only; hover a cell for details, click an element to highlight it."
        actions={
          <MapControls
            worlds={ordered}
            worldId={worldId}
            onWorld={setWorldId}
            mode={mode}
            onMode={setMode}
            zoom={zoom}
            onZoom={changeZoom}
          />
        }
      />
      <Card className="gap-4">
        <CardContent className="grid gap-4 lg:grid-cols-[minmax(0,1fr)_18rem]">
          <div className="relative min-w-0" aria-busy={loading}>
            <div
              ref={scrollRef}
              className="flex h-[calc(100svh-15rem)] min-h-96 overflow-auto border border-ink bg-legend"
            >
              {map ? (
                <div
                  className="relative m-auto shrink-0"
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
              ) : error ? (
                <p className="p-4 type-small text-destructive">{error}</p>
              ) : null}
            </div>
            {loading && (
              <LoadingOverlay
                className="border border-ink"
                label={`Drawing ${world?.name ?? 'the map'}…`}
              />
            )}
          </div>
          <div className="flex min-w-0 flex-col gap-4">
            <CellInfo map={map} hover={hover} />
            <MarkerToggle shown={shown} onChange={setShown} />
            {mode === 'element' ? (
              <ElementLegend
                worldName={(shownWorld ?? world)?.name ?? 'World'}
                legend={legend}
                totalCells={totalCells}
                highlight={highlight}
                onHighlight={(index) => setPicked(map && index !== null ? { map, index } : null)}
              />
            ) : (
              <RampLegend mode={mode} />
            )}
          </div>
        </CardContent>
      </Card>
    </>
  )
}
