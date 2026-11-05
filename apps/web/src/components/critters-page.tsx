import { useMemo, useState } from 'react'
import { Copy, Search, SlidersHorizontal, Trash2 } from 'lucide-react'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Progress, meterTone, type MeterKind } from '@/components/ui/progress'
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
import type { AmountView, CritterView, DuplicantEdit, Edit, WorldView } from '@/worker/model'
import { AmountGroup } from './duplicants/tabs'
import { AsteroidFilter } from './asteroid-filter'
import { asteroidName } from '@/lib/asteroid'
import { PageHeader } from './page-header'

const amount = (c: CritterView, id: string) => c.amounts.find((a) => a.id === id)?.value

/** What each amount measures, how its tone is judged, and the fallback maximum when the save has none. */
const METERS: Record<
  string,
  {
    label: string
    kind: MeterKind
    fallback?: number
    unit: string
    scale?: number
    digits?: number
  }
> = {
  // Age and wildness are worse the higher they are, so they use the stress rule.
  Age: { label: 'Age', kind: 'stress', fallback: undefined, unit: 'cycles', digits: 1 },
  Wildness: { label: 'Wildness', kind: 'stress', fallback: 100, unit: '%' },
  Fertility: { label: 'Fertility', kind: 'amount', fallback: 100, unit: '%' },
  Calories: { label: 'Calories', kind: 'amount', unit: 'kcal', scale: 1 / 1000, digits: 1 },
  HitPoints: { label: 'Health', kind: 'health', unit: 'HP' },
}

const STATE_WORDS: Record<MeterKind, [string, string, string]> = {
  amount: ['Good', 'Low', 'Critical'],
  health: ['Healthy', 'Hurt', 'Critical'],
  stress: ['Calm', 'Rising', 'High'],
}

function meterOf(a: AmountView | undefined) {
  if (!a) return null
  const spec = METERS[a.id]
  if (!spec) return null
  const max = a.max ?? spec.fallback
  if (max === undefined || max <= 0) return null
  const pct = Math.min(100, Math.max(0, (a.value / max) * 100))
  const tone = meterTone(spec.kind, pct)
  const state = STATE_WORDS[spec.kind][tone === 'good' ? 0 : tone === 'warn' ? 1 : 2]
  const scale = spec.scale ?? 1
  return {
    spec,
    tone,
    state,
    pct,
    value: a.value * scale,
    max: max * scale,
    text: `${fmt(a.value * scale, spec.digits ?? 0)} / ${fmt(max * scale, spec.digits ?? 0)} ${spec.unit}`,
  }
}

function WildnessBadge({ critter }: { critter: CritterView }) {
  const wildness = amount(critter, 'Wildness')
  if (wildness === undefined) return <span className="text-muted-foreground">—</span>
  return wildness > 0 ? (
    <Badge variant="warn">Wild {fmt(wildness, 0)}%</Badge>
  ) : (
    <Badge variant="good">Tame</Badge>
  )
}

/** A gauge with its number beneath, sized for a table cell. */
function CellGauge({ critter, id }: { critter: CritterView; id: string }) {
  const m = meterOf(critter.amounts.find((a) => a.id === id))
  if (!m) {
    const raw = amount(critter, id)
    return (
      <span className="type-small text-muted-foreground tabular-nums">
        {raw === undefined ? '—' : fmt(raw * (METERS[id]?.scale ?? 1), METERS[id]?.digits ?? 0)}
      </span>
    )
  }
  return (
    <div className="flex min-w-28 flex-col gap-1">
      <Progress
        variant="gauge"
        tone={m.tone}
        value={m.value}
        max={m.max}
        aria-label={`${critter.name} ${m.spec.label}`}
        className="h-4"
      />
      <span className="type-small text-right text-foreground tabular-nums">{m.text}</span>
    </div>
  )
}

/** The critter's vitals as the game's storage gauges, above the editable fields. */
function VitalsPanel({ critter }: { critter: CritterView }) {
  const rows = critter.amounts.map((a) => ({ a, m: meterOf(a) })).filter((r) => r.m)
  if (rows.length === 0) return null
  return (
    <Card variant="well" size="sm">
      <CardHeader>
        <CardTitle>Vitals</CardTitle>
      </CardHeader>
      <CardContent className="grid gap-4">
        {rows.map(({ a, m }) => (
          <Progress
            key={a.id}
            variant="gauge"
            tone={m!.tone}
            value={m!.value}
            max={m!.max}
            label={`${m!.spec.label}: ${m!.text}`}
            state={m!.state}
            aria-label={`${m!.spec.label} gauge`}
          />
        ))}
      </CardContent>
    </Card>
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
  worlds,
  onEdit,
}: {
  critters: CritterView[]
  worlds: WorldView[]
  onEdit: (edit: Edit) => void
}) {
  const [query, setQuery] = useState('')
  const [family, setFamily] = useState('all')
  const [asteroid, setAsteroid] = useState('all')
  const [openId, setOpenId] = useState<string | null>(null)
  const families = useMemo(() => [...new Set(critters.map((c) => c.family))].sort(), [critters])
  const visible = critters.filter(
    (c) =>
      (family === 'all' || c.family === family) &&
      (asteroid === 'all' || c.asteroid === asteroid) &&
      `${c.name} ${c.prefab}`.toLowerCase().includes(query.toLowerCase()),
  )
  const open = critters.find((c) => c.id === openId) ?? null

  return (
    <>
      <PageHeader
        title="Critters"
        description={`${critters.length} critters across ${families.length} families. Tame, clone, delete or tune their stats.`}
        actions={
          <>
            <AsteroidFilter worlds={worlds} value={asteroid} onChange={setAsteroid} />
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
          </>
        }
      />
      <Card>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Critter</TableHead>
                <TableHead>Family</TableHead>
                <TableHead>Asteroid</TableHead>
                <TableHead>Wildness</TableHead>
                <TableHead>Age</TableHead>
                <TableHead>Fertility</TableHead>
                <TableHead>Calories</TableHead>
                <TableHead>Health</TableHead>
                <TableHead className="text-right">Position</TableHead>
                <TableHead />
              </TableRow>
            </TableHeader>
            <TableBody>
              {visible.map((c) => {
                const wild = (amount(c, 'Wildness') ?? 0) > 0
                return (
                  <TableRow key={c.id}>
                    <TableCell>
                      <span className="type-h3 flex items-center gap-2 normal-case">
                        {c.name}
                        {c.baby && <Badge variant="info">Baby</Badge>}
                      </span>
                    </TableCell>
                    <TableCell>
                      <Badge variant="critter">{c.family}</Badge>
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
                      <CellGauge critter={c} id="Fertility" />
                    </TableCell>
                    <TableCell>
                      <CellGauge critter={c} id="Calories" />
                    </TableCell>
                    <TableCell>
                      <CellGauge critter={c} id="HitPoints" />
                    </TableCell>
                    <TableCell className="type-small text-right text-muted-foreground tabular-nums">
                      {c.x}, {c.y}
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
                <SheetTitle className="type-h2">{open.name}</SheetTitle>
                <SheetDescription>
                  {open.family} · at {open.x}, {open.y}
                </SheetDescription>
              </SheetHeader>
              <div className="@container/main flex flex-col gap-5 px-4 pb-4">
                <VitalsPanel critter={open} />
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
