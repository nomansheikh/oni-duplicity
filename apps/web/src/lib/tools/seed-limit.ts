/** How many seeds a search tries before it stops on its own. `null` runs until Stop. */
export type SeedLimit = number | null

export const DEFAULT_SEED_LIMIT = 500
export const MAX_SEED_LIMIT = 1_000_000
/** The quick picks beside the field. */
export const SEED_LIMIT_PICKS = [100, 500, 1000, 5000] as const

/** A whole number of seeds between 1 and `MAX_SEED_LIMIT`. */
export function clampSeedLimit(value: number): number {
  if (!Number.isFinite(value)) return DEFAULT_SEED_LIMIT
  return Math.min(MAX_SEED_LIMIT, Math.max(1, Math.round(value)))
}

/** A stored limit: `null` stays unlimited, a number is clamped, anything else is the default. */
export function parseSeedLimit(value: unknown): SeedLimit {
  if (value === null) return null
  return typeof value === 'number' && Number.isFinite(value)
    ? clampSeedLimit(value)
    : DEFAULT_SEED_LIMIT
}
