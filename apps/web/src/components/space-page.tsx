import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Progress } from '@/components/ui/progress'
import { Switch } from '@/components/ui/switch'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import { meterTone } from '@/lib/meter'
import { fmt } from '@/lib/format'
import type { DestinationView, Edit, WorldView } from '@/worker/model'
import { CommitInput, NumberField } from './common'
import { PoiTable } from './poi-table'

export function SpacePage({
  worlds,
  destinations,
  revision,
  onEdit,
}: {
  worlds: WorldView[]
  destinations: DestinationView[]
  revision: number
  onEdit: (edit: Edit) => void
}) {
  return (
    <div className="flex flex-col gap-4 md:gap-6">
      <Card>
        <CardHeader>
          <CardTitle>Asteroids</CardTitle>
          <CardDescription>
            Rename asteroids and reveal undiscovered ones on the starmap.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Name</TableHead>
                <TableHead>World</TableHead>
                <TableHead className="text-right">Size</TableHead>
                <TableHead>Status</TableHead>
                <TableHead className="text-right">Discovered</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {worlds.map((world) => (
                <TableRow key={world.id}>
                  <TableCell>
                    <CommitInput
                      value={world.name}
                      aria-label="Asteroid name"
                      className="w-52"
                      onCommit={(name) => onEdit({ type: 'setAsteroidName', id: world.id, name })}
                    />
                  </TableCell>
                  <TableCell className="type-small text-muted-foreground">
                    {world.worldType}
                  </TableCell>
                  <TableCell className="text-right tabular-nums">
                    {world.width} × {world.height}
                  </TableCell>
                  <TableCell className="space-x-1">
                    {world.startWorld && <Badge variant="warn">Start</Badge>}
                    {world.visited && <Badge variant="info">Visited</Badge>}
                  </TableCell>
                  <TableCell className="text-right">
                    <Switch
                      checked={world.discovered}
                      aria-label="Discovered"
                      onCheckedChange={(discovered) =>
                        onEdit({ type: 'setWorldDiscovered', id: world.id, discovered })
                      }
                    />
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
      <PoiTable revision={revision} onEdit={onEdit} />
      {destinations.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle>Starmap destinations</CardTitle>
            <CardDescription>
              Base-game space destinations. Set how much can still be recovered, and mark one
              discovered or fully analyzed.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Destination</TableHead>
                  <TableHead className="text-right">Distance</TableHead>
                  <TableHead>Resources</TableHead>
                  <TableHead>Recoverable mass</TableHead>
                  <TableHead className="text-right">Analysis</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {destinations.map((d) => (
                  <TableRow key={d.id} data-destination={d.id}>
                    <TableCell className="type-h3">{d.type}</TableCell>
                    <TableCell className="text-right tabular-nums">
                      {fmt(d.distance * 10000, 0)} km
                    </TableCell>
                    <TableCell>
                      <div className="flex flex-wrap gap-1">
                        {d.resources.map((r) => (
                          <Badge key={r.name} variant="outline">
                            {r.name} · {fmt(r.amount * 100, 0)}%
                          </Badge>
                        ))}
                      </div>
                    </TableCell>
                    <TableCell>
                      <MassEditor destination={d} onEdit={onEdit} />
                    </TableCell>
                    <TableCell className="text-right">
                      <AnalysisEditor destination={d} onEdit={onEdit} />
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </CardContent>
        </Card>
      )}
    </div>
  )
}

function MassEditor({
  destination: d,
  onEdit,
}: {
  destination: DestinationView
  onEdit: (edit: Edit) => void
}) {
  if (!d.mass) return <span className="text-muted-foreground">–</span>
  const { current, capacity } = d.mass
  const percent = capacity > 0 ? Math.min(100, (current / capacity) * 100) : 0
  return (
    <div className="flex min-w-72 flex-col gap-2">
      <Progress
        variant="gauge"
        tone={meterTone('amount', percent)}
        value={percent}
        aria-label={`Recoverable mass gauge of destination ${d.id}`}
      />
      <div className="flex items-center gap-2">
        <NumberField
          label={`Recoverable mass of destination ${d.id}`}
          value={current}
          min={0}
          max={capacity}
          unit="kg"
          className="w-36"
          onCommit={(mass) => onEdit({ type: 'setDestinationMass', destination: d.id, mass })}
        />
        <span className="type-caption text-muted-foreground tabular-nums">
          of {fmt(capacity, 0)}
        </span>
        <Button
          variant="outline"
          size="sm"
          disabled={current >= capacity}
          onClick={() => onEdit({ type: 'setDestinationMass', destination: d.id, mass: capacity })}
        >
          Fill
        </Button>
      </div>
    </div>
  )
}

const ANALYSIS_LABEL = { hidden: 'Hidden', discovered: 'Discovered', complete: 'Analyzed' } as const

const ANALYSIS_TONE = { hidden: 'secondary', discovered: 'info', complete: 'good' } as const

function AnalysisEditor({
  destination: d,
  onEdit,
}: {
  destination: DestinationView
  onEdit: (edit: Edit) => void
}) {
  return (
    <div className="flex items-center justify-end gap-2">
      <Badge variant={ANALYSIS_TONE[d.analysis]}>{ANALYSIS_LABEL[d.analysis]}</Badge>
      {d.analysis === 'hidden' && (
        <Button
          variant="outline"
          size="sm"
          onClick={() =>
            onEdit({ type: 'setDestinationAnalysis', destination: d.id, level: 'discovered' })
          }
        >
          Discover
        </Button>
      )}
      {d.analysis !== 'complete' && (
        <Button
          variant="outline"
          size="sm"
          onClick={() =>
            onEdit({ type: 'setDestinationAnalysis', destination: d.id, level: 'complete' })
          }
        >
          Analyze
        </Button>
      )}
    </div>
  )
}
