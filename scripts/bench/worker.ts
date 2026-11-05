// Measures one fixture in its own process, so peak memory belongs to that fixture alone.
// Run by scripts/bench.ts; prints one JSON line (a FixtureRun) on stdout.
import { readFileSync, statSync } from 'node:fs'
import { basename } from 'node:path'
import { performance } from 'node:perf_hooks'
import { zlibSync } from 'fflate'
import { parseBody, readSaveParts, writeBody } from '../../packages/save-parser/src/index.ts'
import { calibrationWorkload } from './calibration.ts'
import type { FixtureRun, Phase } from './compare.ts'

const [path, iterationsArg] = process.argv.slice(2)
const iterations = Number(iterationsArg)
if (!path || !Number.isInteger(iterations) || iterations < 1) {
  throw new Error('Usage: node worker.ts <save path> <iterations>')
}

const gc = (globalThis as { gc?: () => void }).gc
let sink = 0

function time<T>(run: () => T): [T, number] {
  const start = performance.now()
  const result = run()
  return [result, performance.now() - start]
}

function calibrate(samples: number): number[] {
  const times: number[] = []
  for (let i = 0; i < samples; i++) times.push(time(() => (sink ^= calibrationWorkload()))[1])
  return times
}

interface Pass {
  times: Record<Phase, number>
  bodyBytes: number
  heapAfterParse: number
}

function pass(): Pass {
  const [{ templates, body }, readInflate] = time(() => readSaveParts(readFileSync(path!)))
  const [parsed, parse] = time(() => parseBody(body, templates))
  gc?.()
  const heapAfterParse = process.memoryUsage().heapUsed
  const [written, write] = time(() => writeBody({ ...parsed, templates } as never))
  if (written.length !== body.length) {
    throw new Error(
      `${basename(path!)}: written body is ${written.length} bytes, read ${body.length}`,
    )
  }
  // The same level writeSave uses.
  const [deflated, deflate] = time(() => zlibSync(written, { level: 1 }))
  sink ^= deflated.length
  return { times: { readInflate, parse, write, deflate }, bodyBytes: body.length, heapAfterParse }
}

// Warm up the JIT and the page cache. A calibration sample follows every pass, so it sees the same
// machine conditions as the phases it normalizes.
// Peak memory is read after the first pass, before the calibration buffers can add to it.
pass()
// Node reports kilobytes on every platform.
const peakRssBytes = process.resourceUsage().maxRSS * 1024
calibrate(2)

const phasesMs: Record<Phase, number[]> = { readInflate: [], parse: [], write: [], deflate: [] }
const calibrationMs: number[] = []
let bodyBytes = 0
let heapAfterParseBytes = 0
for (let i = 0; i < iterations; i++) {
  gc?.()
  const result = pass()
  for (const phase of Object.keys(phasesMs) as Phase[]) phasesMs[phase].push(result.times[phase])
  bodyBytes = result.bodyBytes
  heapAfterParseBytes = result.heapAfterParse
  gc?.()
  calibrationMs.push(...calibrate(2))
}

const run: FixtureRun = {
  file: basename(path),
  fileBytes: statSync(path).size,
  bodyBytes,
  iterations,
  calibrationMs,
  phasesMs,
  peakRssBytes,
  heapAfterParseBytes,
  checksum: sink,
}
console.log(JSON.stringify(run))
