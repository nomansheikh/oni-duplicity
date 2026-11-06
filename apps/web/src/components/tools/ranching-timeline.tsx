import { fmt } from '@/lib/format'
import type { LifeTimeline } from '@/lib/tools/ranching-life'
import { cn } from '@/lib/utils'

interface Mark {
  at: number
  label: string
  kind: 'hatch' | 'egg' | 'death'
}

const MARK_STYLE: Record<Mark['kind'], string> = {
  hatch: 'bg-foreground',
  egg: 'bg-gold',
  death: 'bg-destructive',
}

/**
 * One line across a critter's life, in cycles: the egg incubates before day 0 (dashed), the
 * critter hatches at 0, lays an egg at each tick and dies at the end. It is a timeline, not a
 * meter: nothing on it fills up.
 */
export function LifeTimelineView({ life }: { life: LifeTimeline }) {
  const span = life.incubationCycles + life.lifespanCycles
  const pct = (cycle: number) => ((cycle + life.incubationCycles) / span) * 100
  const marks: Mark[] = [
    { at: 0, label: '0', kind: 'hatch' },
    ...life.eggAt.map<Mark>((at) => ({ at, label: fmt(at, 0), kind: 'egg' })),
    { at: life.lifespanCycles, label: fmt(life.lifespanCycles, 0), kind: 'death' },
  ]
  // Keep labels from piling up: a mark whose label would sit on the previous one goes unlabelled.
  let lastLabelled = -Infinity
  const labelled = marks.map((m) => {
    const show = pct(m.at) - lastLabelled >= 12
    if (show) lastLabelled = pct(m.at)
    return show
  })
  return (
    <div
      role="img"
      aria-label={`Life timeline in cycles: ${life.incubationCycles > 0 ? `egg incubates ${fmt(life.incubationCycles, 0)}, ` : ''}hatches at 0, ${life.lifetimeEggs} ${life.lifetimeEggs === 1 ? 'egg' : 'eggs'}, dies at ${fmt(life.lifespanCycles, 0)}`}
      className="relative mx-2 h-12"
    >
      <div
        className="absolute top-3 h-0 border-t-2 border-dashed border-muted-foreground/60"
        style={{ left: 0, width: `${pct(0)}%` }}
      />
      <div
        className="absolute top-3 h-0.5 bg-muted-foreground/60"
        style={{ left: `${pct(0)}%`, right: 0 }}
      />
      {marks.map((m, i) => (
        <div
          key={`${m.kind}-${m.at}`}
          className="absolute top-0 -translate-x-1/2"
          style={{ left: `${pct(m.at)}%` }}
        >
          <div
            className={cn('mx-auto h-6 w-1.5', m.kind === 'egg' && 'rotate-45', MARK_STYLE[m.kind])}
          />
          {labelled[i] && (
            <div className="type-caption text-center tabular-nums text-muted-foreground">
              {m.label}
            </div>
          )}
        </div>
      ))}
      {life.incubationCycles > 0 && (
        <div className="absolute -top-0.5 left-0 type-caption text-muted-foreground">
          -{fmt(life.incubationCycles, 0)}
        </div>
      )}
    </div>
  )
}
