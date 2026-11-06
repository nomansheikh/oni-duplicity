import { Field, FieldGroup, FieldLabel } from '@/components/ui/field'
import { Slider } from '@/components/ui/slider'
import type { AmountView, DuplicantView } from '@/worker/model'
import { Hint, NumberField } from '../common'
import { Panel, type EditFn } from './panel'
import { BIONIC, NEEDS, readAmount } from './amount-format'
import { AmountMeter } from './amounts'

export function AmountField({ amount, edit }: { amount: AmountView; edit: EditFn }) {
  const { format, scale, offset, shown } = readAmount(amount)
  // The worker sends the game's own range when it could derive one; otherwise a typical range.
  const bounded = amount.max !== undefined
  const readOnly = amount.readOnlyReason !== undefined
  const top = bounded ? amount.max! * scale + offset : Math.max(format.max, shown)
  const bottom = bounded ? (amount.min ?? 0) * scale + offset : Math.min(0, shown)
  // The slider uses the shorter range when the amount has one; the field keeps the true bounds.
  const sliderTop = format.range ? Math.max(Math.min(top, format.range[1]), shown) : top
  const sliderBottom = format.range ? Math.min(Math.max(bottom, format.range[0]), shown) : bottom
  const commit = (next: number) =>
    edit({ type: 'setAmount', amountId: amount.id, value: (next - offset) / scale })
  return (
    <Field className="well gap-3 p-3" data-disabled={readOnly || undefined}>
      <Hint desc={amount.desc}>
        <FieldLabel className="type-label w-fit">{amount.name}</FieldLabel>
      </Hint>
      {/* No known maximum means no honest gauge or slider range, so just the number. */}
      {bounded && <AmountMeter amount={amount} />}
      <div className="flex items-center gap-3">
        {bounded && (
          <Slider
            value={[Math.min(Math.max(shown, sliderBottom), Math.max(sliderTop, sliderBottom))]}
            min={sliderBottom}
            max={Math.max(sliderTop, shown, sliderBottom)}
            step={format.digits ? 0.1 : 1}
            disabled={readOnly}
            onValueCommit={([v]) => commit(v!)}
          />
        )}
        <NumberField
          label={amount.name}
          value={shown}
          digits={format.digits ?? 0}
          unit={format.unit}
          className={bounded ? 'w-40' : 'w-full'}
          min={bounded ? bottom : undefined}
          max={bounded ? top : undefined}
          disabled={readOnly}
          onCommit={commit}
        />
      </div>
      {readOnly && (
        <p className="type-caption text-muted-foreground">Read only. {amount.readOnlyReason}.</p>
      )}
      {amount.warning && <p className="type-caption text-muted-foreground">{amount.warning}</p>}
    </Field>
  )
}

export function AmountGroup({ amounts, edit }: { amounts: AmountView[]; edit: EditFn }) {
  return (
    <FieldGroup className="grid gap-x-8 gap-y-5 @3xl/main:grid-cols-2">
      {amounts.map((a) => (
        <AmountField key={a.id} amount={a} edit={edit} />
      ))}
    </FieldGroup>
  )
}

export function HealthTab({ dupe, edit }: { dupe: DuplicantView; edit: EditFn }) {
  const byId = new Map(dupe.amounts.map((a) => [a.id, a]))
  const pick = (ids: string[]) => ids.map((id) => byId.get(id)).filter((a): a is AmountView => !!a)
  const listed = new Set([...NEEDS, ...BIONIC])
  const other = dupe.amounts.filter((a) => !listed.has(a.id))
  return (
    <div className="flex flex-col gap-4 md:gap-6">
      {dupe.isBionic && pick(BIONIC).length > 0 && (
        <Panel
          title="Bionic systems"
          description="Power bank charge, gear oil, gunk and oxygen tank."
        >
          <AmountGroup amounts={pick(BIONIC)} edit={edit} />
        </Panel>
      )}
      <Panel title="Needs" description="Values are limited to each duplicant's real maximum.">
        <AmountGroup amounts={pick(NEEDS)} edit={edit} />
      </Panel>
      {other.length > 0 && (
        <Panel title="Other" description="Temperature, decor, radiation and germ exposure.">
          <AmountGroup amounts={other} edit={edit} />
        </Panel>
      )}
    </div>
  )
}
