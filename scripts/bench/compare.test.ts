import { expect, test } from 'vite-plus/test'
import {
  compare,
  confirmedRegressions,
  isStale,
  median,
  missingPlatformExitCode,
  missingPlatformMessage,
  platformKey,
  unrecordedPhases,
  type BaselineEntry,
} from './compare.ts'

const baseline: BaselineEntry = {
  fileBytes: 1,
  calibrationMs: 100,
  phasesMs: { readInflate: 200, parse: 300, write: 400, deflate: 500, rawSearch: 600 },
}

function scaled(factor: number, calibrationFactor = 1, only?: keyof BaselineEntry['phasesMs']) {
  const phasesMs = { ...baseline.phasesMs }
  for (const phase of Object.keys(phasesMs) as (keyof typeof phasesMs)[]) {
    if (!only || only === phase) phasesMs[phase] *= factor
  }
  return { ...baseline, calibrationMs: baseline.calibrationMs * calibrationFactor, phasesMs }
}

test('median of odd and even sample counts', () => {
  expect(median([5, 1, 3])).toBe(3)
  expect(median([4, 1, 3, 2])).toBe(2.5)
  expect(() => median([])).toThrow()
})

test('identical timings change nothing', () => {
  for (const row of compare(baseline, baseline)) {
    expect(row.change).toBeCloseTo(0)
    expect(row.regressed).toBe(false)
  }
})

test('a uniformly slower machine is not a regression', () => {
  const rows = compare(scaled(2.5, 2.5), baseline)
  expect(rows.every((row) => !row.regressed)).toBe(true)
})

test('a slowdown over 30% of one phase fails only that phase', () => {
  const rows = compare(scaled(1.31, 1, 'parse'), baseline)
  expect(rows.filter((row) => row.regressed).map((row) => row.phase)).toEqual(['parse'])
})

test('a slowdown of exactly 30% passes', () => {
  expect(compare(scaled(1.3), baseline).some((row) => row.regressed)).toBe(false)
})

test('a speed-up is never a regression', () => {
  expect(compare(scaled(0.5), baseline).some((row) => row.regressed)).toBe(false)
})

test('a regression must repeat on the re-run to be confirmed', () => {
  const slow = compare(scaled(1.5, 1, 'parse'), baseline)
  const noisy = compare(baseline, baseline)
  expect(confirmedRegressions(slow, noisy)).toEqual([])
  expect(confirmedRegressions(slow, slow)).toEqual(['parse'])
  expect(confirmedRegressions(noisy, slow)).toEqual([])
})

test('platform keys combine platform and architecture', () => {
  expect(platformKey('linux', 'x64')).toBe('linux-x64')
  expect(platformKey('darwin', 'arm64')).toBe('darwin-arm64')
})

test('a missing platform prints a warning and the JSON to paste', () => {
  const entry = {
    recorded: { date: '2026-11-05', cpu: 'x', node: 'v24' },
    fixtures: { 'a.sav': baseline },
  }
  const message = missingPlatformMessage('linux-x64', entry)
  expect(message).toContain('no baseline for linux-x64')
  expect(JSON.parse(message.slice(message.indexOf('{')))['linux-x64']).toEqual(entry)
})

test('a missing platform fails under --require and only warns otherwise', () => {
  expect(missingPlatformExitCode(true)).toBe(1)
  expect(missingPlatformExitCode(false)).toBe(0)
})

test('zero, missing or non-finite timings are errors, not passes', () => {
  const zeroCalibration = { ...baseline, calibrationMs: 0 }
  expect(() => compare(baseline, zeroCalibration)).toThrow('missing, zero')
  const zeroPhase = { ...baseline, phasesMs: { ...baseline.phasesMs, parse: 0 } }
  expect(() => compare(baseline, zeroPhase)).toThrow('missing, zero')
  const missing = { ...baseline, phasesMs: { readInflate: 1 } } as unknown as BaselineEntry
  expect(() => compare(missing, baseline)).toThrow('missing, zero')
  expect(() => compare(baseline, { ...baseline, calibrationMs: NaN })).toThrow('missing, zero')
})

test('a baseline recorded before a phase existed compares the other phases only', () => {
  const { rawSearch: _, ...older } = baseline.phasesMs
  const old = { ...baseline, phasesMs: older } as BaselineEntry
  expect(unrecordedPhases(old)).toEqual(['rawSearch'])
  expect(unrecordedPhases(baseline)).toEqual([])
  const rows = compare(scaled(1.5, 1, 'rawSearch'), old)
  expect(rows.map((row) => row.phase)).toEqual(['readInflate', 'parse', 'write', 'deflate'])
  expect(rows.some((row) => row.regressed)).toBe(false)
  // A phase that is recorded but zero is still an error, not an unrecorded phase.
  const zero = { ...baseline, phasesMs: { ...baseline.phasesMs, rawSearch: 0 } }
  expect(() => compare(baseline, zero)).toThrow('missing, zero')
})

test('a baseline for a different file size is stale', () => {
  expect(isStale(baseline, { ...baseline, fileBytes: 2 })).toBe(true)
  expect(isStale(baseline, baseline)).toBe(false)
})
