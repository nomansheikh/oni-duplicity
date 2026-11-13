import { useEffect, useState } from 'react'
import { saveClient } from '@/lib/save-client'
import type { WorldMap } from '@/worker/map'

interface Read {
  worldId: string
  revision: number
}

/**
 * Reads one world's cells from the worker. `map` keeps the last map read until the next one
 * arrives, and `fetching` is true in between, so the page can keep it on screen under a spinner.
 */
export function useWorldMap(worldId: string, revision: number) {
  const [map, setMap] = useState<WorldMap | null>(null)
  // What `map` was read for; it lags `worldId` and `revision` until the new map arrives.
  const [mapFor, setMapFor] = useState<Read | null>(null)
  const [error, setError] = useState<(Read & { message: string }) | null>(null)

  useEffect(() => {
    let cancelled = false
    saveClient
      .worldMap(worldId)
      .then((next) => {
        if (cancelled) return
        setMap(next)
        setMapFor({ worldId, revision })
        setError(null)
      })
      .catch((e: unknown) => {
        if (cancelled) return
        setMap(null)
        setMapFor(null)
        setError({
          worldId,
          revision,
          message: e instanceof Error ? e.message : 'Could not read this map',
        })
      })
    return () => {
      cancelled = true
    }
  }, [worldId, revision])

  const current = (read: Read | null) => read?.worldId === worldId && read.revision === revision
  return {
    map,
    /** The world `map` shows, or null before the first map arrives. */
    mapWorld: mapFor?.worldId ?? null,
    error: current(error) ? error!.message : null,
    fetching: !current(mapFor) && !current(error),
  }
}
