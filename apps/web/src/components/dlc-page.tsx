import { useEffect, useState } from 'react'
import { FlaskConical, Info, Package, TriangleAlert } from 'lucide-react'
import { Badge } from '@/components/ui/badge'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { EmptyState } from './empty-state'
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
import { PageHeader } from './page-header'
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
      <div className="flex flex-col gap-4 md:gap-6">
        <PageHeader
          title="Content"
          description="What this save was generated with: the Prehistoric Planet impactor, the Frosty Planet geothermal quest and the world mixing chosen at world generation."
        />
        <EmptyState
          icon={Package}
          title="Nothing DLC-specific"
          description="Sections appear here for the Prehistoric Planet impactor, the Frosty Planet geothermal quest, and the world mixing chosen at world generation."
        />
      </div>
    )
  }
  return (
    <div className="flex flex-col gap-4 md:gap-6">
      <PageHeader
        title="Content"
        description="What this save was generated with: the Prehistoric Planet impactor, the Frosty Planet geothermal quest and the world mixing chosen at world generation."
      />
      {demolior && <DemoliorCard demolior={demolior} onEdit={onEdit} />}
      {geothermal && <GeothermalCard geothermal={geothermal} />}
      {mixing && view.dlcIds.length > 0 && <MixingCard mixing={mixing} />}
    </div>
  )
}

function Stat({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="flex flex-col gap-1">
      <dt className="type-caption text-muted-foreground">{label}</dt>
      <dd className="type-h3 tabular-nums">{children}</dd>
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

function GeothermalCard({ geothermal }: { geothermal: GeothermalView }) {
  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex flex-wrap items-center gap-2">
          Geothermal plant <DlcBadge id="DLC2_ID" />
        </CardTitle>
        <CardDescription>
          The Frosty Planet geothermal quest, read only.{' '}
          <Badge variant="info">{geothermal.state}</Badge>
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
                <TableCell className="type-small text-muted-foreground">
                  {KIND_LABELS[entry.kind]}
                </TableCell>
                <TableCell>
                  <Badge variant={entry.level === 'Disabled' ? 'outline' : 'dlc'}>
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
