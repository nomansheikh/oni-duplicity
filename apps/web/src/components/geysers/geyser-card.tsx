import { SlidersHorizontal } from 'lucide-react'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader } from '@/components/ui/card'
import { Progress } from '@/components/ui/progress'
import { fmt } from '@/lib/format'
import {
  activeCycles,
  averagePerCycle,
  dormantCycles,
  eruptingSeconds,
  eruptionRate,
} from '@/lib/geyser'
import type { Edit, GeyserView } from '@/worker/model'
import { CommitInput, Hint } from '../common'
import { emitsOf } from './emits'
import { Stat } from './stat'

export function GeyserCard({
  geyser: g,
  asteroid,
  onEdit,
  onOpen,
}: {
  geyser: GeyserView
  asteroid: string
  onEdit: (edit: Edit) => void
  onOpen: () => void
}) {
  const emits = emitsOf(g.prefab)
  const active = Math.round(g.yearPercent * 100)
  return (
    <Card role="row" className="gap-0 py-0">
      <CardHeader className="items-center">
        <CommitInput
          value={g.name}
          aria-label="Geyser name"
          onCommit={(name) => onEdit({ type: 'setGeyserName', id: g.id, name })}
          className="min-w-0 flex-1"
        />
        <Badge role="cell" variant={emits ?? 'geyser'}>
          <Hint desc={g.typeDesc}>
            <span>{g.typeName}</span>
          </Hint>
        </Badge>
      </CardHeader>
      <CardContent className="flex flex-col gap-4 py-4">
        <Progress
          variant="task"
          value={active}
          dormant={100 - active}
          label="Activity cycle"
          state={`${fmt(activeCycles(g))} active / ${fmt(dormantCycles(g))} dormant cycles`}
          aria-label="Activity cycle"
        />
        <div role="cell" className="grid grid-cols-2 gap-2">
          <Stat label="While erupting" value={`${fmt(eruptionRate(g), 2)} kg/s`} />
          <Stat label="Average" value={`${fmt(averagePerCycle(g), 0)} kg/cycle`} />
          <Stat
            label="Eruption"
            value={`${fmt(eruptingSeconds(g), 0)} of ${fmt(g.iterationSeconds, 0)} s`}
          />
          <Stat label="Asteroid" value={asteroid} />
          <Stat label="Position" value={`${g.x}, ${g.y}`} />
        </div>
        <div role="cell" className="flex justify-end">
          <Button variant="ghost" size="sm" onClick={onOpen}>
            <SlidersHorizontal /> Edit
          </Button>
        </div>
      </CardContent>
    </Card>
  )
}
