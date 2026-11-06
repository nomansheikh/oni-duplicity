import type { SeedCluster } from '@/seed/clusters'
import type { SeedRule } from '@/seed/rules'
import type { SeedProgress, SeedSearch } from '@/seed/search-types'
import { SeedResults } from './results/seed-results'

/** What the results component gets: the live search and the rules and cluster it ran with. */
export interface SeedResultsProps {
  /** Null until the user clicks Find for the first time. */
  search: SeedSearch | null
  cluster: SeedCluster
  rules: SeedRule[]
  /** The latest progress; `generated` and `matched` change as the top list may have. */
  progress: SeedProgress | null
}

/**
 * Plugs the live search into the results list. The `progress` prop arrives about four times a second and
 * after the final summary, so reading the top list on each render keeps it live, including the
 * reset when a new run starts.
 */
export function ResultsSlot({ search, rules }: SeedResultsProps) {
  return <SeedResults results={search ? search.results() : []} rules={rules} />
}
