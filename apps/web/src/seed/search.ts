import type { SeedCluster } from './clusters.ts'
import { coordinateFor, nextSeeds } from './coordinates.ts'
import { SeedPool } from './pool.ts'
import { TopList } from './rank.ts'
import type { SeedResult } from './result.ts'
import type { SeedRule } from './rules.ts'
import type {
  ProgressListener,
  ResultListener,
  SeedProgress,
  SeedSearch,
  SeedSearchOptions,
  SeedSearchSummary,
} from './search-types.ts'

const BATCH = 4
const PROGRESS_MS = 250

/** Creates a search. Workers, and the generator inside them, start on the first `start()`. */
export function createSeedSearch(): SeedSearch {
  const resultListeners = new Set<ResultListener>()
  const progressListeners = new Set<ProgressListener>()
  let top = new TopList(20)
  let pool: SeedPool | undefined
  let stopRequested = false

  async function start(
    cluster: SeedCluster,
    rules: SeedRule[],
    options: SeedSearchOptions,
  ): Promise<SeedSearchSummary> {
    if (pool) throw new Error('A seed search is already running')
    top = new TopList(options.top ?? 20)
    stopRequested = false
    const active = new SeedPool(options.workers ?? 2)
    pool = active
    const began = performance.now()
    const stats = { generated: 0, matched: 0, failed: 0 }
    let cursor = options.start.mode === 'sequential' ? options.start.from : 0
    const maxSeeds = options.maxSeeds ?? Infinity
    let issued = 0
    let error: string | undefined

    const snapshot = (running: boolean): SeedProgress => {
      const elapsedMs = performance.now() - began
      return {
        running,
        ...stats,
        elapsedMs,
        seedsPerSecond: elapsedMs > 0 ? (stats.generated * 1000) / elapsedMs : 0,
      }
    }
    const timer = setInterval(() => {
      for (const listener of progressListeners) listener(snapshot(true))
    }, PROGRESS_MS)

    async function lane(index: number): Promise<void> {
      while (!stopRequested && !error && issued < maxSeeds) {
        const count = Math.min(BATCH, maxSeeds - issued)
        issued += count
        const seeds = nextSeeds(options.start, cursor, count)
        cursor += count
        const coordinates = seeds.map((seed) =>
          coordinateFor(cluster, seed, options.coordinateTail),
        )
        const reply = await active.run(index, { prefix: cluster.prefix, coordinates, rules })
        if (stopRequested) return
        if (reply.type === 'error') {
          error = reply.message
          return
        }
        stats.generated += reply.generated
        stats.failed += reply.failed
        stats.matched += reply.results.length
        for (const result of reply.results as SeedResult[]) {
          if (top.insert(result)) {
            const ranking = top.list()
            for (const listener of resultListeners) listener(result, ranking)
          }
        }
      }
    }

    try {
      await Promise.all(Array.from({ length: active.size }, (_, index) => lane(index)))
    } catch (caught) {
      error = String(caught)
    } finally {
      clearInterval(timer)
      active.terminate()
      pool = undefined
    }
    const summary: SeedSearchSummary = {
      ...snapshot(false),
      reason: error ? 'error' : stopRequested ? 'stopped' : 'done',
      ...(error ? { error } : {}),
    }
    for (const listener of progressListeners) listener(summary)
    return summary
  }

  return {
    start,
    onResult(listener) {
      resultListeners.add(listener)
      return () => resultListeners.delete(listener)
    },
    onProgress(listener) {
      progressListeners.add(listener)
      return () => progressListeners.delete(listener)
    },
    stop() {
      stopRequested = true
      pool?.terminate()
    },
    results: () => top.list(),
  }
}
