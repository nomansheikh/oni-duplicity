import { countGeysers, geyserColor, geyserName } from '@/lib/seed-draw/geyser-marks'
import type { SeedAsteroid } from '@/seed/result'
import { asteroidLabel, traitName } from './labels'

/** Geyser counts and traits of one asteroid, as chips. */
export function AsteroidSummary({ asteroid }: { asteroid: SeedAsteroid }) {
  return (
    <div className="flex flex-col gap-1">
      <div className="type-label">
        {asteroidLabel(asteroid.id)}
        {asteroid.isStart && <span className="type-caption text-gold"> · start</span>}
      </div>
      <ul className="flex flex-wrap gap-x-3 gap-y-0.5">
        {countGeysers(asteroid).map(([type, count]) => {
          const [r, g, b] = geyserColor(type)
          return (
            <li key={type} className="type-small flex items-center gap-1.5">
              <span
                className="size-2.5 border border-ink"
                style={{ background: `rgb(${r} ${g} ${b})` }}
              />
              {count > 1 && `${count}× `}
              {geyserName(type)}
            </li>
          )
        })}
        {asteroid.geysers.length === 0 && (
          <li className="type-small text-muted-foreground">No geysers</li>
        )}
      </ul>
      {asteroid.traits.length > 0 && (
        <p className="type-caption text-muted-foreground">
          {asteroid.traits.map(traitName).join(' · ')}
        </p>
      )}
    </div>
  )
}
