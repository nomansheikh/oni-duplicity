import { expect, test } from 'vite-plus/test'
import {
  compare,
  confirmedRegressions,
  median,
  missingPlatformMessage,
  platformKey,
  type BaselineEntry,
} from './compare.ts'

const baseline: BaselineEntry = {
  fileBytes: 1,
  calibrationMs: 100,
  phasesMs: { readInflate: 200, parse: 300, write: 400, deflate: 500 },
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
  expect(message).toContain('WARNING no baseline for linux-x64')
  expect(JSON.parse(message.slice(message.indexOf('{')))['linux-x64']).toEqual(entry)
})
