import type { SeedCluster } from './clusters.ts'
import type { SeedSearchOptions } from './search-types.ts'

const MAX_SEED = 2147483646

export function coordinateFor(
  cluster: SeedCluster,
  seed: number,
  tail: SeedSearchOptions['coordinateTail'],
): string {
  const { settings, story, mixing } = tail ?? { settings: '0', story: '0', mixing: '0' }
  return `${cluster.prefix}-${seed}-${settings}-${story}-${mixing}`
}

/** The next seeds to try: counting up from `from`, or random. */
export function nextSeeds(
  start: SeedSearchOptions['start'],
  cursor: number,
  count: number,
): number[] {
  const seeds: number[] = []
  for (let i = 0; i < count; i++) {
    seeds.push(
      start.mode === 'random' ? Math.floor(Math.random() * MAX_SEED) : (cursor + i) % MAX_SEED,
    )
  }
  return seeds
}
