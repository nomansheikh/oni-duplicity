import { useState } from 'react'
import { ElementLegend } from '@/components/map/ElementLegend'
import type { DetailAsteroid, SeedDetail } from '@/seed/details/types'
import { asteroidLabel } from '../results/labels'
import { BiomeLegend } from './biome-legend'
import { DetailMap } from './detail-map'
import { GeyserTable } from './geyser-table'
import type { MapMode } from './map-toolbar'
import { MarkersList } from './markers-list'
import { TraitsList } from './traits-list'
import { legendOf, toWorldMap } from './world-map'
import { useMemo } from 'react'

/** One asteroid: the map, what it is made of, its markers, geysers and traits. */
export function AsteroidView({
  detail,
  asteroid,
}: {
  detail: SeedDetail
  asteroid: DetailAsteroid
}) {
  const [mode, setMode] = useState<MapMode>('elements')
  const [highlight, setHighlight] = useState<number | null>(null)
  const map = useMemo(() => toWorldMap(detail, asteroid), [detail, asteroid])
  return (
    <div className="flex flex-col gap-4">
      <div className="grid gap-4 lg:grid-cols-[minmax(0,1fr)_17rem]">
        <DetailMap
          detail={detail}
          asteroid={asteroid}
          mode={mode}
          onMode={setMode}
          highlight={highlight}
        />
        <div className="flex min-w-0 flex-col gap-4">
          {mode === 'elements' ? (
            <ElementLegend
              worldName={asteroidLabel(asteroid.id)}
              legend={legendOf(map)}
              totalCells={map.width * map.height}
              highlight={highlight}
              onHighlight={setHighlight}
            />
          ) : (
            <BiomeLegend asteroid={asteroid} />
          )}
        </div>
      </div>
      <div className="grid gap-4 lg:grid-cols-2">
        <MarkersList markers={asteroid.markers} />
        <TraitsList traits={asteroid.traits} />
      </div>
      <GeyserTable geysers={asteroid.geysers} />
    </div>
  )
}
