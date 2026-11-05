import type { ReactNode } from 'react'
import { Sparkles, X, type LucideIcon } from 'lucide-react'
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
import { EmptyState } from '../empty-state'
import {
  Field,
  FieldContent,
  FieldDescription,
  FieldGroup,
  FieldLabel,
  FieldLegend,
  FieldSet,
  FieldTitle,
} from '@/components/ui/field'
import {
  Item,
  ItemActions,
  ItemContent,
  ItemDescription,
  ItemGroup,
  ItemMedia,
  ItemTitle,
} from '@/components/ui/item'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { Progress } from '@/components/ui/progress'
import { Slider } from '@/components/ui/slider'
import { Switch } from '@/components/ui/switch'
import { effectGroupLabels, findTraitInfo, type TraitCategory } from '@oni-duplicity/game-data'
import { effectDetail, groupEffects } from '@/lib/effects'
import { fmt, humanize, portraitParts } from '@/lib/format'
import { heldConflicts } from '@/lib/traits'
import { meterTone, type MeterKind } from '@/lib/meter'
import type { AmountView, DuplicantEdit, DuplicantView, Named } from '@/worker/model'
import { DuplicantAvatar, Hint, NumberField } from '../common'
import { EffectModifiers } from './EffectModifiers'
import { EffectPicker } from './EffectPicker'
import { TraitCategoryBadge, TraitPicker } from './TraitPicker'

type EditFn = (change: DuplicantEdit) => void

export function Panel({
  title,
  description,
  action,
  children,
}: {
  title: string
  description?: string
  action?: ReactNode
  children: ReactNode
}) {
  return (
    <Card>
      <CardHeader>
        <CardTitle>{title}</CardTitle>
        {description && <CardDescription>{description}</CardDescription>}
        {action && <CardAction>{action}</CardAction>}
      </CardHeader>
      <CardContent>{children}</CardContent>
    </Card>
  )
}

export function Nothing({
  title,
  description,
  icon = Sparkles,
}: {
  title: string
  description: string
  icon?: LucideIcon
}) {
  return <EmptyState size="compact" icon={icon} title={title} description={description} />
}

/** The trait name as a badge: green for a positive trait, red for a negative one, plain otherwise. */
function TraitName({ name, category }: { name: string; category: TraitCategory | undefined }) {
  const polar = category === 'positive' || category === 'negative'
  return (
    <>
      <Badge
        variant={category === 'positive' ? 'good' : category === 'negative' ? 'bad' : 'secondary'}
      >
        {name}
      </Badge>
      {!polar && <TraitCategoryBadge category={category} />}
    </>
  )
}

// --- Traits -----------------------------------------------------------------------

export function TraitsTab({
  dupe,
  catalog,
  edit,
}: {
  dupe: DuplicantView
  catalog: Named[]
  edit: EditFn
}) {
  const conflicts = heldConflicts(dupe, catalog)
  return (
    <Panel
      title="Traits"
      description="Traits are applied when the game loads the save. Traits the model or the save's DLC rule out are not offered, and clashing ones are blocked."
      action={
        <TraitPicker
          subject={dupe}
          catalog={catalog}
          onSelect={(traitId) => edit({ type: 'addTrait', traitId })}
        />
      }
    >
      {dupe.traits.length === 0 ? (
        <Nothing title="No traits" description="Add one with the button above." />
      ) : (
        <ItemGroup className="grid gap-2 @3xl/main:grid-cols-2">
          {dupe.traits.map((trait) => (
            <Item key={trait.id} variant="outline" data-trait={trait.id}>
              <ItemContent>
                <ItemTitle className="type-h3">
                  <TraitName name={trait.name} category={findTraitInfo(trait.id)?.category} />
                </ItemTitle>
                {trait.desc && (
                  <ItemDescription className="type-small whitespace-pre-line">
                    {trait.desc}
                  </ItemDescription>
                )}
                {conflicts.has(trait.id) && (
                  <p className="type-caption text-warn">
                    {conflicts.get(trait.id)} The save has it, so it is kept.
                  </p>
                )}
              </ItemContent>
              <ItemActions>
                <Button
                  variant="ghost"
                  size="icon-sm"
                  aria-label={`Remove ${trait.name}`}
                  onClick={() => edit({ type: 'removeTrait', traitId: trait.id })}
                >
                  <X />
                </Button>
              </ItemActions>
            </Item>
          ))}
        </ItemGroup>
      )}
    </Panel>
  )
}

// --- Interests ----------------------------------------------------------------------

