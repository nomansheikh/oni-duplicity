/** Hex maths for the Spaced Out starmap. */

export interface Hex {
  q: number
  r: number
}

const SQRT3 = Math.sqrt(3)

/**
 * The centre of a hex, y down, for hexes of the given circumradius. This is the game's own
 * layout (`AxialUtil.AxialToWorld`): pointy-top hexes, with `r` running along a row and `q`
 * down the rows, each row shifted half a hex.
 */
export function hexCentre({ q, r }: Hex, size: number): { x: number; y: number } {
  return { x: size * SQRT3 * (r + q / 2), y: size * 1.5 * q }
}

/** The six corners of a pointy-top hex, as an SVG `points` string. */
export function hexPoints(centre: { x: number; y: number }, size: number): string {
  return Array.from({ length: 6 }, (_, i) => {
    const angle = (Math.PI / 180) * (60 * i - 30)
    return `${(centre.x + size * Math.cos(angle)).toFixed(2)},${(centre.y + size * Math.sin(angle)).toFixed(2)}`
  }).join(' ')
}

/** Hexes at the same distance as `a` and `b` are from each other: the game's grid distance. */
export function hexDistance(a: Hex, b: Hex): number {
  const dq = a.q - b.q
  const dr = a.r - b.r
  return Math.max(Math.abs(dq), Math.abs(dr), Math.abs(dq + dr))
}

/** Every hex within `radius` rings of the origin. */
export function hexDisc(radius: number): Hex[] {
  const hexes: Hex[] = []
  for (let q = -radius; q <= radius; q++) {
    for (let r = Math.max(-radius, -q - radius); r <= Math.min(radius, -q + radius); r++) {
      hexes.push({ q, r })
    }
  }
  return hexes
}

/** The rings out from the origin that hold every given hex. */
export function ringsFor(hexes: Hex[]): number {
  return hexes.reduce((max, h) => Math.max(max, hexDistance(h, { q: 0, r: 0 })), 0)
}
