import { Scan } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { ScrollArea } from '@/components/ui/scroll-area'
import { fmt } from '@/lib/format'
import { cssColor, elementColor, vacuumColor } from '@/lib/map-colors'
import { cn } from '@/lib/utils'
import type { WorldMap } from '@/worker/map'

export function ElementLegend({
  worldName,
  legend,
  totalCells,
  highlight,
  onHighlight,
}: {
  worldName: string
  legend: (WorldMap['elements'][number] & { index: number })[]
  totalCells: number
  highlight: number | null
  onHighlight: (index: number | null) => void
}) {
  return (
    <div className="flex min-h-0 flex-col gap-2">
      <div className="flex items-center justify-between type-label text-muted-foreground">
        <span>
          {worldName} · {legend.length} elements
        </span>
        {highlight !== null && (
          <Button variant="link" size="xs" onClick={() => onHighlight(null)}>
            <Scan /> Show all
          </Button>
        )}
      </div>
      <ScrollArea className="h-[calc(100svh-30rem)] min-h-48 border border-ink bg-legend">
        <div className="flex flex-col p-1">
          {legend.map((e) => (
            <Button
              key={e.index}
              variant="ghost"
              size="sm"
              aria-pressed={highlight === e.index}
              onClick={() => onHighlight(highlight === e.index ? null : e.index)}
              className={cn(
                'w-full justify-start gap-2 border border-transparent type-small normal-case',
                highlight === e.index && 'border-warn',
              )}
            >
              <span
                className="size-4 shrink-0 ring-1 ring-ink"
                style={{
                  background: cssColor(
                    e.state === 'Vacuum' ? vacuumColor : elementColor(e.id, e.state),
                  ),
                }}
              />
              <span className="min-w-0 flex-1 truncate text-left">{e.name}</span>
              <span className="type-caption text-muted-foreground tabular-nums">
                {fmt((e.cells / totalCells) * 100, 1)}%
              </span>
            </Button>
          ))}
        </div>
      </ScrollArea>
    </div>
  )
}
