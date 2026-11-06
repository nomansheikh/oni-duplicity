import { humanize } from '@oni-duplicity/game-data'
import { fmt } from '@/lib/format'
import { cssColor } from '@/lib/map-colors'
import { biomeColor } from '@/lib/seed-draw/biome-colors'
import type { DetailAsteroid } from '@/seed/details/types'

const OUTSIDE = 0xffff

/** The biomes of an asteroid with their share of its cells, largest first. */
export function BiomeLegend({ asteroid }: { asteroid: DetailAsteroid }) {
  const counts = new Map<number, number>()
  for (const zone of asteroid.cells.zone) counts.set(zone, (counts.get(zone) ?? 0) + 1)
  const total = asteroid.width * asteroid.height
  const rows = [...counts].filter(([zone]) => zone !== OUTSIDE).sort((a, b) => b[1] - a[1])
  return (
    <div className="flex flex-col gap-2">
      <span className="type-label text-muted-foreground">{rows.length} biomes</span>
      <ul className="flex flex-col border border-ink bg-legend p-1">
        {rows.map(([zone, count]) => {
          const name = asteroid.zones[zone] ?? 'Unknown'
          return (
            <li key={zone} className="flex items-center gap-2 px-2 py-1 type-small">
              <span
                className="size-4 shrink-0 ring-1 ring-ink"
                style={{ background: cssColor(biomeColor(name)) }}
              />
              <span className="min-w-0 flex-1 truncate">{humanize(name)}</span>
              <span className="type-caption text-muted-foreground tabular-nums">
                {fmt((count / total) * 100, 1)}%
              </span>
            </li>
          )
        })}
      </ul>
    </div>
  )
}
