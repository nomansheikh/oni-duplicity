import { FlaskConical, Info, TriangleAlert } from 'lucide-react'
import { Badge } from '@/components/ui/badge'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Progress } from '@/components/ui/progress'
import { fmt } from '@/lib/format'
import type { DemoliorView } from '@/worker/dlc'
import type { Edit } from '@/worker/model'
import { NumberField } from './common'
import { DlcBadge } from './dlc-badge'

function Stat({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="flex flex-col gap-1">
      <dt className="type-caption text-muted-foreground">{label}</dt>
      <dd className="type-h3 tabular-nums">{children}</dd>
    </div>
  )
}

export function DemoliorCard({
  demolior,
  onEdit,
}: {
  demolior: DemoliorView
  onEdit: (edit: Edit) => void
}) {
  const total = demolior.durationCycles
  const elapsed = Math.min(total, Math.max(0, demolior.currentCycle - demolior.eventStartCycle))
  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex flex-wrap items-center gap-2">
          Demolior impact <DlcBadge id="DLC4_ID" />
          <Badge variant="warn" className="gap-1">
            <FlaskConical className="size-3" /> Experimental
          </Badge>
        </CardTitle>
        <CardDescription>
          The asteroid that hits your colony. Cycles are counted as the game does, so cycle 1 is the
          first day.
        </CardDescription>
      </CardHeader>
      <CardContent className="flex flex-col gap-6">
        <dl className="grid grid-cols-2 gap-4 @3xl/main:grid-cols-5">
          <Stat label="Event start">Cycle {fmt(demolior.eventStartCycle, 1)}</Stat>
          <Stat label="Difficulty">
            <span title={demolior.difficulty?.id}>{demolior.difficulty?.name ?? 'Unknown'}</span>
          </Stat>
          <Stat label="Impact">Cycle {fmt(demolior.impactCycle, 1)}</Stat>
          <Stat label="Now">Cycle {fmt(demolior.currentCycle, 1)}</Stat>
          <Stat label="Remaining">{fmt(demolior.remainingCycles, 1)} cycles</Stat>
        </dl>
        <div className="flex flex-col gap-3 border-l-4 border-bad bg-bad/10 p-3">
          <div className="flex items-center gap-2 text-bad-text">
            <TriangleAlert className="size-5 shrink-0" />
            <span className="type-h3">Impact incoming</span>
          </div>
          <Progress
            variant="task"
            value={total > 0 ? (elapsed / total) * 100 : 0}
            label="Countdown to impact"
            state={`${fmt(elapsed, 1)} / ${fmt(total, 1)} cycles`}
            aria-label="Time until impact elapsed"
          />
        </div>
        {!demolior.arrivalSaved && (
          <p className="flex items-start gap-2 type-small text-muted-foreground">
            <Info className="mt-0.5 size-4 shrink-0" />
            The impact time is worked out from the difficulty setting. This save does not store it.
          </p>
        )}
        {demolior.durationSource === 'saved' && (
          <p className="flex items-start gap-2 type-small text-muted-foreground">
            <Info className="mt-0.5 size-4 shrink-0" />
            The impact is {fmt(demolior.durationCycles, 1)} cycles after the event start, which
            differs from the difficulty setting. The game stored this time itself (for example for
            an imminent-impact cluster), so it is shown as saved.
          </p>
        )}
        {demolior.health && (
          <div className="flex flex-col gap-2">
            <Progress
              variant="gauge"
              tone="bad"
              value={(demolior.health.current / demolior.health.max) * 100}
              label="Impactor health (read only)"
              state={`${fmt(demolior.health.current, 0)} / ${fmt(demolior.health.max, 0)}`}
              aria-label="Impactor health"
            />
          </div>
        )}
        <div className="well flex flex-col gap-2 p-3">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div>
              <div className="type-label">Impact cycle</div>
              <p className="type-small text-muted-foreground">
                Postpone or advance the impact. It can't be set sooner than one cycle from now.
              </p>
            </div>
            <NumberField
              label="Impact cycle"
              value={demolior.impactCycle}
              digits={1}
              min={demolior.minImpactCycle}
              disabled={!demolior.editable}
              className="w-40"
              onCommit={(impactCycle) => onEdit({ type: 'setDemoliorImpact', impactCycle })}
            />
          </div>
          <p className="type-small text-muted-foreground">
            {demolior.readOnlyReason ??
              'Moves the event start, the impactor’s saved arrival time and its flight speed, since the game flies it by those. Not yet confirmed in game.'}
          </p>
        </div>
      </CardContent>
    </Card>
  )
}
