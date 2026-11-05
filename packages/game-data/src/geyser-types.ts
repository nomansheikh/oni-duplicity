/**
 * Geyser types and the ranges the game rolls their output and timing in.
 *
 * Transcribed from the `GeyserType` constructor calls in `GeyserGenericConfig` and
 * `NiobiumGeyserConfig` (Assembly-CSharp). The numbers are floats in code, not string
 * literals, so the extractor cannot read them; `tests/geyser-types.test.ts` checks them
 * against every geyser in the test saves.
 */

export interface Range {
  min: number
  max: number
}

export interface GeyserTypeEntry {
  /** The type ID; `configuration.typeId` holds its HashedString hash. */
  id: string
  /** Kilograms per active cycle. */
  rate: Range
  /** Seconds per eruption cycle. */
  iterationLength: Range
  /** Share of the eruption cycle spent erupting. */
  iterationPercent: Range
  /** Seconds per activity cycle. */
  yearLength: Range
  /** Share of the activity cycle spent active. */
  yearPercent: Range
}

const r = (min: number, max: number): Range => ({ min, max })

type Timing = Omit<GeyserTypeEntry, 'id' | 'rate'>

const YEAR = { yearLength: r(15000, 135000), yearPercent: r(0.4, 0.8) }
const VENT: Timing = { iterationLength: r(60, 1140), iterationPercent: r(0.1, 0.9), ...YEAR }
const METAL: Timing = {
  iterationLength: r(480, 1080),
  iterationPercent: r(0.016666668, 0.1),
  ...YEAR,
}
const VOLCANO: Timing = {
  iterationLength: r(6000, 12000),
  iterationPercent: r(0.005, 0.01),
  ...YEAR,
}

const type = (id: string, rate: Range, timing: Timing): GeyserTypeEntry => ({ id, rate, ...timing })

export const geyserTypes: GeyserTypeEntry[] = [
  type('steam', r(1000, 2000), VENT),
  type('hot_steam', r(500, 1000), VENT),
  type('hot_water', r(2000, 4000), VENT),
  type('slush_water', r(1000, 2000), VENT),
  type('filthy_water', r(2000, 4000), VENT),
  type('slush_salt_water', r(1000, 2000), VENT),
  type('salt_water', r(2000, 4000), VENT),
  type('small_volcano', r(400, 800), VOLCANO),
  type('big_volcano', r(800, 1600), VOLCANO),
  type('liquid_co2', r(100, 200), VENT),
  type('hot_co2', r(70, 140), VENT),
  type('hot_hydrogen', r(70, 140), VENT),
  type('hot_po2', r(70, 140), VENT),
  type('slimy_po2', r(70, 140), VENT),
  type('chlorine_gas', r(70, 140), VENT),
  type('chlorine_gas_cool', r(70, 140), VENT),
  type('methane', r(70, 140), VENT),
  type('molten_copper', r(200, 400), METAL),
  type('molten_iron', r(200, 400), METAL),
  type('molten_gold', r(200, 400), METAL),
  type('molten_aluminum', r(200, 400), METAL),
  type('molten_tungsten', r(200, 400), METAL),
  type('molten_niobium', r(800, 1600), VOLCANO),
  type('molten_cobalt', r(200, 400), METAL),
  type('oil_drip', r(1, 250), {
    iterationLength: r(600, 600),
    iterationPercent: r(1, 1),
    yearLength: r(100, 500),
    yearPercent: r(0.4, 0.8),
  }),
  type('liquid_sulfur', r(1000, 2000), VENT),
  type('murky_brine', r(2000, 4000), VENT),
]

const SPREAD = 6
const EDGE = 0.002472623

/**
 * The game's `GeyserInstanceConfiguration.Resample`: maps a roll in [0, 1] onto [min, max]
 * along a logistic curve, so middling rolls land near the middle of the range.
 */
export function resample(roll: number, { min, max }: Range): number {
  const t = roll * (1 - EDGE * 2) + EDGE
  return ((-Math.log(1 / t - 1) + SPREAD) / (SPREAD * 2)) * (max - min) + min
}

/** The roll in [0, 1] that `resample` maps onto `value`, clamped to the range. */
export function unresample(value: number, { min, max }: Range): number {
  if (max <= min) return 0
  const share = (value - min) / (max - min)
  if (share <= 0) return 0
  if (share >= 1) return 1
  const t = 1 / (1 + Math.exp(-(share * SPREAD * 2 - SPREAD)))
  return Math.min(1, Math.max(0, (t - EDGE) / (1 - EDGE * 2)))
}
