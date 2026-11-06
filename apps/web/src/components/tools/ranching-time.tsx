import { Fish } from 'lucide-react'
import { NumberField } from '@/components/common'
import { Progress } from '@/components/ui/progress'
import { fmt } from '@/lib/format'
import { RANCHER, SECONDS_PER_CYCLE } from '@/lib/tools/ranching-calc'
import { lifeTimeline } from '@/lib/tools/ranching-life'
import type { RanchControls } from './ranching-controls'
import { FieldRow, Nothing, Panel, SectionLabel } from './ranching-parts'
import { LifeTimelineView } from './ranching-timeline'

function Stat({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex items-baseline justify-between gap-2 type-small">
      <dt className="text-muted-foreground">{label}</dt>
      <dd className="type-label tabular-nums">{value}</dd>
    </div>
  )
}

/** How long: the critter's life as a timeline with the plain numbers beside it, and the rancher. */
export function TimePanel(c: RanchControls) {
  const { species, plan } = c
  const life = lifeTimeline(species)
  const eggs = life.lifetimeEggs
  return (
    <Panel title="How long">
      <div className="flex flex-col gap-3">
        <SectionLabel>Life, in cycles</SectionLabel>
        <LifeTimelineView life={life} />
        <dl className="flex flex-col gap-1" data-testid="ranch-life">
          {life.eggEvery !== undefined && (
            <Stat label="Lays" value={`1 egg / ${fmt(life.eggEvery, 0)} cycles`} />
          )}
          {life.incubationCycles > 0 && (
            <Stat label="Egg hatches in" value={`${fmt(life.incubationCycles, 0)} cycles`} />
          )}
          <Stat label="Lives" value={`${fmt(life.lifespanCycles, 0)} cycles`} />
          {life.eggEvery !== undefined && (
            <Stat label="Per lifetime" value={`${eggs} ${eggs === 1 ? 'egg' : 'eggs'}`} />
          )}
        </dl>
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
                value={c.rancherSkill}
                min={0}
                onCommit={c.setRancherSkill}
                className="w-28"
              />
            </FieldRow>
            <FieldRow label="Seconds a rancher can spare" tip="Per cycle, for each rancher.">
              <NumberField
                label="Seconds of ranching per rancher per cycle"
                value={c.secondsPerRancher}
                min={0}
                onCommit={c.setSecondsPerRancher}
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
