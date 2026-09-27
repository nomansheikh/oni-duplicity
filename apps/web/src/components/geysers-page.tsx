import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import { fmt } from '@/lib/format'
import type { Edit, GeyserView } from '@/worker/model'
import { CommitInput, Hint } from './common'

export function GeysersPage({
  geysers,
  onEdit,
}: {
  geysers: GeyserView[]
  onEdit: (edit: Edit) => void
}) {
  return (
    <Card>
      <CardHeader>
        <CardTitle>Geysers, vents and volcanoes</CardTitle>
        <CardDescription>
          Output is per second while erupting; average includes dormancy.
        </CardDescription>
      </CardHeader>
      <CardContent>
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Name</TableHead>
              <TableHead>Type</TableHead>
              <TableHead className="text-right">While erupting</TableHead>
              <TableHead className="text-right">Eruption</TableHead>
              <TableHead className="text-right">Active / dormant</TableHead>
              <TableHead className="text-right">Average</TableHead>
              <TableHead className="text-right">Position</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {geysers.map((g) => {
              const total = g.activeCycles + g.dormancyCycles
              const average =
                g.iterationSeconds > 0 && total > 0
                  ? g.rate * (g.eruptionSeconds / g.iterationSeconds) * (g.activeCycles / total)
                  : 0
              return (
                <TableRow key={g.id}>
                  <TableCell>
                    <CommitInput
                      value={g.name}
                      aria-label="Geyser name"
                      onCommit={(name) => onEdit({ type: 'setGeyserName', id: g.id, name })}
                      className="w-56"
                    />
                  </TableCell>
                  <TableCell>
                    <Hint desc={g.typeDesc}>
                      <span className="font-medium">{g.typeName}</span>
                    </Hint>
                  </TableCell>
                  <TableCell className="text-right tabular-nums">
                    {fmt(g.rate / 1000, 2)} kg/s
                  </TableCell>
                  <TableCell className="text-right tabular-nums">
                    {fmt(g.eruptionSeconds, 0)} of {fmt(g.iterationSeconds, 0)} s
                  </TableCell>
                  <TableCell className="text-right tabular-nums">
                    {fmt(g.activeCycles)} / {fmt(g.dormancyCycles)} cycles
                  </TableCell>
                  <TableCell className="text-right tabular-nums">{fmt(average, 0)} g/s</TableCell>
                  <TableCell className="text-right text-muted-foreground tabular-nums">
                    {g.x}, {g.y}
                  </TableCell>
                </TableRow>
              )
            })}
          </TableBody>
        </Table>
      </CardContent>
    </Card>
  )
}
