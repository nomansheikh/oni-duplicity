import type { GeyserView } from '@/worker/model'

export const SECONDS_PER_CYCLE = 600

type Timing = Pick<
  GeyserView,
  'massPerCycle' | 'iterationSeconds' | 'iterationPercent' | 'yearSeconds' | 'yearPercent'
>

/** Kilograms per second while erupting: a cycle's mass squeezed into the erupting share. */
export function eruptionRate(g: Timing): number {
  return g.iterationPercent > 0 ? g.massPerCycle / (SECONDS_PER_CYCLE * g.iterationPercent) : 0
}

/** Kilograms per cycle averaged over dormancy too. */
export function averagePerCycle(g: Timing): number {
  return g.massPerCycle * g.yearPercent
}

export function eruptingSeconds(g: Timing): number {
  return g.iterationSeconds * g.iterationPercent
}

export function activeCycles(g: Timing): number {
  return (g.yearSeconds * g.yearPercent) / SECONDS_PER_CYCLE
}

export function dormantCycles(g: Timing): number {
  return (g.yearSeconds * (1 - g.yearPercent)) / SECONDS_PER_CYCLE
}
