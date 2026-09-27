import { useState } from 'react'
import { SlidersHorizontal } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Field, FieldDescription, FieldGroup, FieldLabel } from '@/components/ui/field'
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
import { fmt } from '@/lib/format'
import {
  activeCycles,
  averagePerCycle,
  dormantCycles,
  eruptingSeconds,
  eruptionRate,
  SECONDS_PER_CYCLE,
} from '@/lib/geyser'
import type { Edit, GeyserField, GeyserView } from '@/worker/model'
import { CommitInput, Hint, NumberField } from './common'

export function GeysersPage({
  geysers,
  onEdit,
}: {
  geysers: GeyserView[]
  onEdit: (edit: Edit) => void
}) {
  const [openId, setOpenId] = useState<string | null>(null)
  const open = geysers.find((g) => g.id === openId) ?? null

  return (
    <>
      <Card>
        <CardHeader>
          <CardTitle>Geysers, vents and volcanoes</CardTitle>
          <CardDescription>
            Rate is per second while erupting; average spreads a cycle&apos;s output over dormancy.
            Open a geyser to change its output and timing.
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
                <TableHead />
              </TableRow>
            </TableHeader>
            <TableBody>
              {geysers.map((g) => (
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
                    {fmt(eruptionRate(g), 2)} kg/s
                  </TableCell>
                  <TableCell className="text-right tabular-nums">
                    {fmt(eruptingSeconds(g), 0)} of {fmt(g.iterationSeconds, 0)} s
                  </TableCell>
                  <TableCell className="text-right tabular-nums">
                    {fmt(activeCycles(g))} / {fmt(dormantCycles(g))} cycles
                  </TableCell>
                  <TableCell className="text-right tabular-nums">
                    {fmt(averagePerCycle(g), 0)} kg/cycle
                  </TableCell>
                  <TableCell className="text-right text-muted-foreground tabular-nums">
                    {g.x}, {g.y}
                  </TableCell>
                  <TableCell className="text-right">
                    <Button variant="ghost" size="sm" onClick={() => setOpenId(g.id)}>
                      <SlidersHorizontal /> Edit
                    </Button>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
      <GeyserSheet geyser={open} onClose={() => setOpenId(null)} onEdit={onEdit} />
    </>
  )
}

function GeyserSheet({
  geyser,
  onClose,
  onEdit,
}: {
  geyser: GeyserView | null
  onClose: () => void
  onEdit: (edit: Edit) => void
}) {
  const set = (field: GeyserField, value: number) =>
    geyser && onEdit({ type: 'setGeyserValue', id: geyser.id, field, value })

  return (
    <Sheet open={geyser !== null} onOpenChange={(open) => !open && onClose()}>
      <SheetContent className="w-full sm:max-w-lg">
        {geyser && (
          <>
            <SheetHeader>
              <SheetTitle>{geyser.name}</SheetTitle>
              <SheetDescription>
                {geyser.typeName} at {geyser.x}, {geyser.y}
              </SheetDescription>
            </SheetHeader>
            <div className="flex flex-col gap-6 overflow-y-auto px-4 pb-4">
              <div className="grid grid-cols-2 gap-3">
                <Stat label="While erupting" value={`${fmt(eruptionRate(geyser), 2)} kg/s`} />
                <Stat label="On average" value={`${fmt(averagePerCycle(geyser), 0)} kg/cycle`} />
                <Stat
                  label="Eruption"
                  value={`${fmt(eruptingSeconds(geyser), 0)} of ${fmt(geyser.iterationSeconds, 0)} s`}
                />
                <Stat
                  label="Active / dormant"
                  value={`${fmt(activeCycles(geyser))} / ${fmt(dormantCycles(geyser))} cycles`}
                />
              </div>
              <FieldGroup>
                <Field>
                  <FieldLabel>Output per active cycle</FieldLabel>
                  <NumberField
                    label="Output per active cycle"
                    value={geyser.massPerCycle}
                    digits={1}
                    min={0}
                    unit="kg"
                    className="w-40"
                    onCommit={(kg) => set('scaledRate', kg)}
                  />
                  <FieldDescription>
                    Everything a cycle of activity emits; the rate while erupting follows from it.
                  </FieldDescription>
                </Field>
                <div className="grid grid-cols-2 gap-4">
                  <Field>
                    <FieldLabel>Eruption cycle</FieldLabel>
                    <NumberField
                      label="Eruption cycle"
                      value={geyser.iterationSeconds}
                      min={1}
                      unit="s"
                      className="w-full"
                      onCommit={(s) => set('scaledIterationLength', s)}
                    />
                  </Field>
                  <Field>
                    <FieldLabel>Erupting</FieldLabel>
                    <NumberField
                      label="Erupting share"
                      value={geyser.iterationPercent * 100}
                      digits={1}
                      min={1}
                      unit="%"
                      className="w-full"
                      onCommit={(p) => set('scaledIterationPercent', p / 100)}
                    />
                  </Field>
                  <Field>
                    <FieldLabel>Activity cycle</FieldLabel>
                    <NumberField
                      label="Activity cycle"
                      value={geyser.yearSeconds / SECONDS_PER_CYCLE}
                      digits={1}
                      min={1}
                      unit="cycles"
                      className="w-full"
                      onCommit={(c) => set('scaledYearLength', c * SECONDS_PER_CYCLE)}
                    />
                  </Field>
                  <Field>
                    <FieldLabel>Active</FieldLabel>
                    <NumberField
                      label="Active share"
                      value={geyser.yearPercent * 100}
                      digits={1}
                      min={1}
                      unit="%"
                      className="w-full"
                      onCommit={(p) => set('scaledYearPercent', p / 100)}
                    />
                  </Field>
                </div>
                <FieldDescription>
                  The game rolled these when the world was generated and keeps the saved values.
                  Anything outside the natural range for this type still works, but no geyser would
                  roll it. Not yet verified in game.
                </FieldDescription>
              </FieldGroup>
            </div>
          </>
        )}
      </SheetContent>
    </Sheet>
  )
}

function Stat({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-lg border bg-muted/30 px-3 py-2">
      <div className="text-xs text-muted-foreground">{label}</div>
      <div className="font-heading text-base font-semibold tabular-nums">{value}</div>
    </div>
  )
}
