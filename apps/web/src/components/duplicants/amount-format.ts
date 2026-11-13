import type { AmountView } from '@/worker/model'

// --- Health & needs -----------------------------------------------------------------------

export interface AmountFormat {
  max: number
  unit: string
  /** Stored value × scale + offset = shown value. */
  scale?: number
  offset?: number
  digits?: number
  /** Slider range in shown units for amounts whose true maximum is too wide to drag across. */
  range?: [number, number]
}

const AMOUNT_FORMATS: Record<string, AmountFormat> = {
  HitPoints: { max: 100, unit: 'HP' },
  Stress: { max: 100, unit: '%' },
  Stamina: { max: 100, unit: '%' },
  Breath: { max: 100, unit: '%' },
  Bladder: { max: 100, unit: '%' },
  ImmuneLevel: { max: 100, unit: '%' },
  Toxicity: { max: 100, unit: '%' },
  Calories: { max: 4000, unit: 'kcal', scale: 1 / 1000 },
  Temperature: { max: 100, unit: '°C', offset: -273.15, digits: 1, range: [-100, 250] },
  RadiationBalance: { max: 1000, unit: 'rads' },
  Decor: { max: 200, unit: 'decor' },
  // The bionic maximums come from the worker (`AmountView.max`); these are the game's base values.
  BionicOil: { max: 200, unit: 'kg', digits: 1 },
  BionicGunk: { max: 80, unit: 'kg', digits: 1 },
  BionicOxygenTank: { max: 240, unit: 'kg', digits: 1 },
  BionicInternalBattery: { max: 480, unit: 'kJ', scale: 1 / 1000, digits: 1 },
  Age: { max: 100, unit: 'cycles', digits: 1 },
  Wildness: { max: 100, unit: '%' },
  Fertility: { max: 100, unit: '%' },
  Incubation: { max: 100, unit: '%' },
  Viability: { max: 100, unit: '%' },
  CritterTemperature: { max: 100, unit: '°C', offset: -273.15, digits: 1, range: [-100, 250] },
  ScaleGrowth: { max: 100, unit: '%' },
  MilkProduction: { max: 100, unit: '%' },
  ElementGrowth: { max: 100, unit: '%' },
  Beckoning: { max: 100, unit: '%' },
  Moisture: { max: 100, unit: '%' },
  Mucus: { max: 10, unit: '', digits: 1 },
  InternalBattery: { max: 9000, unit: '' },
  InternalChemicalBattery: { max: 180000, unit: '' },
  InternalBioBattery: { max: 180000, unit: '' },
  InternalElectroBank: { max: 120000, unit: '' },
}

export const NEEDS = [
  'HitPoints',
  'Stress',
  'Calories',
  'Stamina',
  'Breath',
  'Bladder',
  'ImmuneLevel',
  'Toxicity',
]
export const BIONIC = ['BionicInternalBattery', 'BionicOil', 'BionicGunk', 'BionicOxygenTank']

export const GAUGES = new Set([
  'Calories',
  'Stamina',
  'BionicOil',
  'BionicOxygenTank',
  'BionicInternalBattery',
])

/** How an amount reads: the shown value, its maximum and how far it is over it. */
export function readAmount(amount: AmountView) {
  const format = AMOUNT_FORMATS[amount.id] ?? { max: 100, unit: '' }
  const scale = format.scale ?? 1
  const offset = format.offset ?? 0
  const shown = amount.value * scale + offset
  const cap = amount.max === undefined ? format.max : amount.max * scale + offset
  return { format, scale, offset, shown, cap, over: Math.max(0, shown - cap) }
}

/** A stored amount value in the editor's units, such as `72.3 °C` for 345.45 kelvin. */
export function amountValueText(id: string, value: number): string {
  const { format, shown } = readAmount({ id, name: id, value })
  const digits = format.digits ?? 0
  const text = shown.toLocaleString(undefined, { maximumFractionDigits: digits })
  return format.unit ? `${text} ${format.unit}` : text
}

/**
 * The game's meter for an amount: blocks for health and stress, a storage gauge for calories,
 * stamina and the bionic tanks, a thin bar for the rest. Over the maximum it shows the cap.
 */
