import { useCallback, useEffect, useMemo, useState } from 'react'
import {
  changeCluster,
  emptyState,
  fitToDlcs,
  parseState,
  type BuilderState,
} from '@/lib/tools/seed-builder'
import { asteroidOptions, availableIds } from '@/lib/tools/seed-catalog'
import type { SeedLimit } from '@/lib/tools/seed-limit'
import { loadPreset } from '@/lib/tools/seed-presets'
import { SEED_CLUSTERS, type SeedCluster } from '@/seed/clusters'
import { dlcsInPlay, fitMixing, type MixingLevels } from '@/seed/mixing'
import type { SeedPreset } from '@/seed/rules'

const KEY = 'duplicity:seed-finder:builder'
const find = (prefix: string) => SEED_CLUSTERS.find((c) => c.prefix === prefix)

function load(): BuilderState {
  try {
    const stored = parseState(JSON.parse(localStorage.getItem(KEY) ?? 'null'))
    const cluster = stored && find(stored.cluster)
    if (stored && cluster) return { ...stored, mixing: fitMixing(cluster, stored.mixing) }
  } catch {
    // Storage can be blocked or hold something else: start fresh.
  }
  return emptyState(SEED_CLUSTERS[0]!.prefix)
}

/**
 * Moves the state to a cluster and mixing the game allows: invalid mixing levels go, rules that
 * name an asteroid the cluster lacks fall back to anywhere, and rules on geysers or traits the
 * DLCs in play cannot generate are dropped.
 */
function settle(state: BuilderState, cluster: SeedCluster, mixing: MixingLevels): BuilderState {
  const fitted = fitMixing(cluster, mixing)
  const asteroids = asteroidOptions(cluster.prefix, fitted).map((a) => a.id)
  const moved = { ...changeCluster(state, cluster.prefix, asteroids), mixing: fitted }
  return fitToDlcs(moved, availableIds(dlcsInPlay(cluster, fitted)))
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
    if (next) setState((s) => settle(s, next, s.mixing))
  }, [])
  const setMixing = useCallback(
    (id: string, level: number) =>
      setState((s) => settle(s, cluster, { ...s.mixing, [id]: level })),
    [cluster],
  )
  const selectPreset = useCallback(
    (preset: SeedPreset) => setState((s) => loadPreset(s, preset, dlcsInPlay(cluster, s.mixing))),
    [cluster],
  )
  const setMaxSeeds = useCallback(
    (maxSeeds: SeedLimit) => setState((s) => ({ ...s, maxSeeds })),
    [],
  )
  return { state, setState, cluster, selectCluster, setMixing, selectPreset, setMaxSeeds }
}
