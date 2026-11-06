import type { SeedAsteroid } from '@/seed/result'
import { AsteroidCanvas } from './asteroid-canvas'

const MAIN_WIDTH = 220
const MAIN_MAX_HEIGHT = 170
const THUMB_HEIGHT = 36

/** The start asteroid at summary size, with a strip of thumbnails for the others. */
export function MiniMap({ asteroids }: { asteroids: SeedAsteroid[] }) {
  const start = asteroids.find((a) => a.isStart) ?? asteroids[0]
  if (!start) return null
  const others = asteroids.filter((a) => a !== start)
  const ratio = start.height / start.width
  const width = Math.min(MAIN_WIDTH, Math.round(MAIN_MAX_HEIGHT / ratio))
  return (
    <div className="flex flex-col gap-1.5" style={{ width: Math.max(width, 120) }}>
      <AsteroidCanvas asteroid={start} width={width} marker={2} />
      {others.length > 0 && (
        <div className="flex flex-wrap gap-1">
          {others.slice(0, 8).map((a) => (
            <AsteroidCanvas
              key={a.id}
              asteroid={a}
              width={Math.round((THUMB_HEIGHT * a.width) / a.height)}
              marker={1}
            />
          ))}
        </div>
      )}
    </div>
  )
}
