import { Plus } from 'lucide-react'
import { Button } from '@/components/ui/button'
import {
  addRule,
  changeKind,
  patchRule,
  removeRule,
  type BuilderState,
} from '@/lib/tools/seed-builder'
import { asteroidOptions, geyserOptions, traitOptions } from '@/lib/tools/seed-catalog'
import type { SeedCluster } from '@/seed/clusters'
import { dlcsInPlay } from '@/seed/mixing'
import { RuleRow } from './rule-row'

/** The rule rows and the Add rule button. */
export function RuleList({
  state,
  cluster,
  onChange,
}: {
  state: BuilderState
  cluster: SeedCluster
  onChange: (update: (state: BuilderState) => BuilderState) => void
}) {
  const dlcs = dlcsInPlay(cluster, state.mixing)
  const options = {
    geysers: geyserOptions(dlcs),
    traits: traitOptions(dlcs),
    asteroids: asteroidOptions(cluster.prefix, state.mixing),
  }
  return (
    <div className="flex flex-col gap-2">
      {state.rules.length === 0 ? (
        <p className="well px-3 py-4 type-small text-muted-foreground">
          No rules yet. Pick a preset above or add a rule. A must rule drops every seed that misses
          it; a nice rule adds its weight to the score of a seed that matches.
        </p>
      ) : (
        <ul className="flex flex-col gap-2">
          {state.rules.map((rule) => (
            <RuleRow
              key={rule.id}
              rule={rule}
              options={options}
              onKind={(kind) => onChange((s) => changeKind(s, rule.id, kind))}
              onPatch={(patch) => onChange((s) => patchRule(s, rule.id, patch))}
              onRemove={() => onChange((s) => removeRule(s, rule.id))}
            />
          ))}
        </ul>
      )}
      <Button variant="outline" size="sm" className="self-start" onClick={() => onChange(addRule)}>
        <Plus /> Add rule
      </Button>
    </div>
  )
}
