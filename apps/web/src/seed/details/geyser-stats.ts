import { geyserTypes } from '@oni-duplicity/game-data'
import { activeCycles, dormantCycles, eruptingSeconds } from '@/lib/geyser'
import { geyserOutput } from '@/lib/tools/geyser-calc'
import type { DetailGeyser } from './types.ts'

export interface GeyserStats {
  /** The `SimHashes` name of the element it emits. */
  element: string
  /** Kelvin the element leaves at. */
  outputTemperatureK: number
  /** Kilograms per second while erupting. */
  peakKgPerSecond: number
  /** Kilograms per second averaged over dormancy too. */
  averageKgPerSecond: number
  averageKgPerCycle: number
  /** Seconds of each eruption cycle spent erupting, and the cycle's length. */
  eruptionSeconds: number
  eruptionPeriodSeconds: number
  /** Cycles (600 s each) active and dormant in one activity period. */
  activeCycles: number
  dormantCycles: number
}

/**
 * What a geyser's rolls give, with the maths of the geyser calculator. Undefined when the
 * generator rolled nothing for it, or the type is not in the game data.
 */
export function geyserStats(geyser: DetailGeyser): GeyserStats | undefined {
  const type = geyserTypes.find((t) => t.id === geyser.type)
  if (!type || !geyser.roll) return undefined
  const timing = geyser.roll
  const output = geyserOutput(timing)
  return {
    element: type.element,
    outputTemperatureK: type.outputTemperature,
    peakKgPerSecond: output.peakKgPerSecond,
    averageKgPerSecond: output.averageKgPerSecond,
    averageKgPerCycle: output.averageKgPerCycle,
    eruptionSeconds: eruptingSeconds(timing),
    eruptionPeriodSeconds: timing.iterationSeconds,
    activeCycles: activeCycles(timing),
    dormantCycles: dormantCycles(timing),
  }
}
