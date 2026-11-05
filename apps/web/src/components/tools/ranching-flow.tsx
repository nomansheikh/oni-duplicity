import type { ReactNode } from 'react'
import {
  ArrowDown,
  ArrowRight,
  Fish,
  Info,
  PackageOpen,
  Rabbit,
  type LucideIcon,
} from 'lucide-react'
import { EmptyState } from '@/components/empty-state'
import { Badge } from '@/components/ui/badge'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Item, ItemActions, ItemContent, ItemDescription, ItemTitle } from '@/components/ui/item'
import { Progress } from '@/components/ui/progress'
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip'
import { fmt, fmtMass } from '@/lib/format'
import {
  SECONDS_PER_CYCLE,
  STABLE,
  type FeedLine,
  type ProductLine,
  type RanchPlan,
} from '@/lib/tools/ranching-calc'
import type { RanchSpecies } from '@/lib/tools/ranching-data'
import { feedLabel, itemName } from '@/lib/tools/ranching-labels'

const LETTERS = 'ABCDEFGH'

/**
 * The calculator's result as one flow: what the herd takes in, how long it takes, what comes out.
 * Three panels joined by arrows; below 900px they stack and the arrows point down.
 */
export function RanchFlow({
  species,
  plan,
  fish,
  capacity,
  secondsPerRancher,
}: {
  species: RanchSpecies
  plan: RanchPlan
  fish: boolean
  capacity: number
  secondsPerRancher: number
}) {
  return (
    <div
      data-testid="ranch-flow"
      className="grid items-stretch gap-2 min-[900px]:grid-cols-[minmax(0,1fr)_auto_minmax(0,1fr)_auto_minmax(0,1fr)]"
    >
      <TakesPanel species={species} plan={plan} fish={fish} capacity={capacity} />
      <FlowArrow />
      <TimePanel species={species} plan={plan} fish={fish} secondsPerRancher={secondsPerRancher} />
      <FlowArrow />
      <GetPanel species={species} plan={plan} />
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

// ---------------------------------------------------------------- what it takes

function TakesPanel({
  species,
  plan,
  fish,
  capacity,
}: {
  species: RanchSpecies
  plan: RanchPlan
  fish: boolean
  capacity: number
}) {
  return (
    <Panel title="What it takes">
      <div className="flex flex-col gap-2">
        <SectionLabel>Feed, one of</SectionLabel>
        {plan.critters === 0 ? (
          <Nothing title="No herd yet">Enter a herd size to see the feed.</Nothing>
        ) : (
          plan.feed.map((line, i) => <FeedItem key={i} line={line} letter={LETTERS[i] ?? ''} />)
        )}
        <p className="type-caption text-muted-foreground">
          {fmt(species.caloriesPerCycle / 1000, 0)} kcal per critter per cycle
        </p>
      </div>
      <div className="flex flex-col gap-2">
        <SectionLabel>{fish ? 'Pond' : 'Stable'}</SectionLabel>
        <Item variant="outline" size="xs">
          <ItemContent>
            <ItemTitle>Space per critter</ItemTitle>
          </ItemContent>
          <ItemActions className="type-h3 tabular-nums">
            {species.spacePerCritter} cells
          </ItemActions>
        </Item>
        <Item variant="outline" size="xs">
          <ItemContent>
            <ItemTitle>{fish ? 'Pond cells needed' : 'Cells needed'}</ItemTitle>
          </ItemContent>
          <ItemActions className="type-h3 tabular-nums">{fmt(plan.space.needed, 0)}</ItemActions>
        </Item>
        {!fish && (
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
              {plan.space.stables} {plan.space.stables === 1 ? 'stable' : 'stables'} of up to{' '}
              {STABLE.maxCells} cells, {capacity} critters each. Every critter beyond a room's space
              costs 1 happiness.
            </p>
          </>
        )}
        {fish && (
          <p className="type-caption text-muted-foreground">
            Fish count against the water they swim in, not a stable. Babies and adults each take
            their own space.
          </p>
        )}
      </div>
    </Panel>
  )
}

function FeedItem({ line, letter }: { line: FeedLine; letter: string }) {
  const { label, detail } = feedLabel(line.eats)
  return (
    <Item variant="outline" size="xs" data-testid="ranch-feed">
      <Badge variant="secondary" className="shrink-0">
        {letter}
      </Badge>
      <ItemContent>
        <ItemTitle>
          {label}
          {detail && <InfoTip text={detail} label={`What counts as ${label}`} />}
        </ItemTitle>
        <div className="type-h3 tabular-nums">
          {line.kgPerCycle !== undefined
            ? `${fmtMass(line.kgPerCycle)} / cycle`
            : `${fmt(line.caloriesPerCycle / 1000, 0)} kcal / cycle`}
        </div>
      </ItemContent>
    </Item>
  )
}

// ------------------------------------------------------------------- how long

function TimePanel({
  species,
  plan,
  fish,
  secondsPerRancher,
}: {
  species: RanchSpecies
  plan: RanchPlan
  fish: boolean
  secondsPerRancher: number
}) {
  const life = species.lifespanCycles
  const egg = species.egg
  const rows: { label: string; cycles: number }[] = []
  if (egg?.fertilityCycles) rows.push({ label: 'Lays an egg every', cycles: egg.fertilityCycles })
  if (egg?.incubationCycles) rows.push({ label: 'Egg hatches in', cycles: egg.incubationCycles })
  rows.push({ label: 'Lifespan', cycles: life })
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
        {fish ? (
          <Nothing title="No rancher needed" icon={Fish}>
            The grooming station skips swimming critters, so fish need no rancher.
          </Nothing>
        ) : plan.critters === 0 ? (
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
            <Item variant="outline" size="xs">
              <ItemContent>
                <ItemTitle>
                  Ranchers
                  <InfoTip
                    label="How rancher time is worked out"
                    text={`A visit takes 12 s per critter and lasts 600 s, plus 10 % per Ranching point. Each rancher gives ${fmt(secondsPerRancher, 0)} s a cycle. Walking and the schedule are not counted, so treat it as a minimum.`}
                  />
                </ItemTitle>
              </ItemContent>
              <ItemActions className="type-h3 tabular-nums">{plan.ranchers}</ItemActions>
            </Item>
          </>
        )}
      </div>
    </Panel>
  )
}

// ---------------------------------------------------------------- what you get

function GetPanel({ species, plan }: { species: RanchSpecies; plan: RanchPlan }) {
  const eggId = species.egg?.id
  const outputs: { key: string; title: string; value: string; note?: string }[] = []
  if (plan.eggsPerCycle) {
    outputs.push({
      key: 'eggs',
      title: eggId ? itemName(eggId) : 'Eggs',
      value: `${fmt(plan.eggsPerCycle, 2)} / cycle`,
      note: `One per ${species.egg?.fertilityCycles} cycles each`,
    })
  }
  if (plan.shellKgPerCycle) {
    outputs.push({
      key: 'shell',
      title: 'Egg Shell',
      value: `${fmtMass(plan.shellKgPerCycle)} / cycle`,
    })
  }
  for (const p of plan.products) {
    if (p.item === eggId) continue
    const row = productRow(p)
    if (row) outputs.push(row)
  }
  const leftovers = plan.feed
    .map((line, i) => ({ line, letter: LETTERS[i] ?? '' }))
    .filter((f) => f.line.produces && f.line.produces.kgPerCycle > 0)
  return (
    <Panel title="What you get">
      <div className="flex flex-col gap-2">
        {plan.critters === 0 ? (
          <Nothing title="No herd yet">Enter a herd size to see the output.</Nothing>
        ) : outputs.length === 0 ? (
          <Nothing title="No output" icon={PackageOpen}>
            Nothing this species produces is counted.
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
      {plan.critters > 0 && leftovers.length > 0 && (
        <div className="flex flex-col gap-2">
          <SectionLabel>Leaves behind</SectionLabel>
          {leftovers.map(({ line, letter }) => (
            <Item key={letter} variant="outline" size="xs" data-testid="ranch-leftover">
              <Badge variant="secondary" className="shrink-0">
                {letter}
              </Badge>
              <ItemContent>
                <ItemTitle>{itemName(line.produces!.item)}</ItemTitle>
                <div className="type-h3 tabular-nums">
                  {fmtMass(line.produces!.kgPerCycle)} / cycle
                </div>
                <ItemDescription>from {feedLabel(line.eats).label}</ItemDescription>
              </ItemContent>
            </Item>
          ))}
        </div>
      )}
    </Panel>
  )
}

function productRow(p: ProductLine) {
  const title = itemName(p.item)
  if (p.perCycle !== undefined) {
    if (p.perCycle <= 0) return null
    return {
      key: p.item,
      title,
      value: `${fmt(p.perCycle, p.perCycle < 1 ? 3 : 1)} / cycle`,
      note: p.note,
    }
  }
  if (p.onDeathKg !== undefined && p.onDeathKg > 0) {
    return {
      key: p.item,
      title,
      value: `${fmtMass(p.onDeathKg)} per critter on death`,
      note: p.note,
    }
  }
  return null
}
