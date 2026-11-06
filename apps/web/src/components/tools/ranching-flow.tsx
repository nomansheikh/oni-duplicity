import type { ReactNode } from 'react'
import { ranching, type RanchSpecies } from '@oni-duplicity/game-data'
import {
  ArrowDown,
  ArrowRight,
  Fish,
  Info,
  PackageOpen,
  Rabbit,
  X,
  type LucideIcon,
} from 'lucide-react'
import { NumberField, SearchPicker } from '@/components/common'
import { DlcBadge } from '@/components/dlc-badge'
import { EmptyState } from '@/components/empty-state'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Item, ItemActions, ItemContent, ItemDescription, ItemTitle } from '@/components/ui/item'
import { Progress } from '@/components/ui/progress'
import {
  Select,
  SelectContent,
  SelectGroup,
  SelectItem,
  SelectLabel,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { ToggleGroup, ToggleGroupItem } from '@/components/ui/toggle-group'
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip'
import { fmt, fmtMass } from '@/lib/format'
import {
  RANCHER,
  SECONDS_PER_CYCLE,
  STABLE,
  type FeedChoice,
  type RanchPlan,
  type SaveHerd,
} from '@/lib/tools/ranching-calc'

const FAMILIES = [...new Set(ranching.species.map((s) => s.family))]

const KIND_LABEL = {
  solid: 'Item or element',
  plant: 'Plant, eaten as it grows',
  plantStorage: 'Plant, from its storage',
  prey: 'Butchered critter',
} as const

export interface RanchControls {
  species: RanchSpecies
  herds: SaveHerd[]
  plan: RanchPlan
  critterCount: number
  cells: number
  bySpace: boolean
  tame: boolean
  rancherSkill: number
  secondsPerRancher: number
  feed: FeedChoice[]
  pickSpecies: (id: string, count?: number) => void
  setCritterCount: (n: number) => void
  setCells: (n: number) => void
  setBySpace: (v: boolean) => void
  setTame: (v: boolean) => void
  setRancherSkill: (n: number) => void
  setSecondsPerRancher: (n: number) => void
  setFeed: (feed: FeedChoice[]) => void
}

/**
 * The calculator as one flow: what the herd takes in, how long it takes, what comes out. The
 * inputs live in the boxes they affect, and every box recalculates as they change. Three panels
 * joined by arrows; below 900px they stack and the arrows point down.
 */
export function RanchFlow(c: RanchControls) {
  return (
    <div className="flex flex-col gap-2">
      <SpeciesBar {...c} />
      <div
        data-testid="ranch-flow"
        className="grid items-stretch gap-2 min-[900px]:grid-cols-[minmax(0,1fr)_auto_minmax(0,1fr)_auto_minmax(0,1fr)]"
      >
        <TakesPanel {...c} />
        <FlowArrow />
        <TimePanel {...c} />
        <FlowArrow />
        <GetPanel {...c} />
      </div>
    </div>
  )
}

function FlowArrow() {
  return (
    <div aria-hidden className="grid place-items-center text-gold">
      <ArrowDown className="size-8 min-[900px]:hidden" strokeWidth={3} />
      <ArrowRight className="hidden size-8 min-[900px]:block" strokeWidth={3} />
    </div>
  )
}

function Panel({ title, children }: { title: string; children: ReactNode }) {
  return (
    <Card className="gap-0 py-0">
      <CardHeader>
        <CardTitle>{title}</CardTitle>
      </CardHeader>
      <CardContent className="flex flex-col gap-4 py-4">{children}</CardContent>
    </Card>
  )
}

function SectionLabel({ children }: { children: ReactNode }) {
  return <div className="type-label text-muted-foreground">{children}</div>
}

/** A small info icon that shows the text on hover or focus. */
function InfoTip({ text, label }: { text: string; label: string }) {
  return (
    <Tooltip>
      <TooltipTrigger asChild>
        <button
          type="button"
          aria-label={label}
          className="inline-flex shrink-0 text-muted-foreground hover:text-foreground"
        >
          <Info className="size-4" />
        </button>
      </TooltipTrigger>
      <TooltipContent className="max-w-72">{text}</TooltipContent>
    </Tooltip>
  )
}

function Nothing({
  title,
  icon = Rabbit,
  children,
}: {
  title: string
  icon?: LucideIcon
  children: ReactNode
}) {
  return <EmptyState size="compact" icon={icon} title={title} description={children} />
}

/** A labelled value row with an editable number on the right. */
function FieldRow({ label, tip, children }: { label: string; tip?: string; children: ReactNode }) {
  return (
    <Item variant="outline" size="xs">
      <ItemContent>
        <ItemTitle>
          {label}
          {tip && <InfoTip text={tip} label={`About ${label}`} />}
        </ItemTitle>
      </ItemContent>
      <ItemActions>{children}</ItemActions>
    </Item>
  )
}

// ----------------------------------------------------------------- species and morph

function SpeciesBar({ species, herds, pickSpecies }: RanchControls) {
  return (
    <Card className="gap-0 py-0">
      <CardContent className="flex flex-wrap items-center gap-3 py-3">
        <span className="type-label text-muted-foreground">Species and morph</span>
        <Select value={species.id} onValueChange={(id) => pickSpecies(id)}>
          <SelectTrigger className="w-64" aria-label="Species and morph">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            {FAMILIES.map((family) => {
              const members = ranching.species.filter((s) => s.family === family)
              return (
                <SelectGroup key={family}>
                  <SelectLabel>{members[0]!.familyName}</SelectLabel>
                  {members.map((s) => (
                    <SelectItem key={s.id} value={s.id}>
                      {s.name}
                    </SelectItem>
                  ))}
                </SelectGroup>
              )
            })}
          </SelectContent>
        </Select>
        {species.dlcIds.map((id) => (
          <DlcBadge key={id} id={id} />
        ))}
        {herds.length > 0 && (
          <div className="ml-auto flex flex-wrap items-center gap-2">
            <span className="type-label text-muted-foreground">From your save</span>
            {herds.map((h) => (
              <Button
                key={h.species.id}
                variant={h.species.id === species.id ? 'default' : 'outline'}
                size="sm"
                onClick={() => pickSpecies(h.species.id, h.count)}
              >
                {h.species.name} x{h.count}
                {h.babies > 0 && ` (${h.babies} baby)`}
              </Button>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  )
}

// ---------------------------------------------------------------- what it takes

function TakesPanel(c: RanchControls) {
  const { species, plan, tame, setTame } = c
  const fish = species.swims
  const region = fish ? 'Pond' : 'Stable'
  return (
    <Panel title="What it takes">
      <div className="flex flex-col gap-2">
        <SectionLabel>{region}</SectionLabel>
        <ToggleGroup
          type="single"
          variant="outline"
          size="sm"
          aria-label="Solve for"
          value={c.bySpace ? 'cells' : 'count'}
          onValueChange={(v) => v && c.setBySpace(v === 'cells')}
        >
          <ToggleGroupItem value="count">I know the critters</ToggleGroupItem>
          <ToggleGroupItem value="cells">I know the cells</ToggleGroupItem>
        </ToggleGroup>
        {c.bySpace ? (
          <>
            <FieldRow label={`${region} cells available`}>
              <NumberField
                label={`${region} cells available`}
                value={c.cells}
                min={0}
                onCommit={c.setCells}
                unit="cells"
              />
            </FieldRow>
            <FieldRow label="Critters that fit">
              <span className="type-h3 tabular-nums" data-testid="ranch-solved-count">
                {species.spacePerCritter > 0 ? plan.critters : 'No limit'}
              </span>
            </FieldRow>
          </>
        ) : (
          <FieldRow label="Critters">
            <NumberField
              label="Number of critters"
              value={c.critterCount}
              min={0}
              onCommit={c.setCritterCount}
            />
          </FieldRow>
        )}
        <FieldRow label="Space per critter">
          <span className="type-h3 tabular-nums">
            {species.spacePerCritter > 0 ? `${species.spacePerCritter} cells` : 'None needed'}
          </span>
        </FieldRow>
        {species.spacePerCritter > 0 && (
          <FieldRow label={`${region} cells needed`}>
            <span className="type-h3 tabular-nums">{fmt(plan.space.needed, 0)}</span>
          </FieldRow>
        )}
        {!fish && species.spacePerCritter > 0 && (
          <>
            <Progress
              variant="bar"
              tone={plan.space.fitsOneStable ? 'good' : 'bad'}
              value={Math.min(100, (plan.space.needed / STABLE.maxCells) * 100)}
              label={plan.space.fitsOneStable ? 'Fits one stable' : 'Over one stable'}
              state={`${fmt(plan.space.needed, 0)} / ${STABLE.maxCells} cells`}
              aria-label="Share of a full stable used"
            />
            <p className="type-caption text-muted-foreground">
              {plan.space.stables} {plan.space.stables === 1 ? 'stable' : 'stables'} of{' '}
              {STABLE.minCells} to {STABLE.maxCells} cells, {plan.space.perStable} critters each.
              Every critter beyond a room's space costs 1 happiness.
            </p>
          </>
        )}
        {fish && (
          <p className="type-caption text-muted-foreground">
            Fish count against the water they swim in, not a stable.
          </p>
        )}
      </div>

      <div className="flex flex-col gap-2">
        <SectionLabel>Feed</SectionLabel>
        <ToggleGroup
          type="single"
          variant="outline"
          size="sm"
          aria-label="Wild or tame"
          value={tame ? 'tame' : 'wild'}
          onValueChange={(v) => v && setTame(v === 'tame')}
        >
          <ToggleGroupItem value="tame">Tame</ToggleGroupItem>
          <ToggleGroupItem value="wild">Wild</ToggleGroupItem>
        </ToggleGroup>
        <FeedEditor {...c} />
        <p className="type-caption text-muted-foreground">
          {fmt(plan.caloriesPerCritter / 1000, 0)} kcal per critter per cycle
          {tame ? '' : ' (a wild critter burns less)'}
        </p>
      </div>
    </Panel>
  )
}

function FeedEditor({ species, plan, feed, setFeed }: RanchControls) {
  const chosen = new Set(feed.map((f) => f.id))
  const lineById = new Map(plan.feed.map((l) => [l.food.id, l]))
  const setShare = (id: string, share: number) =>
    setFeed(feed.map((f) => (f.id === id ? { ...f, share } : f)))
  return (
    <>
      {feed.length === 0 && <Nothing title="Nothing to eat">Add a food to see the feed.</Nothing>}
      {feed.map((choice) => {
        const food = species.diet.find((d) => d.id === choice.id)
        if (!food) return null
        const line = lineById.get(choice.id)
        return (
          <Item
            key={choice.id}
            variant="outline"
            size="xs"
            data-testid="ranch-feed"
            className="flex-wrap"
          >
            <ItemContent className="min-w-40">
              <ItemTitle>
                {food.name}
                <InfoTip
                  label={`About ${food.name}`}
                  text={`${KIND_LABEL[food.kind]}. ${fmt(food.calories / 1000, 0)} kcal per ${food.kind === 'plant' ? 'cycle of growth' : 'kg'}.`}
                />
              </ItemTitle>
              <div className="type-h3 tabular-nums">
                {plan.critters > 0 && line
                  ? line.unit === 'kg'
                    ? `${fmtMass(line.amountPerCycle)} / cycle`
                    : `${fmt(line.amountPerCycle, 2)} growth cycles / cycle`
                  : `${fmt(((line?.fraction ?? 0) * 100) | 0, 0)} % of calories`}
              </div>
              {feed.length > 1 && line && (
                <ItemDescription>{fmt(line.fraction * 100, 0)} % of its calories</ItemDescription>
              )}
            </ItemContent>
            <ItemActions className="w-full justify-end">
              <NumberField
                label={`Share of ${food.name}`}
                value={choice.share}
                min={1}
                onCommit={(share) => setShare(choice.id, share)}
                className="w-28"
              />
              <Button
                variant="outline"
                size="icon"
                aria-label={`Remove ${food.name}`}
                disabled={feed.length <= 1}
                onClick={() => setFeed(feed.filter((f) => f.id !== choice.id))}
              >
                <X />
              </Button>
            </ItemActions>
          </Item>
        )
      })}
      <SearchPicker
        label="Add food"
        heading="Foods"
        items={species.diet.map((d) => ({
          id: d.id,
          name: d.name,
          desc: `${KIND_LABEL[d.kind]}, ${fmt(d.calories / 1000, 0)} kcal`,
        }))}
        exclude={[...chosen]}
        onSelect={(id) => setFeed([...feed, { id, share: 100 }])}
      />
    </>
  )
}

// ------------------------------------------------------------------- how long

function TimePanel({
  species,
  plan,
  rancherSkill,
  setRancherSkill,
  secondsPerRancher,
  setSecondsPerRancher,
}: RanchControls) {
  const egg = species.egg
  const rows: { label: string; cycles: number }[] = []
  if (egg?.fertilityCycles) rows.push({ label: 'Lays an egg every', cycles: egg.fertilityCycles })
  if (egg?.incubationCycles) rows.push({ label: 'Egg hatches in', cycles: egg.incubationCycles })
  rows.push({ label: 'Lifespan', cycles: species.lifespanCycles })
  const longest = Math.max(...rows.map((r) => r.cycles))
  return (
    <Panel title="How long">
      <div className="flex flex-col gap-3">
        {rows.map((r) => (
          <Progress
            key={r.label}
            variant="task"
            value={(r.cycles / longest) * 100}
            label={r.label}
            state={`${fmt(r.cycles, 0)} cycles`}
            aria-label={r.label}
          />
        ))}
      </div>
      <div className="flex flex-col gap-2">
        <SectionLabel>Rancher</SectionLabel>
        {species.swims ? (
          <Nothing title="No rancher needed" icon={Fish}>
            The grooming station skips swimming critters, so fish need no rancher.
          </Nothing>
        ) : (
          <>
            <FieldRow
              label="Ranching skill"
              tip={`The Ranched effect lasts ${RANCHER.ranchedEffectSeconds} s, plus ${fmt(RANCHER.durationPerRanchingPoint * 100, 0)} % per Ranching point.`}
            >
              <NumberField
                label="Ranching skill of the rancher"
                value={rancherSkill}
                min={0}
                onCommit={setRancherSkill}
                className="w-28"
              />
            </FieldRow>
            <FieldRow label="Seconds a rancher can spare" tip="Per cycle, for each rancher.">
              <NumberField
                label="Seconds of ranching per rancher per cycle"
                value={secondsPerRancher}
                min={0}
                onCommit={setSecondsPerRancher}
                unit="s"
              />
            </FieldRow>
            {plan.critters === 0 ? (
              <Nothing title="No herd yet">Enter a herd size to see the rancher time.</Nothing>
            ) : (
              <>
                <Progress
                  variant="bar"
                  tone={plan.ranchers <= 1 ? 'good' : 'warn'}
                  value={Math.min(100, (plan.rancherSeconds / SECONDS_PER_CYCLE) * 100)}
                  label="Work per cycle"
                  state={`${fmt(plan.rancherSeconds, 0)} s of ${SECONDS_PER_CYCLE}`}
                  aria-label="Rancher work per cycle"
                />
                <FieldRow
                  label="Ranchers"
                  tip={`A visit takes ${RANCHER.workSeconds} s per critter and the effect lasts as long as the skill allows. Walking and the schedule are not counted, so treat it as a minimum.`}
                >
                  <span className="type-h3 tabular-nums">{plan.ranchers}</span>
                </FieldRow>
              </>
            )}
          </>
        )}
      </div>
    </Panel>
  )
}

// ---------------------------------------------------------------- what you get

function GetPanel({ species, plan }: RanchControls) {
  const egg = species.egg
  const outputs: { key: string; title: string; value: string; note?: string }[] = []
  if (plan.eggsPerCycle) {
    outputs.push({
      key: 'eggs',
      title: egg?.name ?? 'Eggs',
      value: `${fmt(plan.eggsPerCycle, 2)} / cycle`,
      note: `One per ${fmt(egg?.fertilityCycles ?? 0, 0)} cycles each`,
    })
  }
  if (plan.shellKgPerCycle) {
    outputs.push({
      key: 'shell',
      title: 'Egg Shell',
      value: `${fmtMass(plan.shellKgPerCycle)} / cycle`,
    })
  }
  if (plan.shear) {
    outputs.push({
      key: 'shear',
      title: plan.shear.name,
      value: `${fmtMass(plan.shear.kgPerCycle)} / cycle`,
      note: `Regrows in ${fmt(plan.shear.cycles, 0)} cycles`,
    })
  }
  if (plan.milk) {
    outputs.push({
      key: 'milk',
      title: 'Milk tank',
      value: `${fmtMass(plan.milk.capacityKg)} per critter`,
      note: `Fills while the critter eats ${fmt(plan.milk.caloriesPerCycle / 1000, 0)} kcal a cycle`,
    })
  }
  const leftovers = plan.feed.filter((l) => l.produces && l.produces.kgPerCycle > 0)
  return (
    <Panel title="What you get">
      <div className="flex flex-col gap-2">
        {plan.critters === 0 ? (
          <Nothing title="No herd yet">Enter a herd size to see the output.</Nothing>
        ) : outputs.length === 0 ? (
          <Nothing title="No output" icon={PackageOpen}>
            This species lays no eggs and gives nothing while alive.
          </Nothing>
        ) : (
          outputs.map((o) => (
            <Item key={o.key} variant="outline" size="xs" data-testid="ranch-output">
              <ItemContent>
                <ItemTitle className="whitespace-nowrap">
                  {o.title}
                  {o.note && <InfoTip text={o.note} label={`About ${o.title}`} />}
                </ItemTitle>
              </ItemContent>
              <ItemActions className="type-h3 tabular-nums">{o.value}</ItemActions>
            </Item>
          ))
        )}
      </div>
      {plan.critters > 0 && plan.morphs.length > 1 && (
        <div className="flex flex-col gap-2">
          <SectionLabel>Eggs by morph</SectionLabel>
          {plan.morphs.map((m) => (
            <Item key={m.speciesId} variant="outline" size="xs" data-testid="ranch-morph">
              <ItemContent>
                <ItemTitle>{m.name}</ItemTitle>
              </ItemContent>
              <ItemActions className="type-h3 tabular-nums">
                {fmt(m.eggsPerCycle, m.eggsPerCycle < 0.1 ? 3 : 2)} / cycle
              </ItemActions>
            </Item>
          ))}
        </div>
      )}
      {plan.critters > 0 && leftovers.length > 0 && (
        <div className="flex flex-col gap-2">
          <SectionLabel>Leaves behind</SectionLabel>
          {leftovers.map((line) => (
            <Item key={line.food.id} variant="outline" size="xs" data-testid="ranch-leftover">
              <Badge variant="secondary" className="shrink-0">
                {fmt(line.fraction * 100, 0)}%
              </Badge>
              <ItemContent>
                <ItemTitle>{line.produces!.name}</ItemTitle>
                <div className="type-h3 tabular-nums">
                  {fmtMass(line.produces!.kgPerCycle)} / cycle
                </div>
                <ItemDescription>from {line.food.name}</ItemDescription>
              </ItemContent>
            </Item>
          ))}
        </div>
      )}
      {species.deathDrops.length > 0 && (
        <div className="flex flex-col gap-2">
          <SectionLabel>On death</SectionLabel>
          {species.deathDrops.map((d) => (
            <Item key={d.id} variant="outline" size="xs">
              <ItemContent>
                <ItemTitle>{d.name}</ItemTitle>
              </ItemContent>
              <ItemActions className="type-h3 tabular-nums">{fmtMass(d.kg)} each</ItemActions>
            </Item>
          ))}
        </div>
      )}
    </Panel>
  )
}
