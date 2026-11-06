import type { ComponentType } from 'react'
import { PageHeader } from '@/components/page-header'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { blocker, runnableRules } from '@/lib/tools/seed-builder'
import { RuleList } from './builder/rule-list'
import { SearchControls } from './builder/search-controls'
import { SetupBar } from './builder/setup-bar'
import { useSeedBuilder } from './builder/use-seed-builder'
import { useSeedSearch } from './builder/use-seed-search'
import { ResultsStub, type SeedResultsProps } from './results-slot'

/**
 * Searches world seeds for the geysers and traits you want. Nothing here touches a save, and the
 * generator only loads when Find is clicked. `Results` is where the results list plugs in.
 */
export function SeedFinderPage({
  Results = ResultsStub,
}: {
  Results?: ComponentType<SeedResultsProps>
}) {
  const { state, setState, cluster, selectCluster, selectPreset } = useSeedBuilder()
  const { search, progress, summary, running, find, stop } = useSeedSearch()
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
          <SetupBar cluster={cluster.prefix} onCluster={selectCluster} onPreset={selectPreset} />
          <RuleList state={state} cluster={cluster} onChange={setState} />
          <SearchControls
            running={running}
            blocker={blocker(state)}
            progress={progress}
            summary={summary}
            onFind={() => void find(cluster, rules)}
            onStop={stop}
          />
        </CardContent>
      </Card>
      <Results search={search} cluster={cluster} rules={rules} progress={progress} />
    </div>
  )
}
