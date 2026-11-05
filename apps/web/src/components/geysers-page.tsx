import { useState } from 'react'
import { Flame, FlaskConical, SlidersHorizontal, TriangleAlert } from 'lucide-react'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader } from '@/components/ui/card'
import { Progress } from '@/components/ui/progress'
import { Field, FieldDescription, FieldGroup, FieldLabel } from '@/components/ui/field'
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
import { fmt } from '@/lib/format'
import {
  activeCycles,
  averagePerCycle,
  dormantCycles,
  eruptingSeconds,
  eruptionRate,
  SECONDS_PER_CYCLE,
} from '@/lib/geyser'
import type { Edit, GeyserField, GeyserView, WorldView } from '@/worker/model'
import { AsteroidFilter } from './asteroid-filter'
import { asteroidName } from '@/lib/asteroid'
import { CommitInput, Hint, NumberField } from './common'
import { PageHeader } from './page-header'
import { EmptyState } from './empty-state'

export function GeysersPage({
  geysers,
  worlds,
  onEdit,
}: {
  geysers: GeyserView[]
  worlds: WorldView[]
  onEdit: (edit: Edit) => void
}) {
  const [openId, setOpenId] = useState<string | null>(null)
  const [asteroid, setAsteroid] = useState('all')
  const open = geysers.find((g) => g.id === openId) ?? null
  const visible = geysers.filter((g) => asteroid === 'all' || g.asteroid === asteroid)

  return (
    <>
      <PageHeader
        title="Geysers, vents and volcanoes"
        description="Rate is per second while erupting; average spreads a cycle's output over dormancy. Open a geyser to change its output and timing."
        actions={<AsteroidFilter worlds={worlds} value={asteroid} onChange={setAsteroid} />}
        summary={[
          {
            label: 'Geysers',
            value: visible.length,
            hint: visible.length === geysers.length ? undefined : `of ${geysers.length}`,
          },
        ]}
      />
      <Card>
        <CardContent>
          {visible.length === 0 && (
            <EmptyState
              icon={Flame}
              title="No geysers"
              description={
                geysers.length === 0
                  ? 'This save has no geysers, vents or volcanoes. The ground is calm.'
                  : 'No geysers on this asteroid. Nothing is about to erupt here.'
              }
              action={
                geysers.length > 0
                  ? { label: 'Show all asteroids', onClick: () => setAsteroid('all') }
                  : undefined
              }
              data-testid="geysers-empty"
            />
          )}
          <div
            role="table"
            aria-label="Geysers"
            className="grid gap-4 md:grid-cols-2 2xl:grid-cols-3"
          >
            {visible.map((g) => (
              <GeyserCard
                key={g.id}
                geyser={g}
                asteroid={asteroidName(worlds, g.asteroid)}
                onEdit={onEdit}
                onOpen={() => setOpenId(g.id)}
              />
            ))}
          </div>
        </CardContent>
      </Card>
      <GeyserSheet geyser={open} onClose={() => setOpenId(null)} onEdit={onEdit} />
    </>
  )
}

/** What a geyser emits, for the category colour. Types the editor doesn't know get none. */
type Emits = 'gas' | 'liquid' | 'metal' | 'solid'

const EMITS: Record<string, Emits> = {
  steam: 'gas',
  hot_steam: 'gas',
  hot_co2: 'gas',
  hot_hydrogen: 'gas',
  hot_po2: 'gas',
  slimy_po2: 'gas',
  chlorine_gas: 'gas',
  chlorine_gas_cool: 'gas',
  methane: 'gas',
  hot_water: 'liquid',
  slush_water: 'liquid',
  filthy_water: 'liquid',
  slush_salt_water: 'liquid',
  salt_water: 'liquid',
  liquid_co2: 'liquid',
  liquid_sulfur: 'liquid',
  murky_brine: 'liquid',
  oil_drip: 'liquid',
  small_volcano: 'solid',
  big_volcano: 'solid',
}

function emitsOf(prefab: string): Emits | undefined {
  const id = prefab.replace(/^GeyserGeneric_/, '')
  return EMITS[id] ?? (id.startsWith('molten_') ? 'metal' : undefined)
}

