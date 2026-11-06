import { useCallback, useEffect, useRef, useState } from 'react'
import type { SeedCluster } from '@/seed/clusters'
import type { SeedRule } from '@/seed/rules'
import type { SeedProgress, SeedSearch, SeedSearchSummary } from '@/seed/search-types'

/**
 * Runs the seed search. The engine and its worldgen are imported on the first `find`, never on
 * page load.
 */
export function useSeedSearch() {
  const search = useRef<SeedSearch | null>(null)
  const [ready, setReady] = useState<SeedSearch | null>(null)
  const [progress, setProgress] = useState<SeedProgress | null>(null)
  const [starting, setStarting] = useState(false)
  const [summary, setSummary] = useState<SeedSearchSummary | null>(null)
  const off = useRef<(() => void)[]>([])

  useEffect(
    () => () => {
      search.current?.stop()
      off.current.forEach((fn) => fn())
    },
    [],
  )

  const find = useCallback(async (cluster: SeedCluster, rules: SeedRule[]) => {
    setSummary(null)
    setStarting(true)
    try {
      if (!search.current) {
        const { createSeedSearch } = await import('@/seed/search')
        search.current = createSeedSearch()
        off.current.push(search.current.onProgress(setProgress))
        setReady(search.current)
      }
      const done = await search.current.start(cluster, rules, { start: { mode: 'random' } })
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
  return { search: ready, progress, summary, running, find, stop }
}
