import { findDestinationName, humanize } from '@oni-duplicity/game-data'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import { fmtMass } from '@/lib/format'
import { destinationCapacity } from '@/lib/space-destinations'
import type { BaseStarmap } from '@/seed/details/types'

/** The base game's rocket destinations, nearest first, with the mass that can be recovered. */
export function VanillaDestinations({ starmap }: { starmap: BaseStarmap }) {
  const rows = [...starmap.destinations].sort((a, b) => a.distance - b.distance)
  return (
    <Table>
      <TableHeader>
        <TableRow>
          <TableHead>Destination</TableHead>
          <TableHead className="text-right">Distance</TableHead>
          <TableHead className="text-right">Recoverable mass</TableHead>
        </TableRow>
      </TableHeader>
      <TableBody>
        {rows.map((destination, i) => {
          const mass = destinationCapacity(destination.type)
          return (
            <TableRow key={i}>
              <TableCell>
                {findDestinationName(destination.type) ?? humanize(destination.type)}
              </TableCell>
              <TableCell className="text-right tabular-nums">{destination.distance}</TableCell>
              <TableCell className="text-right tabular-nums">{mass ? fmtMass(mass) : ''}</TableCell>
            </TableRow>
          )
        })}
      </TableBody>
    </Table>
  )
}
