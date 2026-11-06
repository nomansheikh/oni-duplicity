import type { SeedDetail } from '@/seed/details/types'
import { HexStarmap } from './hex-starmap'
import { PoiTable } from './poi-table'
import { VanillaDestinations } from './vanilla-destinations'

/** Spaced Out clusters get a hex starmap; base-game ones the vanilla destination list. */
export function StarmapView({ detail }: { detail: SeedDetail }) {
  const { starmap } = detail
  if (starmap.kind === 'base') {
    return (
      <div className="flex flex-col gap-2">
        <p className="type-small text-muted-foreground">
          Rocket destinations of this base-game seed, nearest first.
        </p>
        <VanillaDestinations starmap={starmap} />
      </div>
    )
  }
  const start = detail.asteroids.find((a) => a.isStart)
  return (
    <div className="flex flex-col gap-4">
      <HexStarmap starmap={starmap} startId={start?.id} />
      <PoiTable pois={starmap.pois} />
    </div>
  )
}
