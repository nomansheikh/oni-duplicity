import { describe, expect, it } from 'vite-plus/test'
import { geyserTypes } from '@oni-duplicity/game-data'
import { CONVERSIONS, coverRatio, coverages, geyserOutput, turbinesForPeak } from './geyser-calc'

const timing = {
  massPerCycle: 1500,
  iterationSeconds: 300,
  iterationPercent: 0.5,
  yearSeconds: 100000,
  yearPercent: 0.6,
}

describe('geyserOutput', () => {
  it('spreads a cycle over the erupting share, then over dormancy', () => {
    const o = geyserOutput(timing)
    expect(o.peakKgPerSecond).toBeCloseTo(5)
    expect(o.averageKgPerCycle).toBeCloseTo(900)
    expect(o.averageKgPerSecond).toBeCloseTo(1.5)
    expect(o.duty).toBeCloseTo(0.3)
  })

  it('matches the game formula for GetAverageEmission', () => {
    const emit =
      timing.massPerCycle /
      (600 / timing.iterationSeconds) /
      (timing.iterationSeconds * timing.iterationPercent)
    const onDuration = timing.iterationSeconds * timing.iterationPercent
    const game =
      (((timing.yearSeconds * timing.yearPercent) / timing.iterationSeconds) *
        (emit * onDuration)) /
      timing.yearSeconds
    expect(geyserOutput(timing).averageKgPerSecond).toBeCloseTo(game)
  })

  it('is zero when it never erupts', () => {
    expect(geyserOutput({ ...timing, iterationPercent: 0 }).peakKgPerSecond).toBe(0)
  })
})

describe('coverages', () => {
  it('feeds electrolyzers from water', () => {
    const [c] = coverages({ element: 'Water', outputTemperatureK: 368.15 }, 1)
    expect(c!.supply).toBeCloseTo(8.88)
  })

  it('blocks the turbine chain for cool steam', () => {
    const steam = geyserTypes.find((t) => t.id === 'steam')!
    const rows = coverages({ element: 'Steam', outputTemperatureK: steam.outputTemperature }, 1)
    expect(rows.every((r) => r.blocked && r.supply === 0)).toBe(true)
  })

  it('runs the turbine chain for hot steam', () => {
    const rows = coverages({ element: 'Steam', outputTemperatureK: 773.15 }, 2)
    expect(rows[0]!.supply).toBeCloseTo(17.76)
    expect(rows[1]!.supply).toBeCloseTo(CONVERSIONS.turbineMaxWatts)
  })

  it('turns hydrogen and methane into watts', () => {
    expect(coverages({ element: 'Hydrogen', outputTemperatureK: 773 }, 0.1)[0]!.supply).toBeCloseTo(
      800,
    )
    expect(coverages({ element: 'Methane', outputTemperatureK: 423 }, 0.09)[0]!.supply).toBeCloseTo(
      800,
    )
  })

  it('has nothing to say about elements it cannot cite', () => {
    expect(coverages({ element: 'Magma', outputTemperatureK: 2000 }, 1)).toEqual([])
  })
})

describe('helpers', () => {
  it('rounds turbines up', () => {
    expect(turbinesForPeak(2.1)).toBe(2)
  })
  it('has no ratio without a demand', () => {
    expect(coverRatio(5, 0)).toBeUndefined()
    expect(coverRatio(5, 10)).toBe(0.5)
  })
})
