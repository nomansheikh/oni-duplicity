import { findDestinationName, humanize } from '@oni-duplicity/game-data'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import { fmt, fmtMass } from '@/lib/format'
import type { BaseStarmap } from '@/seed/details/types'
import { destinationKm, destinationMass } from './destination-math'

/** The base game's rocket destinations, nearest first, as the game's starmap screen shows them. */
export function VanillaDestinations({ starmap }: { starmap: BaseStarmap }) {
  const rows = [...starmap.destinations].sort((a, b) => a.distance - b.distance)
  return (
    <Table>
      <TableHeader>
        <TableRow>
          <TableHead>Destination</TableHead>
          <TableHead className="text-right">Distance</TableHead>
          <TableHead className="text-right">Mass</TableHead>
          <TableHead className="text-right">Recoverable</TableHead>
        </TableRow>
      </TableHeader>
      <TableBody>
        {rows.map((destination, i) => {
          const mass = destinationMass(destination.type)
          return (
            <TableRow key={i}>
              <TableCell>
                {findDestinationName(destination.type) ?? humanize(destination.type)}
              </TableCell>
              <TableCell className="text-right tabular-nums">
                {fmt(destinationKm(destination.distance), 0)} km
              </TableCell>
              <TableCell className="text-right tabular-nums">
                {mass?.total ? fmtMass(mass.total) : ''}
              </TableCell>
              <TableCell className="text-right tabular-nums">
                {mass?.recoverable ? fmtMass(mass.recoverable) : ''}
              </TableCell>
            </TableRow>
          )
        })}
      </TableBody>
    </Table>
  )
}
