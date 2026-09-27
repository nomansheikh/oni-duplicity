export type Rgb = [number, number, number]

const hex = (value: string): Rgb => [
  Number.parseInt(value.slice(1, 3), 16),
  Number.parseInt(value.slice(3, 5), 16),
  Number.parseInt(value.slice(5, 7), 16),
]

const VACUUM = hex('#0b0d12')

// Close to how the common elements look in game; everything else gets a hue from its ID.
const NAMED: Record<string, string> = {
  Vacuum: '#0b0d12',
  Void: '#0b0d12',
  Unobtanium: '#23202b',
  Katairite: '#5b4379',
  Oxygen: '#9fd4ee',
  ContaminatedOxygen: '#b7b77c',
  CarbonDioxide: '#5d6068',
  Hydrogen: '#efb4d6',
  ChlorineGas: '#c4dd6a',
  Methane: '#cdbbe9',
  Steam: '#dfe4e8',
  SourGas: '#a39a6b',
  Water: '#2f7fd6',
  DirtyWater: '#71883f',
  SaltWater: '#4aa2c9',
  Brine: '#8cc0d2',
  CrudeOil: '#3b2a1c',
  Petroleum: '#c99a2e',
  Magma: '#ff5b1f',
  SandStone: '#c9a56b',
  Sand: '#dcc28d',
  Granite: '#8a817d',
  IgneousRock: '#6c5c57',
  SedimentaryRock: '#a1805f',
  Dirt: '#7b5a3a',
  Algae: '#4d8c3b',
  Ice: '#cdeefe',
  DirtyIce: '#a7b58c',
  Snow: '#eef6fb',
  Obsidian: '#2d2233',
  Regolith: '#9b918a',
  Cuprite: '#b0633f',
  IronOre: '#a2573f',
  GoldAmalgam: '#d2b240',
  Wolframite: '#6e6a7c',
  Carbon: '#2c2c2c',
  Fossil: '#dad1b7',
  Clay: '#b3896a',
  SlimeMold: '#6d7d3d',
  Salt: '#e7e3dc',
  BleachStone: '#e9f0a8',
  Rust: '#9e4b2b',
  Phosphorite: '#b37cb5',
  ToxicSand: '#8e9a55',
  MaficRock: '#51434f',
  Basalt: '#3f3a3d',
}

function hsl(h: number, s: number, l: number): Rgb {
  const a = s * Math.min(l, 1 - l)
  const f = (n: number) => {
    const k = (n + h / 30) % 12
    return Math.round(255 * (l - a * Math.max(-1, Math.min(k - 3, 9 - k, 1))))
  }
  return [f(0), f(8), f(4)]
}

function hueOf(id: string): number {
  let hash = 0
  for (let i = 0; i < id.length; i++) hash = (hash * 31 + id.charCodeAt(i)) | 0
  return Math.abs(hash) % 360
}

export function elementColor(id: string, state: string): Rgb {
  const named = NAMED[id]
  if (named) return hex(named)
  const hue = hueOf(id)
  switch (state) {
    case 'Vacuum':
      return VACUUM
    case 'Gas':
      return hsl(hue, 0.45, 0.78)
    case 'Liquid':
      // Liquids stay in the blue-green to violet band so they read as liquid.
      return hsl(170 + (hue % 110), 0.55, 0.45)
    default:
      return hsl(hue, 0.3, 0.42)
  }
}

type Stops = [number, Rgb][]

const parse = (stops: [number, string][]): Stops => stops.map(([v, c]) => [v, hex(c)])

function ramp(stops: Stops, value: number): Rgb {
  const first = stops[0]!
  const last = stops[stops.length - 1]!
  if (value <= first[0]) return first[1]
  if (value >= last[0]) return last[1]
  let i = 1
  while (value > stops[i]![0]) i++
  const [from, a] = stops[i - 1]!
  const [to, b] = stops[i]!
  const t = (value - from) / (to - from)
  return [a[0] + (b[0] - a[0]) * t, a[1] + (b[1] - a[1]) * t, a[2] + (b[2] - a[2]) * t]
}

export const TEMPERATURE_STOPS: [number, string][] = [
  [-100, '#2b2d7c'],
  [-20, '#2f6fdc'],
  [0, '#3fc1e0'],
  [20, '#4cc36b'],
  [40, '#e6d34a'],
  [80, '#f0913a'],
  [200, '#e03a2f'],
  [1000, '#ffd9d0'],
]

const temperatureStops = parse(TEMPERATURE_STOPS)

export function temperatureColor(celsius: number): Rgb {
  return ramp(temperatureStops, celsius)
}

/** log10 of kilograms: 1 g to 10 t. */
export const MASS_STOPS: [number, string][] = [
  [-3, '#132630'],
  [0, '#1f6f78'],
  [2, '#2fb3a6'],
  [4, '#e6fff7'],
]

const massStops = parse(MASS_STOPS)

export function massColor(kg: number): Rgb {
  return kg > 0 ? ramp(massStops, Math.log10(kg)) : VACUUM
}

export const vacuumColor = VACUUM

export const cssColor = ([r, g, b]: Rgb) =>
  `rgb(${Math.round(r)} ${Math.round(g)} ${Math.round(b)})`
