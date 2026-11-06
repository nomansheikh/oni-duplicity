import type { SeedAsteroid } from '@/seed/result'
import { geyserColor, geyserMarks } from './geyser-marks'
import { gridPixels } from './grid-pixels'

interface DrawOptions {
  /** Canvas size in device pixels. */
  width: number
  height: number
  /** Marker radius in pixels; 0 hides the markers. */
  marker: number
}

/** Paints the biome grid with nearest-neighbour scaling, then the geyser markers over it. */
export function drawAsteroid(
  ctx: CanvasRenderingContext2D,
  asteroid: SeedAsteroid,
  { width, height, marker }: DrawOptions,
): void {
  const { biomes } = asteroid
  const source = document.createElement('canvas')
  source.width = biomes.columns
  source.height = biomes.rows
  const image = new ImageData(gridPixels(biomes), biomes.columns, biomes.rows)
  source.getContext('2d')?.putImageData(image, 0, 0)
  ctx.imageSmoothingEnabled = false
  ctx.clearRect(0, 0, width, height)
  ctx.drawImage(source, 0, 0, width, height)
  if (marker <= 0) return
  for (const { geyser, px, py } of geyserMarks(asteroid, width, height)) {
    const [r, g, b] = geyserColor(geyser.type)
    ctx.beginPath()
    ctx.arc(px, py, marker, 0, Math.PI * 2)
    ctx.fillStyle = `rgb(${r} ${g} ${b})`
    ctx.fill()
    ctx.lineWidth = Math.max(1, marker / 3)
    ctx.strokeStyle = '#020103'
    ctx.stroke()
  }
}
