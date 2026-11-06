import { describe, expect, it } from 'vite-plus/test'
import { hexCentre, hexDisc, hexDistance, ringsFor } from './hex-geometry.ts'

describe('hexCentre', () => {
  it('puts the origin at zero and lays rows down by 1.5 radii', () => {
    expect(hexCentre({ q: 0, r: 0 }, 10)).toEqual({ x: 0, y: 0 })
    expect(hexCentre({ q: 2, r: 0 }, 10).y).toBe(30)
  })

  it('shifts each row half a hex and runs r along it', () => {
    const width = Math.sqrt(3) * 10
    expect(hexCentre({ q: 1, r: 0 }, 10).x).toBeCloseTo(width / 2)
    expect(hexCentre({ q: 0, r: 1 }, 10).x).toBeCloseTo(width)
  })
})

describe('hexDistance', () => {
  it('counts rings, so neighbours are one apart', () => {
    expect(hexDistance({ q: 0, r: 0 }, { q: 1, r: 0 })).toBe(1)
    expect(hexDistance({ q: 0, r: 0 }, { q: 1, r: -1 })).toBe(1)
    expect(hexDistance({ q: 0, r: 0 }, { q: 1, r: 1 })).toBe(2)
    expect(hexDistance({ q: -3, r: 1 }, { q: 2, r: 3 })).toBe(7)
  })
})

describe('hexDisc', () => {
  it('holds 3r(r+1)+1 hexes', () => {
    expect(hexDisc(0)).toHaveLength(1)
    expect(hexDisc(3)).toHaveLength(37)
  })

  it('reaches as far as the furthest hex', () => {
    expect(
      ringsFor([
        { q: 0, r: 0 },
        { q: -3, r: -4 },
      ]),
    ).toBe(7)
  })
})
