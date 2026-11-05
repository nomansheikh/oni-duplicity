/**
 * Pure maths for the geyser calculator. Every constant names the decompiled file it was read
 * from (Kupie/ONI_Decomp, `Assembly-CSharp`). Nothing here reads or writes a save.
 */

export const SECONDS_PER_CYCLE = 600

/** What the geyser's rolls give. All fields come from `GeyserView`. */
export interface GeyserTiming {
  /** Kilograms per cycle while active (`scaledRate`). */
  massPerCycle: number
  iterationSeconds: number
  iterationPercent: number
  yearSeconds: number
  yearPercent: number
}

export interface GeyserOutput {
  /** `GeyserConfigurator.GetEmitRate`: kg/s while erupting. */
  peakKgPerSecond: number
  /** `GeyserConfigurator.GetAverageEmission`: kg/s over the whole activity cycle. */
  averageKgPerSecond: number
  /** The average times 600 s. */
  averageKgPerCycle: number
  /** Share of time the vent is actually spewing: active share times erupting share. */
  duty: number
}

/**
 * `GetEmitRate` is `massPerCycle / (600 / iterationLength) / (iterationLength * iterationPercent)`
 * and `GetAverageEmission` is `emitRate * onDuration * yearOnDuration / iterationLength / yearLength`
 * (GeyserConfigurator.cs). Both reduce to the forms below.
 */
export function geyserOutput(g: GeyserTiming): GeyserOutput {
  const peak =
    g.iterationPercent > 0 ? g.massPerCycle / (SECONDS_PER_CYCLE * g.iterationPercent) : 0
  const averageKgPerSecond = (g.massPerCycle * g.yearPercent) / SECONDS_PER_CYCLE
  return {
    peakKgPerSecond: peak,
    averageKgPerSecond,
    averageKgPerCycle: averageKgPerSecond * SECONDS_PER_CYCLE,
    duty: g.iterationPercent * g.yearPercent,
  }
}

/** Constants behind the "what it covers" conversions. */
export const CONVERSIONS = {
  /** `DUPLICANTSTATS.STANDARD.BaseStats.OXYGEN_USED_PER_SECOND` (TUNING/DUPLICANTSTATS.cs). */
  dupeOxygenKgPerSecond: 0.1,
  /** `ElectrolyzerConfig.WATER2OXYGEN_RATIO`: oxygen made per kg of water. */
  electrolyzerOxygenPerKgWater: 0.888,
  /** `ElectrolyzerConfig`: `ConduitConsumer.consumptionRate`, the most water it takes. */
  electrolyzerWaterKgPerSecond: 1,
  /** `SteamTurbineConfig2`: `pumpKGRate`, steam taken per second. */
  turbineSteamKgPerSecond: 2,
  /** `SteamTurbineConfig2.MAX_WATTAGE`. */
  turbineMaxWatts: 850,
  /** `SteamTurbine.minActiveTemperature` (K): colder steam doesn't run it. */
  turbineMinSteamK: 398.15,
  /** `SteamTurbine.outputElementTemperature` (K): water leaves at this. */
  turbineWaterOutK: 368.15,
  /** `HydrogenGeneratorConfig`: `CreateSimpleFormula(Hydrogen, 0.1)` and `GeneratorWattageRating`. */
  hydrogenGeneratorKgPerSecond: 0.1,
  hydrogenGeneratorWatts: 800,
  /** `MethaneGeneratorConfig`: `InputItem(Methane, 0.09)` and `GeneratorWattageRating`. */
  methaneGeneratorKgPerSecond: 0.09,
  methaneGeneratorWatts: 800,
} as const

export type DemandKind = 'duplicants' | 'watts'

export interface Coverage {
  id: string
  label: string
  /** What the demand input means for this row. */
  demandKind: DemandKind
  /** How much of the demand unit the average output supplies. */
  supply: number
  unit: string
  /** Plain-language chain, shown under the figure. */
  chain: string
  /** Decompile files the figures come from. */
  cite: string
  /** Set when the chain can't run as described. */
  blocked?: string
}

export interface ElementSource {
  /** `SimHashes` name from the geyser type table. */
  element: string
  outputTemperatureK: number
}

