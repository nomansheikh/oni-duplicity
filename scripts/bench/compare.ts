export const PHASES = ['readInflate', 'parse', 'write', 'deflate'] as const
export type Phase = (typeof PHASES)[number]

export const PHASE_LABELS: Record<Phase, string> = {
  readInflate: 'read + inflate',
  parse: 'parse body',
  write: 'write body',
  deflate: 'deflate',
}

/** A phase fails when its calibrated time grows by more than this fraction. */
export const REGRESSION_THRESHOLD = 0.3

export type PhaseTimes = Record<Phase, number>

/** What one worker process measured for one fixture. Times are in milliseconds. */
export interface FixtureRun {
  file: string
  fileBytes: number
  bodyBytes: number
  iterations: number
  calibrationMs: number[]
  phasesMs: Record<Phase, number[]>
  peakRssBytes: number
  heapAfterParseBytes: number
  /** Keeps the timed work observable, so it cannot be optimized away. */
  checksum: number
}

export interface BaselineEntry {
  fileBytes: number
  calibrationMs: number
  phasesMs: PhaseTimes
}

export interface PlatformBaseline {
  recorded: { date: string; cpu: string; node: string }
  fixtures: Record<string, BaselineEntry>
}

/** Baselines per `<platform>-<arch>`: ratios do not transfer between machines or operating systems. */
export interface Baseline {
  version: 2
  platforms: Record<string, PlatformBaseline>
}

export function platformKey(platform = process.platform, arch = process.arch): string {
  return `${platform}-${arch}`
}

export function median(values: number[]): number {
  if (values.length === 0) throw new Error('median of nothing')
  const sorted = [...values].sort((a, b) => a - b)
  const mid = sorted.length >> 1
  return sorted.length % 2 === 1 ? sorted[mid]! : (sorted[mid - 1]! + sorted[mid]!) / 2
}

export function summarize(run: FixtureRun): BaselineEntry {
  return {
    fileBytes: run.fileBytes,
    calibrationMs: median(run.calibrationMs),
    phasesMs: Object.fromEntries(
      PHASES.map((phase) => [phase, median(run.phasesMs[phase])]),
    ) as PhaseTimes,
  }
}

export interface PhaseComparison {
  phase: Phase
  /** Phase time divided by calibration time, now and in the baseline. */
  ratio: number
  baselineRatio: number
  /** Relative change of the calibrated time: 0.1 is 10% slower, -0.1 is 10% faster. */
  change: number
  regressed: boolean
}

/** Compare calibrated phase times, so a slower or faster machine cancels out. */
export function compare(
  current: BaselineEntry,
  baseline: BaselineEntry,
  threshold = REGRESSION_THRESHOLD,
): PhaseComparison[] {
  assertUsable(current, 'measured')
  assertUsable(baseline, 'baseline')
  return PHASES.map((phase) => {
    const ratio = current.phasesMs[phase] / current.calibrationMs
    const baselineRatio = baseline.phasesMs[phase] / baseline.calibrationMs
    const change = ratio / baselineRatio - 1
    if (!Number.isFinite(change)) throw new Error(`Non-finite ratio for ${phase}`)
    return { phase, ratio, baselineRatio, change, regressed: change > threshold + 1e-9 }
  })
}

/** A zero, negative or missing time would make every ratio meaningless, and the gate pass. */
function assertUsable(entry: BaselineEntry, what: string) {
  const values = [entry.calibrationMs, ...PHASES.map((phase) => entry.phasesMs?.[phase])]
  if (!values.every((value) => Number.isFinite(value) && value > 0)) {
    throw new Error(`The ${what} timings are missing, zero or not numbers`)
  }
}

/** Whether a baseline entry belongs to the file that was measured. */
export function isStale(current: BaselineEntry, baseline: BaselineEntry): boolean {
  return current.fileBytes !== baseline.fileBytes
}

/** Without a baseline the gate cannot judge anything: that fails under --require, else warns. */
export function missingPlatformExitCode(require: boolean): number {
  return require ? 1 : 0
}

/**
 * A phase counts as regressed only when it regressed in both the first measurement and the
 * re-measurement, so one noisy run (a busy machine) does not fail the gate.
 */
export function confirmedRegressions(first: PhaseComparison[], second: PhaseComparison[]): Phase[] {
  const again = new Set(second.filter((row) => row.regressed).map((row) => row.phase))
  return first.filter((row) => row.regressed && again.has(row.phase)).map((row) => row.phase)
}

/** What to print, instead of failing, when the baseline has no entry for this platform. */
export function missingPlatformMessage(key: string, entry: PlatformBaseline): string {
  return [
    `bench: no baseline for ${key} in test-data/bench-baseline.json, so nothing was compared.`,
    `To add one, put this under "platforms" > "${key}" (or run "vp run bench --update" on this platform):`,
    JSON.stringify({ [key]: entry }, null, 2),
  ].join('\n')
}
