import type { RunMessage, WorkerReply } from './worker/protocol.ts'

/** A worker's WASM memory only grows, so a worker is replaced after this many seeds. */
export const RECYCLE_AFTER_SEEDS = 80

interface Slot {
  worker: Worker
  seeds: number
  busy: boolean
  /** Settles the running batch when the pool is terminated mid-run. */
  abort?: () => void
}

function spawn(): Worker {
  return new Worker(new URL('./worker/seed.worker.ts', import.meta.url), { type: 'module' })
}

/** Up to two generator workers, each replaced after `RECYCLE_AFTER_SEEDS` seeds. */
export class SeedPool {
  private slots: Slot[]
  private nextJob = 1

  constructor(size: 1 | 2) {
    this.slots = Array.from({ length: Math.min(size, 2) }, () => ({
      worker: spawn(),
      seeds: 0,
      busy: false,
    }))
  }

  get size(): number {
    return this.slots.length
  }

  /** Runs one batch on the given slot; the slot must be idle. */
  run(index: number, job: Omit<RunMessage, 'type' | 'jobId'>): Promise<WorkerReply> {
    const slot = this.slots[index]!
    slot.busy = true
    const jobId = this.nextJob++
    return new Promise((resolve, reject) => {
      slot.abort = () => resolve({ type: 'error', jobId, message: 'terminated' })
      slot.worker.onmessage = (event: MessageEvent<WorkerReply>) => {
        slot.busy = false
        slot.abort = undefined
        slot.seeds += job.coordinates.length
        if (slot.seeds >= RECYCLE_AFTER_SEEDS) {
          slot.worker.terminate()
          slot.worker = spawn()
          slot.seeds = 0
        }
        resolve(event.data)
      }
      slot.worker.onerror = (event) => {
        slot.busy = false
        reject(new Error(event.message || 'seed worker failed'))
      }
      slot.worker.postMessage({ type: 'run', jobId, ...job } satisfies RunMessage)
    })
  }

  terminate(): void {
    for (const slot of this.slots) {
      slot.worker.terminate()
      slot.abort?.()
    }
    this.slots = []
  }
}
