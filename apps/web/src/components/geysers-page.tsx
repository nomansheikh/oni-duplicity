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
              {!geyser.matchesRolls && (
                <div className="rounded-lg border border-chart-3/50 bg-chart-3/10 px-4 py-3 text-sm">
                  The saved values don&apos;t match this geyser&apos;s rolls, so something other
                  than the game changed them, probably a mod. Without that mod the game works them
                  out from the rolls again when it loads the save. Editing a value fixes its roll.
                </div>
              )}
              {geyser.ranges ? (
                <FieldGroup>
                  <GeyserInput
                    geyser={geyser}
                    field="scaledRate"
                    label="Output per active cycle"
                    unit="kg"
                    digits={1}
                    onEdit={onEdit}
                    description="Everything a cycle of activity emits; the rate while erupting follows from it."
                  />
                  <div className="grid grid-cols-2 gap-4">
                    <GeyserInput
                      geyser={geyser}
                      field="scaledIterationLength"
                      label="Eruption cycle"
                      unit="s"
                      onEdit={onEdit}
                    />
                    <GeyserInput
                      geyser={geyser}
                      field="scaledIterationPercent"
                      label="Erupting"
                      unit="%"
                      digits={1}
                      scale={100}
                      onEdit={onEdit}
                    />
                    <GeyserInput
                      geyser={geyser}
                      field="scaledYearLength"
                      label="Activity cycle"
                      unit="cycles"
                      digits={1}
                      scale={1 / SECONDS_PER_CYCLE}
                      onEdit={onEdit}
                    />
                    <GeyserInput
                      geyser={geyser}
                      field="scaledYearPercent"
                      label="Active"
                      unit="%"
                      digits={1}
                      scale={100}
                      onEdit={onEdit}
                    />
                  </div>
                  <FieldDescription>
                    Each value stays within what the game can roll for this type: the game stores
                    the roll and works the value out from it when it loads the save. Not yet
                    verified in game.
                  </FieldDescription>
                </FieldGroup>
              ) : (
                <p className="text-sm text-muted-foreground">
                  This geyser type isn&apos;t known to Duplicity, so only its name can be changed.
                </p>
              )}
            </div>
          </>
        )}
      </SheetContent>
    </Sheet>
  )
}

const VIEW_VALUE: Record<GeyserField, (g: GeyserView) => number> = {
  scaledRate: (g) => g.massPerCycle,
  scaledIterationLength: (g) => g.iterationSeconds,
  scaledIterationPercent: (g) => g.iterationPercent,
  scaledYearLength: (g) => g.yearSeconds,
  scaledYearPercent: (g) => g.yearPercent,
}

function GeyserInput({
  geyser,
  field,
  label,
  unit,
  digits = 0,
  scale = 1,
  description,
  onEdit,
}: {
  geyser: GeyserView
  field: GeyserField
  label: string
  unit: string
  digits?: number
  /** Stored value × scale = shown value. */
  scale?: number
  description?: string
  onEdit: (edit: Edit) => void
}) {
  const range = geyser.ranges![field]
  const fixed = range.max <= range.min
  const [min, max] = [range.min * scale, range.max * scale]
  return (
    <Field>
      <FieldLabel>{label}</FieldLabel>
      <NumberField
        label={label}
        value={VIEW_VALUE[field](geyser) * scale}
        digits={digits}
        min={min}
        max={max}
        disabled={fixed}
        unit={unit}
        className="w-full"
        onCommit={(value) =>
          onEdit({ type: 'setGeyserValue', id: geyser.id, field, value: value / scale })
        }
      />
      <FieldDescription>
        {fixed ? 'Fixed for this type.' : `${fmt(min, digits)} to ${fmt(max, digits)} ${unit}.`}
        {description && ` ${description}`}
      </FieldDescription>
    </Field>
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
