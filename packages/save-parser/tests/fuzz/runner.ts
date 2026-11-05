import { Worker } from 'node:worker_threads'
import type { CaseResult, FuzzCase } from './shared.ts'

export interface RunOptions {
  fixturePath: string
  cases: FuzzCase[]
  /** Time one case may take before its worker is terminated and the case counts as a hang. */
  deadlineMs: number
  concurrency: number
  /**
   * Old-generation heap cap per worker; exceeding it is reported as an out-of-memory failure. It
   * does not cap typed-array (ArrayBuffer) memory, so a huge allocation can still exhaust the process. The
   * fixture's cases stay under 128 MB, so 256 leaves headroom.
   */
  maxHeapMb?: number
}

const WORKER_URL = new URL('./worker.ts', import.meta.url)
const START_TIMEOUT_MS = 60_000

interface Slot {
  worker: Worker
  current?: number
  timer?: NodeJS.Timeout
  closed: boolean
}

/**
 * Run every case in a pool of worker threads. A case that exceeds the deadline, crashes its worker
 * or runs it out of memory is recorded as a bug and the worker is replaced.
 */
export function runCases(options: RunOptions): Promise<CaseResult[]> {
  const { cases, deadlineMs, concurrency, fixturePath, maxHeapMb = 256 } = options
  const results: (CaseResult | undefined)[] = new Array(cases.length)
  let next = 0
  // Timed-out cases get one more try in a fresh worker before they count as hangs.
  const retries: number[] = []
  const retried = new Set<number>()
  let done = 0
  const slots = new Set<Slot>()

  return new Promise((resolve, reject) => {
    const finish = (error?: Error) => {
      for (const slot of slots) {
        clearTimeout(slot.timer)
        slot.closed = true
        void slot.worker.terminate()
      }
      slots.clear()
      if (error) reject(error)
      else resolve(results as CaseResult[])
    }

    const record = (index: number, result: Omit<CaseResult, 'case'>) => {
      results[index] = { case: cases[index]!, ...result }
      if (++done === cases.length) finish()
    }

    const dispatch = (slot: Slot) => {
      if (next >= cases.length && retries.length === 0) {
        slot.closed = true
        void slot.worker.terminate()
        slots.delete(slot)
        return
      }
      const index = retries.shift() ?? next++
      slot.current = index
      slot.timer = setTimeout(() => {
        if (retried.has(index)) {
          record(index, {
            outcome: 'bug',
            kind: 'timeout',
            message: `no result in ${deadlineMs} ms, twice`,
            ms: deadlineMs,
          })
        } else {
          retried.add(index)
          retries.push(index)
        }
        retire(slot)
      }, deadlineMs)
      slot.worker.postMessage({ index, case: cases[index] })
    }

    // Replace a dead or terminated worker while there is still work to hand out.
    const retire = (slot: Slot) => {
      clearTimeout(slot.timer)
      slot.closed = true
      slot.current = undefined
      slots.delete(slot)
      void slot.worker.terminate()
      if (next < cases.length || retries.length > 0) spawn()
    }

    const spawn = () => {
      const worker = new Worker(WORKER_URL, {
        workerData: { path: fixturePath },
        resourceLimits: { maxOldGenerationSizeMb: maxHeapMb },
      })
      const slot: Slot = { worker, closed: false }
      slots.add(slot)
      slot.timer = setTimeout(
        () => finish(new Error(`fuzz worker did not start within ${START_TIMEOUT_MS} ms`)),
        START_TIMEOUT_MS,
      )

      worker.on('message', (message: unknown) => {
        if (slot.closed) return
        if (message === 'ready') {
          clearTimeout(slot.timer)
          dispatch(slot)
          return
        }
        const reply = message as CaseResult & { index: number }
        clearTimeout(slot.timer)
        slot.current = undefined
        record(reply.index, {
          outcome: reply.outcome,
          kind: reply.kind,
          message: reply.message,
          stack: reply.stack,
          ms: reply.ms,
        })
        dispatch(slot)
      })

      const died = (kind: string, message: string) => {
        if (slot.closed) return
        if (slot.current === undefined) {
          finish(new Error(`fuzz worker failed outside a case: ${message}`))
          return
        }
        record(slot.current, { outcome: 'bug', kind, message, ms: 0 })
        retire(slot)
      }
      worker.on('error', (error: Error & { code?: string }) => {
        died(error.code === 'ERR_WORKER_OUT_OF_MEMORY' ? 'oom' : 'crash', error.message)
      })
      worker.on('exit', (code) => died('crash', `worker exited with code ${code}`))
    }

    if (cases.length === 0) {
      finish()
      return
    }
    const count = Math.min(concurrency, cases.length)
    for (let i = 0; i < count; i++) spawn()
  })
}
