import type { ReactNode } from 'react'
import { Sparkles, X } from 'lucide-react'
import { Button } from '@/components/ui/button'
import {
  Card,
  CardAction,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card'
import { Empty, EmptyDescription, EmptyHeader, EmptyMedia, EmptyTitle } from '@/components/ui/empty'
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
  ItemTitle,
} from '@/components/ui/item'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { Slider } from '@/components/ui/slider'
import { Switch } from '@/components/ui/switch'
import { humanize } from '@/lib/format'
import type { AmountView, DuplicantEdit, DuplicantView, Named } from '@/worker/model'
import { Hint, NumberField, SearchPicker } from '../common'

type EditFn = (change: DuplicantEdit) => void

function Panel({
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

function Nothing({ title, description }: { title: string; description: string }) {
  return (
    <Empty className="border border-dashed">
      <EmptyHeader>
        <EmptyMedia variant="icon">
          <Sparkles />
        </EmptyMedia>
        <EmptyTitle>{title}</EmptyTitle>
        <EmptyDescription>{description}</EmptyDescription>
      </EmptyHeader>
    </Empty>
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
  return (
    <Panel
      title="Traits"
      description="Traits are applied when the game loads the save."
      action={
        <SearchPicker
          label="Add trait"
          heading="Traits"
          items={catalog}
          exclude={dupe.traits.map((t) => t.id)}
          onSelect={(traitId) => edit({ type: 'addTrait', traitId })}
        />
      }
    >
      {dupe.traits.length === 0 ? (
        <Nothing title="No traits" description="Add one with the button above." />
      ) : (
        <ItemGroup className="grid gap-2 @3xl/main:grid-cols-2">
          {dupe.traits.map((trait) => (
            <Item key={trait.id} variant="outline">
              <ItemContent>
                <ItemTitle>{trait.name}</ItemTitle>
                {trait.desc && (
                  <ItemDescription className="whitespace-pre-line">{trait.desc}</ItemDescription>
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
            <FieldSet key={group} className="rounded-lg border p-4">
              <FieldLegend variant="label">{humanize(group)}</FieldLegend>
              <FieldGroup className="gap-3">
                {skills.map((skill) => {
                  const id = `${dupe.id}-skill-${skill.id}`
                  return (
                    <Field key={skill.id} orientation="horizontal">
                      <FieldLabel htmlFor={id} className="font-normal">
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
  Temperature: { max: 100, unit: '°C', offset: -273.15, digits: 1 },
  RadiationBalance: { max: 1000, unit: 'rads' },
  Decor: { max: 200, unit: 'decor' },
  BionicOil: { max: 200, unit: 'kg', digits: 1 },
  BionicGunk: { max: 200, unit: 'kg', digits: 1 },
  BionicOxygenTank: { max: 200, unit: 'kg', digits: 1 },
  BionicInternalBattery: { max: 1000, unit: 'kJ', scale: 1 / 1000, digits: 1 },
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

function AmountField({ amount, edit }: { amount: AmountView; edit: EditFn }) {
  const format = AMOUNT_FORMATS[amount.id] ?? { max: 100, unit: '' }
  const scale = format.scale ?? 1
  const offset = format.offset ?? 0
  const shown = amount.value * scale + offset
  const commit = (next: number) =>
    edit({ type: 'setAmount', amountId: amount.id, value: (next - offset) / scale })
  return (
    <Field>
      <Hint desc={amount.desc}>
        <FieldLabel className="w-fit">{amount.name}</FieldLabel>
      </Hint>
      <div className="flex items-center gap-3">
        <Slider
          value={[shown]}
          min={Math.min(0, shown)}
          max={Math.max(format.max, shown)}
          step={format.digits ? 0.1 : 1}
          onValueCommit={([v]) => commit(v!)}
        />
        <NumberField
          label={amount.name}
          value={shown}
          digits={format.digits ?? 0}
          unit={format.unit}
          className="w-36"
          onCommit={commit}
        />
      </div>
    </Field>
  )
}

function AmountGroup({ amounts, edit }: { amounts: AmountView[]; edit: EditFn }) {
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
      <Panel
        title="Needs"
        description="The game clamps values to each duplicant's maximum when it loads."
      >
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
        <SearchPicker
          label="Add effect"
          heading="Effects"
          items={catalog}
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
        <ItemGroup className="gap-2">
          {dupe.effects.map((effect) => (
            <Item key={effect.id} variant="outline">
              <ItemContent>
                <ItemTitle>{effect.name}</ItemTitle>
                {effect.desc && <ItemDescription>{effect.desc}</ItemDescription>}
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
        <FieldGroup className="grid gap-4 @2xl/main:grid-cols-2 @5xl/main:grid-cols-3">
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
      )}
    </Panel>
  )
}
