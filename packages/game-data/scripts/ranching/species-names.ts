import { Ref, type Value } from '../csharp/interp.ts'
import type { createRunner } from './run.ts'

export type Names = (id: string) => string | undefined

export const num = (v: Value, fallback = 0) => (typeof v === 'number' ? v : fallback)
export const text = (v: Value) => (typeof v === 'string' ? v : v instanceof Ref ? v.path : '')

const CATEGORY_ORDER = [
  'ELEMENTS',
  'ITEMS.FOOD',
  'ITEMS.INDUSTRIAL_PRODUCTS',
  'CREATURES.SPECIES',
  'ITEMS',
]

function rank(key: string) {
  const body = key.replace(/^STRINGS\./, '')
  const i = CATEGORY_ORDER.findIndex((c) => body.startsWith(`${c}.`))
  return i < 0 ? 99 : i
}

export function familyOf(nameKey: string | undefined): string | undefined {
  return /^STRINGS\.CREATURES\.SPECIES\.([A-Z0-9_]+)\./.exec(nameKey ?? '')?.[1]
}

/** Name resolution over the game's strings. Species maps are filled in by the caller. */
export function createNames(opts: {
  strings: Map<string, string>
  elementName: (id: string) => string | undefined
  clean: (s: string) => string
  runner: ReturnType<typeof createRunner>
}) {
  const stringAt = (key: string | undefined) => {
    if (!key) return undefined
    const full = key.startsWith('STRINGS.') ? key : `STRINGS.${key}`
    const v = opts.strings.get(full)
    return v === undefined ? undefined : opts.clean(v)
  }

  // Suffix index: UPPERCASE id -> every `.NAME` string key ending in `.<ID>.NAME`.
  const nameKeys = new Map<string, string[]>()
  for (const key of opts.strings.keys()) {
    const m = /^STRINGS\.(.+)\.([A-Z0-9_]+)\.NAME$/.exec(key)
    if (!m) continue
    const list = nameKeys.get(m[2]!) ?? []
    list.push(key)
    nameKeys.set(m[2]!, list)
  }

  const speciesNameById = new Map<string, string>()
  const nameKeyBySpecies = new Map<string, string>()

  const itemName: Names = (id) => {
    if (id === '') return undefined
    const element = opts.elementName(id)
    if (element) return element
    const species = speciesNameById.get(id)
    if (species) return species
    const viaConfig = stringAt(opts.runner.nameRefOf(id))
    if (viaConfig) return viaConfig
    const upper = id.toUpperCase()
    const keys = nameKeys.get(upper)
    if (keys) {
      const ranked = [...keys].sort((a, b) => rank(a) - rank(b) || a.length - b.length)
      return opts.clean(opts.strings.get(ranked[0]!)!)
    }
    // Babies: `<Species>Baby` -> the species' BABY name.
    if (id.endsWith('Baby')) {
      const key = nameKeyBySpecies.get(id.slice(0, -4))
      const baby = key ? stringAt(key.replace(/\.NAME$/, '.BABY.NAME')) : undefined
      if (baby) return baby
    }
    return undefined
  }

  return { stringAt, itemName, speciesNameById, nameKeyBySpecies }
}
