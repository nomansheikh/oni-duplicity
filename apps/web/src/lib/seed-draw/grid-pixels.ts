import type { SeedBiomeGrid } from '@/seed/result'
import { biomeColor, BORDER_COLOR } from './biome-colors'

export const OUTSIDE = 255

/** RGBA bytes for a biome grid, one pixel per cell, in screen order (row 0 on top). */
export function gridPixels(grid: SeedBiomeGrid): Uint8ClampedArray<ArrayBuffer> {
  const colors = grid.palette.map(biomeColor)
  const out = new Uint8ClampedArray(new ArrayBuffer(grid.columns * grid.rows * 4))
  for (let i = 0; i < grid.columns * grid.rows; i++) {
    const index = grid.cells[i] ?? OUTSIDE
    const [r, g, b] = colors[index] ?? BORDER_COLOR
    out.set([r, g, b, 255], i * 4)
  }
  return out
}

/** The largest whole-number scale at which the grid fits `maxWidth` by `maxHeight` (at least 1). */
export function fitScale(grid: SeedBiomeGrid, maxWidth: number, maxHeight: number): number {
  return Math.max(1, Math.floor(Math.min(maxWidth / grid.columns, maxHeight / grid.rows)))
}

/** The biome under a canvas point, for tooltips; undefined outside any biome. */
export function biomeAt(
  grid: SeedBiomeGrid,
  x: number,
  y: number,
  width: number,
  height: number,
): string | undefined {
  const col = Math.floor((x / width) * grid.columns)
  const row = Math.floor((y / height) * grid.rows)
  if (col < 0 || row < 0 || col >= grid.columns || row >= grid.rows) return undefined
  return grid.palette[grid.cells[row * grid.columns + col] ?? OUTSIDE]
}