export function InterestsTab({ dupe, edit }: { dupe: DuplicantView; edit: EditFn }) {
  return (
    <Panel
      title="Interests"
      description="Interests raise related attributes and reduce stress from that work."
    >
      <FieldGroup className="grid gap-3 @2xl/main:grid-cols-2 @5xl/main:grid-cols-3">
        {dupe.interests.map((interest) => {
          const id = `${dupe.id}-interest-${interest.hash}`
          return (
            <FieldLabel key={interest.hash} htmlFor={id}>
              <Field orientation="horizontal">
                <FieldContent>
                  <FieldTitle>{interest.name}</FieldTitle>
                  {interest.desc && (
                    <FieldDescription className="line-clamp-2">{interest.desc}</FieldDescription>
                  )}
                </FieldContent>
                <Switch
                  id={id}
                  checked={interest.active}
                  onCheckedChange={(active) =>
                    edit({ type: 'setInterest', hash: interest.hash, active })
                  }
                />
              </Field>
            </FieldLabel>
          )
        })}
      </FieldGroup>
    </Panel>
  )
}

// --- Attributes -----------------------------------------------------------------------

export function AttributesTab({ dupe, edit }: { dupe: DuplicantView; edit: EditFn }) {
  return (
    <Panel title="Attributes" description="Base levels before traits and effects. There is no cap.">
      <FieldGroup className="grid gap-x-8 gap-y-5 @3xl/main:grid-cols-2">
        {dupe.attributes.map((attribute) => (
          <Field key={attribute.id}>
            <Hint desc={attribute.desc}>
              <FieldLabel className="w-fit">{attribute.name}</FieldLabel>
            </Hint>
            <div className="flex items-center gap-3">
              <Slider
                value={[attribute.level]}
                min={0}
                max={Math.max(30, attribute.level)}
                step={1}
                onValueCommit={([level]) =>
                  edit({ type: 'setAttributeLevel', attributeId: attribute.id, level: level! })
                }
              />
              <NumberField
                label={attribute.name}
                value={attribute.level}
                min={0}
                className="w-24"
                onCommit={(level) =>
                  edit({ type: 'setAttributeLevel', attributeId: attribute.id, level })
                }
              />
            </div>
          </Field>
        ))}
      </FieldGroup>
    </Panel>
  )
}

// --- Skills -----------------------------------------------------------------------------

export function SkillsTab({ dupe, edit }: { dupe: DuplicantView; edit: EditFn }) {
  const groups = new Map<string, typeof dupe.skills>()
  for (const skill of dupe.skills)
    groups.set(skill.group, [...(groups.get(skill.group) ?? []), skill])

  return (
    <div className="flex flex-col gap-4 md:gap-6">
      <Panel title="Experience" description="Skill points are earned from total experience.">
        <Field className="max-w-xs">
          <FieldLabel>Total experience</FieldLabel>
          <NumberField
            label="Total experience"
            value={dupe.experience}
            min={0}
            unit="XP"
            className="w-48"
            onCommit={(experience) => edit({ type: 'setExperience', experience })}
          />
        </Field>
      </Panel>
      <Panel
        title="Skills"
        description="Skills from content packs this save doesn't use are hidden."
      >
        <div className="grid gap-4 @3xl/main:grid-cols-2 @6xl/main:grid-cols-3">
          {[...groups].map(([group, skills]) => (
            <FieldSet key={group} className="well p-4">
              <FieldLegend variant="label" className="type-h3">
                {humanize(group)}
              </FieldLegend>
              <FieldGroup className="gap-3">
                {skills.map((skill) => {
                  const id = `${dupe.id}-skill-${skill.id}`
                  return (
                    <Field key={skill.id} orientation="horizontal">
                      <FieldLabel
                        htmlFor={id}
                        className="type-body font-normal normal-case tracking-normal"
                      >
                        {skill.name}
                      </FieldLabel>
                      <Switch
                        id={id}
                        checked={skill.mastered}
                        onCheckedChange={(mastered) =>
                          edit({ type: 'setSkillMastered', skillId: skill.id, mastered })
                        }
                      />
                    </Field>
                  )
                })}
              </FieldGroup>
            </FieldSet>
          ))}
        </div>
      </Panel>
    </div>
  )
}

// --- Health & needs -----------------------------------------------------------------------

interface AmountFormat {
  max: number
  unit: string
  /** Stored value × scale + offset = shown value. */
  scale?: number
  offset?: number
  digits?: number
  /** Slider range in shown units for amounts whose true maximum is too wide to drag across. */
  range?: [number, number]
}

