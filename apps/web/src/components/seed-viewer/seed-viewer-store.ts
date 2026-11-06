import { useSyncExternalStore } from 'react'
import { hashFor, seedFromHash } from '@/seed/details/coordinate'

/**
 * The seed the viewer shows, kept in the page address as `#seed=<coordinate>` so a seed can be
 * linked to, reloaded and shared. Any page can open it with `openSeed`.
 */
let current: string | undefined = seedFromHash(location.hash)
const listeners = new Set<() => void>()

function set(next: string | undefined): void {
  if (next === current) return
  current = next
  history.replaceState(null, '', next ? hashFor(next) : location.pathname + location.search)
  for (const listener of listeners) listener()
}

addEventListener('hashchange', () => {
  const next = seedFromHash(location.hash)
  if (next === current) return
  current = next
  for (const listener of listeners) listener()
})

export const openSeed = (coordinate: string): void => set(coordinate)
export const closeSeed = (): void => set(undefined)

function subscribe(listener: () => void): () => void {
  listeners.add(listener)
  return () => listeners.delete(listener)
}

/** The coordinate being viewed, or undefined when the viewer is closed. */
export function useViewedSeed(): string | undefined {
  return useSyncExternalStore(subscribe, () => current)
}
