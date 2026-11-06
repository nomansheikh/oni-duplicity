import { PackageOpen } from 'lucide-react'
import { Badge } from '@/components/ui/badge'
import { Item, ItemActions, ItemContent, ItemDescription, ItemTitle } from '@/components/ui/item'
import { fmt, fmtMass } from '@/lib/format'
import { lifeTimeline } from '@/lib/tools/ranching-life'
import type { RanchControls } from './ranching-controls'
import { InfoTip, Nothing, Panel, SectionLabel } from './ranching-parts'

interface Output {
  key: string
  title: string
  value: string
  note?: string
}

function Row({ title, value, note, testId }: Omit<Output, 'key'> & { testId?: string }) {
  return (
    <Item variant="outline" size="xs" data-testid={testId}>
      <ItemContent>
        <ItemTitle className="whitespace-nowrap">
          {title}
          {note && <InfoTip text={note} label={`About ${title}`} />}
        </ItemTitle>
      </ItemContent>
      <ItemActions className="type-h3 tabular-nums">{value}</ItemActions>
    </Item>
  )
}

function outputsOf({ species, plan }: RanchControls): Output[] {
  const egg = species.egg
  const out: Output[] = []
  if (plan.eggsPerCycle) {
    out.push({
      key: 'eggs',
      title: egg?.name ?? 'Eggs',
      value: `${fmt(plan.eggsPerCycle, 2)} / cycle`,
      note: `One per ${fmt(egg?.fertilityCycles ?? 0, 0)} cycles each`,
    })
  }
  if (plan.shellKgPerCycle) {
    out.push({
      key: 'shell',
      title: 'Egg Shell',
      value: `${fmtMass(plan.shellKgPerCycle)} / cycle`,
    })
  }
  if (plan.shear) {
    out.push({
      key: 'shear',
      title: plan.shear.name,
      value: `${fmtMass(plan.shear.kgPerCycle)} / cycle`,
      note: `Regrows in ${fmt(plan.shear.cycles, 0)} cycles`,
    })
  }
  if (plan.milk) {
    out.push({
      key: 'milk',
      title: 'Milk tank',
      value: `${fmtMass(plan.milk.capacityKg)} per critter`,
      note: `Fills while the critter eats ${fmt(plan.milk.caloriesPerCycle / 1000, 0)} kcal a cycle`,
    })
  }
  return out
}

/** What you get per cycle, by morph, left behind, and over a critter's whole life. */
export function GetPanel(c: RanchControls) {
  const { species, plan } = c
  const outputs = outputsOf(c)
  const life = lifeTimeline(species)
  const leftovers = plan.feed.filter((l) => l.produces && l.produces.kgPerCycle > 0)
  const shellPerLife = species.egg
    ? life.lifetimeEggs * species.egg.massKg * species.egg.shellRatio
    : 0
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
          outputs.map(({ key, ...o }) => <Row key={key} {...o} testId="ranch-output" />)
        )}
      </div>
      {plan.critters > 0 && plan.morphs.length > 1 && (
        <div className="flex flex-col gap-2">
          <SectionLabel>Eggs by morph</SectionLabel>
          {plan.morphs.map((m) => (
            <Row
              key={m.speciesId}
              title={m.name}
              value={`${fmt(m.eggsPerCycle, m.eggsPerCycle < 0.1 ? 3 : 2)} / cycle`}
              testId="ranch-morph"
            />
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
      <div className="flex flex-col gap-2">
        <SectionLabel>Per critter, over its life</SectionLabel>
        {life.eggEvery !== undefined && (
          <Row
            title={species.egg?.name ?? 'Eggs'}
            value={`${life.lifetimeEggs}`}
            note={`floor(${fmt(life.lifespanCycles, 0)} cycles lived / ${fmt(life.eggEvery, 0)} cycles per egg)`}
          />
        )}
        {shellPerLife > 0 && <Row title="Egg Shell" value={fmtMass(shellPerLife)} />}
        {species.deathDrops.map((d) => (
          <Row key={d.id} title={`${d.name} on death`} value={fmtMass(d.kg)} />
        ))}
      </div>
    </Panel>
  )
}