const AMOUNT_FORMATS: Record<string, AmountFormat> = {
  HitPoints: { max: 100, unit: 'HP' },
  Stress: { max: 100, unit: '%' },
  Stamina: { max: 100, unit: '%' },
  Breath: { max: 100, unit: '%' },
  Bladder: { max: 100, unit: '%' },
  ImmuneLevel: { max: 100, unit: '%' },
  Toxicity: { max: 100, unit: '%' },
  Calories: { max: 4000, unit: 'kcal', scale: 1 / 1000 },
  Temperature: { max: 100, unit: '°C', offset: -273.15, digits: 1, range: [-100, 250] },
  RadiationBalance: { max: 1000, unit: 'rads' },
  Decor: { max: 200, unit: 'decor' },
  // The bionic maximums come from the worker (`AmountView.max`); these are the game's base values.
  BionicOil: { max: 200, unit: 'kg', digits: 1 },
  BionicGunk: { max: 80, unit: 'kg', digits: 1 },
  BionicOxygenTank: { max: 240, unit: 'kg', digits: 1 },
  BionicInternalBattery: { max: 480, unit: 'kJ', scale: 1 / 1000, digits: 1 },
  Age: { max: 100, unit: 'cycles', digits: 1 },
  Wildness: { max: 100, unit: '%' },
  Fertility: { max: 100, unit: '%' },
  Incubation: { max: 100, unit: '%' },
  Viability: { max: 100, unit: '%' },
  CritterTemperature: { max: 100, unit: '°C', offset: -273.15, digits: 1, range: [-100, 250] },
  ScaleGrowth: { max: 100, unit: '%' },
  MilkProduction: { max: 100, unit: '%' },
  ElementGrowth: { max: 100, unit: '%' },
  Beckoning: { max: 100, unit: '%' },
  Moisture: { max: 100, unit: '%' },
  Mucus: { max: 10, unit: '', digits: 1 },
  InternalBattery: { max: 9000, unit: '' },
  InternalChemicalBattery: { max: 180000, unit: '' },
  InternalBioBattery: { max: 180000, unit: '' },
  InternalElectroBank: { max: 120000, unit: '' },
}

const NEEDS = [
  'HitPoints',
  'Stress',
  'Calories',
  'Stamina',
  'Breath',
  'Bladder',
  'ImmuneLevel',
  'Toxicity',
]
const BIONIC = ['BionicInternalBattery', 'BionicOil', 'BionicGunk', 'BionicOxygenTank']

const GAUGES = new Set([
  'Calories',
  'Stamina',
  'BionicOil',
  'BionicOxygenTank',
  'BionicInternalBattery',
])

/** How an amount reads: the shown value, its maximum and how far it is over it. */
function readAmount(amount: AmountView) {
  const format = AMOUNT_FORMATS[amount.id] ?? { max: 100, unit: '' }
  const scale = format.scale ?? 1
  const offset = format.offset ?? 0
  const shown = amount.value * scale + offset
  const cap = amount.max === undefined ? format.max : amount.max * scale + offset
  return { format, scale, offset, shown, cap, over: Math.max(0, shown - cap) }
}

/**
 * The game's meter for an amount: blocks for health and stress, a storage gauge for calories,
 * stamina and the bionic tanks, a thin bar for the rest. Over the maximum it shows the cap.
 */
function AmountMeter({ amount, className }: { amount: AmountView; className?: string }) {
  const { shown, cap, over } = readAmount(amount)
  const pct = cap > 0 ? (Math.min(shown, cap) / cap) * 100 : 0
  const blocks = amount.id === 'HitPoints' || amount.id === 'Stress'
  const kind: MeterKind =
    amount.id === 'HitPoints'
      ? 'health'
      : amount.id === 'Stress' || amount.id === 'BionicGunk'
        ? 'stress'
        : 'amount'
  const vital = blocks || GAUGES.has(amount.id) || amount.id === 'BionicGunk'
  const tone = vital ? meterTone(kind, pct) : 'good'
  if (blocks)
    return (
      <Progress
        variant="blocks"
        tone={tone}
        value={shown}
        max={cap}
        overflow={over}
        className={className}
      />
    )
  if (GAUGES.has(amount.id))
    return (
      <Progress
        variant="gauge"
        tone={tone}
        value={shown}
        max={cap}
        overflow={over}
        className={className}
      />
    )
  return <Progress tone={tone} value={shown} max={cap} overflow={over} className={className} />
}

