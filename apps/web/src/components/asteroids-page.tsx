import { Globe } from 'lucide-react'
import { Badge } from '@/components/ui/badge'
import { Card, CardContent } from '@/components/ui/card'
import { Switch } from '@/components/ui/switch'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import type { Edit, WorldView } from '@/worker/model'
import { CommitInput } from './common'
import { EmptyState } from './empty-state'
import { PageHeader } from './page-header'

export function AsteroidsPage({
  worlds,
  onEdit,
}: {
  worlds: WorldView[]
  onEdit: (edit: Edit) => void
}) {
  return (
    <>
      <PageHeader
        title="Asteroids"
        description="Rename asteroids and reveal undiscovered ones on the starmap."
        summary={[
          { label: 'Asteroids', value: worlds.length },
          { label: 'Discovered', value: worlds.filter((w) => w.discovered).length },
        ]}
      />
      <Card>
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
              {worlds.length === 0 && (
                <TableRow className="hover:bg-transparent">
                  <TableCell colSpan={5} className="p-0">
                    <EmptyState
                      icon={Globe}
                      title="No asteroids"
                      description="This save has no asteroids. Space is very, very empty."
                    />
                  </TableCell>
                </TableRow>
              )}
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
    </>
  )
}
