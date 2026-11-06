import { useEffect } from 'react'
import { toCelsius } from '@/lib/format'
import { elementColor, massColor, temperatureColor, vacuumColor, type Rgb } from '@/lib/map-colors'
import type { WorldMap } from '@/worker/map'
import type { RefObject } from 'react'

export type Mode = 'element' | 'temperature' | 'mass'

/** Paints the map's cells into the canvas for the chosen colour mode, dimming all but one element. */
export function useMapCanvas(
  canvasRef: RefObject<HTMLCanvasElement | null>,
  map: WorldMap | null,
  mode: Mode,
  highlight: number | null,
) {
  useEffect(() => {
    const canvas = canvasRef.current
    if (!map || !canvas) return
    canvas.width = map.width
    canvas.height = map.height
    const context = canvas.getContext('2d')
    if (!context) return
    const image = context.createImageData(map.width, map.height)
    const palette = map.elements.map((e) => elementColor(e.id, e.state))
    const vacuum = map.elements.map((e) => e.state === 'Vacuum')
    for (let y = 0; y < map.height; y++) {
      const row = (map.height - 1 - y) * map.width
      for (let x = 0; x < map.width; x++) {
        const i = y * map.width + x
        const element = map.cells[i]!
        let color: Rgb = vacuum[element]
          ? vacuumColor
          : mode === 'element'
            ? palette[element]!
            : mode === 'temperature'
              ? temperatureColor(toCelsius(map.temperature[i]!))
              : massColor(map.mass[i]!)
        if (highlight !== null && element !== highlight) {
          color = [color[0] * 0.2, color[1] * 0.2, color[2] * 0.2]
        }
        const p = (row + x) * 4
        image.data[p] = color[0]
        image.data[p + 1] = color[1]
        image.data[p + 2] = color[2]
        image.data[p + 3] = 255
      }
    }
    context.putImageData(image, 0, 0)
  }, [canvasRef, map, mode, highlight])
}
