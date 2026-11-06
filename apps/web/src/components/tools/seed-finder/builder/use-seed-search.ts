import { useCallback, useEffect, useRef, useState } from 'react'
import type { SeedLimit } from '@/lib/tools/seed-limit'
import type { SeedCluster } from '@/seed/clusters'
import { encodeMixing, type MixingLevels } from '@/seed/mixing'
import type { SeedRule } from '@/seed/rules'
import type { SeedProgress, SeedSearch, SeedSearchSummary } from '@/seed/search-types'

/** What one Find runs: the cluster, its mixing, the rules and how many seeds to try. */
export interface SeedRun {
  cluster: SeedCluster
  rules: SeedRule[]
  mixing: MixingLevels
  maxSeeds: SeedLimit
}

/**
 * Runs the seed search. The engine and its worldgen are imported on the first `find`, never on
 * page load. The mixing levels become the coordinate's mixing code, which the generator reads.
 */
export function useSeedSearch() {
  const search = useRef<SeedSearch | null>(null)
  const [ready, setReady] = useState<SeedSearch | null>(null)
  const [progress, setProgress] = useState<SeedProgress | null>(null)
  const [starting, setStarting] = useState(false)
  const [summary, setSummary] = useState<SeedSearchSummary | null>(null)
  /** The seed limit of the latest run, for the "N / limit" readout. */
  const [limit, setLimit] = useState<SeedLimit>(null)
  const off = useRef<(() => void)[]>([])

  useEffect(
    () => () => {
      search.current?.stop()
      off.current.forEach((fn) => fn())
    },
    [],
  )

  const find = useCallback(async ({ cluster, rules, mixing, maxSeeds }: SeedRun) => {
    setSummary(null)
    setLimit(maxSeeds)
    setStarting(true)
    try {
      if (!search.current) {
        const { createSeedSearch } = await import('@/seed/search')
        search.current = createSeedSearch()
        off.current.push(search.current.onProgress(setProgress))
        setReady(search.current)
      }
      const done = await search.current.start(cluster, rules, {
        start: { mode: 'random' },
        coordinateTail: { settings: '0', story: '0', mixing: encodeMixing(mixing) },
        ...(maxSeeds === null ? {} : { maxSeeds }),
      })
      setProgress(done)
      setSummary(done)
    } catch (error) {
      setSummary({
        running: false,
        generated: 0,
        matched: 0,
        failed: 0,
        elapsedMs: 0,
        seedsPerSecond: 0,
        reason: 'error',
        error: error instanceof Error ? error.message : String(error),
      })
    } finally {
      setStarting(false)
    }
  }, [])

  const stop = useCallback(() => search.current?.stop(), [])
  const running = starting || progress?.running === true
  return { search: ready, progress, summary, limit, running, find, stop }
}
