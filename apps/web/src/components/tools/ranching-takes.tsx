import { NumberField } from '@/components/common'
import { Progress } from '@/components/ui/progress'
import { ToggleGroup, ToggleGroupItem } from '@/components/ui/toggle-group'
import { fmt } from '@/lib/format'
import { STABLE } from '@/lib/tools/ranching-calc'
import type { RanchControls } from './ranching-controls'
import { FeedEditor } from './ranching-feed'
import { FieldRow, Panel, SectionLabel } from './ranching-parts'

/** What it takes: the room (critters or cells) and the feed, with wild or tame. */
export function TakesPanel(c: RanchControls) {
  const { species, plan, tame, setTame } = c
  const fish = species.swims
  const region = fish ? 'Pond' : 'Stable'
  const hasSpace = species.spacePerCritter > 0
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
                {hasSpace ? plan.critters : 'No limit'}
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
            {hasSpace ? `${species.spacePerCritter} cells` : 'None needed'}
          </span>
        </FieldRow>
        {hasSpace && (
          <FieldRow label={`${region} cells needed`}>
            <span className="type-h3 tabular-nums">{fmt(plan.space.needed, 0)}</span>
          </FieldRow>
        )}
        {!fish && hasSpace && (
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
