import type { SeedProgress, SeedSearch } from '@/seed/search-types'
import type { SeedCluster } from '@/seed/clusters'
import type { SeedRule } from '@/seed/rules'

/** What the results component gets: the live search and the rules and cluster it ran with. */
export interface SeedResultsProps {
  /** Null until the user clicks Find for the first time. */
  search: SeedSearch | null
  cluster: SeedCluster
  rules: SeedRule[]
  /** The latest progress; `matched` changes whenever the top list may have. */
  progress: SeedProgress | null
}

/** The page's plug point: the results list replaces this stub. */
export function ResultsStub({ progress }: SeedResultsProps) {
  return (
    <p className="well px-3 py-4 type-small text-muted-foreground" data-testid="seed-results-stub">
      {progress
        ? `${progress.matched} matching seeds so far.`
        : 'Results appear here once a search is running.'}
    </p>
  )
}
