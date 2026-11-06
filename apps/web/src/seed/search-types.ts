import type { SeedCluster } from './clusters.ts'
import type { SeedResult } from './result.ts'
import type { SeedRule } from './rules.ts'

/** Which seeds to try. */
export type SeedStart = { mode: 'random' } | { mode: 'sequential'; from: number }

export interface SeedSearchOptions {
  start: SeedStart
  /** Keep this many best results. Default 20. */
  top?: number
  /** Stop after generating this many seeds. Default: run until `stop()`. */
  maxSeeds?: number
  /**
   * The settings, story and mixing parts of the coordinate (`<prefix>-<seed>-<settings>-<story>-
   * <mixing>`). Default `0`, `0`, `0`.
   */
  coordinateTail?: { settings: string; story: string; mixing: string }
  /** Worker count, 1 or 2. Default 2. */
  workers?: 1 | 2
}

export interface SeedProgress {
  running: boolean
  /** Seeds generated so far, including ones that failed or missed a must rule. */
  generated: number
  /** Seeds that passed every must rule. */
  matched: number
  /** Seeds the generator could not build. */
  failed: number
  elapsedMs: number
  seedsPerSecond: number
}

export interface SeedSearchSummary extends SeedProgress {
  /** Why the run ended. */
  reason: 'stopped' | 'done' | 'error'
  error?: string
}

/** Called for each result that enters the top list; `ranking` is the list after it, best first. */
export type ResultListener = (result: SeedResult, ranking: SeedResult[]) => void
export type ProgressListener = (progress: SeedProgress) => void

export interface SeedSearch {
  /** Starts a run; resolves when it ends. Throws if one is running. Loads worldgen lazily. */
  start(
    cluster: SeedCluster,
    rules: SeedRule[],
    options: SeedSearchOptions,
  ): Promise<SeedSearchSummary>
  /** Subscribes to results; returns the unsubscribe function. */
  onResult(listener: ResultListener): () => void
  /** Subscribes to progress (about 4 times a second); returns the unsubscribe function. */
  onProgress(listener: ProgressListener): () => void
  /** Ends the run; `start` resolves with reason `stopped`. */
  stop(): void
  /** The current top list, best first. */
  results(): SeedResult[]
}
