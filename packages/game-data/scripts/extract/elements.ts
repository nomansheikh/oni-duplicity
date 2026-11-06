import { readFileSync } from 'node:fs'
import { join } from 'node:path'
import { clean, sdbmLower, type Entry } from './collect.ts'

export interface ElementEntry extends Entry {
  hash: number
  state: string
  dlcId?: string
}

/** Elements (SimHashes) from StreamingAssets/elements/*.yaml; names from STRINGS.ELEMENTS. */
export function readElements(dir: string, strings: Map<string, string>): ElementEntry[] {
  const elements: ElementEntry[] = []
  for (const file of ['solid', 'liquid', 'gas', 'special']) {
    const text = readFileSync(join(dir, `StreamingAssets/elements/${file}.yaml`), 'utf8')
    for (const block of text.split(/\n  - elementId: /).slice(1)) {
      const id = block.split(/[\s#]/)[0]!
      const field = (key: string) =>
        new RegExp(`\\n\\s+${key}:\\s*"?([^"\\n#]*)"?`).exec(block)?.[1]?.trim()
      const state = field('state') ?? 'Solid'
      const dlcId = field('dlcId')
      const name = strings.get(`STRINGS.ELEMENTS.${id.toUpperCase()}.NAME`)
      elements.push({
        id,
        name: clean(name ?? id),
        hash: sdbmLower(id),
        state,
        ...(dlcId ? { dlcId } : {}),
      })
    }
  }
  return elements.sort((a, b) => a.name.localeCompare(b.name))
}
