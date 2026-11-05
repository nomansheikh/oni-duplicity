import { useEffect, useState } from 'react'
import { FlaskConical, Info } from 'lucide-react'
import { Badge } from '@/components/ui/badge'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Empty, EmptyDescription, EmptyHeader, EmptyTitle } from '@/components/ui/empty'
import { Progress } from '@/components/ui/progress'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import { fmt } from '@/lib/format'
import { saveClient } from '@/lib/save-client'
import type { DlcPageView, GeothermalView, DemoliorView, MixingView } from '@/worker/dlc'
import type { Edit } from '@/worker/model'
import { NumberField } from './common'
import { DlcBadge } from './dlc-badge'

export function DlcPage({ revision, onEdit }: { revision: number; onEdit: (edit: Edit) => void }) {
  const [view, setView] = useState<DlcPageView | null>(null)

  useEffect(() => {
    let cancelled = false
    void saveClient.dlc().then((next) => !cancelled && setView(next))
    return () => {
      cancelled = true
    }
  }, [revision])

  if (!view) return null
  const { demolior, mixing, geothermal } = view
  if (!demolior && !geothermal && !(mixing && view.dlcIds.length > 0)) {
    return (
      <Empty>
        <EmptyHeader>
          <EmptyTitle>Nothing DLC-specific in this save</EmptyTitle>
          <EmptyDescription>
            Sections appear here for the Prehistoric Planet impactor, the Frosty Planet geothermal
            quest, and the world mixing chosen at world generation.
          </EmptyDescription>
        </EmptyHeader>
      </Empty>
    )
  }
  return (
    <div className="flex flex-col gap-4 md:gap-6">
      {demolior && <DemoliorCard demolior={demolior} onEdit={onEdit} />}
      {geothermal && <GeothermalCard geothermal={geothermal} />}
      {mixing && view.dlcIds.length > 0 && <MixingCard mixing={mixing} />}
    </div>
  )
}

function Stat({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="flex flex-col gap-1">
      <dt className="text-xs text-muted-foreground">{label}</dt>
      <dd className="text-lg font-medium tabular-nums">{children}</dd>
    </div>
  )
}

function DemoliorCard({
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
        <CardTitle className="flex items-center gap-2">
          Demolior impact <DlcBadge id="DLC4_ID" />
          <Badge variant="outline" className="gap-1">
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
        <Progress
          value={total > 0 ? (elapsed / total) * 100 : 0}
          aria-label="Time until impact elapsed"
        />
        {demolior.durationSource === 'saved' && (
          <p className="flex items-start gap-2 text-sm text-muted-foreground">
            <Info className="mt-0.5 size-4 shrink-0" />
            The impact is {fmt(demolior.durationCycles, 1)} cycles after the event start, which
            differs from the difficulty setting. The game stored this time itself (for example for
            an imminent-impact cluster), so it is shown as saved.
          </p>
        )}
        {demolior.health && (
          <div className="flex flex-col gap-2">
            <div className="flex justify-between text-sm">
              <span className="text-muted-foreground">Impactor health (read only)</span>
              <span className="tabular-nums">
                {fmt(demolior.health.current, 0)} / {fmt(demolior.health.max, 0)}
              </span>
            </div>
            <Progress
              value={(demolior.health.current / demolior.health.max) * 100}
              aria-label="Impactor health"
            />
          </div>
        )}
        <div className="flex flex-col gap-2 border-t pt-4">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div>
              <div className="text-sm font-medium">Impact cycle</div>
              <p className="text-sm text-muted-foreground">
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
          <p className="text-sm text-muted-foreground">
            {demolior.editable
              ? demolior.travels
                ? 'Moves the event start, the impactor’s saved arrival time and its flight speed, since the game flies it by those. Not yet confirmed in game.'
                : 'Moves the event start, which sets the impact time in this save. Not yet confirmed in game.'
              : 'The impactor’s saved flight data could not be read safely, so it can’t be edited.'}
          </p>
        </div>
      </CardContent>
    </Card>
  )
}

function GeothermalCard({ geothermal }: { geothermal: GeothermalView }) {
  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          Geothermal plant <DlcBadge id="DLC2_ID" />
        </CardTitle>
        <CardDescription>
          The Frosty Planet geothermal quest, read only.{' '}
          <Badge variant="secondary">{geothermal.state}</Badge>
        </CardDescription>
      </CardHeader>
      <CardContent>
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Vent</TableHead>
              <TableHead>Progress</TableHead>
              <TableHead className="text-right">Recent mass</TableHead>
              <TableHead className="text-right">Available material</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {geothermal.vents.map((vent, index) => (
              <TableRow key={vent.id}>
                <TableCell>Vent {index + 1}</TableCell>
                <TableCell>{vent.progress}</TableCell>
                <TableCell className="text-right tabular-nums">
                  {fmt(vent.recentMass, 1)} kg
                </TableCell>
                <TableCell className="text-right tabular-nums">
                  {vent.availableItems === 0
                    ? 'None'
                    : `${fmt(vent.availableMass, 1)} kg in ${vent.availableItems}`}
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </CardContent>
    </Card>
  )
}

const KIND_LABELS = { dlc: 'DLC content', world: 'Asteroid mixing', subworld: 'Biome mixing' }

function MixingCard({ mixing }: { mixing: MixingView }) {
  return (
    <Card>
      <CardHeader>
        <CardTitle>World mixing</CardTitle>
        <CardDescription>
          The mixing chosen on the new-game screen. It only shaped world generation and can't be
          changed after the world exists.
        </CardDescription>
      </CardHeader>
      <CardContent>
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Setting</TableHead>
              <TableHead>Type</TableHead>
              <TableHead>Level</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {mixing.entries.map((entry) => (
              <TableRow key={entry.id}>
                <TableCell>{entry.name}</TableCell>
                <TableCell className="text-muted-foreground">{KIND_LABELS[entry.kind]}</TableCell>
                <TableCell>
                  <Badge variant={entry.level === 'Disabled' ? 'outline' : 'secondary'}>
                    {entry.levelName}
                  </Badge>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </CardContent>
    </Card>
  )
}
