import { useMemo, useState } from 'react'
import { Copy, Search, SlidersHorizontal, Trash2 } from 'lucide-react'
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
import { InputGroup, InputGroupAddon, InputGroupInput } from '@/components/ui/input-group'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
} from '@/components/ui/sheet'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip'
import { fmt } from '@/lib/format'
import type { CritterView, DuplicantEdit, Edit } from '@/worker/model'
import { AmountGroup } from './duplicants/tabs'

const amount = (c: CritterView, id: string) => c.amounts.find((a) => a.id === id)?.value

function WildnessBadge({ critter }: { critter: CritterView }) {
  const wildness = amount(critter, 'Wildness')
  if (wildness === undefined) return <span className="text-muted-foreground">—</span>
  return wildness > 0 ? (
    <Badge
      variant="outline"
      className="border-orange-500/40 bg-orange-500/15 text-orange-700 dark:text-orange-300"
    >
      Wild {fmt(wildness, 0)}%
    </Badge>
  ) : (
    <Badge
      variant="outline"
      className="border-emerald-500/40 bg-emerald-500/15 text-emerald-700 dark:text-emerald-300"
    >
      Tame
    </Badge>
  )
}

function IconAction({
  label,
  onClick,
  children,
}: {
  label: string
  onClick: () => void
  children: React.ReactNode
}) {
  return (
    <Tooltip>
      <TooltipTrigger asChild>
        <Button variant="ghost" size="icon-sm" aria-label={label} onClick={onClick}>
          {children}
        </Button>
      </TooltipTrigger>
      <TooltipContent>{label}</TooltipContent>
    </Tooltip>
  )
}

export function CrittersPage({
  critters,
  onEdit,
}: {
  critters: CritterView[]
  onEdit: (edit: Edit) => void
}) {
  const [query, setQuery] = useState('')
  const [family, setFamily] = useState('all')
  const [openId, setOpenId] = useState<string | null>(null)
  const families = useMemo(() => [...new Set(critters.map((c) => c.family))].sort(), [critters])
  const visible = critters.filter(
    (c) =>
      (family === 'all' || c.family === family) &&
      `${c.name} ${c.prefab}`.toLowerCase().includes(query.toLowerCase()),
  )
  const open = critters.find((c) => c.id === openId) ?? null

  return (
    <>
      <Card>
        <CardHeader>
          <CardTitle>Critters</CardTitle>
          <CardDescription>
            {critters.length} critters across {families.length} families. Tame, clone, delete or
            tune their stats.
          </CardDescription>
          <CardAction className="flex flex-wrap items-center gap-2">
            <Select value={family} onValueChange={setFamily}>
              <SelectTrigger className="w-44" aria-label="Family">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All families</SelectItem>
                {families.map((f) => (
                  <SelectItem key={f} value={f}>
                    {f}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <InputGroup className="w-56">
              <InputGroupInput
                placeholder="Search critters"
                value={query}
                onChange={(e) => setQuery(e.target.value)}
              />
              <InputGroupAddon>
                <Search />
              </InputGroupAddon>
            </InputGroup>
          </CardAction>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Critter</TableHead>
                <TableHead>Family</TableHead>
                <TableHead>Wildness</TableHead>
                <TableHead className="text-right">Age</TableHead>
                <TableHead className="text-right">Fertility</TableHead>
                <TableHead className="text-right">Calories</TableHead>
                <TableHead className="text-right">Health</TableHead>
                <TableHead className="text-right">Position</TableHead>
                <TableHead />
              </TableRow>
            </TableHeader>
            <TableBody>
              {visible.map((c) => {
                const wild = (amount(c, 'Wildness') ?? 0) > 0
                return (
                  <TableRow key={c.id}>
                    <TableCell className="font-medium">
                      <span className="flex items-center gap-2">
                        {c.name}
                        {c.baby && <Badge variant="secondary">Baby</Badge>}
                      </span>
                    </TableCell>
                    <TableCell className="text-muted-foreground">{c.family}</TableCell>
                    <TableCell>
                      <WildnessBadge critter={c} />
                    </TableCell>
                    <TableCell className="text-right tabular-nums">
                      {amount(c, 'Age') !== undefined ? `${fmt(amount(c, 'Age')!, 1)} cycles` : '—'}
                    </TableCell>
                    <TableCell className="text-right tabular-nums">
                      {amount(c, 'Fertility') !== undefined
                        ? `${fmt(amount(c, 'Fertility')!, 0)}%`
                        : '—'}
                    </TableCell>
                    <TableCell className="text-right tabular-nums">
                      {amount(c, 'Calories') !== undefined
                        ? `${fmt(amount(c, 'Calories')! / 1000, 1)} kcal`
                        : '—'}
                    </TableCell>
                    <TableCell className="text-right tabular-nums">
                      {fmt(amount(c, 'HitPoints') ?? 0, 0)}
                    </TableCell>
                    <TableCell className="text-right text-muted-foreground tabular-nums">
                      {c.x}, {c.y}
                    </TableCell>
                    <TableCell>
                      <div className="flex justify-end gap-0.5">
                        {amount(c, 'Wildness') !== undefined && (
                          <Button
                            variant="outline"
                            size="xs"
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
                        <IconAction label="Edit stats" onClick={() => setOpenId(c.id)}>
                          <SlidersHorizontal />
                        </IconAction>
                        <IconAction
                          label="Clone"
                          onClick={() => onEdit({ type: 'cloneObject', id: c.id })}
                        >
                          <Copy />
                        </IconAction>
                        <IconAction
                          label="Delete"
                          onClick={() => onEdit({ type: 'deleteObject', id: c.id })}
                        >
                          <Trash2 />
                        </IconAction>
                      </div>
                    </TableCell>
                  </TableRow>
                )
              })}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
      <Sheet open={open !== null} onOpenChange={(o) => !o && setOpenId(null)}>
        <SheetContent className="w-full sm:max-w-xl">
          {open && (
            <>
              <SheetHeader>
                <SheetTitle>{open.name}</SheetTitle>
                <SheetDescription>
                  {open.family} · at {open.x}, {open.y}
                </SheetDescription>
              </SheetHeader>
              <div className="@container/main px-4">
                <AmountGroup
                  amounts={open.amounts}
                  edit={(change: DuplicantEdit) => onEdit({ ...change, id: open.id } as Edit)}
                />
              </div>
            </>
          )}
        </SheetContent>
      </Sheet>
    </>
  )
}
