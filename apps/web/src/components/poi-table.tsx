import { useEffect, useState } from 'react'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import {
  Card,
  CardAction,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card'
import { Progress } from '@/components/ui/progress'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import { fmt, humanize } from '@/lib/format'
import { saveClient } from '@/lib/save-client'
import type { Edit } from '@/worker/model'
import type { PoiOverview, PoiView, RevealLevel } from '@/worker/pois'
import { NumberField } from './common'

const SECONDS_PER_CYCLE = 600

const cycles = (seconds: number) => fmt(seconds / SECONDS_PER_CYCLE, 0)

const REVEAL: Record<RevealLevel, { label: string; variant: 'default' | 'secondary' | 'outline' }> =
  {
    revealed: { label: 'Revealed', variant: 'default' },
    peeked: { label: 'Peeked', variant: 'secondary' },
    hidden: { label: 'Hidden', variant: 'outline' },
  }

function Mass({ poi }: { poi: PoiView }) {
  const harvest = poi.harvest
  if (!harvest) return <span className="text-muted-foreground">–</span>
  const percent = harvest.max > 0 ? Math.min(100, (harvest.current / harvest.max) * 100) : 0
  return (
    <div className="flex min-w-40 flex-col gap-1">
      <span className="tabular-nums">
        {fmt(harvest.current, 0)} / {fmt(harvest.max, 0)} kg
      </span>
      <Progress value={percent} aria-label="Stock" />
    </div>
  )
}

function Recharge({ poi }: { poi: PoiView }) {
  const harvest = poi.harvest
  if (!harvest) return <span className="text-muted-foreground">–</span>
  if (harvest.current >= harvest.max - 0.5)
    return <span className="text-muted-foreground">Full</span>
  const left = ((harvest.max - harvest.current) / harvest.max) * harvest.rechargeSeconds
  return (
    <span
      className="tabular-nums"
      title={`Refills in ${cycles(harvest.rechargeSeconds)} cycles from empty`}
    >
      {cycles(left)} cycles left
    </span>
  )
}

function ArtifactCell({ poi }: { poi: PoiView }) {
  const artifact = poi.artifact
  if (!artifact) return <span className="text-muted-foreground">–</span>
  const waiting = artifact.waiting ? humanize(artifact.waiting.replace(/^artifact_/, '')) : null
  let status: string
  if (waiting) status = 'Ready'
  else if (artifact.state === 'recharging')
    status = `${cycles(artifact.remainingSeconds)} cycles left`
  else if (artifact.state === 'waitingForPickup') status = 'Waiting for pickup'
  else status = humanize(artifact.state)
  return (
    <div className="flex flex-col">
      <span className="tabular-nums">{status}</span>
      <span className="text-xs text-muted-foreground">
        {waiting ? `${waiting} · ` : ''}
        {artifact.harvests} taken
      </span>
    </div>
  )
}

function StockEditor({ poi, onEdit }: { poi: PoiView; onEdit: (edit: Edit) => void }) {
  const harvest = poi.harvest
  if (!harvest) return <span className="text-muted-foreground">–</span>
  return (
    <div className="flex items-center gap-2">
      <NumberField
        label={`Stock of ${poi.name}`}
        value={harvest.current}
        min={0}
        max={Math.floor(harvest.max)}
        unit="kg"
        className="w-36"
        onCommit={(kg) => onEdit({ type: 'setPoiStock', id: poi.id, kg })}
      />
      <Button
        variant="outline"
        size="sm"
        disabled={harvest.current >= harvest.max - 0.5}
        onClick={() => onEdit({ type: 'setPoiStock', id: poi.id, kg: harvest.max })}
      >
        Fill
      </Button>
    </div>
  )
}

export function PoiTable({ revision, onEdit }: { revision: number; onEdit: (edit: Edit) => void }) {
  const [overview, setOverview] = useState<PoiOverview | null>(null)
  useEffect(() => {
    let cancelled = false
    void saveClient.pois().then((next) => !cancelled && setOverview(next))
    return () => {
      cancelled = true
    }
  }, [revision])

  const pois = overview?.pois
  const reveal = overview?.reveal
  if (!pois || pois.length === 0) return null
  return (
    <Card>
      <CardHeader>
        <CardTitle>Points of interest</CardTitle>
        <CardDescription>
          Harvestable fields and artifact sites on the starmap. Stock editing is experimental: it
          rewrites the POI's saved state and has not been checked in game.
        </CardDescription>
        {reveal && (
          <CardAction>
            <Button
              variant="outline"
              size="sm"
              disabled={reveal.pending === 0}
              onClick={() => onEdit({ type: 'revealStarmap' })}
            >
              {reveal.pending === 0
                ? 'Known cells revealed'
                : `Reveal known cells (${reveal.pending})`}
            </Button>
          </CardAction>
        )}
      </CardHeader>
      <CardContent>
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Type</TableHead>
              <TableHead>Location</TableHead>
              <TableHead>Stock</TableHead>
              <TableHead>Recharge</TableHead>
              <TableHead>
                Set stock <Badge variant="secondary">Experimental</Badge>
              </TableHead>
              <TableHead>Artifact</TableHead>
              <TableHead className="text-right">Discovered</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {pois.map((poi) => (
              <TableRow key={poi.id} data-poi={poi.type} data-poi-id={poi.id}>
                <TableCell>
                  <div className="flex flex-col gap-1">
                    <span className="font-medium">{poi.name}</span>
                    {poi.harvest && (
                      <div className="flex flex-wrap gap-1">
                        {poi.harvest.elements.map((e) => (
                          <Badge key={e.name} variant="outline">
                            {e.name} · {fmt(e.share * 100, 0)}%
                          </Badge>
                        ))}
                      </div>
                    )}
                  </div>
                </TableCell>
                <TableCell className="tabular-nums text-muted-foreground">
                  {poi.location.q}, {poi.location.r}
                </TableCell>
                <TableCell>
                  <Mass poi={poi} />
                </TableCell>
                <TableCell>
                  <Recharge poi={poi} />
                </TableCell>
                <TableCell>
                  <StockEditor poi={poi} onEdit={onEdit} />
                </TableCell>
                <TableCell>
                  <ArtifactCell poi={poi} />
                </TableCell>
                <TableCell className="text-right">
                  {poi.reveal ? (
                    <Badge variant={REVEAL[poi.reveal].variant}>{REVEAL[poi.reveal].label}</Badge>
                  ) : (
                    <span className="text-muted-foreground">–</span>
                  )}
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </CardContent>
    </Card>
  )
}
