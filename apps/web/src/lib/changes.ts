/** What an edit touches, so the pre-save dialog can count distinct objects rather than edits. */
export type ChangeCategory =
  | 'colony'
  | 'setting'
  | 'duplicant'
  | 'geyser'
  | 'critter'
  | 'research'
  | 'material'
  | 'item'
  | 'asteroid'
  | 'raw'
  | 'object'

export interface ChangeTarget {
  category: ChangeCategory
  /** Identifies one object within its category; `*` means every object of the category. */
  key: string
}

export interface HistoryEntry extends ChangeTarget {
  label: string
  /** The edit's `type`, so the UI can tell which page shows it. */
  type: string
}

export interface ChangeGroup {
  category: ChangeCategory
  count: number
  /** Every object of the category was edited at once (a bulk action). */
  all: boolean
}

const ORDER: ChangeCategory[] = [
  'colony',
  'setting',
  'duplicant',
  'critter',
  'geyser',
  'research',
  'material',
  'item',
  'asteroid',
  'object',
  'raw',
]

/** Distinct targets per category, in a stable display order. */
export function groupChanges(targets: ChangeTarget[]): ChangeGroup[] {
  const keys = new Map<ChangeCategory, Set<string>>()
  for (const { category, key } of targets) {
    const set = keys.get(category) ?? new Set<string>()
    set.add(key)
    keys.set(category, set)
  }
  return ORDER.filter((c) => keys.has(c)).map((category) => {
    const set = keys.get(category)!
    const all = set.has('*')
    return { category, all, count: set.size }
  })
}

const NOUNS: Record<ChangeCategory, [singular: string, plural: string]> = {
  colony: ['colony settings', 'colony settings'],
  setting: ['difficulty setting', 'difficulty settings'],
  duplicant: ['duplicant', 'duplicants'],
  geyser: ['geyser', 'geysers'],
  critter: ['critter', 'critters'],
  research: ['technology', 'technologies'],
  material: ['material', 'materials'],
  item: ['item', 'items'],
  asteroid: ['asteroid', 'asteroids'],
  raw: ['raw value', 'raw values'],
  object: ['other object', 'other objects'],
}

/** One group as text, e.g. `3 duplicants`, `all duplicants` or `colony settings`. */
export function describeGroup({ category, count, all }: ChangeGroup): string {
  if (category === 'colony') return NOUNS.colony[0]
  const [one, many] = NOUNS[category]
  if (all) return category === 'research' ? 'all technologies' : `all ${many}`
  return `${count} ${count === 1 ? one : many}`
}

/** `3 duplicants, 1 geyser, colony settings` */
export function summarizeChanges(targets: ChangeTarget[]): string {
  return groupChanges(targets).map(describeGroup).join(', ')
}
