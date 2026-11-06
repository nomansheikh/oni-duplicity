import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import { fmt, fmtMass } from '@/lib/format'
import { SECONDS_PER_CYCLE } from '@/lib/tools/geyser-calc'
import type { DetailPoi } from '@/seed/details/types'
import { poiName } from '../labels'

/** The space POIs with the capacity and recharge the seed rolled for each. */
export function PoiTable({ pois }: { pois: DetailPoi[] }) {
  const rows = [...pois].sort((a, b) => poiName(a.type).localeCompare(poiName(b.type)))
  return (
    <Table>
      <TableHeader>
        <TableRow>
          <TableHead>Point of interest</TableHead>
          <TableHead className="text-right">Capacity</TableHead>
          <TableHead className="text-right">Recharge</TableHead>
          <TableHead className="text-right">Hex (q, r)</TableHead>
        </TableRow>
      </TableHeader>
      <TableBody>
        {rows.map((poi, i) => (
          <TableRow key={i}>
            <TableCell>{poiName(poi.type)}</TableCell>
            <TableCell className="text-right tabular-nums">
              {poi.capacity === undefined ? '' : fmtMass(poi.capacity)}
            </TableCell>
            <TableCell className="text-right tabular-nums">
              {poi.recharge === undefined
                ? ''
                : `${fmt(poi.recharge / SECONDS_PER_CYCLE, 1)} cycles`}
            </TableCell>
            <TableCell className="text-right text-muted-foreground tabular-nums">
              {poi.q}, {poi.r}
            </TableCell>
          </TableRow>
        ))}
      </TableBody>
    </Table>
  )
}
