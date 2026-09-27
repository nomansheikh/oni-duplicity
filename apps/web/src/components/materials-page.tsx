import { useEffect, useMemo, useState } from 'react'
import { Search, SlidersHorizontal, Trash2 } from 'lucide-react'
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
import { cn } from '@/lib/utils'
import type { Edit, MaterialItemView, MaterialView } from '@/worker/model'
import { NumberField } from './common'

const STATE_STYLES: Record<string, string> = {
  Solid: 'border-amber-500/40 bg-amber-500/15 text-amber-700 dark:text-amber-300',
  Liquid: 'border-sky-500/40 bg-sky-500/15 text-sky-700 dark:text-sky-300',
  Gas: 'border-violet-500/40 bg-violet-500/15 text-violet-700 dark:text-violet-300',
}

function StateBadge({ state }: { state: string }) {
  return (
    <Badge variant="outline" className={cn(STATE_STYLES[state])}>
      {state}
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
  onEdit: (edit: Edit) => void
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
                  <TableCell className="font-medium">{m.name}</TableCell>
                  <TableCell>
                    <StateBadge state={m.state} />
                  </TableCell>
                  <TableCell className="text-right tabular-nums">
                    {m.looseCount > 0 ? `${fmtMass(m.looseMass)} · ${m.looseCount}` : '—'}
                  </TableCell>
                  <TableCell className="text-right tabular-nums">
                    {m.storedCount > 0 ? `${fmtMass(m.storedMass)} · ${m.storedCount}` : '—'}
                  </TableCell>
                  <TableCell className="text-right font-medium tabular-nums">
                    {fmtMass(m.looseMass + m.storedMass)}
                  </TableCell>
                  <TableCell className="text-right tabular-nums">
                    {fmt(toCelsius(m.temperature), 1)} °C
                  </TableCell>
                  <TableCell className="text-right">
                    <Button variant="ghost" size="sm" onClick={() => setOpenId(m.id)}>
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
  onEdit: (edit: Edit) => void
}) {
  const [items, setItems] = useState<MaterialItemView[]>([])
  const [temperature, setTemperature] = useState('')
  const [factor, setFactor] = useState('')

  useEffect(() => {
    if (!material) return
    let cancelled = false
    void saveClient.materialItems(material.id).then((list) => !cancelled && setItems(list))
    return () => {
      cancelled = true
    }
  }, [material, revision])

  return (
    <Sheet open={material !== null} onOpenChange={(open) => !open && onClose()}>
      <SheetContent className="w-full gap-0 sm:max-w-2xl">
        {material && (
          <>
            <SheetHeader>
              <SheetTitle className="flex items-center gap-2">
                {material.name} <StateBadge state={material.state} />
              </SheetTitle>
              <SheetDescription>
                {fmtMass(material.looseMass + material.storedMass)} in{' '}
                {material.looseCount + material.storedCount} places · average{' '}
                {fmt(toCelsius(material.temperature), 1)} °C
              </SheetDescription>
            </SheetHeader>
            <div className="space-y-4 px-4">
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
                        onEdit({
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
                        onEdit({
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
            </div>
            <ScrollArea className="mt-4 min-h-0 flex-1 px-4 pb-4">
              <Table>
                <TableHeader>
                  <TableRow>
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
                        {item.loose ? <Badge variant="secondary">Loose</Badge> : item.where}
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
                          onCommit={(mass) => onEdit({ type: 'setItemMass', ref: item.ref, mass })}
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
                            onEdit({
                              type: 'setItemTemperature',
                              ref: item.ref,
                              kelvin: c + 273.15,
                            })
                          }
                        />
                      </TableCell>
                      <TableCell className="w-10">
                        {item.loose && (
                          <Button
                            variant="ghost"
                            size="icon-sm"
                            aria-label="Delete debris"
                            onClick={() => onEdit({ type: 'deleteObject', id: item.ref })}
                          >
                            <Trash2 />
                          </Button>
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
    </Sheet>
  )
}
