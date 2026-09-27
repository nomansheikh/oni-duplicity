import { Badge } from '@/components/ui/badge'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Switch } from '@/components/ui/switch'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import { fmt } from '@/lib/format'
import type { DestinationView, Edit, WorldView } from '@/worker/model'
import { CommitInput } from './common'

export function SpacePage({
  worlds,
  destinations,
  onEdit,
}: {
  worlds: WorldView[]
  destinations: DestinationView[]
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
                  <TableCell className="text-muted-foreground">{world.worldType}</TableCell>
                  <TableCell className="text-right tabular-nums">
                    {world.width} × {world.height}
                  </TableCell>
                  <TableCell className="space-x-1">
                    {world.startWorld && <Badge>Start</Badge>}
                    {world.visited && <Badge variant="secondary">Visited</Badge>}
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
      {destinations.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle>Starmap destinations</CardTitle>
            <CardDescription>
              Base-game space destinations and what can be recovered from them.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Destination</TableHead>
                  <TableHead className="text-right">Distance</TableHead>
                  <TableHead>Resources</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {destinations.map((d) => (
                  <TableRow key={d.id}>
                    <TableCell className="font-medium">{d.type}</TableCell>
                    <TableCell className="text-right tabular-nums">
                      {fmt(d.distance * 10000, 0)} km
                    </TableCell>
                    <TableCell className="flex flex-wrap gap-1">
                      {d.resources.map((r) => (
                        <Badge key={r.name} variant="outline">
                          {r.name} · {fmt(r.amount * 100, 0)}%
                        </Badge>
                      ))}
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
