import type { WorldView } from '@/worker/model'

/** The name of the asteroid an object is on, or an en dash when it is on none. */
export function asteroidName(worlds: WorldView[], id: string | undefined): string {
  return worlds.find((w) => w.id === id)?.name ?? '–'
}