function GeyserCard({
  geyser: g,
  asteroid,
  onEdit,
  onOpen,
}: {
  geyser: GeyserView
  asteroid: string
  onEdit: (edit: Edit) => void
  onOpen: () => void
}) {
  const emits = emitsOf(g.prefab)
  const active = Math.round(g.yearPercent * 100)
  return (
    <Card role="row" className="gap-0 py-0">
      <CardHeader className="items-center">
        <CommitInput
          value={g.name}
          aria-label="Geyser name"
          onCommit={(name) => onEdit({ type: 'setGeyserName', id: g.id, name })}
          className="min-w-0 flex-1"
        />
        <Badge role="cell" variant={emits ?? 'geyser'}>
          <Hint desc={g.typeDesc}>
            <span>{g.typeName}</span>
          </Hint>
        </Badge>
      </CardHeader>
      <CardContent className="flex flex-col gap-4 py-4">
        <Progress
          variant="task"
          value={active}
          dormant={100 - active}
          label="Activity cycle"
          state={`${fmt(activeCycles(g))} active / ${fmt(dormantCycles(g))} dormant cycles`}
          aria-label="Activity cycle"
        />
        <div role="cell" className="grid grid-cols-2 gap-2">
          <Stat label="While erupting" value={`${fmt(eruptionRate(g), 2)} kg/s`} />
          <Stat label="Average" value={`${fmt(averagePerCycle(g), 0)} kg/cycle`} />
          <Stat
            label="Eruption"
            value={`${fmt(eruptingSeconds(g), 0)} of ${fmt(g.iterationSeconds, 0)} s`}
          />
          <Stat label="Asteroid" value={asteroid} />
          <Stat label="Position" value={`${g.x}, ${g.y}`} />
        </div>
        <div role="cell" className="flex justify-end">
          <Button variant="ghost" size="sm" onClick={onOpen}>
            <SlidersHorizontal /> Edit
          </Button>
        </div>
      </CardContent>
    </Card>
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
              {geyser.swapTargets.length > 0 && (
                <TypeChanger
                  key={geyser.id}
                  geyser={geyser}
                  onChange={(typeId) => {
                    onEdit({ type: 'setGeyserType', id: geyser.id, typeId })
                    onClose()
                  }}
                />
              )}
              {!geyser.matchesRolls && (
                <div className="flex gap-3 border border-warn bg-warn/10 px-4 py-3 type-small text-white">
                  <TriangleAlert className="mt-0.5 size-5 shrink-0 text-warn" />
                  <span>
                    The saved values don&apos;t match this geyser&apos;s rolls, so something other
                    than the game changed them, probably a mod. Without that mod the game works them
                    out from the rolls again when it loads the save. Editing a value fixes its roll.
                  </span>
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
                <p className="type-small text-muted-foreground">
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

function TypeChanger({
  geyser,
  onChange,
}: {
  geyser: GeyserView
  onChange: (typeId: string) => void
}) {
  const [typeId, setTypeId] = useState('')
  return (
    <Field>
      <div className="flex flex-col gap-2 border-2 border-warn bg-warn/10 p-3">
        <FieldLabel>
          Type
          <Badge variant="warn" className="gap-1">
            <FlaskConical /> Experimental
          </Badge>
        </FieldLabel>
        <div className="flex gap-2">
          <Select value={typeId} onValueChange={setTypeId}>
            <SelectTrigger className="min-w-0 flex-1 basis-48" aria-label="New type">
              <SelectValue placeholder={`Change from ${geyser.typeName}`} />
            </SelectTrigger>
            <SelectContent>
              {geyser.swapTargets.map((t) => (
                <SelectItem key={t.id} value={t.id}>
                  {t.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          <Button variant="outline" disabled={!typeId} onClick={() => onChange(typeId)}>
            Change type
          </Button>
        </div>
        <FieldDescription>
          Only types of the same size that your save&apos;s DLCs allow are listed. Output,
          temperature and germs follow the new type and the rolls are kept. Experimental: not yet
          verified in game, so keep a backup.
        </FieldDescription>
        {geyser.hasGeyserControl && (
          <div className="flex gap-2 type-small text-white">
            <TriangleAlert className="mt-0.5 size-5 shrink-0 text-warn" />
            This save uses the Geyser Control mod; it may reapply its own values after the swap.
          </div>
        )}
      </div>
    </Field>
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
    <div className="border border-ink bg-inset px-3 py-2">
      <div className="type-caption text-muted-foreground">{label}</div>
      <div className="type-h3 tabular-nums">{value}</div>
    </div>
  )
}
