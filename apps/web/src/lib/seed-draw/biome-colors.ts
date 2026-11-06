import type { Rgb } from '@/lib/map-colors'

/**
 * Biome colours for the seed maps, keyed by zone type id (`SubWorld.ZoneType`, the names the
 * generator puts in a biome grid; the list is `zoneTypes` in `@oni-duplicity/game-data`).
 *
 * The colours are a design palette of our own, not game data: the game has no biome colour table
 * (`zoneColours` in its zone render data is shader input). They are spread by hue and lightness so
 * neighbouring biomes stay apart on the dark UI, and Space stays near-black like the void.
 */
export const BIOME_COLORS: Record<string, Rgb> = {
  // Base game and Spaced Out
  Sandstone: [201, 165, 107],
  Barren: [140, 120, 100],
  Space: [11, 13, 18],
  FrozenWastes: [190, 225, 240],
  CrystalCaverns: [170, 150, 220],
  BoggyMarsh: [104, 126, 62],
  ToxicJungle: [178, 170, 56],
  MagmaCore: [255, 91, 31],
  OilField: [90, 60, 40],
  Wasteland: [172, 48, 66],
  Moo: [220, 150, 190],
  Ocean: [47, 127, 214],
  Rust: [158, 75, 43],
  Forest: [54, 158, 74],
  Radioactive: [140, 200, 60],
  Swamp: [72, 90, 58],
  Metallic: [150, 150, 170],
  RocketInterior: [56, 60, 76],
  // The Frosty Planet Pack
  IceCaves: [110, 170, 200],
  CarrotQuarry: [222, 130, 40],
  SugarWoods: [150, 226, 196],
  // The Prehistoric Planet Pack
  PrehistoricGarden: [30, 118, 78],
  PrehistoricRaptor: [150, 95, 140],
  PrehistoricWetlands: [66, 112, 140],
  // The Aquatic Planet Pack
  KelpForest: [48, 176, 168],
  Reef: [235, 115, 105],
  Abyss: [28, 52, 110],
  Beach: [236, 224, 180],
}

/** Used for a border cell (index 255) so it reads as solid void. */
export const BORDER_COLOR: Rgb = [20, 22, 30]

function hueOf(id: string): number {
  let hash = 0
  for (let i = 0; i < id.length; i++) hash = (hash * 31 + id.charCodeAt(i)) | 0
  return Math.abs(hash) % 360
}

function hsl(h: number, s: number, l: number): Rgb {
  const a = s * Math.min(l, 1 - l)
  const f = (n: number) => {
    const k = (n + h / 30) % 12
    return Math.round(255 * (l - a * Math.max(-1, Math.min(k - 3, 9 - k, 1))))
  }
  return [f(0), f(8), f(4)]
}

/** The colour of a zone type; a name that is not a game zone type gets one from its hash. */
export function biomeColor(name: string): Rgb {
  return BIOME_COLORS[name] ?? hsl(hueOf(name), 0.35, 0.45)
}
