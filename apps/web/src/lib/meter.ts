export type ProgressTone = 'good' | 'warn' | 'bad'
export type MeterKind = 'amount' | 'health' | 'stress'

/**
 * Tone for a value, by the rules in docs/design.md: amounts are good from 50% and warn from
 * 25%, health 70/35, stress is good up to 40% and warn up to 70% (higher is worse).
 */
export function meterTone(kind: MeterKind, pct: number): ProgressTone {
  if (kind === 'stress') return pct <= 40 ? 'good' : pct <= 70 ? 'warn' : 'bad'
  const [good, warn] = kind === 'health' ? [70, 35] : [50, 25]
  return pct >= good ? 'good' : pct >= warn ? 'warn' : 'bad'
}

/** Clamps to 0..max. Null, undefined and NaN count as 0. */
export function clampProgress(value: number | null | undefined, max = 100): number {
  if (value == null || Number.isNaN(value)) return 0
  const top = max > 0 ? max : 100
  return Math.max(0, Math.min(top, value))
}

/** Filled cells of a segmented meter: any value above 0 shows at least one cell. */
export function filledCells(pct: number, segments: number): number {
  if (pct <= 0 || segments <= 0) return 0
  return Math.min(segments, Math.max(1, Math.round((pct / 100) * segments)))
}
