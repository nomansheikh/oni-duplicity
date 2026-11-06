import { useMemo, useRef, useState } from 'react'
import { useMapCanvas } from '@/components/map/useMapCanvas'
import type { DetailAsteroid, MarkerKind, SeedDetail } from '@/seed/details/types'
import { CellTip } from './cell-tip'
import { MapToolbar, type MapMode } from './map-toolbar'
import { MarkerLayer } from './marker-layer'
import { useBiomeCanvas } from './use-biome-canvas'
import { useViewport } from './use-viewport'
import { cellAt } from './viewport-math'
import { toWorldMap } from './world-map'

interface Props {
  detail: SeedDetail
  asteroid: DetailAsteroid
  mode: MapMode
  onMode: (mode: MapMode) => void
  /** The element index dimmed around, from the legend. */
  highlight: number | null
}

const ALL_MARKERS: MarkerKind[] = ['geyser', 'oil', 'gravitas', 'notable']

/** One asteroid at full resolution, with zoom, pan, markers and a tip for the cell under the cursor. */
export function DetailMap({ detail, asteroid, mode, onMode, highlight }: Props) {
  const boxRef = useRef<HTMLDivElement>(null)
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const map = useMemo(() => toWorldMap(detail, asteroid), [detail, asteroid])
  const { view, box, zoomBy, fit, panBy } = useViewport(boxRef, map)
  const [shown, setShown] = useState<MarkerKind[]>(ALL_MARKERS)
  const [pointer, setPointer] = useState<{ x: number; y: number }>()
  const last = useRef<{ x: number; y: number }>(undefined)
  const [dragging, setDragging] = useState(false)

  useMapCanvas(canvasRef, mode === 'elements' ? map : null, 'element', highlight)
  useBiomeCanvas(canvasRef, mode === 'biomes' ? asteroid : undefined)

  const point = (event: React.PointerEvent) => {
    const rect = event.currentTarget.getBoundingClientRect()
    return { x: event.clientX - rect.left, y: event.clientY - rect.top }
  }
  const endDrag = () => {
    last.current = undefined
    setDragging(false)
  }
  const cell = pointer ? cellAt(view, pointer, map) : undefined
  const markers = asteroid.markers.filter((m) => shown.includes(m.kind))

  return (
    <div className="flex min-w-0 flex-col gap-2">
      <MapToolbar
        mode={mode}
        onMode={onMode}
        shown={shown}
        onShown={setShown}
        zoom={view.zoom}
        onZoom={zoomBy}
        onFit={fit}
      />
      <div
        ref={boxRef}
        role="application"
        aria-label={`${asteroid.id} map. Drag to pan, scroll to zoom.`}
        className="relative h-[min(72vh,48rem)] min-h-80 cursor-crosshair touch-none overflow-hidden border border-ink bg-inset select-none active:cursor-grabbing"
        onPointerDown={(event) => {
          if (event.button !== 0) return
          event.currentTarget.setPointerCapture(event.pointerId)
          last.current = point(event)
          setDragging(true)
        }}
        onPointerMove={(event) => {
          const next = point(event)
          if (last.current) {
            panBy(next.x - last.current.x, next.y - last.current.y)
            last.current = next
          }
          setPointer(next)
        }}
        onPointerUp={endDrag}
        onPointerCancel={endDrag}
        onPointerLeave={() => !dragging && setPointer(undefined)}
      >
        <canvas
          ref={canvasRef}
          className="absolute block"
          style={{
            left: view.x,
            top: view.y,
            width: map.width * view.zoom,
            height: map.height * view.zoom,
            imageRendering: 'pixelated',
          }}
        />
        <MarkerLayer markers={markers} view={view} map={map} />
        {pointer && cell && !dragging && (
          <CellTip
            cell={cell}
            at={pointer}
            boxWidth={box.width}
            map={map}
            asteroid={asteroid}
            markers={asteroid.markers}
          />
        )}
      </div>
    </div>
  )
}
