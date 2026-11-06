import { useEffect, type RefObject } from 'react'
import { biomeColor, BORDER_COLOR } from '@/lib/seed-draw/biome-colors'
import type { DetailAsteroid } from '@/seed/details/types'

/** The border ring outside every biome. */
const OUTSIDE = 0xffff

/** Paints every cell in its biome's colour, or does nothing while `asteroid` is undefined. */
export function useBiomeCanvas(
  canvasRef: RefObject<HTMLCanvasElement | null>,
  asteroid: DetailAsteroid | undefined,
) {
  useEffect(() => {
    const canvas = canvasRef.current
    const context = canvas?.getContext('2d')
    if (!asteroid || !canvas || !context) return
    const { width, height } = asteroid
    canvas.width = width
    canvas.height = height
    const image = context.createImageData(width, height)
    const colors = asteroid.zones.map(biomeColor)
    const zones = asteroid.cells.zone
    for (let y = 0; y < height; y++) {
      const row = (height - 1 - y) * width
      for (let x = 0; x < width; x++) {
        const zone = zones[y * width + x]!
        const [r, g, b] = zone === OUTSIDE ? BORDER_COLOR : (colors[zone] ?? BORDER_COLOR)
        const p = (row + x) * 4
        image.data[p] = r
        image.data[p + 1] = g
        image.data[p + 2] = b
        image.data[p + 3] = 255
      }
    }
    context.putImageData(image, 0, 0)
  }, [canvasRef, asteroid])
}
