import { Copy, SlidersHorizontal, Trash2 } from 'lucide-react'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { TableCell, TableRow } from '@/components/ui/table'
import type { CritterView, Edit, WorldView } from '@/worker/model'
import { asteroidName } from '@/lib/asteroid'
import { amount } from './meters'
import { IconAction, WildnessBadge, CellGauge } from './CritterCells'

export function CritterRow({
  critter: c,
  worlds,
  onEdit,
  onOpen,
}: {
  critter: CritterView
  worlds: WorldView[]
  onEdit: (edit: Edit) => void
  onOpen: (id: string) => void
}) {
  const wild = (amount(c, 'Wildness') ?? 0) > 0
  return (
    <TableRow key={c.id}>
      <TableCell>
        <div className="flex flex-col items-start gap-1">
          <span className="type-h3 flex items-center gap-2 normal-case">
            {c.name}
            {c.baby && <Badge variant="info">Baby</Badge>}
          </span>
          <Badge variant="critter">{c.family}</Badge>
        </div>
      </TableCell>
      <TableCell className="type-small text-muted-foreground">
        {asteroidName(worlds, c.asteroid)}
      </TableCell>
      <TableCell>
        <WildnessBadge critter={c} />
      </TableCell>
      <TableCell>
        <CellGauge critter={c} id="Age" />
      </TableCell>
      <TableCell>
        <CellGauge critter={c} id="Calories" />
      </TableCell>
      <TableCell>
        <CellGauge critter={c} id="HitPoints" />
      </TableCell>
      <TableCell>
        <div className="flex justify-end gap-0.5">
          {amount(c, 'Wildness') !== undefined && (
            <Button
              variant="outline"
              size="xs"
              className="min-w-[5.5rem]"
              onClick={() =>
                onEdit({
                  type: 'setAmount',
                  id: c.id,
                  amountId: 'Wildness',
                  value: wild ? 0 : 100,
                })
              }
            >
              {wild ? 'Tame' : 'Make wild'}
            </Button>
          )}
          <IconAction label="Edit stats" onClick={() => onOpen(c.id)}>
            <SlidersHorizontal />
          </IconAction>
          <IconAction label="Clone" onClick={() => onEdit({ type: 'cloneObject', id: c.id })}>
            <Copy />
          </IconAction>
          <IconAction label="Delete" onClick={() => onEdit({ type: 'deleteObject', id: c.id })}>
            <Trash2 />
          </IconAction>
        </div>
      </TableCell>
    </TableRow>
  )
}
