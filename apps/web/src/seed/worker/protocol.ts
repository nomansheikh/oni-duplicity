import type { SeedResult } from '../result.ts'
import type { SeedRule } from '../rules.ts'

/** Main thread to worker: generate and score these coordinates. */
export interface RunMessage {
  type: 'run'
  jobId: number
  prefix: string
  coordinates: string[]
  rules: SeedRule[]
}

/** Worker to main thread: the outcome of one `RunMessage`. */
export type WorkerReply =
  | {
      type: 'batch'
      jobId: number
      generated: number
      failed: number
      /** Seeds that passed every must rule; each one carries its score. */
      results: SeedResult[]
    }
  | { type: 'error'; jobId: number; message: string }
