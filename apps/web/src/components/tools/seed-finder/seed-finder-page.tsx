import { PageHeader } from '@/components/page-header'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { blocker, runnableRules } from '@/lib/tools/seed-builder'
import { mixingBlocker } from '@/seed/mixing'
import { RuleList } from './builder/rule-list'
import { SearchControls } from './builder/search-controls'
import { SetupBar } from './builder/setup-bar'
import { useSeedBuilder } from './builder/use-seed-builder'
import { useSeedSearch } from './builder/use-seed-search'
import { ResultsSlot } from './results-slot'
import { SeedLookup } from './seed-lookup'

/**
 * Searches world seeds for the geysers and traits you want. Nothing here touches a save, and the
 * generator only loads when Find is clicked.
 */
export function SeedFinderPage() {
  const builder = useSeedBuilder()
  const { state, setState, cluster, selectCluster, setMixing, selectPreset, setMaxSeeds } = builder
  const { search, progress, summary, limit, running, find, stop } = useSeedSearch()
  const rules = runnableRules(state)
  return (
    <div className="flex flex-col gap-4">
      <PageHeader
        title="Seed finder"
        status="experimental"
        description="Describe the geysers and traits you want, and the finder generates seeds until it has the best matches. Seeds come from a bundled copy of the game's world generator, so a few details can differ from the game; check a result in the game before relying on it."
      />
      <Card>
        <CardHeader>
          <CardTitle>Rules</CardTitle>
        </CardHeader>
        <CardContent className="flex flex-col gap-4">
          <SetupBar
            state={state}
            cluster={cluster}
            onCluster={selectCluster}
            onMixing={setMixing}
            onPreset={selectPreset}
          />
          <RuleList state={state} cluster={cluster} onChange={setState} />
          <SearchControls
            running={running}
            blocker={blocker(state) ?? mixingBlocker(cluster, state.mixing)}
            progress={progress}
            summary={summary}
            maxSeeds={state.maxSeeds}
            runLimit={limit}
            onMaxSeeds={setMaxSeeds}
            onFind={() =>
              void find({ cluster, rules, mixing: state.mixing, maxSeeds: state.maxSeeds })
            }
            onStop={stop}
          />
        </CardContent>
      </Card>
      <SeedLookup />
      <ResultsSlot search={search} cluster={cluster} rules={rules} progress={progress} />
    </div>
  )
}
