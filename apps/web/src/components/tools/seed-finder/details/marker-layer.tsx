import { cn } from '@/lib/utils'
import { cssColor } from '@/lib/map-colors'
import { geyserColor } from '@/lib/seed-draw/geyser-marks'
import type { DetailMarker, MarkerKind } from '@/seed/details/types'
import { markerName } from './labels'
import { cellCentre, type Size, type View } from './viewport-math'

const SHAPE: Record<MarkerKind, string> = {
  geyser: 'size-3 rounded-full',
  oil: 'size-3 rounded-full',
  gravitas: 'size-3 bg-gold',
  notable: 'size-3 rotate-45 bg-primary',
}

function color(marker: DetailMarker): string | undefined {
  if (marker.kind === 'geyser') return cssColor(geyserColor(marker.tag))
  if (marker.kind === 'oil') return cssColor(geyserColor('OilWell'))
  return undefined
}

/** Names show once zoomed in far enough to read; the cell tip names what is under the cursor. */
const LABEL_ZOOM = 5

/** The markers over the map. */
export function MarkerLayer({
  markers,
  view,
  map,
}: {
  markers: DetailMarker[]
  view: View
  map: Size
}) {
  return (
    <>
      {markers.map((marker, i) => {
        const { x, y } = cellCentre(view, marker, map)
        const name = markerName(marker)
        const labelled = view.zoom >= LABEL_ZOOM
        return (
          <div
            key={i}
            className="pointer-events-none absolute"
            style={{ left: x, top: y }}
            title={name}
          >
            <span
              className={cn('absolute -translate-1/2 border border-ink', SHAPE[marker.kind])}
              style={{ background: color(marker) }}
            />
            {labelled && (
              <span className="type-caption absolute -mt-2.5 -translate-x-1/2 -translate-y-full border border-ink bg-tip px-1 whitespace-nowrap">
                {name}
              </span>
            )}
          </div>
        )
      })}
    </>
  )
}
