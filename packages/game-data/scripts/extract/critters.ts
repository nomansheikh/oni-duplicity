import { clean, type Entry } from './collect.ts'

export interface CritterEntry extends Entry {
  /** Species family, e.g. PACU for Pacu, Tropical Pacu and their fry. */
  family: string
  baby: boolean
}

/** Critters keyed by prefab ID (upper-cased), taken from the <link> in each species name. */
export function readCritters(strings: Map<string, string>): CritterEntry[] {
  const critters = new Map<string, CritterEntry>()
  for (const [key, value] of strings) {
    const match = /^STRINGS\.CREATURES\.SPECIES\.([A-Z0-9_]+)\.(?:[A-Z0-9_]+\.)*NAME$/.exec(key)
    if (!match || match[1] === 'GEYSER') continue
    const link = /<link="([A-Z0-9_]+)">/.exec(value)?.[1]
    if (!link) continue
    const baby = key.includes('.BABY.')
    const id = baby ? `${link}BABY` : link
    if (!critters.has(id)) {
      critters.set(id, { id, name: clean(value), family: match[1]!, baby })
    }
  }
  return [...critters.values()].sort((a, b) => a.name.localeCompare(b.name))
}
