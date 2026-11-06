/**
 * Geyser types and the ranges the game rolls their output and timing in.
 *
 * Transcribed from the `GeyserType` constructor calls in `GeyserGenericConfig` and
 * `NiobiumGeyserConfig` (Assembly-CSharp). The numbers are floats in code, not string
 * literals, so the extractor cannot read them; `tests/geyser-types.test.ts` checks them
 * against every geyser in the test saves. The DLCs each type needs are extracted.
 */

import data from './generated/game-data.json' with { type: 'json' }

export interface Range {
  min: number
  max: number
}

export type GeyserShape = 'gas' | 'liquid' | 'molten'

/**
 * The prefab footprint follows the shape: gas 2×4, liquid 4×2, molten 3×3 cells
 * (`GeyserGenericConfig`).
 */
export interface GeyserTypeEntry {
  /** The type ID; `configuration.typeId` holds its HashedString hash. */
  id: string
  /** Decides the prefab's footprint, so a type can only be swapped for one of the same shape. */
  shape: GeyserShape
  /** The `SimHashes` name of the element it emits. */
  element: string
  /** Kelvin the emitted element leaves at. */
  outputTemperature: number
  /** Kelvin of the geyser object itself (`PrimaryElement` temperature in a save). */
  geyserTemperature: number
  /** DLC IDs a save must have active for the game to register the prefab. */
  requiredDlcIds: string[]
  /** Germs emitted along with the element, per kilogram. */
  disease?: { id: string; count: number }
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

type Timing = Pick<
  GeyserTypeEntry,
  'iterationLength' | 'iterationPercent' | 'yearLength' | 'yearPercent'
>

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

/** The DLCs a type needs, as `GeyserGenericConfig` lists them. */
const dlcsOf = (id: string) => data.geyserDlcs.find((g) => g.id === id)?.requiredDlcIds ?? []

interface Extra {
  /** Defaults to 372.15, the constructor's default. */
  geyserTemperature?: number
  disease?: { id: string; count: number }
}

const type = (
  id: string,
  shape: GeyserShape,
  element: string,
  outputTemperature: number,
  rate: Range,
  timing: Timing,
  extra: Extra = {},
): GeyserTypeEntry => ({
  id,
  shape,
  element,
  outputTemperature,
  geyserTemperature: extra.geyserTemperature ?? 372.15,
  requiredDlcIds: dlcsOf(id),
  ...(extra.disease ? { disease: extra.disease } : {}),
  rate,
  ...timing,
})

export const geyserTypes: GeyserTypeEntry[] = [
  type('steam', 'gas', 'Steam', 383.15, r(1000, 2000), VENT),
  type('hot_steam', 'gas', 'Steam', 773.15, r(500, 1000), VENT),
  type('hot_water', 'liquid', 'Water', 368.15, r(2000, 4000), VENT),
  type('slush_water', 'liquid', 'DirtyWater', 263.15, r(1000, 2000), VENT, {
    geyserTemperature: 263,
  }),
  type('filthy_water', 'liquid', 'DirtyWater', 303.15, r(2000, 4000), VENT, {
    disease: { id: 'FoodPoisoning', count: 20000 },
  }),
  type('slush_salt_water', 'liquid', 'Brine', 263.15, r(1000, 2000), VENT, {
    geyserTemperature: 263,
  }),
  type('salt_water', 'liquid', 'SaltWater', 368.15, r(2000, 4000), VENT),
  type('small_volcano', 'molten', 'Magma', 2000, r(400, 800), VOLCANO),
  type('big_volcano', 'molten', 'Magma', 2000, r(800, 1600), VOLCANO),
  type('liquid_co2', 'liquid', 'LiquidCarbonDioxide', 218, r(100, 200), VENT, {
    geyserTemperature: 218,
  }),
  type('hot_co2', 'gas', 'CarbonDioxide', 773.15, r(70, 140), VENT),
  type('hot_hydrogen', 'gas', 'Hydrogen', 773.15, r(70, 140), VENT),
  type('hot_po2', 'gas', 'ContaminatedOxygen', 773.15, r(70, 140), VENT),
  type('slimy_po2', 'gas', 'ContaminatedOxygen', 333.15, r(70, 140), VENT, {
    disease: { id: 'SlimeLung', count: 5000 },
  }),
  type('chlorine_gas', 'gas', 'ChlorineGas', 333.15, r(70, 140), VENT),
  type('chlorine_gas_cool', 'gas', 'ChlorineGas', 278.15, r(70, 140), VENT),
  type('methane', 'gas', 'Methane', 423.15, r(70, 140), VENT),
  type('molten_copper', 'molten', 'MoltenCopper', 2500, r(200, 400), METAL),
  type('molten_iron', 'molten', 'MoltenIron', 2800, r(200, 400), METAL),
  type('molten_gold', 'molten', 'MoltenGold', 2900, r(200, 400), METAL),
  type('molten_aluminum', 'molten', 'MoltenAluminum', 2000, r(200, 400), METAL),
  type('molten_tungsten', 'molten', 'MoltenTungsten', 4000, r(200, 400), METAL),
  type('molten_niobium', 'molten', 'MoltenNiobium', 3500, r(800, 1600), VOLCANO),
  type('molten_cobalt', 'molten', 'MoltenCobalt', 2500, r(200, 400), METAL),
  type('oil_drip', 'liquid', 'CrudeOil', 600, r(1, 250), {
    iterationLength: r(600, 600),
    iterationPercent: r(1, 1),
    yearLength: r(100, 500),
    yearPercent: r(0.4, 0.8),
  }),
  type('liquid_sulfur', 'liquid', 'LiquidSulfur', 438.35, r(1000, 2000), VENT),
  type('murky_brine', 'liquid', 'MurkyBrine', 368.15, r(2000, 4000), VENT),
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
