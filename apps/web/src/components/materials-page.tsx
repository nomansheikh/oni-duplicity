import { useEffect, useMemo, useState } from 'react'
import { Search, SlidersHorizontal, Trash2, TriangleAlert } from 'lucide-react'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Checkbox } from '@/components/ui/checkbox'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import {
  Card,
  CardAction,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card'
import { Field, FieldDescription, FieldGroup, FieldLabel } from '@/components/ui/field'
import { InputGroup, InputGroupAddon, InputGroupInput } from '@/components/ui/input-group'
import { ScrollArea } from '@/components/ui/scroll-area'
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
import { ToggleGroup, ToggleGroupItem } from '@/components/ui/toggle-group'
import { fmt, fmtMass, toCelsius } from '@/lib/format'
import { saveClient } from '@/lib/save-client'
import type { Edit, MaterialItemView, MaterialView } from '@/worker/model'
import { Hint, NumberField } from './common'

// Element states use the game's resource colours: gas cyan, liquid blue, solid tan.
const STATE_VARIANTS = { Solid: 'solid', Liquid: 'liquid', Gas: 'gas' } as const

function StateBadge({ state }: { state: string }) {
  return (
    <Badge variant={STATE_VARIANTS[state as keyof typeof STATE_VARIANTS] ?? 'secondary'}>
      {state}
    </Badge>
  )
}

// An amount as the game's resource lists show it: a bare number with its unit, and the count of
// places in a quiet caption. An empty amount is a dim dash.
function Amount({ mass, count }: { mass: number; count: number }) {
  if (count === 0) return <span className="text-muted-foreground">—</span>
  return (
    <Badge variant="bare" className="justify-end">
      {fmtMass(mass)}
      <span className="type-caption text-muted-foreground">· {count}</span>
    </Badge>
  )
}

export function MaterialsPage({
  materials,
  revision,
  onEdit,
}: {
  materials: MaterialView[]
  revision: number
  onEdit: (edit: Edit) => Promise<void>
}) {
  const [query, setQuery] = useState('')
  const [state, setState] = useState('all')
  const [openId, setOpenId] = useState<string | null>(null)
  const visible = useMemo(
    () =>
      materials.filter(
        (m) =>
          (state === 'all' || m.state === state) &&
          `${m.name} ${m.id}`.toLowerCase().includes(query.toLowerCase()),
      ),
    [materials, query, state],
  )
  const open = materials.find((m) => m.id === openId) ?? null

  return (
    <>
      <Card>
        <CardHeader>
          <CardTitle>Materials</CardTitle>
          <CardDescription>
            Loose debris and stored contents per element. Open an element to edit mass and
            temperature.
          </CardDescription>
          <CardAction className="flex flex-wrap items-center gap-2">
            <ToggleGroup
              type="single"
              variant="outline"
              size="sm"
              aria-label="Filter by state"
              value={state}
              onValueChange={(v) => setState(v || 'all')}
            >
              <ToggleGroupItem value="all">All</ToggleGroupItem>
              <ToggleGroupItem value="Solid">Solid</ToggleGroupItem>
              <ToggleGroupItem value="Liquid">Liquid</ToggleGroupItem>
              <ToggleGroupItem value="Gas">Gas</ToggleGroupItem>
            </ToggleGroup>
            <InputGroup className="w-56">
              <InputGroupInput
                placeholder="Search elements"
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
                <TableHead>Element</TableHead>
                <TableHead>State</TableHead>
                <TableHead className="text-right">Loose</TableHead>
                <TableHead className="text-right">Stored</TableHead>
                <TableHead className="text-right">Total</TableHead>
                <TableHead className="text-right">Avg. temperature</TableHead>
                <TableHead />
              </TableRow>
            </TableHeader>
            <TableBody>
              {visible.map((m) => (
                <TableRow key={m.id}>
                  <TableCell className="type-label tracking-normal normal-case">{m.name}</TableCell>
                  <TableCell>
                    <StateBadge state={m.state} />
                  </TableCell>
                  <TableCell className="text-right">
                    <Amount mass={m.looseMass} count={m.looseCount} />
                  </TableCell>
                  <TableCell className="text-right">
                    <Amount mass={m.storedMass} count={m.storedCount} />
                  </TableCell>
                  <TableCell className="text-right font-bold text-good-hi tabular-nums">
                    {fmtMass(m.looseMass + m.storedMass)}
                  </TableCell>
                  <TableCell className="text-right tabular-nums">
                    {fmt(toCelsius(m.temperature), 1)} °C
                  </TableCell>
                  <TableCell className="text-right">
                    <Button variant="outline" size="sm" onClick={() => setOpenId(m.id)}>
                      <SlidersHorizontal /> Edit
                    </Button>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
      <MaterialSheet
        material={open}
        revision={revision}
        onClose={() => setOpenId(null)}
        onEdit={onEdit}
      />
    </>
  )
}

function MaterialSheet({
  material,
  revision,
  onClose,
  onEdit,
}: {
  material: MaterialView | null
  revision: number
  onClose: () => void
  onEdit: (edit: Edit) => Promise<void>
}) {
  const [items, setItems] = useState<MaterialItemView[]>([])
  const [temperature, setTemperature] = useState('')
  const [factor, setFactor] = useState('')
  const [selected, setSelected] = useState<Set<string>>(new Set())
  const [confirm, setConfirm] = useState<'selected' | 'all' | null>(null)
  const [deleting, setDeleting] = useState(false)
  const [loadedRevision, setLoadedRevision] = useState(revision)

  useEffect(() => {
    if (!material) return
    let cancelled = false
    void saveClient.materialItems(material.id).then((list) => {
      if (cancelled) return
      setItems(list)
      setLoadedRevision(revision)
      // Deleting shifts item references, so a selection never outlives the list it was made on.
      setSelected(new Set())
    })
    return () => {
      cancelled = true
    }
  }, [material, revision])

  // Until the list for the latest revision has landed, the rows may describe a save that has
  // already changed, so nothing can be deleted from them.
  const stale = deleting || loadedRevision !== revision
  const loose = items.filter((i) => i.loose)
  const deletable = loose.filter((i) => !i.protected && i.instanceId !== null)
  const targets = confirm === 'selected' ? deletable.filter((i) => selected.has(i.ref)) : deletable
  const skipped = confirm === 'all' ? loose.length - deletable.length : 0
  const targetMass = targets.reduce((sum, i) => sum + i.mass, 0)
  const deleteItems = async (chosen: MaterialItemView[]) => {
    setDeleting(true)
    try {
      await onEdit({ type: 'deleteDebris', ids: chosen.map((i) => i.instanceId!) })
    } finally {
      setDeleting(false)
    }
  }
  const toggle = (ref: string, on: boolean) =>
    setSelected((prev) => {
      const next = new Set(prev)
      if (on) next.add(ref)
      else next.delete(ref)
      return next
    })

  return (
    <Sheet open={material !== null} onOpenChange={(open) => !open && onClose()}>
      <SheetContent className="data-[side=right]:w-full data-[side=right]:sm:max-w-3xl">
        {material && (
          <>
            <SheetHeader>
              <SheetTitle className="flex items-center gap-3">
                {material.name} <StateBadge state={material.state} />
              </SheetTitle>
              <SheetDescription>
                {fmtMass(material.looseMass + material.storedMass)} in{' '}
                {material.looseCount + material.storedCount} places · average{' '}
                {fmt(toCelsius(material.temperature), 1)} °C
              </SheetDescription>
            </SheetHeader>
            <div className="space-y-4 px-4 pt-4">
              <FieldGroup className="grid gap-4 sm:grid-cols-2">
                <Field>
                  <FieldLabel htmlFor="bulk-temp">Set every temperature</FieldLabel>
                  <div className="flex gap-2">
                    <InputGroup>
                      <InputGroupInput
                        id="bulk-temp"
                        type="number"
                        placeholder={fmt(toCelsius(material.temperature), 1)}
                        value={temperature}
                        onChange={(e) => setTemperature(e.target.value)}
                      />
                      <InputGroupAddon align="inline-end">°C</InputGroupAddon>
                    </InputGroup>
                    <Button
                      variant="outline"
                      disabled={temperature === '' || !Number.isFinite(Number(temperature))}
                      onClick={() => {
                        void onEdit({
                          type: 'setMaterialTemperature',
                          elementId: material.id,
                          kelvin: Number(temperature) + 273.15,
                        })
                        setTemperature('')
                      }}
                    >
                      Apply
                    </Button>
                  </div>
                </Field>
                <Field>
                  <FieldLabel htmlFor="bulk-mass">Multiply every mass</FieldLabel>
                  <div className="flex gap-2">
                    <InputGroup>
                      <InputGroupInput
                        id="bulk-mass"
                        type="number"
                        min={0}
                        step={0.1}
                        placeholder="2"
                        value={factor}
                        onChange={(e) => setFactor(e.target.value)}
                      />
                      <InputGroupAddon align="inline-end">×</InputGroupAddon>
                    </InputGroup>
                    <Button
                      variant="outline"
                      disabled={factor === '' || !(Number(factor) >= 0)}
                      onClick={() => {
                        void onEdit({
                          type: 'scaleMaterialMass',
                          elementId: material.id,
                          factor: Number(factor),
                        })
                        setFactor('')
                      }}
                    >
                      Apply
                    </Button>
                  </div>
                </Field>
              </FieldGroup>
              <FieldDescription>
                Stored items keep their container; loose debris can be deleted.
              </FieldDescription>
              {loose.length > 0 && (
                <div className="flex flex-wrap items-center gap-2 border border-bad/60 bg-bad/10 p-3">
                  <span className="mr-auto flex items-center gap-2 type-label text-bad-text">
                    <TriangleAlert className="size-5" /> Loose debris
                  </span>
                  <Button
                    variant="destructive"
                    size="sm"
                    disabled={stale || selected.size === 0}
                    onClick={() => setConfirm('selected')}
                  >
                    <Trash2 /> Delete selected ({selected.size})
                  </Button>
                  <Button
                    variant="destructive"
                    size="sm"
                    disabled={stale || deletable.length === 0}
                    onClick={() => setConfirm('all')}
                  >
                    <Trash2 /> Delete all loose ({deletable.length})
                  </Button>
                </div>
              )}
            </div>
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
                        onCheckedChange={(on) =>
                          setSelected(
                            on === true ? new Set(deletable.map((i) => i.ref)) : new Set(),
                          )
                        }
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
                  {items.map((item) => (
                    <TableRow key={item.ref}>
                      <TableCell>
                        {item.loose && item.instanceId !== null && !item.protected && (
                          <Checkbox
                            aria-label={`Select item at ${item.x}, ${item.y}`}
                            checked={selected.has(item.ref)}
                            onCheckedChange={(on) => toggle(item.ref, on === true)}
                          />
                        )}
                      </TableCell>
                      <TableCell>
                        {item.loose ? <Badge variant="warn">Loose</Badge> : item.where}
                      </TableCell>
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
                          onCommit={(mass) =>
                            void onEdit({ type: 'setItemMass', ref: item.ref, mass })
                          }
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
                                onClick={() => void deleteItems([item])}
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
          </>
        )}
      </SheetContent>
      <Dialog open={confirm !== null} onOpenChange={(open) => !open && setConfirm(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <TriangleAlert className="size-6" /> Delete {targets.length} loose{' '}
              {targets.length === 1 ? 'item' : 'items'}?
            </DialogTitle>
            <DialogDescription>
              This removes <strong className="text-bad-text">{fmtMass(targetMass)}</strong> of{' '}
              {material?.name} lying on the ground. Stored items are not touched. You can undo it
              from the header.
              {skipped > 0 &&
                ` ${skipped} ${skipped === 1 ? 'item is' : 'items are'} skipped because ${
                  skipped === 1 ? 'it is' : 'they are'
                } marked for a move order.`}
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="outline" onClick={() => setConfirm(null)}>
              Cancel
            </Button>
            <Button
              variant="destructive"
              disabled={stale || targets.length === 0}
              onClick={() => {
                void deleteItems(targets)
                setConfirm(null)
              }}
            >
              Delete {targets.length}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </Sheet>
  )
}
