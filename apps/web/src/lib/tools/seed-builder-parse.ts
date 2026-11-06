import type { MixingLevels } from '@/seed/mixing'
import type { SeedRule } from '@/seed/rules'
import type { BuilderState } from './seed-builder'

/** Reads stored state back. Anything that is not a well-formed state gives null. */
export function parseState(value: unknown): BuilderState | null {
  if (typeof value !== 'object' || value === null) return null
  const { cluster, mixing, presetId, rules } = value as Record<string, unknown>
  if (typeof cluster !== 'string' || !Array.isArray(rules)) return null
  const clean = rules.filter(isRuleLike)
  const ids = new Set(clean.map((rule) => rule.id))
  if (ids.size !== clean.length) return null
  return {
    cluster,
    mixing: parseMixing(mixing),
    presetId: typeof presetId === 'string' ? presetId : null,
    rules: clean,
  }
}

/** Stored mixing levels; state saved before mixing existed has none. */
function parseMixing(value: unknown): MixingLevels {
  if (typeof value !== 'object' || value === null) return {}
  return Object.fromEntries(
    Object.entries(value).filter(
      (entry): entry is [string, number] => Number.isInteger(entry[1]) && entry[1] > 0,
    ),
  )
}

function isRuleLike(value: unknown): value is SeedRule {
  if (typeof value !== 'object' || value === null) return false
  const rule = value as Record<string, unknown>
  const kinds = ['geyser', 'trait', 'asteroid']
  return (
    typeof rule.id === 'string' &&
    kinds.includes(rule.kind as string) &&
    (rule.mode === 'must' || rule.mode === 'nice') &&
    typeof rule.weight === 'number' &&
    (rule.kind === 'asteroid' || typeof rule.scope === 'object')
  )
}
