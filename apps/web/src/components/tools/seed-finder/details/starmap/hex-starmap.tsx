import { Maximize, Minus, Plus } from 'lucide-react'
import { useEffect, useRef, useState } from 'react'
import { Button } from '@/components/ui/button'
import { ButtonGroup } from '@/components/ui/button-group'
import { fmt } from '@/lib/format'
import { cn } from '@/lib/utils'
import type { SpacedOutStarmap } from '@/seed/details/types'
import { HexSvg } from './hex-svg'
import { FILL, starmapSize } from './starmap-tiles'

const KEY: { style: keyof typeof FILL; label: string }[] = [
  { style: 'start', label: 'Start asteroid' },
  { style: 'asteroid', label: 'Asteroid' },
  { style: 'harvestable', label: 'Harvestable POI' },
  { style: 'artifact', label: 'Artifact POI' },
  { style: 'other', label: 'Other POI' },
]

const MIN_ZOOM = 0.3
const MAX_ZOOM = 2.5

/**
 * The Spaced Out starmap at a size where the labels read. It scrolls and drags inside its own
 * box, zooms with the buttons or the wheel, and refits on request.
 */
export function HexStarmap({
  starmap,
  startId,
}: {
  starmap: SpacedOutStarmap
  startId: string | undefined
}) {
  const box = useRef<HTMLDivElement>(null)
  const drag = useRef<{ x: number; y: number }>(undefined)
  const [zoom, setZoom] = useState(1)
  const [dragging, setDragging] = useState(false)
  const size = starmapSize(starmap)

  // Open on the middle of the map, where the start asteroid is.
  useEffect(() => {
    const el = box.current
    if (!el) return
    el.scrollLeft = (el.scrollWidth - el.clientWidth) / 2
    el.scrollTop = (el.scrollHeight - el.clientHeight) / 2
  }, [])

  const change = (factor: number) =>
    setZoom((z) => Math.min(MAX_ZOOM, Math.max(MIN_ZOOM, z * factor)))
  const fit = () => {
    const el = box.current
    if (!el) return
    setZoom(
      Math.min(
        MAX_ZOOM,
        Math.max(MIN_ZOOM, Math.min(el.clientWidth / size.width, el.clientHeight / size.height)),
      ),
    )
  }

  return (
    <div className="flex flex-col gap-2">
      <div className="flex flex-wrap items-center gap-2">
        <p className="type-small text-muted-foreground">Drag to pan. Hover a hex for its name.</p>
        <ButtonGroup className="ml-auto">
          <Button
            variant="outline"
            size="icon-sm"
            aria-label="Zoom out"
            onClick={() => change(1 / 1.25)}
          >
            <Minus />
          </Button>
          <Button variant="outline" size="sm" className="w-14 tabular-nums" disabled>
            {fmt(zoom, 1)}×
          </Button>
          <Button
            variant="outline"
            size="icon-sm"
            aria-label="Zoom in"
            onClick={() => change(1.25)}
          >
            <Plus />
          </Button>
          <Button variant="outline" size="icon-sm" aria-label="Fit the starmap" onClick={fit}>
            <Maximize />
          </Button>
        </ButtonGroup>
      </div>
      <div
        ref={box}
        className={cn(
          'h-[min(70vh,44rem)] touch-none overflow-auto border border-ink bg-inset select-none',
          dragging ? 'cursor-grabbing' : 'cursor-grab',
        )}
        onPointerDown={(event) => {
          if (event.button !== 0) return
          event.currentTarget.setPointerCapture(event.pointerId)
          drag.current = { x: event.clientX, y: event.clientY }
          setDragging(true)
        }}
        onPointerMove={(event) => {
          if (!drag.current) return
          event.currentTarget.scrollBy(
            drag.current.x - event.clientX,
            drag.current.y - event.clientY,
          )
          drag.current = { x: event.clientX, y: event.clientY }
        }}
        onPointerUp={() => {
          drag.current = undefined
          setDragging(false)
        }}
        onPointerCancel={() => {
          drag.current = undefined
          setDragging(false)
        }}
      >
        <HexSvg starmap={starmap} startId={startId} zoom={zoom} />
      </div>
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
