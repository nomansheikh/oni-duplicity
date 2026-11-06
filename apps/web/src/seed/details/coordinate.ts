import { clusterByPrefix, type SeedCluster } from '../clusters.ts'

/** A settings coordinate split into its parts: `<prefix>-<seed>-<settings>-<stories>-<mixing>`. */
export interface ParsedCoordinate {
  /** The text as normalised: trimmed and upper case. */
  coordinate: string
  prefix: string
  seed: number
  settings: string
  story: string
  mixing: string
}

const MAX_SEED = 2147483646
const PART = /^[0-9A-Z]+$/

/** Splits a coordinate; the prefix may itself contain hyphens (`V-SNDST-C`), so count from the end. */
export function parseCoordinate(text: string): ParsedCoordinate | undefined {
  const coordinate = text.trim().toUpperCase()
  const parts = coordinate.split('-')
  if (parts.length < 5 || !parts.every((p) => PART.test(p))) return undefined
  const [seed, settings, story, mixing] = parts.slice(-4) as [string, string, string, string]
  const prefix = parts.slice(0, -4).join('-')
  if (!/^\d+$/.test(seed) || Number(seed) > MAX_SEED) return undefined
  return { coordinate, prefix, seed: Number(seed), settings, story, mixing }
}

export type CoordinateCheck =
  | { ok: true; parsed: ParsedCoordinate; cluster: SeedCluster }
  | { ok: false; reason: 'invalid' | 'unsupported'; message: string }

/** Whether the bundled worldgen can generate this coordinate, with a plain message when not. */
export function checkCoordinate(text: string): CoordinateCheck {
  const parsed = parseCoordinate(text)
  if (!parsed) {
    return {
      ok: false,
      reason: 'invalid',
      message: 'That is not a seed coordinate. It looks like SNDST-C-1393183751-0-0-0.',
    }
  }
  const cluster = clusterByPrefix(parsed.prefix)
  if (!cluster) {
    return {
      ok: false,
      reason: 'unsupported',
      message: `This seed can't be previewed yet: the bundled world generator cannot make ${parsed.prefix} worlds. The code can still be copied and used in the game.`,
    }
  }
  return { ok: true, parsed, cluster }
}

const HASH = '#seed='

/** The coordinate a page address asks to view, e.g. `#seed=SNDST-C-1-0-0-0`. */
export function seedFromHash(hash: string): string | undefined {
  if (!hash.startsWith(HASH)) return undefined
  try {
    return decodeURIComponent(hash.slice(HASH.length)) || undefined
  } catch {
    return undefined
  }
}

export function hashFor(coordinate: string): string {
  return `${HASH}${encodeURIComponent(coordinate)}`
}
