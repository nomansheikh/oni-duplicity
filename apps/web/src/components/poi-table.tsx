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
import type { Edit } from '@/worker/model'
import type { PoiOverview } from '@/worker/pois'
import { ArtifactCell, Mass, Recharge, StockEditor } from './poi-cells'
import { REVEAL } from './poi-reveal'

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
      <CardContent className="flex flex-col gap-3">
        {reveal && (
          <Card variant="well" size="sm" data-testid="starmap-fog">
            <CardHeader>
              <CardTitle className="type-label">Starmap fog</CardTitle>
              <CardDescription>
                {reveal.pending === 0
                  ? `All ${fmt(reveal.cells, 0)} known cells are revealed.`
                  : `${fmt(reveal.pending, 0)} of ${fmt(reveal.cells, 0)} known cells are not revealed yet.`}
              </CardDescription>
            </CardHeader>
          </Card>
        )}
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
                    <span className="type-h3">{poi.name}</span>
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
