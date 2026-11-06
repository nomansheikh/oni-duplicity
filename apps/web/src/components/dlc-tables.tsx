import { Badge } from '@/components/ui/badge'
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
import type { GeothermalView, MixingView } from '@/worker/dlc'
import { DlcBadge } from './dlc-badge'

export function GeothermalCard({ geothermal }: { geothermal: GeothermalView }) {
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

export function MixingCard({ mixing }: { mixing: MixingView }) {
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
