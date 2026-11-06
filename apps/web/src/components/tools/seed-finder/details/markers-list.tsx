import { cssColor } from '@/lib/map-colors'
import { geyserColor } from '@/lib/seed-draw/geyser-marks'
import type { DetailMarker } from '@/seed/details/types'
import { markerName, MARKER_KINDS } from './labels'

function swatch(marker: DetailMarker): string | undefined {
  if (marker.kind === 'geyser') return cssColor(geyserColor(marker.tag))
  if (marker.kind === 'oil') return cssColor(geyserColor('OilWell'))
  return undefined
}

/** Every marker of an asteroid by its game name, grouped by kind, with its cell. */
export function MarkersList({ markers }: { markers: DetailMarker[] }) {
  return (
    <section className="flex flex-col gap-1.5">
      <h3 className="type-h3">Markers</h3>
      {markers.length === 0 && (
        <p className="type-small text-muted-foreground">Nothing notable is placed here.</p>
      )}
      {MARKER_KINDS.map(({ kind, label }) => {
        const group = markers
          .filter((m) => m.kind === kind)
          .sort((a, b) => markerName(a).localeCompare(markerName(b)) || a.x - b.x)
        if (group.length === 0) return null
        return (
          <div key={kind} className="flex flex-col">
            <span className="type-caption text-muted-foreground">{label}</span>
            <ul className="flex flex-col">
              {group.map((marker, i) => (
                <li key={i} className="flex items-center gap-2 type-small">
                  <span
                    className="size-2.5 shrink-0 border border-ink bg-gold"
                    style={{ background: swatch(marker) }}
                  />
                  <span className="min-w-0 flex-1 truncate">{markerName(marker)}</span>
                  <span className="type-caption text-muted-foreground tabular-nums">
                    {marker.x}, {marker.y}
                  </span>
                </li>
              ))}
            </ul>
          </div>
        )
      })}
    </section>
  )
}
