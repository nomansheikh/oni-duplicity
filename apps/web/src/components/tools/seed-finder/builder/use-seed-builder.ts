import { useCallback, useEffect, useMemo, useState } from 'react'
import {
  applyPreset,
  changeCluster,
  emptyState,
  fitToEdition,
  parseState,
  type BuilderState,
} from '@/lib/tools/seed-builder'
import { asteroidOptions, availableIds } from '@/lib/tools/seed-catalog'
import { SEED_CLUSTERS } from '@/seed/clusters'
import type { SeedPreset } from '@/seed/rules'

const KEY = 'duplicity:seed-finder:builder'
const find = (prefix: string) => SEED_CLUSTERS.find((c) => c.prefix === prefix)

function load(): BuilderState {
  try {
    const stored = parseState(JSON.parse(localStorage.getItem(KEY) ?? 'null'))
    if (stored && find(stored.cluster)) return stored
  } catch {
    // Storage can be blocked or hold something else: start fresh.
  }
  return emptyState(SEED_CLUSTERS[0]!.prefix)
}

/** The builder's state, kept in this browser so a search survives a reload. */
export function useSeedBuilder() {
  const [state, setState] = useState(load)
  useEffect(() => {
    try {
      localStorage.setItem(KEY, JSON.stringify(state))
    } catch {
      // Not saving is fine: the page still works.
    }
  }, [state])

  const cluster = useMemo(() => find(state.cluster) ?? SEED_CLUSTERS[0]!, [state.cluster])
  const selectCluster = useCallback((prefix: string) => {
    const next = find(prefix)
    if (!next) return
    const asteroids = asteroidOptions(prefix).map((a) => a.id)
    setState((s) => fitToEdition(changeCluster(s, prefix, asteroids), availableIds(next.edition)))
  }, [])
  const selectPreset = useCallback(
    (preset: SeedPreset) =>
      setState((s) => fitToEdition(applyPreset(s, preset), availableIds(cluster.edition))),
    [cluster.edition],
  )
  return { state, setState, cluster, selectCluster, selectPreset }
}
