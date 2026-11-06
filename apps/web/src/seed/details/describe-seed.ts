import { checkCoordinate } from './coordinate.ts'
import type { DescribeMessage, DescribeReply } from './protocol.ts'
import type { SeedDetail } from './types.ts'

/** A worker's WASM memory only grows, so it is replaced after this many seeds. */
export const RECYCLE_AFTER = 30
/** The generator holds a few hundred MB, so an idle worker is stopped. */
export const IDLE_MS = 60_000
const KEEP = 2

/** The coordinate is malformed or outside what the bundled generator makes. */
export class SeedUnsupportedError extends Error {}

interface Pending {
  resolve: (detail: SeedDetail) => void
  reject: (error: Error) => void
}

let worker: Worker | undefined
let described = 0
let nextId = 1
let idleTimer: ReturnType<typeof setTimeout> | undefined
const pending = new Map<number, Pending>()
const recent = new Map<string, SeedDetail>()

function stop(): void {
  worker?.terminate()
  worker = undefined
  described = 0
  for (const { reject } of pending.values()) reject(new Error('Stopped'))
  pending.clear()
}

function onReply(event: MessageEvent<DescribeReply>): void {
  const reply = event.data
  const waiting = pending.get(reply.id)
  pending.delete(reply.id)
  if (pending.size === 0) idleTimer = setTimeout(stop, IDLE_MS)
  if (!waiting) return
  if (reply.type === 'detail') waiting.resolve(reply.detail)
  else waiting.reject(new Error(reply.message))
}

function spawn(): Worker {
  const next = new Worker(new URL('./detail.worker.ts', import.meta.url), { type: 'module' })
  next.onmessage = onReply
  next.onerror = (event) => {
    const message = event.message || 'The seed worker failed'
    for (const { reject } of pending.values()) reject(new Error(message))
    pending.clear()
    worker?.terminate()
    worker = undefined
  }
  return next
}

/**
 * Regenerates one seed in full: every cell, geyser roll and starmap entry. It runs in a worker
 * that keeps its generator loaded between calls, so only the first call pays for loading it.
 * The last couple of seeds are kept, so reopening one is instant.
 */
export function describeSeed(coordinate: string): Promise<SeedDetail> {
  const check = checkCoordinate(coordinate)
  if (!check.ok) return Promise.reject(new SeedUnsupportedError(check.message))
  coordinate = check.parsed.coordinate
  const cached = recent.get(coordinate)
  if (cached) return Promise.resolve(cached)
  clearTimeout(idleTimer)
  if (worker && pending.size === 0 && described >= RECYCLE_AFTER) stop()
  worker ??= spawn()
  described++
  const id = nextId++
  return new Promise<SeedDetail>((resolve, reject) => {
    pending.set(id, { resolve, reject })
    worker!.postMessage({ type: 'describe', id, coordinate } satisfies DescribeMessage)
  }).then((detail) => {
    recent.set(coordinate, detail)
    for (const key of [...recent.keys()].slice(0, -KEEP)) recent.delete(key)
    return detail
  })
}