export function Vital({ amount, Icon }: { amount: AmountView; Icon: LucideIcon }) {
  const { shown, format } = readAmount(amount)
  return (
    <Item variant="need" data-vital={amount.id}>
      <ItemMedia variant="icon">
        <Icon />
      </ItemMedia>
      <ItemContent className="gap-1.5">
        <div className="flex items-baseline justify-between gap-2">
          <span className="type-body">{amount.name}</span>
          <span className="type-body text-white tabular-nums">
            {fmt(shown, format.digits ?? 0)} {format.unit}
          </span>
        </div>
        <AmountMeter amount={amount} />
      </ItemContent>
    </Item>
  )
}

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
      <AmountMeter amount={amount} />
      <div className="flex items-center gap-3">
        <Slider
          value={[Math.min(Math.max(shown, sliderBottom), Math.max(sliderTop, sliderBottom))]}
          min={sliderBottom}
          max={Math.max(sliderTop, shown, sliderBottom)}
          step={format.digits ? 0.1 : 1}
          disabled={readOnly}
          onValueCommit={([v]) => commit(v!)}
        />
        <NumberField
          label={amount.name}
          value={shown}
          digits={format.digits ?? 0}
          unit={format.unit}
          className="w-40"
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

// --- Effects ---------------------------------------------------------------------------------

export function EffectsTab({
  dupe,
  catalog,
  edit,
}: {
  dupe: DuplicantView
  catalog: Named[]
  edit: EditFn
}) {
  return (
    <Panel
      title="Effects"
      description="Temporary buffs and debuffs, with the cycles they have left."
      action={
        <EffectPicker
          catalog={catalog}
          exclude={dupe.effects.map((e) => e.id)}
          onSelect={(effectId) => edit({ type: 'addEffect', effectId, cycles: 1 })}
        />
      }
    >
      {dupe.effects.length === 0 ? (
        <Nothing
          title="No active effects"
          description="Add a buff or debuff with the button above."
        />
      ) : (
        <div className="flex flex-col gap-5">
          {groupEffects(dupe.effects).map(({ group, items }) => (
            <section key={group} className="flex flex-col gap-2">
              <h3 className="type-label text-muted-foreground">
                {effectGroupLabels[group]} ({items.length})
              </h3>
              <ItemGroup className="gap-2">
                {items.map((effect) => (
                  <Item key={effect.id} variant="outline">
                    <ItemContent>
                      <ItemTitle>{effect.name}</ItemTitle>
                      {effect.desc && <ItemDescription>{effect.desc}</ItemDescription>}
                      <EffectModifiers modifiers={effectDetail(effect.id).modifiers} />
                    </ItemContent>
                    <ItemActions>
                      <NumberField
                        label={`${effect.name} cycles left`}
                        value={effect.cyclesRemaining}
                        digits={2}
                        min={0}
                        unit="cycles"
                        className="w-40"
                        onCommit={(cycles) =>
                          edit({ type: 'setEffectCycles', effectId: effect.id, cycles })
                        }
                      />
                      <Button
                        variant="ghost"
                        size="icon-sm"
                        aria-label={`Remove ${effect.name}`}
                        onClick={() => edit({ type: 'removeEffect', effectId: effect.id })}
                      >
                        <X />
                      </Button>
                    </ItemActions>
                  </Item>
                ))}
              </ItemGroup>
            </section>
          ))}
        </div>
      )}
    </Panel>
  )
}

// --- Appearance -------------------------------------------------------------------------------

export function AppearanceTab({ dupe, edit }: { dupe: DuplicantView; edit: EditFn }) {
  return (
    <Panel title="Appearance" description="Styles are numbered as in the game files.">
      {dupe.appearance.length === 0 ? (
        <Nothing
          title="Nothing to change"
          description="This duplicant has no editable appearance."
        />
      ) : (
        <div className="flex flex-col gap-6 @3xl/main:flex-row">
          <div className="flex shrink-0 flex-col items-center gap-2">
            <DuplicantAvatar name={dupe.name} parts={portraitParts(dupe.appearance)} size={160} />
            <span className="type-caption text-muted-foreground">Live preview</span>
          </div>
          <FieldGroup className="grid flex-1 gap-4 @2xl/main:grid-cols-2">
            {dupe.appearance.map((slot) => {
              const id = `${dupe.id}-${slot.slot}`
              return (
                <Field key={slot.slot}>
                  <FieldLabel htmlFor={id}>{slot.label}</FieldLabel>
                  <Select
                    value={slot.current}
                    onValueChange={(number) =>
                      edit({ type: 'setAccessory', slot: slot.slot, number })
                    }
                  >
                    <SelectTrigger id={id} className="w-full">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {slot.options.map((n) => (
                        <SelectItem key={n} value={n}>
                          Style {Number(n)}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </Field>
              )
            })}
          </FieldGroup>
        </div>
      )}
    </Panel>
  )
}
