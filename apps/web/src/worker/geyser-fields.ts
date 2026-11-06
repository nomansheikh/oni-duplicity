import { findGeyserTypeByHash, resample, type GeyserTypeEntry } from '@oni-duplicity/game-data'
import type { GeyserField } from './geyser-types.ts'

export const GEYSER_FIELDS: Record<
  GeyserField,
  {
    roll: string
    range: 'rate' | 'iterationLength' | 'iterationPercent' | 'yearLength' | 'yearPercent'
  }
> = {
  scaledRate: { roll: 'rateRoll', range: 'rate' },
  scaledIterationLength: { roll: 'iterationLengthRoll', range: 'iterationLength' },
  scaledIterationPercent: { roll: 'iterationPercentRoll', range: 'iterationPercent' },
  scaledYearLength: { roll: 'yearLengthRoll', range: 'yearLength' },
  scaledYearPercent: { roll: 'yearPercentRoll', range: 'yearPercent' },
}

export type GeyserConfig = Record<string, number> & { typeId?: { hash: number } }

export function geyserType(config: GeyserConfig): GeyserTypeEntry | undefined {
  const hash = config.typeId?.hash
  return hash === undefined ? undefined : findGeyserTypeByHash(hash)
}

/** The game computes in single precision; allow for that when comparing. */
export function rollsMatch(config: GeyserConfig, type: GeyserTypeEntry): boolean {
  return Object.entries(GEYSER_FIELDS).every(([field, { roll, range }]) => {
    const expected = resample(config[roll] ?? 0, type[range])
    return Math.abs((config[field] ?? 0) - expected) <= Math.abs(expected) * 1e-5
  })
}
