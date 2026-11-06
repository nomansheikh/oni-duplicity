import type { SaveGame } from '@oni-duplicity/save-parser'
import { rawSearch, type RawSearchOptions, type RawSearchResult } from './raw-search.ts'

// --- Cancellable searches ---------------------------------------------------------------

/**
 * Runs searches by id and cancels them by id. Only a search that is running can be cancelled: a
 * cancel for an id that has not started, or has finished, does nothing, so it cannot leak into a
 * later search that happens to reuse the id.
 */
export function createSearchRunner(yieldToLoop: () => Promise<void>) {
  const running = new Map<number, { cancelled: boolean }>()
  return {
    async run(save: SaveGame, id: number, options: RawSearchOptions): Promise<RawSearchResult> {
      const state = { cancelled: false }
      running.set(id, state)
      try {
        return await rawSearch(save, options, {
          cancelled: () => state.cancelled,
          yield: yieldToLoop,
        })
      } finally {
        // A newer search may have taken over this id.
        if (running.get(id) === state) running.delete(id)
      }
    },
    cancel(id: number): void {
      const state = running.get(id)
      if (state) state.cancelled = true
    },
    /** Searches still running (for tests). */
    get active() {
      return running.size
    },
  }
}
