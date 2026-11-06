import { engineNotice, type SeedResult } from '../result.ts'
import { toAsteroids, type RawMap } from '../extract.ts'
import { evaluate } from '../score.ts'
import type { RunMessage, WorkerReply } from './protocol.ts'

type Worldgen = (typeof import('@onimaxxing/worldgen'))['worldgen']

let loading: Promise<Worldgen> | undefined

/** Loads the generator on the first job, never at start-up. */
function load(): Promise<Worldgen> {
  loading ??= import('@onimaxxing/worldgen').then(async (module) => {
    await module.default({ threads: 'serial' })
    return module.worldgen
  })
  return loading
}

function run(worldgen: Worldgen, message: RunMessage): WorkerReply {
  const build = worldgen.version()
  const results: SeedResult[] = []
  let failed = 0
  for (const coordinate of message.coordinates) {
    let map: RawMap
    try {
      map = worldgen.generate(coordinate) as unknown as RawMap
    } catch {
      failed++
      continue
    }
    if (map.failure) {
      failed++
      continue
    }
    const asteroids = toAsteroids(map)
    const evaluation = evaluate(message.rules, asteroids)
    if (!evaluation.passed) continue
    const seed = Number(coordinate.split('-').at(-4))
    results.push({
      coordinate,
      seed,
      prefix: message.prefix,
      score: evaluation.score,
      maxScore: evaluation.maxScore,
      matched: evaluation.matched,
      missed: evaluation.missed,
      asteroids,
      engineBuild: build,
      notice: engineNotice(build),
    })
  }
  return {
    type: 'batch',
    jobId: message.jobId,
    generated: message.coordinates.length,
    failed,
    results,
  }
}

self.onmessage = async (event: MessageEvent<RunMessage>) => {
  const message = event.data
  try {
    const reply = run(await load(), message)
    const buffers =
      reply.type === 'batch'
        ? reply.results.flatMap((r) => r.asteroids.map((a) => a.biomes.cells.buffer))
        : []
    ;(self as unknown as Worker).postMessage(reply, buffers)
  } catch (error) {
    const reply: WorkerReply = { type: 'error', jobId: message.jobId, message: String(error) }
    ;(self as unknown as Worker).postMessage(reply)
  }
}
