import { humanize } from '@oni-duplicity/game-data'

/** The generator's `MapData.failure`: where worldgen gave up and why. */
export interface RawFailure {
  stage?: string
  world_index?: number
  message?: string
}

/**
 * A plain explanation of a seed the game itself cannot build. Worldgen aborts for some seeds
 * (a guaranteed biome or template that cannot be placed), and the game fails the same way, so
 * the fix is a different seed, not a retry.
 */
export function describeFailure(failure: RawFailure | null | undefined): string {
  const stage = failure?.stage ? humanize(failure.stage) : undefined
  const world =
    failure?.world_index !== undefined && failure.world_index >= 0
      ? `asteroid ${failure.world_index + 1}`
      : 'the cluster'
  const reason = failure?.message?.trim()
  return [
    "The game itself can't build this seed.",
    reason
      ? `Worldgen stopped${stage ? ` while ${stage.toLowerCase()}` : ''} on ${world}: ${reason}.`
      : undefined,
    'Seeds are only valid for the cluster they came from, so if this number was made for another cluster, or the seed is just unlucky, try a different one.',
  ]
    .filter(Boolean)
    .join(' ')
}
