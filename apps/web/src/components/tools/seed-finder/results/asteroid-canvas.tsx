import { useEffect, useMemo, useRef, useState } from 'react'
import { drawAsteroid } from '@/lib/seed-draw/draw-asteroid'
import { geyserMarks, geyserName, markAt } from '@/lib/seed-draw/geyser-marks'
import { biomeAt } from '@/lib/seed-draw/grid-pixels'
import type { SeedAsteroid } from '@/seed/result'

interface Props {
  asteroid: SeedAsteroid
  /** Drawn width in CSS pixels; height follows the asteroid's aspect ratio. */
  width: number
  marker?: number
  /** Show hover details and name labels (big view). */
  interactive?: boolean
  className?: string
}

/** One asteroid's biome grid on a crisp canvas, with geyser markers. */
export function AsteroidCanvas({ asteroid, width, marker = 3, interactive, className }: Props) {
  const ref = useRef<HTMLCanvasElement>(null)
  const height = Math.max(1, Math.round((width * asteroid.height) / asteroid.width))
  const [hover, setHover] = useState<{ x: number; y: number; text: string[] }>()
  const marks = useMemo(() => geyserMarks(asteroid, width, height), [asteroid, width, height])

  useEffect(() => {
    const canvas = ref.current
    const ctx = canvas?.getContext('2d')
    if (!canvas || !ctx) return
    const dpr = window.devicePixelRatio || 1
    canvas.width = Math.round(width * dpr)
    canvas.height = Math.round(height * dpr)
    drawAsteroid(ctx, asteroid, {
      width: canvas.width,
      height: canvas.height,
      marker: marker * dpr,
    })
  }, [asteroid, width, height, marker])

  const onMove = (event: React.PointerEvent<HTMLCanvasElement>) => {
    const rect = event.currentTarget.getBoundingClientRect()
    const x = event.clientX - rect.left
    const y = event.clientY - rect.top
    const mark = markAt(marks, x, y, marker + 5)
    if (mark) {
      const { geyser } = mark
      setHover({ x, y, text: [geyserName(geyser.type), `cell ${geyser.x}, ${geyser.y}`] })
      return
    }
    const biome = biomeAt(asteroid.biomes, x, y, width, height)
    setHover(biome ? { x, y, text: [biome] } : undefined)
  }

  return (
    <div className="relative" style={{ width, height }}>
      <canvas
        ref={ref}
        role="img"
        aria-label={`${asteroid.id} map`}
        style={{ width, height, imageRendering: 'pixelated' }}
        className={className ?? 'block border border-ink bg-inset'}
        onPointerMove={interactive ? onMove : undefined}
        onPointerLeave={interactive ? () => setHover(undefined) : undefined}
      />
      {interactive &&
        marks.map(({ geyser, px, py }, i) => (
          <span
            key={i}
            className="type-caption pointer-events-none absolute -translate-x-1/2 border border-ink bg-tip px-1 whitespace-nowrap"
            style={{ left: px, top: py - marker - 18 }}
          >
            {geyserName(geyser.type)}
          </span>
        ))}
      {hover && (
        <div
          className="type-caption pointer-events-none absolute z-10 border border-ink bg-tip px-2 py-1"
          style={{ left: Math.min(hover.x + 12, width - 120), top: hover.y + 12 }}
        >
          {hover.text.map((line, i) => (
            <div key={i} className={i === 0 ? 'text-foreground' : 'text-muted-foreground'}>
              {line}
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
