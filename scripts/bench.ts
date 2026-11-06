import { existsSync } from 'node:fs'
import { readFile, writeFile } from 'node:fs/promises'
import { cpus, totalmem } from 'node:os'
import { join } from 'node:path'
import { parseBenchArgs } from './bench/args.ts'
import {
  compare,
  confirmedRegressions,
  isStale,
  median,
  missingPlatformExitCode,
  missingPlatformMessage,
  platformKey,
  REGRESSION_THRESHOLD,
  summarize,
  type Baseline,
  type PlatformBaseline,
} from './bench/compare.ts'
import { mb, ms, roundEntry } from './bench/format.ts'
import { printPhaseTable } from './bench/report.ts'
import { runFixture } from './bench/run-fixture.ts'

// The two largest saves: the one the acceptance budget is written against, and a mid-size one.
const FIXTURES = ['mithro-06-maximum-cycle-4770.sav', 'mithro-03-late-game-cycle-1160.sav']

const root = join(import.meta.dirname, '..')
const fetchedDir = join(root, 'test-data/fetched')
const baselinePath = join(root, 'test-data/bench-baseline.json')

const args = parseBenchArgs(process.argv.slice(2))

function skip(message: string): never {
  if (args.require) {
    console.error(`bench: ${message}`)
    process.exit(1)
  }
  console.log(`bench: skipped, ${message}`)
  process.exit(0)
}

const missing = FIXTURES.filter((file) => !existsSync(join(fetchedDir, file)))
if (missing.length > 0) {
  skip(`missing ${missing.join(', ')}. Run "vp run fixtures --tier all" to download them.`)
}

const key = platformKey()
const baseline: Baseline | undefined = existsSync(baselinePath)
  ? JSON.parse(await readFile(baselinePath, 'utf8'))
  : undefined
if (baseline && baseline.version !== 2) {
  throw new Error(
    'test-data/bench-baseline.json has an unknown version. Re-create it with --update.',
  )
}
// Without a baseline for this platform the run still measures and prints, but compares nothing.
const platformBaseline = baseline?.platforms[key]

const cpu = cpus()[0]?.model.trim() ?? 'unknown CPU'
console.log(
  `${cpu}, ${cpus().length} cores, ${(totalmem() / 2 ** 30).toFixed(0)} GB, Node ${process.version}, ${process.platform} ${process.arch}`,
)
console.log(
  `1 warm-up + ${args.iterations} measured iterations per save, median reported. Each save runs in its own process.\n`,
)

let regressions = 0
const entries: PlatformBaseline['fixtures'] = {}

for (const file of FIXTURES) {
  let run = runFixture(file, fetchedDir, args.iterations)
  let current = summarize(run)
  const base = platformBaseline?.fixtures[file]
  const stale = base !== undefined && isStale(current, base)
  if (stale && args.require && !args.update) {
    throw new Error(
      `${file} has a different size from the baseline (${base.fileBytes} bytes, now ${current.fileBytes}). Run "vp run bench --update".`,
    )
  }
  const comparing = base !== undefined && !stale && !args.update
  let comparison = comparing ? compare(current, base) : undefined
  let confirmed: string[] = []

  if (comparing && comparison!.some((row) => row.regressed)) {
    // Re-measure once; only a phase that regresses both times fails.
    console.log(`${file}: possible regression, measuring again to rule out noise...`)
    const again = runFixture(file, fetchedDir, args.iterations)
    const againComparison = compare(summarize(again), base)
    confirmed = confirmedRegressions(comparison!, againComparison)
    // Report the run that is closer to the baseline: the other one was likely disturbed.
    if (
      againComparison.filter((r) => r.regressed).length <
      comparison!.filter((r) => r.regressed).length
    ) {
      run = again
      current = summarize(again)
      comparison = againComparison
    }
  }
  entries[file] = current
  regressions += confirmed.length

  console.log(`${file}  (${mb(run.fileBytes)} file, ${mb(run.bodyBytes)} body)`)
  printPhaseTable(run, current, comparison, confirmed)
  console.log(
    `  peak RSS ${mb(run.peakRssBytes)}, heap after parse ${mb(run.heapAfterParseBytes)}, calibration ${ms(median(run.calibrationMs))}`,
  )
  if (stale) console.log('  baseline was recorded for a different file size; not compared')
  console.log()
}

const recorded = { date: new Date().toISOString().slice(0, 10), cpu, node: process.version }
const measured: PlatformBaseline = {
  recorded,
  fixtures: Object.fromEntries(
    Object.entries(entries).map(([file, entry]) => [file, roundEntry(entry)]),
  ),
}

if (args.update) {
  const updated: Baseline = {
    version: 2,
    platforms: { ...baseline?.platforms, [key]: measured },
  }
  await writeFile(baselinePath, `${JSON.stringify(updated, null, 2)}\n`)
  console.log(`bench: baseline for ${key} updated at test-data/bench-baseline.json`)
} else if (!platformBaseline) {
  // Not a failure: the baseline for a new platform is committed after its first run.
  const message = missingPlatformMessage(key, measured)
  if (missingPlatformExitCode(args.require) === 0) console.log(message)
  else console.error(message)
  process.exitCode = missingPlatformExitCode(args.require)
} else if (regressions > 0) {
  console.error(
    `bench: ${regressions} phase(s) slower than the baseline by more than ${REGRESSION_THRESHOLD * 100}% (calibrated), in two measurements. If the slowdown is intended, run "vp run bench --update".`,
  )
  process.exitCode = 1
} else {
  console.log(
    `bench: no phase slower than the baseline by more than ${REGRESSION_THRESHOLD * 100}% (calibrated).`,
  )
}
