import { Package, Trash2 } from 'lucide-react'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Checkbox } from '@/components/ui/checkbox'
import { ScrollArea } from '@/components/ui/scroll-area'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import { toCelsius } from '@/lib/format'
import type { Edit, MaterialItemView } from '@/worker/model'
import { Hint, NumberField } from '../common'
import { EmptyState } from '../empty-state'

export function ItemsTable({
  items,
  deletable,
  selected,
  stale,
  onSelectAll,
  onToggle,
  onDelete,
  onEdit,
}: {
  items: MaterialItemView[]
  deletable: MaterialItemView[]
  selected: Set<string>
  stale: boolean
  onSelectAll: (on: boolean) => void
  onToggle: (ref: string, on: boolean) => void
  onDelete: (items: MaterialItemView[]) => void
  onEdit: (edit: Edit) => Promise<void>
}) {
  return (
    <ScrollArea className="mt-4 min-h-0 flex-1 px-4 pb-4">
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead className="w-8">
              <Checkbox
                aria-label="Select all loose items"
                disabled={deletable.length === 0}
                checked={
                  deletable.length > 0 && deletable.every((i) => selected.has(i.ref))
                    ? true
                    : selected.size > 0
                      ? 'indeterminate'
                      : false
                }
                onCheckedChange={(on) => onSelectAll(on === true)}
              />
            </TableHead>
            <TableHead>Where</TableHead>
            <TableHead className="text-right">Position</TableHead>
            <TableHead className="text-right">Mass</TableHead>
            <TableHead className="text-right">Temperature</TableHead>
            <TableHead />
          </TableRow>
        </TableHeader>
        <TableBody>
          {items.length === 0 && (
            <TableRow className="hover:bg-transparent">
              <TableCell colSpan={8} className="p-0">
                <EmptyState
                  size="compact"
                  icon={Package}
                  title="No items"
                  description="No loose or stored items of this element."
                />
              </TableCell>
            </TableRow>
          )}
          {items.map((item) => (
            <TableRow key={item.ref}>
              <TableCell>
                {item.loose && item.instanceId !== null && !item.protected && (
                  <Checkbox
                    aria-label={`Select item at ${item.x}, ${item.y}`}
                    checked={selected.has(item.ref)}
                    onCheckedChange={(on) => onToggle(item.ref, on === true)}
                  />
                )}
              </TableCell>
              <TableCell>{item.loose ? <Badge variant="warn">Loose</Badge> : item.where}</TableCell>
              <TableCell className="text-right text-muted-foreground tabular-nums">
                {item.x}, {item.y}
              </TableCell>
              <TableCell className="text-right">
                <NumberField
                  label="Mass"
                  value={item.mass}
                  digits={1}
                  min={0}
                  unit="kg"
                  className="ml-auto w-32"
                  onCommit={(mass) => void onEdit({ type: 'setItemMass', ref: item.ref, mass })}
                />
              </TableCell>
              <TableCell className="text-right">
                <NumberField
                  label="Temperature"
                  value={toCelsius(item.temperature)}
                  digits={1}
                  unit="°C"
                  className="ml-auto w-32"
                  onCommit={(c) =>
                    void onEdit({
                      type: 'setItemTemperature',
                      ref: item.ref,
                      kelvin: c + 273.15,
                    })
                  }
                />
              </TableCell>
              <TableCell className="w-12">
                {item.loose && (
                  <Hint
                    desc={
                      item.protected
                        ? 'Marked for a move order — cancel the move in game first'
                        : undefined
                    }
                  >
                    <span className="inline-flex">
                      <Button
                        variant="destructive"
                        size="icon-sm"
                        aria-label="Delete debris"
                        disabled={stale || item.protected || item.instanceId === null}
                        onClick={() => onDelete([item])}
                      >
                        <Trash2 />
                      </Button>
                    </span>
                  </Hint>
                )}
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </ScrollArea>
  )
}
