import type { Rgb } from '@/lib/map-colors'

/** Biome (zone type) colours, picked to echo the in-game biome overlay. */
const BIOMES: Record<string, Rgb> = {
  Sandstone: [201, 165, 107],
  Barren: [140, 120, 100],
  Space: [11, 13, 18],
  FrozenWastes: [190, 225, 240],
  CrystalCaverns: [170, 150, 220],
  BoggyMarsh: [96, 130, 70],
  Jungle: [70, 150, 80],
  MagmaCore: [255, 91, 31],
  Oilfield: [90, 60, 40],
  Wasteland: [150, 60, 50],
  Moo: [220, 150, 190],
  Ocean: [47, 127, 214],
  Rust: [158, 75, 43],
  Forest: [64, 130, 70],
  Radioactive: [140, 200, 60],
  Swamp: [110, 130, 60],
  Aquatic: [74, 162, 201],
  Metallic: [150, 150, 170],
  Granite: [138, 129, 125],
  Hot: [200, 110, 60],
  Cold: [150, 200, 230],
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

/** The colour of a biome; unknown names get a stable colour from their name. */
export function biomeColor(name: string): Rgb {
  return BIOMES[name] ?? hsl(hueOf(name), 0.35, 0.45)
}
