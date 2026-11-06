import type { GeyserRule } from '@/seed/rules'

export type CountOp = 'atLeast' | 'atMost' | 'exactly' | 'none'

/** The condition a geyser rule's `min` and `max` express, in the words the row shows. */
export function countOp(rule: GeyserRule): CountOp {
  if (rule.max === undefined) return 'atLeast'
  if (rule.max === 0) return 'none'
  return rule.min === rule.max ? 'exactly' : 'atMost'
}

/** The `min` and `max` for a condition and a count. */
export function countRange(op: CountOp, count: number): Pick<GeyserRule, 'min' | 'max'> {
  const n = Math.max(0, Math.min(99, Math.round(count)))
  switch (op) {
    case 'atLeast':
      return { min: n, max: undefined }
    case 'atMost':
      return { min: 0, max: n }
    case 'exactly':
      return { min: n, max: n }
    case 'none':
      return { min: 0, max: 0 }
  }
}

/** The number the row's count box shows. */
export function countOf(rule: GeyserRule): number {
  return countOp(rule) === 'atMost' ? (rule.max ?? 0) : rule.min
}
