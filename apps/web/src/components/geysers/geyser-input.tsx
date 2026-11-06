import { Field, FieldDescription, FieldLabel } from '@/components/ui/field'
import { fmt } from '@/lib/format'
import type { Edit, GeyserField, GeyserView } from '@/worker/model'
import { NumberField } from '../common'

const VIEW_VALUE: Record<GeyserField, (g: GeyserView) => number> = {
  scaledRate: (g) => g.massPerCycle,
  scaledIterationLength: (g) => g.iterationSeconds,
  scaledIterationPercent: (g) => g.iterationPercent,
  scaledYearLength: (g) => g.yearSeconds,
  scaledYearPercent: (g) => g.yearPercent,
}

export function GeyserInput({
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