const C = CONVERSIONS

function dupesFromWater(waterKgPerSecond: number): number {
  return (waterKgPerSecond * C.electrolyzerOxygenPerKgWater) / C.dupeOxygenKgPerSecond
}

/** The conversions we can cite for what this geyser emits; empty when there are none. */
export function coverages(src: ElementSource, averageKgPerSecond: number): Coverage[] {
  switch (src.element) {
    case 'Water':
      return [
        {
          id: 'water-oxygen',
          label: 'Breathing, via electrolyzers',
          demandKind: 'duplicants',
          supply: dupesFromWater(averageKgPerSecond),
          unit: 'duplicants',
          chain: `1 kg water makes ${C.electrolyzerOxygenPerKgWater} kg oxygen; a duplicant breathes ${C.dupeOxygenKgPerSecond} kg/s`,
          cite: 'ElectrolyzerConfig.cs, TUNING/DUPLICANTSTATS.cs',
        },
      ]
    case 'Steam': {
      const hot = src.outputTemperatureK >= C.turbineMinSteamK
      return [
        {
          id: 'steam-oxygen',
          label: 'Breathing, via a steam turbine then electrolyzers',
          demandKind: 'duplicants',
          supply: hot ? dupesFromWater(averageKgPerSecond) : 0,
          unit: 'duplicants',
          chain: `The turbine turns each kg of steam into 1 kg of water at ${C.turbineWaterOutK - 273.15} °C, then as for water`,
          cite: 'SteamTurbine.cs, SteamTurbineConfig2.cs, ElectrolyzerConfig.cs',
          ...(hot
            ? {}
            : {
                blocked: `Steam leaves at ${fmtC(src.outputTemperatureK)}, below the ${fmtC(C.turbineMinSteamK)} a turbine needs, so it has to be heated first`,
              }),
        },
        {
          id: 'steam-power',
          label: 'Power, at most, from steam turbines',
          demandKind: 'watts',
          supply: hot ? (averageKgPerSecond / C.turbineSteamKgPerSecond) * C.turbineMaxWatts : 0,
          unit: 'W',
          chain: `A turbine takes ${C.turbineSteamKgPerSecond} kg/s of steam for up to ${C.turbineMaxWatts} W; real output is lower for cooler steam`,
          cite: 'SteamTurbineConfig2.cs, SteamTurbine.cs',
          ...(hot ? {} : { blocked: `Below the ${fmtC(C.turbineMinSteamK)} a turbine needs` }),
        },
      ]
    }
    case 'Hydrogen':
      return [
        {
          id: 'hydrogen-power',
          label: 'Power, from hydrogen generators',
          demandKind: 'watts',
          supply: (averageKgPerSecond / C.hydrogenGeneratorKgPerSecond) * C.hydrogenGeneratorWatts,
          unit: 'W',
          chain: `A generator burns ${C.hydrogenGeneratorKgPerSecond} kg/s for ${C.hydrogenGeneratorWatts} W`,
          cite: 'HydrogenGeneratorConfig.cs',
        },
      ]
    case 'Methane':
      return [
        {
          id: 'methane-power',
          label: 'Power, from natural gas generators',
          demandKind: 'watts',
          supply: (averageKgPerSecond / C.methaneGeneratorKgPerSecond) * C.methaneGeneratorWatts,
          unit: 'W',
          chain: `A generator burns ${C.methaneGeneratorKgPerSecond} kg/s for ${C.methaneGeneratorWatts} W`,
          cite: 'MethaneGeneratorConfig.cs',
        },
      ]
    default:
      return []
  }
}

/** Machines needed to keep up with the vent while it erupts (storage can smooth the rest). */
export function turbinesForPeak(peakKgPerSecond: number): number {
  return Math.ceil(peakKgPerSecond / C.turbineSteamKgPerSecond)
}

export function fmtC(kelvin: number): string {
  return `${Math.round((kelvin - 273.15) * 10) / 10} °C`
}

/** Supply over demand, where demand is zero or unset when there is nothing to compare. */
export function coverRatio(supply: number, demand: number): number | undefined {
  return demand > 0 ? supply / demand : undefined
}
