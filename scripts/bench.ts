import { spawnSync } from 'node:child_process'
import { existsSync } from 'node:fs'
import { readFile, writeFile } from 'node:fs/promises'
import { cpus, totalmem } from 'node:os'
import { join } from 'node:path'
import { parseBenchArgs } from './bench/args.ts'
import {
  compare,
  confirmedRegressions,
  median,
  missingPlatformMessage,
  platformKey,
  PHASE_LABELS,
  PHASES,
  REGRESSION_THRESHOLD,
  summarize,
  type Baseline,
  type BaselineEntry,
  type FixtureRun,
  type PlatformBaseline,
} from './bench/compare.ts'

// The two largest saves: the one the acceptance budget is written against, and a mid-size one.
const FIXTURES = ['mithro-06-maximum-cycle-4770.sav', 'mithro-03-late-game-cycle-1160.sav']

const root = join(import.meta.dirname, '..')
const fetchedDir = join(root, 'test-data/fetched')
const baselinePath = join(root, 'test-data/bench-baseline.json')

const args = parseBenchArgs(process.argv.slice(2))

const mb = (bytes: number) => `${(bytes / 1e6).toFixed(1)} MB`
const ms = (value: number) => `${Math.round(value).toLocaleString('en-US')} ms`
const percent = (change: number) => `${change >= 0 ? '+' : ''}${(change * 100).toFixed(0)}%`

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

function runFixture(file: string): FixtureRun {
  const result = spawnSync(
    process.execPath,
    [
      '--expose-gc',
      join(import.meta.dirname, 'bench/worker.ts'),
      join(fetchedDir, file),
      String(args.iterations),
    ],
    { encoding: 'utf8', stdio: ['ignore', 'pipe', 'inherit'], maxBuffer: 1 << 20 },
  )
  if (result.status !== 0) throw new Error(`Measuring ${file} failed (exit ${result.status})`)
  return JSON.parse(result.stdout.trim().split('\n').at(-1)!)
}

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
  let run = runFixture(file)
  let current = summarize(run)
  const base = platformBaseline?.fixtures[file]
  const stale = base !== undefined && base.fileBytes !== current.fileBytes
  const comparing = base !== undefined && !stale && !args.update
  let comparison = comparing ? compare(current, base) : undefined
  let confirmed: string[] = []

  if (comparing && comparison!.some((row) => row.regressed)) {
    // Re-measure once; only a phase that regresses both times fails.
    console.log(`${file}: possible regression, measuring again to rule out noise...`)
    const again = runFixture(file)
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
  const rows: string[][] = [['phase', 'median', 'min', 'max', 'vs baseline']]
  for (const phase of PHASES) {
    const samples = run.phasesMs[phase]
    const row = comparison?.find((c) => c.phase === phase)
    rows.push([
      PHASE_LABELS[phase],
      ms(current.phasesMs[phase]),
      ms(Math.min(...samples)),
      ms(Math.max(...samples)),
      row ? `${percent(row.change)}${confirmed.includes(phase) ? '  REGRESSION' : ''}` : '-',
    ])
  }
  const total = (pick: (samples: number[]) => number) =>
    PHASES.reduce((sum, phase) => sum + pick(run.phasesMs[phase]), 0)
  rows.push([
    'total',
    ms(PHASES.reduce((sum, phase) => sum + current.phasesMs[phase], 0)),
    ms(total((s) => Math.min(...s))),
    ms(total((s) => Math.max(...s))),
    '',
  ])
  printTable(rows)
  console.log(
    `  peak RSS ${mb(run.peakRssBytes)}, heap after parse ${mb(run.heapAfterParseBytes)}, calibration ${ms(median(run.calibrationMs))}`,
  )
  if (stale) console.log('  baseline was recorded for a different file size; not compared')
  console.log()
}

function printTable(rows: string[][]) {
  const widths = rows[0]!.map((_, col) => Math.max(...rows.map((row) => row[col]!.length)))
  for (const [i, row] of rows.entries()) {
    const cells = row.map((cell, col) =>
      col === 0 ? cell.padEnd(widths[col]!) : cell.padStart(widths[col]!),
    )
    console.log(`  ${cells.join('  ')}`)
    if (i === 0) console.log(`  ${widths.map((w) => '-'.repeat(w)).join('  ')}`)
  }
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
  console.log(missingPlatformMessage(key, measured))
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

function roundEntry(entry: BaselineEntry): BaselineEntry {
  return {
    fileBytes: entry.fileBytes,
    calibrationMs: Math.round(entry.calibrationMs * 10) / 10,
    phasesMs: Object.fromEntries(
      Object.entries(entry.phasesMs).map(([phase, value]) => [phase, Math.round(value * 10) / 10]),
    ) as typeof entry.phasesMs,
  }
}
